# 📋 Guía de Mantenimiento - Portal ASANDA

Esta guía explica cómo mantener y actualizar el contenido del portal web sin necesidad de conocimientos técnicos avanzados.

---

## 📁 Estructura de Archivos de Datos

Todos los datos están organizados en la carpeta `src/data/`:

```
src/data/
├── atletas.js          # Datos de atletas y récords
├── albumes.js          # Álbumes de fotos
├── noticias.js         # Noticias (por crear)
├── videos.js           # Videos (por crear)
├── resultados2025.js   # Resultados del año 2025
├── resultados2026.js   # Resultados del año 2026
├── calendario2025.js   # Calendario del año 2025
└── calendario2026.js   # Calendario del año 2026
```

---

## 📰 1. CÓMO POSTEAR NOTICIAS

### Ubicación del archivo:
- **Página principal**: `src/components/NewsSection.jsx` (líneas 6-31)
- **Página de noticias**: `src/pages/NoticiasPage.jsx` (líneas 8-66)

### Pasos para agregar una noticia:

1. **Abrir el archivo** `src/pages/NoticiasPage.jsx`

2. **Buscar el array `noticias`** (alrededor de la línea 8)

3. **Agregar una nueva noticia** al inicio del array (las más recientes van primero):

```javascript
const noticias = [
  {
    id: 6,  // ← Incrementar el ID (siguiente número disponible)
    titulo: "Título de tu noticia aquí",
    fecha: "Hace 1 día",  // o "Hace 2 días", "Hace 1 semana", etc.
    categoria: "Competencia",  // Opciones: Competencia, Selección, Infraestructura, Natación, etc.
    imagen: "https://url-de-tu-imagen.com/imagen.jpg",  // URL de la imagen
    resumen: "Resumen breve de la noticia que aparecerá en la tarjeta..."
  },
  // ... resto de noticias
];
```

4. **También agregar en** `src/components/NewsSection.jsx` para que aparezca en la página principal

5. **Guardar y hacer commit**:
```bash
git add src/pages/NoticiasPage.jsx src/components/NewsSection.jsx
git commit -m "Agregar nueva noticia: [Título]"
git push origin main
```

### Ejemplo completo:

```javascript
{
  id: 6,
  titulo: "Nuevo Récord Estatal en 100m Libre",
  fecha: "Hace 1 día",
  categoria: "Competencia",
  imagen: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop",
  resumen: "El atleta Carlos Mendoza estableció un nuevo récord estatal con un tiempo de 51.89 segundos..."
}
```

---

## 📸 2. CÓMO CREAR ÁLBUMES DE FOTOS

### Ubicación del archivo:
- `src/data/albumes.js`

### Pasos para crear un nuevo álbum:

1. **Abrir el archivo** `src/data/albumes.js`

2. **Agregar el nuevo álbum** al inicio del array `albumes`:

```javascript
export const albumes = [
  {
    id: 9,  // ← Incrementar el ID
    titulo: "Nombre del Álbum",
    categoria: "Competencia",  // Opciones: Premiación, Nominaciones, Competencia, Evento, Highlights
    cantidad: 25,  // Número total de fotos
    portada: "https://url-imagen-portada.jpg",  // Imagen principal del álbum
    creditos: "ASANDA",  // Créditos del fotógrafo
    fecha: "15 de enero de 2026",  // Fecha del evento
    fotos: [
      {
        id: 1,
        url: "https://url-foto-1.jpg",
        titulo: "Descripción de la foto 1"
      },
      {
        id: 2,
        url: "https://url-foto-2.jpg",
        titulo: "Descripción de la foto 2"
      },
      // ... agregar todas las fotos
    ]
  },
  // ... resto de álbumes
];
```

### Ejemplo completo:

```javascript
{
  id: 9,
  titulo: "Campeonato Regional 2026",
  categoria: "Competencia",
  cantidad: 45,
  portada: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=400&fit=crop",
  creditos: "ASANDA",
  fecha: "20 de enero de 2026",
  fotos: [
    {
      id: 1,
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop",
      titulo: "Ceremonia de apertura"
    },
    {
      id: 2,
      url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=600&fit=crop",
      titulo: "Competencia de natación"
    },
    // ... más fotos
  ]
}
```

### Nota importante sobre imágenes:
- **Subir imágenes a un servicio de hosting** (Cloudinary, Imgur, o similar)
- **Obtener las URLs** de las imágenes subidas
- **Usar esas URLs** en el campo `url` de cada foto

---

## 🎥 3. CÓMO POSTEAR VIDEOS

### Ubicación del archivo:
- **Página principal**: `src/components/VideoSection.jsx` (líneas 6-39)
- **Página de videos**: `src/pages/VideosPage.jsx` (líneas 8-60)

### Pasos para agregar un video:

1. **Abrir el archivo** `src/pages/VideosPage.jsx`

2. **Buscar el array `videos`** (alrededor de la línea 8)

3. **Agregar un nuevo video** al inicio del array:

```javascript
const videos = [
  {
    id: 5,  // ← Incrementar el ID
    titulo: "Título del video",
    duracion: "05:30",  // Duración en formato MM:SS
    thumbnail: "https://url-imagen-miniatura.jpg",  // Imagen de portada del video
    vistas: "1.2K",  // Número de visualizaciones (formato: 1.2K, 5.5K, 12K, etc.)
    fecha: "Hace 1 día",
    url: "https://youtube.com/watch?v=..."  // URL del video (YouTube, Vimeo, etc.)
  },
  // ... resto de videos
];
```

### Ejemplo completo:

```javascript
{
  id: 5,
  titulo: "Highlights del Campeonato Estadal 2026",
  duracion: "12:45",
  thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=450&fit=crop",
  vistas: "3.5K",
  fecha: "Hace 2 días",
  url: "https://www.youtube.com/watch?v=abc123"
}
```

### Nota sobre videos:
- **Subir videos a YouTube o Vimeo**
- **Obtener la URL** del video
- **Usar una imagen como thumbnail** (puede ser un frame del video)

---

## 🏆 4. CÓMO EDITAR RÉCORDS

### Ubicación del archivo:
- `src/data/atletas.js`

### Pasos para editar un récord:

1. **Abrir el archivo** `src/data/atletas.js`

2. **Buscar el atleta** por nombre o ID

3. **Editar los campos necesarios**:

```javascript
{
  id: 1,
  nombre: "Carlos Mendoza",
  club: "Club Deportivo Acuático",
  categoria: "Juvenil A",
  sexo: "Masculino",
  tiempo: "52.34",  // ← Tiempo de competencia
  evento: "100m Libre",
  foto: "https://url-foto-atleta.jpg",
  recordPersonal: "51.89",  // ← RÉCORD PERSONAL (este es el que se muestra en Récord Estadal)
  marcaMinimaFederada: "53.20",
  medallas: ["Oro", "Plata"]
}
```

### Campos importantes:
- **`recordPersonal`**: Este es el tiempo que aparece en la página de Récord Estadal
- **`tiempo`**: Tiempo de la última competencia
- **`categoria`**: Categoría del atleta (Infantil B, Infantil A, Juvenil B, Juvenil A, Absoluto)
- **`sexo`**: Masculino o Femenino (para filtros)

### Para agregar un nuevo atleta:

```javascript
{
  id: 11,  // ← Nuevo ID
  nombre: "Nuevo Atleta",
  club: "Nombre del Club",
  categoria: "Juvenil A",
  sexo: "Masculino",
  tiempo: "55.20",
  evento: "100m Libre",
  foto: "https://url-foto.jpg",
  recordPersonal: "54.80",
  marcaMinimaFederada: "56.00",
  medallas: ["Oro"]
}
```

