"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Transaccion } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/data-utils";

interface TransactionTableProps {
  transactions: Transaccion[];
  pageSize?: number;
}

export function TransactionTable({
  transactions,
  pageSize = 20,
}: TransactionTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(transactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const currentTransactions = useMemo(
    () => transactions.slice(startIndex, endIndex),
    [transactions, startIndex, endIndex]
  );

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  // Reset to page 1 when transactions change
  useMemo(() => {
    setCurrentPage(1);
  }, [transactions.length]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12">
        <p className="text-sm text-muted-foreground">
          No hay transacciones que coincidan con los filtros
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">Fecha</TableHead>
              <TableHead className="w-40">Tarjeta</TableHead>
              <TableHead className="w-28 text-right">Valor</TableHead>
              <TableHead className="w-28">Cód. Estab.</TableHead>
              <TableHead className="min-w-32">Nombre Comercio</TableHead>
              <TableHead className="w-20">Red Adq.</TableHead>
              <TableHead className="min-w-28">Centro</TableHead>
              <TableHead className="w-24">Cod. Autoriz.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {formatDate(t.fecha)}
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {t.tarjeta}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-medium">
                  {formatCurrency(t.valor)}
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {t.codEstablecimiento || "-"}
                </TableCell>
                <TableCell className="max-w-48 truncate text-sm" title={t.marca || ""}>
                  {t.marca || "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {t.redAdquirente || "-"}
                </TableCell>
                <TableCell className="text-sm">{t.nombreCentro}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {t.codAutorizacion || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {startIndex + 1} - {Math.min(endIndex, transactions.length)}{" "}
          de {transactions.length} transacciones
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
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
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
