"use client";

import {
  DollarSign,
  Receipt,
  TrendingUp,
  Percent,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { KPIData } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/data-utils";

interface KPICardsProps {
  data: KPIData;
}

const kpiConfig = [
  {
    key: "volumenVentas" as const,
    label: "Volumen de Ventas",
    icon: DollarSign,
    format: formatCurrency,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
  {
    key: "numTransacciones" as const,
    label: "N° Transacciones",
    icon: Receipt,
    format: formatNumber,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    key: "ticketPromedio" as const,
    label: "Ticket Promedio",
    icon: TrendingUp,
    format: formatCurrency,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
  {
    key: "comisionAcumulada" as const,
    label: "Comisión Acumulada (2%)",
    icon: Percent,
    format: formatCurrency,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    key: "tarjetasUnicas" as const,
    label: "Tarjetas Únicas",
    icon: CreditCard,
    format: formatNumber,
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
  {
    key: "datafonosUnicos" as const,
    label: "Datáfonos Únicos",
    icon: Smartphone,
    format: formatNumber,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
];

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpiConfig.map((kpi) => {
        const Icon = kpi.icon;
        const value = data[kpi.key];
        return (
          <Card key={kpi.key} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {kpi.format(value)}
                  </p>
                </div>
                <div className={`rounded-lg p-2.5 ${kpi.bgColor}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
