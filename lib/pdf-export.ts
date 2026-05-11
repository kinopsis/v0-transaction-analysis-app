import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Transaccion, CentroComercial, ComisionReporte, KPIData } from "./types";
import { COMMISSION_RATE } from "./constants";

interface PdfExportOptions {
  titulo: string;
  centroNombre?: string;
  centroId?: string;
  mes?: number;
  anio?: number;
  fechaGeneracion: string;
  incluirTransacciones: boolean;
  transacciones: Transaccion[];
  chartsContainer: HTMLElement | null;
  centros: CentroComercial[];
  kpis: KPIData;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// ─── Print-safe palette (high contrast, B&W-safe) ──────────────────
const C = {
  // Backgrounds
  headerBg: [22, 78, 99] as [number, number, number],     // teal-900
  headerAccent: [20, 184, 166] as [number, number, number], // teal-500
  cardBg: [248, 250, 252] as [number, number, number],     // slate-50
  white: [255, 255, 255] as [number, number, number],
  // Text
  textDark: [15, 23, 42] as [number, number, number],       // slate-900
  textMedium: [71, 85, 105] as [number, number, number],    // slate-500
  textLight: [148, 163, 184] as [number, number, number],   // slate-400
  // Borders
  border: [203, 213, 225] as [number, number, number],       // slate-300
  borderLight: [226, 232, 240] as [number, number, number],  // slate-200
  // Accent colors
  blue: [37, 99, 235] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  orange: [234, 88, 12] as [number, number, number],
  purple: [147, 51, 234] as [number, number, number],
  pink: [219, 39, 119] as [number, number, number],
};

export async function exportDashboardToPdf(options: PdfExportOptions): Promise<void> {
  const {
    titulo,
    centroNombre,
    centroId,
    mes,
    anio,
    fechaGeneracion,
    incluirTransacciones,
    transacciones,
    chartsContainer,
    centros,
    kpis,
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // ─── HEADER: Professional thin accent bar + title ─────────────────
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pageWidth, 36, "F");
  // Accent line
  doc.setFillColor(...C.headerAccent);
  doc.rect(0, 36, pageWidth, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, margin, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const periodoText = mes && anio
    ? `Período: ${MESES[mes - 1]} ${anio}`
    : anio ? `Período: Año ${anio}` : "Período: Todos los registros";
  doc.text(periodoText, margin, 25);
  if (centroNombre) doc.text(`Centro: ${centroNombre}`, margin, 31);
  doc.text(`Generado: ${fechaGeneracion}`, pageWidth - margin, 31, { align: "right" });

  let y = 46;

  // ─── COMMISSION SUMMARY ───────────────────────────────────────────
  const comisionSummary = calculateComisionSummary(transacciones, centros, centroId, mes, anio);
  if (comisionSummary) {
    y = drawComisionSummaryBox(doc, comisionSummary, margin, y, contentWidth, pageWidth);
    y += 5;
  }

  // ─── COMMISSION BREAKDOWN TABLE (Priority) ────────────────────────
  if (comisionSummary && !comisionSummary.isFiltered && comisionSummary.detalles.length > 0) {
    y = addComisionBreakdownTable(doc, comisionSummary, margin, y, pageWidth, pageHeight);
    y += 5;
  }

  // ─── KPI CARDS ────────────────────────────────────────────────────
  // Check if cards fit, if not add page
  if (y + 45 > pageHeight - 15) { doc.addPage(); y = margin; }
  y = drawKPICards(doc, kpis, margin, y, contentWidth);
  y += 5;

  // ─── CHARTS (captured from DOM with white background) ─────────────
  if (chartsContainer) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const chartCards = chartsContainer.querySelectorAll("[data-chart-export]");

    for (const chartCard of Array.from(chartCards)) {
      try {
        const el = chartCard as HTMLElement;
        // Extract actual title from DOM (CardTitle uses data-slot="card-title")
        const titleEl = el.querySelector("[data-slot='card-title']")
          || el.querySelector("h3")
          || el.querySelector("[class*='CardTitle']");
        const chartTitle = titleEl?.textContent?.trim() || "Gráfico";

        // Skip monthly trend
        const lower = chartTitle.toLowerCase();
        if (lower.includes("tendencia") || lower.includes("mensual")) continue;

        const svg = el.querySelector("svg.recharts-surface")
          || el.querySelector(".recharts-wrapper svg")
          || el.querySelector("svg");
        if (!svg) continue;

        const svgClone = svg.cloneNode(true) as SVGElement;
        // Replace oklch colors with print-safe equivalents
        replaceOklchColors(svgClone);

        const svgRect = svg.getBoundingClientRect();
        const svgW = svgRect.width || 500;
        const svgH = svgRect.height || 250;
        svgClone.setAttribute("width", String(svgW));
        svgClone.setAttribute("height", String(svgH));
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        const svgString = new XMLSerializer().serializeToString(svgClone);
        const canvas = document.createElement("canvas");
        const scale = 2.5; // Higher DPI for print
        canvas.width = svgW * scale;
        canvas.height = svgH * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        ctx.scale(scale, scale);
        // White background for print
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, svgW, svgH);

        const img = new Image();
        img.crossOrigin = "anonymous";
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => { ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url); resolve(); };
          img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("SVG load failed")); };
          img.src = url;
        });

        const imgW = contentWidth;
        const imgH = (canvas.height * imgW) / canvas.width;
        const totalH = imgH + 14;

        if (y + totalH > pageHeight - 15) { doc.addPage(); y = margin; }

        // Chart title bar (light)
        doc.setFillColor(...C.cardBg);
        doc.setDrawColor(...C.border);
        doc.roundedRect(margin, y, contentWidth, 8, 1, 1, "FD");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.textDark);
        doc.text(chartTitle, margin + 3, y + 5.5);
        y += 10;

        // Chart image with border
        doc.setDrawColor(...C.borderLight);
        doc.rect(margin, y, imgW, imgH, "S");
        doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, imgW, imgH);
        y += imgH + 6;
      } catch (err) {
        console.warn("[PDF] Chart capture error:", err);
      }
    }
  }

  // ─── TRANSACTIONS TABLE ───────────────────────────────────────────
  if (incluirTransacciones && transacciones.length > 0) {
    doc.addPage();
    // Light header
    doc.setFillColor(...C.headerBg);
    doc.rect(0, 0, pageWidth, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de Transacciones", margin, 12);
    doc.setFontSize(9);
    doc.text(`${transacciones.length} registros`, pageWidth - margin, 12, { align: "right" });

    const tableData = transacciones.map((t) => [
      t.fecha,
      t.nombreCentro || "-",
      t.marca || "-",
      t.codEstablecimiento,
      fmtCurrency(t.valor),
      t.tarjeta.slice(-4).padStart(t.tarjeta.length, "*"),
      t.codAutorizacion,
    ]);

    autoTable(doc, {
      startY: 22,
      head: [["Fecha", "Centro", "Comercio", "Cod. Est.", "Valor", "Tarjeta", "Autorización"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: C.headerBg,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      bodyStyles: { fontSize: 7, textColor: C.textDark },
      alternateRowStyles: { fillColor: C.cardBg },
      styles: { cellPadding: 2, lineColor: C.border, lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: 22 }, 1: { cellWidth: 28 }, 2: { cellWidth: 35 },
        3: { cellWidth: 22 }, 4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 25 }, 6: { cellWidth: 22 },
      },
      margin: { top: 22, left: margin, right: margin },
      didDrawPage: (data) => {
        doc.setFontSize(7);
        doc.setTextColor(...C.textLight);
        doc.text(`Página ${data.pageNumber}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      },
    });
  }

  // Footer on first page
  doc.setPage(1);
  doc.setFontSize(7);
  doc.setTextColor(...C.textLight);
  doc.text("Reporte generado — Sistema de Análisis de Transacciones ACECentros",
    pageWidth / 2, pageHeight - 8, { align: "center" });

  doc.save(generateFilename(centroNombre, mes, anio));
}

// ─── HELPERS ──────────────────────────────────────────────────────────

function replaceOklchColors(svgClone: SVGElement) {
  const replacements: Record<string, string> = {
    "oklch(0.28 0.02 250)": "#cbd5e1", // grid → light gray
    "oklch(0.65 0.02 250)": "#475569", // axis → dark gray
    "oklch(0.18 0.02 250)": "#ffffff", // tooltip bg → white
    "oklch(0.93 0.01 250)": "#0f172a", // tooltip text → dark
  };
  svgClone.querySelectorAll("*").forEach((el) => {
    const svgEl = el as SVGElement;
    ["stroke", "fill", "stop-color"].forEach((attr) => {
      const val = svgEl.getAttribute(attr);
      if (val) {
        for (const [from, to] of Object.entries(replacements)) {
          if (val.includes(from)) svgEl.setAttribute(attr, val.replace(from, to));
        }
      }
    });
    const style = svgEl.getAttribute("style");
    if (style) {
      let s = style;
      for (const [from, to] of Object.entries(replacements)) {
        s = s.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
      }
      svgEl.setAttribute("style", s);
    }
  });
}

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

function fmtNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

function generateFilename(centroNombre?: string, mes?: number, anio?: number): string {
  const parts = ["informe-dashboard"];
  if (centroNombre) parts.push(centroNombre.toLowerCase().replace(/\s+/g, "-"));
  if (mes && anio) parts.push(`${MESES[mes - 1].toLowerCase()}-${anio}`);
  else if (anio) parts.push(`${anio}`);
  parts.push(new Date().toISOString().split("T")[0]);
  return `${parts.join("_")}.pdf`;
}

// ─── KPI CARDS (print-friendly) ──────────────────────────────────────

function drawKPICards(
  doc: jsPDF, kpis: KPIData, margin: number, startY: number, contentWidth: number
): number {
  const cardW = (contentWidth - 8) / 3;
  const cardH = 20;

  const items = [
    { label: "Volumen de Ventas", value: fmtCurrency(kpis.volumenVentas), accent: C.blue },
    { label: "N° Transacciones", value: fmtNumber(kpis.numTransacciones), accent: C.green },
    { label: "Ticket Promedio", value: fmtCurrency(kpis.ticketPromedio), accent: C.purple },
    { label: "Comisión (2%)", value: fmtCurrency(kpis.comisionAcumulada), accent: C.orange },
    { label: "Tarjetas Únicas", value: fmtNumber(kpis.tarjetasUnicas), accent: C.pink },
    { label: "Datáfonos Únicos", value: fmtNumber(kpis.datafonosUnicos), accent: C.blue },
  ];

  let curY = startY;
  let curX = margin;

  items.forEach((item, i) => {
    if (i > 0 && i % 3 === 0) { curY += cardH + 3; curX = margin; }

    // Card border
    doc.setDrawColor(...C.border);
    doc.setFillColor(...C.white);
    doc.roundedRect(curX, curY, cardW, cardH, 1, 1, "FD");

    // Left accent bar
    doc.setFillColor(...item.accent);
    doc.rect(curX + 0.5, curY + 3, 1.5, cardH - 6, "F");

    // Label
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.textMedium);
    doc.text(item.label.toUpperCase(), curX + 5, curY + 7);

    // Value
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.textDark);
    doc.text(item.value, curX + 5, curY + 15);

    curX += cardW + 4;
  });

  return curY + cardH;
}

// ─── COMMISSION SUMMARY BOX ─────────────────────────────────────────

interface ComisionSummaryData {
  totalTransacciones: number;
  volumenTotal: number;
  comisionTotal: number;
  cuotaFijaTotal: number;
  grandTotal: number;
  isFiltered: boolean;
  centroNombre?: string;
  detalles: ComisionReporte[];
  periodoFacturado: string;
}

function drawComisionSummaryBox(
  doc: jsPDF, summary: ComisionSummaryData,
  margin: number, startY: number, contentWidth: number, pageWidth: number
): number {
  const boxH = 32;

  // Box with light background and border
  doc.setFillColor(...C.cardBg);
  doc.setDrawColor(...C.border);
  doc.roundedRect(margin, startY, contentWidth, boxH, 1.5, 1.5, "FD");

  // Title
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.textDark);
  const title = summary.isFiltered ? `Resumen — ${summary.centroNombre}` : "Resumen General de Comisiones";
  doc.text(title, margin + 4, startY + 7);

  // Period
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.textDark);
  doc.text(`Periodo: ${summary.periodoFacturado}`, pageWidth - margin - 4, startY + 7, { align: "right" });

  // Data row
  const cols = [
    { label: "Transacciones", value: fmtNumber(summary.totalTransacciones), color: C.textDark },
    { label: "Volumen", value: fmtCurrency(summary.volumenTotal), color: C.textDark },
    { label: "Comisión (2%)", value: fmtCurrency(summary.comisionTotal), color: C.blue },
    { label: "Cuota Fija", value: fmtCurrency(summary.cuotaFijaTotal), color: C.textDark },
    { label: "Total a Facturar", value: fmtCurrency(summary.grandTotal), color: C.green },
  ];

  const colW = contentWidth / cols.length;
  cols.forEach((col, i) => {
    const x = margin + 4 + i * colW;
    doc.setFontSize(6);
    doc.setTextColor(...C.textMedium);
    doc.text(col.label, x, startY + 15);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...col.color);
    doc.text(col.value, x, startY + 21);
  });

  // Footer note
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.textLight);
  doc.text("(Comisión + Cuota Fija = Total)", pageWidth - margin - 4, startY + boxH - 2, { align: "right" });

  return startY + boxH;
}

// ─── COMMISSION BREAKDOWN TABLE ─────────────────────────────────────

function addComisionBreakdownTable(
  doc: jsPDF, summary: ComisionSummaryData,
  margin: number, startY: number, pageWidth: number, pageHeight: number
): number {
  const estH = (summary.detalles.length + 2) * 8 + 20;
  if (startY + estH > pageHeight - 15) { doc.addPage(); startY = margin; }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.textDark);
  doc.text("Desglose por Centro Comercial", margin, startY + 7);

  const rows = summary.detalles.map((d) => [
    d.nombreCentro,
    fmtNumber(d.totalTransacciones),
    fmtCurrency(d.volumen),
    fmtCurrency(d.comision),
    fmtCurrency(d.cuotaFija),
    fmtCurrency(d.total),
  ]);
  rows.push([
    "TOTAL",
    fmtNumber(summary.totalTransacciones),
    fmtCurrency(summary.volumenTotal),
    fmtCurrency(summary.comisionTotal),
    fmtCurrency(summary.cuotaFijaTotal),
    fmtCurrency(summary.grandTotal),
  ]);

  autoTable(doc, {
    startY: startY + 10,
    head: [["Centro Comercial", "Transacciones", "Volumen", "Comisión (2%)", "Cuota Fija", "Total"]],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: C.headerBg,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: { fontSize: 8, textColor: C.textDark },
    alternateRowStyles: { fillColor: C.cardBg },
    styles: { cellPadding: 2.5, lineColor: C.border, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 22, halign: "right" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 26, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 26, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 240, 235];
        if (data.column.index === 5) {
          data.cell.styles.textColor = C.green;
        }
      }
      // Highlight "Por definir" row in light yellow
      const rowData = rows[data.row.index];
      if (rowData && rowData[0] === "Por definir" && data.row.index < rows.length - 1) {
        data.cell.styles.fillColor = [255, 251, 235]; // amber-50
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || startY + estH;
  return finalY + 8;
}

// ─── COMMISSION CALCULATION ─────────────────────────────────────────

function calculateComisionSummary(
  transacciones: Transaccion[],
  centros: CentroComercial[],
  centroId?: string,
  mes?: number,
  anio?: number
): ComisionSummaryData | null {
  if (transacciones.length === 0) return null;

  const grouped = new Map<string, Transaccion[]>();
  transacciones.forEach((t) => {
    const existing = grouped.get(t.centroId) || [];
    existing.push(t);
    grouped.set(t.centroId, existing);
  });

  // Registered centros
  const detalles: ComisionReporte[] = centros
    .map((centro) => {
      const txns = grouped.get(centro.id) || [];
      const volumen = txns.reduce((s, t) => s + t.valor, 0);
      const comision = volumen * COMMISSION_RATE;
      return {
        centroId: centro.id,
        nombreCentro: centro.nombre,
        totalTransacciones: txns.length,
        volumen, comision,
        cuotaFija: txns.length > 0 ? centro.cuotaFija : 0,
        total: comision + (txns.length > 0 ? centro.cuotaFija : 0),
      };
    })
    .filter((r) => r.totalTransacciones > 0);

  // Include unregistered centroIds (e.g. "por-definir")
  const registeredIds = new Set(centros.map((c) => c.id));
  const unregGroups = Array.from(grouped.entries()).filter(([id]) => !registeredIds.has(id));
  if (unregGroups.length > 0) {
    const txns = unregGroups.flatMap(([, t]) => t);
    const volumen = txns.reduce((s, t) => s + t.valor, 0);
    const comision = volumen * COMMISSION_RATE;
    detalles.push({
      centroId: "por-definir", nombreCentro: "Por definir",
      totalTransacciones: txns.length, volumen, comision, cuotaFija: 0, total: comision,
    });
  }

  const totalTransacciones = detalles.reduce((a, d) => a + d.totalTransacciones, 0);
  const volumenTotal = detalles.reduce((a, d) => a + d.volumen, 0);
  const comisionTotal = detalles.reduce((a, d) => a + d.comision, 0);
  const cuotaFijaTotal = detalles.reduce((a, d) => a + d.cuotaFija, 0);

  let periodoFacturado = "Todos los registros";
  if (mes && anio) periodoFacturado = `${MESES[mes - 1]} ${anio}`;
  else if (anio) periodoFacturado = `Año ${anio}`;

  return {
    totalTransacciones, volumenTotal, comisionTotal, cuotaFijaTotal,
    grandTotal: comisionTotal + cuotaFijaTotal,
    isFiltered: !!centroId,
    centroNombre: centroId ? centros.find((c) => c.id === centroId)?.nombre : undefined,
    detalles, periodoFacturado,
  };
}
