import React from 'react';
import { Link } from 'react-router-dom';
import PartnerGridSlot from './ads/PartnerGridSlot';
import { approvedPublicSite } from '../config/publicSite';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Deportes */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Deportes</h2>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/resultados?deporte=natacion" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Natación</Link></li>
              <li><Link to="/resultados?deporte=waterpolo" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Waterpolo</Link></li>
              <li><Link to="/resultados?deporte=aguas-abiertas" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Aguas Abiertas</Link></li>
            </ul>
          </div>

          {/* Enlaces */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Enlaces</h2>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/resultados" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Resultados</Link></li>
              <li><Link to="/atletas" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Atletas</Link></li>
              <li><Link to="/calendario" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Calendario</Link></li>
              <li><Link to="/noticias" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Noticias</Link></li>
              <li><Link to="/videos" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Videos</Link></li>
              <li><Link to="/fotos" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Fotos</Link></li>
              <li><Link to="/record-estadal" className="inline-flex min-h-11 min-w-11 items-center hover:text-white transition-colors">Récord Estadal</Link></li>
            </ul>
          </div>

        </div>

        {/* Partners Section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 mb-4 text-center">PATROCINADORES GLOBALES</h2>
          <PartnerGridSlot />
        </div>

        {approvedPublicSite.copyright && <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400"><p>{approvedPublicSite.copyright.notice}</p>{approvedPublicSite.legal.legalApproved && approvedPublicSite.legal.privacyApproved && <div className="mt-2 flex justify-center gap-4"><Link to="/legal" className="inline-flex min-h-11 min-w-11 items-center justify-center">Legal</Link><Link to="/privacidad" className="inline-flex min-h-11 min-w-11 items-center justify-center">Privacidad</Link></div>}</div>}
      </div>
    </footer>
  );
};

export default Footer;

