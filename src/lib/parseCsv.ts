import { Session, LapTime } from "@/types/laptimer";

export function msToText(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  const m = Math.floor(ms / 60000);
  const rest = ms - m * 60000;
  const s = Math.floor(rest / 1000);
  const rem = rest - s * 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(rem).padStart(3, "0")}`;
}

/**
 * Parsuje tekst CSV z ESP32 i zwraca obiekt Session
 * kompatybilny z typami Lovable.
 *
 * Opcjonalna pierwsza linia z nazwą toru:
 *   track;Nazwa Toru
 * Nagłówek kolumn (separator ";"):
 *   lap_no, lap_start_date, lap_start_time, lap_time_ms, lap_time
 */
export function parseCsvToSession(csvText: string, fileName: string): Session {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Nazwa sesji z nazwy pliku, np. "20250815_0843.csv" → "20250815_0843"
  const sessionName = fileName.replace(/\.csv$/i, "");

  // Opcjonalna linia "track;Nazwa Toru" przed nagłówkiem kolumn
  let trackName = "";
  let dataLines = lines;
  if (lines[0].toLowerCase().startsWith("track;")) {
    trackName = lines[0].split(";")[1]?.trim() ?? "";
    dataLines = lines.slice(1);
  }

  if (dataLines.length < 2) {
    return {
      id: `ble-${fileName}-${Date.now()}`,
      name: sessionName,
      date: new Date().toISOString().slice(0, 10),
      trackName,
      laps: [],
    };
  }

  const header = dataLines[0].split(";").map((s) => s.trim());
  const idx = (name: string) => header.indexOf(name);

  const iLapNo   = idx("lap_no");
  const iDate    = idx("lap_start_date");
  const iTime    = idx("lap_start_time");
  const iLapMs   = idx("lap_time_ms");
  const iLapTime = idx("lap_time");

  // Data sesji z pierwszego wiersza danych (jeśli dostępna)
  const firstCols = dataLines[1].split(";").map((s) => s.trim());
  const sessionDate =
    iDate >= 0 ? firstCols[iDate] : new Date().toISOString().slice(0, 10);

  const laps: LapTime[] = dataLines
    .slice(1)
    .map((line) => {
      const cols = line.split(";").map((s) => s.trim());
      const lapNo  = iLapNo   >= 0 ? Number(cols[iLapNo])  : NaN;
      const lapMs  = iLapMs   >= 0 ? Number(cols[iLapMs])  : NaN;
      const lapTime =
        iLapTime >= 0 && cols[iLapTime] ? cols[iLapTime] : msToText(lapMs);
      const rawTime = iTime >= 0 ? cols[iTime] ?? "" : "";
      const startTime = rawTime.slice(0, 5); // "HH:MM:SS" → "HH:MM"
      return { lapNo, lapMs, lapTime, startTime };
    })
    .filter((r) => Number.isFinite(r.lapNo))
    .map((r) => ({
      lapNumber:   r.lapNo,
      time:        r.lapTime,
      timeMs:      r.lapMs,
      sessionName,
      trackName,
      date:        sessionDate,
      startTime:   r.startTime,
    }));

  return {
    id:        `ble-${fileName}-${Date.now()}`,
    name:      sessionName,
    date:      sessionDate,
    trackName,
    laps,
  };
}