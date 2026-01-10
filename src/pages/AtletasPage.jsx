import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageHero from '../components/PageHero';
import AthleteModal from '../components/AthleteModal';
import { atletas } from '../data/atletas';
import { Trophy, Award } from 'lucide-react';

const AtletasPage = () => {
  const [filtroClub, setFiltroClub] = useState('Todos');
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Obtener valores únicos para los filtros
  const clubs = useMemo(() => {
    const clubsUnicos = [...new Set(atletas.map(a => a.club))];
    return ['Todos', ...clubsUnicos];
  }, []);

  // Filtrar y organizar atletas por categoría
  const atletasPorCategoria = useMemo(() => {
    const filtrados = filtroClub === 'Todos' 
      ? atletas 
      : atletas.filter(a => a.club === filtroClub);

    const categorias = {
      juveniles: filtrados.filter(a => a.categoria.includes('Juvenil')),
      infantilesA: filtrados.filter(a => a.categoria === 'Infantil A'),
      infantilesB: filtrados.filter(a => a.categoria === 'Infantil B')
    };

    // Ordenar por mejor tiempo (menor tiempo = mejor)
    const ordenarPorTiempo = (a, b) => {
      const tiempoA = parseFloat(a.tiempo.replace(':', '.').replace(':', ''));
      const tiempoB = parseFloat(b.tiempo.replace(':', '.').replace(':', ''));
      return tiempoA - tiempoB;
    };

    return {
      juveniles: categorias.juveniles.sort(ordenarPorTiempo).slice(0, 6),
      infantilesA: categorias.infantilesA.sort(ordenarPorTiempo).slice(0, 6),
      infantilesB: categorias.infantilesB.sort(ordenarPorTiempo).slice(0, 6)
    };
  }, [filtroClub]);

  const abrirModal = (atleta) => {
    setAtletaSeleccionado(atleta);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setAtletaSeleccionado(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero con título Atletas */}
      <PageHero 
        title="Atletas"
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      {/* Filtro de Club */}
      <section className="bg-gray-50 py-6">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-4 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Club</label>
            <select
              value={filtroClub}
              onChange={(e) => setFiltroClub(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {clubs.map(club => (
                <option key={club} value={club}>{club}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Mejores Atletas Juveniles */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="text-yellow-500" size={32} />
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Mejores Atletas Juveniles</h2>
              <p className="text-gray-600">Top 6 atletas de categoría Juvenil</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {atletasPorCategoria.juveniles.map((atleta, index) => (
              <div
                key={atleta.id}
                onClick={() => abrirModal(atleta)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group border border-gray-100"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={atleta.foto}
                    alt={atleta.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Award size={16} />
                      #{index + 1}
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {atleta.categoria}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {atleta.nombre}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Club:</span> {atleta.club}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Tiempo:</span> {atleta.tiempo}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Evento:</span> {atleta.evento}
                    </p>
                  </div>
                  {atleta.medallas && atleta.medallas.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Trophy className="text-yellow-500" size={18} />
                      <div className="flex gap-1">
                        {atleta.medallas.map((medalla, idx) => (
                          <span
                            key={idx}
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
          {atletasPorCategoria.juveniles.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No hay atletas juveniles disponibles.</p>
            </div>
          )}
        </div>
      </section>

      {/* Mejores Infantiles A */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="text-blue-500" size={32} />
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Mejores Infantiles A</h2>
              <p className="text-gray-600">Top 6 atletas de categoría Infantil A</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {atletasPorCategoria.infantilesA.map((atleta, index) => (
              <div
                key={atleta.id}
                onClick={() => abrirModal(atleta)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group border border-gray-100"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={atleta.foto}
                    alt={atleta.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Award size={16} />
                      #{index + 1}
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {atleta.categoria}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {atleta.nombre}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Club:</span> {atleta.club}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Tiempo:</span> {atleta.tiempo}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Evento:</span> {atleta.evento}
                    </p>
                  </div>
                  {atleta.medallas && atleta.medallas.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Trophy className="text-yellow-500" size={18} />
                      <div className="flex gap-1">
                        {atleta.medallas.map((medalla, idx) => (
                          <span
                            key={idx}
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
          {atletasPorCategoria.infantilesA.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No hay atletas Infantiles A disponibles.</p>
            </div>
          )}
        </div>
      </section>

      {/* Mejores Infantiles B */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="text-green-500" size={32} />
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Mejores Infantiles B</h2>
              <p className="text-gray-600">Top 6 atletas de categoría Infantil B</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {atletasPorCategoria.infantilesB.map((atleta, index) => (
              <div
                key={atleta.id}
                onClick={() => abrirModal(atleta)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group border border-gray-100"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={atleta.foto}
                    alt={atleta.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Award size={16} />
                      #{index + 1}
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {atleta.categoria}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {atleta.nombre}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Club:</span> {atleta.club}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Tiempo:</span> {atleta.tiempo}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Evento:</span> {atleta.evento}
                    </p>
                  </div>
                  {atleta.medallas && atleta.medallas.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Trophy className="text-yellow-500" size={18} />
                      <div className="flex gap-1">
                        {atleta.medallas.map((medalla, idx) => (
                          <span
                            key={idx}
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
          {atletasPorCategoria.infantilesB.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No hay atletas Infantiles B disponibles.</p>
            </div>
          )}
        </div>
      </section>

      {/* Modal de Detalles del Atleta */}
      <AthleteModal
        atleta={atletaSeleccionado}
        isOpen={modalAbierto}
        onClose={cerrarModal}
      />

      <Footer />
    </div>
  );
};

export default AtletasPage;

