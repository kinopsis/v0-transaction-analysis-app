"use client";

import { useState } from "react";
import { Plus, Trash2, Upload, Download, Save, History, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/lib/store";
import { importDatafonos, generateId, formatCurrency, formatDate } from "@/lib/data-utils";
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
import type { Datafono } from "@/lib/types";

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

    // Check if already exists
    if (
      state.datafonos.some(
        (d) => d.codEstablecimiento === newDatafono.codEstablecimiento
      )
    ) {
      toast.error("Este código de establecimiento ya está registrado");
      return;
    }

    dispatch({
      type: "ADD_DATAFONOS",
      payload: [
        {
          codEstablecimiento: newDatafono.codEstablecimiento,
          nombreComercio: newDatafono.nombreComercio || undefined,
          marca: newDatafono.marca || undefined,
          centroId: newDatafono.centroId,
        },
      ],
    });

    setNewDatafono({ codEstablecimiento: "", nombreComercio: "", marca: "", centroId: "" });
    toast.success("Datáfono agregado correctamente");
  };

  const handleDeleteDatafono = (codEstablecimiento: string) => {
    dispatch({ type: "DELETE_DATAFONO", payload: codEstablecimiento });
    toast.success("Datáfono eliminado");
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

  // Sync transactions with updated datafono information
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
        const centro = state.centros.find((c) => c.id === datafono.centroId);
        const newMarca = datafono.nombreComercio || datafono.marca;
        const newCentroId = datafono.centroId;
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
        description: "Los datos de comercio y centro han sido actualizados",
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
                <div className="flex items-end gap-4">
                  <div className="w-36 shrink-0">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Cód. Establecimiento *
                    </label>
                    <Input
                      placeholder="12345678"
                      value={newDatafono.codEstablecimiento}
                      onChange={(e) =>
                        setNewDatafono({
                          ...newDatafono,
                          codEstablecimiento: e.target.value.trim(),
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
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDatafonos.map((d) => (
                          <TableRow key={d.codEstablecimiento}>
                            <TableCell className="font-mono">
                              {d.codEstablecimiento}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={d.nombreComercio || d.marca || ""}>
                              {d.nombreComercio || d.marca || "-"}
                            </TableCell>
                            <TableCell>
                              {state.centros.find((c) => c.id === d.centroId)
                                ?.nombre || "Desconocido"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteDatafono(d.codEstablecimiento)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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
    </div>
  );
}
