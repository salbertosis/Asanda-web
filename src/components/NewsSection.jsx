import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';

const NewsSection = () => {
  const noticias = [
    {
      id: 1,
      titulo: "Campeonato Estadal 2025: Récords Históricos",
      fecha: "Hace 2 días",
      categoria: "Competencia",
      imagen: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop",
      resumen: "Tres nuevos récords estatales fueron establecidos durante el campeonato..."
    },
    {
      id: 2,
      titulo: "Selección Estadal para Nacionales 2025",
      fecha: "Hace 5 días",
      categoria: "Selección",
      imagen: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=400&fit=crop",
      resumen: "La federación anunció la lista de atletas que representarán al estado..."
    },
    {
      id: 3,
      titulo: "Nuevo Centro de Entrenamiento Inaugurado",
      fecha: "Hace 1 semana",
      categoria: "Infraestructura",
      imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
      resumen: "El nuevo complejo acuático cuenta con piscina olímpica y tecnología de última generación..."
    }
  ];

  return (
    <section id="noticias" className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Últimas Noticias</h2>
          <Link to="/noticias" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            Ver todas <ArrowRight size={18} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
  );
};

export default NewsSection;

