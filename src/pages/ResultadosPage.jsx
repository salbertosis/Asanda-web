import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ResultsHero from '../components/ResultsHero';
import SportsNavBar from '../components/SportsNavBar';
import CompetitionResultsList from '../components/CompetitionResultsList';
import CompetitionSponsorBadge from '../components/ads/CompetitionSponsorBadge';
import { getResultadosPorAño } from '../data/resultados';

const ResultadosPage = () => {
  const [año, setAño] = useState(2025);
  const [mes, setMes] = useState('Todos');
  const [deporteSeleccionado, setDeporteSeleccionado] = useState('todos');

  // Obtener competencias según el año seleccionado
  const competencias = useMemo(() => {
    return getResultadosPorAño(año);
  }, [año]);

  // Filtrar por deporte si no es "todos"
  const competenciasFiltradas = useMemo(() => {
    if (deporteSeleccionado === 'todos') {
      return competencias;
    }
    return competencias.filter(comp => comp.deporte === deporteSeleccionado);
  }, [competencias, deporteSeleccionado]);

  const handleReset = () => {
    setAño(2025);
    setMes('Todos');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero con filtros */}
      <ResultsHero
        año={año}
        mes={mes}
        onAñoChange={setAño}
        onMesChange={setMes}
        onReset={handleReset}
      />

      {/* Barra de navegación de deportes */}
      <SportsNavBar
        deporteSeleccionado={deporteSeleccionado}
        onDeporteChange={setDeporteSeleccionado}
      />

      {/* Patrocinador de competencias: inventario rotatorio global */}
      <div className="container mx-auto px-4 py-4">
        <CompetitionSponsorBadge />
      </div>

      {/* Lista de resultados */}
      <CompetitionResultsList
        competencias={competenciasFiltradas}
        mes={mes}
        año={año}
      />

      <Footer />
    </div>
  );
};

export default ResultadosPage;
