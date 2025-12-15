import { useEffect, useMemo, useState } from "react";

import { parseCsvText } from "@/lib/csv";
import type { CsvPreview, UploadResponse } from "@/types";

export type UseCsvViewOptions = {
  apiBase: string;
};

export function useCsvView({ apiBase }: UseCsvViewOptions) {
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilter, setColumnFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [preview]);

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
        try {
          const payload = await response.json();
          message = payload.message || payload.error || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      const payload: UploadResponse = await response.json();

      setPreview({
        columns: payload.columns ?? [],
        rows: payload.rows ?? [],
        totalRows: payload.totalRows ?? payload.rows?.length ?? 0,
        invalidRows: payload.invalidRows ?? payload.errors?.length ?? 0,
        delimiter: payload.delimiter ?? ";",
        filename: file.name,
        source: "backend",
        errors: payload.errors,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
      setError(`${message} (Backend unter ${apiBase} erreichbar?)`);
    } finally {
      setLoading(false);
    }
  };

  const parseLocalFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
      setPreview({ ...parsed, source: "client", filename: file.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Konnte Datei nicht lesen.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    const term = searchTerm.trim().toLowerCase();
    const targetIndex = columnFilter === "all" ? -1 : preview.columns.indexOf(columnFilter);

    return preview.rows.filter((row) => {
      if (!term) return true;
      if (targetIndex >= 0) {
        const cell = row[targetIndex] ?? "";
        return cell.toLowerCase().includes(term);
      }
      return row.some((cell) => (cell ?? "").toLowerCase().includes(term));
    });
  }, [columnFilter, preview, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!preview) return [];
    if (!sortBy) return filteredRows;

    const columnIndex = preview.columns.indexOf(sortBy);
    if (columnIndex === -1) return filteredRows;

    const sorted = [...filteredRows].sort((a, b) => {
      const aValue = a[columnIndex] ?? "";
      const bValue = b[columnIndex] ?? "";

      const aNumber = Number(aValue);
      const bNumber = Number(bValue);
      const bothNumbers = !Number.isNaN(aNumber) && !Number.isNaN(bNumber);

      if (bothNumbers) {
        return sortDirection === "asc" ? aNumber - bNumber : bNumber - aNumber;
      }

      return sortDirection === "asc" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });

    return sorted;
  }, [filteredRows, preview, sortBy, sortDirection]);

  const pageCount = Math.max(1, Math.ceil((sortedRows.length || 1) / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(start, start + pageSize);

  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount));
  }, [pageCount]);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

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
    toggleSort,
    page,
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
  };
}
