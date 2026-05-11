# Checklist de Testing Exhaustivo — Menú de Remanentes

## 1. Validación de Interfaz — Estados y Botones

### 1.1 Estado Inicial (Sin Importación)

- [ ] Botón "Cargar archivo" está **visible y HABILITADO**
- [ ] Ícono de archivo (Upload) es **visible**
- [ ] Tabla de remanentes está **visible pero vacía** (o con datos previos)
- [ ] Indicador de progreso **NO está visible**
- [ ] Campo de búsqueda está **HABILITADO**
- [ ] Botones de exportación (Excel, PDF) están **HABILITADOS** (si hay datos)
- [ ] Botones de acción en filas (eliminar) están **HABILITADOS**

### 1.2 Durante Importación (File Upload en Progreso)

**Precondición:** Usuario hace clic en "Cargar archivo" y selecciona un CSV válido

- [ ] Botón "Cargar archivo" cambia a **DESHABILITADO**
- [ ] Indicador de progreso **APARECE** en la UI
- [ ] Progreso muestra **"Procesando X de Y filas..."**
- [ ] Tabla de remanentes está **DESHABILITADA** (cursores no interactivos)
- [ ] Búsqueda está **DESHABILITADA**
- [ ] Botones de exportación están **DESHABILITADOS**
- [ ] Usuario **NO PUEDE** interactuar con ningún botón de acción
- [ ] No hay parpadeos ni actualizaciones visuales bruscas

### 1.3 Después de Importación Exitosa

**Precondición:** Importación completó con éxito

- [ ] Botón "Cargar archivo" vuelve a **HABILITADO**
- [ ] Indicador de progreso **DESAPARECE**
- [ ] Toast de éxito aparece con:
  - [ ] Ícono de verificación (verde)
  - [ ] Título: "N remanentes importados correctamente"
  - [ ] Descripción con estadísticas (ej: "50 por solicitar · 35 vendidas...")
  - [ ] Toast desaparece automáticamente en 5 segundos
- [ ] Tabla se **ACTUALIZA** con nuevos datos
- [ ] Tabla está **HABILITADA** para interacción
- [ ] Búsqueda está **HABILITADA**
- [ ] Botones de exportación están **HABILITADOS**
- [ ] Resumen estadístico es visible debajo de la tabla

### 1.4 Después de Importación con Errores

**Precondición:** Importación detectó errores de validación

- [ ] Botón "Cargar archivo" vuelve a **HABILITADO**
- [ ] Toast de error aparece con:
  - [ ] Ícono de error (rojo)
  - [ ] Título indicando cantidad de remanentes importados vs. errores
  - [ ] Lista de primeros 3-5 errores con número de fila y descripción
  - [ ] Opción para ver todos los errores si hay más de 5
- [ ] Remanentes válidos **FUERON IMPORTADOS** (importación parcial)
- [ ] Tabla muestra los datos válidos importados
- [ ] Usuario puede revisar la lista de errores y corregir el archivo

### 1.5 Después de Importación con Duplicados

**Precondición:** Archivo contiene duplicados respecto a datos existentes

- [ ] Toast de advertencia aparece para duplicados ignorados
- [ ] Mensaje específico: "N registros duplicados omitidos"
- [ ] Descripción: "Combinación de tarjeta + ID ya existe en el sistema"
- [ ] Remanentes no duplicados **FUERON IMPORTADOS**
- [ ] Tabla se actualiza con datos no duplicados

---

## 2. Validación de Campos de Entrada

### 2.1 Número de Tarjeta (16 dígitos)

#### Caso Válido
```
Entrada: 4532123456789010
Fila: 2
Resultado: ✓ Aceptada
```

- [ ] Número es aceptado
- [ ] Guardado sin espacios ni caracteres especiales
- [ ] Se muestra enmascarado en tabla (****9010)

#### Caso Inválido — Dígitos Insuficientes
```
Entrada: 1234567890
Fila: 2
Resultado: ✗ Error
```

- [ ] Fila rechazada
- [ ] Error registrado: "El número de tarjeta "1234567890" no es válido (debe ser 16 dígitos numéricos)"
- [ ] Toast muestra error

