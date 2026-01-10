import React, { useState, useEffect, useRef } from 'react';

const HeroBackground = ({ useVideo = false, videoUrl = null }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [useParallax, setUseParallax] = useState(true);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Verificar preferencias de movimiento reducido
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setUseParallax(!prefersReducedMotion);

    if (useVideo && videoUrl && videoRef.current) {
      // Configurar video de fondo
      const video = videoRef.current;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.play().catch(() => {
        // Si falla, usar imagen de respaldo
        setImageLoaded(true);
      });
    } else {
      // Precargar imagen para mejor performance
      const img = new Image();
      const imageUrl = 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80';
      img.src = imageUrl;
      
      img.onload = () => {
        setImageLoaded(true);
      };
      
      img.onerror = () => {
        // Fallback si la imagen no carga
        setImageLoaded(true);
      };
    }
  }, [useVideo, videoUrl]);

  useEffect(() => {
    if (!useParallax || !containerRef.current) return;

    const handleScroll = () => {
      if (containerRef.current) {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5;
        containerRef.current.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [useParallax]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
    >
      {/* Video de fondo opcional */}
      {useVideo && videoUrl ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src={videoUrl} type="video/mp4" />
          {/* Fallback a imagen si el video no se puede cargar */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80)'
            }}
          />
        </video>
      ) : (
        /* Imagen de fondo */
        <div 
          className={`absolute inset-0 transition-opacity duration-1000 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
          role="img"
          aria-label="Competencia de natación en piscina olímpica con nadadores compitiendo"
        />
      )}
      
      {/* Placeholder mientras carga - mejora UX */}
      {!imageLoaded && !useVideo && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900" />
      )}
      
      {/* Overlay oscuro para mejorar legibilidad y contraste */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-blue-900/75 via-blue-800/65 to-blue-900/75"
        aria-hidden="true"
      />
    </div>
  );
};

export default HeroBackground;
