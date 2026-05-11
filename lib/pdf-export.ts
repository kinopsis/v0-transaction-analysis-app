import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Transaccion } from "./types";

interface PdfExportOptions {
  titulo: string;
  centroNombre?: string;
  mes?: number;
  anio?: number;
  fechaGeneracion: string;
  incluirTransacciones: boolean;
  transacciones: Transaccion[];
  chartsContainer: HTMLElement | null;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export async function exportDashboardToPdf(options: PdfExportOptions): Promise<void> {
  const {
    titulo,
    centroNombre,
    mes,
    anio,
    fechaGeneracion,
    incluirTransacciones,
    transacciones,
    chartsContainer,
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

  // Capture charts as images if container exists
  if (chartsContainer) {
    const html2canvas = (await import("html2canvas")).default;
    
    // Find all chart cards
    const chartCards = chartsContainer.querySelectorAll("[data-chart-export]");
    
    for (const chartCard of Array.from(chartCards)) {
      try {
        const canvas = await html2canvas(chartCard as HTMLElement, {
          backgroundColor: "#0f172a", // slate-900
          scale: 2,
          logging: false,
          useCORS: true,
        });
        
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
      } catch {
        // Skip chart if capture fails
        console.warn("Failed to capture chart");
      }
    }
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
