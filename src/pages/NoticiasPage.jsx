import React, { useEffect, useState } from 'react';
import PageHero from '../components/PageHero';
import { Calendar, ArrowRight } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero con título Noticias */}
      <PageHero 
        title="Noticias"
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      {/* Contenido de Noticias */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Últimas Noticias</h2>
            <div className="text-blue-600 font-medium flex items-center gap-1">
              Todas las noticias
            </div>
          </div>
          {status === 'loading' && (
            <p role="status" className="rounded-lg border border-slate-200 bg-white p-6 font-semibold text-slate-700">Cargando noticias…</p>
          )}
          {status === 'error' && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 font-semibold text-red-800">No pudimos cargar las noticias. Intentá nuevamente más tarde.</p>
          )}
          {status === 'ready' && noticias.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-white p-6 font-semibold text-slate-700">Todavía no hay noticias publicadas.</p>
          )}
          {status === 'ready' && noticias.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {noticias.map((noticia) => (
              <article
                key={noticia.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={noticia.imagen}
                    alt={noticia.imagenAlt}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {noticia.categoria}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Calendar size={14} aria-hidden="true" />
                    <span>{noticia.fecha}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    <Link to={`/noticias/${noticia.slug}`} className="inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                      {noticia.titulo} <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {noticia.resumen}
                  </p>
                </div>
              </article>
            ))}
          </div>}
        </div>
      </section>
    </div>
  );
};

export default NoticiasPage;
