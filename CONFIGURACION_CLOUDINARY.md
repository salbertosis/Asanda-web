# ☁️ Configuración de Cloudinary para Fotos

## 🎯 Objetivo
Almacenar todas las fotos de atletas en Cloudinary (CDN) para mejor rendimiento y no aumentar el tamaño del repositorio.

---

## 📋 PASO 1: Crear Cuenta en Cloudinary

1. **Ir a:** https://cloudinary.com
2. **Crear cuenta gratuita** (hasta 25 GB)
3. **Obtener credenciales:**
   - Cloud Name (ej: `dxyz123abc`)
   - API Key
   - API Secret

---

## 🔧 PASO 2: Configurar en el Proyecto

### Actualizar `src/config/cloudinary.js`:

```javascript
export const CLOUDINARY_CONFIG = {
  cloudName: 'tu-cloud-name', // ← Reemplazar con tu Cloud Name
  baseUrl: 'https://res.cloudinary.com',
  folder: 'asanda/atletas'
};
```

**Ejemplo:**
```javascript
export const CLOUDINARY_CONFIG = {
  cloudName: 'dxyz123abc', // Tu Cloud Name real
  baseUrl: 'https://res.cloudinary.com',
  folder: 'asanda/atletas'
};
```

---

## 📤 PASO 3: Subir Fotos a Cloudinary

### Opción A: Dashboard Web (Recomendado para empezar)

1. **Ir al Dashboard de Cloudinary**
2. **Clic en "Media Library"**
3. **Crear carpeta:** `asanda/atletas/cce/`
4. **Subir fotos:**
   - `33895827.jpg`
   - `33895840.jpg`
   - `35003581.jpg`

### Opción B: Subida Masiva (Para muchos archivos)

1. **Usar el Upload Widget** de Cloudinary
2. **O usar la API** con un script

---

## 📝 PASO 4: Estructura en Cloudinary

```
asanda/
  └── atletas/
      ├── cce/
      │   ├── 33895827.jpg
      │   ├── 33895840.jpg
      │   └── 35003581.jpg
      ├── club-deportivo-acuatico/
      │   ├── V-12345678.jpg
      │   └── V-87654321.jpg
      └── aqua-sports/
          └── ...
```

---

## 🔗 FORMATO DE URLs

Las URLs generadas tendrán este formato:

```
https://res.cloudinary.com/[tu-cloud-name]/image/upload/w_400,h_400,c_fill,q_auto,f_auto/asanda/atletas/cce/33895827.jpg
```

**Parámetros:**
- `w_400`: Ancho 400px
- `h_400`: Alto 400px
- `c_fill`: Recortar y llenar
- `q_auto`: Calidad automática
- `f_auto`: Formato automático (WebP si es compatible)

---

## ✅ VENTAJAS

- ✅ **CDN Global:** Carga rápida desde cualquier lugar
- ✅ **Optimización Automática:** WebP, compresión, etc.
- ✅ **No afecta el repositorio:** Git no se hace pesado
- ✅ **Escalable:** Hasta 25 GB gratis
- ✅ **Transformaciones:** Redimensionar, recortar, etc. en la URL

---

## 📋 CHECKLIST

- [ ] Crear cuenta en Cloudinary
- [ ] Obtener Cloud Name
- [ ] Actualizar `src/config/cloudinary.js` con tu Cloud Name
- [ ] Crear carpeta `asanda/atletas/` en Cloudinary
- [ ] Subir fotos organizadas por club
- [ ] Verificar que las URLs funcionen

---

## 🚀 PRÓXIMOS PASOS

1. **Configurar Cloudinary** con tu Cloud Name
2. **Subir las fotos** de los atletas del CCE
3. **Actualizar las URLs** en el código (ya están preparadas)
4. **Probar** que las fotos se muestren correctamente

---

## 💡 NOTA IMPORTANTE

**Las URLs en el código ya están preparadas** con el formato de Cloudinary. Solo necesitas:

1. Reemplazar `tu-cloud-name` con tu Cloud Name real
2. Subir las fotos a Cloudinary en la estructura correcta
3. ¡Listo! Las fotos se mostrarán automáticamente

---

¿Ya tienes cuenta de Cloudinary? Si no, te ayudo a configurarla.

