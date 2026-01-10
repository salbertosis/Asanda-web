import React, { useEffect, useRef, useState } from 'react';
import { Users, Building2, Award } from 'lucide-react';

const HeroStats = ({ atletas, clubs, categorias }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [counters, setCounters] = useState({ asociados: 0, clubs: 0, federados: 0 });
  const statsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Verificar preferencias de movimiento reducido
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // Si el usuario prefiere movimiento reducido, mostrar valores directamente
      setCounters({
        asociados: atletas.length,
        clubs: clubs.length - 1,
        federados: atletas.length
      });
      return;
    }

    const duration = 2000; // 2 segundos
    const steps = 60;
    const stepDuration = duration / steps;
    
    const targetValues = {
      asociados: atletas.length,
      clubs: clubs.length - 1,
      federados: atletas.length
    };

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = Math.min(currentStep / steps, 1);
      
      // Usar easing function para animación más suave (ease-out-cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      setCounters({
        asociados: Math.floor(targetValues.asociados * easeOutCubic),
        clubs: Math.floor(targetValues.clubs * easeOutCubic),
        federados: Math.floor(targetValues.federados * easeOutCubic)
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        setCounters(targetValues);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [isVisible, atletas.length, clubs.length]);

  const stats = [
    {
      value: counters.asociados,
      label: 'Asociados',
      icon: Users,
      ariaLabel: `${counters.asociados} atletas asociados`
    },
    {
      value: counters.clubs,
      label: 'Clubes',
      icon: Building2,
      ariaLabel: `${counters.clubs} clubs activos`
    },
    {
      value: counters.federados,
      label: 'Federados',
      icon: Award,
      ariaLabel: `${counters.federados} atletas federados`
    }
  ];

  return (
    <div 
      ref={statsRef}
      className="relative z-10 w-full pt-4 sm:pt-6 md:pt-8"
      role="region"
      aria-label="Estadísticas principales"
      itemScope
      itemType="https://schema.org/SportsOrganization"
    >
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex flex-nowrap justify-center items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8 overflow-x-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`bg-white/20 backdrop-blur-lg border border-white/30 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 rounded-xl sm:rounded-2xl shadow-2xl hover:bg-white/25 transition-all duration-300 flex-shrink-0 w-[calc(33.333%-0.5rem)] sm:w-auto min-w-[90px] sm:min-w-[110px] md:min-w-[130px] lg:min-w-[150px] xl:min-w-[170px] transform hover:scale-105 ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`,
                  transitionProperty: 'opacity, transform'
                }}
                role="article"
                aria-label={stat.ariaLabel}
                itemScope
                itemType="https://schema.org/QuantitativeValue"
              >
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <Icon 
                    className="text-white/90" 
                    size={18}
                    style={{ width: '18px', height: '18px' }}
                    aria-hidden="true"
                  />
                </div>
                <div 
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-1 sm:mb-2 text-white drop-shadow-lg text-center leading-tight"
                  aria-live="polite"
                  itemProp="value"
                >
                  {stat.value}
                </div>
                <div 
                  className="text-[10px] sm:text-xs md:text-sm lg:text-base text-blue-50 font-semibold uppercase tracking-wide text-center leading-tight"
                  itemProp="name"
                >
                  {stat.label}
                </div>
                <meta itemProp="unitText" content="unidades" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroStats;

