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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/data-utils";
import { CHART_COLORS } from "@/lib/constants";

interface RemanentesChartsProps {
  cardsPerMonto: any[];
  saldoPerMonto: any[];
  ventasTimeline: any[];
  uniqueMontos: string[];
  granularity: "day" | "week" | "month";
  onGranularityChange: (val: "day" | "week" | "month") => void;
}

export function RemanentesCharts({ 
  cardsPerMonto, 
  saldoPerMonto, 
  ventasTimeline,
  uniqueMontos,
  granularity,
  onGranularityChange
}: RemanentesChartsProps) {
  
  // Custom axis color for better visibility
  const axisColor = "oklch(0.65 0.02 250)";
  const gridColor = "oklch(0.28 0.02 250)";
  const tooltipBg = "oklch(0.18 0.02 250)";
  const textColor = "oklch(0.93 0.01 250)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Cards per Assigned Monto */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            NÚMERO DE TARJETAS POR MONTO ASIGNADO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cardsPerMonto} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                  dataKey="monto" 
                  angle={-45} 
                  textAnchor="end" 
                  stroke={axisColor} 
                  fontSize={11}
                  interval={0}
                  height={60}
                />
                <YAxis stroke={axisColor} fontSize={12} tickFormatter={(val) => formatNumber(val)} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridColor}`, borderRadius: "8px" }}
                  labelStyle={{ color: textColor, fontWeight: "bold" }}
                  itemStyle={{ color: textColor }}
                />
                <Bar dataKey="count" name="Cantidad" radius={[4, 4, 0, 0]}>
                  {cardsPerMonto.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Saldo per Assigned Monto */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            REMANENTES POR TIPO DE MONTO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={saldoPerMonto} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" stroke={axisColor} fontSize={11} tickFormatter={(val) => `$${formatNumber(val / 1000)}k`} />
                <YAxis 
                  dataKey="monto" 
                  type="category" 
                  stroke={axisColor} 
                  fontSize={11}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridColor}`, borderRadius: "8px" }}
                  labelStyle={{ color: textColor, fontWeight: "bold" }}
                  itemStyle={{ color: textColor }}
                  formatter={(val: number) => [formatCurrency(val), "Saldo No Dev."]}
                />
                <Bar dataKey="total" name="Saldo Total" radius={[0, 4, 4, 0]}>
                  {saldoPerMonto.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sales by Monto Timeline */}
      <Card className="bg-card border-border shadow-md lg:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-tight">
            Tendencia de Ventas por Tipo de Monto
          </CardTitle>
          <div className="flex bg-secondary/20 p-1 rounded-lg border border-border/50">
            <Button 
              variant={granularity === "day" ? "default" : "ghost"} 
              size="xs" 
              className="text-[10px] h-7 px-3 uppercase font-bold"
              onClick={() => onGranularityChange("day")}
            >
              Días
            </Button>
            <Button 
              variant={granularity === "week" ? "default" : "ghost"} 
              size="xs" 
              className="text-[10px] h-7 px-3 uppercase font-bold"
              onClick={() => onGranularityChange("week")}
            >
              Semanas
            </Button>
            <Button 
              variant={granularity === "month" ? "default" : "ghost"} 
              size="xs" 
              className="text-[10px] h-7 px-3 uppercase font-bold"
              onClick={() => onGranularityChange("month")}
            >
              Meses
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ventasTimeline} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke={axisColor} 
                  fontSize={12} 
                  tick={{ fill: axisColor }}
                />
                <YAxis stroke={axisColor} fontSize={12} tickFormatter={(val) => formatNumber(val)} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridColor}`, borderRadius: "8px" }}
                  labelStyle={{ color: textColor, fontWeight: "bold" }}
                  itemStyle={{ color: textColor }}
                />
                <Legend iconType="circle" />
                {uniqueMontos.map((monto, index) => (
                  <Line 
                    key={monto}
                    type="monotone" 
                    dataKey={monto} 
                    name={monto} 
                    stroke={CHART_COLORS[index % CHART_COLORS.length]} 
                    strokeWidth={3}
                    dot={ventasTimeline.length < 32 ? { r: 4, fill: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 1, stroke: textColor } : false}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
