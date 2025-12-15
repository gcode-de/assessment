Probeaufgabe Anacision – CSV Viewer

## Struktur

- [packages/frontend](packages/frontend): React + Vite CSV-Viewer mit Upload, Vorschau und Fehlerindikatoren
- [packages/backend](packages/backend): Platzhalter für die REST-API (noch nicht implementiert)

## Setup

```bash
npm install
npm run dev       # Frontend starten
npm run build     # Frontend bauen
npm run lint      # ESLint
npm run preview   # Produktionsbuild lokal ansehen
```

## Frontend/API

- Standard-Endpunkt: `${VITE_API_BASE || '/api'}/upload` (POST, multipart/form-data, Feldname `file`).
- Erwartetes Response-JSON: `columns: string[]`, `rows: string[][]`, optional `totalRows`, `invalidRows`, `delimiter`, `errors`.
- Ohne laufendes Backend steht ein Browser-Fallback zum lokalen Parsen zur Verfügung.
  Probeaufgabe Anacision – CSV Viewer

## Struktur

- [packages/frontend](packages/frontend): React + Vite CSV-Viewer mit Upload, Vorschau und Fehlerindikatoren
- [packages/backend](packages/backend): Express REST-API für CSV-Upload und -Parsing

## Setup

```bash
npm install

# Frontend starten (Port 5173)
npm run dev

# Backend starten (Port 3001)
npm run dev:backend

# Beide gleichzeitig starten
npm run dev:all

# Alles bauen
npm run build

# ESLint
npm run lint

# Produktionsbuild lokal ansehen
npm run preview
```

## Backend

Das Backend läuft auf Port 3001 und bietet folgende Endpunkte:

- `GET /api/health` – Health check
- `POST /api/upload` – CSV-Upload mit ID-basierter Speicherung (multipart/form-data, Feld: `file`)
- `GET /api/data/:id` – Paginierte, sortierte und gefilterte Daten abrufen

```bash
cd packages/backend
npm run dev
```

Das Backend parst hochgeladene CSV-Dateien, erkennt den Delimiter automatisch (Semikolon bevorzugt), speichert die Daten in einem In-Memory-Store (TTL 1h) und liefert Metadaten samt Fehlern zu ungültigen Zeilen zurück.

### API-Endpunkte im Detail

#### `POST /api/upload`

- Erwartet: multipart/form-data mit Feld `file` (max 10 MB)
- Response (Beispiel):
  ```json
  {
    "id": "uuid-v4",
    "columns": ["Spalte1", "Spalte2"],
    "totalRows": 1000,
    "invalidRows": 5,
    "delimiter": ";",
    "errors": ["Zeile 10: ..."]
  }
  ```
- Daten werden 1 Stunde im Speicher gehalten

#### `GET /api/data/:id`

- Query-Parameter:
  - `page` (Standard: 1)
  - `pageSize` (Standard: 25)
  - `sortBy` (optional: Spaltenname)
  - `sortDirection` (optional: `asc` oder `desc`)
  - `search` (optional: Suchbegriff)
  - `searchColumn` (optional: Spaltenname oder `all`)
- Response (Beispiel):
  ```json
  {
  	"rows": [["Wert1", "Wert2"], ...],
  	"totalRows": 995
  }
  ```
  `totalRows` enthält die Anzahl der Treffer nach Anwendung von Suche/Filter; ungültige Zeilen bleiben in `invalidRows` aus dem Upload-Response ersichtlich.

## Frontend/API

- Backend: `http://localhost:3001`
- Frontend nutzt `VITE_API_BASE` (Standard: `/api`) für Proxy oder direkten Zugriff
- Upload: `POST /api/upload` (multipart/form-data, Feld `file`)
- Datenabruf: `GET /api/data/:id` (Pagination, Sortierung, Suche/Filter serverseitig)

### Architektur

Nur **Remote-Modus**: Nach dem Upload wird eine ID vergeben, alle Operationen (Pagination, Sortierung, Suche/Filter) laufen serverseitig. Der Client lädt immer nur die aktuelle Seite nach.

### Frontend-Features

- CSV-Upload mit Vorschau (Dateiname, Delimiter, gültige/ungültige Zeilen)
- Serverseitige Pagination, Sortierung und Suche/Filter (mit Debounce im Frontend)
- Suchfeld + Spaltenfilter (werden als Query-Params übergeben)
- Pagination mit konfigurierbarer Seitengröße (10/20/50/100)
- Dark-Mode-Unterstützung
- Fehleranzeige für ungültige Zeilen aus dem Upload

### Fehlerbehandlung

Ungültige Zeilen (falsche Spaltenzahl) werden übersprungen und im `errors`-Array dokumentiert (bis zu 10 Fehler werden zurückgegeben). Das Frontend zeigt diese Hinweise unterhalb der Tabelle an.

## Demo-Daten

- Beispiel: [packages/frontend/public/people.csv](packages/frontend/public/people.csv) (Semikolon-getrennt, enthält absichtlich fehlerhafte Zeilen zum Testen).

## Improvement-Ideen

- ~~Pagination/Sortierung/Filter serverseitig~~ ✅ umgesetzt
- ~~Suche serverseitig~~ ✅ umgesetzt (Query-Params + Debounce im Frontend)
- Spaltenbreiten konstanter machen, wo sinnvoll
- Drag & Drop-Ablegebereich für CSV-Dateien im Frontend
- Design-Optimierungen und bessere Responsiveness
- Backend: Persistente Speicherung statt In-Memory (z.B. Redis oder Datenbank)
- Backend: Rate-Limiting und erweiterte Validierung
- Frontend & Backend: Tests (Unit + Integration)
- Loading-Indikator während Server-Pagination
