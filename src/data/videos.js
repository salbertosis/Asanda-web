// Datos de videos
export const videos = [
  {
    id: 1,
    titulo: "Momentos Inolvidables del Campeonato 2025",
    duracion: "09:45",
    thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=450&fit=crop",
    vistas: "12.5K",
    fecha: "Hace 1 día",
    url: "https://www.youtube.com/watch?v=ejemplo1"
  },
  {
    id: 2,
    titulo: "Récord Estatal: 100m Libre",
    duracion: "03:32",
    thumbnail: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=450&fit=crop",
    vistas: "8.2K",
    fecha: "Hace 3 días",
    url: "https://www.youtube.com/watch?v=ejemplo2"
  },
  {
    id: 3,
    titulo: "Colección Completa de Medallas 2025",
    duracion: "27:52",
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop",
    vistas: "15.8K",
    fecha: "Hace 5 días",
    url: "https://www.youtube.com/watch?v=ejemplo3"
  },
  {
    id: 4,
    titulo: "Dominio Total: Récords Mundiales",
    duracion: "11:07",
    thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=450&fit=crop",
    vistas: "22.1K",
    fecha: "Hace 1 semana",
    url: "https://www.youtube.com/watch?v=ejemplo4"
  },
  {
    id: 5,
    titulo: "Entrenamiento de Alto Rendimiento",
    duracion: "15:30",
    thumbnail: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=450&fit=crop",
    vistas: "5.3K",
    fecha: "Hace 2 días",
    url: "https://www.youtube.com/watch?v=ejemplo5"
  },
  {
    id: 6,
    titulo: "Ceremonia de Premiación 2025",
    duracion: "18:20",
    thumbnail: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=450&fit=crop",
    vistas: "9.1K",
    fecha: "Hace 4 días",
    url: "https://www.youtube.com/watch?v=ejemplo6"
  }
];

// Función para obtener los videos destacados (para la página principal)
export const getVideosDestacados = (cantidad = 4) => {
  return videos.slice(0, cantidad);
};

// Función para obtener un video por ID
export const getVideoById = (id) => {
  return videos.find(video => video.id === id);
};


