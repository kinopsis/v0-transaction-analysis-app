import * as XLSX from "xlsx";
import Papa from "papaparse";
import type {
  Transaccion,
  Remanente,
  Datafono,
  CentroComercial,
  ImportError,
  KPIData,
  FilterState,
  ComisionReporte,
  MonthlyData,
} from "./types";
import { COMMISSION_RATE, MESES } from "./constants";

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Parse date from YYYYMMDD format
export function parseDate(dateStr: string): { fecha: string; mes: number; anio: number } | null {
  if (!dateStr) return null;
  
  const cleaned = dateStr.toString().replace(/[^0-9]/g, "");
  
  if (cleaned.length === 8) {
    const anio = parseInt(cleaned.substring(0, 4));
    const mes = parseInt(cleaned.substring(4, 6));
    const dia = parseInt(cleaned.substring(6, 8));
    
    if (anio >= 2000 && anio <= 2100 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return {
        fecha: `${anio}-${mes.toString().padStart(2, "0")}-${dia.toString().padStart(2, "0")}`,
        mes,
        anio,
      };
    }
  }
  
  return null;
}

// Validate datáfono/device number (alphanumeric, non-empty)
export function validateDatafono(nro: string): boolean {
  const cleaned = nro?.toString().trim() || "";
  return cleaned.length > 0;
}

// Validate código de establecimiento: must be exactly 8 numeric digits
export function validateCodEstablecimiento(cod: string): boolean {
  const cleaned = cod?.toString().replace(/\s/g, "") || "";
  return /^\d{8}$/.test(cleaned);
}

// Normalize código de establecimiento to exactly 8 digits (zero-pad if shorter, trim spaces)
export function normalizeCodEstablecimiento(cod: string): string {
  const cleaned = cod?.toString().replace(/\s/g, "").replace(/[^0-9]/g, "") || "";
  // Zero-pad to 8 digits if it's numeric but short (e.g. "1234" → "00001234")
  if (cleaned.length > 0 && cleaned.length <= 8) {
    return cleaned.padStart(8, "0");
  }
  return cleaned;
}

// Validate tarjeta number (12 digits)
export function validateTarjeta(tarjeta: string): boolean {
  const cleaned = tarjeta?.toString().replace(/[^0-9]/g, "") || "";
  return cleaned.length >= 12;
}

// Normalize a string for flexible centro name matching
function normalizeCentroName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// Build alias map for known name variations in the CSV
const CENTRO_ALIASES: Record<string, string[]> = {
  tesoro: ["el tesoro", "tesoro"],
  sandiego: ["sandiego", "san diego"],
  "puerta": ["puerta del norte", "puerta norte", "puerta del norte"],
  unicentro: ["unicentro"],
  oviedo: ["oviedo"],
  fundadores: ["fundadores"],
  "camino-real": ["camino real"],
  molinos: ["molinos"],
  florida: ["florida"],
  asocentros: ["asocentros"],
};

// Resolve a centro name from a CSV value to a CentroComercial
export function resolveCentro(
  csvName: string,
  centros: CentroComercial[]
): CentroComercial | undefined {
  const normalized = normalizeCentroName(csvName);

  // 1. Try exact match on normalized nombre
  const exact = centros.find(
    (c) => normalizeCentroName(c.nombre) === normalized
  );
  if (exact) return exact;

  // 2. Try alias map
  for (const [centroId, aliases] of Object.entries(CENTRO_ALIASES)) {
    if (aliases.some((alias) => normalizeCentroName(alias) === normalized)) {
      const found = centros.find((c) => c.id === centroId);
      if (found) return found;
    }
  }

  // 3. Partial containment fallback
  return centros.find(
    (c) =>
      normalizeCentroName(c.nombre).includes(normalized) ||
      normalized.includes(normalizeCentroName(c.nombre))
  );
}

