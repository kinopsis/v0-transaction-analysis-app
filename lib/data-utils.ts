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

// Validate datáfono number (8 digits)
export function validateDatafono(nro: string): boolean {
  const cleaned = nro?.toString().replace(/[^0-9]/g, "") || "";
  return cleaned.length === 8;
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
export async function importTransacciones(
  file: File,
  datafonos: Datafono[],
  centros: CentroComercial[],
  archivoId: string
): Promise<{ transacciones: Transaccion[]; errors: ImportError[] }> {
  const rows = await parseFile(file);
  const transacciones: Transaccion[] = [];
  const errors: ImportError[] = [];
  
  rows.forEach((row, index) => {
    const fila = index + 2; // Account for header row
    
    // Get values with flexible column names
    const nroDispositivo = String(
      row["Nro dispositivo"] || row["nro_dispositivo"] || row["NroDispositivo"] || ""
    ).trim();
    const fechaRaw = String(
      row["Fecha de autorización"] || row["fecha_autorizacion"] || row["Fecha"] || ""
    ).trim();
    const tarjeta = String(
      row["Tarjeta"] || row["tarjeta"] || ""
    ).trim();
    const valorRaw = row["Valor"] || row["valor"] || 0;
    const subtipo = String(
      row["Subtipo"] || row["subtipo"] || ""
    ).trim();
    const codEstablecimiento = String(
      row["Cod establecimiento"] || row["cod_establecimiento"] || row["CodEstablecimiento"] || ""
    ).trim();
    const estado = String(
      row["Estado"] || row["estado"] || ""
    ).trim();
    const comprobante = String(
      row["Comprobante"] || row["comprobante"] || ""
    ).trim();
    
    // Validate datáfono
    if (!validateDatafono(nroDispositivo)) {
      errors.push({
        fila,
        campo: "Nro dispositivo",
        valor: nroDispositivo,
        mensaje: "El número de dispositivo debe tener 8 dígitos",
      });
      return;
    }
    
    // Parse date
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
    
    // Parse value
    const valor = typeof valorRaw === "number" 
      ? valorRaw 
      : parseFloat(String(valorRaw).replace(/[^0-9.-]/g, "")) || 0;
    
    // Find centro by codEstablecimiento (primary key)
    const { centroId, nombreCentro, nombreComercio, marca } = findCentroByCodEstablecimiento(
      codEstablecimiento,
      datafonos,
      centros
    );
    
    transacciones.push({
      id: generateId(),
      fecha: dateResult.fecha,
      tarjeta: tarjeta.replace(/[^0-9]/g, ""),
      valor,
      nroDispositivo: nroDispositivo.replace(/[^0-9]/g, ""),
      subtipo,
      codEstablecimiento,
      estado,
      comprobante,
      centroId,
      archivoId,
      marca: nombreComercio || marca,
      nombreCentro,
      mes: dateResult.mes,
      anio: dateResult.anio,
    });
  });
  
  return { transacciones, errors };
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
// Expected columns: "Código establecimiento" | "Marca" | "Centro Comercial"
// Also accepts: "Datáfono", "Cod establecimiento", etc.
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
    const codEstablecimiento = String(
      row["Código establecimiento"] ??
      row["Codigo establecimiento"] ??
      row["Cod establecimiento"] ??
      row["cod_establecimiento"] ??
      row["CodEstablecimiento"] ??
      row["Datáfono"] ??
      row["Datafono"] ??
      ""
    ).trim();

    // "Marca" in the CSV is actually the commerce/store name
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

    // Validate código establecimiento (must not be empty)
    if (!codEstablecimiento || codEstablecimiento.length < 1) {
      errors.push({
        fila,
        campo: "Código establecimiento",
        valor: codEstablecimiento,
        mensaje: "El código de establecimiento es requerido",
      });
      return;
    }

    // Skip duplicates within the same import
    if (seen.has(codEstablecimiento)) return;
    seen.add(codEstablecimiento);

    // Resolve centro using flexible matching
    const centro = resolveCentro(centroNombre, centros);

    if (!centro) {
      errors.push({
        fila,
        campo: "Centro Comercial",
        valor: centroNombre,
        mensaje: `Centro comercial "${centroNombre}" no encontrado`,
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
    if (filters.subtipo && t.subtipo !== filters.subtipo) {
      return false;
    }
    if (filters.nroDispositivo && !t.nroDispositivo.includes(filters.nroDispositivo)) {
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
  const datafonosUnicos = new Set(transacciones.map((t) => t.nroDispositivo)).size;
  
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
