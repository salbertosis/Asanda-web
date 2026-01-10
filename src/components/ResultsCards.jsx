import React from 'react';
import { Clock, Award, Filter, Search } from 'lucide-react';

const ResultsCards = ({ atletas, filtroClub, filtroCategoria, busqueda, clubs, categorias, onFiltroChange, onAtletaClick }) => {
  return (
    <section id="resultados" className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Resultados</h2>

        {/* Barra de Búsqueda y Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar atleta o club..."
                value={busqueda}
                onChange={(e) => onFiltroChange('busqueda', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Club</label>
              <select
                value={filtroClub}
                onChange={(e) => onFiltroChange('club', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {clubs.map(club => (
                  <option key={club} value={club}>{club}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={filtroCategoria}
                onChange={(e) => onFiltroChange('categoria', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categorias.map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tarjetas de Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {atletas.map((atleta) => (
            <div
              key={atleta.id}
              onClick={() => onAtletaClick(atleta)}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-100 group"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={atleta.foto}
                  alt={atleta.nombre}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold">
                    {atleta.categoria}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {atleta.nombre}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{atleta.club}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Evento:</span>
                    <span className="text-sm font-semibold text-gray-900">{atleta.evento}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock size={14} />
                      Tiempo:
                    </span>
                    <span className="text-sm font-bold text-blue-600">{atleta.tiempo}</span>
                  </div>
                  {atleta.medallas && atleta.medallas.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Award size={14} className="text-yellow-500" />
                        Medallas:
                      </span>
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
            </div>
          ))}
        </div>

        {atletas.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500 text-lg">No se encontraron atletas con los filtros seleccionados</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ResultsCards;

