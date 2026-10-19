import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import VideoLibrary from './VideoLibrary';

export default function VideoSection() {
  return <section id="videos" className="bg-asanda-foam py-12 dark:bg-dark-bg" aria-labelledby="home-videos-title">
    <div className="mx-auto max-w-7xl px-4 sm:px-5">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep dark:text-cyan-200">Biblioteca audiovisual</p><h2 id="home-videos-title" className="mt-2 font-display text-3xl font-bold text-asanda-ink dark:text-white">Videos recientes</h2></div><Link to="/videos" className="inline-flex min-h-11 items-center gap-2 font-bold text-asanda-deep underline-offset-4 hover:underline dark:text-cyan-100">Ver todos <ArrowRight size={18} aria-hidden="true" /></Link></div>
      <VideoLibrary limit={4} emptyMessage="Todavía no hay videos publicados." />
    </div>
  </section>;
}
