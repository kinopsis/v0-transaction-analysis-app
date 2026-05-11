"use client";

import { useState, useMemo } from "react";
import {
  FileDown,
  Search,
  Info,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  Loader2,
  Calendar,
  CreditCard,
  Store,
  TrendingUp,
  Filter,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Header, FileUploadArea } from "@/components/layout/header";
import { useAppStore } from "@/lib/store";
import {
  importRemanentes,
  generateId,
  formatCurrency,
  formatNumber,
  MONTH_NAMES,
} from "@/lib/data-utils";
import { exportRemanentesPDF } from "@/lib/export-utils";
import { RemanentesFilters } from "./remanentes-filters";
import { RemanentesKPICards } from "./remanentes-kpi-cards";
import { RemanentesCharts } from "./remanentes-charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function RemanentesTab() {
  const { state, dispatch } = useAppStore();
  const [tarjetaFilter, setTarjetaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string | undefined>();
  const [subtipoFilter, setSubtipoFilter] = useState<string | undefined>();
  const [mesVencimientoFilter, setMesVencimientoFilter] = useState<string | undefined>();
  const [anioVencimientoFilter, setAnioVencimientoFilter] = useState<string | undefined>();
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 15;

  // --- Filter Logic ---
  const filteredRemanentes = useMemo(() => {
    return state.remanentes.filter((r) => {
      if (tarjetaFilter && !r.tarjeta.includes(tarjetaFilter)) return false;
      if (estadoFilter && r.estado !== estadoFilter) return false;
      if (subtipoFilter && r.subtipo !== subtipoFilter) return false;
      if (mesVencimientoFilter || anioVencimientoFilter) {
        if (!r.fechaVencimiento) return false;
        const [year, month] = r.fechaVencimiento.split("-").map(Number);
        if (mesVencimientoFilter && month !== parseInt(mesVencimientoFilter)) return false;
        if (anioVencimientoFilter && year !== parseInt(anioVencimientoFilter)) return false;
      }
      return true;
    });
  }, [state.remanentes, tarjetaFilter, estadoFilter, subtipoFilter, mesVencimientoFilter, anioVencimientoFilter]);

  // --- KPI & Chart Calculations ---
  const remanentesKPI = useMemo(() => {
    const total = filteredRemanentes.length;
    const porSolicitarList = filteredRemanentes.filter(r => r.estado.toLowerCase().includes("por solicitar"));
    const totalSaldoNoDevuelto = filteredRemanentes.reduce((sum, r) => sum + (r.saldoNoDevuelto || 0), 0);
    
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const proximos = filteredRemanentes.filter(r => {
      if (!r.fechaVencimiento) return false;
      const d = new Date(r.fechaVencimiento);
      return d >= today && d <= in30Days;
    });

    return {
      total,
      porSolicitar: porSolicitarList.length,
      montoPorSolicitar: porSolicitarList.reduce((sum, r) => sum + (r.saldoNoDevuelto || 0), 0),
      proximosVencer: proximos.length,
      montoProximosVencer: proximos.reduce((sum, r) => sum + (r.saldoNoDevuelto || 0), 0),
      totalSaldoNoDevuelto,
      promedioSaldo: total > 0 ? totalSaldoNoDevuelto / total : 0,
    };
  }, [filteredRemanentes]);

  // Chart Data: Cards per Assigned Monto
  const cardsPerMontoData = useMemo(() => {
    const map = new Map<number, number>();
    filteredRemanentes.forEach(r => {
      const m = r.monto || 0;
      map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([monto, count]) => ({ monto: formatCurrency(monto), count, val: monto }))
      .sort((a, b) => b.val - a.val);
  }, [filteredRemanentes]);

  // Chart Data: Saldo No Devuelto per assigned monto
  const saldoPerMontoData = useMemo(() => {
    const map = new Map<number, number>();
    filteredRemanentes.forEach(r => {
      const m = r.monto || 0;
      map.set(m, (map.get(m) || 0) + (r.saldoNoDevuelto || 0));
    });
    return Array.from(map.entries())
      .map(([monto, total]) => ({ monto: formatCurrency(monto), total, val: monto }))
      .sort((a, b) => b.val - a.val);
  }, [filteredRemanentes]);

  // Chart Data: Sales by Monto Timeline with Granularity
  const ventasPorMontoTimeline = useMemo(() => {
    const map = new Map<string, any>();
    
    filteredRemanentes.forEach(r => {
      if (r.fechaVenta) {
        const date = new Date(r.fechaVenta + "T00:00:00");
        let label = "";
        
        if (granularity === "day") {
          label = date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
        } else if (granularity === "week") {
          const start = new Date(date);
          start.setDate(date.getDate() - date.getDay());
          label = `Sem. ${start.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`;
        } else {
          label = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
        }
        
        const montoKey = formatCurrency(r.monto);
        const currentData = map.get(label) || { label, timestamp: date.getTime() };
        currentData[montoKey] = (currentData[montoKey] || 0) + 1;
        map.set(label, currentData);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredRemanentes, granularity]);

  // Extract unique montos for chart keys
  const uniqueMontos = useMemo(() => {
    const set = new Set<string>();
    filteredRemanentes.forEach(r => set.add(formatCurrency(r.monto)));
    return Array.from(set).sort();
  }, [filteredRemanentes]);

  // --- Handlers ---
  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const archivoId = generateId();
      const { remanentes } = await importRemanentes(file, archivoId, state.remanentes);
      if (remanentes.length > 0) {
        dispatch({ type: "ADD_REMANENTES", payload: remanentes });
        toast.success(`${remanentes.length} remanentes importados`);
      }
    } catch (e) {
      toast.error("Error al importar");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const filename = `Reporte_Remanentes_${new Date().toISOString().split('T')[0]}`;
      exportRemanentesPDF(filteredRemanentes, filename);
      toast.success("PDF generado exitosamente");
    } catch (error) {
      toast.error("Error al generar el PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const uniqueEstados = Array.from(new Set(state.remanentes.map(r => r.estado))).sort();
  const uniqueSubtipos = Array.from(new Set(state.remanentes.map(r => r.subtipo))).sort();
  const vencimientoOptions = {
    months: Array.from({ length: 12 }, (_, i) => i + 1),
    years: Array.from(new Set(state.remanentes.map(r => r.fechaVencimiento?.split("-")[0]).filter(Boolean).map(Number))).sort((a, b) => b - a),
  };

  const startIndex = (currentPage - 1) * pageSize;
  const currentRemanentes = filteredRemanentes.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredRemanentes.length / pageSize);

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Gestión de Remanentes"
        subtitle={`${formatNumber(state.remanentes.length)} registros cargados`}
        showImport
        onImport={handleImport}
      />

      <div className="flex-1 overflow-auto p-6 pt-2">
        {state.remanentes.length === 0 ? (
          <div className="flex h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/30 p-12 text-center shadow-inner">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No hay remanentes cargados</h3>
            <p className="mt-2 text-muted-foreground max-w-sm">
              Importa un archivo Excel o CSV para comenzar el análisis de tarjetas y vencimientos.
            </p>
            <Button onClick={() => document.querySelector<HTMLInputElement>("input[type='file']")?.click()} className="mt-6 gap-2">
              <Upload className="h-4 w-4" /> Importar Archivo
            </Button>
          </div>
        ) : (
          <>
            <RemanentesFilters
              tarjetaFilter={tarjetaFilter}
              onTarjetaChange={setTarjetaFilter}
              estadoFilter={estadoFilter}
              onEstadoChange={setEstadoFilter}
              uniqueEstados={uniqueEstados}
              subtipoFilter={subtipoFilter}
              onSubtipoChange={setSubtipoFilter}
              uniqueSubtipos={uniqueSubtipos}
              mesVencimientoFilter={mesVencimientoFilter}
              onMesChange={setMesVencimientoFilter}
              anioVencimientoFilter={anioVencimientoFilter}
              onAnioChange={setAnioVencimientoFilter}
              vencimientoOptions={vencimientoOptions}
              onExportPdf={handleExportPdf}
              isExporting={isExporting}
              hasData={filteredRemanentes.length > 0}
            />

            <RemanentesKPICards data={remanentesKPI} />

            <RemanentesCharts 
              cardsPerMonto={cardsPerMontoData}
              saldoPerMonto={saldoPerMontoData}
              ventasTimeline={ventasPorMontoTimeline}
              uniqueMontos={uniqueMontos}
              granularity={granularity}
              onGranularityChange={setGranularity}
            />

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-tight text-muted-foreground">Listado Detallado</h3>
                <Badge variant="outline" className="font-mono text-[10px]">{filteredRemanentes.length} Resultados</Badge>
              </div>
              <Card className="overflow-hidden border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow>
                        <TableHead className="w-[180px] font-bold">Tarjeta</TableHead>
                        <TableHead className="font-bold">Estado</TableHead>
                        <TableHead className="text-right font-bold">Monto Asig.</TableHead>
                        <TableHead className="text-right font-bold">Saldo No Dev.</TableHead>
                        <TableHead className="font-bold">Vencimiento</TableHead>
                        <TableHead className="font-bold">Subtipo</TableHead>
                        <TableHead className="text-right font-bold">Saldo Actual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentRemanentes.map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono font-medium">{r.tarjeta}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                r.estado.toLowerCase().includes("por solicitar") 
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30" 
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              }
                            >
                              {r.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(r.monto)}</TableCell>
                          <TableCell className="text-right text-destructive font-semibold">{formatCurrency(r.saldoNoDevuelto)}</TableCell>
                          <TableCell className="text-muted-foreground">{r.fechaVencimiento}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-[10px]">{r.subtipo}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-primary">{formatCurrency(r.saldo)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-secondary/10">
                    <p className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
