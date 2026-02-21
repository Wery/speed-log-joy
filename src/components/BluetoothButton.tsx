import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bluetooth, BluetoothConnected } from "lucide-react";

const BluetoothButton = () => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState("");

  const handleConnect = async () => {
    if (connected) {
      setConnected(false);
      setDeviceName("");
      return;
    }

    try {
      setConnecting(true);
      // @ts-ignore - Web Bluetooth API
      if (!navigator.bluetooth) {
        alert("Bluetooth Web API nie jest dostępne w tej przeglądarce.");
        return;
      }
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [],
      });
      setDeviceName(device.name || "Urządzenie BT");
      setConnected(true);
    } catch (err) {
      console.log("Bluetooth cancelled or failed:", err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Button
      variant={connected ? "default" : "outline"}
      className={`gap-2 ${connected ? 'animate-pulse-glow' : ''}`}
      onClick={handleConnect}
      disabled={connecting}
    >
      {connected ? <BluetoothConnected className="w-4 h-4" /> : <Bluetooth className="w-4 h-4" />}
      {connecting ? "Łączenie..." : connected ? deviceName : "Connect"}
    </Button>
  );
};

export default BluetoothButton;
