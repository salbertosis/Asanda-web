import React from 'react';
import AthleteDirectory from '../components/AthleteDirectory';
import PageHero from '../components/PageHero';

const AtletasPublicadosPage = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <PageHero
      title="Atletas"
      subtitle="Directorio de atletas publicados por ASANDA"
      compact
      backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
    />
    <section className="py-10 md:py-14" aria-label="Directorio de atletas publicados">
      <div className="container mx-auto max-w-6xl px-4">
        <AthleteDirectory />
      </div>
    </section>
  </div>
);

export default AtletasPublicadosPage;
