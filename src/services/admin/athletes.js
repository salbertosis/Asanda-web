import { supabase } from '../supabase';

const ATHLETE_COLUMNS = 'id,display_name,preferred_name,competitive_sex,birth_year_public,photo_asset_id,publication_status';
const ATHLETE_LIST_COLUMNS = 'id,display_name,preferred_name,competitive_sex,publication_status';

const asArray = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);

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

const readRequired = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

const safeYear = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null;
};

const safeSex = (value) => ['female', 'male', 'mixed', 'open'].includes(value) ? value : null;

const requiredId = (value, code) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
};

const safeMembershipType = (value) => {
  if (!['associated', 'federated'].includes(value)) throw new Error('INVALID_MEMBERSHIP_TYPE');
  return value;
};

const safeDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};

const publicYear = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error('INVALID_PUBLIC_BIRTH_YEAR');
  return year;
};

const publicSex = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (!['female', 'male', 'mixed', 'open'].includes(value)) throw new Error('INVALID_COMPETITIVE_SEX');
  return value;
};

const consentValue = (value) => {
  if (typeof value !== 'boolean') throw new Error('INVALID_CONSENT');
  return value;
};

const safePeriod = ({ validFrom, validTo }) => {
  const from = safeDate(validFrom);
  const to = validTo ? safeDate(validTo) : null;
  if (!from) throw new Error('VALID_FROM_REQUIRED');
  if (validTo && !to) throw new Error('INVALID_DATE');
  if (to && to < from) throw new Error('INVALID_PERIOD');
  return { valid_from: from, valid_to: to };
};

const normalizeAthlete = (data) => {
  if (!data || typeof data !== 'object' || typeof data.id !== 'string' || typeof data.display_name !== 'string') {
    throw new Error('INVALID_ATHLETE_DATA');
  }

  return {
    id: data.id,
    display_name: data.display_name,
    preferred_name: typeof data.preferred_name === 'string' ? data.preferred_name : '',
    competitive_sex: safeSex(data.competitive_sex),
    birth_year_public: safeYear(data.birth_year_public),
    photo_asset_id: typeof data.photo_asset_id === 'string' ? data.photo_asset_id : '',
    publication_status: ['draft', 'published', 'archived'].includes(data.publication_status)
      ? data.publication_status
      : 'draft',
  };
};

const normalizeConsentMap = (rows) => Object.fromEntries(asArray(rows).map((row) => [
  row.consent_type,
  row.status === 'granted' && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now()),
]));

export const listAdminAthletes = async () => {
  const athletes = await readRequired(
    supabase.from('athletes').select(ATHLETE_LIST_COLUMNS).order('display_name'),
  );
  return asArray(athletes).map(normalizeAthlete);
};

export const getAthleteReferences = async () => {
  const [media, categories, disciplines, organizations] = await Promise.all([
    readOptional(supabase.from('media_assets').select('id,alt_text,is_public,provider,public_id,external_url').eq('resource_type', 'image').eq('is_public', true).order('created_at', { ascending: false })),
    readOptional(supabase.from('age_categories').select('id,code,name,federation_eligible,is_active,sort_order').eq('is_active', true).order('sort_order')),
    readOptional(supabase.from('disciplines').select('id,code,name,is_active').eq('is_active', true).order('name')),
    readOptional(supabase.from('organizations').select('id,name,short_name,organization_type').eq('organization_type', 'club').order('name')),
  ]);

  return {
    media: media.filter((asset) => asset.id && asset.is_public !== false),
    categories: categories.filter((category) => category.id && category.name),
    disciplines: disciplines.filter((discipline) => discipline.id && discipline.name),
    organizations: organizations.filter((organization) => organization.id && organization.name),
  };
};

export const getAdminAthlete = async (athleteId) => {
  if (!athleteId) throw new Error('ATHLETE_ID_REQUIRED');

  const athlete = normalizeAthlete(await readRequired(
    supabase.from('athletes').select(ATHLETE_COLUMNS).eq('id', athleteId).maybeSingle(),
  ));

  const [consents, categories, disciplines, memberships] = await Promise.all([
    readOptional(supabase.from('athlete_consents').select('id,consent_type,status,expires_at').eq('athlete_id', athleteId)),
    readOptional(supabase.from('athlete_category_assignments').select('id,category_id,valid_from,valid_to,category:age_categories(id,code,name,federation_eligible)').eq('athlete_id', athleteId).order('valid_from', { ascending: false })),
    readOptional(supabase.from('athlete_disciplines').select('athlete_id,discipline_id,is_primary,valid_from,valid_to,discipline:disciplines(id,code,name)').eq('athlete_id', athleteId)),
    readOptional(supabase.from('athlete_memberships').select('id,organization_id,membership_type,status,valid_from,valid_to,organization:organizations(id,name,short_name)').eq('athlete_id', athleteId).order('valid_from', { ascending: false })),
  ]);

  return {
    ...athlete,
    consents: normalizeConsentMap(consents),
    categories,
    disciplines,
    memberships,
  };
};

export const validateAthletePublication = ({ publicationStatus, profileConsent, photoAssetId, photoConsent, resultsConsent }) => {
  if (!['draft', 'published'].includes(publicationStatus)) throw new Error('INVALID_PUBLICATION_STATUS');
  const profileGranted = consentValue(profileConsent);
  const photoGranted = consentValue(photoConsent);
  consentValue(resultsConsent);
  if (photoAssetId && !photoGranted) throw new Error('PHOTO_CONSENT_REQUIRED');
  if (publicationStatus === 'published' && !profileGranted) throw new Error('PUBLIC_PROFILE_CONSENT_REQUIRED');
};

