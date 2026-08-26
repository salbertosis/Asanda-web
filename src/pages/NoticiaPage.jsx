import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { useRouteHeadMetadata } from '../components/layout/RouteHead';
import { buildNewsArticleMetadata } from '../seo/routeMetadata';
import { getPublishedNewsBySlug } from '../services/news';
import UpcomingEvents from '../components/UpcomingEvents';

const NoticiaPage = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState('loading');
  const [canShare, setCanShare] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const articleMetadata = article ? buildNewsArticleMetadata(article, `/noticias/${slug}`) : null;
  useRouteHeadMetadata(articleMetadata);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setStatus('loading');
    setArticle(null);
    setShareFeedback('');

    getPublishedNewsBySlug(slug, controller.signal)
      .then((publishedArticle) => {
        if (!active) return;
        setArticle(publishedArticle);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [slug]);

  const handleShare = async () => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

    setShareFeedback('');
    try {
      await navigator.share({
        title: article.titulo,
        text: article.resumen,
        url: articleMetadata?.canonicalUrl || (typeof window !== 'undefined' ? window.location.href : undefined),
      });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setShareFeedback('No pudimos abrir las opciones para compartir. Intentá nuevamente.');
      }
    }
  };

  if (status === 'loading') {
    return (
      <article className="min-h-screen bg-slate-50" aria-busy="true" data-testid="news-detail-skeleton">
        <div role="status" className="sr-only">Cargando noticia…</div>
        <header className="overflow-hidden border-b-4 border-[#C94B24] bg-[#0F4C5C]" aria-hidden="true">
          <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
            <div className="h-11 w-40 rounded-full bg-white/10" />
            <div className="mt-4 grid items-center gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-10">
              <div className="min-w-0 space-y-4">
                <div className="h-3 w-28 rounded bg-cyan-100/25" />
                <div className="h-9 w-full max-w-xl rounded bg-white/20 sm:h-10" />
                <div className="h-9 w-4/5 max-w-lg rounded bg-white/20 sm:h-10" />
                <div className="h-4 w-64 max-w-full rounded bg-cyan-100/20" />
                <div className="h-4 w-36 rounded bg-white/20" />
                <div className="h-11 w-11 rounded-full bg-white/10" />
                <div className="space-y-3 pt-1">
                  <div className="h-4 w-full max-w-2xl rounded bg-cyan-100/20" />
                  <div className="h-4 w-3/4 max-w-xl rounded bg-cyan-100/20" />
                </div>
              </div>
              <div className="aspect-[16/9] w-full rounded-2xl border border-white/15 bg-white/10" />
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-11 lg:px-8 lg:py-14" aria-hidden="true">
          <div className="max-w-[66ch] space-y-4">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-5/6 rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-200" />
          </div>
        </div>
      </article>
    );
  }

  if (status === 'error') {
    return (
      <section className="min-h-[60vh] bg-slate-50 px-4 py-20 text-center dark:bg-slate-950" role="alert">
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">No pudimos cargar la noticia</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Intentá nuevamente más tarde.</p>
        <Link to="/noticias" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0F4C5C] px-5 font-bold text-white">
          <ArrowLeft size={18} aria-hidden="true" /> Volver a noticias
        </Link>
      </section>
    );
  }

  if (!article) {
    return (
      <section className="min-h-[60vh] bg-slate-50 px-4 py-20 text-center dark:bg-slate-950">
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Noticia no encontrada</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">La noticia solicitada no está publicada.</p>
        <Link to="/noticias" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0F4C5C] px-5 font-bold text-white">
          <ArrowLeft size={18} aria-hidden="true" /> Volver a noticias
        </Link>
      </section>
    );
  }

  return (
    <article className="min-h-screen bg-slate-50 dark:bg-slate-950" itemScope itemType="https://schema.org/NewsArticle">
      <header
        className="relative overflow-hidden border-b-4 border-[#C94B24] bg-[#0F4C5C] text-white"
        data-testid="news-detail-hero"
      >
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
          <Link
            to="/noticias"
            className="inline-flex min-h-11 items-center gap-2 rounded-full pr-4 text-sm font-bold text-cyan-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft size={18} aria-hidden="true" /> Volver a noticias
          </Link>

          <div className="mt-4 grid items-center gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200" itemProp="articleSection">{article.categoria}</p>
              <h1 className="font-display mt-3 text-3xl font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl lg:text-5xl" itemProp="headline">
                {article.titulo}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-cyan-100">
                <Calendar size={16} aria-hidden="true" />
                <span>Publicada el <time dateTime={article.fechaIso} itemProp="datePublished">{article.fecha}</time></span>
                {article.actualizadaIso && <span>Actualizada el <time dateTime={article.actualizadaIso} itemProp="dateModified">{article.actualizada}</time></span>}
              </div>
              <p className="mt-3 text-sm font-bold text-white">Por <span itemProp="author" itemScope itemType="https://schema.org/Organization"><span itemProp="name">Redacción ASANDA</span></span></p>
              {canShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="mt-5 inline-flex size-11 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Compartir noticia"
                >
                  <Share2 size={20} aria-hidden="true" />
                </button>
              )}
              {shareFeedback && <p className="mt-3 max-w-2xl text-sm text-cyan-50" role="status">{shareFeedback}</p>}
              {article.resumen && (
                <p className="mt-5 max-w-2xl text-base leading-7 text-cyan-50 sm:text-lg sm:leading-8" itemProp="description">
                  {article.resumen}
                </p>
              )}
            </div>

            <figure className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl shadow-slate-950/25">
              <img
                src={article.imagen}
                alt={article.imagenAlt}
                itemProp="image"
                width="800"
                height="450"
                fetchPriority="high"
                className="aspect-[16/9] w-full object-cover"
              />
            </figure>
          </div>
        </div>
</header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-11 lg:px-8 lg:py-14">
        <div
          className="prose-news dark:prose-invert"
          data-testid="news-article-body"
          dangerouslySetInnerHTML={{ __html: article.cuerpoHtml }}
        />
        <UpcomingEvents />
      </div>
    </article>
  );
};

export default NoticiaPage;
