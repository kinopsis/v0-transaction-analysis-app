"use client";

import { Filter, Search, FileDown, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MESES, YEARS } from "@/lib/constants";
import type { CentroComercial } from "@/lib/types";

interface DashboardFiltersProps {
  centros: CentroComercial[];
  selectedCentroId?: string;
  onCentroChange: (centroId: string | undefined) => void;
  selectedMes?: number;
  onMesChange: (mes: number | undefined) => void;
  selectedAnio?: number;
  onAnioChange: (anio: number | undefined) => void;
  onExportPdf: () => void;
  isExporting?: boolean;
  hasData: boolean;
}

export function DashboardFilters({
  centros,
  selectedCentroId,
  onCentroChange,
  selectedMes,
  onMesChange,
  selectedAnio,
  onAnioChange,
  onExportPdf,
  isExporting,
  hasData,
}: DashboardFiltersProps) {
  return (
    <Card className="mb-6 overflow-hidden border-border bg-card/50 shadow-lg">
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="flex items-center gap-2 border-b border-border/50 bg-secondary/30 px-6 py-3">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Filtros</h3>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Search Input */}
            <div className="flex flex-col gap-2 lg:col-span-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">
                Buscar comercio
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre de comercio..."
                  className="pl-10 h-10 border-primary/20 bg-background/50 focus:border-primary/50"
                />
              </div>
            </div>

            {/* Mes Select */}
            <div className="flex flex-col gap-2 lg:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">
                Mes
              </label>
              <Select
                value={selectedMes?.toString() || "all"}
                onValueChange={(v) =>
                  onMesChange(v === "all" ? undefined : parseInt(v))
                }
              >
                <SelectTrigger className="h-10 border-primary/20 bg-background/50 text-sm font-medium">
                  <SelectValue placeholder="Todos los meses" />
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
            </div>

            {/* Año Select */}
            <div className="flex flex-col gap-2 lg:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">
                Año
              </label>
              <Select
                value={selectedAnio?.toString() || "all"}
                onValueChange={(v) =>
                  onAnioChange(v === "all" ? undefined : parseInt(v))
                }
              >
                <SelectTrigger className="h-10 border-primary/20 bg-background/50 text-sm font-medium">
                  <SelectValue placeholder="Todos los años" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centro Select (Adaptado de "Comercio Subtipo") */}
            <div className="flex flex-col gap-2 lg:col-span-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">
                Centro Comercial
              </label>
              <Select
                value={selectedCentroId || "all"}
                onValueChange={(v) =>
                  onCentroChange(v === "all" ? undefined : v)
                }
              >
                <SelectTrigger className="h-10 border-primary/20 bg-background/50 text-sm font-medium">
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {centros.map((centro) => (
                    <SelectItem key={centro.id} value={centro.id}>
                      {centro.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex items-center justify-end gap-3 border-t border-border/50 pt-6">
            {/* Warning: Month selected without Year */}
            {selectedMes && !selectedAnio && (
              <div className="flex items-center gap-2 text-lg font-black text-destructive animate-pulse mr-4">
                <AlertCircle className="h-6 w-6" />
                <span>DEBE SELECCIONAR UN AÑO PARA FILTRAR POR MES</span>
              </div>
            )}

            {/* Warning: No records for selected period */}
            {selectedAnio && !hasData && (
              <div className="flex items-center gap-2 text-lg font-black text-orange-500 animate-bounce mr-4">
                <AlertCircle className="h-6 w-6" />
                <span>NO HAY REGISTROS PARA EL PERIODO SELECCIONADO</span>
              </div>
            )}

            <Button
              size="lg"
              className="h-12 px-8 text-base font-bold gap-2 shadow-xl transition-all hover:scale-105 active:scale-95"
              onClick={onExportPdf}
              disabled={isExporting || (!!selectedMes && !selectedAnio) || !hasData}
            >
              <FileDown className="h-5 w-5" />
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