// Find centro by código de establecimiento (primary key for datafonos)
export function findCentroByCodEstablecimiento(
  codEstablecimiento: string,
  datafonos: Datafono[],
  centros: CentroComercial[]
): { centroId: string; nombreCentro: string; nombreComercio?: string; marca?: string } {
  const datafono = datafonos.find((d) => d.codEstablecimiento === codEstablecimiento);
  if (datafono) {
    const centro = centros.find((c) => c.id === datafono.centroId);
    return {
      centroId: datafono.centroId,
      nombreCentro: centro?.nombre || "Desconocido",
      nombreComercio: datafono.nombreComercio,
      marca: datafono.marca,
    };
  }
  return { centroId: "no-identificado", nombreCentro: "No identificado" };
}

// Parse Excel or CSV file
export async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        
        if (file.name.endsWith(".csv")) {
          Papa.parse(data as string, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              resolve(results.data as Record<string, unknown>[]);
            },
            error: (error: Error) => {
              reject(error);
            },
          });
        } else {
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
          resolve(json);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("Error reading file"));
    
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

// Import transactions from file
// Key rule: "Código establecimiento" in the CSV (column 17, 8 numeric digits) must match
// exactly the "Datáfono" (= codEstablecimiento) registered in Configuracion → Datafonos.
// Both identifiers are always 8-digit numeric values — they are the same field.
// "Nro dispositivo" is a separate alphanumeric terminal identifier and is NOT the same
// as the código de establecimiento.
export async function importTransacciones(
  file: File,
  datafonos: Datafono[],
  centros: CentroComercial[],
  archivoId: string,
  existingTransacciones: Transaccion[] = []
): Promise<{
  transacciones: Transaccion[];
  errors: ImportError[];
  duplicates: number;
  unregisteredCodes: string[];
  /** Rows rejected because their Código establecimiento is not registered as a Datáfono */
  rejectedUnregistered: number;
}> {
  const rows = await parseFile(file);
  const transacciones: Transaccion[] = [];
  const errors: ImportError[] = [];

  // Build composite duplicate key set from existing transactions: "codAutorizacion|fecha"
  const existingKeys = new Set(
    existingTransacciones.map((t) => `${t.codAutorizacion}|${t.fecha}`)
  );
  // Track keys within this import batch to avoid intra-file duplicates
  const batchKeys = new Set<string>();
  let duplicates = 0;
  let rejectedUnregistered = 0;

  // Track códigos de establecimiento that are not registered in Configuracion
  const unregisteredSet = new Set<string>();

  // Build a Map of all registered codEstablecimiento → Datafono for O(1) lookup
  // Rule: "Nro dispositivo del datafono importado en la configuración = Código establecimiento"
  // Both are exactly 8 numeric digits and must match exactly.
  const registeredDatafonoMap = new Map(
    datafonos.map((d) => [d.codEstablecimiento, d])
  );

  rows.forEach((row, index) => {
    const fila = index + 2; // Account for header row

    // --- Device number (alphanumeric terminal identifier — NOT the codEstablecimiento) ---
    const nroDispositivo = String(
      row["Nro dispositivo"] || row["nro_dispositivo"] || row["NroDispositivo"] || ""
    ).trim();

    // --- Fecha ---
    const fechaRaw = String(
      row["Fecha de autorización"] || row["fecha_autorizacion"] || row["Fecha"] || ""
    ).trim();

    // --- Tarjeta ---
    const tarjeta = String(row["Tarjeta"] || row["tarjeta"] || "").trim();

    // --- Valor ---
    const valorRaw = row["Valor transacción"] || row["Valor"] || row["valor"] || 0;

    // --- Subtipo ---
    const subtipo = String(row["Subtipo"] || row["subtipo"] || "").trim();

    // --- Red adquirente ---
    const redAdquirente = String(
      row["Red adquirente"] || row["red_adquirente"] || row["RedAdquirente"] || ""
    ).trim();

    // --- Código de establecimiento ---
    // PRIMARY KEY that must match Datafono.codEstablecimiento exactly (8 numeric digits).
    // This is the "identificador del datafono" registered in Configuracion.
    const rawCodEstablecimiento = String(
      row["Código establecimiento"] ||
        row["Codigo establecimiento"] ||
        row["Cod establecimiento"] ||
        row["cod_establecimiento"] ||
        row["CodEstablecimiento"] ||
        ""
    ).trim();
    const codEstablecimiento = normalizeCodEstablecimiento(rawCodEstablecimiento);

    // --- Estado ---
    const estado = String(
      row["Descripción estado de cobro de los cargos"] ||
        row["Estado"] ||
        row["estado"] ||
        ""
    ).trim();

    // --- Cod. Autorización ---
    const codAutorizacion = String(
      row["Cod. Autorización"] ||
        row["Cod. Autorizacion"] ||
        row["CodAutorizacion"] ||
        row["Comprobante"] ||
        row["comprobante"] ||
        ""
    ).trim();

    // VALIDATION 1: Nro dispositivo must be non-empty
    if (!validateDatafono(nroDispositivo)) {
      errors.push({
        fila,
        campo: "Nro dispositivo",
        valor: nroDispositivo,
        mensaje: "El número de dispositivo es requerido",
      });
      return;
    }

    // VALIDATION 2: Código establecimiento must be exactly 8 numeric digits
    // This is the "datafono number" used in configuration and must always be 8 digits.
    if (!validateCodEstablecimiento(codEstablecimiento)) {
      errors.push({
        fila,
        campo: "Código establecimiento",
        valor: rawCodEstablecimiento,
        mensaje:
          codEstablecimiento.length === 0
            ? "El código de establecimiento es requerido (debe ser exactamente 8 dígitos numéricos)"
            : `El código "${rawCodEstablecimiento}" no es válido — debe ser exactamente 8 dígitos numéricos, igual al número de datáfono registrado en Configuración`,
      });
      return;
    }

    // VALIDATION 3: Parse date
    const dateResult = parseDate(fechaRaw);
    if (!dateResult) {
      errors.push({
        fila,
        campo: "Fecha de autorización",
        valor: fechaRaw,
        mensaje: "Formato de fecha inválido (esperado: YYYYMMDD)",
      });
      return;
    }

    // VALIDATION 4: Duplicate check using Cod. Autorización + Fecha as composite key
    const compositeKey = `${codAutorizacion}|${dateResult.fecha}`;
    if (existingKeys.has(compositeKey) || batchKeys.has(compositeKey)) {
      duplicates++;
      return;
    }
    batchKeys.add(compositeKey);

    // VALIDATION 5 — DATAFONO CORRESPONDENCE CHECK:
    // The "Código establecimiento" (8-digit) in the CSV must correspond exactly to a
    // Datáfono registered in Configuración. The datáfono number in config IS the
    // código de establecimiento — both are the same 8-digit numeric identifier.
    // Rows whose código is not registered are tracked as warnings (not hard-blocked)
    // so they can still be imported but flagged for the user to review.
    if (!registeredDatafonoMap.has(codEstablecimiento)) {
      unregisteredSet.add(codEstablecimiento);
      rejectedUnregistered++;
      errors.push({
        fila,
        campo: "Código establecimiento",
        valor: codEstablecimiento,
        mensaje: `El código de establecimiento "${codEstablecimiento}" no corresponde a ningún datáfono registrado en Configuración → Datáfonos. El número de datáfono en la configuración debe coincidir exactamente con este código (8 dígitos).`,
      });
      return;
    }

    // Parse value
    const valor =
      typeof valorRaw === "number"
        ? valorRaw
        : parseFloat(String(valorRaw).replace(/[^0-9.-]/g, "")) || 0;

    // Find centro by codEstablecimiento (primary key — identical to Datafono.codEstablecimiento)
    const { centroId, nombreCentro, nombreComercio, marca } =
      findCentroByCodEstablecimiento(codEstablecimiento, datafonos, centros);

    transacciones.push({
      id: generateId(),
      fecha: dateResult.fecha,
      tarjeta: tarjeta.replace(/[^0-9]/g, ""),
      valor,
      nroDispositivo: nroDispositivo.replace(/\s/g, ""),
      subtipo,
      redAdquirente,
      codEstablecimiento,
      estado,
      codAutorizacion,
      centroId,
      archivoId,
      marca: nombreComercio || marca,
      nombreCentro,
      mes: dateResult.mes,
      anio: dateResult.anio,
    });
  });

  return {
    transacciones,
    errors,
    duplicates,
    unregisteredCodes: Array.from(unregisteredSet),
    rejectedUnregistered,
  };
}

