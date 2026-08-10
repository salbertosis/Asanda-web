import React from 'react';
import PageHero from '../components/PageHero';
import { Calendar, ArrowRight } from 'lucide-react';
import { noticias } from '../data/noticias';

const NoticiasPage = () => {

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {noticias.map((noticia) => (
              <article
                key={noticia.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={noticia.imagen}
                    alt={noticia.titulo}
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
                    <Calendar size={14} />
                    <span>{noticia.fecha}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {noticia.titulo}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {noticia.resumen}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default NoticiasPage;
