import { supabase } from '../supabase';

const CLUB_COLUMNS = 'id,organization_type,name,short_name,slug,description,founded_year,logo_asset_id,publication_status';
const LOGO_COLUMNS = 'id,provider,public_id,external_url,resource_type,alt_text,is_public';
const CONTACT_COLUMNS = 'id,organization_id,contact_type,label,value,url,is_public,sort_order';
const CONTACT_TYPES = new Set(['email', 'phone', 'address', 'website', 'social']);
const STATUSES = new Set(['draft', 'published', 'archived']);

const asArray = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);

const readRequired = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

const readOptional = async (query) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);
  try {
    const { data, error } = await query.abortSignal(controller.signal);
    if (error) return [];
    return asArray(data);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
};

const safeId = (value, code = 'CLUB_ID_REQUIRED') => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.trim())) throw new Error(code);
  return value.trim();
};

const normalizeSlug = (value) => {
  const slug = String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  if (!slug) throw new Error('SLUG_REQUIRED');
  return slug;
};

const approvedLogo = (asset) => Boolean(
  asset
  && asset.provider === 'cloudinary'
  && asset.resource_type === 'image'
  && asset.is_public === true
  && typeof asset.public_id === 'string'
  && asset.public_id.trim()
  && typeof asset.alt_text === 'string'
  && asset.alt_text.trim(),
);

const normalizeLogo = (value) => {
  const asset = Array.isArray(value) ? value[0] : value;
  return approvedLogo(asset) ? asset : null;
};

const normalizeContact = (value) => {
  if (!value || !CONTACT_TYPES.has(value.contact_type) || typeof value.value !== 'string' || !value.value.trim()) return null;
  return {
    id: typeof value.id === 'string' ? value.id : '',
    organization_id: value.organization_id,
    contact_type: value.contact_type,
    label: typeof value.label === 'string' ? value.label : '',
    value: value.value,
    url: typeof value.url === 'string' ? value.url : null,
    is_public: value.is_public === true,
    sort_order: Number.isInteger(value.sort_order) ? value.sort_order : 0,
  };
};

const normalizeClub = (value) => {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || value.organization_type !== 'club' || typeof value.name !== 'string') {
    throw new Error('INVALID_CLUB_DATA');
  }
  return {
    id: value.id,
    organization_type: 'club',
    name: value.name,
    short_name: typeof value.short_name === 'string' ? value.short_name : '',
    slug: typeof value.slug === 'string' ? value.slug : '',
    description: typeof value.description === 'string' ? value.description : '',
    founded_year: Number.isInteger(value.founded_year) ? value.founded_year : null,
    logo_asset_id: typeof value.logo_asset_id === 'string' ? value.logo_asset_id : '',
    logo: normalizeLogo(value.logo),
    publication_status: STATUSES.has(value.publication_status) ? value.publication_status : 'draft',
    contacts: asArray(value.contacts).map(normalizeContact).filter(Boolean),
    memberships: asArray(value.memberships),
  };
};

const logoSelection = (value) => `logo:media_assets!organizations_logo_asset_id_fkey(${value})`;
const contactSelection = `contacts:organization_contacts(${CONTACT_COLUMNS})`;
const membershipSelection = 'memberships:athlete_memberships(athlete_id,membership_type)';
const detailSelection = `${CLUB_COLUMNS},${logoSelection(LOGO_COLUMNS)},${contactSelection},${membershipSelection}`;
const listSelection = `${CLUB_COLUMNS},${logoSelection(LOGO_COLUMNS)},${contactSelection}`;

export const getClubReferences = async () => {
  const media = await readOptional(
    supabase.from('media_assets').select(LOGO_COLUMNS).eq('provider', 'cloudinary').eq('resource_type', 'image').eq('is_public', true).order('created_at', { ascending: false }),
  );
  return { media: media.filter(approvedLogo) };
};

export const getAdminClubs = async () => {
  const data = await readRequired(supabase.from('organizations').select(listSelection).eq('organization_type', 'club').order('name'));
  return asArray(data).map(normalizeClub);
};

export const getAdminClub = async (clubId) => {
  const id = safeId(clubId);
  const data = await readRequired(supabase.from('organizations').select(detailSelection).eq('id', id).eq('organization_type', 'club').maybeSingle());
  if (!data) throw new Error('CLUB_NOT_FOUND');
  return normalizeClub(data);
};

const normalizeContactInput = (value, index) => {
  if (!value || !CONTACT_TYPES.has(value.contactType || value.contact_type)) throw new Error('INVALID_CONTACT_TYPE');
  const contactType = value.contactType || value.contact_type;
  const contactValue = String(value.value || '').trim();
  const isPublic = value.isPublic ?? value.is_public;
  if (!contactValue) throw new Error('CONTACT_VALUE_REQUIRED');
  if (typeof isPublic !== 'boolean') throw new Error('INVALID_CONTACT_VISIBILITY');
  const url = String(value.url || '').trim() || null;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !parsed.hostname) throw new Error();
    } catch {
      throw new Error('INVALID_CONTACT_URL');
    }
  }
  return {
    id: value.id ? safeId(value.id, 'INVALID_CONTACT_ID') : '',
    contact_type: contactType,
    label: String(value.label || '').trim() || null,
    value: contactValue,
    url,
    is_public: isPublic,
    sort_order: Number.isInteger(value.sortOrder) ? value.sortOrder : index,
  };
};

