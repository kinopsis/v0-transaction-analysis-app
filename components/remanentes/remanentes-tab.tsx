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
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { FileUploadArea } from "@/components/layout/header";
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

export function RemanentesTab() {
  const { state, dispatch } = useAppStore();
  const [tarjetaFilter, setTarjetaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string | undefined>();
  const [subtipoFilter, setSubtipoFilter] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const pageSize = 20;

  // Unique values for filters
  const uniqueEstados = useMemo(() => {
    return Array.from(new Set(state.remanentes.map((r) => r.estado))).filter(
      Boolean
    );
  }, [state.remanentes]);

  const uniqueSubtipos = useMemo(() => {
    return Array.from(new Set(state.remanentes.map((r) => r.subtipo))).filter(
      Boolean
    );
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
      return true;
    });
  }, [state.remanentes, tarjetaFilter, estadoFilter, subtipoFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRemanentes.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRemanentes = filteredRemanentes.slice(
    startIndex,
    startIndex + pageSize
  );

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

    return {
      total: state.remanentes.length,
      porSolicitar: porSolicitar.length,
      vendidas: vendidas.length,
      otros: state.remanentes.length - porSolicitar.length - vendidas.length,
      totalSaldoNoDevuelto,
      totalSaldoActual,
    };
  }, [state.remanentes]);

  // Calculate correlation with transactions
  const matchingTarjetas = useMemo(() => {
    const transactionTarjetas = new Set(
      state.transacciones.map((t) => t.tarjeta)
    );
    const remanenteTarjetas = new Set(state.remanentes.map((r) => r.tarjeta));
    let count = 0;
    remanenteTarjetas.forEach((t) => {
      if (transactionTarjetas.has(t)) count++;
    });
    return count;
  }, [state.transacciones, state.remanentes]);

  // Handle import with comprehensive feedback
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

        // Build detailed description
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
            description:
              descParts.length > 0 ? descParts.join(" · ") : undefined,
          }
        );

        // Warn about duplicates
        if (duplicates > 0) {
          toast.warning(`${duplicates} registros duplicados omitidos`, {
            description:
              "Tarjetas con el mismo número + ID origen ya existentes",
          });
        }

        // Show validation errors if any
        if (errors.length > 0) {
          const sample = errors.slice(0, 3);
          const extra = errors.length > 3 ? ` y ${errors.length - 3} más` : "";
          toast.error(`${errors.length} fila(s) con errores de validación`, {
            description: `${sample.map((e) => `Fila ${e.fila}: ${e.mensaje}`).join("; ")}${extra}`,
            duration: 10000,
          });
        }
      } else if (duplicates > 0 && remanentes.length === 0) {
        toast.warning(
          "Todos los remanentes del archivo ya están registrados",
          {
            description: `${duplicates} duplicados detectados por Tarjeta + ID origen`,
          }
        );
      } else if (errors.length > 0) {
        const sample = errors.slice(0, 3);
        toast.error("No se pudieron importar remanentes", {
          description: `${errors.length} errores de validación. ${sample.map((e) => `Fila ${e.fila}: ${e.mensaje}`).join("; ")}`,
          duration: 10000,
        });
      } else {
        toast.error("No se pudieron importar remanentes", {
          description: "El archivo no contiene datos válidos",
        });
      }
    } catch (error) {
      toast.error("Error al procesar el archivo", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
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

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  // Get badge variant for estado
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
    return (
      <Badge variant="secondary">
        {estado}
      </Badge>
    );
  };

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
                    <p className="text-sm text-muted-foreground">
                      Procesando archivo...
                    </p>
                    <Progress value={33} className="w-48" />
                  </div>
                ) : (
                  <FileUploadArea
                    onFileSelect={handleImport}
                    description="Arrastra un archivo Excel o CSV con columnas: Monto, # Tarjeta, Saldo Final, Estado, Fecha Venta, Fecha Vencimiento, Id, Subtipo, Saldo"
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
                        <TableHead className="text-destructive">
                          # Tarjeta *
                        </TableHead>
                        <TableHead>Saldo Final</TableHead>
                        <TableHead className="text-destructive">
                          Estado *
                        </TableHead>
                        <TableHead>Saldo no devuelto</TableHead>
                        <TableHead className="text-destructive">
                          Fecha Venta *
                        </TableHead>
                        <TableHead className="text-destructive">
                          Fecha Vencimiento *
                        </TableHead>
                        <TableHead className="text-destructive">Id *</TableHead>
                        <TableHead>Subtipo</TableHead>
                        <TableHead>Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-xs">
                          cien mil pesos
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          5332950012396846
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {"100.000,00"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          Remanente por solicitar
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {"100.000,00"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          2025-04-08
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          2026-04-09
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          1457543
                        </TableCell>
                        <TableCell className="font-mono text-xs">D3D</TableCell>
                        <TableCell className="font-mono text-xs">
                          $ -
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="mb-2 text-sm font-medium">Validaciones aplicadas</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• # Tarjeta: debe ser exactamente 16 dígitos numéricos</li>
                      <li>• Id: identificador único requerido</li>
                      <li>• Fecha Venta/Vencimiento: formato YYYY-MM-DD</li>
                      <li>• Estado: campo obligatorio</li>
                      <li>• Duplicados: se detectan por Tarjeta + Id</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="mb-2 text-sm font-medium">Estados reconocidos</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        Remanente por solicitar
                      </li>
                      <li className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Vendida
                      </li>
                      <li className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-muted-foreground" />
                        Otros estados
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Remanentes
                  </p>
                  <p className="text-2xl font-bold">
                    {formatNumber(summaryStats.total)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-amber-600">
                    Por Solicitar
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatNumber(summaryStats.porSolicitar)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-emerald-600">
                    Vendidas
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatNumber(summaryStats.vendidas)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Saldo No Devuelto
                  </p>
                  <p className="text-xl font-bold">
                    {formatCurrency(summaryStats.totalSaldoNoDevuelto)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Saldo Actual
                  </p>
                  <p className="text-xl font-bold">
                    {formatCurrency(summaryStats.totalSaldoActual)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Import more + Correlation badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isImporting ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Importando...
                    </span>
                  </div>
                ) : (
                  <FileUploadArea
                    onFileSelect={handleImport}
                    description="Importar más remanentes"
                  />
                )}
              </div>
              {matchingTarjetas > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="cursor-help text-sm"
                      >
                        {matchingTarjetas} tarjetas coinciden con transacciones
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Tarjetas de remanentes que también aparecen en
                        transacciones
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Filters */}
            <Card className="border-border bg-card">
              <CardContent className="flex flex-wrap items-end gap-4 pt-4">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Buscar tarjeta
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número de tarjeta..."
                      value={tarjetaFilter}
                      onChange={(e) => {
                        setTarjetaFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-secondary pl-8"
                    />
                  </div>
                </div>
                <div className="w-56">
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
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      {uniqueEstados.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Subtipo
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
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    disabled={filteredRemanentes.length === 0}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={filteredRemanentes.length === 0}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
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
                        <TableCell className="text-xs">
                          {formatDate(r.fechaVenta)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(r.fechaVencimiento)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.idOrigen}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.subtipo}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.saldo > 0 ? (
                            <span className="font-medium text-emerald-600">
                              {formatCurrency(r.saldo)}
                            </span>
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
                  Mostrando {startIndex + 1} -{" "}
                  {Math.min(startIndex + pageSize, filteredRemanentes.length)} de{" "}
                  {filteredRemanentes.length}
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
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
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
                <p className="text-sm text-muted-foreground">
                  No hay remanentes que coincidan con los filtros
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setTarjetaFilter("");
                    setEstadoFilter(undefined);
                    setSubtipoFilter(undefined);
                    setCurrentPage(1);
                  }}
                >
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
