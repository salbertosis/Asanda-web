import React, { useState } from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
import { atletas } from './data/atletas';
import Header from './components/Header';
import BannerAd from './components/BannerAd';
import SidebarAd from './components/SidebarAd';
import AthleteModal from './components/AthleteModal';
import NewsSection from './components/NewsSection';
import VideoSection from './components/VideoSection';
import PhotoGallery from './components/PhotoGallery';
import AthletesSection from './components/AthletesSection';
import HeroSponsor from './components/HeroSponsor';
import HeroBackground from './components/HeroBackground';
import HeroStats from './components/HeroStats';
import Footer from './components/Footer';
import NoticiasPage from './pages/NoticiasPage';
import VideosPage from './pages/VideosPage';
import FotosPage from './pages/FotosPage';
import AlbumPage from './pages/AlbumPage';
import CalendarioPage from './pages/CalendarioPage';
import ResultadosPage from './pages/ResultadosPage';
import AtletasPage from './pages/AtletasPage';
import RecordEstadalPage from './pages/RecordEstadalPage';
import AtletasAsociadosPage from './pages/AtletasAsociadosPage';
import AtletasFederadosPage from './pages/AtletasFederadosPage';
import ClubesPage from './pages/ClubesPage';
import PublicidadDemoPage from './pages/PublicidadDemoPage';
import AdsDemoPreview from './components/ads/AdsDemoPreview';

function HomePage() {
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

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
        className="relative min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[700px] xl:min-h-[800px] flex flex-col overflow-hidden"
        role="banner"
        aria-label="Sección principal del portal"
        itemScope
        itemType="https://schema.org/WebPage"
      >
        {/* Imagen de fondo optimizada con parallax */}
        <HeroBackground useVideo={false} />
        
        {/* Contenido Principal - Tarjetas de Estadísticas en la parte superior */}
        <HeroStats 
          atletas={atletas} 
          clubs={['Todos', ...new Set(atletas.map(a => a.club))]} 
          categorias={['Todas', ...new Set(atletas.map(a => a.categoria))]}
        />

        {/* Publicidad de Patrocinante en la parte inferior izquierda */}
        <div className="relative z-10 mt-auto pb-4 sm:pb-6 md:pb-8 lg:pb-12">
          <HeroSponsor />
        </div>
      </section>

      {/* Sección de Noticias */}
      <NewsSection />

      {/* Banner Ad Principal */}
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <BannerAd />
      </div>

      {/* Sección de Atletas Destacados */}
      <AthletesSection atletas={atletas} onAtletaClick={abrirModal} />

      {/* Banner Ad Principal */}
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <BannerAd />
      </div>

      {/* Sección de Videos */}
      <VideoSection />

      {/* Galería de Fotos */}
      <PhotoGallery />

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

// Gate aislado de PR 1: solo con ?ads=demo muestra la vista previa de slots;
// sin el parámetro, la página visible actual queda intacta.
function HomeGate() {
  const [searchParams] = useSearchParams();
  if (searchParams.get('ads') === 'demo') {
    return <AdsDemoPreview />;
  }
  return <HomePage />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeGate />} />
      <Route path="/publicidad/demo/:slug" element={<PublicidadDemoPage />} />
      <Route path="/noticias" element={<NoticiasPage />} />
      <Route path="/videos" element={<VideosPage />} />
      <Route path="/fotos" element={<FotosPage />} />
      <Route path="/fotos/album/:id" element={<AlbumPage />} />
      <Route path="/calendario" element={<CalendarioPage />} />
      <Route path="/resultados" element={<ResultadosPage />} />
      <Route path="/atletas" element={<AtletasPage />} />
      <Route path="/atletas-asociados" element={<AtletasAsociadosPage />} />
      <Route path="/atletas-federados" element={<AtletasFederadosPage />} />
      <Route path="/clubes" element={<ClubesPage />} />
      <Route path="/record-estadal" element={<RecordEstadalPage />} />
    </Routes>
  );
}

export default App;
