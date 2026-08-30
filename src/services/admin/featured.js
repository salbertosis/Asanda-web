import { supabase } from '../supabase';
import { featuredWindow } from './editorialLogic';

const normalize = (row) => ({
  id: row.id, athleteId: row.athlete_id, displayOrder: row.display_order,
  startsAt: row.starts_at, endsAt: row.ends_at, athleteName: row.athletes?.display_name ?? '',
});

export const listFeaturedAthletes = async () => {
  const { data, error } = await supabase.from('featured_athletes').select('id,athlete_id,display_order,starts_at,ends_at,athletes(display_name)').order('display_order');
  if (error) throw error;
  return (data ?? []).map(normalize);
};

export const listPublishableAthletes = async () => {
  const { data, error } = await supabase.rpc('list_featured_athlete_candidates');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, displayName: row.display_name }));
};

export const saveFeaturedAthlete = async (entry) => {
  const validation = featuredWindow([{ athleteId: entry.athleteId, startsAt: entry.startsAt, endsAt: entry.endsAt }]);
  if (!validation.ok) throw new Error('Selección destacada inválida.');
  const dates = { starts_at: entry.startsAt ?? null, ends_at: entry.endsAt ?? null };
  const result = entry.id
    ? await supabase.from('featured_athletes').update(dates).eq('id', entry.id).select().single()
    : await supabase.rpc('append_featured_athlete', {
        requested_athlete_id: entry.athleteId,
        requested_starts_at: dates.starts_at,
        requested_ends_at: dates.ends_at,
      });
  const { data, error } = result;
  if (error) throw error;
  return data;
};

export const moveFeaturedAthlete = async (id, direction) => {
  if (direction !== 'up' && direction !== 'down') throw new Error('Dirección de destacado inválida.');
  const { data, error } = await supabase.rpc('move_featured_athlete', {
    requested_featured_id: id,
    requested_direction: direction,
  });
  if (error) throw error;
  return data;
};

export const removeFeaturedAthlete = async (id) => {
  const { error } = await supabase.from('featured_athletes').delete().eq('id', id);
  if (error) throw error;
};
