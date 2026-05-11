# Remanentes - Guía Rápida de Referencia

## Inicio Rápido

### Para Usuarios
1. Accede a la pestaña "Remanentes"
2. Haz clic en "Seleccionar archivo" y elige tu CSV
3. Verifica que el archivo se cargue correctamente
4. Haz clic en "Importar"
5. Espera a que se complete la importación
6. Revisa el resumen: "X importados, Y duplicados ignorados"

### Para Desarrolladores
1. Lee `RESUMEN_EJECUTIVO_VALIDACION_REMANENTES.md` (vista general)
2. Lee `VALIDACION_REMANENTES_EXHAUSTIVA.md` (detalles técnicos)
3. Lee `CAMBIOS_REMANENTES_RESUMEN.md` (qué cambió)
4. Ejecuta tests del `TESTING_REMANENTES_CHECKLIST.md`

---

## Formato del Archivo CSV

**Columnas Requeridas (en cualquier orden):**
```
# Tarjeta          → 16 dígitos numéricos (REQUERIDO)
Saldo Final        → Número con símbolo de moneda
Saldo No Devuelto  → Número
Estado             → Texto (REQUERIDO)
Fecha Venta        → YYYY-MM-DD, DD/MM/YYYY, o YYYYMMDD
Fecha Vencimiento  → YYYY-MM-DD, DD/MM/YYYY, o YYYYMMDD
Reposición?        → Sí/No
Id                 → Texto (REQUERIDO)
Subtipo            → Texto
Saldo              → Número con símbolo
```

**Ejemplo de Fila Válida:**
```
# Tarjeta: 4532123456789012
Saldo Final: 100.000,00
Estado: Remanente por solicitar
Fecha Venta: 2024-04-13
Fecha Vencimiento: 2025-04-13
Id: PREP-001234
```

---

## Códigos de Error Comunes

### Error: "El número de tarjeta ... no es válido"
**Causa:** Tarjeta no tiene exactamente 16 dígitos
**Solución:** Verifica que la columna "# Tarjeta" tenga 16 números sin espacios

### Error: "La fecha ... no es válida"
**Causa:** Formato de fecha no reconocido
**Solución:** Usa uno de estos formatos:
- `2024-04-13` (ISO)
- `13/04/2024` (Día/Mes/Año)
- `20240413` (Numérico)

### Error: "El ID de origen es requerido"
**Causa:** Celda vacía en columna "Id"
**Solución:** Asegúrate que cada fila tenga un ID único

### Error: "El estado es requerido"
**Causa:** Celda vacía en columna "Estado"
**Solución:** Llena con uno de estos valores:
- "Remanente por solicitar"
- "Vendida"
- "Solicitado"
- "Pagado"
- "Cancelado"

---

## Casos de Uso

### Caso 1: Importar nuevos remanentes
1. Prepare CSV con nuevos remanentes
2. Verifique que ninguno sea duplicado
3. Importe - Sistema detectará automáticamente duplicados

### Caso 2: Actualizar remanentes existentes
1. Exporte remanentes actuales (botón "Exportar")
2. Modifique en Excel/Google Sheets
3. Importe nuevamente
4. Los duplicados (misma tarjeta + ID) serán ignorados
5. Nota: Para actualizar datos, necesitas cambiar el ID o tarjeta

### Caso 3: Consolidar múltiples archivos
1. Importe primer archivo
2. Importe segundo archivo
3. Sistema ignorará automáticamente duplicados
4. Resultado: Unión de ambos archivos sin duplicados

### Caso 4: Verificar qué se importó
1. Usa la tabla para filtrar/buscar
2. Haz clic en columna para ordenar
3. Cambia paginación (10/25/50 registros)
4. Exporta a Excel para análisis adicional

---

## Validaciones en Cascada

El sistema valida en este orden. Se detiene en la primera falla:

```
┌─────────────────────────────────────────────┐
│ 1. Tarjeta = 16 dígitos?                    │
│    ↓ No → ERROR (fila detenida)             │
│    ↓ Sí → siguiente validación              │
├─────────────────────────────────────────────┤
│ 2. ID Origen no está vacío?                 │
│    ↓ No → ERROR (fila detenida)             │
│    ↓ Sí → siguiente validación              │
├─────────────────────────────────────────────┤
│ 3. Fecha Venta válida?                      │
│    ↓ No → ERROR (fila detenida)             │
│    ↓ Sí → siguiente validación              │
├─────────────────────────────────────────────┤
│ 4. Fecha Vencimiento válida?                │
│    ↓ No → ERROR (fila detenida)             │
│    ↓ Sí → siguiente validación              │
├─────────────────────────────────────────────┤
│ 5. Estado no está vacío?                    │
│    ↓ No → ERROR (fila detenida)             │
│    ↓ Sí → siguiente validación              │
├─────────────────────────────────────────────┤
│ 6. ¿Es un duplicado (tarjeta + ID)?        │
│    ↓ Sí → IGNORADO (contador incrementado)  │
│    ↓ No → ✓ IMPORTADO                       │
└─────────────────────────────────────────────┘
```