---

## 📊 5. CÓMO AGREGAR RESULTADOS DE COMPETENCIAS

### Ubicación del archivo:
- `src/data/resultados2025.js` o `src/data/resultados2026.js` (según el año)

### Estructura de un resultado:

```javascript
{
  id: "comp-001",
  nombre: "Campeonato Estadal 2026",
  fecha: "2026-01-15",
  lugar: "Piscina Olímpica, Barcelona",
  deporte: "natacion",  // natacion, waterpolo, aguas-abiertas
  resultados: [
    {
      posicion: 1,
      atleta: "Carlos Mendoza",
      club: "Club Deportivo Acuático",
      categoria: "Juvenil A",
      tiempo: "51.89",
      evento: "100m Libre"
    },
    {
      posicion: 2,
      atleta: "Ana Martínez",
      club: "Nadadores Elite",
      categoria: "Juvenil A",
      tiempo: "57.80",
      evento: "100m Libre"
    }
    // ... más resultados
  ]
}
```

---

## 📅 6. CÓMO AGREGAR EVENTOS AL CALENDARIO

### Ubicación del archivo:
- `src/data/calendario2025.js` o `src/data/calendario2026.js`

### Estructura de un evento:

```javascript
{
  id: "event-001",
  nombre: "Campeonato Estadal 2026",
  fecha: "2026-02-15",
  fechaFin: "2026-02-18",  // Opcional, si es un evento de varios días
  lugar: "Piscina Olímpica, Barcelona",
  deporte: "natacion",
  categoria: "Todas",
  tipo: "Competencia",  // Competencia, Entrenamiento, Evento Especial
  descripcion: "Campeonato estadal de natación..."
}
```

---

## 🔄 FLUJO DE TRABAJO RECOMENDADO

### Para cada actualización:

1. **Editar el archivo** correspondiente en `src/data/` o el componente
2. **Guardar los cambios**
3. **Probar localmente** (opcional):
   ```bash
   npm run dev
   ```
4. **Hacer commit y push**:
   ```bash
   git add .
   git commit -m "Descripción del cambio"
   git push origin main
   ```
5. **Vercel desplegará automáticamente** los cambios

---

## 🚀 OPCIONES FUTURAS (Con Base de Datos)

### Cuando el sitio crezca, puedes considerar:

1. **CMS (Content Management System)**:
   - **Strapi** (gratis, open-source)
   - **Sanity** (gratis hasta cierto límite)
   - **Contentful** (plan gratuito disponible)

2. **Base de Datos**:
   - **Supabase** (PostgreSQL gratuito)
   - **Firebase** (plan gratuito generoso)
   - **MongoDB Atlas** (plan gratuito)

3. **Panel de Administración**:
   - Crear un panel admin con React
   - Formularios para agregar noticias, fotos, videos
   - Sin necesidad de editar código

### Ventajas de usar BD:
- ✅ No necesitas editar código
- ✅ Panel de administración visual
- ✅ Múltiples usuarios pueden editar
- ✅ Historial de cambios
- ✅ Mejor organización de datos

---

## 📝 NOTAS IMPORTANTES

1. **IDs únicos**: Siempre incrementa los IDs cuando agregues nuevos elementos
2. **Orden**: Las noticias/videos más recientes van al inicio del array
3. **URLs de imágenes**: Asegúrate de que las URLs sean accesibles públicamente
4. **Formato de fechas**: Usa formato consistente (ej: "Hace 1 día", "15 de enero de 2026")
5. **Backup**: Antes de hacer cambios grandes, haz un commit para tener un punto de restauración

---

## 🆘 ¿NECESITAS AYUDA?

Si tienes dudas sobre cómo editar algún archivo específico, puedes:
1. Revisar los ejemplos en los archivos existentes
2. Consultar esta guía
3. Contactar al desarrollador para soporte

---

**Última actualización**: Enero 2026


