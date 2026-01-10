import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const PhotoGallery = () => {
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  const fotos = [
    {
      id: 1,
      titulo: "Atletas del Año 2025",
      imagen: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop",
      categoria: "Premiación"
    },
    {
      id: 2,
      titulo: "Nominados al Atleta del Año - Natación",
      imagen: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=400&fit=crop",
      categoria: "Nominaciones"
    },
    {
      id: 3,
      titulo: "Nominados al Atleta del Año - Clavados",
      imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
      categoria: "Nominaciones"
    },
    {
      id: 4,
      titulo: "Nominados al Atleta del Año - Clavados Altos",
      imagen: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=400&fit=crop",
      categoria: "Nominaciones"
    },
    {
      id: 5,
      titulo: "Campeonato Estadal 2025",
      imagen: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=400&fit=crop",
      categoria: "Competencia"
    },
    {
      id: 6,
      titulo: "Ceremonia de Apertura",
      imagen: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=400&fit=crop",
      categoria: "Evento"
    }
  ];

  const abrirImagen = (foto) => {
    setImagenSeleccionada(foto);
  };

  const cerrarImagen = () => {
    setImagenSeleccionada(null);
  };

  const siguienteImagen = () => {
    const indiceActual = fotos.findIndex(f => f.id === imagenSeleccionada.id);
    const siguiente = fotos[(indiceActual + 1) % fotos.length];
    setImagenSeleccionada(siguiente);
  };

  const anteriorImagen = () => {
    const indiceActual = fotos.findIndex(f => f.id === imagenSeleccionada.id);
    const anterior = fotos[(indiceActual - 1 + fotos.length) % fotos.length];
    setImagenSeleccionada(anterior);
  };

  return (
    <>
      <section id="fotos" className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Galería de Fotos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fotos.map((foto) => (
              <div
                key={foto.id}
                onClick={() => abrirImagen(foto)}
                className="relative group cursor-pointer overflow-hidden rounded-lg aspect-square"
              >
                <img
                  src={foto.imagen}
                  alt={foto.titulo}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-xs text-white/80 bg-blue-600 px-2 py-1 rounded mb-2 inline-block">
                      {foto.categoria}
                    </span>
                    <p className="text-white font-semibold text-sm">{foto.titulo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal de Imagen */}
      {imagenSeleccionada && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={cerrarImagen}
        >
          <button
            onClick={cerrarImagen}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
          >
            <X size={24} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              anteriorImagen();
            }}
            className="absolute left-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              siguienteImagen();
            }}
            className="absolute right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
          >
            <ChevronRight size={32} />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-5xl w-full">
            <img
              src={imagenSeleccionada.imagen}
              alt={imagenSeleccionada.titulo}
              className="w-full h-auto rounded-lg"
            />
            <div className="mt-4 text-center">
              <p className="text-white text-xl font-semibold">{imagenSeleccionada.titulo}</p>
              <p className="text-white/60 text-sm mt-1">{imagenSeleccionada.categoria}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;