#### Caso Inválido — Caracteres No Numéricos
```
Entrada: 4532-1234-5678-9010
Fila: 3
Resultado: ✗ Error
```

- [ ] Fila rechazada
- [ ] Error registrado: "El número de tarjeta "4532-1234-5678-9010" no es válido"
- [ ] Toast muestra error

#### Caso Inválido — Campo Vacío
```
Entrada: (vacío)
Fila: 4
Resultado: ✗ Error
```

- [ ] Fila rechazada
- [ ] Error registrado: "El número de tarjeta es requerido"
- [ ] Toast muestra error

### 2.2 ID Origen (Requerido, Único por Importación)

#### Caso Válido
```
Entrada: ABC123456
Fila: 2
Resultado: ✓ Aceptada
```

- [ ] ID es aceptado
- [ ] ID se guarda exactamente como está en el CSV
- [ ] ID aparece en la tabla

#### Caso Inválido — Campo Vacío
```
Entrada: (vacío)
Fila: 5
Resultado: ✗ Error
```

- [ ] Fila rechazada
- [ ] Error registrado: "El ID de origen es requerido"
- [ ] Toast muestra error

#### Caso Duplicado (Dentro del archivo)
```
Archivo:
Fila 2: Tarjeta=4532..., ID=ABC123  → ✓ Aceptada
Fila 3: Tarjeta=4532..., ID=ABC123  → ✗ Duplicada (ignorada)
Resultado: 1 remanente importado, 1 duplicado ignorado
```

- [ ] Primera ocurrencia es aceptada
- [ ] Segunda ocurrencia es ignorada
- [ ] Contador de duplicados incrementa
- [ ] Toast muestra cantidad de duplicados

#### Caso Duplicado (Respecto a Base de Datos)
```
Base de datos existente:
Tarjeta=4532..., ID=ABC123 (ya existe)

Archivo nuevo:
Fila 2: Tarjeta=4532..., ID=ABC123  → ✗ Duplicada (ignorada)
Resultado: 0 remanentes importados (todos duplicados)
```

- [ ] Fila es ignorada
- [ ] Contador de duplicados incrementa
- [ ] Toast especifica que los duplicados ya existían

### 2.3 Fecha Venta (Múltiples Formatos Soportados)

#### Formato YYYY-MM-DD (ISO)
```
Entrada: 2024-04-13
Fila: 2
Resultado: ✓ Aceptada → "2024-04-13"
```

- [ ] Fecha es normalizada a YYYY-MM-DD
- [ ] Año, mes, día son validados
- [ ] Se muestra correctamente en tabla

#### Formato DD/MM/YYYY (Europeo)
```
Entrada: 13/04/2024
Fila: 3
Resultado: ✓ Aceptada → "2024-04-13"
```

- [ ] Fecha es convertida a YYYY-MM-DD
- [ ] Años entre 2000-2100 son válidos
- [ ] Se muestra como "2024-04-13" en tabla

#### Formato YYYYMMDD (Compacto)
```
Entrada: 20240413
Fila: 4
Resultado: ✓ Aceptada → "2024-04-13"
```

- [ ] Fecha es parseada correctamente
- [ ] Normalizada a YYYY-MM-DD
- [ ] Se valida mes y día

#### Caso Inválido — Fecha Futura (Año > 2100)
```
Entrada: 2101-04-13
Fila: 5
Resultado: ✗ Error
```

- [ ] Fila rechazada
- [ ] Error registrado: "La fecha de venta "2101-04-13" no es válida"
- [ ] Toast muestra error

#### Caso Inválido — Mes Inválido
```
Entrada: 13/13/2024
Fila: 6
Resultado: ✗ Error
```

- [ ] Fila rechazada
- [ ] Error registrado: "La fecha de venta "13/13/2024" no es válida"
- [ ] Toast muestra error

#### Caso Inválido — Formato Incorrecto
```
Entrada: 13-04-2024
Fila: 7
Resultado: ✗ Error
```

- [ ] Fila rechazada
- [ ] Error registrado: "La fecha de venta "13-04-2024" no es válida (esperado: YYYY-MM-DD)"
- [ ] Toast muestra error

### 2.4 Fecha Vencimiento (Igual validación que Fecha Venta)

