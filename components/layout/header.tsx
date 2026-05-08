"use client";

import { useRef } from "react";
import { Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MESES, YEARS } from "@/lib/constants";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showImport?: boolean;
  showPeriodFilter?: boolean;
  onImport?: (file: File) => void;
  selectedMes?: number;
  selectedAnio?: number;
  onMesChange?: (mes: number | undefined) => void;
  onAnioChange?: (anio: number | undefined) => void;
}

export function Header({
  title,
  subtitle,
  showImport = false,
  showPeriodFilter = false,
  onImport,
  selectedMes,
  selectedAnio,
  onMesChange,
  onAnioChange,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
      e.target.value = "";
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {showPeriodFilter && (
          <>
            <Select
              value={selectedMes?.toString() || "all"}
              onValueChange={(v) =>
                onMesChange?.(v === "all" ? undefined : parseInt(v))
              }
            >
              <SelectTrigger className="w-36 bg-secondary">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {MESES.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedAnio?.toString() || "all"}
              onValueChange={(v) =>
                onAnioChange?.(v === "all" ? undefined : parseInt(v))
              }
            >
              <SelectTrigger className="w-28 bg-secondary">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {showImport && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar archivo
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

interface FileUploadAreaProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  description?: string;
}

export function FileUploadArea({
  onFileSelect,
  accept = ".xlsx,.xls,.csv",
  description = "Arrastra y suelta un archivo Excel o CSV aquí, o haz clic para seleccionar",
}: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = "";
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/50 px-6 py-12 transition-colors hover:border-primary hover:bg-secondary"
    >
      <FileUp className="mb-4 h-12 w-12 text-muted-foreground" />
      <p className="mb-2 text-sm font-medium text-foreground">
        Importar archivo
      </p>
      <p className="text-center text-xs text-muted-foreground">{description}</p>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
