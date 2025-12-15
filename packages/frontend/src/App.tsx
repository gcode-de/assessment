import { type FormEvent, useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Info, Loader2, Moon, Search, Sun, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { useCsvView } from "./hooks/useCsvView";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const {
    preview,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    columnFilter,
    setColumnFilter,
    sortBy,
    sortDirection,
    toggleSort,
    setPage,
    pageCount,
    currentPage,
    pageRows,
    pageSize,
    setPageSize,
    filteredRows,
    uploadFile,
    parseLocalFile,
    setError,
  } = useCsvView({ apiBase: API_BASE });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("darkMode") === null) {
        setDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleDarkModeToggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", String(newMode));
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setError("Bitte wähle eine CSV-Datei aus.");
      return;
    }
    uploadFile(selectedFile);
  };

  const handleLocalPreview = async () => {
    if (!selectedFile) {
      setError("Bitte wähle eine CSV-Datei aus.");
      return;
    }
    parseLocalFile(selectedFile);
  };

  return (
    <div className={darkMode ? "dark min-h-screen bg-slate-950" : "min-h-screen bg-slate-50"}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">CSV Viewer</p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50">Upload & Vorschau</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Sende eine CSV an das Backend, prüfe Daten, zeige Vorschau.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDarkModeToggle} aria-label="Dark-Mode umschalten">
              {darkMode ? <Sun className="size-4 text-amber-300" /> : <Moon className="size-4" />}
              <span className="sr-only">Theme umschalten</span>
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>CSV hochladen</CardTitle>
              <CardDescription>Semikolon-getrennte Dateien werden erwartet.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              <Info className="size-4" />
              Endpoint: {API_BASE}/upload
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="text-destructive" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form className="space-y-4" onSubmit={handleUpload}>
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setError(null);
                  }}
                  aria-label="CSV-Datei auswählen"
                />
              </div>

              {selectedFile && <p className="text-sm text-slate-600 dark:text-slate-300">Gewählt: {selectedFile.name}</p>}

              <div className="flex flex-wrap gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={handleLocalPreview} disabled={!selectedFile || loading}>
                  Im Browser prüfen
                </Button>
                <Button type="submit" disabled={!selectedFile || loading} className="w-full md:w-auto">
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                  CSV an Backend senden
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Vorschau</CardTitle>
              <CardDescription>Suche, filtere, sortiere und blättere durch die geladenen Daten.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!preview && <p className="text-sm text-slate-600 dark:text-slate-300">Noch keine Daten geladen.</p>}

              {preview && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {preview.filename ?? "unbekannt"}
                    </span>
                    <span>Quelle: {preview.source === "backend" ? "Backend" : preview.source === "sample" ? "Demo-Datei" : "Browser"}</span>
                    <span>Delimiter: {preview.delimiter}</span>
                    <span>
                      Zeilen: {preview.rows.length} gültig / {preview.totalRows} gesamt
                    </span>
                    <span>Ungültige Zeilen: {preview.invalidRows}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full max-w-md">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Suchen..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          setPage(1);
                        }}
                      />
                    </div>

                    <Select
                      value={columnFilter}
                      onValueChange={(value) => {
                        setColumnFilter(value);
                        setPage(1);
                      }}
                      disabled={!preview.columns.length}
                    >
                      <SelectTrigger aria-label="Spalte filtern">
                        <SelectValue placeholder="Alle Spalten" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Spalten</SelectItem>
                        {preview.columns.map((col) => (
                          <SelectItem key={col || "col"} value={col || "col"}>
                            {col || "Spalte"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {preview.columns.map((column) => {
                            const isActive = sortBy === column;
                            const Icon = isActive ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                            return (
                              <TableHead key={column} className="whitespace-nowrap">
                                <button
                                  type="button"
                                  className="flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                                  onClick={() => toggleSort(column)}
                                  aria-label={`Sortiere nach ${column || "Spalte"}`}
                                >
                                  <span>{column || "Spalte"}</span>
                                  <Icon className={`size-3 ${isActive ? "text-primary" : "text-slate-400"}`} />
                                </button>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageRows.map((row, rowIndex) => (
                          <TableRow key={`${rowIndex}-${row.join("-")}`}>
                            {preview.columns.map((_, cellIndex) => (
                              <TableCell key={`${rowIndex}-${cellIndex}`}>{row[cellIndex] ?? ""}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {!pageRows.length && (
                          <TableRow>
                            <TableCell colSpan={preview.columns.length} className="text-center text-sm text-slate-500">
                              Keine gültigen Daten gefunden.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      {preview && (
                        <TableCaption>
                          {filteredRows.length} Zeilen nach Filterung · Seite {currentPage} von {pageCount}
                        </TableCaption>
                      )}
                    </Table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span>Zeilen pro Seite:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setPage(1);
                        }}
                      >
                        <SelectTrigger size="sm" aria-label="Seitengröße">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 50, 100].map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage <= 1}>
                        <ChevronLeft className="size-4" />
                        Zurück
                      </Button>
                      <span>
                        Seite {currentPage} / {pageCount}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                        disabled={currentPage >= pageCount}
                      >
                        Weiter
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {preview.errors?.length ? (
                    <Alert>
                      <Info className="text-slate-500" />
                      <AlertTitle>Backend-Hinweise</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc space-y-1 pl-4">
                          {preview.errors.map((msg: string, idx: number) => (
                            <li key={idx}>{msg}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;
