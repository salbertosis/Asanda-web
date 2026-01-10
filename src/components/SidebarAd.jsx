import React from 'react';

const SidebarAd = () => {
  return (
    <div className="w-full bg-gradient-to-b from-blue-50 to-cyan-50 rounded-lg p-4 border-2 border-dashed border-blue-300 shadow-md">
      <div className="flex flex-col items-center justify-center h-96 bg-white/50 rounded-lg">
        <div className="text-center text-gray-600">
          <p className="text-sm font-semibold mb-2 text-blue-600">ESPACIO PUBLICITARIO</p>
          <p className="text-xs text-gray-500">Sidebar Ad - 300x600</p>
          <p className="text-xs text-gray-400 mt-1">Patrocinador</p>
        </div>
      </div>
    </div>
  );
};

export default SidebarAd;

