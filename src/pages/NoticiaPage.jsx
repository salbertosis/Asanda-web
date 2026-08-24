import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { getPublishedNewsBySlug } from '../services/news';

const NoticiaPage = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setStatus('loading');
    setArticle(null);

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

  if (status === 'loading') {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-slate-50 px-4 dark:bg-slate-950" role="status">
        <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Cargando noticia…</p>
      </div>
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
    <article className="min-h-screen bg-slate-50 dark:bg-slate-950">
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
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">{article.categoria}</p>
              <h1 className="font-display mt-3 text-3xl font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {article.titulo}
              </h1>
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-cyan-100">
                <Calendar size={16} aria-hidden="true" />
                <time dateTime={article.fechaIso}>{article.fecha}</time>
              </p>
              {article.resumen && (
                <p className="mt-5 max-w-2xl text-base leading-7 text-cyan-50 sm:text-lg sm:leading-8">
                  {article.resumen}
                </p>
              )}
            </div>

            <figure className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl shadow-slate-950/25">
              <img
                src={article.imagen}
                alt={article.imagenAlt}
                width="800"
                height="450"
                fetchPriority="high"
                className="aspect-[16/9] w-full object-cover"
              />
            </figure>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
        <div
          className="max-w-none break-words rounded-2xl border border-slate-200 bg-white p-6 text-lg leading-8 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 sm:p-9 lg:p-10 [&_a]:font-semibold [&_a]:text-[#087f84] [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-4 dark:[&_a]:text-cyan-300 [&_blockquote]:my-8 [&_blockquote]:border-l-4 [&_blockquote]:border-[#C94B24] [&_blockquote]:pl-5 [&_blockquote]:italic [&_h2]:mb-4 [&_h2]:mt-9 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-950 dark:[&_h2]:text-white [&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-950 dark:[&_h3]:text-white [&_li]:my-2 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_strong]:font-bold [&_strong]:text-slate-950 dark:[&_strong]:text-white [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: article.cuerpoHtml }}
        />
      </div>
    </article>
  );
};

export default NoticiaPage;
