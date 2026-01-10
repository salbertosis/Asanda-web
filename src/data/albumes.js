// Datos de álbumes de fotos
export const albumes = [
  {
    id: 1,
    titulo: "Atletas del año 2025",
    categoria: "Premiación",
    cantidad: 30,
    portada: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop",
    creditos: "World Aquatics",
    fecha: "8 de enero de 2026",
    fotos: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
        titulo: "Atleta premiada"
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
        titulo: "Ceremonia de premiación"
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
        titulo: "Atleta con medalla"
      },
      {
        id: 4,
        url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop",
        titulo: "Momento de celebración"
      },
      {
        id: 5,
        url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop",
        titulo: "Equipo ganador"
      },
      {
        id: 6,
        url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=600&fit=crop",
        titulo: "Atletas en el podio"
      },
      {
        id: 7,
        url: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop",
        titulo: "Celebración en la piscina"
      },
      {
        id: 8,
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
        titulo: "Atleta sonriendo"
      },
      {
        id: 9,
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
        titulo: "Momento especial"
      },
      {
        id: 10,
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
        titulo: "Campeones 2025"
      },
      // Agregar más fotos hasta 30...
      ...Array.from({ length: 20 }, (_, i) => ({
        id: 11 + i,
        url: `https://picsum.photos/800/600?random=${1571019613 + i}`,
        titulo: `Foto ${11 + i} del álbum`
      }))
    ]
  },
  {
    id: 2,
    titulo: "Nominados a Atleta del Año 2025 | Natación",
    categoria: "Nominaciones",
    cantidad: 21,
    portada: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=400&fit=crop",
    creditos: "World Aquatics",
    fecha: "5 de enero de 2026",
    fotos: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
        titulo: "Nadador en competencia"
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop",
        titulo: "Estilo libre"
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
        titulo: "Nadadora profesional"
      },
      {
        id: 4,
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
        titulo: "Competencia de natación"
      },
      {
        id: 5,
        url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop",
        titulo: "Atleta en la piscina"
      },
      // Agregar más fotos hasta 21...
      ...Array.from({ length: 16 }, (_, i) => ({
        id: 6 + i,
        url: `https://picsum.photos/800/600?random=${1544005313 + i}`,
        titulo: `Foto ${6 + i} del álbum`
      }))
    ]
  },
  {
    id: 3,
    titulo: "Nominados al Atleta del Año 2025 | Saltos",
    categoria: "Nominaciones",
    cantidad: 24,
    portada: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
    creditos: "World Aquatics",
    fecha: "3 de enero de 2026",
    fotos: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
        titulo: "Clavadista en acción"
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop",
        titulo: "Salto perfecto"
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop",
        titulo: "Momento del salto"
      },
      {
        id: 4,
        url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=600&fit=crop",
        titulo: "Clavadista profesional"
      },
      // Agregar más fotos hasta 24...
      ...Array.from({ length: 20 }, (_, i) => ({
        id: 5 + i,
        url: `https://picsum.photos/800/600?random=${1507003211 + i}`,
        titulo: `Foto ${5 + i} del álbum`
      }))
    ]
  },
  {
    id: 4,
    titulo: "Campeonato Estadal 2025",
    categoria: "Competencia",
    cantidad: 45,
    portada: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=400&fit=crop",
    creditos: "ASANDA",
    fecha: "15 de diciembre de 2025",
    fotos: Array.from({ length: 45 }, (_, i) => ({
      id: i + 1,
      url: `https://picsum.photos/800/600?random=${1500648767 + i}`,
      titulo: `Foto ${i + 1} del campeonato`
    }))
  },
  {
    id: 5,
    titulo: "Ceremonia de Apertura",
    categoria: "Evento",
    cantidad: 32,
    portada: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=400&fit=crop",
    creditos: "ASANDA",
    fecha: "10 de diciembre de 2025",
    fotos: Array.from({ length: 32 }, (_, i) => ({
      id: i + 1,
      url: `https://picsum.photos/800/600?random=${1438761681 + i}`,
      titulo: `Foto ${i + 1} de la ceremonia`
    }))
  },
  {
    id: 6,
    titulo: "Lo mejor de 2025 - Natación",
    categoria: "Highlights",
    cantidad: 28,
    portada: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop",
    creditos: "ASANDA",
    fecha: "31 de diciembre de 2025",
    fotos: Array.from({ length: 28 }, (_, i) => ({
      id: i + 1,
      url: `https://picsum.photos/800/600?random=${1571019613 + i}`,
      titulo: `Momento destacado ${i + 1}`
    }))
  },
  {
    id: 7,
    titulo: "Lo mejor de 2025 - Waterpolo",
    categoria: "Highlights",
    cantidad: 19,
    portada: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=400&fit=crop",
    creditos: "ASANDA",
    fecha: "31 de diciembre de 2025",
    fotos: Array.from({ length: 19 }, (_, i) => ({
      id: i + 1,
      url: `https://picsum.photos/800/600?random=${1544005313 + i}`,
      titulo: `Jugada destacada ${i + 1}`
    }))
  },
  {
    id: 8,
    titulo: "Lo mejor de 2025 - Aguas Abiertas",
    categoria: "Highlights",
    cantidad: 22,
    portada: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
    creditos: "ASANDA",
    fecha: "31 de diciembre de 2025",
    fotos: Array.from({ length: 22 }, (_, i) => ({
      id: i + 1,
      url: `https://picsum.photos/800/600?random=${1507003211 + i}`,
      titulo: `Competencia aguas abiertas ${i + 1}`
    }))
  }
];

// Función para obtener un álbum por ID
export const getAlbumById = (id) => {
  return albumes.find(album => album.id === parseInt(id));
};

