# Guía de Iconos Gratuitos para Deportes Acuáticos

## 📍 Ubicaciones Actuales en el Código

Los iconos de deportes se usan en:
- `src/components/SportsNavBar.jsx` - Barra de navegación de deportes
- `src/components/Header.jsx` - Menú desplegable de deportes
- `src/components/CompetitionsCalendar.jsx` - Filtros de deportes

## 🎯 Deportes Necesarios

1. **NADAR** (Swim/Natación)
2. **WATERPOLO**
3. **BUCEO** (Diving)
4. **NATACIÓN ARTÍSTICA** (Artistic Swimming/Synchronized Swimming)
5. **NATACIÓN EN AGUAS ABIERTAS** (Open Water Swimming)
6. **SALTO DE ALTA GAMA** (High Diving)

---

## ✅ Opción 1: Lucide React (Ya Instalado - GRATIS)

### Ventajas:
- ✅ Ya está instalado en el proyecto
- ✅ Sin dependencias adicionales
- ✅ Iconos vectoriales SVG
- ✅ Totalmente gratuito
- ✅ Consistente con el diseño actual

### Iconos Disponibles:
```javascript
// Iconos que podrían funcionar:
import { 
  Waves,           // Para natación (actual)
  UsersRound,      // Para waterpolo (actual)
  Droplet,         // Para aguas abiertas (actual)
  Activity,        // Alternativa para natación
  Fish,            // Para aguas abiertas
  Water,           // Para agua en general
  Zap,             // Para velocidad/natación
  Target,          // Para precisión/buceo
  Sparkles,        // Para natación artística
  TrendingUp       // Para rendimiento
} from 'lucide-react';
```

### Limitaciones:
- ❌ No tiene iconos específicos de buceo, natación artística o salto de alta gama
- ⚠️ Los iconos actuales son genéricos

### Enlaces:
- Documentación: https://lucide.dev/icons/
- Buscar "swimming", "water", "dive": https://lucide.dev/icons/

---

## ✅ Opción 2: Flaticon (GRATIS con Atribución)

### Ventajas:
- ✅ Gran variedad de iconos específicos
- ✅ Estilo similar a la imagen mostrada
- ✅ Formatos SVG y PNG
- ✅ Gratis con atribución al autor

### Búsquedas Recomendadas:

1. **NADAR (Swim)**
   - https://www.flaticon.com/search?word=swimming
   - https://www.flaticon.com/search?word=natacion
   - Palabras clave: "swimming", "swimmer", "natación", "nadador"

2. **WATERPOLO**
   - https://www.flaticon.com/search?word=waterpolo
   - Palabras clave: "water polo", "waterpolo"

3. **BUCEO (Diving)**
   - https://www.flaticon.com/search?word=diving
   - https://www.flaticon.com/search?word=buceo
   - Palabras clave: "diving", "scuba", "buceo", "snorkel"

4. **NATACIÓN ARTÍSTICA**
   - https://www.flaticon.com/search?word=synchronized%20swimming
   - https://www.flaticon.com/search?word=natacion%20artistica
   - Palabras clave: "synchronized swimming", "artistic swimming", "natación artística"

5. **AGUAS ABIERTAS**
   - https://www.flaticon.com/search?word=open%20water
   - https://www.flaticon.com/search?word=aguas%20abiertas
   - Palabras clave: "open water", "open water swimming"

6. **SALTO DE ALTA GAMA**
   - https://www.flaticon.com/search?word=high%20diving
   - https://www.flaticon.com/search?word=cliff%20diving
   - Palabras clave: "high diving", "cliff diving", "salto"

### Cómo Usar:
1. Buscar el icono en Flaticon
2. Descargar en formato SVG
3. Guardar en `src/assets/icons/`
4. Importar como componente React o usar directamente

### Ejemplo de Implementación:
```jsx
// Crear archivo: src/assets/icons/SwimmingIcon.jsx
import React from 'react';

const SwimmingIcon = ({ size = 24, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      className={className}
      fill="none" 
      stroke="currentColor"
    >
      {/* SVG path del icono descargado */}
    </svg>
  );
};

export default SwimmingIcon;
```

### Atribución Requerida:
- Debes incluir: "Iconos diseñados por [Autor] from Flaticon"
- O usar la versión Premium (de pago) sin atribución

---

## ✅ Opción 3: Icons8 (GRATIS con Atribución)

### Ventajas:
- ✅ Estilo moderno y profesional
- ✅ Gran variedad de estilos (outline, filled, etc.)
- ✅ Formatos SVG, PNG, PDF
- ✅ Gratis con atribución

### Búsquedas Directas:

1. **NADAR**
   - https://icons8.com/icons/set/swimming
   - https://icons8.com/icons/set/swimmer

2. **WATERPOLO**
   - https://icons8.com/icons/set/water-polo

3. **BUCEO**
   - https://icons8.com/icons/set/diving
   - https://icons8.com/icons/set/scuba-diving

4. **NATACIÓN ARTÍSTICA**
   - https://icons8.com/icons/set/synchronized-swimming

5. **AGUAS ABIERTAS**
   - https://icons8.com/icons/set/open-water