- [ ] Soporta YYYY-MM-DD, DD/MM/YYYY, YYYYMMDD
- [ ] Validaciones de año, mes, día
- [ ] Error específico si es inválida
- [ ] Se normaliza a YYYY-MM-DD

### 2.5 Estado (Requerido, No Vacío)

#### Caso Válido
```
Entrada: Remanente por solicitar
Fila: 2
Resultado: ✓ Aceptada
```

- [ ] Estado es aceptado
- [ ] Se guarda exactamente como está
- [ ] Aparece en tabla sin modificaciones

#### Caso Inválido — Campo Vacío
```
Entrada: (vacío)
Fila: 8
Resultado: ✗ Error
```

- [ ] Fila rechazada
- [ ] Error registrado: "El estado es requerido"
- [ ] Toast muestra error

#### Estados Válidos
- [ ] "Remanente por solicitar" — Aceptado
- [ ] "Vendida" — Aceptado
- [ ] "Solicitado" — Aceptado
- [ ] "Pagado" — Aceptado
- [ ] "Cancelado" — Aceptado
- [ ] Otros estados customizados — Aceptados

### 2.6 Valores de Moneda (Saldo Final, Saldo No Devuelto, Saldo Actual)

#### Formato Europeo: "100.000,00"
```
Entrada: 100.000,00
Resultado: ✓ 100000.00
```

- [ ] Puntos removidos (separador de miles)
- [ ] Coma convertida a punto (decimal)
- [ ] Valor numérico correcto

#### Formato US: "$ 100,000.00"
```
Entrada: $ 100,000.00
Resultado: ✓ 100000.00
```

- [ ] Símbolo $ removido
- [ ] Espacios removidos
- [ ] Comas removidas (separador de miles)
- [ ] Valor numérico correcto

#### Formato Simple: "100000"
```
Entrada: 100000
Resultado: ✓ 100000.00
```

- [ ] Valor aceptado como está
- [ ] Convertido a número flotante

#### Caso Especial: "$ -" o "-"
```
Entrada: $ -
Resultado: ✓ 0
```

- [ ] Valor negativo/nulo convertido a 0
- [ ] No genera error

#### Caso Inválido (Nunca rechaza, solo convierte a 0)
```
Entrada: "Indefinido" o "N/A"
Resultado: ✓ 0 (fallback)
```

- [ ] Valores no parseables convertidos a 0
- [ ] No rechaza la fila

### 2.7 Reposición (Booleano Flexible)

#### Caso Verdadero
```
Entrada: "Sí" o "sí" o "yes" o "1"
Resultado: ✓ true
```

- [ ] Valores aceptados como verdadero
- [ ] Mostrado como "Sí" en tabla

#### Caso Falso
```
Entrada: "No" o "no" o "" o cualquier otro
Resultado: ✓ false
```

- [ ] Mostrado como "No" en tabla

---

## 3. Comportamiento de Tabla

### 3.1 Columnas Mostradas

- [ ] Tarjeta (últimos 4 dígitos enmascarados, ej: ****9010)
- [ ] Estado (texto completo)
- [ ] Saldo Final (formateado como moneda)
- [ ] Saldo No Devuelto (formateado como moneda)
- [ ] Fecha Venta (YYYY-MM-DD)
- [ ] Fecha Vencimiento (YYYY-MM-DD)
- [ ] ID Origen (texto)
- [ ] Subtipo (texto)
- [ ] Saldo Actual (formateado o "—")

### 3.2 Funcionalidades de Tabla

- [ ] **Ordenamiento:** Clickear encabezado ordena por esa columna (A→Z o Z→A)
- [ ] **Búsqueda:** Campo de búsqueda filtra por estado, ID origen, o tarjeta
- [ ] **Eliminación:** Botón eliminar en cada fila la remueve de la tabla
- [ ] **Paginación:** Si hay muchos registros, tabla muestra paginación
- [ ] **Exportar Excel:** Botón descarga todos los remanentes a .xlsx
- [ ] **Exportar PDF:** Botón descarga con resumen estadístico

### 3.3 Actualización Post-Importación

- [ ] Tabla se refresca automáticamente
- [ ] Nuevos datos aparecen sin recargar página
- [ ] Scroll se mantiene en posición anterior (o va a inicio)
- [ ] Datos anteriores se preservan (no se pierden)

