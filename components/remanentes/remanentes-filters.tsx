"use client";

import { Search, Filter, FileDown, Loader2, AlertCircle } from "lucide-react";
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
import { MONTH_NAMES } from "@/lib/data-utils";

interface RemanentesFiltersProps {
  tarjetaFilter: string;
  onTarjetaChange: (val: string) => void;
  estadoFilter: string | undefined;
  onEstadoChange: (val: string | undefined) => void;
  uniqueEstados: string[];
  subtipoFilter: string | undefined;
  onSubtipoChange: (val: string | undefined) => void;
  uniqueSubtipos: string[];
  mesVencimientoFilter: string | undefined;
  onMesChange: (val: string | undefined) => void;
  anioVencimientoFilter: string | undefined;
  onAnioChange: (val: string | undefined) => void;
  vencimientoOptions: {
    months: number[];
    years: number[];
  };
  onExportPdf: () => void;
  isExporting: boolean;
  hasData: boolean;
}

export function RemanentesFilters({
  tarjetaFilter,
  onTarjetaChange,
  estadoFilter,
  onEstadoChange,
  uniqueEstados,
  subtipoFilter,
  onSubtipoChange,
  uniqueSubtipos,
  mesVencimientoFilter,
  onMesChange,
  anioVencimientoFilter,
  onAnioChange,
  vencimientoOptions,
  onExportPdf,
  isExporting,
  hasData,
}: RemanentesFiltersProps) {
  
  const showYearWarning = mesVencimientoFilter && !anioVencimientoFilter;

  return (
    <Card className="mb-6 border-border bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda por Tarjeta */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Buscar Tarjeta
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Últimos 4 dígitos..."
                className="pl-9 bg-background/50"
                value={tarjetaFilter}
                onChange={(e) => onTarjetaChange(e.target.value)}
              />
            </div>
          </div>

          {/* Filtro de Estado */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Estado de Tarjeta
            </label>
            <Select value={estadoFilter || "all"} onValueChange={(v) => onEstadoChange(v === "all" ? undefined : v)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {uniqueEstados.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Subtipo / Comercio */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Subtipo / Comercio
            </label>
            <Select value={subtipoFilter || "all"} onValueChange={(v) => onSubtipoChange(v === "all" ? undefined : v)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Todos los subtipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los subtipos</SelectItem>
                {uniqueSubtipos.map((subtipo) => (
                  <SelectItem key={subtipo} value={subtipo}>
                    {subtipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mes Vencimiento */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Mes Vencimiento
            </label>
            <Select value={mesVencimientoFilter || "all"} onValueChange={(v) => onMesChange(v === "all" ? undefined : v)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Cualquier mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier mes</SelectItem>
                {vencimientoOptions.months.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {MONTH_NAMES[m - 1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Año Vencimiento + Botón PDF */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Año Vencimiento
            </label>
            <div className="flex gap-2">
              <Select value={anioVencimientoFilter || "all"} onValueChange={(v) => onAnioChange(v === "all" ? undefined : v)}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Cualquier año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cualquier año</SelectItem>
                  {vencimientoOptions.years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="default" 
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0"
                onClick={onExportPdf}
                disabled={isExporting || !hasData || !!showYearWarning}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {showYearWarning && (
          <div className="mt-3 flex items-center gap-2 text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 animate-pulse">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-black uppercase tracking-tight">
              * Debe seleccionar un año para filtrar por mes y generar el reporte
            </span>
          </div>
        )}

        {!hasData && (
          <div className="mt-3 flex items-center gap-2 text-orange-500 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-black uppercase tracking-tight">
              No hay registros para los filtros seleccionados
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
