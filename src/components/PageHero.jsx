import React from 'react';

const PageHero = ({ title, backgroundImage, subtitle, compact = false }) => {
  const defaultImage = '/assets/hero.svg';

  return (
    <section className={`relative flex items-center justify-center overflow-hidden ${compact ? 'min-h-[260px] md:min-h-[320px]' : 'min-h-[400px] md:min-h-[500px]'}`}>
      {/* Imagen de fondo */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImage || defaultImage})`
        }}
      >
        {/* Overlay oscuro para mejorar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 via-blue-800/70 to-blue-900/80"></div>
      </div>
      
      {/* Título centrado */}
      <div className="relative z-10 text-center px-4">
        <h1 className={`${compact ? 'text-4xl md:text-6xl' : 'text-5xl md:text-7xl lg:text-8xl'} font-bold text-white drop-shadow-2xl`}>
          {title}
        </h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-blue-50 md:text-lg">{subtitle}</p>}
      </div>
    </section>
  );
};

export default PageHero;


