import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { getUltimasNoticias } from '../data/noticias';

const NewsSection = () => {
  const noticias = getUltimasNoticias(3);

  return (
    <section id="noticias" aria-labelledby="news-title" className="border-t border-asanda-line bg-asanda-foam py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-5">
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-asanda-deep">
              <span className="h-px w-8 bg-asanda-orange" aria-hidden="true" />
              Actualidad ASANDA
            </p>
            <h2 id="news-title" className="font-display text-[2rem] font-bold leading-none tracking-tight text-asanda-ink sm:text-4xl">
              Últimas noticias
            </h2>
          </div>
          <Link to="/noticias" className="inline-flex min-h-11 items-center gap-2 font-bold text-asanda-deep transition-colors hover:text-asanda-orange">
            Ver todas <ArrowRight className="text-asanda-orange" size={19} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {noticias.map((noticia) => (
            <article
              key={noticia.id}
              className="group overflow-hidden rounded-[14px] border border-t-4 border-[#d3e9ea] border-t-transparent bg-white shadow-[0_18px_45px_-34px_rgba(8,127,132,0.55)] transition-[transform,box-shadow,border-color] hover:border-t-asanda-orange hover:shadow-[0_24px_55px_-32px_rgba(8,127,132,0.45)] motion-safe:hover:-translate-y-0.5"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={noticia.imagen}
                  alt={noticia.titulo}
                  className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
                />
                <div className="absolute left-4 top-4">
                  <span className="rounded-full bg-asanda-deep px-3 py-1 text-xs font-bold text-white shadow-sm">
                    {noticia.categoria}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Calendar className="text-asanda-orange" size={15} aria-hidden="true" />
                  <span>{noticia.fecha}</span>
                </div>
                <h3 className="mb-2 text-xl font-bold leading-snug text-asanda-ink transition-colors group-hover:text-asanda-deep">
                  {noticia.titulo}
                </h3>
                <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                  {noticia.resumen}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
