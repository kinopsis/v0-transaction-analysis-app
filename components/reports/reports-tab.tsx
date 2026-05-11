"use client";

import { useState, useMemo } from "react";
import { FileDown, FileText, Percent, Smartphone, Wallet } from "lucide-react";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/lib/store";
import {
  filterTransacciones,
  calculateComisionReporte,
  formatCurrency,
  formatNumber,
  formatDate,
} from "@/lib/data-utils";
import {
  exportTransaccionesExcel,
  exportTransaccionesPDF,
  exportComisionesExcel,
  exportComisionesPDF,
  exportDatafonosUnicosExcel,
  exportDatafonosUnicosPDF,
  exportRemanentesExcel,
  exportRemanentesPDF,
} from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MESES, YEARS } from "@/lib/constants";
import type { FilterState } from "@/lib/types";

type ReportType = "transacciones" | "comisiones" | "datafonos" | "remanentes";

const reportOptions = [
  {
    id: "transacciones" as const,
    label: "Transacciones Detalladas",
    icon: FileText,
  },
  { id: "comisiones" as const, label: "Comisiones y Cuota Fija", icon: Percent },
  { id: "datafonos" as const, label: "Datáfonos Únicos por Centro", icon: Smartphone },
  { id: "remanentes" as const, label: "Remanentes", icon: Wallet },
];

