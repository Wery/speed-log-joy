import { useState } from "react";
import { RefLapFile } from "@/hooks/useBLE";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, RefreshCw, Trophy } from "lucide-react";

interface RefLapsPopupProps {
  bleConnected: boolean;
  refLapFiles: RefLapFile[];
  onListRefLaps: () => Promise<void>;
  onDeleteRefLap: (fileName: string) => Promise<void>;
}

const RefLapsPopup = ({
  bleConnected,
  refLapFiles,
  onListRefLaps,
  onDeleteRefLap,
}: RefLapsPopupProps) => {
  const [open, setOpen] = useState(false);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [listing, setListing] = useState(false);

  const handleOpen = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && bleConnected) {
      setListing(true);
      try {
        await onListRefLaps();
      } finally {
        setListing(false);
      }
    }
  };

  const handleRefresh = async () => {
    setListing(true);
    try {
      await onListRefLaps();
    } finally {
      setListing(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    setDeleting(true);
    try {
      await onDeleteRefLap(fileName);
    } catch (err) {
      console.error("Błąd usuwania referencji:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirmFile(null);
    }
  };

  const formatSize = (size: number) => {
    if (size <= 0) return "";
    if (size < 1024) return `${size} B`;
    return `${(size / 1024).toFixed(1)} KB`;
  };

  const trackIdLabel = (name: string) => {
    const m = name.match(/^0*(\d+)\.rlp$/i);
    return m ? `ID toru: ${m[1]}` : name;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2" disabled={!bleConnected}>
            <Trophy className="w-4 h-4" />
            Referencje
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-sm max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Okrążenia referencyjne
              <button
                onClick={handleRefresh}
                disabled={listing}
                className="ml-1 p-1 rounded hover:bg-secondary transition-colors"
                title="Odśwież"
              >
                <RefreshCw className={`w-4 h-4 ${listing ? "animate-spin" : ""}`} />
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
            {listing ? (
              <p className="text-center py-8 text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Ładowanie…
              </p>
            ) : refLapFiles.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Brak zapisanych referencji.
              </p>
            ) : (
              refLapFiles.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-transparent hover:bg-secondary/50"
                >
                  <Trophy className="w-4 h-4 flex-shrink-0 text-yellow-500/70" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {trackIdLabel(f.name)}{f.size > 0 ? ` • ${formatSize(f.size)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmFile(f.name)}
                    disabled={deleting}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                    title="Usuń referencję z urządzenia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteConfirmFile !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmFile(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń referencję z urządzenia?</AlertDialogTitle>
            <AlertDialogDescription>
              Plik <span className="font-mono font-semibold">{deleteConfirmFile}</span> zostanie
              trwale usunięty z karty SD. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmFile && handleDelete(deleteConfirmFile)}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RefLapsPopup;
