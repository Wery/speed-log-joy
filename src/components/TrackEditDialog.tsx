import { useState } from "react";
import { Track, TrackCoordinate } from "@/types/laptimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TrackEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null; // null = add new
  onSave: (track: Track) => void;
}

const TrackEditDialog = ({ open, onOpenChange, track, onSave }: TrackEditDialogProps) => {
  const [name, setName] = useState(track?.name || "");
  const [p1Lat, setP1Lat] = useState(track?.finishLinePoint1.lat.toString() || "");
  const [p1Lng, setP1Lng] = useState(track?.finishLinePoint1.lng.toString() || "");
  const [p2Lat, setP2Lat] = useState(track?.finishLinePoint2.lat.toString() || "");
  const [p2Lng, setP2Lng] = useState(track?.finishLinePoint2.lng.toString() || "");

  const handleSave = () => {
    const updated: Track = {
      id: track?.id || crypto.randomUUID(),
      name: name.trim() || "Bez nazwy",
      finishLinePoint1: { lat: parseFloat(p1Lat) || 0, lng: parseFloat(p1Lng) || 0 },
      finishLinePoint2: { lat: parseFloat(p2Lat) || 0, lng: parseFloat(p2Lng) || 0 },
    };
    onSave(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{track ? "Edytuj tor" : "Dodaj nowy tor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nazwa toru</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="np. Tor Poznań" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Punkt 1 linii mety</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Szerokość (lat)</Label>
                <Input value={p1Lat} onChange={e => setP1Lat(e.target.value)} placeholder="52.1234" className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs">Długość (lng)</Label>
                <Input value={p1Lng} onChange={e => setP1Lng(e.target.value)} placeholder="16.5678" className="font-mono text-sm" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Punkt 2 linii mety</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Szerokość (lat)</Label>
                <Input value={p2Lat} onChange={e => setP2Lat(e.target.value)} placeholder="52.1235" className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs">Długość (lng)</Label>
                <Input value={p2Lng} onChange={e => setP2Lng(e.target.value)} placeholder="16.5679" className="font-mono text-sm" />
              </div>
            </div>
          </div>
          <Button onClick={handleSave} className="w-full">
            {track ? "Zapisz zmiany" : "Dodaj tor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackEditDialog;