export function ReportsTab() {
  const { state } = useAppStore();
  const [selectedReport, setSelectedReport] =
    useState<ReportType>("transacciones");
  const [filters, setFilters] = useState<FilterState>({ centroIds: [] });

  const filteredTransacciones = useMemo(
    () => filterTransacciones(state.transacciones, filters),
    [state.transacciones, filters]
  );

  const comisionReporte = useMemo(
    () => calculateComisionReporte(filteredTransacciones, state.centros),
    [filteredTransacciones, state.centros]
  );

  const datafonosPorCentro = useMemo(() => {
    const map = new Map<string, Set<string>>();
    filteredTransacciones.forEach((t) => {
      const existing = map.get(t.centroId) || new Set();
      existing.add(t.codEstablecimiento);
      map.set(t.centroId, existing);
    });
    return map;
  }, [filteredTransacciones]);

  const handleExportExcel = () => {
    const date = new Date().toISOString().split("T")[0];
    switch (selectedReport) {
      case "transacciones":
        exportTransaccionesExcel(filteredTransacciones, `transacciones-${date}`);
        break;
      case "comisiones":
        exportComisionesExcel(comisionReporte, `comisiones-${date}`);
        break;
      case "datafonos":
        exportDatafonosUnicosExcel(
          filteredTransacciones,
          state.centros,
          `datafonos-unicos-${date}`
        );
        break;
      case "remanentes":
        exportRemanentesExcel(state.remanentes, `remanentes-${date}`);
        break;
    }
  };

  const handleExportPDF = () => {
    const date = new Date().toISOString().split("T")[0];
    switch (selectedReport) {
      case "transacciones":
        exportTransaccionesPDF(filteredTransacciones, `transacciones-${date}`);
        break;
      case "comisiones":
        exportComisionesPDF(comisionReporte, `comisiones-${date}`);
        break;
      case "datafonos":
        exportDatafonosUnicosPDF(
          filteredTransacciones,
          state.centros,
          `datafonos-unicos-${date}`
        );
        break;
      case "remanentes":
        exportRemanentesPDF(state.remanentes, `remanentes-${date}`);
        break;
    }
  };

  const totalComisiones = comisionReporte.reduce((acc, c) => acc + c.total, 0);

  return (
    <div className="flex h-full flex-col">
      <Header title="Reportes" subtitle="Genera y exporta reportes" />

      <div className="flex-1 overflow-auto p-6">
        {/* Report type selector */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {reportOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedReport === option.id;
            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-secondary"
                }`}
                onClick={() => setSelectedReport(option.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon
                    className={`h-5 w-5 ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {option.label}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters (for transaction-based reports) */}
        {selectedReport !== "remanentes" && (
          <Card className="mb-6 border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Filtrar período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Select
                  value={filters.mes?.toString() || "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      mes: v === "all" ? undefined : parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger className="w-40 bg-secondary">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.anio?.toString() || "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      anio: v === "all" ? undefined : parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger className="w-28 bg-secondary">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.centroIds[0] || "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      centroIds: v === "all" ? [] : [v],
                    }))
                  }
                >
                  <SelectTrigger className="w-48 bg-secondary">
                    <SelectValue placeholder="Centro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los centros</SelectItem>
                    {state.centros.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export buttons */}
        <div className="mb-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Report preview */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">
              {reportOptions.find((r) => r.id === selectedReport)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedReport === "transacciones" && (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tarjeta</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Cód. Estab.</TableHead>
                      <TableHead>Red Adq.</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Cod. Autoriz.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransacciones.slice(0, 50).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {formatDate(t.fecha)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {t.tarjeta}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {formatCurrency(t.valor)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {t.codEstablecimiento || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {t.redAdquirente || "-"}
                        </TableCell>
                        <TableCell>{t.nombreCentro}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {t.codAutorizacion || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredTransacciones.length > 50 && (
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Mostrando 50 de {filteredTransacciones.length} transacciones.
                    Exporta para ver todas.
                  </p>
                )}
              </div>
            )}

            {selectedReport === "comisiones" && (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centro Comercial</TableHead>
                      <TableHead className="text-right">Transacciones</TableHead>
                      <TableHead className="text-right">Volumen</TableHead>
                      <TableHead className="text-right">Comisión (2%)</TableHead>
                      <TableHead className="text-right">Cuota Fija</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comisionReporte.map((c) => (
                      <TableRow key={c.centroId}>
                        <TableCell className="font-medium">
                          {c.nombreCentro}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(c.totalTransacciones)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.volumen)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.comision)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.cuotaFija)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(c.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {comisionReporte.length > 0 && (
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatNumber(
                            comisionReporte.reduce(
                              (acc, c) => acc + c.totalTransacciones,
                              0
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(
                            comisionReporte.reduce((acc, c) => acc + c.volumen, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(
                            comisionReporte.reduce(
                              (acc, c) => acc + c.comision,
                              0
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(
                            comisionReporte.reduce(
                              (acc, c) => acc + c.cuotaFija,
                              0
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(totalComisiones)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {comisionReporte.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No hay datos de comisiones para el período seleccionado
                  </p>
                )}
              </div>
            )}

            {selectedReport === "datafonos" && (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centro Comercial</TableHead>
                      <TableHead className="text-right">
                        Datáfonos Únicos
                      </TableHead>
                      <TableHead>Muestra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.centros
                      .filter(
                        (c) =>
                          datafonosPorCentro.has(c.id) &&
                          datafonosPorCentro.get(c.id)!.size > 0
                      )
                      .map((centro) => {
                        const datafonos = datafonosPorCentro.get(centro.id)!;
                        return (
                          <TableRow key={centro.id}>
                            <TableCell className="font-medium">
                              {centro.nombre}
                            </TableCell>
                            <TableCell className="text-right">
                              {datafonos.size}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {Array.from(datafonos).slice(0, 3).join(", ")}
                              {datafonos.size > 3 && "..."}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
                {datafonosPorCentro.size === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No hay datáfonos registrados para el período seleccionado
                  </p>
                )}
              </div>
            )}

            {selectedReport === "remanentes" && (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Tarjeta</TableHead>
                      <TableHead>ID Origen</TableHead>
                      <TableHead>Subtipo</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.remanentes.slice(0, 50).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-right">
                          {formatCurrency(r.monto)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.tarjeta.slice(0, 4)}****{r.tarjeta.slice(-4)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.idOrigen}
                        </TableCell>
                        <TableCell>{r.subtipo}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(r.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {state.remanentes.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No hay remanentes cargados. Importa remanentes desde la
                    pestaña correspondiente.
                  </p>
                )}
                {state.remanentes.length > 50 && (
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Mostrando 50 de {state.remanentes.length} remanentes. Exporta
                    para ver todos.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