---

## Botones e Interfaz

### Botón "Importar"
- **Habilitado:** Cuando hay archivo CSV seleccionado
- **Deshabilitado:** Cuando no hay archivo o está importando
- **Acción:** Inicia el proceso de importación
- **Resultado:** Muestra resumen o errores

### Botón "Exportar a Excel"
- **Habilitado:** Solo si hay remanentes importados
- **Resultado:** Descarga archivo .xlsx con todos los datos

### Botón "Exportar a PDF"
- **Habilitado:** Solo si hay remanentes importados
- **Resultado:** Descarga archivo .pdf con estadísticas y tabla

### Entrada "Seleccionar archivo"
- **Tipos:** CSV, XLSX
- **Tamaño máximo:** 10 MB
- **Deshabilitada:** Durante importación

---

## Interpretación de Mensajes

### Mensaje de Éxito
```
✓ 250 remanentes importados exitosamente
Por solicitar: 180 | Vendidas: 65 | Otros: 5
5 duplicados ignorados
```
**Interpretación:**
- 250 filas fueron aceptadas e importadas
- 180 tienen estado "por solicitar"
- 65 están "vendidas"
- 5 tienen otros estados
- 5 filas eran duplicados (misma tarjeta + ID)

### Mensaje de Error
```
✗ No se pudieron importar transacciones
Errores encontrados:
- Fila 5: Tarjeta - El número no es válido (debe ser 16 dígitos)
- Fila 12: Fecha Vencimiento - La fecha no es válida
```
**Interpretación:**
- Importación FALLIDA (0 filas importadas)
- Hay 2 errores identificados
- Debes corregir y reintentar

### Mensaje de Advertencia
```
⚠ Todas las transacciones ya están registradas
120 duplicados detectados (tarjeta + ID origen)
```
**Interpretación:**
- 0 filas fueron importadas (todas eran duplicadas)
- 120 filas coincidían con datos existentes
- No se agregó nada nuevo

---

## Rendimiento y Límites

| Métrica | Límite | Nota |
|---|---|---|
| Tamaño archivo | 10 MB | Previene problemas de memoria |
| Registros por importación | 10,000 | Testeado hasta 10K |
| Campos por registro | 12 | Todos soportados |
| Durabilidad de búsqueda | 3 segundos | Búsqueda en 10K+ registros |
| Tiempo paginación | <100ms | Cambio rápido entre páginas |

---

## Preguntas Frecuentes

**P: ¿Qué pasa si importo el mismo archivo dos veces?**
R: La segunda importación ignorará todos los registros como duplicados (composite key: tarjeta + ID origen).

**P: ¿Puedo actualizar un remanente?**
R: No directamente. Debes cambiar el ID o tarjeta para que sea un registro nuevo. O puedes eliminar y reimportar.

**P: ¿Cuál es la diferencia entre "Saldo Final" y "Saldo"?**
R: "Saldo Final" es el saldo al momento de la transacción. "Saldo" es el saldo actual con símbolos de moneda.

**P: ¿Qué significan las fechas Vencimiento y Vencimiento +1?**
R: Vencimiento es la fecha exacta. Vencimiento +1 es el día siguiente (usado para cálculos).

**P: ¿Cómo sé cuántos remanentes tengo en total?**
R: La tabla muestra un contador al pie con el total y distribución por estado.

**P: ¿Puedo buscar un remanente específico?**
R: Sí, usa la barra de búsqueda para filtrar por tarjeta, estado o ID origen.

---

## Atajos de Teclado

| Tecla | Acción |
|---|---|
| `Enter` | Confirmar importación (si diálogo abierto) |
| `Esc` | Cancelar diálogo |
| `Ctrl+F` | Buscar en tabla (navegador) |

---

## Solución de Problemas

**Problema: El botón "Importar" está gris (deshabilitado)**
- ✓ Verifica que seleccionaste un archivo
- ✓ Verifica que sea CSV o XLSX
- ✓ Espera a que la carga de archivo se complete

**Problema: Importación muy lenta**
- ✓ Archivo muy grande (>5 MB) - dividir en archivos menores
- ✓ Navegador con poca memoria - cerrar otras pestañas
- ✓ Sistema sobrecargado - intentar más tarde

**Problema: Errores de validación en todas las filas**
- ✓ Verifica que las columnas tengan los nombres correctos
- ✓ Verifica formatos de fecha (YYYY-MM-DD)
- ✓ Verifica que las tarjetas sean 16 dígitos
- ✓ Compara tu archivo con el ejemplo

---

## Contacto y Soporte

Para problemas técnicos:
1. Consulta `TESTING_REMANENTES_CHECKLIST.md` (reproducir paso a paso)
2. Revisa `VALIDACION_REMANENTES_EXHAUSTIVA.md` (detalles de validaciones)
3. Verifica los logs del navegador (F12 → Console)

---

**Última actualización:** 10 de mayo de 2026  
**Versión:** 1.0  
**Estado:** ✓ Listo para producción
