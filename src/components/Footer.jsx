import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import PartnerGridSlot from './ads/PartnerGridSlot';
import { approvedPublicSite } from '../config/publicSite';

const WhatsAppIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.21 5.1 4.5.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.04 21.5h-.01a9.46 9.46 0 0 1-4.82-1.32l-.35-.2-3.59.94.96-3.5-.23-.36A9.42 9.42 0 0 1 2.55 12c0-5.22 4.26-9.47 9.5-9.47 2.53 0 4.92.99 6.71 2.78A9.4 9.4 0 0 1 21.54 12c0 5.23-4.26 9.48-9.5 9.48m8.08-17.52A11.35 11.35 0 0 0 12.05.64C5.77.64.66 5.74.66 12c0 2 .52 3.96 1.52 5.68L.57 23.55l6.02-1.58a11.4 11.4 0 0 0 5.45 1.39h.01c6.28 0 11.39-5.1 11.39-11.37 0-3.04-1.18-5.89-3.33-8.03" />
  </svg>
);

const Footer = () => {
  const instagram = approvedPublicSite.social.find(({ label }) => label === 'Instagram');
  const whatsapp = approvedPublicSite.social.find(({ label }) => label === 'WhatsApp');

  return (
    <footer className="bg-gray-900 text-white">
      <section className="border-y border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-100" aria-labelledby="global-sponsors-title">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-center lg:py-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Aliados ASANDA</p>
            <h2 id="global-sponsors-title" className="mt-2 text-lg font-bold tracking-wide text-slate-800">Patrocinadores globales</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">Identidades ficticias de demostración.</p>
          </div>
          <PartnerGridSlot />
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {(instagram || whatsapp) && (
          <div className="text-center">
            <h2 className="mb-4 text-lg font-semibold">Síguenos</h2>
            <div className="flex justify-center gap-3">
              {instagram && (
              <a
                href={instagram.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Seguir a ASANDA en Instagram"
                className="inline-flex size-11 items-center justify-center rounded-full border border-slate-700 text-gray-300 transition-colors hover:border-asanda-cyan hover:text-asanda-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asanda-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                <Instagram size={24} aria-hidden="true" />
              </a>
              )}
              {whatsapp && (
                <a
                  href={whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Contactar a ASANDA por WhatsApp"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-slate-700 text-gray-300 transition-colors hover:border-green-400 hover:text-green-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  <WhatsAppIcon />
                </a>
              )}
            </div>
          </div>
        )}

        {approvedPublicSite.copyright && <div className="mt-6 border-t border-gray-800 pt-6 text-center text-sm text-gray-400"><p>{approvedPublicSite.copyright.notice}</p>{approvedPublicSite.legal.legalApproved && approvedPublicSite.legal.privacyApproved && <div className="mt-2 flex justify-center gap-4"><Link to="/legal" className="inline-flex min-h-11 min-w-11 items-center justify-center">Legal</Link><Link to="/privacidad" className="inline-flex min-h-11 min-w-11 items-center justify-center">Privacidad</Link></div>}</div>}
      </div>
    </footer>
  );
};

export default Footer;

