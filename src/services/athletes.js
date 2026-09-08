import { getCloudinaryUrl } from '../config/cloudinary';
import { supabase } from './supabase';

const getPhotoUrl = (photo, dimensions = { width: 320, height: 320 }) => {
  if (!photo) return '/asanda.png';
  if (photo.provider === 'cloudinary' && photo.public_id) {
    return getCloudinaryUrl(photo.public_id, {
      width: dimensions.width,
      height: dimensions.height,
      crop: 'fill',
      gravity: 'face',
    });
  }
  return photo.external_url || '/asanda.png';
};

const getPhotoAlt = (photo, displayName) => getPhotoUrl(photo) === '/asanda.png'
  ? 'Logotipo de ASANDA'
  : photo?.alt_text || `Retrato de ${displayName}`;

const normalizeSex = (competitiveSex) => ({
  female: 'Femenino',
  male: 'Masculino',
  mixed: 'Mixto',
  open: 'Abierto',
}[competitiveSex] || 'No especificado');

const collapseMembershipsByOrganization = (memberships = []) => {
  const membershipsByOrganization = new Map();

  memberships.forEach((membership) => {
    if (!membership.organization) return;
    const organizationId = membership.organization.id;
    const current = membershipsByOrganization.get(organizationId) || {
      organization: membership.organization,
      types: new Set(),
    };
    if (membership.membership_type) current.types.add(membership.membership_type);
    membershipsByOrganization.set(organizationId, current);
  });

  return [...membershipsByOrganization.values()]
    .sort((a, b) => a.organization.id.localeCompare(b.organization.id));
};

const normalizeDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

const clean = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const GROUP_TYPES = new Set(['national_podium', 'international_podium', 'international_participation', 'state_record']);
const PARTICIPATION_OUTCOMES = new Set(['top_8', 'outstanding_participation']);

const normalizeAchievementChild = (child, type) => {
  const eventName = clean(child?.eventName);
  if (!eventName) return null;
  if (type === 'national_podium' || type === 'international_podium') {
    const podiumPlace = Number(child.podiumPlace);
    return [1, 2, 3].includes(podiumPlace) ? { eventName, podiumPlace } : null;
  }
  if (type === 'international_participation') {
    return PARTICIPATION_OUTCOMES.has(child.participationOutcome)
      ? { eventName, participationOutcome: child.participationOutcome }
      : null;
  }
  const record = child?.record;
  const timeMs = Number(record?.timeMs);
  const achievedYear = Number(record?.achievedYear);
  const competitionName = clean(record?.competitionName);
  const categoryName = clean(record?.categoryName);
  if (!Number.isSafeInteger(timeMs) || timeMs <= 0 || !Number.isInteger(achievedYear) || achievedYear <= 0 || !competitionName || !categoryName) return null;
  return { eventName, record: { timeMs, achievedYear, competitionName, categoryName } };
};

const normalizeAchievementGroups = (achievements) => (Array.isArray(achievements) ? achievements : []).flatMap((group) => {
  const type = group?.type;
  const title = clean(group?.title);
  const competitionName = clean(group?.competitionName);
  const location = clean(group?.location);
  const achievedOn = normalizeDate(group?.achievedOn);
  if (!GROUP_TYPES.has(type) || !title || !competitionName || !location || !achievedOn) return [];
  const children = (Array.isArray(group.children) ? group.children : [])
    .map((child) => normalizeAchievementChild(child, type))
    .filter(Boolean);
  return children.length ? [{ type, title, competitionName, location, achievedOn, children }] : [];
}).slice(0, 6);

const normalizeFeaturedProfile = (profile) => ({
  events: [...new Set(Array.isArray(profile?.events) ? profile.events.filter((event) => typeof event === 'string' && event.trim()) : [])]
    .sort((a, b) => a.localeCompare(b, 'es')),
  results: (Array.isArray(profile?.results) ? profile.results : []).flatMap((result) => {
    if (!result || typeof result.event_name !== 'string' || typeof result.competition_name !== 'string' || !normalizeDate(result.competition_date)) return [];
    const timeMs = Number(result.time_ms);
    const place = result.place == null ? null : Number(result.place);
    return [{
      eventName: result.event_name,
      timeMs: Number.isFinite(timeMs) && timeMs > 0 ? timeMs : null,
      place: Number.isInteger(place) && place > 0 ? place : null,
      competitionName: result.competition_name,
      competitionDate: normalizeDate(result.competition_date),
    }];
  }),
  achievements: normalizeAchievementGroups(profile?.achievements),
});

