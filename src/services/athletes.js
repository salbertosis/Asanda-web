import { getCloudinaryUrl } from '../config/cloudinary';
import { supabase } from './supabase';

const getPhotoUrl = (photo) => {
  if (!photo) return '/asanda.png';
  if (photo.provider === 'cloudinary' && photo.public_id) {
    return getCloudinaryUrl(photo.public_id, {
      width: 320,
      height: 320,
      crop: 'fill',
      gravity: 'face',
    });
  }
  return photo.external_url || '/asanda.png';
};

const normalizeSex = (competitiveSex) => ({
  female: 'Femenino',
  male: 'Masculino',
  mixed: 'Mixto',
  open: 'Abierto',
}[competitiveSex] || 'No especificado');

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

  return data.flatMap((athlete) => {
    const membershipsByClub = new Map();
    athlete.memberships.forEach((membership) => {
      if (!membership.organization) return;
      const current = membershipsByClub.get(membership.organization.id) || {
        organization: membership.organization,
        types: new Set(),
      };
      current.types.add(membership.membership_type);
      membershipsByClub.set(membership.organization.id, current);
    });

    return [...membershipsByClub.values()]
      .filter(({ types }) => types.has(membershipType))
      .map(({ organization, types }) => ({
        id: `${athlete.id}-${organization.id}`,
        athleteId: athlete.id,
        name: athlete.preferred_name || athlete.display_name,
        fullName: athlete.display_name,
        sex: normalizeSex(athlete.competitive_sex),
        photoUrl: getPhotoUrl(athlete.photo),
        photoAlt: athlete.photo?.alt_text || `Retrato de ${athlete.display_name}`,
        clubId: organization.id,
        clubName: organization.name,
        clubShortName: organization.short_name,
        category: athlete.categories[0]?.category?.name || 'Sin categoría',
        disciplines: athlete.disciplines
          .map(({ discipline }) => discipline?.name)
          .filter(Boolean),
        isFederated: types.has('federated'),
      }));
  }).sort((a, b) => a.clubName.localeCompare(b.clubName) || a.name.localeCompare(b.name));
};
