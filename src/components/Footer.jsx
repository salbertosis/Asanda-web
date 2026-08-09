import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import PartnerGridSlot from './ads/PartnerGridSlot';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo y Descripción */}
          <div>
            <div className="mb-4">
              <img 
                src="/asanda.png" 
                alt="ASANDA" 
                className="h-16 w-auto object-contain mb-3"
              />
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Portal oficial de resultados y estadísticas de deportes acuáticos del estado Anzoátegui. 
              Información actualizada sobre competencias, atletas y eventos.
            </p>
            <div className="flex gap-3">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors" aria-label="YouTube">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Deportes */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Deportes</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/resultados?deporte=natacion" className="hover:text-white transition-colors">Natación</Link></li>
              <li><Link to="/resultados?deporte=waterpolo" className="hover:text-white transition-colors">Waterpolo</Link></li>
              <li><Link to="/resultados?deporte=aguas-abiertas" className="hover:text-white transition-colors">Aguas Abiertas</Link></li>
            </ul>
          </div>

          {/* Enlaces */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Enlaces</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/resultados" className="hover:text-white transition-colors">Resultados</Link></li>
              <li><Link to="/atletas" className="hover:text-white transition-colors">Atletas</Link></li>
              <li><Link to="/calendario" className="hover:text-white transition-colors">Calendario</Link></li>
              <li><Link to="/noticias" className="hover:text-white transition-colors">Noticias</Link></li>
              <li><Link to="/videos" className="hover:text-white transition-colors">Videos</Link></li>
              <li><Link to="/fotos" className="hover:text-white transition-colors">Fotos</Link></li>
              <li><Link to="/record-estadal" className="hover:text-white transition-colors">Récord Estadal</Link></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-400" />
                <span>Av. Principal, Ciudad</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-blue-400" />
                <span>+58 212 123 4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-blue-400" />
                <span>info@natacionestadal.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Partners Section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <h4 className="text-sm font-semibold text-gray-400 mb-4 text-center">PATROCINADORES GLOBALES</h4>
          <PartnerGridSlot />
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>Copyright 2025 - Natación Estadal. Todos los derechos reservados.</p>
          <div className="mt-2 flex justify-center gap-4">
            <a href="/legal" className="hover:text-white transition-colors">Legal</a>
            <a href="/privacidad" className="hover:text-white transition-colors">Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

