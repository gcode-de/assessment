import { useEffect, useMemo, useState } from "react";

import type { CsvPreview, UploadResponse } from "@/types";

export type UseCsvViewOptions = {
  apiBase: string;
};

export function useCsvView({ apiBase }: UseCsvViewOptions) {
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [columnFilter, setColumnFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [csvId, setCsvId] = useState<string | null>(null);
  const [serverTotalRows, setServerTotalRows] = useState(0);

  // Debounce search input to reduce API calls
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const uploadFile = async (file: File) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Upload fehlgeschlagen.";
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          try {
            const payload = await response.json();
            message = payload.message || payload.error || message;
          } catch {
            // Fallback if JSON parsing fails
          }
        } else {
          try {
            const text = await response.text();
            if (text) message = text;
          } catch {
            // Ignore
          }
        }
        throw new Error(message);
      }

      const payload: UploadResponse = await response.json();

      // Store ID for remote pagination
      setCsvId(payload.id ?? "");
      setServerTotalRows(payload.totalRows ?? 0);
      // Set preview with filename and metadata
      setPreview({
        columns: payload.columns ?? [],
        rows: payload.rows ?? [],
        totalRows: payload.totalRows ?? 0,
        invalidRows: payload.invalidRows ?? 0,
        delimiter: payload.delimiter ?? ";",
        filename: file.name,
        source: "backend",
        errors: payload.errors,
      });
      // Immer auf Seite 1 starten, wenn eine neue Datei hochgeladen wurde
      setPage(1);
      // Fetch first page
      await fetchPage(payload.id ?? "", 1, pageSize);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
      setError(`${message} (Backend unter ${apiBase} erreichbar?)`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPage = async (id: string, pageNum: number, size: number) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: String(size),
      });
      if (sortBy) {
        params.set("sortBy", sortBy);
        params.set("sortDirection", sortDirection);
      }
      const effectiveSearch = debouncedSearchTerm.trim();
      if (effectiveSearch) {
        params.set("search", effectiveSearch);
        params.set("searchColumn", columnFilter);
      }

      const response = await fetch(`${apiBase}/data/${id}?${params}`);

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Daten.");
      }

      const payload = await response.json();

      setPreview((prev) => ({
        columns: payload.columns ?? [],
        rows: payload.rows ?? [],
        // Preserve Gesamtsumme aus dem Upload (prev oder serverTotalRows), nicht den gefilterten Wert aus payload
        totalRows: prev?.totalRows ?? serverTotalRows,
        invalidRows: prev?.invalidRows ?? 0,
        delimiter: prev?.delimiter ?? ";",
        filename: prev?.filename ?? "unbekannt",
        source: "backend",
        errors: prev?.errors ?? [],
      }));
      setServerTotalRows(payload.totalRows ?? serverTotalRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fehler beim Laden.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Watch for page/sort/search changes in remote mode
  useEffect(() => {
    if (csvId) {
      fetchPage(csvId, page, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortDirection, debouncedSearchTerm, columnFilter]);

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    // Filtering is done server-side, so just return the rows as-is
    return preview.rows ?? [];
  }, [preview]);

  const pageCount = Math.max(1, Math.ceil(serverTotalRows / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = preview?.rows ?? [];

  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount));
  }, [pageCount]);

  return {
    preview,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    columnFilter,
    setColumnFilter,
    sortBy,
    sortDirection,
    toggleSort: (column: string) => {
      if (sortBy === column) {
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(column);
        setSortDirection("asc");
      }
    },
    page,
    setPage,
    pageCount,
    currentPage,
    pageRows,
    pageSize,
    setPageSize,
    filteredRows,
    uploadFile,
    setError,
  };
}
