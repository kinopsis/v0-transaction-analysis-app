"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaccion } from "@/lib/types";
import { formatNumber } from "@/lib/data-utils";

interface TransactionsChartProps {
  transacciones: Transaccion[];
}

interface DailyData {
  fecha: string;
  transacciones: number;
  volumen: number;
}

export function TransactionsChart({ transacciones }: TransactionsChartProps) {
  // Group transactions by date
  const dailyData = transacciones.reduce<Record<string, DailyData>>(
    (acc, t) => {
      const fecha = t.fecha.split("T")[0]; // Get just the date part
      if (!acc[fecha]) {
        acc[fecha] = { fecha, transacciones: 0, volumen: 0 };
      }
      acc[fecha].transacciones += 1;
      acc[fecha].volumen += t.valor;
      return acc;
    },
    {}
  );

  // Convert to array and sort by date, take last 30 days
  const chartData = Object.values(dailyData)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-30)
    .map((d) => ({
      ...d,
      // Format date for display (DD/MM)
      fechaDisplay: new Date(d.fecha).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
      }),
    }));

  const maxTransactions = Math.max(...chartData.map((d) => d.transacciones), 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Transacciones por Día
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (Últimos 30 días con actividad)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.28 0.02 250)"
                  vertical={false}
                />
                <XAxis
                  dataKey="fechaDisplay"
                  stroke="oklch(0.65 0.02 250)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  interval={Math.floor(chartData.length / 10)}
                />
                <YAxis
                  stroke="oklch(0.65 0.02 250)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 250)",
                    border: "1px solid oklch(0.28 0.02 250)",
                    borderRadius: "8px",
                    color: "oklch(0.93 0.01 250)",
                  }}
                  formatter={(value: number) => [
                    formatNumber(value),
                    <span style={{ color: "oklch(0.93 0.01 250)" }}>Transacciones</span>,
                  ]}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Bar dataKey="transacciones" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.transacciones === maxTransactions
                          ? "hsl(142, 71%, 45%)"
                          : "hsl(217, 91%, 60%)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
