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
      label: 'Atletas Asociados',
      icon: Users,
      ariaLabel: `${counters.asociados} atletas asociados`
    },
    {
      value: counters.clubs,
      label: 'Clubs Activos',
      icon: Building2,
      ariaLabel: `${counters.clubs} clubs activos`
    },
    {
      value: counters.federados,
      label: 'Atletas Federados',
      icon: Award,
      ariaLabel: `${counters.federados} atletas federados`
    }
  ];

  return (
    <div 
      ref={statsRef}
      className="relative z-10 flex-1 flex items-start justify-center pt-8 sm:pt-12 md:pt-16 lg:pt-20"
      role="region"
      aria-label="Estadísticas principales"
      itemScope
      itemType="https://schema.org/SportsOrganization"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`bg-white/20 backdrop-blur-lg border border-white/30 px-6 py-5 sm:px-8 sm:py-6 rounded-2xl shadow-2xl hover:bg-white/25 transition-all duration-300 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] transform hover:scale-105 ${
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
                    <div className="flex items-center justify-center mb-2">
                      <Icon
                        className="text-white/90"
                        size={24}
                        aria-hidden="true"
                      />
                    </div>
                    <div
                      className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-white drop-shadow-lg text-center"
                      aria-live="polite"
                      itemProp="value"
                    >
                      {stat.value}
                    </div>
                    <div
                      className="text-xs sm:text-sm md:text-base text-blue-50 font-semibold uppercase tracking-wide text-center"
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