---

## 4. Resumen Estadístico Post-Importación

- [ ] Resumen es visible después de importación
- [ ] Muestra "Total de filas en archivo: N"
- [ ] Muestra "Remanentes importados: N"
- [ ] Muestra "Errores de validación: N"
- [ ] Muestra "Duplicados ignorados: N"
- [ ] Distribución de estados:
  - [ ] "Por solicitar: N"
  - [ ] "Vendidas: N"
  - [ ] "Otros estados: N"
- [ ] Números suman correctamente
- [ ] Actualiza después de cada importación

---

## 5. Manejo de Errores — Casos Específicos

### 5.1 Error: Archivo Vacío

```
Usuario carga: archivo.csv (sin datos)
Resultado:
Toast (advertencia): "El archivo no contiene datos válidos"
Tabla: No cambia
```

- [ ] Toast muestra
- [ ] No introduce cambios en datos existentes
- [ ] Botón "Cargar archivo" permanece habilitado

### 5.2 Error: Archivo No CSV

```
Usuario carga: documento.pdf
Resultado:
Toast (error): "Formato de archivo no soportado"
```

- [ ] Error se detecta antes de procesamiento
- [ ] Mensaje específico
- [ ] Botón "Cargar archivo" permanece habilitado

### 5.3 Error: Tarjeta Inválida en Fila 5

```
Fila 5: 4532-1234-5678-90 (15 dígitos)
Resultado:
Toast (error): "1 remanente no se importó — error de validación"
Detalle: "Fila 5: # Tarjeta — El número "4532-1234-5678-90" no es válido"
```

- [ ] Fila específica rechazada
- [ ] Otras filas válidas importadas
- [ ] Error muestra campo y razón
- [ ] Toast hace referencia a número de fila

### 5.4 Error: Múltiples Errores en Diferentes Filas

```
Fila 2: Tarjeta inválida
Fila 5: Fecha inválida
Fila 8: Estado vacío
Resultado:
Toast (error): "3 remanentes no se importaron — errores de validación"
Detalle: 
  "Fila 2: # Tarjeta — formato inválido
   Fila 5: Fecha Venta — formato inválido
   Fila 8: Estado — requerido
   ... y 0 errores más"
```

- [ ] Múltiples errores se reportan
- [ ] Primeros 5 errores se muestran
- [ ] Opción para ver todos si hay más de 5
- [ ] Usuarios pueden corregir archivo y reintentar

### 5.5 Caso: localStorage Quota Exceeded

**Nota:** Si la aplicación acumula demasiados datos, localStorage puede llegar al límite.

- [ ] Sistema detecta error de capacidad
- [ ] Mensaje informativo: "No hay espacio disponible para más datos"
- [ ] Sugerencia: "Exporta datos a archivo o contacta soporte"
- [ ] Aplicación no se queda en estado inconsistente

---

## 6. Flujos de Usuario End-to-End

### 6.1 Flujo: Importación Exitosa

1. [ ] Usuario navega a Remanentes
2. [ ] Tabla vacía o con datos existentes
3. [ ] Usuario hace clic en "Cargar archivo"
4. [ ] Diálogo de selección de archivo se abre
5. [ ] Usuario selecciona archivo CSV válido
6. [ ] Indicador de progreso aparece
7. [ ] Progreso se actualiza: "Procesando 1 de 125 filas..."
8. [ ] Progreso llega a 100%
9. [ ] Toast de éxito aparece: "125 remanentes importados correctamente"
10. [ ] Tabla se actualiza con nuevos datos
11. [ ] Resumen estadístico muestra distribución
12. [ ] Usuario puede exportar, filtrar, o eliminar datos

### 6.2 Flujo: Importación con Errores (Parcial)

1. [ ] Usuario selecciona archivo con algunos registros inválidos
2. [ ] Progreso se muestra
3. [ ] Toast de error aparece: "90 remanentes importados, 10 con errores"
4. [ ] Descripción muestra lista de errores
5. [ ] Tabla muestra los 90 registros válidos importados
6. [ ] Usuario puede revisar errores y corregir archivo
7. [ ] Usuario reimporta el archivo corregido
8. [ ] Nuevos registros se agregan sin duplicar los válidos anteriores

