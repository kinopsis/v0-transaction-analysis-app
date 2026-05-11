"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MonthlyData, CentroComercial } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/data-utils";

interface MonthlyChartProps {
  dataVolumen: MonthlyData[];
  dataTransacciones: MonthlyData[];
  centros: CentroComercial[];
  selectedCentroIds: string[];
}

export function MonthlyChart({
  dataVolumen,
  dataTransacciones,
  centros,
  selectedCentroIds,
}: MonthlyChartProps) {
  const [metric, setMetric] = useState<"volumen" | "transacciones">("volumen");

  // Select the appropriate data based on the metric
  const data = metric === "volumen" ? dataVolumen : dataTransacciones;

  const filteredCentros = centros.filter(
    (c) =>
      selectedCentroIds.length === 0 || selectedCentroIds.includes(c.id)
  );

  const formatValue = (value: number) => {
    if (metric === "volumen") {
      return formatCurrency(value);
    }
    return formatNumber(value);
  };

  const formatAxisValue = (value: number) => {
    if (metric === "volumen") {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      }
      return `$${value}`;
    }
    return formatNumber(value);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">
          Tendencia Mensual
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant={metric === "volumen" ? "default" : "outline"}
            size="sm"
            onClick={() => setMetric("volumen")}
          >
            Volumen
          </Button>
          <Button
            variant={metric === "transacciones" ? "default" : "outline"}
            size="sm"
            onClick={() => setMetric("transacciones")}
          >
            Transacciones
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            No hay datos disponibles. Importa transacciones para ver el gráfico.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.28 0.02 250)"
                />
                <XAxis
                  dataKey="mes"
                  stroke="oklch(0.65 0.02 250)"
                  fontSize={12}
                />
                <YAxis
                  stroke="oklch(0.65 0.02 250)"
                  fontSize={12}
                  tickFormatter={formatAxisValue}
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
                  formatter={(value: number, name: string) => [formatValue(value), name]}
                />
                <Legend />
                {filteredCentros.map((centro, index) => (
                  <Line
                    key={centro.id}
                    type="monotone"
                    dataKey={centro.id}
                    name={centro.nombre}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
