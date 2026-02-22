export interface LapTime {
  lapNumber: number;
  time: string; // format: "M:SS.mmm"
  timeMs: number; // milliseconds for sorting
  sector1?: string;
  sector2?: string;
  sector3?: string;
  sessionName: string;
  trackName: string;
  date: string;      // format: "YYYY-MM-DD"
  startTime: string; // format: "HH:MM"
}

export interface Session {
  id: string;
  name: string;
  date: string;
  trackName: string;
  laps: LapTime[];
}

export interface TrackCoordinate {
  lat: number;
  lng: number;
}

export interface Track {
  id: string;
  name: string;
  finishLinePoint1: TrackCoordinate;
  finishLinePoint2: TrackCoordinate;
}

export type SortDirection = 'asc' | 'desc';
export type SortField = 'lapNumber' | 'time' | 'sessionName' | 'date' | 'delta';
