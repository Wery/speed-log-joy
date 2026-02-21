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

export function tracksToCSV(tracks: Track[]): string {
  const header = 'name,lat1,lng1,lat2,lng2';
  const rows = tracks.map(t =>
    `${t.name},${t.finishLinePoint1.lat},${t.finishLinePoint1.lng},${t.finishLinePoint2.lat},${t.finishLinePoint2.lng}`
  );
  return [header, ...rows].join('\n');
}

export function parseTracksCsv(csvContent: string): Track[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const [name, lat1, lng1, lat2, lng2] = line.split(',').map(c => c.trim());
    return {
      id: crypto.randomUUID(),
      name: name || 'Unknown',
      finishLinePoint1: { lat: parseFloat(lat1) || 0, lng: parseFloat(lng1) || 0 },
      finishLinePoint2: { lat: parseFloat(lat2) || 0, lng: parseFloat(lng2) || 0 },
    };
  });
}

export function getBestLap(laps: LapTime[]): LapTime | null {
  if (laps.length === 0) return null;
  return laps.reduce((best, lap) => lap.timeMs < best.timeMs ? lap : best);
}
