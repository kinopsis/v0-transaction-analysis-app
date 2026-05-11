"use client";

import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { KPICards } from "./kpi-cards";
import { MonthlyChart } from "./monthly-chart";
import { TransactionsChart } from "./transactions-chart";
import { TopMarcasChart } from "./top-marcas-chart";
import { TopComerciosMontoChart } from "./top-comercios-monto-chart";
import { useAppStore } from "@/lib/store";
import {
  importTransacciones,
  filterTransacciones,
  calculateKPIs,
  calculateMonthlyData,
  generateId,
  getPeriodString,
} from "@/lib/data-utils";
import { exportDashboardToPdf } from "@/lib/pdf-export";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function DashboardTab() {
  const { state, dispatch } = useAppStore();
  const [selectedMes, setSelectedMes] = useState<number | undefined>();
  const [selectedAnio, setSelectedAnio] = useState<number | undefined>();
  const [selectedCentroIds, setSelectedCentroIds] = useState<string[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const chartsContainerRef = useRef<HTMLDivElement>(null);

  const filteredTransacciones = useMemo(() => {
    return filterTransacciones(state.transacciones, {
      centroIds: selectedCentroIds,
      mes: selectedMes,
      anio: selectedAnio,
    });
  }, [state.transacciones, selectedCentroIds, selectedMes, selectedAnio]);

  const kpis = useMemo(
    () => calculateKPIs(filteredTransacciones),
    [filteredTransacciones]
  );

  const monthlyDataVolumen = useMemo(
    () => calculateMonthlyData(filteredTransacciones, state.centros, "volumen"),
    [filteredTransacciones, state.centros]
  );

  const monthlyDataTransacciones = useMemo(
    () => calculateMonthlyData(filteredTransacciones, state.centros, "transacciones"),
    [filteredTransacciones, state.centros]
  );

  const handleImport = async (file: File) => {
    try {
      const archivoId = generateId();
      const {
        transacciones,
        errors,
        duplicates,
        unregisteredCodes,
        rejectedUnregistered,
      } = await importTransacciones(
        file,
        state.datafonos,
        state.centros,
        archivoId,
        state.transacciones
      );

      if (transacciones.length > 0) {
        dispatch({ type: "ADD_TRANSACCIONES", payload: transacciones });
        dispatch({
          type: "ADD_ARCHIVO",
          payload: {
            id: archivoId,
            nombre: file.name,
            tipo: "transaccion",
            fechaCarga: new Date().toISOString(),
            periodo: getPeriodString(transacciones),
            totalRegistros: transacciones.length,
            errores: errors.length,
          },
        });

        const descParts: string[] = [];
        if (duplicates > 0)
          descParts.push(`${duplicates} duplicados ignorados`);
        if (rejectedUnregistered > 0)
          descParts.push(
            `${rejectedUnregistered} transacciones con datafono no registrado (resaltadas)`
          );

        toast.success(
          `${transacciones.length} transacciones importadas correctamente`,
          {
            description:
              descParts.length > 0 ? descParts.join(" · ") : undefined,
          }
        );

        // Warn about duplicate transactions
        if (duplicates > 0) {
          toast.warning(`${duplicates} registros duplicados omitidos`, {
            description:
              "Transacciones con la misma Fecha + Tarjeta + Cod. Autorización ya existentes",
          });
        }

        // Warn (not error) about unregistered datafono codes - transactions ARE imported but flagged
        if (unregisteredCodes.length > 0) {
          const sample = unregisteredCodes.slice(0, 5).join(", ");
          const extra =
            unregisteredCodes.length > 5
              ? ` y ${unregisteredCodes.length - 5} mas`
              : "";
          toast.warning(
            `${rejectedUnregistered} transaccion(es) con datafono no registrado`,
            {
              description: `Los codigos: ${sample}${extra} no coinciden con ningun datafono en Configuracion. Estas transacciones se importaron pero estan resaltadas en la tabla para correccion manual.`,
              duration: 10000,
            }
          );
        }
      } else if (duplicates > 0 && transacciones.length === 0) {
        toast.warning(
          "Todas las transacciones del archivo ya están registradas",
          {
            description: `${duplicates} duplicados detectados por Fecha + Tarjeta + Cod. Autorización`,
          }
        );
      } else {
        toast.error("No se pudieron importar transacciones", {
          description:
            errors.length > 0
              ? `${errors.length} errores encontrados en el archivo`
              : "El archivo no contiene datos válidos",
        });
      }
    } catch (error) {
      toast.error("Error al procesar el archivo", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    }
  };

  const handleCentroChange = (centroId: string) => {
    if (centroId === "all") {
      setSelectedCentroIds([]);
    } else {
      setSelectedCentroIds([centroId]);
    }
  };

  const handleExportClick = () => {
    if (selectedCentroIds.length > 0) {
      // If a centro is selected, ask if they want to include transactions
      setShowExportDialog(true);
    } else {
      // If no centro selected, export without transactions
      handleExportPdf(false);
    }
  };

  const handleExportPdf = async (withTransactions: boolean) => {
    setIsExporting(true);
    setShowExportDialog(false);
    
    try {
      const centroNombre = selectedCentroIds.length > 0
        ? state.centros.find((c) => c.id === selectedCentroIds[0])?.nombre
        : undefined;

      const fechaGeneracion = new Date().toLocaleString("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
      });

      await exportDashboardToPdf({
        titulo: "Reporte de Dashboard",
        centroNombre,
        centroId: selectedCentroIds[0],
        mes: selectedMes,
        anio: selectedAnio,
        fechaGeneracion,
        incluirTransacciones: withTransactions,
        transacciones: withTransactions ? filteredTransacciones : filteredTransacciones,
        chartsContainer: chartsContainerRef.current,
        centros: state.centros,
      });

      toast.success("PDF exportado correctamente", {
        description: withTransactions
          ? `Reporte con ${filteredTransacciones.length} transacciones`
          : "Reporte de gráficos generado",
      });
    } catch (error) {
      toast.error("Error al exportar PDF", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsExporting(false);
      setIncludeTransactions(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Dashboard"
        subtitle={`${state.transacciones.length} transacciones cargadas`}
        showImport
        showPeriodFilter
        onImport={handleImport}
        selectedMes={selectedMes}
        selectedAnio={selectedAnio}
        onMesChange={setSelectedMes}
        onAnioChange={setSelectedAnio}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Filters Row - Aligned horizontally */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Centro Comercial:
            </span>
            <Select
              value={selectedCentroIds[0] || "all"}
              onValueChange={handleCentroChange}
            >
              <SelectTrigger className="w-48 bg-secondary">
                <SelectValue placeholder="Todos los centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {state.centros.map((centro) => (
                  <SelectItem key={centro.id} value={centro.id}>
                    {centro.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCentroIds.length > 0 && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
              onClick={() => setSelectedCentroIds([])}
            >
              Limpiar filtro
            </Badge>
          )}

          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={handleExportClick}
              disabled={isExporting || state.transacciones.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards data={kpis} />

        {/* Charts Container for PDF Export */}
        <div ref={chartsContainerRef}>
          {/* Charts Grid */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2" data-chart-export>
            {/* Transactions by Day Chart */}
            <TransactionsChart transacciones={filteredTransacciones} />

            {/* Top 10 Brands by Transaction Count */}
            <TopMarcasChart transacciones={filteredTransacciones} />
          </div>

          {/* Top 10 Comercios by Volume */}
          <div className="mt-6" data-chart-export>
            <TopComerciosMontoChart transacciones={filteredTransacciones} />
          </div>

          {/* Monthly Trend Chart */}
          <div className="mt-6" data-chart-export>
            <MonthlyChart
              dataVolumen={monthlyDataVolumen}
              dataTransacciones={monthlyDataTransacciones}
              centros={state.centros}
              selectedCentroIds={selectedCentroIds}
            />
          </div>
        </div>

        {/* No data state */}
        {state.transacciones.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12">
            <p className="mb-2 text-lg font-medium text-foreground">
              No hay transacciones cargadas
            </p>
            <p className="text-sm text-muted-foreground">
              Usa el botón &quot;Importar archivo&quot; para cargar un archivo
              Excel o CSV con transacciones
            </p>
          </div>
        )}
      </div>

      {/* Export PDF Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Reporte PDF</DialogTitle>
            <DialogDescription>
              Se generará un reporte con los gráficos del dashboard
              {selectedCentroIds.length > 0 && (
                <> para <strong>{state.centros.find((c) => c.id === selectedCentroIds[0])?.nombre}</strong></>
              )}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-transactions"
                checked={includeTransactions}
                onCheckedChange={(checked) => setIncludeTransactions(checked === true)}
              />
              <Label htmlFor="include-transactions" className="cursor-pointer">
                Incluir tabla de transacciones ({filteredTransacciones.length} registros)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Si incluyes las transacciones, se agregarán en páginas adicionales después de los gráficos.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleExportPdf(includeTransactions)}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
