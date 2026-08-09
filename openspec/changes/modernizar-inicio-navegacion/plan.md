# Plan de implementación: Inicio y navegación

## Enfoque

La entrega se realizará en tres incrementos visuales que mantendrán la aplicación compilable: fundamentos, navegación y hero. No se agregan dependencias ni se modifican páginas internas, datos o publicidad.

## Decisiones

- Mantener React Router y convertir la navegación existente en una configuración declarativa dentro de `Header.jsx`; no crear abstracciones adicionales para una sola cabecera.
- Sustituir los destinos deportivos rotos por información no navegable hasta que existan páginas reales.
- Usar una dirección editorial acuática: azul tinta, cian funcional, superficies claras, bordes precisos y tipografía con carácter deportivo.
- Conservar los componentes actuales del hero, pero reorganizar su jerarquía para presentar identidad y acciones antes que cifras.
- Verificar cada incremento con `npm run build`; la revisión visual final se hará en navegador porque el proyecto no tiene pruebas ni lint configurados.

## Tareas

### Tarea 1: Fundamentos visuales

**Descripción:** Definir tokens de color, tipografía, foco y utilidades compartidas para que Inicio y navegación tengan una base coherente.

**Aceptación:**
- [x] Existen colores y familias tipográficas con respaldo local seguro.
- [x] Todo control interactivo recibe foco visible.
- [x] El movimiento reducido continúa respetándose.

**Verificación:**
- [x] `npm run build`
- [x] Revisar que los estilos globales no alteren páginas internas de forma destructiva.

**Dependencias:** Ninguna.

**Archivos:** `src/index.css`, `tailwind.config.js`.

**Tamaño:** Pequeño.

### Tarea 2: Navegación accesible y responsive

**Descripción:** Reorganizar el encabezado para mejorar jerarquía, ruta activa, interacción de menús y experiencia móvil.

**Aceptación:**
- [x] Las rutas activas usan estado visual y `aria-current="page"`.
- [x] Dropdowns y menú móvil exponen su estado, cierran con Escape, clic externo, navegación y cambio de ruta.
- [x] No quedan enlaces deportivos hacia destinos inexistentes.
- [x] Los controles táctiles miden al menos 44 x 44 px y el logo conserva acceso al Inicio.

**Verificación:**
- [x] `npm run build`
- [x] Recorrer navegación con Tab, Enter, Espacio y Escape.
- [x] Revisar 320 px, 768 px, 1024 px y 1440 px.

**Dependencias:** Tarea 1.

**Archivos:** `src/components/Header.jsx`.

**Tamaño:** Mediano.

### Checkpoint 1

- [x] La aplicación compila.
- [x] Todas las rutas existentes siguen accesibles.
- [x] La navegación funciona con teclado y táctil.

### Tarea 3: Hero editorial orientado a acciones

**Descripción:** Reorganizar el primer viewport para explicar qué es ASANDA, priorizar Resultados y Calendario y presentar las estadísticas como evidencia secundaria.

**Aceptación:**
- [x] El hero contiene un único `h1`, descripción institucional y CTA a Resultados y Calendario.
- [x] Las acciones principales aparecen antes que las cifras en el orden visual y semántico.
- [x] La imagen mantiene contraste legible y carga con respaldo visual.
- [x] Las estadísticas conservan sus rutas y valores actuales sin animación invasiva.

**Verificación:**
- [x] `npm run build`
- [x] Revisar composición y ausencia de desbordamiento en los cuatro anchos objetivo.
- [x] Confirmar que `prefers-reduced-motion` evita movimiento no esencial.

**Dependencias:** Tarea 1.

**Archivos:** `src/App.jsx`, `src/components/HeroBackground.jsx`, `src/components/HeroStats.jsx`, `src/components/HeroSponsor.jsx` si requiere integración visual.

**Tamaño:** Mediano.

### Tarea 4: Integración y regresión

**Descripción:** Validar Inicio, navegación y contratos preservados; corregir únicamente defectos detectados dentro del alcance.

**Aceptación:**
- [x] Inicio funciona sin errores de consola ni desplazamiento horizontal.
- [x] `/?ads=demo` conserva la vista de publicidad demostrativa.
- [x] Todas las rutas declaradas en `App.jsx` continúan resolviendo.
- [x] Navegación y hero cumplen los criterios de la especificación.

**Verificación:**
- [x] `npm run build`
- [x] Navegación manual de rutas en navegador.
- [x] Comprobación responsive en 320 px, 768 px, 1024 px y 1440 px.

**Dependencias:** Tareas 2 y 3.

**Archivos:** Solo los archivos anteriores si aparece una regresión dentro del alcance.

**Tamaño:** Pequeño.

### Checkpoint final

- [x] Todos los criterios de éxito de `spec.md` están demostrados.
- [x] El diff no incluye PR2 Wiring, datos, páginas internas ni cambios en la lógica publicitaria.
- [x] La entrega está lista para revisión.

## Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| El `Header` actual concentra demasiado estado | Medio | Simplificar estados y centralizar cierres sin extraer una arquitectura innecesaria |
| La imagen remota del hero falla o tarda | Medio | Mantener fondo de respaldo y reservar el espacio |
| Cambios globales alteran páginas internas | Alto | Limitar tokens globales y revisar rutas representativas |
| El encabezado ocupa demasiado espacio móvil | Alto | Priorizar marca y botón de menú; mover contenido secundario al panel |

## Orden

Las tareas se ejecutarán de forma secuencial: `1 -> 2 -> 3 -> 4`. Navegación y hero comparten fundamentos visuales, por lo que paralelizarlas aumentaría el riesgo de estilos inconsistentes.
