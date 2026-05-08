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
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">Fecha</TableHead>
              <TableHead>Tarjeta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Datáfono</TableHead>
              <TableHead>Subtipo</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Comprobante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">
                  {formatDate(t.fecha)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {t.tarjeta.slice(0, 4)}****{t.tarjeta.slice(-4)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(t.valor)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {t.nroDispositivo}
                </TableCell>
                <TableCell className="text-sm">{t.subtipo}</TableCell>
                <TableCell className="text-sm">{t.nombreCentro}</TableCell>
                <TableCell className="text-sm">{t.estado}</TableCell>
                <TableCell className="font-mono text-xs">
                  {t.comprobante}
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
