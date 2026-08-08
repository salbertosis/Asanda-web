# 📸 Estructura de Fotos

## 📁 Organización de Carpetas

```
public/
  fotos/
    atletas/
      club-deportivo-acuatico/
        V-12345678.jpg
        V-87654321.jpg
        ...
      aqua-sports/
        V-11223344.jpg
        ...
      nadadores-elite/
        ...
    clubes/
      club-deportivo-acuatico-logo.jpg
      aqua-sports-logo.jpg
      ...
```

## 📝 Convenciones de Nombres

### Para Atletas:
- **Formato recomendado:** `V-[cédula].jpg`
- Ejemplo: `V-12345678.jpg`
- Alternativa: `[cédula].jpg` (sin la V)

### Para Clubes:
- **Formato:** `[nombre-club]-logo.jpg`
- Ejemplo: `club-deportivo-acuatico-logo.jpg`

## 🖼️ Especificaciones de Fotos

### Tamaño Recomendado:
- **Atletas:** 400x400px (cuadrada)
- **Clubes:** 200x200px (cuadrada)

### Formato:
- **Recomendado:** JPG (menor tamaño)
- **Alternativa:** PNG (si necesitas transparencia)

### Calidad:
- **Atletas:** 80-90% de calidad
- **Peso máximo:** 200 KB por foto

## 📋 Proceso de Carga

1. **Organizar fotos por club** en carpetas separadas
2. **Nombrar con la cédula** del atleta
3. **Subir a esta carpeta** (`public/fotos/atletas/[nombre-club]/`)
4. **Las rutas en el código serán:**
   ```javascript
   foto: "/fotos/atletas/club-deportivo-acuatico/V-12345678.jpg"
   ```

## 🔗 URLs Finales

Una vez desplegado, las fotos estarán disponibles en:
- `https://tu-dominio.com/fotos/atletas/club-deportivo-acuatico/V-12345678.jpg`

## ⚠️ Notas Importantes

- Los nombres de las carpetas deben coincidir con los nombres de los clubes en `clubes.js`
- Usa nombres en minúsculas y con guiones (kebab-case)
- Ejemplo: "Club Deportivo Acuático" → carpeta: `club-deportivo-acuatico`

