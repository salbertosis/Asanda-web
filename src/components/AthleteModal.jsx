import React from 'react';
import { X, Clock, Award } from 'lucide-react';

const AthleteModal = ({ atleta, isOpen, onClose }) => {
  if (!isOpen || !atleta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">{atleta.nombre}</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Foto del Atleta */}
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg mb-4">
                <img
                  src={atleta.foto}
                  alt={atleta.nombre}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center">
                <p className="text-gray-900 font-semibold">{atleta.club}</p>
                <p className="text-gray-600 text-sm">{atleta.categoria}</p>
              </div>
            </div>

            {/* Información */}
            <div className="space-y-4">
              {/* Récord Personal */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-blue-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">Récord Personal</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">{atleta.recordPersonal}</p>
                <p className="text-gray-600 text-sm mt-1">{atleta.evento}</p>
              </div>

              {/* Marca Mínima Federada */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="text-yellow-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">Marca Mínima Federada</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{atleta.marcaMinimaFederada}</p>
                <p className="text-gray-600 text-sm mt-1">Tiempo requerido</p>
              </div>

              {/* Medallas */}
              {atleta.medallas && atleta.medallas.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="text-yellow-500" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">Medallas</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {atleta.medallas.map((medalla, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          medalla === 'Oro'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : medalla === 'Plata'
                            ? 'bg-gray-100 text-gray-800 border border-gray-300'
                            : 'bg-orange-100 text-orange-800 border border-orange-300'
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
      </div>
    </div>
  );
};

export default AthleteModal;

