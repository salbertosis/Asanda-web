import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Plus, ArrowRight, MapPin, Flag, Waves, UsersRound, Droplet } from 'lucide-react';

const CompetitionsCalendar = ({ competencias: competenciasProp, año: añoProp, onAñoChange }) => {
  const [año, setAño] = useState(añoProp || 2026);
  const [mes, setMes] = useState('Todos');
  const [tipoCalendario, setTipoCalendario] = useState('Competencias');
  const [deporteSeleccionado, setDeporteSeleccionado] = useState('Todos');

  // Usar competencias pasadas como prop o las del componente
  const competencias = competenciasProp || [
    {
      id: 1,
      fechaInicio: '15',
      fechaFin: '17',
      mes: 'Enero',
      año: 2026,
      nombre: 'Campeonato Estadal de Natación',
      ubicacion: 'VEN, Venezuela, Barcelona',
      bandera: '🇻🇪',
      logo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
      reconocido: true
    },
    {
      id: 2,
      fechaInicio: '28',
      fechaFin: '30',
      mes: 'Enero',
      año: 2026,
      nombre: 'Torneo Regional de Waterpolo',
      ubicacion: 'VEN, Venezuela, Puerto La Cruz',
      bandera: '🇻🇪',
      logo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
      reconocido: true
    },
    {
      id: 3,
      fechaInicio: '5',
      fechaFin: '7',
      mes: 'Febrero',
      año: 2026,
      nombre: 'Competencia de Aguas Abiertas',
      ubicacion: 'VEN, Venezuela, Lechería',
      bandera: '🇻🇪',
      logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      reconocido: false
    },
    {
      id: 4,
      fechaInicio: '20',
      fechaFin: '22',
      mes: 'Febrero',
      año: 2026,
      nombre: 'Copa Estadal de Natación',
      ubicacion: 'VEN, Venezuela, Barcelona',
      bandera: '🇻🇪',
      logo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      reconocido: true
    },
  ];

  const meses = ['Todos', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const deportes = ['Todos', 'Natación', 'Waterpolo', 'Aguas Abiertas'];

  const competenciasFiltradas = competencias.filter(comp => {
    const coincideMes = mes === 'Todos' || comp.mes === mes;
    const coincideDeporte = deporteSeleccionado === 'Todos' || 
      (deporteSeleccionado === 'Natación' && comp.nombre.toLowerCase().includes('natación')) ||
      (deporteSeleccionado === 'Waterpolo' && comp.nombre.toLowerCase().includes('waterpolo')) ||
      (deporteSeleccionado === 'Aguas Abiertas' && comp.nombre.toLowerCase().includes('aguas abiertas'));
    return coincideMes && coincideDeporte;
  });

  const competenciasPorMes = competenciasFiltradas.reduce((acc, comp) => {
    if (!acc[comp.mes]) acc[comp.mes] = [];
    acc[comp.mes].push(comp);
    return acc;
  }, {});

  const reiniciarFiltros = () => {
    handleAñoChange(2026);
    setMes('Todos');
    setTipoCalendario('Competencias');
    setDeporteSeleccionado('Todos');
  };

  return (
    <section id="calendario" className="relative min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop)'
          }}
        ></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Título de sección: el h1 de la vista vive en PageHero (D3) */}
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-12 text-center">
          Competiciones
        </h2>

        {/* Filtros */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-6 mb-8 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de calendario
              </label>
              <select
                value={tipoCalendario}
                onChange={(e) => setTipoCalendario(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Competencias</option>
                <option>Entrenamientos</option>
                <option>Todos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAñoChange(año - 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="number"
                  value={año}
                  onChange={(e) => handleAñoChange(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleAñoChange(año + 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {meses.map(m => (
                  <option key={m} value={m}>{m === 'Todos' ? 'Todos los meses' : m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={reiniciarFiltros}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                Reiniciar
              </button>
            </div>
          </div>

          {/* Filtro de Deportes */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {deportes.map((deporte) => (
              <button
                key={deporte}
                onClick={() => setDeporteSeleccionado(deporte)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  deporteSeleccionado === deporte
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {deporte === 'Natación' && <Waves size={18} />}
                {deporte === 'Waterpolo' && <UsersRound size={18} />}
                {deporte === 'Aguas Abiertas' && <Droplet size={18} />}
                <span>{deporte === 'Todos' ? 'TODOS LOS DEPORTES' : deporte.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botón Añadir al Calendario */}
        <div className="flex justify-end mb-6">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            <Plus size={18} />
            Añadir competiciones al calendario
          </button>
        </div>

        {/* Lista de Competencias */}
        <div className="space-y-8">
          {Object.keys(competenciasPorMes).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No hay competencias programadas para los filtros seleccionados</p>
            </div>
          ) : (
            Object.entries(competenciasPorMes).map(([mesNombre, comps]) => (
              <div key={mesNombre}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {mesNombre} de {año}
                </h2>
                <div className="space-y-4">
                  {comps.map((comp) => (
                    <div
                      key={comp.id}
                      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-200"
                    >
                      <div className="flex flex-col md:flex-row items-center gap-4 p-6">
                        {/* Fechas */}
                        <div className="text-center md:text-left">
                          <div className="text-2xl font-bold text-gray-900">
                            {comp.fechaInicio}
                            {comp.fechaFin !== comp.fechaInicio && ` - ${comp.fechaFin}`}
                          </div>
                          <div className="text-sm text-gray-500">{comp.mes}</div>
                        </div>

                        {/* Logo */}
                        <div className="flex-shrink-0">
                          <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-blue-100">
                            <img
                              src={comp.logo}
                              alt={comp.nombre}
                              className="w-full h-full object-cover"
                            />
                            {comp.reconocido && (
                              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                OFICIAL
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Información */}
                        <div className="flex-1 text-center md:text-left">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{comp.nombre}</h3>
                          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600">
                            <MapPin size={16} />
                            <span className="text-sm">{comp.ubicacion}</span>
                          </div>
                        </div>

                        {/* Botón Ver */}
                        <div className="flex-shrink-0">
                          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                            Ver Competencia
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default CompetitionsCalendar;