export const saveAdminAthlete = async (values) => {
  const displayName = String(values.displayName || '').trim();
  if (!displayName) throw new Error('DISPLAY_NAME_REQUIRED');
  validateAthletePublication(values);
  const { data, error } = await supabase.rpc('save_admin_athlete', {
    requested_athlete_id: values.id ? requiredId(values.id, 'ATHLETE_ID_REQUIRED') : null,
    requested_display_name: displayName,
    requested_preferred_name: String(values.preferredName || '').trim() || null,
    requested_competitive_sex: publicSex(values.competitiveSex),
    requested_birth_year_public: publicYear(values.birthYearPublic),
    requested_photo_asset_id: values.photoAssetId ? requiredId(values.photoAssetId, 'INVALID_MEDIA_REFERENCE') : null,
    requested_publication_status: values.publicationStatus,
    requested_profile_consent: consentValue(values.profileConsent),
    requested_photo_consent: consentValue(values.photoConsent),
    requested_results_consent: consentValue(values.resultsConsent),
  });
  if (error) throw error;
  return normalizeAthlete(Array.isArray(data) ? data[0] : data);
};

const insertRelation = async (table, payload, select) => {
  const { data, error } = await supabase.from(table).insert(payload).select(select).single();
  if (error) throw error;
  return data;
};

export const addAthleteCategory = (athleteId, values) => insertRelation(
  'athlete_category_assignments',
  { athlete_id: requiredId(athleteId, 'ATHLETE_ID_REQUIRED'), category_id: requiredId(values.categoryId, 'CATEGORY_REQUIRED'), ...safePeriod(values) },
  'id,category_id,valid_from,valid_to,category:age_categories(id,code,name,federation_eligible)',
);

export const addAthleteDiscipline = (athleteId, values) => insertRelation(
  'athlete_disciplines',
  {
    athlete_id: requiredId(athleteId, 'ATHLETE_ID_REQUIRED'),
    discipline_id: requiredId(values.disciplineId, 'DISCIPLINE_REQUIRED'),
    is_primary: Boolean(values.isPrimary),
    ...safePeriod(values),
  },
  'athlete_id,discipline_id,is_primary,valid_from,valid_to,discipline:disciplines(id,code,name)',
);

export const addAthleteMembership = (athleteId, values) => insertRelation(
  'athlete_memberships',
  {
    athlete_id: requiredId(athleteId, 'ATHLETE_ID_REQUIRED'),
    organization_id: requiredId(values.organizationId, 'ORGANIZATION_REQUIRED'),
    membership_type: safeMembershipType(values.membershipType),
    status: 'active',
    ...safePeriod(values),
  },
  'id,organization_id,membership_type,status,valid_from,valid_to,organization:organizations(id,name,short_name)',
);

export const removeAthleteRelation = (table, filters) => {
  let query = supabase.from(table).delete();
  Object.entries(filters).forEach(([column, value]) => { query = query.eq(column, value); });
  return query;
};

export const formatAthleteError = (error) => {
  const code = `${error?.code || ''} ${error?.message || String(error || '')}`;
  const normalized = code.toLowerCase();

  if (normalized.includes('pgrst202') || normalized.includes('schema cache') || normalized.includes('save_admin_athlete')) {
    return 'La actualización necesaria para guardar atletas todavía no está disponible. Intentá nuevamente más tarde.';
  }
  if (normalized.includes('42501') || normalized.includes('unauthorized') || normalized.includes('permission')) {
    return 'No tenés autorización para guardar atletas.';
  }
  if (normalized.includes('public_profile_consent') || normalized.includes('public-profile')) {
    return 'La publicación requiere consentimiento de perfil público vigente.';
  }
  if (normalized.includes('photo_consent') || normalized.includes('photo consent') || normalized.includes('foto')) {
    return 'La publicación de una imagen requiere consentimiento de foto vigente.';
  }
  if (normalized.includes('23503') || normalized.includes('media') || normalized.includes('photo_asset')) {
    return 'La imagen seleccionada ya no está disponible. Elegí otra imagen aprobada.';
  }
  if (normalized.includes('federated') || normalized.includes('federación') || normalized.includes('pre-infant')) {
    return 'No se puede guardar la membresía federada: requiere asociación vigente y no aplica a Pre Infantil.';
  }
  if (normalized.includes('overlap') || normalized.includes('período') || normalized.includes('period')) {
    return 'No se puede guardar el período: se superpone con una categoría existente.';
  }
  if (normalized.includes('invalid_period') || normalized.includes('invalid_date') || normalized.includes('valid_from')) {
    return 'Revisá las fechas: el período debe tener un inicio válido y no puede terminar antes.';
  }
  if (normalized.includes('display_name')) return 'Ingresá un nombre público para el atleta.';
  if (normalized.includes('22023') || normalized.includes('22p02') || normalized.includes('23514') || normalized.includes('invalid')) return 'Revisá los datos públicos del atleta antes de guardar.';
  return 'No se pudo guardar el atleta. Revisá los datos e intentá nuevamente.';
};
