import React, { useState } from 'react';

const HeroSponsor = () => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <aside className="min-w-0 border-l-2 border-asanda-cyan bg-asanda-ink/70 p-4 backdrop-blur-md sm:p-5" aria-label="Patrocinador principal">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">Patrocinador principal</p>
      <div className="mt-3 flex h-16 items-center justify-center overflow-hidden border border-white/15 bg-white/10 sm:h-20">
        {!imageFailed ? (
          <img
            src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=400&fit=crop&q=80"
            alt="Speedo Pro, patrocinador principal"
            className="h-full min-w-0 max-w-full object-cover opacity-90"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="font-display text-xl font-bold uppercase tracking-widest text-white">Speedo Pro</span>
        )}
      </div>
    </aside>
  );
};

export default HeroSponsor;
