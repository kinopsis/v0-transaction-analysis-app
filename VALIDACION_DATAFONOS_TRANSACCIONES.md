# Validación de Integridad: Datafonos y Transacciones

## Regla Fundamental

**El número de datáfono registrado en Configuración → Datáfonos DEBE coincidir exactamente con el "Código establecimiento" de la columna correspondiente en los archivos CSV de transacciones.**

Ambos campos son identificadores idénticos de **exactamente 8 dígitos numéricos**.

---

## Estructura de Datos

### Configuración → Datáfonos
- **Campo:** `codEstablecimiento`
- **Formato:** 8 dígitos numéricos (ej: `13380092`)
- **Significado:** Identificador único del datáfono y del establecimiento
- **Rango válido:** `00000000` a `99999999`

### Transacciones (CSV)
- **Columna:** `Código establecimiento` (columna 17)
- **Formato:** 8 dígitos numéricos
- **Significado:** DEBE coincidir exactamente con el `codEstablecimiento` de un datáfono registrado
- **Nota importante:** Esta columna es DISTINTA de `Nro dispositivo`
  - `Nro dispositivo`: alphanumeric terminal identifier (ej: `000BFNZC`, `00104036`)
  - `Código establecimiento`: 8 dígitos numéricos del datáfono (ej: `13380092`)

---

## Flujo de Validación

### 1. Registro de Datáfono (Configuración)

Cuando registras un datáfono en **Configuración → Agregar Datáfono**:

**Validaciones aplicadas:**
- ✓ El campo "Cód. Establecimiento" es requerido
- ✓ Debe ser exactamente 8 dígitos numéricos
- ✓ No puede ser duplicado (ya existe en la base de datos)
- ✓ Se normaliza automáticamente (espacios removidos, ceros iniciales preservados)

**Mensaje de error si falla:**
```
Código de establecimiento inválido
El número de datáfono debe ser exactamente 8 dígitos numéricos (ej: 12345678). 
Este código debe coincidir con la columna 'Código establecimiento' en los 
archivos de transacciones.
```

**Ejemplo válido:**
```
Centro: Centro Comercial Plaza Mayor
Cód. Establecimiento: 13380092  ✓
```

---

### 2. Importación de Transacciones

Cuando importas un archivo CSV de transacciones en **Dashboard**:

**Validaciones aplicadas (en orden):**

#### Validación 1: Nro dispositivo (alphanumeric)
- Campo requerido
- Sin validación de formato (puede ser alfanumérico)
- Ejemplo válido: `000BFNZC`, `00104036`

#### Validación 2: Código establecimiento (8 dígitos)
- Campo requerido
- Debe ser exactamente 8 dígitos numéricos
- Se normaliza automáticamente (espacios removidos)
- **Error si falla:**
  ```
  Código de establecimiento inválido — debe ser exactamente 8 dígitos numéricos
  ```

#### Validación 3: Fecha (YYYYMMDD)
- Formato requerido: YYYYMMDD (ej: `20260210`)
- **Error si falla:**
  ```
  Formato de fecha inválido (esperado: YYYYMMDD)
  ```

#### Validación 4: Duplicados (Cod. Autorización + Fecha)
- Composite key: `codAutorizacion|fecha`
- Valida contra transacciones previamente importadas
- Filas duplicadas se ignoran silenciosamente (contadas en `duplicates`)

#### Validación 5: Correspondencia Datafono (**CRÍTICA**)
- El `Código establecimiento` (8 dígitos) DEBE estar registrado en Configuración → Datáfonos
- Esta es una **validación de integridad referencial**
- **Filas que fallan esta validación son RECHAZADAS y NO se importan**
- **Error si falla:**
  ```
  El código de establecimiento "XXXXXXXX" no corresponde a ningún datáfono 
  registrado en Configuración → Datáfonos. El número de datáfono en la 
  configuración debe coincidir exactamente con este código (8 dígitos).
  ```

---

