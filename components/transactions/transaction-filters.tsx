"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CentroComercial, FilterState } from "@/lib/types";
import { SUBTIPOS, MESES, YEARS } from "@/lib/constants";

interface TransactionFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  centros: CentroComercial[];
}

export function TransactionFilters({
  filters,
  onFilterChange,
  centros,
}: TransactionFiltersProps) {
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      centroIds: [],
      fechaInicio: undefined,
      fechaFin: undefined,
      subtipo: undefined,
      nroDispositivo: undefined,
      tarjeta: undefined,
      mes: undefined,
      anio: undefined,
    });
  };

  const hasActiveFilters =
    filters.centroIds.length > 0 ||
    filters.fechaInicio ||
    filters.fechaFin ||
    filters.subtipo ||
    filters.nroDispositivo ||
    filters.tarjeta ||
    filters.mes ||
    filters.anio;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Filtros</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Centro Comercial */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Centro Comercial
          </label>
          <Select
            value={filters.centroIds[0] || "all"}
            onValueChange={(v) =>
              updateFilter("centroIds", v === "all" ? [] : [v])
            }
          >
            <SelectTrigger className="bg-secondary">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {centros.map((centro) => (
                <SelectItem key={centro.id} value={centro.id}>
                  {centro.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mes */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Mes
          </label>
          <Select
            value={filters.mes?.toString() || "all"}
            onValueChange={(v) =>
              updateFilter("mes", v === "all" ? undefined : parseInt(v))
            }
          >
            <SelectTrigger className="bg-secondary">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {MESES.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Año */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Año
          </label>
          <Select
            value={filters.anio?.toString() || "all"}
            onValueChange={(v) =>
              updateFilter("anio", v === "all" ? undefined : parseInt(v))
            }
          >
            <SelectTrigger className="bg-secondary">
              <SelectValue placeholder="Todos" />
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
        </div>

        {/* Subtipo */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Subtipo
          </label>
          <Select
            value={filters.subtipo || "all"}
            onValueChange={(v) =>
              updateFilter("subtipo", v === "all" ? undefined : v)
            }
          >
            <SelectTrigger className="bg-secondary">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {SUBTIPOS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Datáfono */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            N° Datáfono
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={filters.nroDispositivo || ""}
              onChange={(e) => updateFilter("nroDispositivo", e.target.value)}
              className="bg-secondary pl-8"
            />
          </div>
        </div>

        {/* Tarjeta */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Tarjeta
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={filters.tarjeta || ""}
              onChange={(e) => updateFilter("tarjeta", e.target.value)}
              className="bg-secondary pl-8"
            />
          </div>
        </div>

        {/* Fecha inicio */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Fecha desde
          </label>
          <Input
            type="date"
            value={filters.fechaInicio || ""}
            onChange={(e) => updateFilter("fechaInicio", e.target.value)}
            className="bg-secondary"
          />
        </div>

        {/* Fecha fin */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Fecha hasta
          </label>
          <Input
            type="date"
            value={filters.fechaFin || ""}
            onChange={(e) => updateFilter("fechaFin", e.target.value)}
            className="bg-secondary"
          />
        </div>
      </div>
    </div>
  );
}
