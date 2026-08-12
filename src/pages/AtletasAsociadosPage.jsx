import React from 'react';
import AthleteDirectory from '../components/AthleteDirectory';
import PageHero from '../components/PageHero';

const AtletasAsociadosPage = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <PageHero
      title="Atletas Asociados"
      subtitle="Deportistas con afiliación vigente en los clubes de ASANDA"
      compact
      backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
    />
    <section className="py-10 md:py-14" aria-label="Directorio de atletas asociados">
      <div className="container mx-auto max-w-6xl px-4">
        <AthleteDirectory membershipType="associated" />
      </div>
    </section>
  </div>
);

export default AtletasAsociadosPage;
