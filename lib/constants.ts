import type { CentroComercial } from "./types";

export const DEFAULT_CUOTA_FIJA = 600000;
export const COMMISSION_RATE = 0.02;

export const CENTROS_INICIALES: CentroComercial[] = [
  {
    id: "camino-real",
    nombre: "Camino Real",
    codigosEstablecimiento: ["17942202"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "tesoro",
    nombre: "Tesoro",
    codigosEstablecimiento: ["17942640"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "fundadores",
    nombre: "Fundadores",
    codigosEstablecimiento: ["17942756", "17942764"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "molinos",
    nombre: "Molinos",
    codigosEstablecimiento: ["17942707"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "oviedo",
    nombre: "Oviedo",
    codigosEstablecimiento: ["17942665", "17942673"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "puerta",
    nombre: "Puerta del Norte",
    codigosEstablecimiento: ["17942715", "17942723"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "sandiego",
    nombre: "Sandiego",
    codigosEstablecimiento: ["17942749"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "unicentro",
    nombre: "Unicentro",
    codigosEstablecimiento: ["17942772"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "florida",
    nombre: "Florida",
    codigosEstablecimiento: ["20016663"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "asocentros",
    nombre: "Asocentros",
    codigosEstablecimiento: ["17942798"],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
  {
    id: "monterrey",
    nombre: "Monterrey",
    codigosEstablecimiento: [],
    cuotaFija: DEFAULT_CUOTA_FIJA,
  },
];

export const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 72%, 51%)",
  "hsl(180, 70%, 45%)",
  "hsl(330, 80%, 60%)",
  "hsl(60, 70%, 50%)",
  "hsl(200, 70%, 50%)",
  "hsl(100, 60%, 45%)",
];

export const SUBTIPOS = [
  "Compra",
  "Devolución",
  "Anulación",
  "Reverso",
];

export const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
