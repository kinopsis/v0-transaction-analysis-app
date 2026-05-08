"use client";

import { useState, useMemo } from "react";
import { FileDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { TransactionFilters } from "./transaction-filters";
import { TransactionTable } from "./transaction-table";
import { useAppStore } from "@/lib/store";
import { filterTransacciones, formatNumber } from "@/lib/data-utils";
import {
  exportTransaccionesExcel,
  exportTransaccionesPDF,
} from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import type { FilterState } from "@/lib/types";

export function TransactionsTab() {
  const { state } = useAppStore();
  const [filters, setFilters] = useState<FilterState>({
    centroIds: [],
  });

  const filteredTransacciones = useMemo(
    () => filterTransacciones(state.transacciones, filters),
    [state.transacciones, filters]
  );

  const handleExportExcel = () => {
    exportTransaccionesExcel(
      filteredTransacciones,
      `transacciones-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportPDF = () => {
    exportTransaccionesPDF(
      filteredTransacciones,
      `transacciones-${new Date().toISOString().split("T")[0]}`
    );
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Transacciones"
        subtitle={`${formatNumber(filteredTransacciones.length)} transacciones encontradas`}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <TransactionFilters
          filters={filters}
          onFilterChange={setFilters}
          centros={state.centros}
        />

        {/* Export buttons */}
        <div className="my-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredTransacciones.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={filteredTransacciones.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Table */}
        <TransactionTable transactions={filteredTransacciones} />
      </div>
    </div>
  );
}
