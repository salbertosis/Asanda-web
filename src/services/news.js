import { getCloudinaryUrl } from '../config/cloudinary';
import { renderSafeBody } from './admin/editorialLogic';
import { supabase } from './supabase';

const NEWS_SELECT = `
  id,
  slug,
  title,
  summary,
  body,
  category,
  published_at,
  hero:media_assets!news_articles_hero_asset_id_fkey(
    provider,
    public_id,
    external_url,
    alt_text
  )
`;

const fallbackImage = '/asanda.png';

const formatDate = (value) => new Intl.DateTimeFormat('es-VE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(value));

const getHeroImage = (hero) => {
  if (!hero) return fallbackImage;
  if (hero.provider === 'cloudinary' && hero.public_id) {
    return getCloudinaryUrl(hero.public_id, { width: 800, height: 450, crop: 'fill' });
  }
  return hero.external_url || fallbackImage;
};

const normalizePublicNews = (article) => ({
  id: article.id,
  slug: article.slug,
  titulo: article.title,
  fecha: formatDate(article.published_at),
  categoria: article.category || 'Actualidad',
  imagen: getHeroImage(article.hero),
  imagenAlt: article.hero?.alt_text || article.title,
  resumen: article.summary || '',
  cuerpoHtml: renderSafeBody(article.body || ''),
});

const buildPublishedNewsQuery = () => supabase
  .from('news_articles')
  .select(NEWS_SELECT)
  .eq('publication_status', 'published')
  .lte('published_at', new Date().toISOString())
  .order('published_at', { ascending: false });

export const getPublishedNews = async ({ limit, signal } = {}) => {
  let query = buildPublishedNewsQuery();
  if (limit) query = query.limit(limit);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(normalizePublicNews);
};

export const getPublishedNewsBySlug = async (slug, signal) => {
  let query = buildPublishedNewsQuery().eq('slug', slug).maybeSingle();
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw error;

  return data ? normalizePublicNews(data) : null;
};
