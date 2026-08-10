import React, { useState, useMemo } from 'react';
import PageHero from '../components/PageHero';
import { atletas } from '../data/atletas';
import { Award, Users } from 'lucide-react';

const AtletasFederadosPage = () => {
  const [clubActivo, setClubActivo] = useState('Todos');

  // Obtener todos los clubes únicos de los atletas federados
  const clubesConFederados = useMemo(() => {
    const atletasFederados = atletas.filter(a => a.tipo === 'federado');
    const clubsUnicos = [...new Set(atletasFederados.map(a => a.club))];
    return ['Todos', ...clubsUnicos.sort()];
  }, []);

  // Filtrar atletas federados por club
  const atletasFiltrados = useMemo(() => {
    const federados = atletas.filter(a => a.tipo === 'federado');
    if (clubActivo === 'Todos') {
      return federados.sort((a, b) => {
        if (a.club !== b.club) return a.club.localeCompare(b.club);
        return a.nombre.localeCompare(b.nombre);
      });
    }
    return federados
      .filter(a => a.club === clubActivo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [clubActivo]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHero 
        title="Atletas Federados"
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          {/* Pestañas de Clubes */}
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 border-b border-gray-200 min-w-max">
              {clubesConFederados.map((club) => (
                <button
                  key={club}
                  onClick={() => setClubActivo(club)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    clubActivo === club
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {club}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Atletas */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Atleta
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Género
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha Nacimiento
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Disciplina
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {atletasFiltrados.length > 0 ? (
                    atletasFiltrados.map((atleta) => (
                      <tr key={atleta.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={atleta.foto}
                              alt={atleta.nombre}
                              className="w-12 h-12 rounded-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/48';
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {atleta.nombre}
                                </span>
                                <Award size={16} className="text-yellow-500" />
                              </div>
                              <div className="text-xs text-gray-500">
                                {atleta.club}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {atleta.genero || atleta.sexo}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {atleta.fechaNacimiento || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {atleta.disciplina && atleta.disciplina.length > 0 ? (
                              atleta.disciplina.map((disc, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1 text-sm text-blue-600"
                                >
                                  <Users size={16} className="text-blue-500" />
                                  <span>{disc}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        <p className="text-lg">No hay atletas federados disponibles para este club.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Atletas</div>
              <div className="text-2xl font-bold text-blue-600">{atletasFiltrados.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Masculino</div>
              <div className="text-2xl font-bold text-green-600">
                {atletasFiltrados.filter(a => (a.genero || a.sexo) === 'Masculino').length}
              </div>
            </div>
            <div className="bg-pink-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Femenino</div>
              <div className="text-2xl font-bold text-pink-600">
                {atletasFiltrados.filter(a => (a.genero || a.sexo) === 'Femenino').length}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AtletasFederadosPage;

