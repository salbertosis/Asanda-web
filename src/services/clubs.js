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
  if (!logo || logo.is_public !== true || logo.resource_type !== 'image') return null;
  if (logo.provider === 'cloudinary' && logo.public_id && logo.alt_text) {
    return getCloudinaryUrl(logo.public_id, {
      width: 640,
      height: 384,
      crop: 'pad',
      background: 'transparent',
    });
  }
  return null;
};

export const getPublishedClubs = async (signal) => {
  let query = supabase
    .from('organizations')
    .select(`
      id,
      organization_type,
      name,
      short_name,
      description,
      founded_year,
      publication_status,
      logo:media_assets!organizations_logo_asset_id_fkey(
        provider,
        public_id,
        external_url,
        resource_type,
        alt_text,
        is_public
      ),
      contacts:organization_contacts(
        contact_type,
        label,
        value,
        url,
        is_public,
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

  return (Array.isArray(data) ? data : []).filter((club) => (
    club
    && typeof club.id === 'string'
    && typeof club.name === 'string'
    && club.organization_type === 'club'
    && club.publication_status === 'published'
  )).map((club) => {
    const contacts = (Array.isArray(club.contacts) ? club.contacts : []).filter((contact) => contact?.is_public === true);
    const memberships = (Array.isArray(club.memberships) ? club.memberships : []).filter((membership) => (
      membership && typeof membership.athlete_id === 'string'
    ));
    return {
      id: club.id,
      name: club.name,
      shortName: club.short_name,
      description: club.description,
      foundedYear: club.founded_year,
      logoUrl: getLogoUrl(club.logo),
      logoAlt: club.logo?.alt_text || `Logo de ${club.name}`,
      address: selectClubContact(contacts, 'address'),
      phone: selectClubContact(contacts, 'phone'),
      email: selectClubContact(contacts, 'email'),
      website: selectClubContact(contacts, 'website'),
      social: selectClubContact(contacts, 'social'),
      associatedAthletes: countMembers(memberships, 'associated'),
      federatedAthletes: countMembers(memberships, 'federated'),
      totalAthletes: new Set(memberships.map((membership) => membership.athlete_id)).size,
      memberships,
    };
  });
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
