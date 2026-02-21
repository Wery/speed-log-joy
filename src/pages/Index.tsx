import { useState, useMemo } from "react";
import { Session, Track, LapTime } from "@/types/laptimer";
import LapTimesTable from "@/components/LapTimesTable";
import SessionsPopup from "@/components/SessionsPopup";
import TracksPopup from "@/components/TracksPopup";
import BluetoothButton from "@/components/BluetoothButton";
import { Timer } from "lucide-react";

const Index = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);

  const allLaps = useMemo<LapTime[]>(() => {
    return sessions
      .filter(s => selectedSessionIds.includes(s.id))
      .flatMap(s => s.laps);
  }, [sessions, selectedSessionIds]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">LapTimer</h1>
              <p className="text-xs text-muted-foreground">Analiza czasów okrążeń</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SessionsPopup
              sessions={sessions}
              onSessionsChange={setSessions}
              selectedSessionIds={selectedSessionIds}
              onSelectionChange={setSelectedSessionIds}
            />
            <TracksPopup tracks={tracks} onTracksChange={setTracks} />
            <BluetoothButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-5xl mx-auto px-4 py-6">
        <LapTimesTable laps={allLaps} />
      </main>
    </div>
  );
};

export default Index;
