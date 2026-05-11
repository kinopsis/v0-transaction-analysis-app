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
import { formatNumber, formatCurrency } from "@/lib/data-utils";
import { CHART_COLORS } from "@/lib/constants";

interface TopComerciosMontoChartProps {
  transacciones: Transaccion[];
}

interface ComercioData {
  comercio: string;
  transacciones: number;
  volumen: number;
}

export function TopComerciosMontoChart({ transacciones }: TopComerciosMontoChartProps) {
  // Group transactions by comercio (using marca or nombreCentro)
  const comercioMap = transacciones.reduce<Record<string, ComercioData>>(
    (acc, t) => {
      const comercio = t.marca || t.nombreCentro || "Sin comercio";
      if (!acc[comercio]) {
        acc[comercio] = { comercio, transacciones: 0, volumen: 0 };
      }
      acc[comercio].transacciones += 1;
      acc[comercio].volumen += t.valor;
      return acc;
    },
    {}
  );

  // Convert to array, sort by VOLUMEN (monto), take top 10
  const topComercios = Object.values(comercioMap)
    .sort((a, b) => b.volumen - a.volumen)
    .slice(0, 10)
    .map((d, index) => ({
      ...d,
      // Truncate long names for display
      comercioDisplay:
        d.comercio.length > 20 ? d.comercio.substring(0, 18) + "..." : d.comercio,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  const totalVolumen = transacciones.reduce((sum, t) => sum + t.valor, 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Top 10 Comercios por Monto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topComercios.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topComercios}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.28 0.02 250)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="oklch(0.65 0.02 250)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000000) {
                      return `$${(value / 1000000).toFixed(1)}M`;
                    }
                    if (value >= 1000) {
                      return `$${(value / 1000).toFixed(0)}K`;
                    }
                    return `$${value}`;
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="comercioDisplay"
                  stroke="oklch(0.65 0.02 250)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.02 250)",
                    border: "1px solid oklch(0.28 0.02 250)",
                    borderRadius: "8px",
                    color: "oklch(0.93 0.01 250)",
                  }}
                  labelStyle={{ color: "oklch(0.93 0.01 250)" }}
                  itemStyle={{ color: "oklch(0.93 0.01 250)" }}
                  formatter={(value: number, name: string, props) => {
                    const item = props.payload as ComercioData & { color: string };
                    if (name === "volumen") {
                      const percentage = totalVolumen > 0 
                        ? ((value / totalVolumen) * 100).toFixed(1)
                        : "0";
                      return [
                        `${formatCurrency(value)} (${percentage}%)`,
                        "Monto",
                      ];
                    }
                    return [formatNumber(value), "Transacciones"];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return (payload[0].payload as ComercioData).comercio;
                    }
                    return label;
                  }}
                />
                <Bar dataKey="volumen" radius={[0, 4, 4, 0]}>
                  {topComercios.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
