import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageHero from '../components/PageHero';
import CompetitionsCalendar from '../components/CompetitionsCalendar';
import { getCalendarioPorAño } from '../data/calendario';

const CalendarioPage = () => {
  const [año, setAño] = useState(2026);

  // Obtener competencias según el año seleccionado
  const competencias = useMemo(() => {
    return getCalendarioPorAño(año);
  }, [año]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero con título Calendario */}
      <PageHero 
        title="Calendario"
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      {/* Contenido de Calendario */}
      <CompetitionsCalendar 
        competencias={competencias}
        año={año}
        onAñoChange={setAño}
      />

      <Footer />
    </div>
  );
};

export default CalendarioPage;

