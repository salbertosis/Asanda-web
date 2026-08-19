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
      <header className="bg-[#0F4C5C] text-white">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-5 sm:py-20">
          <Link to="/noticias" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-cyan-100 transition-colors hover:text-white">
            <ArrowLeft size={18} aria-hidden="true" /> Volver a noticias
          </Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">{article.categoria}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{article.titulo}</h1>
          <p className="mt-5 flex items-center gap-2 text-sm font-medium text-cyan-100">
            <Calendar size={16} aria-hidden="true" /> {article.fecha}
          </p>
          {article.resumen && <p className="mt-6 max-w-3xl text-lg leading-8 text-cyan-50">{article.resumen}</p>}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-5 lg:py-14">
        <img src={article.imagen} alt={article.imagenAlt} className="aspect-[16/9] w-full rounded-3xl object-cover shadow-[0_24px_70px_-50px_rgba(15,23,42,0.5)]" />
        <div
          className="prose prose-slate mt-8 max-w-none rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 sm:p-8"
          dangerouslySetInnerHTML={{ __html: article.cuerpoHtml }}
        />
      </div>
    </article>
  );
};

export default NoticiaPage;
