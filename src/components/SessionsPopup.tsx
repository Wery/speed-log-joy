import { useState, useMemo, useRef } from "react";
import { Session } from "@/types/laptimer";
import { parseSessionCsv } from "@/lib/laptimer-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List, Search, Upload, X, CheckCircle } from "lucide-react";

interface SessionsPopupProps {
  sessions: Session[];
  onSessionsChange: (sessions: Session[]) => void;
  selectedSessionIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const SessionsPopup = ({ sessions, onSessionsChange, selectedSessionIds, onSelectionChange }: SessionsPopupProps) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s => s.name.toLowerCase().includes(q) || s.trackName.toLowerCase().includes(q));
  }, [sessions, search]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newSessions: Session[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.csv')) continue;
      const text = await file.text();
      newSessions.push(parseSessionCsv(text, file.name));
    }
    onSessionsChange([...sessions, ...newSessions]);
    // Auto-select new sessions
    onSelectionChange([...selectedSessionIds, ...newSessions.map(s => s.id)]);
  };

  const toggleSession = (id: string) => {
    onSelectionChange(
      selectedSessionIds.includes(id)
        ? selectedSessionIds.filter(sid => sid !== id)
        : [...selectedSessionIds, id]
    );
  };

  const removeSession = (id: string) => {
    onSessionsChange(sessions.filter(s => s.id !== id));
    onSelectionChange(selectedSessionIds.filter(sid => sid !== id));
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

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj sesji..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="icon" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">
              {sessions.length === 0 ? "Brak sesji. Załaduj pliki CSV." : "Nie znaleziono sesji."}
            </p>
          )}
          {filtered.map(session => (
            <div
              key={session.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                selectedSessionIds.includes(session.id)
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-transparent hover:bg-secondary/50'
              }`}
              onClick={() => toggleSession(session.id)}
            >
              <CheckCircle className={`w-4 h-4 flex-shrink-0 ${selectedSessionIds.includes(session.id) ? 'text-primary' : 'text-muted-foreground/30'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{session.name}</p>
                <p className="text-xs text-muted-foreground">{session.laps.length} okrążeń • {session.date}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeSession(session.id); }}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionsPopup;
