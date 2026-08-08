// Datos de noticias
export const noticias = [
  {
    id: 1,
    titulo: "Campeonato Estadal 2025: Récords Históricos",
    fecha: "Hace 2 días",
    categoria: "Competencia",
    imagen: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop",
    resumen: "Tres nuevos récords estatales fueron establecidos durante el campeonato..."
  },
  {
    id: 2,
    titulo: "Selección Estadal para Nacionales 2025",
    fecha: "Hace 5 días",
    categoria: "Selección",
    imagen: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=400&fit=crop",
    resumen: "La federación anunció la lista de atletas que representarán al estado..."
  },
  {
    id: 3,
    titulo: "Nuevo Centro de Entrenamiento Inaugurado",
    fecha: "Hace 1 semana",
    categoria: "Infraestructura",
    imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
    resumen: "El nuevo complejo acuático cuenta con piscina olímpica y tecnología de última generación..."
  },
  {
    id: 4,
    titulo: "Las actuaciones decisivas de la natación en 2025",
    fecha: "Hace 1 día",
    categoria: "Natación",
    imagen: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop",
    resumen: "Incluso en un año no olímpico, el deporte entregó en 2025 con mucha emoción..."
  },
  {
    id: 5,
    titulo: "El Salón de la Fama anuncia los homenajeados de 2026",
    fecha: "Hace 3 días",
    categoria: "Reconocimiento",
    imagen: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=400&fit=crop",
    resumen: "El Salón de la Fama de la Natación ha anunciado su clase de 2026..."
  },
  {
    id: 6,
    titulo: "Preparación para los Juegos Nacionales 2026",
    fecha: "Hace 4 días",
    categoria: "Preparación",
    imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
    resumen: "Los atletas estatales inician su preparación intensiva para los próximos juegos nacionales..."
  }
];

// Función para obtener las últimas noticias (para la página principal)
export const getUltimasNoticias = (cantidad = 3) => {
  return noticias.slice(0, cantidad);
};

// Función para obtener una noticia por ID
export const getNoticiaById = (id) => {
  return noticias.find(noticia => noticia.id === id);
};


