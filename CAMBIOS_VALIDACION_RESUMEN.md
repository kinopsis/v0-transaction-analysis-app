# Resumen de Cambios: Validación de Integridad Datafonos-Transacciones

## Objetivo
Asegurar que el número de datáfono importado en la configuración (8 dígitos) corresponda exactamente con el "Código establecimiento" en los archivos CSV de transacciones, evitando inconsistencias e incoherencias en los datos.

---

## Cambios Realizados

### 1. **lib/data-utils.ts** - Función `importTransacciones()`

#### Antes:
- Las filas con "Código establecimiento" no registrado generaban advertencias (warnings)
- Las transacciones se importaban igualmente (soft validation)
- Retornaba: `{ transacciones, errors, duplicates, unregisteredCodes }`

#### Después:
- **Nueva validación crítica (VALIDATION 5):** Verifica que `Código establecimiento` sea exactamente un datáfono registrado
- **Filas no conformes son RECHAZADAS** y no se importan (hard validation)
- Mensaje de error explícito: *"El código de establecimiento 'XYZ' no corresponde a ningún datáfono registrado en Configuración → Datáfonos"*
- Retorna: `{ transacciones, errors, duplicates, unregisteredCodes, rejectedUnregistered }`
- **Nuevo contador:** `rejectedUnregistered: number` — filas totales rechazadas por esta validación

#### Código clave:
```typescript
// Build Map of registered datáfono codes for O(1) lookup
const registeredDatafonoMap = new Map(
  datafonos.map((d) => [d.codEstablecimiento, d])
);

// VALIDATION 5 — Check if código exists in registered datáfonos
if (!registeredDatafonoMap.has(codEstablecimiento)) {
  unregisteredSet.add(codEstablecimiento);
  rejectedUnregistered++;
  errors.push({
    fila,
    campo: "Código establecimiento",
    valor: codEstablecimiento,
    mensaje: `El código de establecimiento "${codEstablecimiento}" no corresponde 
              a ningún datáfono registrado en Configuración → Datáfonos...`
  });
  return; // ← SKIP THIS ROW (no se importa)
}
```

---

### 2. **components/dashboard/dashboard-tab.tsx** - Manejo de Importación

#### Antes:
- Mostraba warning si había códigos no registrados pero importaba igualmente
- Mensaje poco claro sobre la correspondencia datafono/código

#### Después:
- **Manejo de `rejectedUnregistered`** — nueva variable en el destructuring
- **Tres escenarios claros:**

  **Escenario A:** Importación exitosa (algunas filas pueden tener duplicados)
  ```
  ✓ 450 transacciones importadas correctamente
    · 5 duplicados ignorados
  ```

  **Escenario B:** Rechazo total (todos los datáfonos son desconocidos)
  ```
  ✗ No se importaron transacciones — todos los datáfonos son desconocidos
  
  Ningún "Código establecimiento" del archivo coincide con un datáfono 
  registrado en Configuración...
  ```

  **Escenario C:** Rechazo parcial (algunos datáfonos no registrados)
  ```
  ✓ 380 transacciones importadas correctamente
    · 70 filas rechazadas por datáfono no registrado
  
  ✗ ERROR: Los códigos de establecimiento: 13380092, 11112414
    no coinciden con ningún datáfono en Configuración...
  ```

#### Código clave:
```typescript
// Destructure new rejectedUnregistered field
const { transacciones, errors, duplicates, unregisteredCodes, rejectedUnregistered } 
  = await importTransacciones(...);

// Show error toast if unregistered codes exist
if (unregisteredCodes.length > 0) {
  toast.error(
    `${rejectedUnregistered} fila(s) rechazadas — datáfono no registrado`,
    {
      description: `Los códigos de establecimiento: ${sample}${extra} 
                    no coinciden con ningún datáfono en Configuración...`,
      duration: 10000,
    }
  );
}
```

---

### 3. **components/config/config-tab.tsx** - Registro de Datáfono

#### Antes:
- Validación básica del código (requerido, no duplicado)
- Sin validación estricta de 8 dígitos

#### Después:
- **Importa funciones de validación:** `validateCodEstablecimiento`, `normalizeCodEstablecimiento`
- **Validación estricta en `handleAddDatafono()`:**
  - Normaliza el código ingresado
  - Verifica que sea exactamente 8 dígitos numéricos
  - Rechaza si no cumple con error detallado
  
- **Mejoras en el formulario UI:**
  - Etiqueta mejorada: *"Cód. Establecimiento * (8 dígitos)"*
  - **Mensaje de ayuda explícito:**
    ```
    El "Cód. Establecimiento" es el número de datáfono (8 dígitos numéricos). 
    Debe coincidir exactamente con la columna "Código establecimiento" 
    en los archivos CSV de transacciones.
    ```
  - Input limitado a **8 caracteres máximo** (maxLength={8})
  - Input auto-filtra solo dígitos (remove non-numeric characters)

