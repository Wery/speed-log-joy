import { useState, useRef } from "react";
import { Track } from "@/types/laptimer";
import { tracksToCSV, parseTracksCsv } from "@/lib/laptimer-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Download, Upload, MoreVertical, Pencil, Trash2, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import TrackEditDialog from "./TrackEditDialog";

interface TracksPopupProps {
  tracks: Track[];
  onTracksChange: (tracks: Track[]) => void;
}

const TracksPopup = ({ tracks, onTracksChange }: TracksPopupProps) => {
  const [open, setOpen] = useState(false);
  const [editTrack, setEditTrack] = useState<Track | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const csv = tracksToCSV(tracks);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tracks.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const text = await files[0].text();
    const imported = parseTracksCsv(text);
    onTracksChange([...tracks, ...imported]);
  };

  const handleDelete = (id: string) => {
    onTracksChange(tracks.filter(t => t.id !== id));
  };

  const handleSaveEdit = (updated: Track) => {
    onTracksChange(tracks.map(t => t.id === updated.id ? updated : t));
  };

  const handleSaveNew = (newTrack: Track) => {
    onTracksChange([...tracks, newTrack]);
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
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Importuj CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={tracks.length === 0}>
              <Download className="w-3.5 h-3.5" /> Eksportuj CSV
            </Button>
            <div className="flex-1" />
            <Button size="icon" variant="outline" onClick={() => setAddOpen(true)} className="h-8 w-8">
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
                    P1: {track.finishLinePoint1.lat.toFixed(4)}, {track.finishLinePoint1.lng.toFixed(4)} •
                    P2: {track.finishLinePoint2.lat.toFixed(4)}, {track.finishLinePoint2.lng.toFixed(4)}
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
