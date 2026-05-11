"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DashboardTab() {
  const { state, dispatch } = useAppStore();
  const [selectedMes, setSelectedMes] = useState<number | undefined>();
  const [selectedAnio, setSelectedAnio] = useState<number | undefined>();
  const [selectedCentroIds, setSelectedCentroIds] = useState<string[]>([]);

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
        {/* Centro filter */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">
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

          {selectedCentroIds.length > 0 && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setSelectedCentroIds([])}
            >
              Limpiar filtro
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <KPICards data={kpis} />

        {/* Charts Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Transactions by Day Chart */}
          <TransactionsChart transacciones={filteredTransacciones} />

          {/* Top 10 Brands by Transaction Count */}
          <TopMarcasChart transacciones={filteredTransacciones} />
        </div>

        {/* Top 10 Comercios by Volume */}
        <div className="mt-6">
          <TopComerciosMontoChart transacciones={filteredTransacciones} />
        </div>

        {/* Monthly Trend Chart */}
        <div className="mt-6">
          <MonthlyChart
            dataVolumen={monthlyDataVolumen}
            dataTransacciones={monthlyDataTransacciones}
            centros={state.centros}
            selectedCentroIds={selectedCentroIds}
          />
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
    </div>
  );
}