#### Código clave:
```typescript
// Normalize and validate
const codNormalized = normalizeCodEstablecimiento(newDatafono.codEstablecimiento);
if (!validateCodEstablecimiento(codNormalized)) {
  toast.error("Código de establecimiento inválido", {
    description: 
      "El número de datáfono debe ser exactamente 8 dígitos numéricos (ej: 12345678). " +
      "Este código debe coincidir con la columna 'Código establecimiento' " +
      "en los archivos de transacciones.",
  });
  return;
}

// Input field
<Input
  maxLength={8}
  value={newDatafono.codEstablecimiento}
  onChange={(e) =>
    setNewDatafono({
      ...newDatafono,
      codEstablecimiento: e.target.value.replace(/\D/g, "").slice(0, 8),
    })
  }
/>
```

---

## Flujo de Validación Completo

```
┌─────────────────────────────────────┐
│ Registro de Datáfono (Config)       │
├─────────────────────────────────────┤
│ • Cod. Establecimiento requerido    │
│ • Exactamente 8 dígitos numéricos   │
│ • Sin duplicados                    │
│ • Se normaliza automáticamente      │
│ ✓ Almacenado en store               │
└──────────────────┬──────────────────┘
                   │
        ┌──────────▼──────────┐
        │ Importar CSV con    │
        │ Transacciones       │
        └──────────┬──────────┘
                   │
  ┌────────────────▼─────────────────┐
  │ Validación 1: Nro dispositivo    │
  │ Validación 2: Código (8 dígitos) │
  │ Validación 3: Fecha (YYYYMMDD)   │
  │ Validación 4: Duplicados         │
  │ Validación 5: ← NUEVA            │
  │   ¿Código es datáfono registrado?│
  └────────────────┬─────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ✓ SÍ              ✗ NO (Nueva)
        │                     │
        ▼                     ▼
   IMPORTAR           RECHAZAR FILA
   TRANSACCIÓN      (No se importa)
```

---

## Ejemplo de Uso

### Paso 1: Configurar Datáfonos
```
Ir a: Configuración → Datáfonos
Agregar:
  Cód. Establecimiento: 13380092 ← Exactamente 8 dígitos
  Centro: Plaza Mayor
  ✓ Agregar
```

### Paso 2: Importar CSV
```
Archivo: 800077573-Febrero-2026.csv
Columna "Código establecimiento" contiene: 13380092, 11112414, 20025891

Si 13380092 y 11112414 están registrados pero 20025891 NO:
  ✓ Transacciones con 13380092 se importan
  ✓ Transacciones con 11112414 se importan
  ✗ Transacciones con 20025891 se RECHAZAN
  
Mensaje: "70 filas rechazadas — datáfono no registrado"
```

### Paso 3: Resolver (si hay rechazo)
```
Registrar el datáfono faltante:
  Cód. Establecimiento: 20025891
  Centro: Centro Norte
  ✓ Agregar

Reimportar CSV
  ✓ Todas las transacciones importadas correctamente
```

---

## Beneficios

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Integridad** | Débil (warnings) | Fuerte (hard validation) |
| **Correspondencia** | Advertencia silenciosa | Rechazo explícito con detalle |
| **Claridad** | Mensajes genéricos | Mensajes específicos y claros |
| **Feedback** | Poco detallado | Detallado con números y códigos |
| **UI/UX** | Sin guía visual | Instrucciones explícitas en formulario |
| **Datos** | Riesgo de inconsistencia | Garantía de consistencia |

---

## Ficheros Modificados

```
✏️ lib/data-utils.ts
   - Añadida Validación 5 (datafono check)
   - Nuevo campo retorno: rejectedUnregistered
   - Mensajes mejorados

✏️ components/dashboard/dashboard-tab.tsx
   - Manejo de rejectedUnregistered
   - Tres escenarios de feedback claros
   - Mensajes de error específicos

✏️ components/config/config-tab.tsx
   - Importación de funciones de validación
   - handleAddDatafono() mejorado
   - UI: limitador de 8 dígitos, filtrador numérico
   - Mensaje de ayuda visible

📄 VALIDACION_DATAFONOS_TRANSACCIONES.md
   - Documentación completa (nuevamente creado)

📄 CAMBIOS_VALIDACION_RESUMEN.md
   - Este archivo
```

---

## Testing

Para verificar que todo funciona correctamente:

### Test 1: Datáfono Registrado
1. Registra datáfono: `13380092`
2. Importa CSV con filas que contengan `13380092` en "Código establecimiento"
3. ✓ Esperado: Transacciones importadas

### Test 2: Datáfono NO Registrado
1. NO registres datáfono: `20025891`
2. Importa CSV con filas que contengan `20025891` en "Código establecimiento"
3. ✗ Esperado: Filas rechazadas, error: "código no corresponde a ningún datáfono"

### Test 3: Registro con Validación UI
1. Intenta registrar datáfono: `1234` (< 8 dígitos)
2. ✗ Esperado: Error "debe ser exactamente 8 dígitos"
3. Registra: `12345678` (8 dígitos)
4. ✓ Esperado: Datáfono registrado

### Test 4: Mezcla
1. Registra datáfonos: `13380092`, `11112414`
2. Importa CSV con: `13380092`, `11112414`, `99999999`
3. ✓ Esperado: 2 datáfonos importan, 1 rechazado

---

## Conclusión

Los cambios implementados cierran la brecha de validación entre la configuración de datáfonos y la importación de transacciones, garantizando que cada transacción corresponda a un datáfono registrado. El sistema ahora rechaza activamente (en lugar de advertir) las transacciones con datáfonos desconocidos, manteniendo la integridad referencial de los datos.
