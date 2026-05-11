"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  // Count unregistered transactions
  const unregisteredCount = useMemo(
    () => transactions.filter((t) => t.datafonoNoRegistrado).length,
    [transactions]
  );

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
      {/* Warning banner for unregistered transactions */}
      {unregisteredCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700">
              {unregisteredCount} transaccion(es) con datafono no registrado
            </p>
            <p className="text-xs text-amber-600/80">
              Estas filas estan resaltadas en amarillo. Registra los datafonos en Configuracion para corregirlas.
            </p>
          </div>
          <Badge variant="outline" className="border-amber-500/50 bg-amber-500/20 text-amber-700">
            Requiere correccion
          </Badge>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">Fecha</TableHead>
              <TableHead className="w-40">Tarjeta</TableHead>
              <TableHead className="w-28 text-right">Valor</TableHead>
              <TableHead className="w-28">Cod. Estab.</TableHead>
              <TableHead className="min-w-32">Nombre Comercio</TableHead>
              <TableHead className="w-20">Red Adq.</TableHead>
              <TableHead className="min-w-28">Centro</TableHead>
              <TableHead className="w-24">Cod. Autoriz.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((t) => (
              <TableRow
                key={t.id}
                className={
                  t.datafonoNoRegistrado
                    ? "bg-amber-500/10 hover:bg-amber-500/20"
                    : ""
                }
              >
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
                  {t.datafonoNoRegistrado ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            <span className="text-amber-700 font-medium">
                              {t.codEstablecimiento || "-"}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Datafono no registrado en Configuracion</p>
                          <p className="text-xs text-muted-foreground">
                            Agrega este codigo en Configuracion → Datafonos
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    t.codEstablecimiento || "-"
                  )}
                </TableCell>
                <TableCell
                  className="max-w-48 truncate text-sm"
                  title={t.marca || ""}
                >
                  {t.datafonoNoRegistrado ? (
                    <span className="text-amber-700 italic">No identificado</span>
                  ) : (
                    t.marca || "-"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {t.redAdquirente || "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {t.datafonoNoRegistrado ? (
                    <span className="text-amber-700 italic">{t.nombreCentro}</span>
                  ) : (
                    t.nombreCentro
                  )}
                </TableCell>
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
