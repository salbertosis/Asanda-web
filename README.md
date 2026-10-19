# Portal de Natación Estadal - ASANDA

Portal web profesional para visualizar resultados, noticias y estadísticas de natación estadal, desarrollado con React y Tailwind CSS. Diseño inspirado en World Aquatics.

## Características

- **Portal Web Completo**: Diseño profesional con múltiples secciones
- **Atletas Destacados**: Tarjetas visuales con los mejores nadadores
- **Resultados Interactivos**: Sistema de búsqueda y filtrado por Club y Categoría
- **Noticias y Videos**: Secciones de contenido multimedia
- **Galería de Fotos**: Visualización de imágenes con modal
- **Modal de Detalles**: Información completa del atleta al hacer clic
- **Sistema de Ad-Placement**: Componentes para Banner Principal y Sidebar
- **Diseño Moderno**: Estilo limpio y profesional con tema azul
- **Iconos**: Integración con Lucide-react para iconos de cronómetro y medallas

## Importación completa de resultados HY3

En el panel administrativo, **Resultados** permite elegir un HY3 y revisar localmente el nombre, las fechas, la sede, la piscina, las pruebas y todos los resultados finales, incluidos los relevos. No hace falta crear antes una competencia ni asociar participantes con perfiles ASANDA.

1. Elegí el archivo HY3.
2. Revisá la vista deportiva. Si los datos básicos están incompletos, corregí sólo nombre, fechas, sede o longitud de piscina; la validación se ejecuta nuevamente.
3. Confirmá con **Importar y publicar**.

La confirmación crea y publica una instantánea atómica e inmutable. Los archivos con resultados provisionales, piscina en yardas, checksum no disponible, referencias inválidas o identidad de competencia duplicada quedan bloqueados con una explicación. El navegador no sube el archivo original y el payload no contiene documentos de identidad, fechas de nacimiento, contactos ni notas privadas. Esta operación tampoco crea atletas, perfiles, clubes, organizaciones o consentimientos.

## Resultados públicos

La ruta **Resultados** combina las competencias existentes basadas en perfiles con las instantáneas HY3 publicadas y muestra únicamente resultados finales autorizados. El recorrido público es competencia → prueba → fase → tabla clasificada. Los filtros de año y mes se construyen con las fechas realmente disponibles. El detalle de una instantánea se solicita sólo cuando se abre su competencia, con estados explícitos de carga, error, reintento y ausencia de resultados.

Los participantes HY3 pueden aparecer por su nombre deportivo y club aunque no tengan perfil ASANDA; los relevos usan el nombre del equipo y nunca fabrican enlaces de perfil. La carga del archivo continúa exclusivamente en el panel administrativo. Si alguna consulta pública falla, la página informa el error y permite reintentar; no sustituye datos almacenados por resultados de demostración.

## Biblioteca de videos propios

La ruta pública `/videos` y la sección de inicio muestran únicamente filas publicadas. La reproducción usa controles HTML nativos y solicita una URL firmada sólo cuando la persona elige un video. El panel `/admin/videos` admite MP4 positivos de hasta **100000000 bytes (100 MB)**, los registra como borradores privados y exige confirmación humana de derechos y difusión antes de cargar y antes de publicar.

El servidor de `video-media` requiere `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y `CLOUDINARY_VIDEO_UPLOAD_PRESET`. El preset debe admitir MP4 autenticados en `asanda/videos`; los presets de Cloudinary no ofrecen un límite por preset, por lo que el cliente valida antes de cargar y el servidor vuelve a verificar los bytes reales al registrar/publicar. No se promete TTL para las URLs firmadas: archivar quita el video del catálogo, pero no revoca enlaces ya emitidos. El plan, la cuota, el preset y la reproducción de la cuenta real deben verificarse manualmente antes del despliegue.

## Logo ASANDA

El logo `asanda.png` ya está configurado en la carpeta `public/` y se muestra automáticamente en:
- **Header/Navbar**: Logo con nombre completo de la asociación
- **Hero Section**: Logo destacado en el banner principal
- **Footer**: Logo en la sección de información

El portal muestra el nombre completo: **"Asociación de Deportes Acuáticos del Estado Anzoátegui"** en todas las secciones relevantes.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Construcción

```bash
npm run build
```

## Estructura del Proyecto

```
public/
└── asanda.png              # Logo de ASANDA

src/
├── components/
│   ├── AthleteModal.jsx    # Modal con detalles del atleta
│   ├── AthletesSection.jsx # Sección de atletas destacados
│   ├── BannerAd.jsx        # Banner publicitario principal
│   ├── Footer.jsx          # Footer del portal
│   ├── Header.jsx          # Header/Navbar
│   ├── NewsSection.jsx      # Sección de noticias
│   ├── PhotoGallery.jsx    # Galería de fotos
│   ├── ResultsCards.jsx    # Tarjetas de resultados
│   ├── SidebarAd.jsx       # Publicidad lateral
│   └── VideoSection.jsx    # Sección de videos
├── data/
│   └── atletas.js          # Datos de ejemplo (10 atletas)
├── App.jsx                 # Componente principal
├── main.jsx                # Punto de entrada
└── index.css               # Estilos globales con Tailwind
```

## Tecnologías

- React 18
- Tailwind CSS 3
- Lucide-react (iconos)
- Vite (build tool)