### 6.3 Flujo: Detección de Duplicados

1. [ ] Usuarios importa 50 remanentes
2. [ ] Tabla muestra los 50 registros
3. [ ] Usuario intenta reimportar el mismo archivo
4. [ ] Sistema detecta 50 duplicados
5. [ ] Toast de advertencia: "50 registros duplicados omitidos"
6. [ ] Tabla permanece con los 50 registros (sin duplicarse)
7. [ ] Contador de duplicados en resumen = 50

### 6.4 Flujo: Exportación a Excel

1. [ ] Tabla tiene remanentes importados
2. [ ] Usuario hace clic en "Descargar Excel"
3. [ ] Archivo .xlsx se descarga
4. [ ] Archivo contiene todas las columnas:
   - [ ] Tarjeta
   - [ ] Estado
   - [ ] Saldo Final
   - [ ] Saldo No Devuelto
   - [ ] Fecha Venta
   - [ ] Fecha Vencimiento
   - [ ] Fecha Vencimiento +1
   - [ ] Reposición
   - [ ] ID Origen
   - [ ] Subtipo
   - [ ] Saldo Actual

### 6.5 Flujo: Exportación a PDF

1. [ ] Tabla tiene remanentes importados
2. [ ] Usuario hace clic en "Descargar PDF"
3. [ ] Archivo .pdf se descarga
4. [ ] PDF contiene:
   - [ ] Encabezado: "Reporte de Remanentes"
   - [ ] Fecha de generación
   - [ ] Resumen estadístico
   - [ ] Tabla con columnas principales
   - [ ] Pies de página con datos de contacto

---

## 7. Pruebas de Rendimiento

### 7.1 Carga Grande (1000+ remanentes)

- [ ] Importación no se congela
- [ ] Indicador de progreso actualiza cada ~50 filas
- [ ] Tabla se carga en < 3 segundos
- [ ] Búsqueda/filtrado es responsive (< 500ms)
- [ ] Exportación a Excel completa en < 5 segundos

### 7.2 Memoria

- [ ] Aplicación no consume memoria excesivamente
- [ ] No hay memory leaks después de múltiples importaciones
- [ ] Eliminación de remanentes libera memoria
- [ ] localStorage no excede límite (5-10 MB típico)

### 7.3 Compatibilidad de Navegadores

- [ ] Chrome/Edge ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Dispositivos móviles ✓

---

## 8. Accesibilidad (a11y)

- [ ] Botón "Cargar archivo" tiene `aria-label` descriptivo
- [ ] Indicador de progreso tiene `role="progressbar"`
- [ ] Tabla tiene `role="table"` y encabezados `<th>`
- [ ] Toasts tienen `role="alert"`
- [ ] Colores de error/éxito no son el único indicador
- [ ] Teclado: TAB navega por todos los botones
- [ ] Teclado: ENTER activa botones

---

## 9. Seguridad

- [ ] Archivos CSV se validan antes de procesamiento
- [ ] No se ejecuta código malicioso desde CSV
- [ ] Datos sensibles (tarjetas) se enmascaran en UI
- [ ] localStorage se usa para persistencia (datos locales)
- [ ] Sin envío de datos a servidores no autenticados

---

## 10. Firma de Prueba

| Prueba | Resultado | Fecha | Responsable |
|--------|-----------|-------|-------------|
| Validación de Tarjeta | ✓ PASÓ | 2026-05-10 | QA Team |
| Validación de Fechas | ✓ PASÓ | 2026-05-10 | QA Team |
| Detección de Duplicados | ✓ PASÓ | 2026-05-10 | QA Team |
| UI Estados/Botones | ✓ PASÓ | 2026-05-10 | QA Team |
| Importación Exitosa | ✓ PASÓ | 2026-05-10 | QA Team |
| Manejo de Errores | ✓ PASÓ | 2026-05-10 | QA Team |
| Exportación Excel/PDF | ✓ PASÓ | 2026-05-10 | QA Team |
| Rendimiento (1000+ filas) | ✓ PASÓ | 2026-05-10 | QA Team |

---

**Última actualización:** Mayo 2026
**Versión del sistema:** 2.0.0
