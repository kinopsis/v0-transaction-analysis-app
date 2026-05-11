# Validación Exhaustiva del Menú de Remanentes

## Descripción General

El sistema de **importación de Remanentes** ha sido completamente revisado y actualizado para soportar la funcionalidad de importación de datos con validaciones exhaustivas, manejo robusto de errores, y una interfaz intuitiva.

Esta guía documenta todas las validaciones implementadas, los casos de uso soportados, y las mejores prácticas para importar datos de remanentes.

---

## 1. Estructura de Datos Actualizada

### Tipo `Remanente` (Ampliado)

```typescript
export interface Remanente {
  id: string;                          // UUID único
  monto: number;                       // Monto original (calculado)
  tarjeta: string;                     // Número de tarjeta (16 dígitos)
  saldoFinal: number;                  // Saldo final de la tarjeta
  estado: string;                      // Estado: "Remanente por solicitar", "Vendida", etc.
  saldoNoDevuelto: number;             // Monto no devuelto
  fechaVenta: string;                  // Fecha de venta (YYYY-MM-DD)
  fechaVencimiento: string;            // Fecha de vencimiento (YYYY-MM-DD)
  fechaVencimientoMasUno: string;      // Fecha de vencimiento +1 día (YYYY-MM-DD)
  reposicion: boolean;                 // ¿Es reposición?
  idOrigen: string;                    // ID único de origen (clave de deduplicación)
  subtipo: string;                     // Clasificación
  saldo: string;                       // Saldo actual con símbolo de moneda
  archivoId: string;                   // Referencia al archivo importado
}
```

### Estados Soportados

```typescript
const REMANENTE_ESTADOS = [
  "Remanente por solicitar",
  "Vendida",
  "Solicitado",
  "Pagado",
  "Cancelado",
] as const;
```

---

## 2. Validaciones Implementadas

### 2.1 Validación de Tarjeta (Campo: "# Tarjeta")

**Regla:** El número de tarjeta debe ser exactamente **16 dígitos numéricos**.

```
✓ VÁLIDO:   4532123456789010
✓ VÁLIDO:   5425233010103010
✗ INVÁLIDO: 1234567890        (10 dígitos)
✗ INVÁLIDO: 453212345678901a  (contiene letra)
```

**Error Generado:**
```
Fila N: El número de tarjeta "XXXX" no es válido (debe ser 16 dígitos numéricos)
```

### 2.2 Validación de ID Origen (Campo: "Id")

**Regla:** El ID de origen es **obligatorio** y debe ser una cadena no vacía.

```
✓ VÁLIDO:   ABC123456
✓ VÁLIDO:   12345
✗ INVÁLIDO: (vacío)
```

**Error Generado:**
```
Fila N: El ID de origen es requerido
```

### 2.3 Validación de Fecha Venta (Campo: "Fecha Venta")

**Regla:** La fecha debe estar en formato **YYYY-MM-DD**, **DD/MM/YYYY**, o **YYYYMMDD**.

```
✓ VÁLIDO:   2024-04-13
✓ VÁLIDO:   13/04/2024
✓ VÁLIDO:   20240413
✗ INVÁLIDO: 13-04-2024  (formato incorrecto)
✗ INVÁLIDO: 2024/13/04  (mes/día inválidos)
```

**Error Generado:**
```
Fila N: La fecha de venta "XXXX" no es válida (esperado: YYYY-MM-DD)
```

### 2.4 Validación de Fecha Vencimiento (Campo: "Fecha Vencimiento")

**Regla:** Igual a Fecha Venta — debe estar en formato **YYYY-MM-DD**, **DD/MM/YYYY**, o **YYYYMMDD**.

**Error Generado:**
```
Fila N: La fecha de vencimiento "XXXX" no es válida (esperado: YYYY-MM-DD)
```

### 2.5 Validación de Estado (Campo: "Estado")

**Regla:** El estado es **obligatorio** y debe ser una cadena no vacía.

