import { supabase } from '../supabase';
import { confirmedOutcome, rejectedOutcome, unknownOutcome } from './commandOutcome.js';
import { scheduledStatus, validateNewsInput } from './editorialLogic';

const NEWS_SELECT = 'id,slug,title,summary,body,category,hero_asset_id,publication_status,published_at,author_id,revision,created_at,updated_at';
const normalizeNews = (row) => ({
  id: row.id, slug: row.slug, title: row.title, summary: row.summary, body: row.body, category: row.category,
  heroAssetId: row.hero_asset_id, publicationStatus: row.publication_status, publishedAt: row.published_at,
  authorId: row.author_id, revision: row.revision,
  status: scheduledStatus({ publicationStatus: row.publication_status, publishedAt: row.published_at }),
});
const newsInput = (input) => ({
  requested_slug: input.slug.trim(), requested_title: input.title.trim(), requested_summary: input.summary?.trim() || null,
  requested_body: input.body, requested_category: input.category?.trim() || null, requested_hero_asset_id: input.heroAssetId || null,
});
const commandResult = ({ data, error }) => {
  const message = error?.message ?? '';
  if (message.includes('NEWS_REVISION_CONFLICT')) return rejectedOutcome('NEWS_STALE');
  if (message.includes('NEWS_UNAUTHORIZED') || error?.code === '42501') return rejectedOutcome('NEWS_UNAUTHORIZED');
  if (message.includes('NEWS_INVALID') || message.includes('NEWS_REVISION_INVALID') || message.includes('NEWS_STATUS_INVALID') || error?.code === '22023') return rejectedOutcome('NEWS_INVALID');
  if (error?.code === '23505') return rejectedOutcome('NEWS_DUPLICATE', 'slug');
  if (error || !data?.id || !Number.isInteger(data.revision)) return unknownOutcome();
  return confirmedOutcome(normalizeNews(data));
};
const runRpc = async (name, parameters) => commandResult(await supabase.rpc(name, parameters).single());

export const matchesNewsPostcondition = (stored, id, revision, expected) => stored?.id === id && Number.isInteger(stored.revision) && stored.revision > revision &&
  ['title', 'slug', 'summary', 'body', 'category', 'heroAssetId'].every((field) => (stored[field] ?? '') === (field === 'body' ? expected[field] ?? '' : (expected[field] ?? '').trim()));
export const listAdminNews = async () => {
  const { data, error } = await supabase.from('news_articles').select(NEWS_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeNews);
};
export const getNewsById = async (id) => {
  const { data, error } = await supabase.from('news_articles').select(NEWS_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeNews(data) : null;
};
export const createNews = (input) => validateNewsInput(input).ok ? runRpc('save_admin_news', {
  requested_article_id: null, requested_expected_revision: null, ...newsInput(input),
}) : Promise.resolve(rejectedOutcome('NEWS_INVALID'));
export const updateNews = (id, revision, input) => !validateNewsInput(input).ok || !Number.isInteger(revision) ? Promise.resolve(rejectedOutcome('NEWS_INVALID')) : runRpc('save_admin_news', {
  requested_article_id: id, requested_expected_revision: revision, ...newsInput(input),
});
const setStatus = (id, revision, status, publishedAt) => !id || !Number.isInteger(revision) ? Promise.resolve(rejectedOutcome('NEWS_INVALID')) : runRpc('set_admin_news_status', {
  requested_article_id: id, requested_expected_revision: revision, requested_status: status, requested_published_at: publishedAt,
});
export const publishNews = (id, revision, publishedAt = new Date().toISOString()) => setStatus(id, revision, 'published', publishedAt);
export const archiveNews = (id, revision) => setStatus(id, revision, 'archived', null);
