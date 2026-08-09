import React, { useState } from 'react';
import { Link, Routes, Route, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Trophy } from 'lucide-react';
import { atletas } from './data/atletas';
import Header from './components/Header';
import AthleteModal from './components/AthleteModal';
import NewsSection from './components/NewsSection';
import VideoSection from './components/VideoSection';
import PhotoGallery from './components/PhotoGallery';
import AthletesSection from './components/AthletesSection';
import HeroSponsorSlot from './components/ads/HeroSponsorSlot';
import LeaderboardSlot from './components/ads/LeaderboardSlot';
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

      <main>
        <section
          className="relative isolate overflow-hidden text-white"
          aria-labelledby="home-title"
          itemScope
          itemType="https://schema.org/SportsOrganization"
        >
          <HeroBackground />

          <div className="relative z-10 mx-auto grid min-h-[620px] min-w-0 max-w-7xl content-between gap-10 px-4 pb-0 pt-16 sm:px-5 sm:pt-20 lg:min-h-[680px] lg:grid-cols-12 lg:gap-8 lg:pt-24">
            <div className="min-w-0 self-center pb-2 lg:col-span-8 lg:pb-10">
              <div className="mb-5 flex items-center gap-3 text-[10px] font-bold uppercase leading-4 tracking-[0.13em] text-cyan-200 sm:text-[11px] sm:tracking-[0.16em]">
                <span className="h-px w-10 shrink-0 bg-asanda-cyan" aria-hidden="true" />
                Asociación de Deportes Acuáticos del Estado Anzoátegui
              </div>
              <h1 id="home-title" className="font-brand max-w-4xl text-[clamp(1.8rem,8.6vw,5rem)] font-bold uppercase leading-[0.98] tracking-[-0.035em]">
                <span className="block whitespace-nowrap">Donde la pasión</span>
                {' '}
                <span className="block whitespace-nowrap">acuática se siente</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-blue-50 sm:text-lg sm:leading-8">
                Resultados, calendario, récords y actualidad de nuestros atletas y clubes, reunidos en el portal oficial de ASANDA.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/resultados"
                  className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 bg-asanda-cyan px-4 text-center text-xs font-extrabold uppercase tracking-[0.08em] text-asanda-ink transition-colors hover:bg-cyan-200 sm:gap-3 sm:px-6 sm:text-sm sm:tracking-[0.12em]"
                >
                  <Trophy size={19} aria-hidden="true" />
                  Ver resultados
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link
                  to="/calendario"
                  className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 border border-white/50 bg-white/5 px-4 text-center text-xs font-extrabold uppercase tracking-[0.08em] text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white/15 sm:gap-3 sm:px-6 sm:text-sm sm:tracking-[0.12em]"
                >
                  <CalendarDays size={19} aria-hidden="true" />
                  Consultar calendario
                </Link>
              </div>
            </div>

            <div className="min-w-0 self-end pb-6 lg:col-span-4 lg:pb-10">
              <HeroSponsorSlot />
            </div>

            <div className="lg:col-span-12">
              <HeroStats
                atletas={atletas}
                clubs={['Todos', ...new Set(atletas.map((atleta) => atleta.club))]}
              />
            </div>
          </div>
        </section>

        {/* Sección de Noticias */}
        <NewsSection />

        {/* Banner Ad Principal */}
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <LeaderboardSlot />
        </div>

        {/* Sección de Atletas Destacados */}
        <AthletesSection atletas={atletas} onAtletaClick={abrirModal} />

        {/* Banner Ad Principal */}
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <LeaderboardSlot />
        </div>

        {/* Sección de Videos */}
        <VideoSection />

        {/* Galería de Fotos */}
        <PhotoGallery />
      </main>

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
