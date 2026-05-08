// Centro Comercial
export interface CentroComercial {
  id: string;
  nombre: string;
  codigosEstablecimiento: string[];
  cuotaFija: number;
}

// Datáfono mapping
export interface Datafono {
  nroDispositivo: string;
  /** Nombre del comercio/establecimiento (ej: "EXITO UNICENTRO") */
  nombreComercio?: string;
  /** Marca del terminal físico (ej: "Verifone") — campo libre */
  marca?: string;
  centroId: string;
}

// Transaction
export interface Transaccion {
  id: string;
  fecha: string;
  tarjeta: string;
  valor: number;
  nroDispositivo: string;
  subtipo: string;
  codEstablecimiento: string;
  estado: string;
  comprobante: string;
  centroId: string;
  archivoId: string;
  marca?: string;
  nombreCentro: string;
  mes: number;
  anio: number;
}

// Remanente
export interface Remanente {
  id: string;
  monto: number;
  tarjeta: string;
  idOrigen: string;
  subtipo: string;
  saldo: number;
  archivoId: string;
}

// Import log
export interface ArchivoImportado {
  id: string;
  nombre: string;
  tipo: "transaccion" | "remanente";
  fechaCarga: string;
  periodo?: string;
  totalRegistros: number;
  errores: number;
}

// Import error
export interface ImportError {
  fila: number;
  campo: string;
  valor: string;
  mensaje: string;
}

// KPI data
export interface KPIData {
  volumenVentas: number;
  numTransacciones: number;
  ticketPromedio: number;
  comisionAcumulada: number;
  tarjetasUnicas: number;
  datafonosUnicos: number;
}

// Monthly data for charts
export interface MonthlyData {
  mes: string;
  mesNum: number;
  anio: number;
  [centroId: string]: number | string;
}

// Commission report row
export interface ComisionReporte {
  centroId: string;
  nombreCentro: string;
  totalTransacciones: number;
  volumen: number;
  comision: number;
  cuotaFija: number;
  total: number;
}

// App state
export interface AppState {
  centros: CentroComercial[];
  datafonos: Datafono[];
  transacciones: Transaccion[];
  remanentes: Remanente[];
  archivosImportados: ArchivoImportado[];
}

// Filter state
export interface FilterState {
  centroIds: string[];
  fechaInicio?: string;
  fechaFin?: string;
  subtipo?: string;
  nroDispositivo?: string;
  tarjeta?: string;
  mes?: number;
  anio?: number;
}
