import { getCloudinaryUrl } from '../config/cloudinary';
import { supabase } from './supabase';

const selectClubContact = (contacts, type) => (
  [...contacts]
    .sort((a, b) => a.sort_order - b.sort_order)
    .find((contact) => contact.contact_type === type)
);

const countMembers = (memberships, membershipType) => new Set(
  memberships
    .filter((membership) => membership.membership_type === membershipType)
    .map((membership) => membership.athlete_id)
).size;

const getLogoUrl = (logo) => {
  if (!logo) return null;
  if (logo.provider === 'cloudinary' && logo.public_id) {
    return getCloudinaryUrl(logo.public_id, { width: 640, height: 384, crop: 'fit' });
  }
  return logo.external_url || null;
};

export const getPublishedClubs = async (signal) => {
  let query = supabase
    .from('organizations')
    .select(`
      id,
      name,
      short_name,
      description,
      founded_year,
      logo:media_assets!organizations_logo_asset_id_fkey(
        provider,
        public_id,
        external_url,
        alt_text
      ),
      contacts:organization_contacts(
        contact_type,
        label,
        value,
        url,
        sort_order
      ),
      memberships:athlete_memberships(
        athlete_id,
        membership_type
      )
    `)
    .eq('organization_type', 'club')
    .eq('publication_status', 'published')
    .order('name');

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;

  return data.map((club) => ({
    id: club.id,
    name: club.name,
    shortName: club.short_name,
    description: club.description,
    foundedYear: club.founded_year,
    logoUrl: getLogoUrl(club.logo),
    logoAlt: club.logo?.alt_text || `Logo de ${club.name}`,
    address: selectClubContact(club.contacts, 'address'),
    phone: selectClubContact(club.contacts, 'phone'),
    email: selectClubContact(club.contacts, 'email'),
    social: selectClubContact(club.contacts, 'social'),
    associatedAthletes: countMembers(club.memberships, 'associated'),
    federatedAthletes: countMembers(club.memberships, 'federated'),
    memberships: club.memberships,
  }));
};

export const getClubTotals = (clubs) => {
  const associated = new Set();
  const federated = new Set();

  clubs.forEach((club) => {
    club.memberships.forEach((membership) => {
      if (membership.membership_type === 'associated') associated.add(membership.athlete_id);
      if (membership.membership_type === 'federated') federated.add(membership.athlete_id);
    });
  });

  return {
    clubs: clubs.length,
    athletes: new Set([...associated, ...federated]).size,
  };
};