6. **SALTO DE ALTA GAMA**
   - https://icons8.com/icons/set/cliff-diving

### Cómo Usar:
1. Buscar el icono
2. Seleccionar estilo (outline recomendado)
3. Descargar SVG
4. Usar igual que Flaticon

---

## ✅ Opción 4: Heroicons (GRATIS - Sin Atribución)

### Ventajas:
- ✅ Totalmente gratuito
- ✅ Sin atribución requerida
- ✅ Estilo minimalista
- ✅ Muy popular en React

### Limitaciones:
- ❌ No tiene iconos específicos de deportes acuáticos
- ⚠️ Solo iconos genéricos

### Instalación:
```bash
npm install @heroicons/react
```

### Uso:
```jsx
import { UserIcon, BeakerIcon } from '@heroicons/react/24/outline'
```

### Enlaces:
- https://heroicons.com/
- No tiene iconos específicos de natación

---

## ✅ Opción 5: Font Awesome (GRATIS - Versión Free)

### Ventajas:
- ✅ Tiene algunos iconos de deportes acuáticos
- ✅ Muy conocido
- ✅ Versión gratuita disponible

### Instalación:
```bash
npm install @fortawesome/fontawesome-free
# O para React:
npm install @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons
```

### Iconos Disponibles:
- `fa-swimmer` - Nadador
- `fa-water` - Agua
- `fa-swimming-pool` - Piscina

### Limitaciones:
- ❌ No tiene iconos específicos de waterpolo, buceo, natación artística
- ⚠️ Estilo diferente al mostrado en la imagen

### Enlaces:
- https://fontawesome.com/icons
- Buscar: "swimming", "water", "diving"

---

## ✅ Opción 6: Iconos SVG Personalizados (GRATIS)

### Crear Iconos Propios:

1. **Usar Figma** (Gratis)
   - Crear iconos personalizados
   - Exportar como SVG
   - Total control del diseño

2. **Usar Inkscape** (Gratis)
   - Software de diseño vectorial
   - Crear iconos desde cero

3. **Usar Canva** (Versión gratuita)
   - Plantillas de iconos
   - Exportar SVG

---

## 📋 Recomendación Final

### Para Implementación Rápida:
1. **Usar Flaticon o Icons8** para descargar iconos SVG específicos
2. **Guardar en `src/assets/icons/`**
3. **Crear componentes React** para cada icono
4. **Reemplazar los iconos actuales** en `SportsNavBar.jsx` y `Header.jsx`

### Estructura Recomendada:
```
src/
  assets/
    icons/
      SwimmingIcon.jsx
      WaterpoloIcon.jsx
      DivingIcon.jsx
      ArtisticSwimmingIcon.jsx
      OpenWaterIcon.jsx
      HighDivingIcon.jsx
```

### Ejemplo de Componente:
```jsx
// src/assets/icons/SwimmingIcon.jsx
import React from 'react';

const SwimmingIcon = ({ size = 18, className = "", color = "currentColor" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      className={className}
      fill="none" 
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Contenido SVG del icono descargado */}
    </svg>
  );
};

export default SwimmingIcon;
```

---

## 🔗 Enlaces Útiles

### Flaticon:
- Búsqueda general: https://www.flaticon.com/
- Búsqueda "swimming": https://www.flaticon.com/search?word=swimming
- Búsqueda "waterpolo": https://www.flaticon.com/search?word=waterpolo
- Búsqueda "diving": https://www.flaticon.com/search?word=diving

### Icons8:
- Búsqueda "swimming": https://icons8.com/icons/set/swimming
- Búsqueda "water polo": https://icons8.com/icons/set/water-polo
- Búsqueda "diving": https://icons8.com/icons/set/diving

### Lucide React:
- Todos los iconos: https://lucide.dev/icons/
- Buscar: https://lucide.dev/icons/ (usar búsqueda interna)

---

## ⚠️ Consideraciones de Licencia

1. **Flaticon**: Requiere atribución (texto pequeño al pie de página)
2. **Icons8**: Requiere atribución o versión premium
3. **Lucide React**: MIT License - Sin atribución
4. **Heroicons**: MIT License - Sin atribución
5. **Font Awesome Free**: Requiere atribución

---

## 📝 Pasos para Implementar

1. **Elegir fuente de iconos** (Recomendado: Flaticon o Icons8)
2. **Descargar 6 iconos SVG** (uno por deporte)
3. **Crear carpeta `src/assets/icons/`**
4. **Crear componentes React** para cada icono
5. **Reemplazar iconos** en `SportsNavBar.jsx` y `Header.jsx`
6. **Agregar deportes faltantes** (Buceo, Natación Artística, Salto de Alta Gama)
7. **Probar en la web**

---

## 🎨 Estilo de Iconos Recomendado

Basado en la imagen mostrada:
- **Color**: Azul claro (#60A5FA o similar)
- **Estilo**: Outline (contorno)
- **Tamaño**: 18-24px
- **Forma**: Simple y reconocible
- **Fondo**: Transparente

---

¿Quieres que implemente alguna de estas opciones en el código?

