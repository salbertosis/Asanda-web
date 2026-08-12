import React from 'react';
import AthleteDirectory from '../components/AthleteDirectory';
import PageHero from '../components/PageHero';

const AtletasFederadosPage = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <PageHero
      title="Atletas Federados"
      subtitle="Atletas asociados que también cuentan con registro federativo vigente"
      compact
      backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
    />
    <section className="py-10 md:py-14" aria-label="Directorio de atletas federados">
      <div className="container mx-auto max-w-6xl px-4">
        <AthleteDirectory membershipType="federated" />
      </div>
    </section>
  </div>
);

export default AtletasFederadosPage;
