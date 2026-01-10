import React from 'react';

const BannerAd = () => {
  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 mb-6 border-2 border-dashed border-blue-300">
      <div className="flex items-center justify-center h-32 bg-white/50 rounded-lg">
        <div className="text-center text-gray-600">
          <p className="text-sm font-semibold mb-2 text-blue-600">ESPACIO PUBLICITARIO</p>
          <p className="text-xs text-gray-500">Banner Principal - 728x90</p>
          <p className="text-xs text-gray-400 mt-1">Patrocinador Principal</p>
        </div>
      </div>
    </div>
  );
};

export default BannerAd;

