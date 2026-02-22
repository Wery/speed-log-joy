import { useState, useEffect } from "react";
import { Track } from "@/types/laptimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocateFixed, Loader2 } from "lucide-react";

interface TrackEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null; // null = add new
  onSave: (track: Track) => void;
}

const hasGeolocation = typeof navigator !== "undefined" && "geolocation" in navigator;

const TrackEditDialog = ({ open, onOpenChange, track, onSave }: TrackEditDialogProps) => {
  const [name, setName] = useState("");
  const [p1Lat, setP1Lat] = useState("");
  const [p1Lng, setP1Lng] = useState("");
  const [p2Lat, setP2Lat] = useState("");
  const [p2Lng, setP2Lng] = useState("");
  const [gettingGps, setGettingGps] = useState<"p1" | "p2" | null>(null);
  const [gpsError, setGpsError] = useState("");

  // Załaduj dane toru do formularza za każdym razem gdy dialog się otwiera
  useEffect(() => {
    if (open) {
      setName(track?.name ?? "");
      setP1Lat(track?.finishLinePoint1.lat.toFixed(7) ?? "");
      setP1Lng(track?.finishLinePoint1.lng.toFixed(7) ?? "");
      setP2Lat(track?.finishLinePoint2.lat.toFixed(7) ?? "");
      setP2Lng(track?.finishLinePoint2.lng.toFixed(7) ?? "");
      setGpsError("");
    }
  }, [open, track]);

  const getGps = (point: "p1" | "p2") => {
    setGettingGps(point);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(7);
        const lng = pos.coords.longitude.toFixed(7);
        if (point === "p1") { setP1Lat(lat); setP1Lng(lng); }
        else                 { setP2Lat(lat); setP2Lng(lng); }
        setGettingGps(null);
      },
      (err) => {
        setGpsError(
          err.code === 1 ? "Brak zgody na dostęp do GPS." :
          err.code === 2 ? "Lokalizacja niedostępna." :
                           "Przekroczono czas oczekiwania na GPS."
        );
        setGettingGps(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

  const GpsButton = ({ point }: { point: "p1" | "p2" }) => {
    if (!hasGeolocation) return null;
    const loading = gettingGps === point;
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 h-7 px-2 text-xs"
        disabled={gettingGps !== null}
        onClick={() => getGps(point)}
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <LocateFixed className="w-3.5 h-3.5" />}
        {loading ? "Pobieranie…" : "Pobierz GPS"}
      </Button>
    );
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Punkt 1 linii mety</p>
              <GpsButton point="p1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Szerokość (lat)</Label>
                <Input value={p1Lat} onChange={e => setP1Lat(e.target.value)} placeholder="52.1234567" className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs">Długość (lng)</Label>
                <Input value={p1Lng} onChange={e => setP1Lng(e.target.value)} placeholder="16.5678901" className="font-mono text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Punkt 2 linii mety</p>
              <GpsButton point="p2" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Szerokość (lat)</Label>
                <Input value={p2Lat} onChange={e => setP2Lat(e.target.value)} placeholder="52.1234568" className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs">Długość (lng)</Label>
                <Input value={p2Lng} onChange={e => setP2Lng(e.target.value)} placeholder="16.5678902" className="font-mono text-sm" />
              </div>
            </div>
          </div>

          {gpsError && (
            <p className="text-xs text-destructive">{gpsError}</p>
          )}

          <Button onClick={handleSave} className="w-full">
            {track ? "Zapisz zmiany" : "Dodaj tor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackEditDialog;
