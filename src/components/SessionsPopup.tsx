import { useState, useMemo, useRef } from "react";
import { Session } from "@/types/laptimer";
import { SessionFile } from "@/hooks/useBLE";
import { parseSessionCsv } from "@/lib/laptimer-utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  List, Search, Upload, X, CheckCircle, Loader2, Download, HardDriveDownload,
} from "lucide-react";

interface SessionsPopupProps {
  sessions: Session[];
  onSessionsChange: (sessions: Session[]) => void;
  selectedSessionIds: string[];
  onSelectionChange: (ids: string[]) => void;
  bleConnected?: boolean;
  bleSessionFiles?: SessionFile[];
  bleLoadingFile?: boolean;
  bleLoadingName?: string;
  bleProgress?: number | null;
  onBleSessionLoad?: (fileName: string) => Promise<Session>;
}

const SessionsPopup = ({
  sessions,
  onSessionsChange,
  selectedSessionIds,
  onSelectionChange,
  bleConnected = false,
  bleSessionFiles = [],
  bleLoadingFile = false,
  bleLoadingName = "",
  bleProgress = null,
  onBleSessionLoad,
}: SessionsPopupProps) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Upload lokalnego CSV --------------------------------
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newSessions: Session[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".csv")) continue;
      const text = await file.text();
      newSessions.push(parseSessionCsv(text, file.name));
    }
    onSessionsChange([...sessions, ...newSessions]);
    onSelectionChange([...selectedSessionIds, ...newSessions.map((s) => s.id)]);
  };

  const toggleSession = (id: string) => {
    onSelectionChange(
      selectedSessionIds.includes(id)
        ? selectedSessionIds.filter((sid) => sid !== id)
        : [...selectedSessionIds, id]
    );
  };

  const removeSession = (id: string) => {
    onSessionsChange(sessions.filter((s) => s.id !== id));
    onSelectionChange(selectedSessionIds.filter((sid) => sid !== id));
  };

  // ---- Pomocniki BLE --------------------------------------
  const sessionByBleFile = (fileName: string) =>
    sessions.find((s) => s.name === fileName.replace(/\.csv$/i, ""));

  const handleBleToggle = async (fileName: string) => {
    if (bleLoadingFile) return;
    const existing = sessionByBleFile(fileName);
    if (existing) {
      toggleSession(existing.id);
      return;
    }
    if (!onBleSessionLoad) return;
    try {
      const session = await onBleSessionLoad(fileName);
      // sesja jest już dodana do `sessions` przez Index – tylko zaznacz
      // (onBleSessionLoad w Index.tsx dodaje sesję i zwraca ją)
      onSelectionChange([...selectedSessionIds, session.id]);
    } catch (err) {
      console.error("Błąd pobierania sesji BLE:", err);
    }
  };

  // ---- Budowanie jednej wspólnej listy ---------------------
  //
  // Gdy BLE połączone: lista = pliki z urządzenia (bleSessionFiles),
  // każdy wiersz "wie" czy jest już pobrany (loaded) i zaznaczony.
  //
  // Gdy BLE niepołączone: lista = lokalne sesje jak poprzednio.
  //
  // Oba tryby są filtrowane wyszukiwarką.

  const filteredBle = useMemo(() => {
    if (!search) return bleSessionFiles;
    const q = search.toLowerCase();
    return bleSessionFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [bleSessionFiles, search]);

  const filteredLocal = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s) => s.name.toLowerCase().includes(q) || s.trackName.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const formatSize = (size: number) => {
    if (size <= 0) return "";
    if (size < 1024) return `${size} B`;
    return `${(size / 1024).toFixed(1)} KB`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <List className="w-4 h-4" />
          Sesje ({sessions.length})
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sesje wyścigowe</DialogTitle>
        </DialogHeader>

        {/* Wyszukiwarka + upload lokalny */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj sesji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {!bleConnected && (
            <>
              <Button size="icon" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4" />
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </>
          )}
        </div>

        {/* Progress bar – widoczny podczas pobierania BLE */}
        {bleConnected && bleLoadingFile && bleProgress !== null && (
          <div className="mb-3 px-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                Pobieranie: <span className="font-mono font-medium text-foreground">{bleLoadingName}</span>
              </span>
              <span className="text-xs font-mono font-semibold tabular-nums ml-2">
                {bleProgress}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
                style={{ width: `${bleProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* =========================================================
            LISTA – jeden z dwóch trybów
            ========================================================= */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1">

          {/* ---- TRYB BLE: pliki z urządzenia ---- */}
          {bleConnected && (
            <>
              {filteredBle.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  {bleSessionFiles.length === 0
                    ? "Ładowanie listy z urządzenia…"
                    : "Nie znaleziono."}
                </p>
              ) : (
                filteredBle.map((f) => {
                  const existing  = sessionByBleFile(f.name);
                  const loaded    = !!existing;
                  const selected  = loaded && selectedSessionIds.includes(existing!.id);
                  const isLoading = bleLoadingFile && bleLoadingName === f.name;

                  return (
                    <div
                      key={f.name}
                      onClick={() => handleBleToggle(f.name)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors
                        ${bleLoadingFile ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        ${selected
                          ? "border-primary/40 bg-primary/5"
                          : "border-transparent hover:bg-secondary/50"
                        }`}
                    >
                      {/* Lewa ikona: stan sesji */}
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-primary" />
                      ) : selected ? (
                        <CheckCircle className="w-4 h-4 flex-shrink-0 text-primary" />
                      ) : loaded ? (
                        // Pobrana, ale odznaczona
                        <CheckCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground/40" />
                      ) : (
                        // Jeszcze nie pobrana – ikona pobierania
                        <Download className="w-4 h-4 flex-shrink-0 text-muted-foreground/40" />
                      )}

                      {/* Nazwa i metadane */}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {loaded
                            ? `${existing!.laps.length} okrążeń • ${existing!.date}`
                            : formatSize(f.size)}
                        </p>
                      </div>

                      {/* Prawa ikona: pobrany znacznik */}
                      {loaded && !isLoading && (
                        <HardDriveDownload className="w-3.5 h-3.5 flex-shrink-0 text-primary/50" title="Pobrano" />
                      )}

                      {/* Usuń pobraną sesję */}
                      {loaded && !isLoading && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSession(existing!.id);
                          }}
                          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ---- TRYB LOKALNY: sesje bez BLE ---- */}
          {!bleConnected && (
            <>
              {filteredLocal.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  {sessions.length === 0
                    ? "Brak sesji. Załaduj pliki CSV."
                    : "Nie znaleziono sesji."}
                </p>
              ) : (
                filteredLocal.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors cursor-pointer
                      ${selectedSessionIds.includes(session.id)
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent hover:bg-secondary/50"
                      }`}
                    onClick={() => toggleSession(session.id)}
                  >
                    <CheckCircle
                      className={`w-4 h-4 flex-shrink-0 ${
                        selectedSessionIds.includes(session.id)
                          ? "text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{session.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.laps.length} okrążeń • {session.date}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSession(session.id); }}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionsPopup;