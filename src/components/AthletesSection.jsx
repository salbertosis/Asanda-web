import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Award, Trophy } from 'lucide-react';

const AthletesSection = ({ atletas, onAtletaClick }) => {
  // Obtener los mejores atletas (top 6)
  const atletasDestacados = atletas
    .sort((a, b) => {
      // Ordenar por número de medallas de oro
      const medallasA = a.medallas?.filter(m => m === 'Oro').length || 0;
      const medallasB = b.medallas?.filter(m => m === 'Oro').length || 0;
      return medallasB - medallasA;
    })
    .slice(0, 6);

  return (
    <section id="atletas" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Atletas Destacados</h2>
            <p className="text-gray-600">Los mejores nadadores del estado</p>
          </div>
          <Link to="/atletas" className="text-blue-600 hover:text-blue-700 font-medium">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {atletasDestacados.map((atleta) => (
            <div
              key={atleta.id}
              onClick={() => onAtletaClick(atleta)}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer group border border-gray-100"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={atleta.foto}
                  alt={atleta.nombre}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4">
                  {atleta.medallas && atleta.medallas.length > 0 && (
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Award className="text-yellow-400" size={16} />
                      <span className="text-white text-sm font-semibold">{atleta.medallas.length}</span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                  <h3 className="text-white font-bold text-lg mb-1">{atleta.nombre}</h3>
                  <p className="text-white/80 text-sm">{atleta.club}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {atleta.categoria}
                  </span>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Clock size={16} />
                    <span className="text-sm font-semibold">{atleta.tiempo}</span>
                  </div>
                </div>
                <p className="text-gray-700 font-medium mb-2">{atleta.evento}</p>
                {atleta.medallas && atleta.medallas.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <Trophy className="text-yellow-500" size={18} />
                    <div className="flex gap-1">
                      {atleta.medallas.map((medalla, index) => (
                        <span
                          key={index}
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            medalla === 'Oro'
                              ? 'bg-yellow-100 text-yellow-800'
                              : medalla === 'Plata'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {medalla}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AthletesSection;

