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

## Reconciliación de resultados HY3

En el panel administrativo, **Resultados → Generar vista previa saneada** muestra el nombre del atleta o club leído del archivo junto a su código de origen. Usá **Buscar identidad del archivo** para filtrar por nombre o código y **Solo pendientes** para revisar las asociaciones faltantes. Cada fila permite buscar el registro ASANDA por nombre antes de seleccionarlo.

Buscar y filtrar no guarda asociaciones ni asigna coincidencias automáticamente. Confirmá la identidad antes de seleccionar: una asociación del atleta se aplica a sus distintas pruebas. Si el archivo no trae un nombre reconocible, no adivines por el código. La importación sigue bloqueada mientras existan errores de reconciliación.

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

