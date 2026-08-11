import React from 'react';

const PageHero = ({ title, backgroundImage }) => {
  const defaultImage = '/assets/hero.svg';

  return (
    <section className="relative min-h-[400px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
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
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white drop-shadow-2xl">
          {title}
        </h1>
      </div>
    </section>
  );
};

export default PageHero;