## Reportes de Importación

Después de intentar importar un archivo, recibiras un resumen con estos contadores:

| Métrica | Significado |
|---------|------------|
| `transacciones.length` | Filas importadas exitosamente (todas las validaciones pasaron) |
| `errors.length` | Filas rechazadas por errores de formato (validaciones 1-4) |
| `duplicates` | Filas descartadas por ser duplicadas (validación 4) |
| `rejectedUnregistered` | Filas rechazadas por datáfono no registrado (validación 5) |
| `unregisteredCodes` | Array de códigos únicos que no tienen datáfono registrado |

### Escenarios de Importación

#### Escenario 1: Importación Exitosa
```
✓ 450 transacciones importadas correctamente
  · 5 duplicados ignorados
```
- Todas las filas pasaron todas las validaciones
- 5 filas eran duplicadas (se ignoraron)
- 450 filas se importaron

#### Escenario 2: Datáfono No Registrado (Validación 5 Falla)
```
✗ No se importaron transacciones — todos los datáfonos son desconocidos
  
Ningún "Código establecimiento" del archivo coincide con un datáfono 
registrado en Configuración. Registra los datáfonos con los códigos:
13380092, 11112414, ... (exactamente 8 dígitos, igual al "Código 
establecimiento" del CSV).
```
- Todas las filas fueron rechazadas por correspondencia datafono
- Debes registrar los datáfonos que faltan en Configuración
- Luego reintentar la importación

#### Escenario 3: Mezcla de Éxitos y Fallos
```
✓ 380 transacciones importadas correctamente
  · 70 filas rechazadas por datáfono no registrado
  
Los códigos de establecimiento: 13380092, 11112414 no coinciden con 
ningún datáfono en Configuración → Datáfonos.
```
- 380 filas se importaron (datáfonos eran válidos)
- 70 filas se rechazaron (datáfonos no registrados)
- Registra los datáfonos faltantes y reimporta solo esas filas

---

## Checklist de Integridad

Antes de importar transacciones, verifica:

- [ ] **Datáfonos registrados:** Todas las entradas de datáfono están registradas en Configuración → Datáfonos
- [ ] **Códigos de 8 dígitos:** Todos los números de datáfono en config son exactamente 8 dígitos numéricos
- [ ] **CSV correcto:** El archivo CSV contiene la columna "Código establecimiento" (columna 17)
- [ ] **Correspondencia exacta:** Cada "Código establecimiento" del CSV coincide exactamente con un datáfono en config
  - ✓ Ejemplo: Si en config existe datáfono `13380092`, el CSV debe tener exactamente `13380092` (sin espacios, sin caracteres adicionales)
- [ ] **Formato de fecha:** Todas las fechas en el CSV están en formato YYYYMMDD (ej: `20260210`)

---

## Ejemplos Práticos

### Ejemplo 1: Importación Correcta

**Configuración → Datáfonos registrados:**
```
Datáfono 1: 13380092 (Centro: Plaza Mayor)
Datáfono 2: 11112414 (Centro: Centro Sur)
Datáfono 3: 20025891 (Centro: Centro Norte)
```

**Archivo CSV (fragmento):**
```
...
"13380092","000BFNZC","20260210",...  ✓ Datáfono registrado
"11112414","00104036","20260211",...  ✓ Datáfono registrado
"20025891","000ABC12","20260212",...  ✓ Datáfono registrado
```

**Resultado:** ✓ Todas las transacciones importadas exitosamente

---

### Ejemplo 2: Datáfono No Registrado

**Configuración → Datáfonos registrados:**
```
Datáfono 1: 13380092 (Centro: Plaza Mayor)
Datáfono 2: 11112414 (Centro: Centro Sur)
```

**Archivo CSV (fragmento):**
```
"13380092","000BFNZC","20260210",...  ✓ Registrado
"11112414","00104036","20260211",...  ✓ Registrado
"20025891","000ABC12","20260212",...  ✗ NO REGISTRADO → FILA RECHAZADA
"99999999","000DEF34","20260213",...  ✗ NO REGISTRADO → FILA RECHAZADA
```

**Resultado:**
```
✗ 2 transacciones importadas (filas 1-2)
  · 2 filas rechazadas por datáfono no registrado (filas 3-4)
  
Debes registrar en Configuración:
- Datáfono 20025891
- Datáfono 99999999
```

**Acción requerida:**
1. Ir a Configuración → Agregar Datáfono
2. Registrar `20025891` con su centro correspondiente
3. Registrar `99999999` con su centro correspondiente
4. Reimportar el archivo

---

### Ejemplo 3: Diferenciación Nro dispositivo vs Código establecimiento

**Conceptos importantes:**
- `Nro dispositivo` = Terminal identifier (alphanumeric)
  - Ej: `000BFNZC`, `00104036`
  - Puede variar entre transacciones del mismo datáfono
  - NO se valida contra configuración
  
- `Código establecimiento` = Datafono identifier (8 digits numeric)
  - Ej: `13380092`, `11112414`
  - DEBE estar registrado en Configuración
  - Cada datáfono tiene exactamente uno

**Ejemplo de CSV:**
```
Nro dispositivo | Código establecimiento | Descripción
000BFNZC       | 13380092               | Trans 1
000BFNZC       | 13380092               | Trans 2  (mismo dispositivo, mismo datáfono)
00104036       | 13380092               | Trans 3  (diferente dispositivo, mismo datáfono)
000ABC12       | 11112414               | Trans 4  (diferente dispositivo, diferente datáfono)
```

Todas estas transacciones son válidas porque ambos datáfonos (`13380092` y `11112414`) están registrados.

---

## Resolución de Problemas

### Problema 1: "El código de establecimiento XYZ no corresponde a ningún datáfono"

**Causa:** El código del CSV no está registrado en Configuración → Datáfonos

**Solución:**
1. Abre Configuración → Agregar Datáfono
2. Ingresa exactamente el código que aparece en el error (ej: `13380092`)
3. Selecciona el centro comercial correspondiente
4. Haz clic en "Agregar"
5. Reimporta el archivo

---

### Problema 2: "El código debe ser exactamente 8 dígitos numéricos"

**Causa:** El datáfono ingresado no tiene exactamente 8 dígitos o contiene caracteres no numéricos

**Solución:**
1. Verifica el número en tu documentación
2. Asegúrate que sea exactamente 8 dígitos (ej: `01234567`, NO `1234567`)
3. Sin espacios, sin letras, sin símbolos especiales
4. Reintenta ingresar el datáfono

---

### Problema 3: "Este código de establecimiento ya está registrado"

**Causa:** El datáfono ya existe en la configuración

**Solución:**
1. Verifica que el código sea correcto
2. Si ya existe, no necesitas registrarlo de nuevo
3. Asegúrate que el CSV use exactamente ese código

---

## Referencia de Código

### Funciones de Validación (lib/data-utils.ts)

```typescript
// Valida que sea exactamente 8 dígitos numéricos
export function validateCodEstablecimiento(code: string): boolean

// Normaliza: remove spaces, pad to 8 digits
export function normalizeCodEstablecimiento(code: string): string
```

### Retorno de importTransacciones

```typescript
{
  transacciones: Transaccion[];      // Filas importadas exitosamente
  errors: ImportError[];              // Filas rechazadas con detalles
  duplicates: number;                 // Filas descartadas por duplicado
  unregisteredCodes: string[];        // Array único de códigos no registrados
  rejectedUnregistered: number;       // Total de filas rechazadas por datafono
}
```

---

## Conclusión

Esta validación garantiza que **toda transacción importada corresponde a un datáfono registrado**, manteniendo la integridad referencial del sistema y previniendo datos inconsistentes. El proceso es automático y transparente: recibiras retroalimentación clara sobre qué se importó, qué se rechazó, y por qué.