const normalizeFeaturedAthletes = (rows, maximum = Infinity) => {
  const athletesByKey = new Map();
  for (const row of rows ?? []) {
    if (athletesByKey.size >= maximum) {
      console.warn('The homepage featured athlete RPC exceeded its public limit.');
      break;
    }
    const displayOrder = Number(row?.display_order);
    if (!/^v1_[0-9a-f]{64}$/.test(row?.profile_key) || !Number.isInteger(displayOrder) || typeof row?.display_name !== 'string' || !row.display_name.trim()) {
      console.warn('A featured athlete profile did not match the public RPC contract.');
      continue;
    }
    if (athletesByKey.has(row.profile_key)) {
      console.warn('The public featured athlete RPC returned a duplicate profile key.');
      continue;
    }

    const photo = row.photo_provider ? {
      provider: row.photo_provider,
      public_id: row.photo_public_id,
      external_url: row.photo_external_url,
      alt_text: row.photo_alt_text,
    } : null;
    const clubName = row.club_name || 'Organización no disponible';
    const profile = normalizeFeaturedProfile(row);
    athletesByKey.set(row.profile_key, {
      profileKey: row.profile_key,
      displayOrder,
      name: row.preferred_name || row.display_name,
      fullName: row.display_name,
      photoUrl: getPhotoUrl(photo, { width: 720, height: 520 }),
      photoAlt: getPhotoAlt(photo, row.display_name),
      organization: row.club_short_name || clubName,
      clubName,
      clubShortName: row.club_short_name || null,
      category: row.category_name || 'Sin categoría',
      events: profile.events,
      results: profile.results,
      achievements: profile.achievements,
    });
  }

  return [...athletesByKey.values()];
};

const fetchFeaturedAthleteRows = async (rpc, parameters, signal) => {
  let query = parameters === undefined ? supabase.rpc(rpc) : supabase.rpc(rpc, parameters);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

export const getFeaturedAthletePreview = async (signal) => {
  const rows = await fetchFeaturedAthleteRows('get_homepage_featured_athlete_profiles', undefined, signal);
  return normalizeFeaturedAthletes(rows, 6);
};

export const getFeaturedAthleteDirectory = async (signal) => {
  const pageSize = 100;
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchFeaturedAthleteRows('get_featured_athlete_profiles', {
      requested_limit: pageSize,
      requested_offset: offset,
    }, signal);
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return normalizeFeaturedAthletes(rows);
};

export const getPublishedAthletes = async (membershipType, signal) => {
  let query = supabase
    .from('athletes')
    .select(`
      id,
      display_name,
      preferred_name,
      competitive_sex,
      photo:media_assets!athletes_photo_asset_id_fkey(
        provider,
        public_id,
        external_url,
        alt_text
      ),
      memberships:athlete_memberships(
        membership_type,
        organization:organizations(id,name,short_name)
      ),
      disciplines:athlete_disciplines(
        discipline:disciplines(code,name)
      ),
      categories:athlete_category_assignments(
        category:age_categories(code,name,sort_order)
      )
    `)
    .eq('publication_status', 'published')
    .order('display_name');

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).flatMap((athlete) => {
    const memberships = collapseMembershipsByOrganization(athlete.memberships);
    const currentMembership = (membershipType
      ? memberships.filter(({ types }) => types.has(membershipType))
      : memberships)[0];
    if (membershipType && !currentMembership) return [];

    return [{
      id: membershipType && currentMembership
        ? `${athlete.id}-${currentMembership.organization.id}`
        : athlete.id,
      athleteId: athlete.id,
      name: athlete.preferred_name || athlete.display_name,
      fullName: athlete.display_name,
      sex: normalizeSex(athlete.competitive_sex),
      photoUrl: getPhotoUrl(athlete.photo),
      photoAlt: getPhotoAlt(athlete.photo, athlete.display_name),
      clubId: currentMembership?.organization.id ?? null,
      clubName: currentMembership?.organization.name || 'Sin club publicado',
      clubShortName: currentMembership?.organization.short_name,
      category: athlete.categories?.[0]?.category?.name || 'Sin categoría',
      disciplines: (athlete.disciplines ?? [])
        .map(({ discipline }) => discipline?.name)
        .filter(Boolean),
      isFederated: currentMembership?.types.has('federated') ?? false,
    }];
  }).sort((a, b) => a.clubName.localeCompare(b.clubName) || a.name.localeCompare(b.name));
};