const validateClub = (values, publicationStatus) => {
  const name = String(values.name || '').trim();
  if (!name) throw new Error('CLUB_NAME_REQUIRED');
  const shortName = String(values.shortName || '').trim();
  if (shortName && (shortName.length < 2 || shortName.length > 20)) throw new Error('INVALID_SHORT_NAME');
  const yearValue = String(values.foundedYear || '').trim();
  const foundedYear = yearValue ? Number(yearValue) : null;
  if (foundedYear !== null && (!Number.isInteger(foundedYear) || foundedYear < 1800 || foundedYear > 2200)) throw new Error('INVALID_FOUNDED_YEAR');
  if (!STATUSES.has(publicationStatus) || publicationStatus === 'archived') throw new Error('INVALID_PUBLICATION_STATUS');
  const logoAssetId = values.logoAssetId ? safeId(values.logoAssetId, 'INVALID_LOGO_REFERENCE') : null;
  const contacts = asArray(values.contacts).map(normalizeContactInput);
  return {
    name,
    short_name: shortName || null,
    slug: normalizeSlug(values.slug),
    description: String(values.description || '').trim() || null,
    founded_year: foundedYear,
    logo_asset_id: logoAssetId,
    publication_status: publicationStatus,
    contacts,
  };
};

const saveContacts = async (organizationId, contacts) => {
  const saved = [];
  for (const contact of contacts) {
    const payload = { organization_id: organizationId, contact_type: contact.contact_type, label: contact.label, value: contact.value, url: contact.url, is_public: contact.is_public, sort_order: contact.sort_order };
    const query = contact.id
      ? supabase.from('organization_contacts').update(payload).eq('id', contact.id).eq('organization_id', organizationId).select(CONTACT_COLUMNS).single()
      : supabase.from('organization_contacts').insert(payload).select(CONTACT_COLUMNS).single();
    saved.push(normalizeContact(await readRequired(query)));
  }
  let removal = supabase.from('organization_contacts').delete().eq('organization_id', organizationId);
  const retained = saved.map((contact) => contact.id).filter(Boolean);
  if (retained.length) removal = removal.not('id', 'in', `(${retained.join(',')})`);
  const { error } = await removal;
  if (error) throw error;
  return saved;
};

export const saveAdminClub = async (values, requestedStatus = values.publicationStatus || 'draft') => {
  const id = values.id ? safeId(values.id) : null;
  const payload = validateClub(values, requestedStatus);
  if (payload.logo_asset_id) {
    const logo = await readRequired(supabase.from('media_assets').select(LOGO_COLUMNS).eq('id', payload.logo_asset_id).maybeSingle());
    if (!approvedLogo(logo)) throw new Error('UNAPPROVED_LOGO');
  }
  const query = id
    ? supabase.from('organizations').update({ organization_type: 'club', name: payload.name, short_name: payload.short_name, slug: payload.slug, description: payload.description, founded_year: payload.founded_year, logo_asset_id: payload.logo_asset_id, publication_status: payload.publication_status }).eq('id', id).eq('organization_type', 'club').select(CLUB_COLUMNS).single()
    : supabase.from('organizations').insert({ organization_type: 'club', name: payload.name, short_name: payload.short_name, slug: payload.slug, description: payload.description, founded_year: payload.founded_year, logo_asset_id: payload.logo_asset_id, publication_status: payload.publication_status }).select(CLUB_COLUMNS).single();
  const saved = normalizeClub(await readRequired(query));
  return { ...saved, contacts: await saveContacts(saved.id, payload.contacts) };
};

export const archiveAdminClub = async (clubId) => {
  const id = safeId(clubId);
  return normalizeClub(await readRequired(
    supabase.from('organizations').update({ publication_status: 'archived' }).eq('id', id).eq('organization_type', 'club').select(CLUB_COLUMNS).single(),
  ));
};

export const formatClubError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('slug_required')) return 'Ingresá un slug público para el club.';
  if (message.includes('duplicate') || message.includes('unique') || message.includes('slug') || message.includes('23505')) return 'Ese slug ya está en uso. Elegí otro identificador público.';
  if (message.includes('logo') || message.includes('media') || message.includes('23514')) return 'El logotipo debe ser una imagen de Cloudinary aprobada y tener texto alternativo.';
  if (message.includes('contact') || message.includes('url')) return 'Revisá el tipo, valor, visibilidad y URL segura del contacto.';
  if (message.includes('archiv') || message.includes('delete') || message.includes('23503')) return 'Los clubes no se eliminan: deben archivarse para conservar su historial.';
  if (message.includes('not_found')) return 'No encontramos ese club o ya no está disponible.';
  if (message.includes('short_name') || message.includes('founded_year')) return 'Revisá el nombre corto y el año de fundación.';
  if (message.includes('publication_status')) return 'Elegí un estado de publicación válido para el club.';
  if (message.includes('name')) return 'Ingresá el nombre del club.';
  return 'No se pudo guardar el club. Revisá los datos e intentá nuevamente.';
};
