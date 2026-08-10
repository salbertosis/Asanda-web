import React, { useState, useMemo } from 'react';
import { Trophy, Clock, Award, TrendingUp, Filter } from 'lucide-react';
import { atletas } from '../data/atletas';

const RecordEstadal = () => {
  const [filtroEvento, setFiltroEvento] = useState('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroSexo, setFiltroSexo] = useState('Todos');

  // Obtener todos los eventos únicos
  const eventos = useMemo(() => {
    const eventosUnicos = [...new Set(atletas.map(a => a.evento))];
    return ['Todos', ...eventosUnicos];
  }, []);

  // Obtener todas las categorías únicas con orden específico
  const categorias = useMemo(() => {
    const categoriasUnicas = [...new Set(atletas.map(a => a.categoria))];
    // Ordenar categorías: Infantil B, Infantil A, Juvenil B, Juvenil A, Absoluto
    const ordenCategorias = ['Infantil B', 'Infantil A', 'Juvenil B', 'Juvenil A', 'Absoluto'];
    const categoriasOrdenadas = ordenCategorias.filter(cat => 
      categoriasUnicas.includes(cat) || cat === 'Absoluto'
    );
    // Agregar cualquier categoría que no esté en el orden
    categoriasUnicas.forEach(cat => {
      if (!categoriasOrdenadas.includes(cat)) {
        categoriasOrdenadas.push(cat);
      }
    });
    return ['Todas', ...categoriasOrdenadas];
  }, []);

  // Simular récords estatales (mejores tiempos)
  const recordsEstadales = useMemo(() => {
    return atletas
      // Fallback estable: atletas sin tiempo registrado no se muestran como récord.
      .filter(atleta => typeof atleta.recordPersonal === 'string')
      .map(atleta => ({
        ...atleta,
        recordEstadal: atleta.recordPersonal, // En producción vendría de una base de datos
        año: 2025,
        competencia: 'Campeonato Estadal 2025'
      }))
      .sort((a, b) => {
        // Ordenar por tiempo (convertir a segundos para comparar)
        const tiempoA = parseFloat(a.recordPersonal.replace(':', '.'));
        const tiempoB = parseFloat(b.recordPersonal.replace(':', '.'));
        return tiempoA - tiempoB;
      });
  }, []);

  // Filtrar récords según los filtros seleccionados
  const recordsFiltrados = useMemo(() => {
    return recordsEstadales.filter(record => {
      const coincideEvento = filtroEvento === 'Todos' || record.evento === filtroEvento;
      const coincideCategoria = filtroCategoria === 'Todas' || record.categoria === filtroCategoria;
      const coincideSexo = filtroSexo === 'Todos' || record.sexo === filtroSexo;
      return coincideEvento && coincideCategoria && coincideSexo;
    }).slice(0, 10); // Top 10 récords
  }, [recordsEstadales, filtroEvento, filtroCategoria, filtroSexo]);

  return (
    <section id="record-estadal" className="py-16 bg-gradient-to-b from-white to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-4">
            <Trophy className="text-white" size={40} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Récord Estadal
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Los mejores tiempos registrados en competencias oficiales del estado Anzoátegui
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Evento</label>
              <select
                value={filtroEvento}
                onChange={(e) => setFiltroEvento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
              >
                {eventos.map(evento => (
                  <option key={evento} value={evento}>{evento}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
              >
                {categorias.map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Género</label>
              <select
                value={filtroSexo}
                onChange={(e) => setFiltroSexo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
              >
                <option value="Todos">Todos</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Récords */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Posición
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Atleta
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Evento
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Tiempo
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Año
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Competencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recordsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No se encontraron récords con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  recordsFiltrados.map((record, index) => (
                    <tr
                      key={record.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && (
                            <Trophy className="text-yellow-500 mr-2" size={20} />
                          )}
                          <span className={`font-bold text-lg ${
                            index === 0 ? 'text-yellow-600' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-600' :
                            'text-gray-700'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden mr-3 border-2 border-blue-500">
                            <img
                              src={record.foto}
                              alt={record.nombre}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.nombre}
                            </div>
                            <div className="text-sm text-gray-500">{record.club}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {record.evento}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {record.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="text-blue-600" size={16} />
                          <span className="text-sm font-bold text-blue-600">
                            {record.recordEstadal}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.año}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.competencia}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="text-yellow-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">Total de Récords</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{recordsFiltrados.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">Este Año</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {recordsFiltrados.filter(r => r.año === 2025).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Award className="text-blue-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">Eventos Activos</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{eventos.length - 1}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecordEstadal;

