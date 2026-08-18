import { supabase } from '../supabase';
import { scheduledStatus, validateNewsInput } from './editorialLogic';

const NEWS_SELECT = 'id,slug,title,summary,body,category,hero_asset_id,publication_status,published_at,author_id,created_at,updated_at';

const normalizeNews = (row) => ({
  id: row.id, slug: row.slug, title: row.title, summary: row.summary, body: row.body, category: row.category,
  heroAssetId: row.hero_asset_id, publicationStatus: row.publication_status, publishedAt: row.published_at,
  authorId: row.author_id, status: scheduledStatus({ publicationStatus: row.publication_status, publishedAt: row.published_at }),
});

const newsInput = (input) => ({
  title: input.title.trim(),
  slug: input.slug.trim(),
  summary: input.summary?.trim(),
  body: input.body,
  category: input.category?.trim(),
});

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

export const createNews = async (input) => {
  if (!validateNewsInput(input).ok) throw new Error('Datos de noticia inválidos.');
  const { data, error } = await supabase.from('news_articles').insert({ ...newsInput(input), publication_status: 'draft' }).select(NEWS_SELECT).single();
  if (error) throw error;
  return normalizeNews(data);
};

export const updateNews = async (id, input) => {
  if (!validateNewsInput(input).ok) throw new Error('Datos de noticia inválidos.');
  const { data, error } = await supabase.from('news_articles').update(newsInput(input)).eq('id', id).select(NEWS_SELECT).single();
  if (error) throw error;
  return normalizeNews(data);
};

export const publishNews = async (id, publishedAt = new Date().toISOString()) => {
  const { data, error } = await supabase.from('news_articles').update({ publication_status: 'published', published_at: publishedAt }).eq('id', id).select(NEWS_SELECT).single();
  if (error) throw error;
  return normalizeNews(data);
};

export const archiveNews = async (id) => {
  const { data, error } = await supabase.from('news_articles').update({ publication_status: 'archived' }).eq('id', id).select(NEWS_SELECT).single();
  if (error) throw error;
  return normalizeNews(data);
};