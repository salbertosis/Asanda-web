import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageHero from '../components/PageHero';
import { Camera } from 'lucide-react';
import { albumes } from '../data/albumes';

const FotosPage = () => {

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero con título Fotos */}
      <PageHero 
        title="Galerías de Fotos"
        backgroundImage="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&h=1080&fit=crop&q=80"
      />

      {/* Contenido de Álbumes */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {albumes.map((album) => {
              // Obtener las primeras 3 fotos para el collage
              const fotosPreview = album.fotos.slice(0, 3);
              const fotosRestantes = album.cantidad - 3;

              return (
                <Link
                  key={album.id}
                  to={`/fotos/album/${album.id}`}
                  className="group block bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200"
                >
                  {/* Collage de imágenes */}
                  <div className="relative h-64 md:h-80 overflow-hidden">
                    <div className="grid grid-cols-2 gap-1 h-full">
                      {/* Imagen principal (izquierda, ocupa 2 filas) */}
                      <div className="row-span-2 bg-gray-200">
                        <img
                          src={fotosPreview[0]?.url || album.portada}
                          alt={fotosPreview[0]?.titulo || album.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = album.portada;
                          }}
                        />
                      </div>
                      {/* Imagen superior derecha */}
                      <div className="bg-gray-200">
                        <img
                          src={fotosPreview[1]?.url || album.portada}
                          alt={fotosPreview[1]?.titulo || album.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = album.portada;
                          }}
                        />
                      </div>
                      {/* Imagen inferior derecha con overlay de más fotos */}
                      <div className="relative bg-gray-200">
                        <img
                          src={fotosPreview[2]?.url || album.portada}
                          alt={fotosPreview[2]?.titulo || album.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = album.portada;
                          }}
                        />
                        {fotosRestantes > 0 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Camera size={24} className="mx-auto mb-1" />
                              <p className="text-sm font-semibold">+{fotosRestantes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Información del álbum */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                        {album.categoria}
                      </span>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Camera size={14} />
                        <span>{album.cantidad} fotos</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {album.titulo}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{album.fecha}</span>
                      <span className="text-gray-400">Créditos: {album.creditos}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FotosPage;