// Import remanentes from file
export async function importRemanentes(
  file: File,
  archivoId: string
): Promise<{ remanentes: Remanente[]; errors: ImportError[] }> {
  const rows = await parseFile(file);
  const remanentes: Remanente[] = [];
  const errors: ImportError[] = [];
  
  rows.forEach((row, index) => {
    const fila = index + 2;
    
    const montoRaw = row["Monto"] || row["monto"] || 0;
    const tarjeta = String(row["Tarjeta"] || row["tarjeta"] || "").trim();
    const idOrigen = String(row["Id origen"] || row["id_origen"] || row["IdOrigen"] || "").trim();
    const subtipo = String(row["Subtipo"] || row["subtipo"] || "").trim();
    const saldoRaw = row["Saldo"] || row["saldo"] || 0;
    
    const monto = typeof montoRaw === "number"
      ? montoRaw
      : parseFloat(String(montoRaw).replace(/[^0-9.-]/g, "")) || 0;
    
    const saldo = typeof saldoRaw === "number"
      ? saldoRaw
      : parseFloat(String(saldoRaw).replace(/[^0-9.-]/g, "")) || 0;
    
    remanentes.push({
      id: generateId(),
      monto,
      tarjeta: tarjeta.replace(/[^0-9]/g, ""),
      idOrigen,
      subtipo,
      saldo,
      archivoId,
    });
  });
  
  return { remanentes, errors };
}

