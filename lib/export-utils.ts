import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Transaccion, Remanente, ComisionReporte, Datafono, CentroComercial } from "./types";
import { formatCurrency, formatDate } from "./data-utils";

// Export transactions to Excel
export function exportTransaccionesExcel(transacciones: Transaccion[], filename: string) {
  const data = transacciones.map((t) => ({
    "Fecha": formatDate(t.fecha),
    "Tarjeta": t.tarjeta,
    "Valor": t.valor,
    "Datáfono": t.nroDispositivo,
    "Nombre Comercio": t.datafonoNoRegistrado ? "**COMERCIO POR DEFINIR**" : (t.marca || ""),
    "Red Adquirente": t.redAdquirente,
    "Cod Establecimiento": t.codEstablecimiento,
    "Cod. Autorización": t.codAutorizacion,
    "Centro Comercial": t.datafonoNoRegistrado ? "**POR CORREGIR**" : t.nombreCentro,
    "Requiere Corrección": t.datafonoNoRegistrado ? "SI" : "NO",
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Export transactions to PDF
export function exportTransaccionesPDF(transacciones: Transaccion[], filename: string) {
  const doc = new jsPDF("landscape");
  
  // Count unregistered transactions
  const unregisteredCount = transacciones.filter((t) => t.datafonoNoRegistrado).length;
  
  doc.setFontSize(16);
  doc.text("Reporte de Transacciones", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, 14, 22);
  doc.text(`Total: ${transacciones.length} transacciones`, 14, 28);
  
  if (unregisteredCount > 0) {
    doc.setTextColor(255, 140, 0);
    doc.text(`Transacciones con datafono no registrado: ${unregisteredCount} (requieren correccion)`, 14, 34);
    doc.setTextColor(0, 0, 0);
  }
  
  const tableData = transacciones.map((t) => [
    formatDate(t.fecha),
    t.tarjeta,
    formatCurrency(t.valor),
    t.codEstablecimiento,
    t.datafonoNoRegistrado ? "**POR DEFINIR**" : (t.marca || "-"),
    t.redAdquirente,
    t.codAutorizacion,
    t.datafonoNoRegistrado ? "**POR CORREGIR**" : t.nombreCentro,
  ]);
  
  autoTable(doc, {
    head: [["Fecha", "Tarjeta", "Valor", "Cód. Estab.", "Comercio", "Red Adq.", "Cod. Autorizacion", "Centro"]],
    body: tableData,
    startY: unregisteredCount > 0 ? 40 : 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    // Highlight rows with unregistered datafono
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowIndex = data.row.index;
        if (transacciones[rowIndex]?.datafonoNoRegistrado) {
          data.cell.styles.fillColor = [255, 243, 205]; // Light amber background
          data.cell.styles.textColor = [139, 69, 19]; // Brown text
        }
      }
    },
  });
  
  doc.save(`${filename}.pdf`);
}

// Export commission report to Excel
export function exportComisionesExcel(comisiones: ComisionReporte[], filename: string) {
  const data = comisiones.map((c) => ({
    "Centro Comercial": c.nombreCentro,
    "Transacciones": c.totalTransacciones,
    "Volumen": c.volumen,
    "Comisión (2%)": c.comision,
    "Cuota Fija": c.cuotaFija,
    "Total": c.total,
  }));
  
  // Add totals row
  const totals = comisiones.reduce(
    (acc, c) => ({
      transacciones: acc.transacciones + c.totalTransacciones,
      volumen: acc.volumen + c.volumen,
      comision: acc.comision + c.comision,
      cuotaFija: acc.cuotaFija + c.cuotaFija,
      total: acc.total + c.total,
    }),
    { transacciones: 0, volumen: 0, comision: 0, cuotaFija: 0, total: 0 }
  );
  
  data.push({
    "Centro Comercial": "TOTAL",
    "Transacciones": totals.transacciones,
    "Volumen": totals.volumen,
    "Comisión (2%)": totals.comision,
    "Cuota Fija": totals.cuotaFija,
    "Total": totals.total,
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Export commission report to PDF
export function exportComisionesPDF(comisiones: ComisionReporte[], filename: string) {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Reporte de Comisiones y Cuota Fija", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, 14, 22);
  
  const tableData = comisiones.map((c) => [
    c.nombreCentro,
    c.totalTransacciones.toString(),
    formatCurrency(c.volumen),
    formatCurrency(c.comision),
    formatCurrency(c.cuotaFija),
    formatCurrency(c.total),
  ]);
  
  // Add totals row
  const totals = comisiones.reduce(
    (acc, c) => ({
      transacciones: acc.transacciones + c.totalTransacciones,
      volumen: acc.volumen + c.volumen,
      comision: acc.comision + c.comision,
      cuotaFija: acc.cuotaFija + c.cuotaFija,
      total: acc.total + c.total,
    }),
    { transacciones: 0, volumen: 0, comision: 0, cuotaFija: 0, total: 0 }
  );
  
  tableData.push([
    "TOTAL",
    totals.transacciones.toString(),
    formatCurrency(totals.volumen),
    formatCurrency(totals.comision),
    formatCurrency(totals.cuotaFija),
    formatCurrency(totals.total),
  ]);
  
  autoTable(doc, {
    head: [["Centro", "Transacciones", "Volumen", "Comisión", "Cuota Fija", "Total"]],
    body: tableData,
    startY: 30,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  doc.save(`${filename}.pdf`);
}

// Export remanentes to Excel (with all new fields)
export function exportRemanentesExcel(remanentes: Remanente[], filename: string) {
  const data = remanentes.map((r) => ({
    "Tarjeta": r.tarjeta,
    "Estado": r.estado,
    "Saldo Final": r.saldoFinal,
    "Saldo No Devuelto": r.saldoNoDevuelto,
    "Fecha Venta": r.fechaVenta,
    "Fecha Vencimiento": r.fechaVencimiento,
    "Fecha Vencimiento +1": r.fechaVencimientoMasUno,
    "Reposición": r.reposicion ? "Sí" : "No",
    "ID Origen": r.idOrigen,
    "Subtipo": r.subtipo,
    "Saldo Actual": r.saldo,
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Remanentes");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Export remanentes to PDF (with all new fields)
export function exportRemanentesPDF(remanentes: Remanente[], filename: string) {
  const doc = new jsPDF("landscape");
  
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("REPORTE EJECUTIVO DE REMANENTES", 14, 15);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")} ${new Date().toLocaleTimeString("es-CO")}`, 14, 22);
  doc.text(`Total Registros: ${remanentes.length}`, 14, 28);
  
  // Summary boxes logic
  const porSolicitar = remanentes.filter((r) =>
    r.estado.toLowerCase().includes("por solicitar")
  ).length;
  const totalSaldoNoDevuelto = remanentes.reduce(
    (sum, r) => sum + (r.saldoNoDevuelto || 0),
    0
  );
  
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `RESUMEN: Por solicitar: ${porSolicitar} | Saldo total no devuelto: ${formatCurrency(totalSaldoNoDevuelto)}`,
    14,
    35
  );
  
  const tableData = remanentes.map((r) => [
    r.tarjeta,
    r.estado,
    formatCurrency(r.monto),
    formatCurrency(r.saldoFinal),
    formatCurrency(r.saldoNoDevuelto),
    r.fechaVenta,
    r.fechaVencimiento,
    r.subtipo,
    formatCurrency(r.saldo),
  ]);
  
  autoTable(doc, {
    head: [
      [
        "Tarjeta",
        "Estado",
        "Monto Asig.",
        "Saldo Final",
        "Saldo No Dev.",
        "F. Venta",
        "F. Venc.",
        "Subtipo",
        "Saldo Act.",
      ],
    ],
    body: tableData,
    startY: 42,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" }, // Slate-900
    alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
  });
  
  doc.save(`${filename}.pdf`);
}

// Export datáfonos to CSV — uses the same column structure as the import format
export function exportDatafonosCSV(datafonos: Datafono[], centros: CentroComercial[]) {
  const data = datafonos.map((d) => ({
    "Datáfono": d.codEstablecimiento,
    "Marca": d.nombreComercio || d.marca || "",
    "Centro Comercial": centros.find((c) => c.id === d.centroId)?.nombre || "",
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "datafonos.csv";
  link.click();
}

// Export unique datáfonos report
export function exportDatafonosUnicosExcel(
  transacciones: Transaccion[],
  centros: CentroComercial[],
  filename: string
) {
  const datafonosPorCentro = new Map<string, Set<string>>();
  
  transacciones.forEach((t) => {
    const existing = datafonosPorCentro.get(t.centroId) || new Set();
    existing.add(t.codEstablecimiento);
    datafonosPorCentro.set(t.centroId, existing);
  });
  
  const data: { Centro: string; "Datáfonos únicos": number; Datáfonos: string }[] = [];
  
  centros.forEach((centro) => {
    const datafonos = datafonosPorCentro.get(centro.id);
    if (datafonos && datafonos.size > 0) {
      data.push({
        "Centro": centro.nombre,
        "Datáfonos únicos": datafonos.size,
        "Datáfonos": Array.from(datafonos).join(", "),
      });
    }
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datáfonos Únicos");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Export unique datáfonos report to PDF
export function exportDatafonosUnicosPDF(
  transacciones: Transaccion[],
  centros: CentroComercial[],
  filename: string
) {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Reporte de Datáfonos Únicos por Centro", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, 14, 22);
  
  const datafonosPorCentro = new Map<string, Set<string>>();
  
  transacciones.forEach((t) => {
    const existing = datafonosPorCentro.get(t.centroId) || new Set();
    existing.add(t.codEstablecimiento);
    datafonosPorCentro.set(t.centroId, existing);
  });
  
  const tableData: string[][] = [];
  
  centros.forEach((centro) => {
    const datafonos = datafonosPorCentro.get(centro.id);
    if (datafonos && datafonos.size > 0) {
      tableData.push([
        centro.nombre,
        datafonos.size.toString(),
        Array.from(datafonos).slice(0, 5).join(", ") + (datafonos.size > 5 ? "..." : ""),
      ]);
    }
  });
  
  autoTable(doc, {
    head: [["Centro Comercial", "Datáfonos Únicos", "Muestra"]],
    body: tableData,
    startY: 30,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  doc.save(`${filename}.pdf`);
}
