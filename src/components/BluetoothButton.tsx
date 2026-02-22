import { Button } from "@/components/ui/button";
import { Bluetooth, BluetoothConnected, Loader2 } from "lucide-react";

interface BluetoothButtonProps {
  connected: boolean;
  connecting: boolean;
  deviceName: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

const BluetoothButton = ({
  connected,
  connecting,
  deviceName,
  onConnect,
  onDisconnect,
}: BluetoothButtonProps) => {
  return (
    <Button
      variant={connected ? "default" : "outline"}
      className={`gap-2 ${connected ? "animate-pulse-glow" : ""}`}
      onClick={connected ? onDisconnect : onConnect}
      disabled={connecting}
    >
      {connecting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : connected ? (
        <BluetoothConnected className="w-4 h-4" />
      ) : (
        <Bluetooth className="w-4 h-4" />
      )}
      {connecting ? "Łączenie..." : connected ? deviceName : "Connect"}
    </Button>
  );
};

export default BluetoothButton;