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
  updated_at,
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
  if (!hero) return null;
  if (hero.provider === 'cloudinary' && hero.public_id) {
    return getCloudinaryUrl(hero.public_id, { width: 800, height: 450, crop: 'fill', gravity: 'auto' });
  }
  return hero.external_url || null;
};

const normalizePublicNews = (article) => {
  const heroImage = getHeroImage(article.hero);
  return {
    id: article.id,
    slug: article.slug,
    titulo: article.title,
    fecha: formatDate(article.published_at),
    fechaIso: article.published_at,
    actualizada: article.updated_at ? formatDate(article.updated_at) : null,
    actualizadaIso: article.updated_at || null,
    categoria: article.category || 'Actualidad',
    imagen: heroImage || fallbackImage,
    imagenSeo: heroImage,
    imagenAlt: article.hero?.alt_text || article.title,
    resumen: article.summary || '',
    cuerpoHtml: renderSafeBody(article.body || ''),
  };
};

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
