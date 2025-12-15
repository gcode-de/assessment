import { type FormEvent, useEffect, useState } from "react";
import { AlertTriangle, Info, Loader2, Moon, Sun, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";

type CsvPreview = {
  columns: string[];
  rows: string[][];
  totalRows: number;
  invalidRows: number;
  delimiter: string;
  source: "backend" | "client" | "sample";
  filename?: string;
  errors?: string[];
};

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const MAX_PREVIEW_ROWS = 50;

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const isEscapedQuote = inQuotes && line[i + 1] === '"';
      if (isEscapedQuote) {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text: string): Omit<CsvPreview, "source"> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (!lines.length) {
    throw new Error("CSV-Datei ist leer.");
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const columns = splitCsvLine(lines[0], delimiter);

  if (!columns.length) {
    throw new Error("Konnte Header nicht lesen.");
  }

  const rows: string[][] = [];
  let invalidRows = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);
    if (cells.length !== columns.length) {
      invalidRows += 1;
      continue;
    }
    rows.push(cells);
  }

  return {
    columns,
    rows,
    totalRows: rows.length + invalidRows,
    invalidRows,
    delimiter,
  };
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Upload fehlgeschlagen.";
        try {
          const payload = await response.json();
          message = payload.message || payload.error || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      const payload = await response.json();

      setPreview({
        columns: payload.columns ?? [],
        rows: payload.rows ?? [],
        totalRows: payload.totalRows ?? payload.rows?.length ?? 0,
        invalidRows: payload.invalidRows ?? payload.errors?.length ?? 0,
        delimiter: payload.delimiter ?? ";",
        filename: selectedFile.name,
        source: "backend",
        errors: payload.errors,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
      setError(`${message} (Backend unter ${API_BASE} erreichbar?)`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalPreview = async () => {
    if (!selectedFile) {
      setError("Bitte wähle eine CSV-Datei aus.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await selectedFile.text();
      const parsed = parseCsvText(text);
      setPreview({ ...parsed, source: "client", filename: selectedFile.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Konnte Datei nicht lesen.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const visibleRows = preview ? preview.rows.slice(0, MAX_PREVIEW_ROWS) : [];
  const hiddenRows = preview ? Math.max(preview.rows.length - MAX_PREVIEW_ROWS, 0) : 0;

  return (
    <div className={darkMode ? "dark min-h-screen bg-slate-950" : "min-h-screen bg-slate-50"}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">CSV Viewer</p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50">Upload & Vorschau</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Sende eine CSV an das Backend, prüfe Daten, zeige Vorschau.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDarkModeToggle} aria-label="Dark-Mode umschalten">
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
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

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle>Vorschau</CardTitle>
              <CardDescription>Zeigt bis zu {MAX_PREVIEW_ROWS} Zeilen aus dem aktuellen Dataset.</CardDescription>
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

                  <div className="rounded-lg border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {preview.columns.map((column) => (
                            <TableHead key={column}>{column || "Spalte"}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleRows.map((row, rowIndex) => (
                          <TableRow key={`${rowIndex}-${row.join("-")}`}>
                            {preview.columns.map((_, cellIndex) => (
                              <TableCell key={`${rowIndex}-${cellIndex}`}>{row[cellIndex] ?? ""}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {!visibleRows.length && (
                          <TableRow>
                            <TableCell colSpan={preview.columns.length} className="text-center text-sm text-slate-500">
                              Keine gültigen Daten gefunden.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      {preview && (
                        <TableCaption>
                          Zeigt {visibleRows.length} Zeilen{hiddenRows > 0 ? ` (+ ${hiddenRows} weitere)` : ""}.
                        </TableCaption>
                      )}
                    </Table>
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
