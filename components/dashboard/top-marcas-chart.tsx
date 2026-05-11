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

interface TopMarcasChartProps {
  transacciones: Transaccion[];
}

interface MarcaData {
  marca: string;
  transacciones: number;
  volumen: number;
}

export function TopMarcasChart({ transacciones }: TopMarcasChartProps) {
  // Group transactions by marca (brand/commerce name)
  const marcaMap = transacciones.reduce<Record<string, MarcaData>>(
    (acc, t) => {
      const marca = t.marca || t.nombreCentro || "Sin marca";
      if (!acc[marca]) {
        acc[marca] = { marca, transacciones: 0, volumen: 0 };
      }
      acc[marca].transacciones += 1;
      acc[marca].volumen += t.valor;
      return acc;
    },
    {}
  );

  // Convert to array, sort by transaction count, take top 10
  const topMarcas = Object.values(marcaMap)
    .sort((a, b) => b.transacciones - a.transacciones)
    .slice(0, 10)
    .map((d, index) => ({
      ...d,
      // Truncate long names for display
      marcaDisplay:
        d.marca.length > 20 ? d.marca.substring(0, 18) + "..." : d.marca,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  const totalTransacciones = transacciones.length;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Top 10 Comercios por Transacciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topMarcas.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topMarcas}
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
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis
                  type="category"
                  dataKey="marcaDisplay"
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
                  formatter={(value: number, name: string, props) => {
                    const item = props.payload as MarcaData & { color: string };
                    if (name === "transacciones") {
                      const percentage = (
                        (value / totalTransacciones) *
                        100
                      ).toFixed(1);
                      return [
                        `${formatNumber(value)} (${percentage}%)`,
                        "Transacciones",
                      ];
                    }
                    return [formatCurrency(value as number), "Volumen"];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return (payload[0].payload as MarcaData).marca;
                    }
                    return label;
                  }}
                />
                <Bar dataKey="transacciones" radius={[0, 4, 4, 0]}>
                  {topMarcas.map((entry, index) => (
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
