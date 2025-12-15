import type { CsvPreview } from "@/types";

export function splitCsvLine(line: string, delimiter: string) {
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

export function parseCsvText(text: string): Omit<CsvPreview, "source"> {
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
