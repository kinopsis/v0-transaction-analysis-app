import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Transaccion, CentroComercial, ComisionReporte } from "./types";
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
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

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
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header gradient simulation with dark theme colors
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 45, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, margin, 22);

  // Subtitle with report info
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  
  const periodoText = mes && anio 
    ? `Período: ${MESES[mes - 1]} ${anio}` 
    : anio 
    ? `Período: Año ${anio}` 
    : "Período: Todos los registros";
  
  doc.text(periodoText, margin, 32);

  if (centroNombre) {
    doc.text(`Centro Comercial: ${centroNombre}`, margin, 38);
  }

  // Timestamp on right side
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generado: ${fechaGeneracion}`, pageWidth - margin, 38, { align: "right" });

  let yPosition = 55;

  // Calculate commission summary
  const comisionSummary = calculateComisionSummary(transacciones, centros, centroId, mes, anio);
  
  // Draw Commission Summary Box
  if (comisionSummary) {
    yPosition = drawComisionSummaryBox(doc, comisionSummary, margin, yPosition, pageWidth);
    yPosition += 8;
  }

  // Capture charts as images FIRST (on first page after summary)
  if (chartsContainer) {
    // Wait a bit to ensure all charts are fully rendered
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Find all chart cards with SVGs
    const chartCards = chartsContainer.querySelectorAll("[data-chart-export]");
    
    for (const chartCard of Array.from(chartCards)) {
      try {
        const chartElement = chartCard as HTMLElement;
        // Try multiple selectors for Recharts SVG
        const svg = chartElement.querySelector("svg.recharts-surface") 
          || chartElement.querySelector(".recharts-wrapper svg")
          || chartElement.querySelector("svg");
        
        if (svg) {
          // Clone the SVG and process colors
          const svgClone = svg.cloneNode(true) as SVGElement;
          
          // Replace oklch/lab colors with hex equivalents
          const colorReplacements: Record<string, string> = {
            "oklch(0.28 0.02 250)": "#334155", // slate-700
            "oklch(0.65 0.02 250)": "#94a3b8", // slate-400
            "oklch(0.18 0.02 250)": "#0f172a", // slate-900
            "oklch(0.93 0.01 250)": "#f1f5f9", // slate-100
          };
          
          // Process all elements with stroke/fill
          const allSvgElements = svgClone.querySelectorAll("*");
          allSvgElements.forEach((el) => {
            const svgEl = el as SVGElement;
            ["stroke", "fill", "stop-color"].forEach((attr) => {
              const value = svgEl.getAttribute(attr);
              if (value) {
                for (const [oklch, hex] of Object.entries(colorReplacements)) {
                  if (value.includes(oklch)) {
                    svgEl.setAttribute(attr, value.replace(oklch, hex));
                  }
                }
              }
            });
            // Also check style attribute
            const style = svgEl.getAttribute("style");
            if (style) {
              let newStyle = style;
              for (const [oklch, hex] of Object.entries(colorReplacements)) {
                newStyle = newStyle.replace(new RegExp(oklch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), hex);
              }
              svgEl.setAttribute("style", newStyle);
            }
          });
          
          // Get SVG dimensions
          const svgRect = svg.getBoundingClientRect();
          const svgWidth = svgRect.width || 400;
          const svgHeight = svgRect.height || 200;
          
          // Set explicit dimensions on cloned SVG
          svgClone.setAttribute("width", String(svgWidth));
          svgClone.setAttribute("height", String(svgHeight));
          svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          
          // Serialize to string
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svgClone);
          
          // Create a canvas and draw the SVG
          const canvas = document.createElement("canvas");
          const scale = 2;
          canvas.width = svgWidth * scale;
          canvas.height = svgHeight * scale;
          const ctx = canvas.getContext("2d");
          
          if (ctx) {
            ctx.scale(scale, scale);
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 0, svgWidth, svgHeight);
            
            // Create image from SVG
            const img = new Image();
            img.crossOrigin = "anonymous";
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);
            
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                resolve();
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load SVG"));
              };
              img.src = url;
            });
            
            // Get chart title from the card
            const titleEl = chartElement.querySelector("[class*='CardTitle']");
            const title = titleEl?.textContent || "";
            
            // Add title above chart in PDF
            if (title) {
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(255, 255, 255);
              doc.text(title.split("(")[0].trim(), margin, yPosition);
              yPosition += 5;
            }
            
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Check if we need a new page
            if (yPosition + imgHeight > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
            }
            
            doc.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
          }
        }
      } catch (error) {
        console.warn("[v0] Failed to capture chart:", error);
      }
    }
  }

  // Add commission breakdown table AFTER charts (if showing all centros)
  if (comisionSummary && !comisionSummary.isFiltered && comisionSummary.detalles.length > 0) {
    yPosition = addComisionBreakdownTable(doc, comisionSummary, margin, yPosition, pageWidth, pageHeight);
  }

  // Add transactions table if requested
  if (incluirTransacciones && transacciones.length > 0) {
    doc.addPage();
    
    // Page header for transactions
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de Transacciones", margin, 17);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`${transacciones.length} registros`, pageWidth - margin, 17, { align: "right" });

    // Format transactions for table
    const tableData = transacciones.map((t) => [
      t.fecha,
      t.nombreCentro || "-",
      t.marca || "-",
      t.codEstablecimiento,
      formatCurrency(t.valor),
      t.tarjeta.slice(-4).padStart(t.tarjeta.length, "*"),
      t.codAutorizacion,
    ]);

    autoTable(doc, {
      startY: 30,
      head: [[
        "Fecha",
        "Centro",
        "Comercio",
        "Cod. Est.",
        "Valor",
        "Tarjeta",
        "Autorización"
      ]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85], // slate-700
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      styles: {
        cellPadding: 2,
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 25 },
        6: { cellWidth: 22 },
      },
      margin: { top: 30, left: margin, right: margin },
      didDrawPage: (data) => {
        // Footer on each page
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        const pageNum = doc.internal.pages.length - 1;
        doc.text(
          `Página ${data.pageNumber}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      },
    });
  }

  // Footer on first page
  doc.setPage(1);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Reporte generado automáticamente - Sistema de Análisis de Transacciones",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Generate filename
  const filename = generateFilename(centroNombre, mes, anio);
  doc.save(filename);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function generateFilename(centroNombre?: string, mes?: number, anio?: number): string {
  const parts = ["reporte-dashboard"];
  
  if (centroNombre) {
    parts.push(centroNombre.toLowerCase().replace(/\s+/g, "-"));
  }
  
  if (mes && anio) {
    parts.push(`${MESES[mes - 1].toLowerCase()}-${anio}`);
  } else if (anio) {
    parts.push(`${anio}`);
  }
  
  const timestamp = new Date().toISOString().split("T")[0];
  parts.push(timestamp);
  
  return `${parts.join("_")}.pdf`;
}

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

