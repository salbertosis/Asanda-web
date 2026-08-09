# Especificación: modernización de Inicio y navegación

## Objetivo

Modernizar la página de inicio y la navegación de ASANDA con una identidad editorial deportiva y acuática más clara, profesional y reconocible, sin cambiar el contenido, las rutas ni el sistema de publicidad existente.

La experiencia debe priorizar tres acciones: consultar resultados, revisar el calendario y descubrir noticias. Debe funcionar correctamente con teclado y en pantallas desde 320 px hasta 1440 px.

## Tecnología

- React 18 con componentes funcionales.
- React Router 6 para navegación.
- Tailwind CSS 3 para estilos.
- Lucide React para iconografía.
- Vite 5 para desarrollo y compilación.

## Comandos

- Desarrollo: `npm run dev`
- Compilación: `npm run build`
- Vista de producción: `npm run preview`

El proyecto no dispone actualmente de scripts de lint ni pruebas automatizadas. La verificación incluirá compilación y revisión manual en navegador.

## Estructura afectada

- `src/components/Header.jsx`: navegación de escritorio y móvil.
- `src/App.jsx`: composición de la página de inicio.
- `src/components/HeroBackground.jsx`: tratamiento visual del hero.
- `src/components/HeroStats.jsx`: indicadores y accesos destacados.
- `src/index.css`: fundamentos visuales, tipografía y movimiento.
- `tailwind.config.js`: tokens visuales, solo si son necesarios.

## Dirección visual y código

- Estética editorial deportiva inspirada en la señalización de competencias acuáticas.
- Azul profundo como color dominante, cian como acento funcional y blanco cálido como superficie.
- Tipografía condensada o de carácter deportivo para titulares, combinada con una sans legible para cuerpo.
- Jerarquía clara, bordes precisos y sombras contenidas; evitar tarjetas genéricas, exceso de redondeo y gradientes decorativos sin función.
- Componentes React enfocados, datos de navegación declarativos y elementos semánticos (`header`, `nav`, `main`, enlaces y botones reales).

## Comportamiento

- El encabezado permanece accesible durante el desplazamiento sin ocultar contenido.
- La ruta activa se identifica visualmente y mediante `aria-current="page"`.
- Los menús desplegables funcionan con ratón y teclado, exponen `aria-expanded` y se cierran al navegar, pulsar Escape o hacer clic fuera.
- El menú móvil tiene controles táctiles de al menos 44 x 44 px, bloquea interacciones ambiguas y se cierra al cambiar de ruta.
- Los enlaces de deportes no apuntan a rutas inexistentes. Si no existe destino funcional, se presentan como categorías informativas, no como navegación rota.
- El hero comunica qué es ASANDA y ofrece accesos visibles a Resultados y Calendario antes de las estadísticas.
- Toda animación respeta `prefers-reduced-motion`.

## Estrategia de verificación

- Ejecutar `npm run build` sin errores.
- Revisar Inicio y navegación en 320 px, 768 px, 1024 px y 1440 px.
- Recorrer todos los controles con teclado y comprobar foco visible.
- Verificar apertura y cierre de menús con Enter, Espacio y Escape.
- Confirmar que las rutas existentes y `/?ads=demo` conservan su comportamiento.
- Confirmar ausencia de desbordamiento horizontal y errores de consola.

## Límites

- Siempre: conservar contenido y rutas; usar Lucide; mantener accesibilidad y movimiento reducido; verificar móvil y escritorio.
- Consultar antes: agregar dependencias, reemplazar imágenes o logo, modificar el modelo publicitario, eliminar secciones del Inicio.
- Nunca: tocar la rama o los cambios parciales de PR2 Wiring; introducir datos personales; crear enlaces sin destino; romper `?ads=demo`.

## Criterios de éxito

1. La propuesta de valor de ASANDA y los accesos a Resultados y Calendario son visibles en el primer viewport.
2. La navegación muestra la ruta activa y no contiene destinos rotos.
3. Los menús son operables por teclado y táctiles en móvil.
4. El encabezado y el hero mantienen legibilidad y composición entre 320 px y 1440 px.
5. La compilación termina correctamente y las rutas existentes continúan funcionando.
6. El resultado conserva la identidad institucional sin apariencia de plantilla genérica.

## Fuera de alcance

- Rediseño interno de Noticias, Videos, Fotos, Resultados, Calendario o páginas de atletas.
- Integración de PR2 Wiring o cambios al sistema de publicidad.
- Backend, CMS, autenticación o nuevas fuentes de datos.
- Sustitución del logo institucional o del contenido editorial.
