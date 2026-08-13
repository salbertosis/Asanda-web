import React, { lazy, useState } from 'react';
import { Link, Routes, Route, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Trophy } from 'lucide-react';
import { atletas } from './data/atletas';
import AppShell from './components/layout/AppShell';
import DarkModeToggle from './components/DarkModeToggle';
import AthleteModal from './components/AthleteModal';
import NewsSection from './components/NewsSection';
import VideoSection from './components/VideoSection';
import PhotoGallery from './components/PhotoGallery';
import AthletesSection from './components/AthletesSection';
import HeroSponsorSlot from './components/ads/HeroSponsorSlot';
import LeaderboardSlot from './components/ads/LeaderboardSlot';
import HeroBackground from './components/HeroBackground';
import HeroStats from './components/HeroStats';
import AdsDemoPreview from './components/ads/AdsDemoPreview';

const NoticiasPage = lazy(() => import('./pages/NoticiasPage.jsx'));
const VideosPage = lazy(() => import('./pages/VideosPage.jsx'));
const FotosPage = lazy(() => import('./pages/FotosPage.jsx'));
const AlbumPage = lazy(() => import('./pages/AlbumPage.jsx'));
const CalendarioPage = lazy(() => import('./pages/CalendarioPage.jsx'));
const ResultadosPage = lazy(() => import('./pages/ResultadosPage.jsx'));
const AtletasPage = lazy(() => import('./pages/AtletasPage.jsx'));
const RecordEstadalPage = lazy(() => import('./pages/RecordEstadalPage.jsx'));
const AtletasAsociadosPage = lazy(() => import('./pages/AtletasAsociadosPage.jsx'));
const AtletasFederadosPage = lazy(() => import('./pages/AtletasFederadosPage.jsx'));
const ClubesPage = lazy(() => import('./pages/ClubesPage.jsx'));
const PublicidadDemoPage = lazy(() => import('./pages/PublicidadDemoPage.jsx'));
const LegalPage = lazy(() => import('./pages/LegalPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.jsx'));
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
      <section
          className="relative isolate overflow-hidden text-white"
          aria-labelledby="home-title"
          itemScope
          itemType="https://schema.org/SportsOrganization"
        >
          <HeroBackground />

          <div className="relative z-10 mx-auto grid min-h-[640px] min-w-0 max-w-7xl content-between gap-8 px-4 pb-0 pt-6 sm:px-5 sm:pt-8 lg:min-h-[700px] lg:grid-cols-12 lg:gap-8 lg:pt-6">
            <div className="min-w-0 self-center rounded-[2rem] border border-white/10 bg-asanda-ink/35 p-5 shadow-[0_28px_80px_-42px_rgba(0,0,0,0.9)] backdrop-blur-[2px] sm:p-8 lg:col-span-8 lg:p-10">
              <div className="mb-5 flex items-center gap-3 text-[10px] font-bold uppercase leading-4 tracking-[0.13em] text-cyan-200 sm:text-[11px] sm:tracking-[0.16em]">
                <span className="h-px w-10 shrink-0 bg-asanda-cyan" aria-hidden="true" />
                Asociación de Deportes Acuáticos del Estado Anzoátegui
              </div>
              <h1 id="home-title" className="font-brand max-w-full text-[clamp(1.85rem,5vw,4.5rem)] font-bold uppercase leading-[0.94] tracking-[-0.04em]">
                <span className="block lg:whitespace-nowrap">Donde la pasión</span>
                {' '}
                <span className="block lg:whitespace-nowrap">acuática se siente</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-blue-50/95 sm:text-lg sm:leading-8">
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

            <div className="min-w-0 self-center lg:col-span-4">
              <HeroSponsorSlot />
            </div>

            <div className="lg:col-span-12">
              <HeroStats />
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
    <>
      <AppShell>
      <Routes>
        <Route path="/" element={<HomeGate />} />
        <Route path="/publicidad/demo/:slug" element={<PublicidadDemoPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/privacidad" element={<PrivacyPage />} />
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
      </AppShell>
      <DarkModeToggle />
    </>
  );
}

export default App;
