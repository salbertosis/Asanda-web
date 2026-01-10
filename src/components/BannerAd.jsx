import React from 'react';

const BannerAd = () => {
  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 sm:p-4 mb-4 border-2 border-dashed border-blue-300">
      <div className="flex items-center justify-center h-20 sm:h-24 bg-white/50 rounded-lg">
        <div className="text-center text-gray-600">
          <p className="text-xs sm:text-sm font-semibold mb-1 text-blue-600">ESPACIO PUBLICITARIO</p>
          <p className="text-[10px] sm:text-xs text-gray-500">Banner Principal - 728x90</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Patrocinador Principal</p>
        </div>
      </div>
    </div>
  );
};

export default BannerAd;

