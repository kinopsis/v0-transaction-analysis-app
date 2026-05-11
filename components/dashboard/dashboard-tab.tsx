"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { KPICards } from "./kpi-cards";
import { MonthlyChart } from "./monthly-chart";
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

  const monthlyData = useMemo(
    () => calculateMonthlyData(filteredTransacciones, state.centros),
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
            `${rejectedUnregistered} filas rechazadas por datáfono no registrado`
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
              "Transacciones con el mismo Cod. Autorización + Fecha ya existentes",
          });
        }

        // Error: códigos de establecimiento del CSV no coinciden con ningún datáfono registrado.
        // Regla de integridad: el "Código establecimiento" (8 dígitos) de la columna CSV
        // debe corresponder exactamente al número de datáfono registrado en Configuración.
        // Ambos son el mismo identificador de 8 dígitos numéricos.
        if (unregisteredCodes.length > 0) {
          const sample = unregisteredCodes.slice(0, 5).join(", ");
          const extra =
            unregisteredCodes.length > 5
              ? ` y ${unregisteredCodes.length - 5} más`
              : "";
          toast.error(
            `${rejectedUnregistered} fila(s) rechazadas — datáfono no registrado`,
            {
              description: `Los códigos de establecimiento: ${sample}${extra} no coinciden con ningún datáfono en Configuración → Datáfonos. El número de datáfono en la configuración debe ser exactamente igual al "Código establecimiento" del archivo (8 dígitos numéricos).`,
              duration: 10000,
            }
          );
        }
      } else if (
        rejectedUnregistered > 0 &&
        transacciones.length === 0 &&
        duplicates === 0
      ) {
        // All rows were rejected due to unregistered datafono codes
        const sample = unregisteredCodes.slice(0, 5).join(", ");
        const extra =
          unregisteredCodes.length > 5
            ? ` y ${unregisteredCodes.length - 5} más`
            : "";
        toast.error(
          "No se importaron transacciones — todos los datáfonos son desconocidos",
          {
            description: `Ningún "Código establecimiento" del archivo coincide con un datáfono registrado en Configuración. Registra los datáfonos con los códigos: ${sample}${extra} (exactamente 8 dígitos, igual al "Código establecimiento" del CSV).`,
            duration: 12000,
          }
        );
      } else if (duplicates > 0 && transacciones.length === 0) {
        toast.warning(
          "Todas las transacciones del archivo ya están registradas",
          {
            description: `${duplicates} duplicados detectados por Cod. Autorización + Fecha`,
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

        {/* Monthly Chart */}
        <div className="mt-6">
          <MonthlyChart
            data={monthlyData}
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
