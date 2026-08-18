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
  const { data, error } = await supabase.from('athletes').select('id,display_name').eq('publication_status', 'published').order('display_name');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, displayName: row.display_name }));
};

export const saveFeaturedAthlete = async (entry) => {
  const validation = featuredWindow([{ athleteId: entry.athleteId, displayOrder: entry.displayOrder, startsAt: entry.startsAt, endsAt: entry.endsAt }]);
  if (!validation.ok) throw new Error('Selección destacada inválida.');
  const payload = { athlete_id: entry.athleteId, display_order: entry.displayOrder, starts_at: entry.startsAt ?? null, ends_at: entry.endsAt ?? null };
  const query = entry.id
    ? supabase.from('featured_athletes').update(payload).eq('id', entry.id)
    : supabase.from('featured_athletes').insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
};

export const removeFeaturedAthlete = async (id) => {
  const { error } = await supabase.from('featured_athletes').delete().eq('id', id);
  if (error) throw error;
};