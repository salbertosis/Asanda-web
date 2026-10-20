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

El servidor de `video-media` requiere `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y `CLOUDINARY_VIDEO_UPLOAD_PRESET`. El preset firmado debe admitir únicamente MP4 autenticados en `asanda/videos`. Se acepta el modo dinámico recomendado (`asset_folder=asanda/videos` y `use_asset_folder_as_public_id_prefix=true`) o el modo heredado compatible (`folder=asanda/videos`), pero nunca una mezcla de ambos. Los presets de Cloudinary no ofrecen un límite por preset, por lo que el cliente valida antes de cargar y el servidor vuelve a verificar los bytes reales al registrar/publicar. No se promete TTL para las URLs firmadas: archivar quita el video del catálogo, pero no revoca enlaces ya emitidos. La presencia de las variables no prueba permisos, cuota, lectura del preset ni reproducción; una persona autorizada debe confirmar la integración real.

### Recuperar un borrador sin repetir la carga

Si falla el registro después de subir el MP4, el panel conserva el Public ID mientras la página siga abierta y muestra el estado HTTP y el mensaje conocido del servidor, cuando están disponibles. No muestra respuestas desconocidas ni datos de autorización.

1. Completá título, slug y confirmación de derechos.
2. Revisá **Public ID del video ya subido**. Si recargaste la página, pegá el ID completo de Cloudinary (`asanda/videos/...`), no una URL ni el nombre del archivo.
3. Elegí **Registrar archivo existente**. No vuelve a subir el MP4 ni lo publica; el servidor mantiene la autenticación, las comprobaciones del recurso y el límite de 100 MB.

El rechazo de un recurso incluye un motivo seguro cuando está disponible: consulta denegada, recurso autenticado no encontrado, límite temporal de consultas, consulta no disponible o validación de identidad, tipo, formato, tamaño, duración o dimensiones. Estos motivos se entregan únicamente tras autorizar la gestión del video; no incluyen respuestas, URLs ni credenciales de Cloudinary. El diagnóstico no prueba una causa antes de consultar el recurso real ni corrige el archivo automáticamente.

Un rechazo sigue siendo un rechazo: esta recuperación no convierte recursos públicos o de otra carpeta en recursos admitidos. No cambies la privacidad ni subas otra copia para resolverlo. Un error sin respuesta legible conserva el aviso genérico; no prueba la causa original del 422.

### Comparar la duración sin modificar el archivo

En `/admin/videos`, pegá el Public ID admitido en **Public ID del video ya subido** y elegí **Comparar duración (solo lectura)**. No necesitás seleccionar un MP4, completar título/slug ni confirmar una publicación para esta consulta. Requiere una sesión activa de editor o administrador.

El servidor hace como máximo dos consultas Admin GET del mismo video autenticado: la habitual y otra con la opción documentada `media_metadata=true`. Solo devuelve si la duración está ausente, es inválida o es válida; si cada respuesta pasa la validación completa; y si ambas identifican el mismo recurso y versión. No devuelve metadatos, identificadores internos, enlaces ni credenciales. Si falta la identidad de versión o cambió, no se considera una comparación concluyente.

La comparación consume consultas API, no crea registros ni sube, transforma, publica o cambia el acceso del video. Tampoco modifica automáticamente la consulta utilizada para registrar/publicar: una duración válida en esta comparación es evidencia para decidir el siguiente paso, no una publicación. Una consulta fallida no se reintenta automáticamente.

Checks del adaptador de solo lectura: `node scripts/video-provider-regression.mjs`.

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