// Import datáfonos from CSV
// Expected columns: "Datáfono" (= Código establecimiento, 8 digits) | "Marca" | "Centro Comercial"
// The "Datáfono" column in Workbook1.csv IS the Código de establecimiento (always 8-digit numeric).
export async function importDatafonos(
  file: File,
  centros: CentroComercial[]
): Promise<{ datafonos: Datafono[]; errors: ImportError[] }> {
  const rows = await parseFile(file);
  const datafonos: Datafono[] = [];
  const errors: ImportError[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const fila = index + 2;

    // Primary identifier: Código de establecimiento
    // "Datáfono" column in Workbook1.csv is the 8-digit establishment code
    const rawCod = String(
      row["Datáfono"] ??
      row["Datafono"] ??
      row["Código establecimiento"] ??
      row["Codigo establecimiento"] ??
      row["Cod establecimiento"] ??
      row["cod_establecimiento"] ??
      row["CodEstablecimiento"] ??
      ""
    ).trim();

    // Normalize to 8-digit format
    const codEstablecimiento = normalizeCodEstablecimiento(rawCod);

    // "Marca" in the CSV is the commerce/store name
    const nombreComercio = String(
      row["Marca"] ?? row["marca"] ?? row["Nombre comercio"] ?? row["NombreComercio"] ?? ""
    ).trim();

    const centroNombre = String(
      row["Centro Comercial"] ??
      row["Centro comercial"] ??
      row["centro_comercial"] ??
      row["CentroComercial"] ??
      ""
    ).trim();

    // Validate: código de establecimiento must be exactly 8 numeric digits
    if (!validateCodEstablecimiento(codEstablecimiento)) {
      errors.push({
        fila,
        campo: "Datáfono / Código establecimiento",
        valor: rawCod,
        mensaje:
          codEstablecimiento.length === 0
            ? "El código de establecimiento es requerido"
            : `El código "${rawCod}" no es un identificador válido (debe ser exactamente 8 dígitos numéricos)`,
      });
      return;
    }

    // Skip duplicates within the same import batch
    if (seen.has(codEstablecimiento)) return;
    seen.add(codEstablecimiento);

    // Resolve centro using flexible name matching
    const centro = resolveCentro(centroNombre, centros);

    if (!centro) {
      errors.push({
        fila,
        campo: "Centro Comercial",
        valor: centroNombre,
        mensaje: `Centro comercial "${centroNombre}" no encontrado en la configuración`,
      });
      return;
    }

    datafonos.push({
      codEstablecimiento,
      nombreComercio: nombreComercio || undefined,
      centroId: centro.id,
    });
  });

  return { datafonos, errors };
}

