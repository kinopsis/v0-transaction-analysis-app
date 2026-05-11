"use client";

import { useState } from "react";
import { Plus, Trash2, Upload, Download, Save, History, Search, RefreshCw, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/lib/store";
import { importDatafonos, generateId, formatCurrency, formatDate, validateCodEstablecimiento, normalizeCodEstablecimiento } from "@/lib/data-utils";
import { exportDatafonosCSV } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Datafono, DatafonoHistoryEntry } from "@/lib/types";

export function ConfigTab() {
  const { state, dispatch } = useAppStore();
  const [activeTab, setActiveTab] = useState("datafonos");

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCentro, setSearchCentro] = useState<string>("all");

  // New datáfono form state
  const [newDatafono, setNewDatafono] = useState<Partial<Datafono>>({
    codEstablecimiento: "",
    nombreComercio: "",
    marca: "",
    centroId: "",
  });

  // Editable cuota fija state
  const [editingCuotaFija, setEditingCuotaFija] = useState<string | null>(null);
  const [cuotaFijaValue, setCuotaFijaValue] = useState("");

  // Edit datafono state
  const [editingDatafono, setEditingDatafono] = useState<Datafono | null>(null);
  const [editDatafonoForm, setEditDatafonoForm] = useState<{
    nombreComercio: string;
    marca: string;
    centroId: string;
    fechaEfectiva: string;
  }>({
    nombreComercio: "",
    marca: "",
    centroId: "",
    fechaEfectiva: new Date().toISOString().split("T")[0],
  });
  const [showHistorial, setShowHistorial] = useState<Datafono | null>(null);

  // Filtered datáfonos based on search
  const filteredDatafonos = state.datafonos.filter((d) => {
    const matchesSearch =
      searchQuery === "" ||
      d.codEstablecimiento.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.nombreComercio || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.marca || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCentro =
      searchCentro === "all" || d.centroId === searchCentro;

    return matchesSearch && matchesCentro;
  });

  const handleAddDatafono = () => {
    if (!newDatafono.codEstablecimiento || !newDatafono.centroId) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    // Normalize and validate: código de establecimiento must be exactly 8 numeric digits.
    // This value is the "número de datáfono" and must match exactly the
    // "Código establecimiento" column in transaction CSV files.
    const codNormalized = normalizeCodEstablecimiento(newDatafono.codEstablecimiento);
    if (!validateCodEstablecimiento(codNormalized)) {
      toast.error("Código de establecimiento inválido", {
        description:
          "El número de datáfono debe ser exactamente 8 dígitos numéricos (ej: 12345678). Este código debe coincidir con la columna 'Código establecimiento' en los archivos de transacciones.",
      });
      return;
    }

    // Check if already exists
    if (state.datafonos.some((d) => d.codEstablecimiento === codNormalized)) {
      toast.error("Este código de establecimiento ya está registrado");
      return;
    }

    dispatch({
      type: "ADD_DATAFONOS",
      payload: [
        {
          codEstablecimiento: codNormalized,
          nombreComercio: newDatafono.nombreComercio || undefined,
          marca: newDatafono.marca || undefined,
          centroId: newDatafono.centroId,
        },
      ],
    });

    setNewDatafono({ codEstablecimiento: "", nombreComercio: "", marca: "", centroId: "" });
    toast.success("Datáfono agregado correctamente", {
      description: `Código de establecimiento: ${codNormalized}`,
    });
  };

  const handleDeleteDatafono = (codEstablecimiento: string) => {
    dispatch({ type: "DELETE_DATAFONO", payload: codEstablecimiento });
    toast.success("Datáfono eliminado");
  };

  const handleOpenEditDatafono = (datafono: Datafono) => {
    setEditingDatafono(datafono);
    setEditDatafonoForm({
      nombreComercio: datafono.nombreComercio || "",
      marca: datafono.marca || "",
      centroId: datafono.centroId,
      fechaEfectiva: new Date().toISOString().split("T")[0],
    });
  };

  const handleSaveEditDatafono = () => {
    if (!editingDatafono) return;

    if (!editDatafonoForm.centroId) {
      toast.error("Por favor selecciona un centro comercial");
      return;
    }

    // Create history entry from current values (before edit)
    const currentHistoryEntry: DatafonoHistoryEntry = {
      fechaEfectiva: editDatafonoForm.fechaEfectiva,
      nombreComercio: editDatafonoForm.nombreComercio || undefined,
      marca: editDatafonoForm.marca || undefined,
      centroId: editDatafonoForm.centroId,
    };

    // Build new historial: keep previous entries + add snapshot of OLD values before edit date
    const existingHistorial = editingDatafono.historial || [];
    
    // Create a snapshot of the previous state for records BEFORE the effective date
    const previousStateEntry: DatafonoHistoryEntry = {
      fechaEfectiva: "1900-01-01", // Beginning of time - represents original state
      nombreComercio: editingDatafono.nombreComercio,
      marca: editingDatafono.marca,
      centroId: editingDatafono.centroId,
    };

    // Only add previous state if historial was empty (first edit)
    const newHistorial: DatafonoHistoryEntry[] = existingHistorial.length === 0
      ? [previousStateEntry, currentHistoryEntry]
      : [...existingHistorial, currentHistoryEntry];

    // Sort by fechaEfectiva
    newHistorial.sort((a, b) => a.fechaEfectiva.localeCompare(b.fechaEfectiva));

    const updatedDatafono: Datafono = {
      ...editingDatafono,
      nombreComercio: editDatafonoForm.nombreComercio || undefined,
      marca: editDatafonoForm.marca || undefined,
      centroId: editDatafonoForm.centroId,
      historial: newHistorial,
    };

    dispatch({ type: "UPDATE_DATAFONO", payload: updatedDatafono });
    toast.success("Datáfono actualizado", {
      description: `Cambios efectivos desde ${formatDate(editDatafonoForm.fechaEfectiva)}. Historial preservado.`,
    });
    setEditingDatafono(null);
  };

  const getDatafonoAtDate = (datafono: Datafono, fecha: string): { nombreComercio?: string; marca?: string; centroId: string } => {
    if (!datafono.historial || datafono.historial.length === 0) {
      return {
        nombreComercio: datafono.nombreComercio,
        marca: datafono.marca,
        centroId: datafono.centroId,
      };
    }

    // Find the most recent entry that is <= fecha
    const applicableEntries = datafono.historial.filter(h => h.fechaEfectiva <= fecha);
    if (applicableEntries.length === 0) {
      // No history applies, use first entry
      const first = datafono.historial[0];
      return {
        nombreComercio: first.nombreComercio,
        marca: first.marca,
        centroId: first.centroId,
      };
    }

    // Get the most recent applicable entry
    const latestApplicable = applicableEntries[applicableEntries.length - 1];
    return {
      nombreComercio: latestApplicable.nombreComercio,
      marca: latestApplicable.marca,
      centroId: latestApplicable.centroId,
    };
  };

  const handleImportDatafonos = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { datafonos, errors } = await importDatafonos(file, state.centros);

      if (datafonos.length > 0) {
        dispatch({ type: "ADD_DATAFONOS", payload: datafonos });
        
        // Auto-sync transactions with new datafono data
        if (state.transacciones.length > 0) {
          setTimeout(() => {
            // Use a small delay to ensure state is updated
            toast.info("Sincronizando transacciones...", { duration: 1500 });
          }, 100);
        }
        
        toast.success(`${datafonos.length} datáfonos importados correctamente`, {
          description:
            errors.length > 0
              ? `${errors.length} filas con errores fueron omitidas`
              : "Use 'Sincronizar Transacciones' para actualizar datos existentes",
        });
      } else {
        toast.error("No se pudieron importar datáfonos", {
          description:
            errors.length > 0
              ? `${errors.length} errores encontrados`
              : "El archivo no contiene datos válidos",
        });
      }
    } catch (error) {
      toast.error("Error al procesar el archivo");
    }

    e.target.value = "";
  };

  const handleExportDatafonos = () => {
    exportDatafonosCSV(state.datafonos, state.centros);
  };

  const handleSaveCuotaFija = (centroId: string) => {
    const value = parseInt(cuotaFijaValue);
    if (isNaN(value) || value < 0) {
      toast.error("Por favor ingresa un valor válido");
      return;
    }

    const centro = state.centros.find((c) => c.id === centroId);
    if (centro) {
      dispatch({
        type: "UPDATE_CENTRO",
        payload: { ...centro, cuotaFija: value },
      });
      toast.success("Cuota fija actualizada");
    }

    setEditingCuotaFija(null);
  };

  const handleDeleteArchivo = (archivoId: string) => {
    dispatch({ type: "DELETE_ARCHIVO", payload: archivoId });
    toast.success("Archivo y sus datos eliminados");
  };

  // Sync transactions with updated datafono information (using historical data)
  const handleSyncTransactions = () => {
    if (state.transacciones.length === 0) {
      toast.info("No hay transacciones para sincronizar");
      return;
    }

    let updatedCount = 0;
    const updatedTransacciones = state.transacciones.map((t) => {
      // Find datafono by codEstablecimiento (primary key for synchronization)
      const datafono = state.datafonos.find(
        (d) => d.codEstablecimiento === t.codEstablecimiento
      );
      if (datafono) {
        // Use historical data based on transaction date
        const datafonoData = getDatafonoAtDate(datafono, t.fecha);
        const centro = state.centros.find((c) => c.id === datafonoData.centroId);
        const newMarca = datafonoData.nombreComercio || datafonoData.marca;
        const newCentroId = datafonoData.centroId;
        const newNombreCentro = centro?.nombre || "Desconocido";

        // Check if there are changes
        if (
          t.marca !== newMarca ||
          t.centroId !== newCentroId ||
          t.nombreCentro !== newNombreCentro
        ) {
          updatedCount++;
          return {
            ...t,
            marca: newMarca,
            centroId: newCentroId,
            nombreCentro: newNombreCentro,
          };
        }
      }
      return t;
    });

    if (updatedCount > 0) {
      dispatch({ type: "CLEAR_TRANSACCIONES" });
      dispatch({ type: "ADD_TRANSACCIONES", payload: updatedTransacciones });
      toast.success(`${updatedCount} transacciones sincronizadas`, {
        description: "Los datos de comercio y centro han sido actualizados según el historial",
      });
    } else {
      toast.info("Todas las transacciones ya están sincronizadas");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Configuración"
        subtitle="Administra datáfonos, centros y archivos importados"
      />

      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-secondary">
            <TabsTrigger value="datafonos">Datáfonos</TabsTrigger>
            <TabsTrigger value="centros">Centros Comerciales</TabsTrigger>
            <TabsTrigger value="archivos">Archivos Importados</TabsTrigger>
          </TabsList>

          {/* Datáfonos Tab */}
          <TabsContent value="datafonos" className="space-y-6">
            {/* Add new datáfono */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Agregar Datáfono</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-muted-foreground">
                    El <span className="font-semibold text-foreground">Cód. Establecimiento</span> es el número de datáfono (8 dígitos numéricos). Debe coincidir exactamente con la columna <span className="font-mono font-semibold text-foreground">"Código establecimiento"</span> en los archivos CSV de transacciones.
                  </p>
                  <div className="flex items-end gap-4">
                  <div className="w-40 shrink-0">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Cód. Establecimiento * <span className="text-muted-foreground">(8 dígitos)</span>
                    </label>
                    <Input
                      placeholder="12345678"
                      maxLength={8}
                      value={newDatafono.codEstablecimiento}
                      onChange={(e) =>
                        setNewDatafono({
                          ...newDatafono,
                          codEstablecimiento: e.target.value.replace(/\D/g, "").slice(0, 8),
                        })
                      }
                      className="bg-secondary font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Nombre Comercio
                    </label>
                    <Input
                      placeholder="Ej: EXITO UNICENTRO"
                      value={newDatafono.nombreComercio || ""}
                      onChange={(e) =>
                        setNewDatafono({ ...newDatafono, nombreComercio: e.target.value })
                      }
                      className="bg-secondary"
                    />
                  </div>
                  <div className="w-56">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Centro Comercial *
                    </label>
                    <Select
                      value={newDatafono.centroId}
                      onValueChange={(v) =>
                        setNewDatafono({ ...newDatafono, centroId: v })
                      }
                    >
                      <SelectTrigger className="bg-secondary">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {state.centros.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddDatafono}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
                </div>
              </CardContent>
            </Card>

            {/* Import/Export/Sync */}
            <div className="flex flex-wrap items-center gap-2">
              <label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImportDatafonos}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar CSV
                  </span>
                </Button>
              </label>
              <Button
                variant="outline"
                onClick={handleExportDatafonos}
                disabled={state.datafonos.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              <div className="ml-auto">
                <Button
                  variant="secondary"
                  onClick={handleSyncTransactions}
                  disabled={state.datafonos.length === 0 || state.transacciones.length === 0}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Transacciones
                </Button>
              </div>
            </div>

            {/* Datáfonos table */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">
                  Datáfonos Registrados ({filteredDatafonos.length}
                  {filteredDatafonos.length !== state.datafonos.length && (
                    <span className="text-muted-foreground"> de {state.datafonos.length}</span>
                  )}
                  )
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por datáfono o comercio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-secondary pl-9"
                    />
                  </div>
                  <div className="w-48">
                    <Select
                      value={searchCentro}
                      onValueChange={setSearchCentro}
                    >
                      <SelectTrigger className="bg-secondary">
                        <SelectValue placeholder="Filtrar por centro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los centros</SelectItem>
                        {state.centros.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(searchQuery || searchCentro !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchCentro("all");
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>

                {state.datafonos.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No hay datáfonos registrados. Agrega uno o importa desde un
                    archivo CSV.
                  </p>
                ) : filteredDatafonos.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No se encontraron datáfonos con los filtros aplicados.
                  </p>
                ) : (
                  <div className="max-h-[400px] overflow-auto rounded-md border border-border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead>Cód. Establecimiento</TableHead>
                          <TableHead>Nombre Comercio</TableHead>
                          <TableHead>Centro Comercial</TableHead>
                          <TableHead className="w-32">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDatafonos.map((d) => (
                          <TableRow key={d.codEstablecimiento}>
                            <TableCell className="font-mono">
                              <div className="flex items-center gap-2">
                                {d.codEstablecimiento}
                                {d.historial && d.historial.length > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer text-xs"
                                    onClick={() => setShowHistorial(d)}
                                  >
                                    <Clock className="mr-1 h-3 w-3" />
                                    {d.historial.length}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={d.nombreComercio || d.marca || ""}>
                              {d.nombreComercio || d.marca || "-"}
                            </TableCell>
                            <TableCell>
                              {state.centros.find((c) => c.id === d.centroId)
                                ?.nombre || "Desconocido"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditDatafono(d)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteDatafono(d.codEstablecimiento)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Centros Tab */}
          <TabsContent value="centros" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">
                  Centros Comerciales y Cuota Fija
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centro Comercial</TableHead>
                      <TableHead>Códigos Establecimiento</TableHead>
                      <TableHead className="text-right">Cuota Fija</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.centros.map((centro) => (
                      <TableRow key={centro.id}>
                        <TableCell className="font-medium">
                          {centro.nombre}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {centro.codigosEstablecimiento.map((cod) => (
                              <Badge
                                key={cod}
                                variant="secondary"
                                className="font-mono text-xs"
                              >
                                {cod}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingCuotaFija === centro.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                value={cuotaFijaValue}
                                onChange={(e) =>
                                  setCuotaFijaValue(e.target.value)
                                }
                                className="w-32 bg-secondary text-right"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveCuotaFija(centro.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium">
                              {formatCurrency(centro.cuotaFija)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCuotaFija !== centro.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCuotaFija(centro.id);
                                setCuotaFijaValue(centro.cuotaFija.toString());
                              }}
                            >
                              Editar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Archivos Tab */}
          <TabsContent value="archivos" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Historial de Importaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.archivosImportados.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No se han importado archivos aún
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha de Carga</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                        <TableHead className="text-right">Errores</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {state.archivosImportados.map((archivo) => (
                        <TableRow key={archivo.id}>
                          <TableCell className="max-w-48 truncate font-medium">
                            {archivo.nombre}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                archivo.tipo === "transaccion"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {archivo.tipo === "transaccion"
                                ? "Transacciones"
                                : "Remanentes"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(archivo.fechaCarga.split("T")[0])}
                          </TableCell>
                          <TableCell className="text-sm">
                            {archivo.periodo || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {archivo.totalRegistros}
                          </TableCell>
                          <TableCell className="text-right">
                            {archivo.errores > 0 ? (
                              <span className="text-destructive">
                                {archivo.errores}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Eliminar archivo y datos
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esto eliminará el archivo &quot;{archivo.nombre}
                                    &quot; y todos los{" "}
                                    {archivo.tipo === "transaccion"
                                      ? "transacciones"
                                      : "remanentes"}{" "}
                                    asociados ({archivo.totalRegistros} registros).
                                    Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteArchivo(archivo.id)
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Datafono Dialog */}
      <Dialog open={!!editingDatafono} onOpenChange={(open) => !open && setEditingDatafono(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Datáfono</DialogTitle>
            <DialogDescription>
              Los cambios se aplicarán desde la fecha efectiva indicada. El historial anterior se preservará para consultas históricas.
            </DialogDescription>
          </DialogHeader>
          {editingDatafono && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Cód. Establecimiento</Label>
                <p className="font-mono text-sm font-medium">{editingDatafono.codEstablecimiento}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-fecha">Fecha Efectiva del Cambio *</Label>
                <Input
                  id="edit-fecha"
                  type="date"
                  value={editDatafonoForm.fechaEfectiva}
                  onChange={(e) =>
                    setEditDatafonoForm({ ...editDatafonoForm, fechaEfectiva: e.target.value })
                  }
                  className="bg-secondary"
                />
                <p className="text-xs text-muted-foreground">
                  Los cambios se aplicarán a partir de esta fecha. Las transacciones anteriores conservarán los datos del historial.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre Comercio</Label>
                <Input
                  id="edit-nombre"
                  placeholder="Ej: EXITO UNICENTRO"
                  value={editDatafonoForm.nombreComercio}
                  onChange={(e) =>
                    setEditDatafonoForm({ ...editDatafonoForm, nombreComercio: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-centro">Centro Comercial *</Label>
                <Select
                  value={editDatafonoForm.centroId}
                  onValueChange={(v) =>
                    setEditDatafonoForm({ ...editDatafonoForm, centroId: v })
                  }
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {state.centros.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDatafono(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditDatafono}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historial Dialog */}
      <Dialog open={!!showHistorial} onOpenChange={(open) => !open && setShowHistorial(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Historial de Cambios</DialogTitle>
            <DialogDescription>
              {showHistorial && (
                <>Datáfono: <span className="font-mono">{showHistorial.codEstablecimiento}</span></>
              )}
            </DialogDescription>
          </DialogHeader>
          {showHistorial && showHistorial.historial && (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Efectiva</TableHead>
                    <TableHead>Nombre Comercio</TableHead>
                    <TableHead>Centro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showHistorial.historial.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">
                        {entry.fechaEfectiva === "1900-01-01" ? "Inicio" : formatDate(entry.fechaEfectiva)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.nombreComercio || entry.marca || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {state.centros.find((c) => c.id === entry.centroId)?.nombre || "Desconocido"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistorial(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
