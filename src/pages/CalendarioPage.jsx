import React, { useMemo, useState } from 'react';
import PageHero from '../components/PageHero';
import CompetitionsCalendar from '../components/CompetitionsCalendar';
import CompetitionSponsorBadge from '../components/ads/CompetitionSponsorBadge';
import { getCalendarioPorAño } from '../data/calendario';

const CalendarioPage = () => {
  const [año, setAño] = useState(2026);

  // Obtener competencias según el año seleccionado
  const competencias = useMemo(() => {
    return getCalendarioPorAño(año);
  }, [año]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHero
        title="Calendario"
        subtitle="La agenda oficial de competencias acuáticas de Anzoátegui, organizada por fecha, disciplina y sede."
        compact
      />

      {/* Patrocinador de competencias: inventario rotatorio global */}
      <div className="container mx-auto px-4 py-4">
        <CompetitionSponsorBadge />
      </div>

      <CompetitionsCalendar
        competencias={competencias}
        año={año}
        onAñoChange={setAño}
      />
    </div>
  );
};

export default CalendarioPage;

