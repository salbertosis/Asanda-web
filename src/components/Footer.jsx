import React from 'react';
import { Trophy, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

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
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Deportes */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Deportes</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Natación</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Clavados</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Polo Acuático</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Natación Artística</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Aguas Abiertas</a></li>
            </ul>
          </div>

          {/* Enlaces */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Enlaces</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#resultados" className="hover:text-white transition-colors">Resultados</a></li>
              <li><a href="#atletas" className="hover:text-white transition-colors">Atletas</a></li>
              <li><a href="#calendario" className="hover:text-white transition-colors">Calendario</a></li>
              <li><a href="#noticias" className="hover:text-white transition-colors">Noticias</a></li>
              <li><a href="#videos" className="hover:text-white transition-colors">Videos</a></li>
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
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="bg-white/10 px-6 py-3 rounded text-sm">Patrocinador 1</div>
            <div className="bg-white/10 px-6 py-3 rounded text-sm">Patrocinador 2</div>
            <div className="bg-white/10 px-6 py-3 rounded text-sm">Patrocinador 3</div>
            <div className="bg-white/10 px-6 py-3 rounded text-sm">Patrocinador 4</div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>Copyright 2025 - Natación Estadal. Todos los derechos reservados.</p>
          <div className="mt-2 flex justify-center gap-4">
            <a href="#" className="hover:text-white transition-colors">Legal</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