```
✓ VÁLIDO:   Remanente por solicitar
✓ VÁLIDO:   Vendida
✓ VÁLIDO:   Solicitado
✗ INVÁLIDO: (vacío)
```

**Error Generado:**
```
Fila N: El estado es requerido
```

### 2.6 Detección de Duplicados (Composición: tarjeta + idOrigen)

**Regla:** Cada combinación de **tarjeta + idOrigen** debe ser única. Las filas con combinaciones duplicadas dentro del archivo o respecto a importaciones previas son **ignoradas**.

```
Archivo actual:
Fila 2: Tarjeta=4532123456789010, ID=ABC123  ✓ Importada
Fila 3: Tarjeta=4532123456789010, ID=ABC123  ✗ Duplicado (ignorado)
Fila 4: Tarjeta=5425233010103010, ID=ABC123  ✓ Importada (diferente tarjeta)

Base de datos existente:
        Tarjeta=4532123456789010, ID=ABC123  ✓ Ya existe

Nuevas filas:
Fila 2: Tarjeta=4532123456789010, ID=ABC123  ✗ Duplicado (ignorado)
```

---

## 3. Transformación de Datos (Parsing)

### 3.1 Parsing de Moneda

La función `parseCurrencyValue()` soporta múltiples formatos de moneda:

```
Entrada                    → Valor Numérico
"100.000,00"              → 100000.00   (formato europeo)
"$ 100,000.00"            → 100000.00   (formato US)
"$ -"                     → 0           (valor negativo/nulo)
"19,210.00 "              → 19210.00    (con espacios)
"100000"                  → 100000.00   (numérico puro)
```

### 3.2 Parsing de Fechas

La función `parseDateFlexible()` soporta múltiples formatos:

```
Entrada              → Fecha Normalizada
"2024-04-13"        → "2024-04-13"      (ISO)
"13/04/2024"        → "2024-04-13"      (DD/MM/YYYY)
"20240413"          → "2024-04-13"      (YYYYMMDD)
```

### 3.3 Parsing de Booleanos (Reposición)

```
Entrada         → Booleano
"Sí"           → true
"sí"           → true
"yes"          → true
"1"            → true
"No"           → false
"no"           → false
""             → false
```

---

## 4. Flujo de Importación Completo

### 4.1 Estructura del Proceso

```
1. Usuario selecciona archivo CSV
2. Sistema valida y procesa cada fila
   ├─ Validación básica (formato de campos)
   ├─ Validación de negocio (duplicados, correspondencia)
   └─ Transformación de datos (parsing, normalización)
3. Resultado:
   ├─ Remanentes importados ✓
   ├─ Filas rechazadas ✗
   ├─ Duplicados ignorados ⚠
   └─ Resumen estadístico 📊
```

### 4.2 Estados de Componentes durante Importación

**ANTES de iniciar importación:**
- Botón "Cargar archivo" → **HABILITADO**
- Tabla de remanentes → Muestra datos existentes
- Indicador de progreso → **NO visible**

**DURANTE importación:**
- Botón "Cargar archivo" → **DESHABILITADO**
- Indicador de progreso → **VISIBLE** (muestra % de progreso)
- Tabla → **DESHABILITADA** (no se puede interactuar)
- Mensaje de estado → "Importando X de Y filas..."

**DESPUÉS de importación exitosa:**
- Botón "Cargar archivo" → **HABILITADO**
- Tabla → **HABILITADA** con nuevos datos
- Toast de éxito → Verde con resumen de importación
- Indicador de progreso → **OCULTO**

**DESPUÉS de importación con errores:**
- Botón "Cargar archivo" → **HABILITADO**
- Toast de error → Rojo con lista de errores específicos
- Tabla → Muestra solo datos válidos importados
- Usuarios pueden revisar errores y reintentar

---

## 5. Mensajes de Retroalimentación

### 5.1 Caso: Importación Exitosa

```
Toast: "125 remanentes importados correctamente"
Descripción: "50 por solicitar · 40 vendidas · 35 otros estados · 3 duplicados ignorados"
```

