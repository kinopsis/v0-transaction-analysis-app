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
} from "@/lib/data-utils";
import { exportRemanentesExcel, exportRemanentesPDF } from "@/lib/export-utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

// Month names for display
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function RemanentesTab() {
  const { state, dispatch } = useAppStore();
  const [tarjetaFilter, setTarjetaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string | undefined>();
  const [subtipoFilter, setSubtipoFilter] = useState<string | undefined>();
  const [mesVencimientoFilter, setMesVencimientoFilter] = useState<string | undefined>();
  const [anioVencimientoFilter, setAnioVencimientoFilter] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const pageSize = 20;

  // Extract unique values for filters
  const uniqueEstados = useMemo(() => {
    return Array.from(new Set(state.remanentes.map((r) => r.estado))).filter(Boolean).sort();
  }, [state.remanentes]);

  const uniqueSubtipos = useMemo(() => {
    return Array.from(new Set(state.remanentes.map((r) => r.subtipo))).filter(Boolean).sort();
  }, [state.remanentes]);

  // Extract unique months and years from fechaVencimiento
  const vencimientoOptions = useMemo(() => {
    const monthYearSet = new Set<string>();
    const years = new Set<number>();
    
    state.remanentes.forEach((r) => {
      if (r.fechaVencimiento) {
        const [year, month] = r.fechaVencimiento.split("-").map(Number);
        if (year && month) {
          monthYearSet.add(`${year}-${month.toString().padStart(2, "0")}`);
          years.add(year);
        }
      }
    });

    const sortedMonthYears = Array.from(monthYearSet).sort();
    return {
      monthYears: sortedMonthYears,
      years: Array.from(years).sort((a, b) => b - a),
      months: Array.from({ length: 12 }, (_, i) => i + 1),
    };
  }, [state.remanentes]);

  // Calculate vencimientos por mes (for cards)
  const vencimientosPorMes = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    
    state.remanentes.forEach((r) => {
      if (r.fechaVencimiento) {
        const [year, month] = r.fechaVencimiento.split("-").map(Number);
        if (year && month) {
          const key = `${MONTH_NAMES[month - 1]} ${year}`;
          const existing = map.get(key) || { count: 0, total: 0 };
          map.set(key, {
            count: existing.count + 1,
            total: existing.total + (r.saldoNoDevuelto || 0),
          });
        }
      }
    });

    return Array.from(map.entries())
      .map(([mes, data]) => ({ mes, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [state.remanentes]);

  // Calculate tarjetas por comercio/subtipo
  const tarjetasPorComercio = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    
    state.remanentes.forEach((r) => {
      const comercio = r.subtipo || "Sin subtipo";
      const existing = map.get(comercio) || { count: 0, total: 0 };
      map.set(comercio, {
        count: existing.count + 1,
        total: existing.total + (r.saldoNoDevuelto || 0),
      });
    });

    return Array.from(map.entries())
      .map(([comercio, data]) => ({ comercio, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [state.remanentes]);

  // Filtered remanentes
  const filteredRemanentes = useMemo(() => {
    return state.remanentes.filter((r) => {
      if (tarjetaFilter && !r.tarjeta.includes(tarjetaFilter)) {
        return false;
      }
      if (estadoFilter && r.estado !== estadoFilter) {
        return false;
      }
      if (subtipoFilter && r.subtipo !== subtipoFilter) {
        return false;
      }
      if (mesVencimientoFilter || anioVencimientoFilter) {
        if (!r.fechaVencimiento) return false;
        const [year, month] = r.fechaVencimiento.split("-").map(Number);
        if (mesVencimientoFilter && month !== parseInt(mesVencimientoFilter)) {
          return false;
        }
        if (anioVencimientoFilter && year !== parseInt(anioVencimientoFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [state.remanentes, tarjetaFilter, estadoFilter, subtipoFilter, mesVencimientoFilter, anioVencimientoFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRemanentes.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRemanentes = filteredRemanentes.slice(startIndex, startIndex + pageSize);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const porSolicitar = state.remanentes.filter((r) =>
      r.estado.toLowerCase().includes("por solicitar")
    );
    const vendidas = state.remanentes.filter((r) =>
      r.estado.toLowerCase().includes("vendida")
    );
    const totalSaldoNoDevuelto = state.remanentes.reduce(
      (sum, r) => sum + (r.saldoNoDevuelto || 0),
      0
    );
    const totalSaldoActual = state.remanentes.reduce(
      (sum, r) => sum + (r.saldo || 0),
      0
    );

    // Proximos vencimientos (next 30 days)
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const proximosVencer = state.remanentes.filter((r) => {
      if (!r.fechaVencimiento) return false;
      const vencDate = new Date(r.fechaVencimiento);
      return vencDate >= today && vencDate <= in30Days;
    });

    return {
      total: state.remanentes.length,
      porSolicitar: porSolicitar.length,
      vendidas: vendidas.length,
      otros: state.remanentes.length - porSolicitar.length - vendidas.length,
      totalSaldoNoDevuelto,
      totalSaldoActual,
      proximosVencer: proximosVencer.length,
      montoProximosVencer: proximosVencer.reduce((sum, r) => sum + (r.saldoNoDevuelto || 0), 0),
    };
  }, [state.remanentes]);

  // Calculate correlation with transactions
  const matchingTarjetas = useMemo(() => {
    const transactionTarjetas = new Set(state.transacciones.map((t) => t.tarjeta));
    const remanenteTarjetas = new Set(state.remanentes.map((r) => r.tarjeta));
    let count = 0;
    remanenteTarjetas.forEach((t) => {
      if (transactionTarjetas.has(t)) count++;
    });
    return count;
  }, [state.transacciones, state.remanentes]);

  // Handle import with relaxed validation (warnings instead of blocking)
  const handleImport = async (file: File) => {
    setIsImporting(true);

    try {
      const archivoId = generateId();
      const { remanentes, errors, duplicates, summary } = await importRemanentes(
        file,
        archivoId,
        state.remanentes
      );

      if (remanentes.length > 0) {
        dispatch({ type: "ADD_REMANENTES", payload: remanentes });
        dispatch({
          type: "ADD_ARCHIVO",
          payload: {
            id: archivoId,
            nombre: file.name,
            tipo: "remanente",
            fechaCarga: new Date().toISOString(),
            totalRegistros: remanentes.length,
            errores: errors.length,
          },
        });

        const descParts: string[] = [];
        if (summary.porSolicitar > 0)
          descParts.push(`${summary.porSolicitar} por solicitar`);
        if (summary.vendidas > 0) descParts.push(`${summary.vendidas} vendidas`);
        if (summary.otrosEstados > 0)
          descParts.push(`${summary.otrosEstados} otros estados`);
        if (duplicates > 0)
          descParts.push(`${duplicates} duplicados omitidos`);

        toast.success(
          `${remanentes.length} remanentes importados correctamente`,
          {
            description: descParts.length > 0 ? descParts.join(" | ") : undefined,
          }
        );

        if (duplicates > 0) {
          toast.warning(`${duplicates} registros duplicados omitidos`, {
            description: "Tarjetas con el mismo numero + ID origen ya existentes",
          });
        }

        // Show validation errors as warnings (not blocking)
        if (errors.length > 0) {
          const sample = errors.slice(0, 3);
          const extra = errors.length > 3 ? ` y ${errors.length - 3} mas` : "";
          toast.warning(`${errors.length} fila(s) con advertencias`, {
            description: `${sample.map((e) => `Fila ${e.fila}: ${e.mensaje}`).join("; ")}${extra}`,
            duration: 8000,
          });
        }
      } else if (duplicates > 0 && remanentes.length === 0) {
        toast.warning("Todos los remanentes del archivo ya estan registrados", {
          description: `${duplicates} duplicados detectados por Tarjeta + ID origen`,
        });
      } else if (errors.length > 0) {
        const sample = errors.slice(0, 3);
        toast.error("No se pudieron importar remanentes", {
          description: `${errors.length} errores de validacion. ${sample.map((e) => `Fila ${e.fila}: ${e.mensaje}`).join("; ")}`,
          duration: 10000,
        });
      } else {
        toast.error("No se pudieron importar remanentes", {
          description: "El archivo no contiene datos validos",
        });
      }
    } catch (error) {
      toast.error("Error al procesar el archivo", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportExcel = () => {
    exportRemanentesExcel(
      filteredRemanentes,
      `remanentes-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportPDF = () => {
    exportRemanentesPDF(
      filteredRemanentes,
      `remanentes-${new Date().toISOString().split("T")[0]}`
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const getEstadoBadge = (estado: string) => {
    const lower = estado.toLowerCase();
    if (lower.includes("por solicitar")) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Clock className="mr-1 h-3 w-3" />
          {estado}
        </Badge>
      );
    }
    if (lower.includes("vendida")) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {estado}
        </Badge>
      );
    }
    return <Badge variant="secondary">{estado}</Badge>;
  };

  const clearAllFilters = () => {
    setTarjetaFilter("");
    setEstadoFilter(undefined);
    setSubtipoFilter(undefined);
    setMesVencimientoFilter(undefined);
    setAnioVencimientoFilter(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = tarjetaFilter || estadoFilter || subtipoFilter || mesVencimientoFilter || anioVencimientoFilter;

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Remanentes"
        subtitle={`${formatNumber(state.remanentes.length)} remanentes cargados`}
      />

      <div className="flex-1 overflow-auto p-6">
        {state.remanentes.length === 0 ? (
          <div className="space-y-6">
            {/* Import area */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-4 w-4" />
                  Importar Remanentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isImporting ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/50 p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Procesando archivo...</p>
                    <Progress value={33} className="w-48" />
                  </div>
                ) : (
                  <FileUploadArea
                    onFileSelect={handleImport}
                    description="Arrastra un archivo Excel o CSV con remanentes. La importacion es flexible y permite datos parciales."
                  />
                )}
              </CardContent>
            </Card>

            {/* Format guide */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Formato esperado del archivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  El archivo debe contener las siguientes columnas. Las columnas marcadas con <span className="text-destructive">*</span> son obligatorias.
                </p>
                <div className="overflow-x-auto rounded-lg bg-muted p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Monto</TableHead>
                        <TableHead className="text-destructive"># Tarjeta *</TableHead>
                        <TableHead>Saldo Final</TableHead>
                        <TableHead className="text-destructive">Estado *</TableHead>
                        <TableHead>Saldo no devuelto</TableHead>
                        <TableHead className="text-destructive">Fecha Venta *</TableHead>
                        <TableHead className="text-destructive">Fecha Vencimiento *</TableHead>
                        <TableHead className="text-destructive">Id *</TableHead>
                        <TableHead>Subtipo</TableHead>
                        <TableHead>Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-xs">cien mil pesos</TableCell>
                        <TableCell className="font-mono text-xs">5332950012396846</TableCell>
                        <TableCell className="font-mono text-xs">{"100.000,00"}</TableCell>
                        <TableCell className="font-mono text-xs">Remanente por solicitar</TableCell>
                        <TableCell className="font-mono text-xs">{"100.000,00"}</TableCell>
                        <TableCell className="font-mono text-xs">2025-04-08</TableCell>
                        <TableCell className="font-mono text-xs">2026-04-09</TableCell>
                        <TableCell className="font-mono text-xs">1457543</TableCell>
                        <TableCell className="font-mono text-xs">D3D</TableCell>
                        <TableCell className="font-mono text-xs">$ -</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Info Cards - Row 1: Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Remanentes</p>
                      <p className="text-2xl font-bold">{formatNumber(summaryStats.total)}</p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-amber-600">Por Solicitar</p>
                      <p className="text-2xl font-bold text-amber-600">{formatNumber(summaryStats.porSolicitar)}</p>
                    </div>
                    <div className="rounded-full bg-amber-500/10 p-3">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-destructive">Vencen en 30 dias</p>
                      <p className="text-2xl font-bold text-destructive">{formatNumber(summaryStats.proximosVencer)}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(summaryStats.montoProximosVencer)}</p>
                    </div>
                    <div className="rounded-full bg-destructive/10 p-3">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Saldo No Devuelto</p>
                      <p className="text-xl font-bold">{formatCurrency(summaryStats.totalSaldoNoDevuelto)}</p>
                    </div>
                    <div className="rounded-full bg-emerald-500/10 p-3">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Info Cards - Row 2: Vencimientos por Mes & Tarjetas por Comercio */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Vencimientos por Mes */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-primary" />
                    Vencimientos por Mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vencimientosPorMes.length > 0 ? (
                    <div className="space-y-2">
                      {vencimientosPorMes.map((item) => (
                        <div key={item.mes} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.mes}</span>
                            <Badge variant="secondary" className="text-xs">{item.count} tarjetas</Badge>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay datos de vencimientos</p>
                  )}
                </CardContent>
              </Card>

              {/* Tarjetas por Comercio */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Store className="h-4 w-4 text-primary" />
                    Tarjetas por Comercio (Subtipo)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tarjetasPorComercio.length > 0 ? (
                    <div className="space-y-2">
                      {tarjetasPorComercio.map((item) => (
                        <div key={item.comercio} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">{item.comercio}</Badge>
                            <span className="text-xs text-muted-foreground">{item.count} tarjetas</span>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay datos de comercios</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Import more + Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {isImporting ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Importando...</span>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImport(file);
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar remanentes
                      </span>
                    </Button>
                  </label>
                )}
              </div>
              <div className="flex items-center gap-2">
                {matchingTarjetas > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="cursor-help text-sm">
                          <BarChart3 className="mr-1 h-3 w-3" />
                          {matchingTarjetas} tarjetas coinciden con transacciones
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tarjetas de remanentes que tambien aparecen en transacciones</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Filters Section - Always visible */}
            <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Filter className="h-4 w-4" />
                      Filtros
                    </CardTitle>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                        Limpiar todos
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    {/* Buscar Tarjeta */}
                    <div className="lg:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Buscar tarjeta
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por numero de tarjeta..."
                          value={tarjetaFilter}
                          onChange={(e) => {
                            setTarjetaFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="bg-secondary pl-8"
                        />
                      </div>
                    </div>

                    {/* Mes Vencimiento */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        Mes Vencimiento
                      </label>
                      <Select
                        value={mesVencimientoFilter || "all"}
                        onValueChange={(v) => {
                          setMesVencimientoFilter(v === "all" ? undefined : v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los meses</SelectItem>
                          {vencimientoOptions.months.map((m) => (
                            <SelectItem key={m} value={m.toString()}>
                              {MONTH_NAMES[m - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ano Vencimiento */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Ano Vencimiento
                      </label>
                      <Select
                        value={anioVencimientoFilter || "all"}
                        onValueChange={(v) => {
                          setAnioVencimientoFilter(v === "all" ? undefined : v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los anos</SelectItem>
                          {vencimientoOptions.years.map((y) => (
                            <SelectItem key={y} value={y.toString()}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Estado */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Estado
                      </label>
                      <Select
                        value={estadoFilter || "all"}
                        onValueChange={(v) => {
                          setEstadoFilter(v === "all" ? undefined : v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          {uniqueEstados.map((e) => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subtipo / Comercio */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        <Store className="mr-1 inline h-3 w-3" />
                        Comercio (Subtipo)
                      </label>
                      <Select
                        value={subtipoFilter || "all"}
                        onValueChange={(v) => {
                          setSubtipoFilter(v === "all" ? undefined : v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {uniqueSubtipos.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Active filters summary and export */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {hasActiveFilters && (
                        <span className="text-xs text-muted-foreground">
                          Filtros activos: {filteredRemanentes.length} de {state.remanentes.length} remanentes
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredRemanentes.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredRemanentes.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Table */}
            <Card className="border-border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarjeta</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Saldo Final</TableHead>
                      <TableHead className="text-right">Saldo No Devuelto</TableHead>
                      <TableHead>Fecha Venta</TableHead>
                      <TableHead>Fecha Vencimiento</TableHead>
                      <TableHead>ID Origen</TableHead>
                      <TableHead>Subtipo</TableHead>
                      <TableHead className="text-right">Saldo Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRemanentes.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          {r.tarjeta.slice(0, 4)}****{r.tarjeta.slice(-4)}
                        </TableCell>
                        <TableCell>{getEstadoBadge(r.estado)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(r.saldoFinal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(r.saldoNoDevuelto)}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(r.fechaVenta)}</TableCell>
                        <TableCell className="text-xs">{formatDate(r.fechaVencimiento)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.idOrigen}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.subtipo}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.saldo > 0 ? (
                            <span className="font-medium text-emerald-600">{formatCurrency(r.saldo)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} - {Math.min(startIndex + pageSize, filteredRemanentes.length)} de {filteredRemanentes.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {filteredRemanentes.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12">
                <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No hay remanentes que coincidan con los filtros</p>
                <Button variant="link" size="sm" className="mt-2" onClick={clearAllFilters}>
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
