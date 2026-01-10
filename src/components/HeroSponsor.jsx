import React, { useState, useEffect, useRef } from 'react';

const HeroSponsor = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sponsorRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sponsorRef.current) {
      observer.observe(sponsorRef.current);
    }

    return () => {
      if (sponsorRef.current) {
        observer.unobserve(sponsorRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={sponsorRef}
      className="container mx-auto px-4"
      role="complementary"
      aria-label="Patrocinador principal"
    >
      <div className="max-w-md">
        <div 
          className={`bg-white/40 backdrop-blur-lg rounded-2xl p-5 sm:p-6 md:p-8 shadow-2xl border border-white/40 transition-all duration-700 ${
            isVisible 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 -translate-x-8'
          }`}
        >
          <p 
            className="text-xs text-white uppercase tracking-[0.15em] mb-4 font-semibold drop-shadow-lg"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            aria-label="Título del patrocinador"
          >
            Patrocinador Principal
          </p>
          {/* Imagen del Patrocinador - Sin recuadros internos */}
          <div className="relative flex items-center justify-center h-36 sm:h-44 overflow-hidden group">
            <img 
              src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=400&fit=crop&q=80"
              alt="Speedo - Patrocinador Principal"
              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback si la imagen no carga
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            {/* Fallback si la imagen no carga */}
            <div className="hidden items-center justify-center w-full h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full mb-2 shadow-lg">
                  <span className="text-white text-xl sm:text-2xl font-bold">SP</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-white mb-1 drop-shadow-lg">
                  Speedo Pro
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSponsor;

