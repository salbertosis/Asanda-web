import React from 'react';
import { ArrowRight, MapPin } from 'lucide-react';

const CompetitionResultsList = ({ competencias, mes, año }) => {
  const competenciasFiltradas = competencias.filter(comp => {
    if (mes !== 'Todos' && comp.mes !== mes) return false;
    if (comp.año !== año) return false;
    return true;
  });

  const getMesNombre = (mesNum) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mesNum - 1] || mesNum;
  };

  const mesDisplay = mes === 'Todos' ? getMesNombre(new Date().getMonth() + 1) : mes;

  return (
    <div className="bg-white py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Resultados de la competición
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          <span className="text-gray-900">{mesDisplay}</span> de {año}
        </p>

        <div className="space-y-4">
          {competenciasFiltradas.length > 0 ? (
            competenciasFiltradas.map((competencia) => (
              <div
                key={competencia.id}
                className="flex items-center gap-6 p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                {/* Fecha */}
                <div className="flex-shrink-0 w-32">
                  <div className="text-gray-900 font-semibold text-lg">
                    {competencia.fechaInicio} - {competencia.fechaFin} de {competencia.mes.toLowerCase()}
                  </div>
                </div>

                {/* Logo */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                    {competencia.logo ? (
                      <img
                        src={competencia.logo}
                        alt={competencia.nombre}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {competencia.nombre.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-xs font-bold text-gray-900">WORLD AQUATICS</div>
                    <div className="text-xs text-blue-600 font-semibold">SWIMMING WORLD CUP</div>
                    <div className="text-xs text-gray-600">{competencia.ubicacion.split(',')[2]?.trim().toUpperCase()} {año}</div>
                  </div>
                </div>

                {/* Detalles */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {competencia.nombre}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <span className="text-sm">Parada {competencia.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-2xl">{competencia.bandera}</span>
                    <MapPin size={16} className="text-gray-500" />
                    <span className="text-sm">{competencia.ubicacion}</span>
                  </div>
                </div>

                {/* Botón Ver Resultados */}
                <div className="flex-shrink-0">
                  <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium">
                    <span>VER RESULTADOS</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No hay resultados disponibles para este período.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetitionResultsList;