// Filter transactions
export function filterTransacciones(
  transacciones: Transaccion[],
  filters: FilterState
): Transaccion[] {
  return transacciones.filter((t) => {
    if (filters.centroIds.length > 0 && !filters.centroIds.includes(t.centroId)) {
      return false;
    }
    if (filters.fechaInicio && t.fecha < filters.fechaInicio) {
      return false;
    }
    if (filters.fechaFin && t.fecha > filters.fechaFin) {
      return false;
    }
    if (filters.redAdquirente && t.redAdquirente !== filters.redAdquirente) {
      return false;
    }
    if (filters.nroDispositivo && !t.nroDispositivo.includes(filters.nroDispositivo)) {
      return false;
    }
    if (filters.codEstablecimiento && !t.codEstablecimiento.includes(filters.codEstablecimiento)) {
      return false;
    }
    if (filters.tarjeta && !t.tarjeta.includes(filters.tarjeta)) {
      return false;
    }
    if (filters.mes && t.mes !== filters.mes) {
      return false;
    }
    if (filters.anio && t.anio !== filters.anio) {
      return false;
    }
    return true;
  });
}

// Calculate KPIs
export function calculateKPIs(transacciones: Transaccion[]): KPIData {
  const volumenVentas = transacciones.reduce((sum, t) => sum + t.valor, 0);
  const numTransacciones = transacciones.length;
  const ticketPromedio = numTransacciones > 0 ? volumenVentas / numTransacciones : 0;
  const comisionAcumulada = volumenVentas * COMMISSION_RATE;
  const tarjetasUnicas = new Set(transacciones.map((t) => t.tarjeta)).size;
  const datafonosUnicos = new Set(transacciones.map((t) => t.codEstablecimiento)).size;
  
  return {
    volumenVentas,
    numTransacciones,
    ticketPromedio,
    comisionAcumulada,
    tarjetasUnicas,
    datafonosUnicos,
  };
}

// Calculate commission report
export function calculateComisionReporte(
  transacciones: Transaccion[],
  centros: CentroComercial[]
): ComisionReporte[] {
  const grouped = new Map<string, Transaccion[]>();
  
  transacciones.forEach((t) => {
    const existing = grouped.get(t.centroId) || [];
    existing.push(t);
    grouped.set(t.centroId, existing);
  });
  
  return centros.map((centro) => {
    const centroTransacciones = grouped.get(centro.id) || [];
    const volumen = centroTransacciones.reduce((sum, t) => sum + t.valor, 0);
    const comision = volumen * COMMISSION_RATE;
    
    return {
      centroId: centro.id,
      nombreCentro: centro.nombre,
      totalTransacciones: centroTransacciones.length,
      volumen,
      comision,
      cuotaFija: centro.cuotaFija,
      total: comision + centro.cuotaFija,
    };
  }).filter((r) => r.totalTransacciones > 0);
}

// Calculate monthly data for charts
export function calculateMonthlyData(
  transacciones: Transaccion[],
  centros: CentroComercial[],
  metric: "volumen" | "transacciones" = "volumen"
): MonthlyData[] {
  const monthlyMap = new Map<string, MonthlyData>();
  
  transacciones.forEach((t) => {
    const key = `${t.anio}-${t.mes}`;
    const existing = monthlyMap.get(key) || {
      mes: MESES[t.mes - 1]?.label || "",
      mesNum: t.mes,
      anio: t.anio,
    };
    
    const currentValue = (existing[t.centroId] as number) || 0;
    existing[t.centroId] = metric === "volumen" 
      ? currentValue + t.valor 
      : currentValue + 1;
    
    monthlyMap.set(key, existing);
  });
  
  return Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    return a.mesNum - b.mesNum;
  });
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format number with thousands separator
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

// Format date for display
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Get period string from transactions
export function getPeriodString(transacciones: Transaccion[]): string {
  if (transacciones.length === 0) return "";
  
  const meses = new Set(transacciones.map((t) => t.mes));
  const anios = new Set(transacciones.map((t) => t.anio));
  
  if (meses.size === 1 && anios.size === 1) {
    const mes = Array.from(meses)[0];
    const anio = Array.from(anios)[0];
    return `${MESES[mes - 1]?.label} ${anio}`;
  }
  
  return `${transacciones.length} transacciones`;
}