function calculateComisionSummary(
  transacciones: Transaccion[],
  centros: CentroComercial[],
  centroId?: string,
  mes?: number,
  anio?: number
): ComisionSummaryData | null {
  if (transacciones.length === 0) return null;

  // Group transactions by centro
  const grouped = new Map<string, Transaccion[]>();
  transacciones.forEach((t) => {
    const existing = grouped.get(t.centroId) || [];
    existing.push(t);
    grouped.set(t.centroId, existing);
  });

  // Calculate report for each centro
  const detalles: ComisionReporte[] = centros
    .map((centro) => {
      const centroTransacciones = grouped.get(centro.id) || [];
      const volumen = centroTransacciones.reduce((sum, t) => sum + t.valor, 0);
      const comision = volumen * COMMISSION_RATE;

      return {
        centroId: centro.id,
        nombreCentro: centro.nombre,
        totalTransacciones: centroTransacciones.length,
        volumen,
        comision,
        cuotaFija: centroTransacciones.length > 0 ? centro.cuotaFija : 0,
        total: comision + (centroTransacciones.length > 0 ? centro.cuotaFija : 0),
      };
    })
    .filter((r) => r.totalTransacciones > 0);

  // Calculate totals
  const totalTransacciones = detalles.reduce((acc, d) => acc + d.totalTransacciones, 0);
  const volumenTotal = detalles.reduce((acc, d) => acc + d.volumen, 0);
  const comisionTotal = detalles.reduce((acc, d) => acc + d.comision, 0);
  const cuotaFijaTotal = detalles.reduce((acc, d) => acc + d.cuotaFija, 0);
  const grandTotal = comisionTotal + cuotaFijaTotal;

  const isFiltered = !!centroId;
  const centroNombre = isFiltered
    ? centros.find((c) => c.id === centroId)?.nombre
    : undefined;

  // Build periodo string
  let periodoFacturado = "Todos los registros";
  if (mes && anio) {
    periodoFacturado = `${MESES[mes - 1]} ${anio}`;
  } else if (anio) {
    periodoFacturado = `Año ${anio}`;
  }

  return {
    totalTransacciones,
    volumenTotal,
    comisionTotal,
    cuotaFijaTotal,
    grandTotal,
    isFiltered,
    centroNombre,
    detalles,
    periodoFacturado,
  };
}

