import { supabase } from './supabase.js';

const PUBLIC_VIDEO_SELECT = `id,slug,title,description,duration_seconds,thumbnail_asset_id,published_at,thumbnail:media_assets!videos_thumbnail_asset_id_fkey(provider,public_id,external_url,resource_type,alt_text,is_public)`;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const exactId = (value) => {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new Error('VIDEO_ID_INVALID');
  return value;
};
const normalizePublishedVideo = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description ?? null,
  durationSeconds: row.duration_seconds,
  thumbnailAssetId: row.thumbnail_asset_id ?? null,
  thumbnail: row.thumbnail?.resource_type === 'image' && row.thumbnail?.is_public ? {
    provider: row.thumbnail.provider,
    publicId: row.thumbnail.public_id ?? null,
    externalUrl: row.thumbnail.external_url ?? null,
    altText: row.thumbnail.alt_text ?? null,
  } : null,
  publishedAt: row.published_at,
});

export async function listPublishedVideos({ now = new Date(), signal } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('VIDEO_DATE_INVALID');
  let query = supabase.from('videos').select(PUBLIC_VIDEO_SELECT)
    .eq('provider', 'cloudinary')
    .eq('publication_status', 'published')
    .lte('published_at', now.toISOString())
    .order('published_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizePublishedVideo);
}

export async function requestVideoPlayback(videoId) {
  const { data, error } = await supabase.functions.invoke('video-media', { body: { action: 'playback', videoId: exactId(videoId) } });
  if (error) throw error;
  if (!data?.url || data.videoId !== videoId) throw new Error('VIDEO_PLAYBACK_INVALID');
  return data;
}
