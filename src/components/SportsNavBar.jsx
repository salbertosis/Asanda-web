import React from 'react';
import { Waves, UsersRound, Droplet } from 'lucide-react';

const SportsNavBar = ({ deporteSeleccionado, onDeporteChange }) => {
  const deportes = [
    { id: 'todos', label: 'TODOS LOS DEPORTES', icon: null },
    { id: 'natacion', label: 'NADAR', icon: Waves },
    { id: 'waterpolo', label: 'WATERPOLO', icon: UsersRound },
    { id: 'aguas-abiertas', label: 'AGUAS ABIERTAS', icon: Droplet },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[81px] z-40 overflow-x-auto">
      <div className="flex items-center gap-1 px-4 min-w-max">
        {deportes.map((deporte) => {
          const Icon = deporte.icon;
          const isSelected = deporteSeleccionado === deporte.id;
          
          return (
            <button
              key={deporte.id}
              onClick={() => onDeporteChange(deporte.id)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${
                isSelected
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {Icon && <Icon size={18} />}
              <span>{deporte.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SportsNavBar;