### 5.2 Caso: Importación Parcial (con Duplicados)

```
Toast: "90 remanentes importados correctamente"
Descripción: "35 duplicados ignorados"

Toast (advertencia): "35 registros duplicados omitidos"
Descripción: "Combinación de tarjeta + ID ya existe en el sistema"
```

### 5.3 Caso: Importación con Errores de Validación

```
Toast (error): "No se importaron 45 remanentes — errores de validación"
Descripción: "
  Fila 2: # Tarjeta — El número de tarjeta "1234567890" no es válido (debe ser 16 dígitos)
  Fila 5: Fecha Venta — La fecha "13-04-2024" no es válida
  Fila 8: Estado — El estado es requerido
  ... (y 3 errores más)
"
```

### 5.4 Caso: Importación Vacía

```
Toast (advertencia): "El archivo no contiene datos válidos"
Descripción: "Verifica que el CSV tenga al menos una fila de datos"
```

---

## 6. Mapeo de Columnas CSV → Campos

| Columna CSV | Campo Interno | Validación | Requerido |
|-------------|---------------|-----------|----------|
| Monto | monto (calculado) | - | No |
| # Tarjeta | tarjeta | 16 dígitos | **Sí** |
| Saldo Final | saldoFinal | Moneda | No |
| Estado | estado | No vacío | **Sí** |
| Saldo no devuelto | saldoNoDevuelto | Moneda | No |
| Fecha Venta | fechaVenta | YYYY-MM-DD | **Sí** |
| Fecha Vencimiento | fechaVencimiento | YYYY-MM-DD | **Sí** |
| Fecha Vencimiento (+1 día) | fechaVencimientoMasUno | YYYY-MM-DD | No |
| Reposición? | reposicion | Booleano | No |
| Id | idOrigen | No vacío | **Sí** |
| Subtipo | subtipo | Cadena | No |
| Saldo | saldo | Moneda | No |

---

## 7. Tabla de Remanentes — Columnas Mostradas

La tabla interactiva muestra:

1. **Tarjeta** → Últimos 4 dígitos (ej: `****9010`)
2. **Estado** → Estado actual
3. **Saldo Final** → Formateado como moneda
4. **Saldo No Devuelto** → Formateado como moneda
5. **Fecha Venta** → YYYY-MM-DD
6. **Fecha Vencimiento** → YYYY-MM-DD
7. **ID Origen** → Identificador único
8. **Subtipo** → Clasificación
9. **Saldo Actual** → Formateado o "—" si es 0

**Funcionalidades de Tabla:**
- Ordenamiento por cualquier columna
- Búsqueda por estado, ID origen, o tarjeta
- Exportación a Excel (con todos los campos)
- Exportación a PDF (con resumen estadístico)
- Eliminación de filas individuales

---

## 8. Resumen Estadístico Post-Importación

Después de cada importación, se muestra:

```
┌─────────────────────────────────────────┐
│ RESUMEN DE IMPORTACIÓN                  │
├─────────────────────────────────────────┤
│ Total de filas en archivo:  125         │
│ Remanentes importados:      90          │
│ Errores de validación:      35          │
│ Duplicados ignorados:       0           │
│                                          │
│ Distribución de estados:                │
│ • Por solicitar:   45                   │
│ • Vendidas:        35                   │
│ • Otros estados:   10                   │
└─────────────────────────────────────────┘
```

---

## 9. Checklist de Validación Exhaustiva

### Antes de Importar

- [ ] Archivo CSV tiene encabezados correctos
- [ ] Números de tarjeta son 16 dígitos (sin espacios ni caracteres especiales)
- [ ] IDs de origen son únicos en el archivo
- [ ] Fechas están en formato YYYY-MM-DD, DD/MM/YYYY, o YYYYMMDD
- [ ] Estados no están vacíos
- [ ] Valores de moneda están correctamente formateados

### Durante Importación

- [ ] Indicador de progreso se muestra y actualiza
- [ ] Botón "Cargar archivo" está deshabilitado
- [ ] Tabla está deshabilitada (no se puede interactuar)
- [ ] Mensajes de estado informan progreso

