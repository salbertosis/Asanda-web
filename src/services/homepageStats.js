import { supabase } from './supabase';

const countKeys = ['clubs', 'associatedAthletes', 'federatedAthletes', 'preinfantAthletes'];

export const getHomepageStats = async (signal) => {
  let query = supabase.rpc('get_homepage_stats');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw error;

  const normalized = Object.fromEntries(countKeys.map((key) => [key, Number(data?.[key])]));
  if (countKeys.some((key) => !Number.isInteger(normalized[key]) || normalized[key] < 0)) {
    throw new Error('Homepage statistics response is malformed.');
  }

  return { ...normalized, asOf: data.asOf };
};
