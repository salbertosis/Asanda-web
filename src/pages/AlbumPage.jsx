import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageHero from '../components/PageHero';
import { X, ChevronLeft, ChevronRight, Camera, ArrowLeft } from 'lucide-react';
import { getAlbumById } from '../data/albumes';

const AlbumPage = () => {
  const { id } = useParams();
  const album = getAlbumById(id);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  if (!album) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Álbum no encontrado</h1>
          <Link to="/fotos" className="text-blue-600 hover:underline">
            Volver a Galerías
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const abrirImagen = (foto) => {
    setImagenSeleccionada(foto);
  };

  const cerrarImagen = () => {
    setImagenSeleccionada(null);
  };

  const siguienteImagen = () => {
    const indiceActual = album.fotos.findIndex(f => f.id === imagenSeleccionada.id);
    const siguiente = album.fotos[(indiceActual + 1) % album.fotos.length];
    setImagenSeleccionada(siguiente);
  };

  const anteriorImagen = () => {
    const indiceActual = album.fotos.findIndex(f => f.id === imagenSeleccionada.id);
    const anterior = album.fotos[(indiceActual - 1 + album.fotos.length) % album.fotos.length];
    setImagenSeleccionada(anterior);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero con título del álbum */}
      <PageHero 
        title={album.titulo}
        backgroundImage={album.portada}
      />

      {/* Información del álbum */}
      <section className="py-6 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/fotos"
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Volver a Galerías</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Camera size={16} />
                <span>{album.cantidad} fotos</span>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <span className="text-sm text-gray-500">{album.fecha}</span>
            </div>
            <div className="text-sm text-gray-500">
              <span>Créditos: {album.creditos}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Instrucción para ampliar */}
      <section className="py-4 bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-end gap-2 text-gray-600 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border border-gray-400 rounded flex items-center justify-center">
                <div className="w-2 h-2 border-t border-r border-gray-400 transform rotate-45"></div>
              </div>
              <span>Toque las imágenes para ampliarlas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Galería de fotos */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {album.fotos.map((foto) => (
              <div
                key={foto.id}
                onClick={() => abrirImagen(foto)}
                className="relative group cursor-pointer overflow-hidden rounded-lg aspect-square bg-gray-100"
              >
                <img
                  src={foto.url}
                  alt={foto.titulo}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal de Imagen Ampliada */}
      {imagenSeleccionada && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={cerrarImagen}
        >
          <button
            onClick={cerrarImagen}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
          {album.fotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  anteriorImagen();
                }}
                className="absolute left-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
                aria-label="Imagen anterior"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  siguienteImagen();
                }}
                className="absolute right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
                aria-label="Siguiente imagen"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-6xl w-full max-h-[90vh] flex flex-col"
          >
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={imagenSeleccionada.url}
                alt={imagenSeleccionada.titulo}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-white text-xl font-semibold">{imagenSeleccionada.titulo}</p>
              <p className="text-white/60 text-sm mt-1">
                {imagenSeleccionada.id} de {album.cantidad}
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AlbumPage;