function drawComisionSummaryBox(
  doc: jsPDF,
  summary: ComisionSummaryData,
  margin: number,
  startY: number,
  pageWidth: number
): number {
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = 38; // More compact
  
  // Box background
  doc.setFillColor(30, 41, 59); // slate-800
  doc.setDrawColor(51, 65, 85); // slate-700
  doc.roundedRect(margin, startY, boxWidth, boxHeight, 2, 2, "FD");

  // Title and Period on same line
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const title = summary.isFiltered
    ? `Resumen - ${summary.centroNombre}`
    : "Resumen General";
  doc.text(title, margin + 4, startY + 7);

  // Period badge
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Periodo: ${summary.periodoFacturado}`, pageWidth - margin - 4, startY + 7, { align: "right" });

  // Single data row - 5 columns: Trans | Vol | Com | Cuota | Total
  const col1X = margin + 4;
  const col2X = margin + 30;
  const col3X = margin + 68;
  const col4X = margin + 105;
  const col5X = margin + 138;
  const dataRowY = startY + 17;

  // Labels
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text("Transacciones", col1X, dataRowY);
  doc.text("Volumen", col2X, dataRowY);
  doc.text("Comision (2%)", col3X, dataRowY);
  doc.text("Cuota Fija", col4X, dataRowY);
  doc.text("Total a Facturar", col5X, dataRowY);

  // Values
  const valueRowY = dataRowY + 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(formatNumber(summary.totalTransacciones), col1X, valueRowY);
  doc.text(formatCurrency(summary.volumenTotal), col2X, valueRowY);
  doc.setTextColor(59, 130, 246); // blue-500
  doc.text(formatCurrency(summary.comisionTotal), col3X, valueRowY);
  doc.setTextColor(34, 197, 94); // green-500
  doc.text(formatCurrency(summary.cuotaFijaTotal), col4X, valueRowY);
  
  // Grand total with highlight
  doc.setFontSize(10);
  doc.setTextColor(34, 197, 94); // green-500
  doc.text(formatCurrency(summary.grandTotal), col5X, valueRowY);

  // Bottom line showing calculation
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont("helvetica", "normal");
  doc.text(`(Comision + Cuota Fija = Total)`, pageWidth - margin - 4, startY + boxHeight - 3, { align: "right" });

  return startY + boxHeight;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

function addComisionBreakdownTable(
  doc: jsPDF,
  summary: ComisionSummaryData,
  margin: number,
  startY: number,
  pageWidth: number,
  pageHeight: number
): number {
  // Check if we need a new page
  const estimatedTableHeight = (summary.detalles.length + 2) * 8 + 20;
  if (startY + estimatedTableHeight > pageHeight - margin) {
    doc.addPage();
    startY = margin;
  }

  // Table title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Desglose por Centro Comercial", margin, startY + 8);

  // Build table data
  const tableData = summary.detalles.map((d) => [
    d.nombreCentro,
    formatNumber(d.totalTransacciones),
    formatCurrency(d.volumen),
    formatCurrency(d.comision),
    formatCurrency(d.cuotaFija),
    formatCurrency(d.total),
  ]);

  // Add totals row
  tableData.push([
    "TOTAL",
    formatNumber(summary.totalTransacciones),
    formatCurrency(summary.volumenTotal),
    formatCurrency(summary.comisionTotal),
    formatCurrency(summary.cuotaFijaTotal),
    formatCurrency(summary.grandTotal),
  ]);

  autoTable(doc, {
    startY: startY + 12,
    head: [[
      "Centro Comercial",
      "Transacciones",
      "Volumen",
      "Comision (2%)",
      "Cuota Fija",
      "Total"
    ]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [226, 232, 240], // slate-200
      fillColor: [15, 23, 42], // slate-900
    },
    alternateRowStyles: {
      fillColor: [30, 41, 59], // slate-800
    },
    styles: {
      cellPadding: 3,
      lineColor: [51, 65, 85], // slate-700
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22, halign: "right" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 25, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      // Style the total row differently
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [15, 23, 42];
        if (data.column.index === 5) {
          data.cell.styles.textColor = [34, 197, 94]; // green-500
        }
      }
    },
  });

  // Get the final Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || startY + estimatedTableHeight;
  
  return finalY + 10;
}
