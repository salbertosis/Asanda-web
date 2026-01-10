import React, { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { atletas } from './data/atletas';
import Header from './components/Header';
import BannerAd from './components/BannerAd';
import SidebarAd from './components/SidebarAd';
import AthleteModal from './components/AthleteModal';
import NewsSection from './components/NewsSection';
import VideoSection from './components/VideoSection';
import PhotoGallery from './components/PhotoGallery';
import AthletesSection from './components/AthletesSection';
import ResultsCards from './components/ResultsCards';
import CompetitionsCalendar from './components/CompetitionsCalendar';
import RecordEstadal from './components/RecordEstadal';
import HeroSponsor from './components/HeroSponsor';
import HeroBackground from './components/HeroBackground';
import HeroStats from './components/HeroStats';
import Footer from './components/Footer';
import NoticiasPage from './pages/NoticiasPage';
import VideosPage from './pages/VideosPage';
import FotosPage from './pages/FotosPage';
import CalendarioPage from './pages/CalendarioPage';
import ResultadosPage from './pages/ResultadosPage';
import AtletasPage from './pages/AtletasPage';

function HomePage() {
  const [filtroClub, setFiltroClub] = useState('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const handleFiltroChange = (tipo, valor) => {
    if (tipo === 'club') setFiltroClub(valor);
    else if (tipo === 'categoria') setFiltroCategoria(valor);
    else if (tipo === 'busqueda') setBusqueda(valor);
  };

  // Obtener valores únicos para los filtros
  const clubs = useMemo(() => {
    const clubsUnicos = [...new Set(atletas.map(a => a.club))];
    return ['Todos', ...clubsUnicos];
  }, []);

  const categorias = useMemo(() => {
    const categoriasUnicas = [...new Set(atletas.map(a => a.categoria))];
    return ['Todas', ...categoriasUnicas];
  }, []);

  // Filtrar atletas
  const atletasFiltrados = useMemo(() => {
    return atletas.filter(atleta => {
      const coincideClub = filtroClub === 'Todos' || atleta.club === filtroClub;
      const coincideCategoria = filtroCategoria === 'Todas' || atleta.categoria === filtroCategoria;
      const coincideBusqueda = busqueda === '' || 
        atleta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        atleta.club.toLowerCase().includes(busqueda.toLowerCase());
      return coincideClub && coincideCategoria && coincideBusqueda;
    });
  }, [filtroClub, filtroCategoria, busqueda]);

  const abrirModal = (atleta) => {
    setAtletaSeleccionado(atleta);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setAtletaSeleccionado(null);
  };

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section 
        className="relative min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:min-h-[800px] flex flex-col overflow-hidden"
        role="banner"
        aria-label="Sección principal del portal"
        itemScope
        itemType="https://schema.org/WebPage"
      >
        {/* Imagen de fondo optimizada con parallax */}
        <HeroBackground useVideo={false} />
        
        {/* Contenido Principal - Tarjetas de Estadísticas */}
        <HeroStats 
          atletas={atletas} 
          clubs={clubs} 
          categorias={categorias}
        />

        {/* Publicidad de Patrocinante en la parte inferior izquierda */}
        <div className="relative z-10 pb-6 sm:pb-8 md:pb-12">
          <HeroSponsor />
        </div>
      </section>

      {/* Sección de Noticias */}
      <NewsSection />

      {/* Banner Ad Principal */}
      <div className="container mx-auto px-4 py-6">
        <BannerAd />
      </div>

      {/* Sección de Atletas Destacados */}
      <AthletesSection atletas={atletas} onAtletaClick={abrirModal} />

      {/* Banner Ad Principal */}
      <div className="container mx-auto px-4 py-6">
        <BannerAd />
      </div>

      {/* Sección de Resultados con Tarjetas */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <ResultsCards
                atletas={atletasFiltrados}
                filtroClub={filtroClub}
                filtroCategoria={filtroCategoria}
                busqueda={busqueda}
                clubs={clubs}
                categorias={categorias}
                onFiltroChange={handleFiltroChange}
                onAtletaClick={abrirModal}
              />
            </div>
            <div className="lg:col-span-1">
              <SidebarAd />
            </div>
          </div>
        </div>
      </section>

      {/* Sección de Calendario */}
      <CompetitionsCalendar />

      {/* Sección de Videos */}
      <VideoSection />

      {/* Galería de Fotos */}
      <PhotoGallery />

      {/* Sección de Récord Estadal */}
      <RecordEstadal />

      {/* Footer */}
      <Footer />

      {/* Modal de Detalles del Atleta */}
      <AthleteModal
        atleta={atletaSeleccionado}
        isOpen={modalAbierto}
        onClose={cerrarModal}
      />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/noticias" element={<NoticiasPage />} />
      <Route path="/videos" element={<VideosPage />} />
      <Route path="/fotos" element={<FotosPage />} />
      <Route path="/calendario" element={<CalendarioPage />} />
      <Route path="/resultados" element={<ResultadosPage />} />
      <Route path="/atletas" element={<AtletasPage />} />
    </Routes>
  );
}

export default App;
