import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface MapPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number) => void;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

// Ładuje skrypt Google Maps jednorazowo
let gmapsLoaded = false;
let gmapsLoading = false;
const gmapsCallbacks: Array<() => void> = [];

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) { resolve(); return; }
    if (gmapsLoaded) { resolve(); return; }

    gmapsCallbacks.push(resolve);
    if (gmapsLoading) return;
    gmapsLoading = true;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gmapsLoaded = true;
      gmapsLoading = false;
      gmapsCallbacks.forEach(cb => cb());
      gmapsCallbacks.length = 0;
    };
    script.onerror = () => reject(new Error("Nie udało się załadować Google Maps."));
    document.head.appendChild(script);
  });
}

const MapPickerDialog = ({ open, onOpenChange, initialLat, initialLng, onConfirm }: MapPickerDialogProps) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  const defaultLat = (initialLat && isFinite(initialLat)) ? initialLat : 52.0;
  const defaultLng = (initialLng && isFinite(initialLng)) ? initialLng : 19.0;
  const defaultZoom = (initialLat && isFinite(initialLat)) ? 16 : 6;

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setError("");
    setLoading(true);

    loadGoogleMaps()
      .then(() => {
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [open]);

  // Inicjalizuj mapę po załadowaniu skryptu i zamontowaniu diva
  useEffect(() => {
    if (loading || error || !open || !mapDivRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google.maps;

    const map = new g.Map(mapDivRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: defaultZoom,
      mapTypeId: "satellite",
      disableDefaultUI: false,
      streetViewControl: false,
      mapTypeControl: true,
    });
    mapRef.current = map;

    // Marker – niewidoczny dopóki nie kliknie
    const marker = new g.Marker({ map, draggable: true, visible: false });
    markerRef.current = marker;

    // Kliknięcie mapy → przesuń marker
    map.addListener("click", (e: { latLng: { lat: () => number; lng: () => number } }) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      marker.setVisible(true);
      setPicked({ lat, lng });
    });

    // Przeciągnięcie markera → zaktualizuj pozycję
    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) setPicked({ lat: pos.lat(), lng: pos.lng() });
    });

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).google?.maps?.event?.clearInstanceListeners?.(map);
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, open]);

  const handleConfirm = () => {
    if (!picked) return;
    onConfirm(picked.lat, picked.lng);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Wybierz punkt na mapie</DialogTitle>
        </DialogHeader>

        {/* Mapa */}
        <div className="relative w-full" style={{ height: "420px" }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Ładowanie mapy…</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div ref={mapDivRef} className="w-full h-full" />
        </div>

        <DialogFooter className="px-4 py-3 flex items-center justify-between gap-2 border-t">
          <p className="text-xs text-muted-foreground font-mono">
            {picked
              ? `Lat: ${picked.lat.toFixed(7)}  Lon: ${picked.lng.toFixed(7)}`
              : "Kliknij na mapie, aby wybrać punkt"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button size="sm" disabled={!picked} onClick={handleConfirm}>
              Zatwierdź
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MapPickerDialog;
