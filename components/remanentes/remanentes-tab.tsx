"use client";

import { useState, useMemo } from "react";
import { FileDown, Search, Info, ChevronLeft, ChevronRight } from "lucide-react";
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

export function RemanentesTab() {
  const { state, dispatch } = useAppStore();
  const [tarjetaFilter, setTarjetaFilter] = useState("");
  const [subtipoFilter, setSubtipoFilter] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const uniqueSubtipos = useMemo(() => {
    return Array.from(new Set(state.remanentes.map((r) => r.subtipo))).filter(
      Boolean
    );
  }, [state.remanentes]);

  const filteredRemanentes = useMemo(() => {
    return state.remanentes.filter((r) => {
      if (tarjetaFilter && !r.tarjeta.includes(tarjetaFilter)) {
        return false;
      }
      if (subtipoFilter && r.subtipo !== subtipoFilter) {
        return false;
      }
      return true;
    });
  }, [state.remanentes, tarjetaFilter, subtipoFilter]);

  const totalPages = Math.ceil(filteredRemanentes.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRemanentes = filteredRemanentes.slice(
    startIndex,
    startIndex + pageSize
  );

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

  const handleImport = async (file: File) => {
    try {
      const archivoId = generateId();
      const { remanentes, errors } = await importRemanentes(file, archivoId);

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

        toast.success(`${remanentes.length} remanentes importados correctamente`);
      } else {
        toast.error("No se pudieron importar remanentes");
      }
    } catch (error) {
      toast.error("Error al procesar el archivo", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
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
                <CardTitle className="text-base">Importar Remanentes</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadArea
                  onFileSelect={handleImport}
                  description="Arrastra un archivo Excel o CSV con columnas: Monto, Tarjeta, Id origen, Subtipo, Saldo"
                />
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
              <CardContent>
                <div className="rounded-lg bg-muted p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Monto</TableHead>
                        <TableHead>Tarjeta</TableHead>
                        <TableHead>Id origen</TableHead>
                        <TableHead>Subtipo</TableHead>
                        <TableHead>Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-xs">
                          150000
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          411111111111
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          REF123456
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          Devolución
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          50000
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Import more + Correlation badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FileUploadArea
                  onFileSelect={handleImport}
                  description="Importar más remanentes"
                />
              </div>
              {matchingTarjetas > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {matchingTarjetas} tarjetas coinciden con transacciones
                </Badge>
              )}
            </div>

            {/* Filters */}
            <Card className="border-border bg-card">
              <CardContent className="flex items-end gap-4 pt-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Buscar tarjeta
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por tarjeta..."
                      value={tarjetaFilter}
                      onChange={(e) => setTarjetaFilter(e.target.value)}
                      className="bg-secondary pl-8"
                    />
                  </div>
                </div>
                <div className="w-48">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Subtipo
                  </label>
                  <Select
                    value={subtipoFilter || "all"}
                    onValueChange={(v) =>
                      setSubtipoFilter(v === "all" ? undefined : v)
                    }
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
                <Button variant="outline" size="sm" onClick={handleExportExcel}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-border bg-card">
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
                  {currentRemanentes.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-right font-medium">
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
                <p className="text-sm text-muted-foreground">
                  No hay remanentes que coincidan con los filtros
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
