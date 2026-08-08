import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageHero from '../components/PageHero';
import { clubes } from '../data/clubes';
import { atletas } from '../data/atletas';
import { Building2, MapPin, Phone, Mail, Calendar, Users, Award } from 'lucide-react';

const ClubesPage = () => {
  // Calcular estadísticas reales de cada club
  const clubesConEstadisticas = clubes.map(club => {
    const atletasDelClub = atletas.filter(a => a.club === club.nombre);
    const asociados = atletasDelClub.filter(a => a.tipo === 'asociado').length;
    const federados = atletasDelClub.filter(a => a.tipo === 'federado').length;
    
    return {
      ...club,
      atletasAsociados: asociados,
      atletasFederados: federados,
      totalAtletas: asociados + federados
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <PageHero 
        title="Clubes Activos"
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          {/* Estadísticas Generales */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="text-blue-600" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Total de Clubes</h3>
              </div>
              <div className="text-3xl font-bold text-blue-600">{clubes.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-green-600" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Atletas Asociados</h3>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {atletas.filter(a => a.tipo === 'asociado').length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <Award className="text-yellow-600" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Atletas Federados</h3>
              </div>
              <div className="text-3xl font-bold text-yellow-600">
                {atletas.filter(a => a.tipo === 'federado').length}
              </div>
            </div>
          </div>

          {/* Grid de Clubes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubesConEstadisticas.map((club) => (
              <div
                key={club.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Imagen/Logo del Club */}
                <div className="h-48 bg-gradient-to-br from-blue-500 to-cyan-500 relative overflow-hidden">
                  <img
                    src={club.logo}
                    alt={club.nombre}
                    className="w-full h-full object-cover opacity-80"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white">{club.nombre}</h3>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {club.descripcion}
                  </p>

                  {/* Estadísticas del Club */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Asociados</div>
                      <div className="text-lg font-bold text-blue-600">{club.atletasAsociados}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Federados</div>
                      <div className="text-lg font-bold text-yellow-600">{club.atletasFederados}</div>
                    </div>
                  </div>

                  {/* Información de Contacto */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{club.direccion}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={16} className="flex-shrink-0" />
                      <span>{club.telefono}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={16} className="flex-shrink-0" />
                      <span className="truncate">{club.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={16} className="flex-shrink-0" />
                      <span>Fundado en {club.fundacion}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ClubesPage;

