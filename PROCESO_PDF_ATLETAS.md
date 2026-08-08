# 📄 Proceso: Extraer Datos del PDF y Cargar Atletas

## 🎯 Objetivo
Extraer datos de atletas desde PDFs de clubes y cargarlos automáticamente en la web.

---

## 📋 Estructura del PDF

Según tu descripción, el PDF tiene:
- **Columna "ID"**: Cédula del atleta (usar para nombre de foto)
- **Columna "Team 1"**: Nombre del club
- **Datos hasta la columna "ID"**: Solo tomar información hasta esa columna
- **Tipo**: Federados (en este caso)

---

## 🔄 PROCESO PASO A PASO

### Paso 1: Extraer Datos del PDF

#### Opción A: Copiar Tabla del PDF

1. **Abrir el PDF** (Feveda_CCE.pdf)
2. **Seleccionar toda la tabla** (Ctrl+A o seleccionar manualmente)
3. **Copiar** (Ctrl+C)
4. **Pegar en un archivo de texto** o directamente aquí

#### Opción B: Convertir PDF a Excel/CSV

1. Usar herramienta online: https://www.ilovepdf.com/pdf-to-excel
2. O Adobe Acrobat (si tienes)
3. Exportar a Excel
4. Copiar los datos

---

## 📝 FORMATO PARA ENVIARME LOS DATOS

### Formato Simple (Recomendado):

Copia y pega la tabla del PDF tal cual, o usa este formato:

```
CLUB: [Nombre del Team 1]
TIPO: Federado

[Pega aquí la tabla del PDF con las columnas hasta ID]
```

### Ejemplo de lo que espero:

```
CLUB: Club Deportivo Acuático
TIPO: Federado

ID          | Nombre          | Fecha Nac | Género | Categoría | ...
V-12345678  | Juan Pérez      | 15/03/08  | M      | Juvenil A | ...
V-87654321  | María López     | 22/07/09  | F      | Juvenil B | ...
V-11223344  | Carlos Rodríguez| 10/11/10  | M      | Infantil A| ...
```

**O simplemente pega la tabla completa del PDF tal cual está.**

---

## 🔧 LO QUE YO HARÉ

1. **Extraer los datos** del formato que me envíes
2. **Identificar:**
   - ID (cédula) → Usar para nombre de foto
   - Team 1 → Nombre del club
   - Nombre completo
   - Fecha de nacimiento
   - Género
   - Categoría
   - Otros datos disponibles hasta la columna ID

3. **Generar código JavaScript:**
```javascript
{
  id: 31,
  nombre: "Juan Pérez",
  cedula: "V-12345678",  // Del campo ID
  club: "Club Deportivo Acuático",  // Del campo Team 1
  categoria: "Juvenil A",
  genero: "Masculino",
  fechaNacimiento: "15/03/2008",
  disciplina: ["Nadar"],  // Por defecto, puedes especificar
  foto: "/fotos/atletas/club-deportivo-acuatico/V-12345678.jpg",  // Usa el ID
  tipo: "federado"
}
```

4. **Agregar al archivo** `src/data/atletas.js`
5. **Actualizar** el template si es necesario

---

## 📸 MANEJO DE FOTOS

### Proceso:

1. **Las fotos se nombrarán con el ID (cédula):**
   - Si ID es `V-12345678` → Foto: `V-12345678.jpg`
   - Si ID es `12345678` → Foto: `12345678.jpg`

2. **Ruta de la foto:**
   ```
   /fotos/atletas/[nombre-club]/[ID].jpg
   ```

3. **Estructura de carpetas:**
   ```
   public/
     fotos/
       atletas/
         club-deportivo-acuatico/
           V-12345678.jpg
           V-87654321.jpg
           ...
   ```

---

## ✅ EJEMPLO COMPLETO

### Tú me envías:

```
CLUB: Club Deportivo Acuático
TIPO: Federado

ID          | Nombre          | Fecha Nac | Género | Categoría
V-12345678  | Juan Pérez      | 15/03/08  | M      | Juvenil A
V-87654321  | María López     | 22/07/09  | F      | Juvenil B
V-11223344  | Carlos Rodríguez| 10/11/10  | M      | Infantil A
```

### Yo genero:

```javascript
// Agregado a src/data/atletas.js
{
  id: 31,
  nombre: "Juan Pérez",
  cedula: "V-12345678",
  club: "Club Deportivo Acuático",
  categoria: "Juvenil A",
  sexo: "Masculino",
  genero: "Masculino",
  fechaNacimiento: "15/03/2008",
  disciplina: ["Nadar"],
  foto: "/fotos/atletas/club-deportivo-acuatico/V-12345678.jpg",
  tipo: "federado"
},
{
  id: 32,
  nombre: "María López",
  cedula: "V-87654321",
  club: "Club Deportivo Acuático",
  categoria: "Juvenil B",
  sexo: "Femenino",
  genero: "Femenino",
  fechaNacimiento: "22/07/2009",
  disciplina: ["Nadar"],
  foto: "/fotos/atletas/club-deportivo-acuatico/V-87654321.jpg",
  tipo: "federado"
},
{
  id: 33,
  nombre: "Carlos Rodríguez",
  cedula: "V-11223344",
  club: "Club Deportivo Acuático",
  categoria: "Infantil A",
  sexo: "Masculino",
  genero: "Masculino",
  fechaNacimiento: "10/11/2010",
  disciplina: ["Nadar"],
  foto: "/fotos/atletas/club-deportivo-acuatico/V-11223344.jpg",
  tipo: "federado"
}
```

---

## 📋 CHECKLIST

Antes de enviarme el PDF o datos:

- [ ] Identificar el nombre del club (Team 1)
- [ ] Confirmar el tipo (Federado/Asociado)
- [ ] Extraer datos hasta la columna ID
- [ ] Verificar que las cédulas (ID) estén completas
- [ ] Copiar la tabla completa o los datos relevantes

---

## 🚀 PROCESO RÁPIDO

1. **Abre el PDF** (Feveda_CCE.pdf)
2. **Copia la tabla** (Ctrl+A, Ctrl+C)
3. **Pégala aquí** con este formato:

```
CLUB: [Nombre del Team 1]
TIPO: Federado

[Pega la tabla aquí]
```

4. **Yo proceso todo** y actualizo el código
5. **Resultado:** Atletas agregados automáticamente

---

## 💡 TIPS

- **Si el PDF tiene muchas páginas:** Envía página por página o todo junto
- **Si faltan datos:** Yo los completaré con valores por defecto
- **Si el formato es diferente:** Envíame el PDF o una captura y lo adapto
- **Para las fotos:** Asegúrate de tener las fotos nombradas con el ID (cédula)

---

## 📝 NOTAS IMPORTANTES

1. **Solo datos hasta la columna ID:** No necesito información después de esa columna
2. **Team 1 = Club:** Usaré ese valor como nombre del club
3. **ID = Cédula:** Se usará para el nombre de la foto
4. **Tipo:** Federado (en este caso, pero puede variar)

---

¿Listo para empezar? Solo envíame el PDF o los datos extraídos y yo los proceso! 🚀

