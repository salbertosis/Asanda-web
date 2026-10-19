import React from 'react';
import PageHero from '../components/PageHero';
import VideoLibrary from '../components/VideoLibrary';

export default function VideosPage() {
  return <div className="min-h-screen bg-asanda-foam dark:bg-dark-bg">
    <PageHero title="Videos" subtitle="Registros audiovisuales publicados por ASANDA" compact />
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-5 sm:py-16" aria-labelledby="video-catalog-title">
      <div className="mb-8 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep dark:text-cyan-200">Biblioteca audiovisual</p><h2 id="video-catalog-title" className="mt-2 font-display text-3xl font-bold text-asanda-ink dark:text-white sm:text-4xl">Videos publicados</h2><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">Elegí un video para solicitar su reproducción segura.</p></div>
      <VideoLibrary searchable />
    </section>
  </div>;
}
