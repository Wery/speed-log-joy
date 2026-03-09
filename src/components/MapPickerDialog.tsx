import { useEffect, useRef, useState, useCallback } from "react";
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
let gmapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps) return Promise.resolve();
  if (gmapsPromise) return gmapsPromise;

  gmapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gmapsPromise = null;
      reject(new Error("Nie udało się załadować Google Maps."));
    };
    document.head.appendChild(script);
  });
  return gmapsPromise;
}

const MapPickerDialog = ({ open, onOpenChange, initialLat, initialLng, onConfirm }: MapPickerDialogProps) => {
  const [mapsReady, setMapsReady] = useState(false);
  const [error, setError]   = useState("");
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const centerLat = initialLat && isFinite(initialLat) ? initialLat : 52.0;
  const centerLng = initialLng && isFinite(initialLng) ? initialLng : 19.0;
  const zoom      = initialLat && isFinite(initialLat) ? 16 : 6;

  // Załaduj API gdy dialog się otwiera; wyczyść gdy się zamyka
  useEffect(() => {
    if (!open) {
      setMapsReady(false);
      setPicked(null);
      setError("");
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).google?.maps?.event?.clearInstanceListeners?.(mapInstanceRef.current);
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(e => setError((e as Error).message));
  }, [open]);

  // Callback ref – odpala się gdy div jest zamontowany LUB gdy mapsReady się zmieni.
  // Dzięki temu działa zarówno gdy API ładuje się po raz pierwszy (div gotowy przed API)
  // jak i przy kolejnych otwarciach (API gotowe przed divem).
  const mapDivRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !mapsReady) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google.maps;

    const map = new g.Map(node, {
      center: { lat: centerLat, lng: centerLng },
      zoom,
      mapTypeId: "satellite",
      streetViewControl: false,
      mapTypeControl: true,
    });
    mapInstanceRef.current = map;

    const marker = new g.Marker({ map, draggable: true, visible: false });
    markerRef.current = marker;

    map.addListener("click", (e: { latLng: { lat: () => number; lng: () => number } }) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      marker.setVisible(true);
      setPicked({ lat, lng });
    });

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) setPicked({ lat: pos.lat(), lng: pos.lng() });
    });
  // centerLat/centerLng/zoom nie zmieniają się w trakcie życia dialogu — mapsReady wystarczy
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

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

        <div className="relative w-full" style={{ height: "420px" }}>
          {!mapsReady && !error && (
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
