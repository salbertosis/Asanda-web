import React from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';

const ResultsHero = ({ año, mes, onAñoChange, onMesChange, onReset }) => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const años = [2023, 2024, 2025, 2026];

  return (
    <section className="relative min-h-[400px] md:min-h-[500px] flex flex-col items-center justify-center overflow-hidden">
      {/* Imagen de fondo */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80)'
        }}
      >
        {/* Overlay oscuro para mejorar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 via-blue-800/70 to-blue-900/80"></div>
      </div>
      
      {/* Título centrado */}
      <div className="relative z-10 text-center px-4 mb-8">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white drop-shadow-2xl">
          Resultados
        </h1>
      </div>

      {/* Filtros sobrepuestos */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 px-4">
        <div className="relative">
          <label className="text-white text-sm mb-1 block">Año:</label>
          <div className="relative">
            <select
              value={año}
              onChange={(e) => onAñoChange(Number(e.target.value))}
              className="appearance-none bg-white/90 backdrop-blur-sm text-gray-900 px-6 py-2 pr-10 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium min-w-[120px]"
            >
              {años.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="relative">
          <label className="text-white text-sm mb-1 block">Mes:</label>
          <div className="relative">
            <select
              value={mes}
              onChange={(e) => onMesChange(e.target.value)}
              className="appearance-none bg-white/90 backdrop-blur-sm text-gray-900 px-6 py-2 pr-10 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium min-w-[140px]"
            >
              <option value="Todos">Todos</option>
              {meses.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" size={16} />
          </div>
        </div>

        <button
          onClick={onReset}
          className="mt-6 bg-white/90 backdrop-blur-sm text-gray-900 px-6 py-2 rounded-lg border border-white/30 hover:bg-white transition-colors font-medium flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Reiniciar
        </button>
      </div>
    </section>
  );
};

export default ResultsHero;

