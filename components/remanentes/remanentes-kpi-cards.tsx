"use client";

import { CreditCard, Clock, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/data-utils";

interface RemanentesKPIProps {
  data: {
    total: number;
    porSolicitar: number;
    montoPorSolicitar: number;
    proximosVencer: number;
    montoProximosVencer: number;
    totalSaldoNoDevuelto: number;
    promedioSaldo: number;
  };
}

export function RemanentesKPICards({ data }: RemanentesKPIProps) {
  const kpis = [
    {
      title: "Total Remanentes",
      value: formatNumber(data.total),
      subtitle: "Tarjetas registradas",
      icon: CreditCard,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Saldo No Devuelto",
      value: formatCurrency(data.totalSaldoNoDevuelto),
      subtitle: "Total acumulado",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Por Solicitar",
      value: formatCurrency(data.montoPorSolicitar),
      subtitle: `${formatNumber(data.porSolicitar)} tarjetas pendientes`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      title: "Vencen en 30 días",
      value: formatNumber(data.proximosVencer),
      subtitle: formatCurrency(data.montoProximosVencer),
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="border-border bg-card shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {kpi.title}
                </p>
                <div className="flex flex-col">
                  <span className={`text-2xl font-black ${kpi.color}`}>
                    {kpi.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {kpi.subtitle}
                  </span>
                </div>
              </div>
              <div className={`rounded-xl ${kpi.bg} p-3 shadow-inner`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
