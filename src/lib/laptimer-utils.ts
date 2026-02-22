import { LapTime, Session, Track } from "@/types/laptimer";

export function parseTimeToMs(time: string): number {
  // Parse "M:SS.mmm" or "SS.mmm"
  const parts = time.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const [seconds, ms] = parts[1].split('.');
    return minutes * 60000 + parseInt(seconds, 10) * 1000 + parseInt(ms || '0', 10);
  }
  const [seconds, ms] = parts[0].split('.');
  return parseInt(seconds, 10) * 1000 + parseInt(ms || '0', 10);
}

export function formatMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

export function parseLapsCsv(csvContent: string, sessionName: string): LapTime[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const header = lines[0].toLowerCase();
  const headers = header.split(',').map(h => h.trim());
  
  const lapIdx = headers.findIndex(h => h.includes('lap'));
  const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('czas'));
  
  if (timeIdx === -1) return [];

  return lines.slice(1).filter(l => l.trim()).map((line, i) => {
    const cols = line.split(',').map(c => c.trim());
    const timeStr = cols[timeIdx] || '0:00.000';
    const timeMs = parseTimeToMs(timeStr);
    return {
      lapNumber: lapIdx !== -1 ? parseInt(cols[lapIdx], 10) || (i + 1) : i + 1,
      time: timeStr,
      timeMs,
      sessionName,
    };
  });
}

export function parseSessionCsv(csvContent: string, fileName: string): Session {
  const name = fileName.replace(/\.csv$/i, '');
  const laps = parseLapsCsv(csvContent, name);
  return {
    id: crypto.randomUUID(),
    name,
    date: new Date().toISOString().split('T')[0],
    trackName: '',
    laps,
  };
}

// Generuje TRACKS.CSV w formacie urządzenia ESP32:
// id;name;lat1_×1e7;lng1_×1e7;lat2_×1e7;lng2_×1e7 (bez nagłówka)
export function tracksToCSV(tracks: Track[]): string {
  return tracks.map((t, i) =>
    [
      i + 1,
      t.name,
      Math.round(t.finishLinePoint1.lat * 1e7),
      Math.round(t.finishLinePoint1.lng * 1e7),
      Math.round(t.finishLinePoint2.lat * 1e7),
      Math.round(t.finishLinePoint2.lng * 1e7),
    ].join(';')
  ).join('\n');
}

// Konwertuje całkowitoliczbową współrzędną z GPS (stopnie × 10^6 lub 10^7)
// na stopnie dziesiętne. Jeśli wartość /1e6 wykracza poza zakres ±180, dzieli przez 1e7.
function intCoordToDeg(v: number): number {
  const d = v / 1e6;
  return Math.abs(d) > 180 ? v / 1e7 : d;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    // odrzuć współrzędne bliskie (0,0) — oznaczają uszkodzone dane
    (Math.abs(lat) > 0.5 || Math.abs(lng) > 0.5)
  );
}

export function parseTracksCsv(csvContent: string): Track[] {
  const lines = csvContent.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // Wykryj format po separatorze pierwszej linii zawierającej dane liczbowe.
  // Format ESP32: id;name;lat1;lng1;lat2;lng2 (separator ";", bez nagłówka)
  // Format lokalny: name,lat1,lng1,lat2,lng2  (separator ",", z nagłówkiem)
  const hasSemicolon = lines.some(l => l.includes(';'));

  if (hasSemicolon) {
    return lines
      .filter(l => l.includes(';'))
      .map(line => {
        const cols = line.split(';').map(c => c.trim());
        // wymagane dokładnie 6 pól: id;name;lat1;lng1;lat2;lng2
        if (cols.length < 6) return null;
        const lat1 = intCoordToDeg(Number(cols[2]));
        const lng1 = intCoordToDeg(Number(cols[3]));
        const lat2 = intCoordToDeg(Number(cols[4]));
        const lng2 = intCoordToDeg(Number(cols[5]));
        if (!isValidCoord(lat1, lng1) || !isValidCoord(lat2, lng2)) return null;
        return {
          id: crypto.randomUUID(),
          name: cols[1] || 'Unknown',
          finishLinePoint1: { lat: lat1, lng: lng1 },
          finishLinePoint2: { lat: lat2, lng: lng2 },
        };
      })
      .filter((t): t is Track => t !== null);
  }

  // Format lokalny z nagłówkiem (name,lat1,lng1,lat2,lng2)
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    if (cols.length < 5) return null;
    const lat1 = parseFloat(cols[1]);
    const lng1 = parseFloat(cols[2]);
    const lat2 = parseFloat(cols[3]);
    const lng2 = parseFloat(cols[4]);
    if (!isValidCoord(lat1, lng1) || !isValidCoord(lat2, lng2)) return null;
    return {
      id: crypto.randomUUID(),
      name: cols[0] || 'Unknown',
      finishLinePoint1: { lat: lat1, lng: lng1 },
      finishLinePoint2: { lat: lat2, lng: lng2 },
    };
  }).filter((t): t is Track => t !== null);
}

export function getBestLap(laps: LapTime[]): LapTime | null {
  if (laps.length === 0) return null;
  return laps.reduce((best, lap) => lap.timeMs < best.timeMs ? lap : best);
}
