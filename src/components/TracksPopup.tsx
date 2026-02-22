import { useState, useRef, useEffect } from "react";
import { Track } from "@/types/laptimer";
import { tracksToCSV, parseTracksCsv } from "@/lib/laptimer-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Download, Upload, MoreVertical, Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import TrackEditDialog from "./TrackEditDialog";
import { toast } from "sonner";

interface TracksPopupProps {
  tracks: Track[];
  onTracksChange: (tracks: Track[]) => void;
  bleConnected?: boolean;
  onBleImport?: () => Promise<string>;
  onBleUpload?: (csvText: string) => Promise<void>;
  bleProgress?: number | null;
}

const TracksPopup = ({ tracks, onTracksChange, bleConnected, onBleImport, onBleUpload, bleProgress }: TracksPopupProps) => {
  const [open, setOpen] = useState(false);
  const [editTrack, setEditTrack] = useState<Track | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadedFromFile, setLoadedFromFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-import TRACKS.CSV po otwarciu popupa gdy BLE podłączone
  // Pomijamy jeżeli dane zostały załadowane z pliku — użytkownik sam decyduje
  useEffect(() => {
    if (!open || !bleConnected || !onBleImport || loadedFromFile) return;
    setImporting(true);
    onBleImport()
      .then(text => {
        const imported = parseTracksCsv(text);
        onTracksChange(imported);
      })
      .catch(err => {
        toast.error("Błąd pobierania TRACKS.CSV", {
          description: err instanceof Error ? err.message : "Nieznany błąd.",
          duration: 5000,
        });
      })
      .finally(() => setImporting(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadIfConnected = async (updatedTracks: Track[]) => {
    if (!bleConnected || !onBleUpload) return;
    setUploading(true);
    try {
      await onBleUpload(tracksToCSV(updatedTracks));
      setLoadedFromFile(false);
      toast.success("TRACKS.CSV przesłany do urządzenia", {
        description: `${updatedTracks.length} ${updatedTracks.length === 1 ? "tor" : "torów"} zapisanych.`,
        duration: 3000,
      });
    } catch (err) {
      toast.error("Błąd przesyłania TRACKS.CSV", {
        description: err instanceof Error ? err.message : "Nieznany błąd.",
        duration: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleExport = () => {
    const csv = tracksToCSV(tracks);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TRACKS.CSV';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const text = await files[0].text();
    const imported = parseTracksCsv(text);
    onTracksChange([...tracks, ...imported]);
    setLoadedFromFile(true);
  };

  const handleBleImport = async () => {
    if (!onBleImport) return;
    setImporting(true);
    try {
      const text = await onBleImport();
      const imported = parseTracksCsv(text);
      onTracksChange(imported);
      setLoadedFromFile(false);
    } catch (err) {
      toast.error("Błąd pobierania TRACKS.CSV", {
        description: err instanceof Error ? err.message : "Nieznany błąd.",
        duration: 5000,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExportToDevice = () => uploadIfConnected(tracks);

  const handleDelete = async (id: string) => {
    const updated = tracks.filter(t => t.id !== id);
    onTracksChange(updated);
    await uploadIfConnected(updated);
  };

  const handleSaveEdit = async (updated: Track) => {
    const updatedTracks = tracks.map(t => t.id === updated.id ? updated : t);
    onTracksChange(updatedTracks);
    await uploadIfConnected(updatedTracks);
  };

  const handleSaveNew = async (newTrack: Track) => {
    const updated = [...tracks, newTrack];
    onTracksChange(updated);
    await uploadIfConnected(updated);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <MapPin className="w-4 h-4" />
            Tory
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lista torów</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-3">
            {!bleConnected && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Importuj CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={tracks.length === 0}>
                  <Download className="w-3.5 h-3.5" /> Eksportuj CSV
                </Button>
              </>
            )}
            {bleConnected && loadedFromFile && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBleImport} disabled={importing || uploading}>
                  <Upload className="w-3.5 h-3.5" /> Importuj z urządzenia
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportToDevice} disabled={importing || uploading || tracks.length === 0}>
                  <Download className="w-3.5 h-3.5" /> Wyślij do urządzenia
                </Button>
              </>
            )}
            <div className="flex-1" />
            <Button size="icon" variant="outline" onClick={() => setAddOpen(true)} className="h-8 w-8" disabled={importing || uploading}>
              <Plus className="w-4 h-4" />
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => handleImport(e.target.files)}
            />
          </div>

          {importing && (
            <div className="space-y-1.5 pb-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Pobieranie TRACKS.CSV…
                </span>
                {bleProgress != null && <span>{bleProgress}%</span>}
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${bleProgress ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-1.5 pb-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Wysyłanie do urządzenia…
              </p>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary animate-pulse" style={{ width: "100%" }} />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {tracks.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Brak torów. Importuj plik CSV lub dodaj ręcznie.
              </p>
            )}
            {tracks.map(track => (
              <div
                key={track.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-transparent hover:bg-secondary/50 transition-colors"
              >
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{track.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    P1: {track.finishLinePoint1.lat.toFixed(7)}, {track.finishLinePoint1.lng.toFixed(7)} •
                    P2: {track.finishLinePoint2.lat.toFixed(7)}, {track.finishLinePoint2.lng.toFixed(7)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditTrack(track); setEditOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edytuj
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(track.id)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Usuń
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <TrackEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        track={editTrack}
        onSave={handleSaveEdit}
      />
      <TrackEditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        track={null}
        onSave={handleSaveNew}
      />
    </>
  );
};

export default TracksPopup;