### Después de Importación

- [ ] Toast muestra resultado final (éxito, error, o advertencia)
- [ ] Descripción específica indica cantidad importada, duplicados, errores
- [ ] Tabla se actualiza con nuevos datos
- [ ] Resumen estadístico muestra distribución por estado
- [ ] Botón "Cargar archivo" vuelve a habilitarse
- [ ] Usuarios pueden descargar o exportar datos

### Casos de Error

- [ ] Tarjeta inválida → Error específico con formato esperado
- [ ] ID origen vacío → Error específico
- [ ] Fecha inválida → Error con ejemplo de formato correcto
- [ ] Estado vacío → Error específico
- [ ] Duplicado → Fila ignorada, contador de duplicados incrementado
- [ ] Archivo vacío → Mensaje informativo sin errores "hard"

---

## 10. Mejores Prácticas para Importación

1. **Preparar el archivo CSV:**
   - Usar encabezados exactos (máy., mayúsculas/minúsculas flexible)
   - Validar que números de tarjeta tengan 16 dígitos
   - Asegurar que IDs de origen sean únicos
   - Formatear fechas en YYYY-MM-DD o DD/MM/YYYY

2. **Revisar antes de importar:**
   - Hacer una importación de prueba con pocas filas
   - Revisar errores y corregir el archivo
   - Reimportar con el archivo corregido

3. **Monitorear la importación:**
   - Observar el indicador de progreso
   - Revisar toast de resultado
   - Leer el resumen estadístico
   - Verificar duplicados ignorados

4. **Post-importación:**
   - Revisar datos en la tabla
   - Usar filtros para validar estados
   - Exportar a Excel para auditoría
   - Archivar el archivo original

---

## 11. Ejemplos de Archivos CSV Válidos

### Ejemplo 1: Formato Completo

```csv
# Tarjeta,Estado,Saldo Final,Saldo no devuelto,Fecha Venta,Fecha Vencimiento,Fecha Vencimiento (+1 día),Reposición?,Id,Subtipo,Saldo
4532123456789010,Remanente por solicitar,100.000,50.000,2024-04-13,2024-12-31,2025-01-01,No,ABC123,Mastercard,$ 100.00
5425233010103010,Vendida,0,0,2024-04-10,2024-12-25,2024-12-26,Sí,ABC124,Visa,$ 0.00
```

### Ejemplo 2: Formato Flexible (Fechas DD/MM/YYYY)

```csv
# Tarjeta,Estado,Saldo Final,Saldo no devuelto,Fecha Venta,Fecha Vencimiento,Id,Subtipo
4532123456789010,Remanente por solicitar,100000,50000,13/04/2024,31/12/2024,ABC123,Mastercard
5425233010103010,Vendida,0,0,10/04/2024,25/12/2024,ABC124,Visa
```

---

## 12. Preguntas Frecuentes (FAQ)

**P: ¿Qué pasa si importo el mismo archivo dos veces?**
R: Los remanentes duplicados (misma tarjeta + ID origen) serán ignorados. El contador de duplicados incrementará.

**P: ¿Puedo cambiar el formato de las fechas?**
R: Sí, el sistema soporta YYYY-MM-DD, DD/MM/YYYY, y YYYYMMDD.

**P: ¿Qué formato de moneda se espera?**
R: El sistema es flexible y soporta "100.000,00", "$ 100,000.00", o valores numéricos puros.

**P: ¿Puedo eliminar remanentes después de importar?**
R: Sí, cada fila en la tabla tiene un botón de eliminar.

**P: ¿Se pueden exportar los datos después de importar?**
R: Sí, hay opciones para exportar a Excel (todos los campos) o PDF (con resumen).

---

## 13. Contacto y Soporte

Para reportar errores o sugerencias de mejora en la importación de remanentes, consulta la documentación de soporte del sistema.

---

**Última actualización:** Mayo 2026
**Versión del sistema:** 2.0.0
