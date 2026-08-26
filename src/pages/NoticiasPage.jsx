import React, { useEffect, useState } from 'react';
import PageHero from '../components/PageHero';
import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPublishedNews } from '../services/news';

const NoticiasPage = () => {
  const [noticias, setNoticias] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getPublishedNews({ signal: controller.signal })
      .then((publishedNews) => {
        if (!active) return;
        setNoticias(publishedNews);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const [featuredNews, ...remainingNews] = noticias;

  return (
    <div className="min-h-screen bg-asanda-foam dark:bg-dark-bg">
      <PageHero
        title="Noticias"
        subtitle="Historias, resultados y novedades de los deportes acuáticos en Anzoátegui."
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
        compact
      />

      <section id="noticias" aria-labelledby="news-title" className="border-t border-asanda-line bg-asanda-foam py-10 dark:border-slate-800 dark:bg-dark-bg sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <div className="mb-8">
            <p className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-asanda-deep dark:text-cyan-300">
              <span className="h-px w-8 bg-asanda-orange" aria-hidden="true" />
              Actualidad ASANDA
            </p>
            <h2 id="news-title" className="font-display text-[2rem] font-bold leading-none tracking-tight text-asanda-ink dark:text-white sm:text-4xl">
              Últimas noticias
            </h2>
          </div>
          {status === 'loading' && (
            <p role="status" className="rounded-[14px] border border-[#d3e9ea] bg-white p-6 text-sm font-bold text-asanda-deep dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100">
              Cargando noticias…
            </p>
          )}
          {status === 'error' && (
            <p role="alert" className="rounded-[14px] border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
              No pudimos cargar las noticias. Intentá nuevamente más tarde.
            </p>
          )}
          {status === 'ready' && noticias.length === 0 && (
            <p className="rounded-[14px] border border-[#d3e9ea] bg-white p-6 text-sm font-bold text-asanda-deep dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100">
              Todavía no hay noticias publicadas.
            </p>
          )}
          {status === 'ready' && featuredNews && (
            <div className="space-y-8">
              <article
                data-testid="featured-news"
                className="group grid overflow-hidden rounded-[18px] border border-[#d3e9ea] bg-white shadow-[0_24px_60px_-40px_rgba(8,127,132,0.6)] transition-[box-shadow,border-color] hover:border-asanda-orange focus-within:border-asanda-orange focus-within:shadow-[0_24px_60px_-34px_rgba(8,127,132,0.55)] dark:border-slate-700 dark:bg-dark-surface md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
              >
                <div className="relative aspect-video min-w-0 overflow-hidden md:aspect-auto md:min-h-80">
                  <img
                    src={featuredNews.imagen}
                    alt={featuredNews.imagenAlt}
                    width="800"
                    height="450"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
                  />
                  <div className="absolute left-4 top-4">
                    <span className="rounded-full bg-asanda-deep px-3 py-1 text-xs font-bold text-white shadow-sm">
                      {featuredNews.categoria}
                    </span>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col justify-center p-6 sm:p-8">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-asanda-orange">Noticia destacada</p>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-300">
                    <Calendar className="text-asanda-orange" size={15} aria-hidden="true" />
                    <time dateTime={featuredNews.fechaIso}>{featuredNews.fecha}</time>
                  </div>
                  <h3 className="mb-3 text-2xl font-bold leading-tight text-asanda-ink transition-colors group-hover:text-asanda-deep group-focus-within:text-asanda-deep dark:text-white dark:group-hover:text-cyan-300 dark:group-focus-within:text-cyan-300 sm:text-3xl">
                    <Link to={`/noticias/${featuredNews.slug}`} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-asanda-orange">
                      {featuredNews.titulo}
                    </Link>
                  </h3>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                    {featuredNews.resumen}
                  </p>
                </div>
              </article>

              {remainingNews.length > 0 && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {remainingNews.map((noticia) => (
                  <article key={noticia.id} className="group grid min-w-0 grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-[#d3e9ea] bg-white shadow-[0_18px_45px_-34px_rgba(8,127,132,0.55)] transition-[transform,box-shadow,border-color] hover:border-asanda-orange focus-within:border-asanda-orange focus-within:shadow-[0_20px_50px_-32px_rgba(8,127,132,0.5)] dark:border-slate-700 dark:bg-dark-surface md:block motion-safe:hover:-translate-y-0.5">
                    <div className="relative aspect-square overflow-hidden md:aspect-video">
                      <img src={noticia.imagen} alt={noticia.imagenAlt} width="400" height="225" loading="lazy" decoding="async" className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]" />
                      <span className="absolute left-2 top-2 hidden rounded-full bg-asanda-deep px-3 py-1 text-xs font-bold text-white shadow-sm sm:block">{noticia.categoria}</span>
                    </div>
                    <div className="min-w-0 p-4 md:p-5">
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300">
                        <Calendar className="shrink-0 text-asanda-orange" size={14} aria-hidden="true" />
                        <time dateTime={noticia.fechaIso}>{noticia.fecha}</time>
                      </div>
                      <h3 className="text-base font-bold leading-snug text-asanda-ink transition-colors group-hover:text-asanda-deep group-focus-within:text-asanda-deep dark:text-white dark:group-hover:text-cyan-300 dark:group-focus-within:text-cyan-300 md:text-xl">
                        <Link to={`/noticias/${noticia.slug}`} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asanda-orange">
                          {noticia.titulo}
                        </Link>
                      </h3>
                      <p className="mt-2 hidden line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300 md:block">{noticia.resumen}</p>
                    </div>
                  </article>
                ))}
              </div>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default NoticiasPage;
