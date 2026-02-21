import { Session, Track } from "@/types/laptimer";

export const demoTracks: Track[] = [
  {
    id: "track-1",
    name: "Tor Poznań",
    finishLinePoint1: { lat: 52.3948, lng: 16.8512 },
    finishLinePoint2: { lat: 52.3950, lng: 16.8515 },
  },
  {
    id: "track-2",
    name: "Autodrom Most",
    finishLinePoint1: { lat: 50.5312, lng: 13.6345 },
    finishLinePoint2: { lat: 50.5314, lng: 13.6348 },
  },
  {
    id: "track-3",
    name: "Silesia Ring",
    finishLinePoint1: { lat: 50.3421, lng: 18.7890 },
    finishLinePoint2: { lat: 50.3423, lng: 18.7893 },
  },
];

export const demoSessions: Session[] = [
  {
    id: "session-1",
    name: "Poznań - Trening 1",
    date: "2026-02-15",
    trackName: "Tor Poznań",
    laps: [
      { lapNumber: 1, time: "1:52.341", timeMs: 112341, sessionName: "Poznań - Trening 1" },
      { lapNumber: 2, time: "1:48.712", timeMs: 108712, sessionName: "Poznań - Trening 1" },
      { lapNumber: 3, time: "1:46.205", timeMs: 106205, sessionName: "Poznań - Trening 1" },
      { lapNumber: 4, time: "1:45.890", timeMs: 105890, sessionName: "Poznań - Trening 1" },
      { lapNumber: 5, time: "1:47.123", timeMs: 107123, sessionName: "Poznań - Trening 1" },
      { lapNumber: 6, time: "1:44.567", timeMs: 104567, sessionName: "Poznań - Trening 1" },
      { lapNumber: 7, time: "1:45.012", timeMs: 105012, sessionName: "Poznań - Trening 1" },
    ],
  },
  {
    id: "session-2",
    name: "Poznań - Wyścig",
    date: "2026-02-16",
    trackName: "Tor Poznań",
    laps: [
      { lapNumber: 1, time: "1:47.890", timeMs: 107890, sessionName: "Poznań - Wyścig" },
      { lapNumber: 2, time: "1:44.231", timeMs: 104231, sessionName: "Poznań - Wyścig" },
      { lapNumber: 3, time: "1:43.987", timeMs: 103987, sessionName: "Poznań - Wyścig" },
      { lapNumber: 4, time: "1:44.102", timeMs: 104102, sessionName: "Poznań - Wyścig" },
      { lapNumber: 5, time: "1:43.456", timeMs: 103456, sessionName: "Poznań - Wyścig" },
      { lapNumber: 6, time: "1:44.678", timeMs: 104678, sessionName: "Poznań - Wyścig" },
      { lapNumber: 7, time: "1:43.210", timeMs: 103210, sessionName: "Poznań - Wyścig" },
      { lapNumber: 8, time: "1:43.891", timeMs: 103891, sessionName: "Poznań - Wyścig" },
    ],
  },
  {
    id: "session-3",
    name: "Most - Trening poranny",
    date: "2026-02-20",
    trackName: "Autodrom Most",
    laps: [
      { lapNumber: 1, time: "1:58.432", timeMs: 118432, sessionName: "Most - Trening poranny" },
      { lapNumber: 2, time: "1:54.112", timeMs: 114112, sessionName: "Most - Trening poranny" },
      { lapNumber: 3, time: "1:52.789", timeMs: 112789, sessionName: "Most - Trening poranny" },
      { lapNumber: 4, time: "1:51.345", timeMs: 111345, sessionName: "Most - Trening poranny" },
      { lapNumber: 5, time: "1:50.678", timeMs: 110678, sessionName: "Most - Trening poranny" },
      { lapNumber: 6, time: "1:51.901", timeMs: 111901, sessionName: "Most - Trening poranny" },
    ],
  },
];
