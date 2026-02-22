import { useState, useMemo } from "react";
import { Session, Track, LapTime } from "@/types/laptimer";
import LapTimesTable from "@/components/LapTimesTable";
import SessionsPopup from "@/components/SessionsPopup";
import TracksPopup from "@/components/TracksPopup";
import BluetoothButton from "@/components/BluetoothButton";
import BLEStatusModal from "@/components/BLEStatusModal";
import { Timer } from "lucide-react";
import { useBLE } from "@/hooks/useBLE";

const Index = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);

  const addSession = (session: Session) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.name === session.name);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = session;
        return updated;
      }
      return [...prev, session];
    });
    setSelectedSessionIds((prev) =>
      prev.includes(session.id) ? prev : [...prev, session.id]
    );
  };

  const ble = useBLE({ onAutoLoaded: addSession });

  const handleBleSessionLoad = async (fileName: string): Promise<Session> => {
    const session = await ble.loadSession(fileName);
    addSession(session);
    return session;
  };

  // Zamknij modal po błędzie lub po "done" (użytkownik kliknął OK)
  const handleModalDismiss = () => {
    // Wymuszamy idle – disconnect nie jest potrzebny przy samym błędzie modala
    if (ble.status.phase === "error") {
      ble.disconnect();
    }
    // Przy "done" hook sam przejdzie do idle po 800ms, ale
    // po kliknięciu OK chcemy natychmiast – wywołaj disconnect
    // tylko jeśli naprawdę błąd, inaczej wystarczy że modal zniknie
    // (status.phase zmieni się na idle przez hook po 800ms)
  };

  const allLaps = useMemo<LapTime[]>(() => {
    return sessions
      .filter((s) => selectedSessionIds.includes(s.id))
      .flatMap((s) => s.laps.map((lap) => ({ ...lap, trackName: s.trackName, date: s.date })));
  }, [sessions, selectedSessionIds]);

  return (
    <div className="min-h-screen bg-background">
      {/* Modal statusu BLE – renderowany na poziomie roota */}
      <BLEStatusModal
        status={ble.status}
        onDismiss={handleModalDismiss}
      />

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
              bleConnected={ble.connected}
              bleSessionFiles={ble.sessionFiles}
              bleLoadingFile={ble.loadingFile}
              bleLoadingName={ble.loadingName}
              bleProgress={ble.progress}
              onBleSessionLoad={handleBleSessionLoad}
            />
            <TracksPopup
              tracks={tracks}
              onTracksChange={setTracks}
              bleConnected={ble.connected}
              onBleImport={ble.loadTracksCsv}
              onBleUpload={ble.uploadTracksText}
              bleProgress={ble.progress}
            />
            <BluetoothButton
              connected={ble.connected}
              connecting={ble.connecting}
              deviceName={ble.deviceName}
              onConnect={ble.connect}
              onDisconnect={ble.disconnect}
            />
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6">
        <LapTimesTable laps={allLaps} />
      </main>
    </div>
  );
};

export default Index;