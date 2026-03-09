// =============================================================
// useBLE.ts
// Flow control: ACK po każdym chunku.
// Eksportuje `phase` opisujący bieżący etap dla modala statusu.
// =============================================================

import { useCallback, useRef, useState } from "react";
import { Session } from "@/types/laptimer";
import { parseCsvToSession } from "@/lib/parseCsv";

const SVC  = "00001ff8-0000-1000-8000-00805f9b34fb";
const CTRL = "00000005-0000-1000-8000-00805f9b34fb";
const DATA = "00000006-0000-1000-8000-00805f9b34fb";

export interface SessionFile {
  name: string;
  size: number;
}

export interface RefLapFile {
  name: string;
  size: number;
}

// Etapy widoczne w modalu
export type BLEPhase =
  | "idle"          // nic się nie dzieje
  | "connecting"    // requestDevice + GATT connect
  | "listing"       // pobieranie listy sesji
  | "downloading"   // pobieranie pliku CSV
  | "done"          // zakończono – modal znika po chwili
  | "error";        // błąd

export interface BLEStatus {
  phase:       BLEPhase;
  deviceName:  string;
  fileName:    string;   // nazwa aktualnie pobieranego pliku
  progress:    number | null; // 0-100 podczas downloading
  errorMsg:    string;
}

interface UseBLEOptions {
  onAutoLoaded?: (session: Session) => void;
}

export function useBLE({ onAutoLoaded }: UseBLEOptions = {}) {
  const ctrlRef          = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const dataRef          = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const txDoneRef        = useRef<(() => void) | null>(null);
  const rxDoneRef        = useRef<(() => void) | null>(null);
  const delDoneRef       = useRef<((result: { ok: boolean; err?: string }) => void) | null>(null);
  const delRefDoneRef    = useRef<((result: { ok: boolean; err?: string }) => void) | null>(null);
  const sessionsBuf      = useRef<SessionFile[]>([]);
  const listStreaming     = useRef(false);
  const refLapsBuf       = useRef<RefLapFile[]>([]);
  const listRefStreaming  = useRef(false);
  const expectedSizeRef  = useRef<number>(0);
  const onAutoLoadedRef  = useRef(onAutoLoaded);
  onAutoLoadedRef.current = onAutoLoaded;

  const [connected,    setConnected]    = useState(false);
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>([]);
  const [refLapFiles,  setRefLapFiles]  = useState<RefLapFile[]>([]);
  const [loadingFile,  setLoadingFile]  = useState(false);
  const [loadingName,  setLoadingName]  = useState("");

  // Stan modala – jeden obiekt żeby uniknąć wielu setState
  const [status, setStatus] = useState<BLEStatus>({
    phase:      "idle",
    deviceName: "",
    fileName:   "",
    progress:   null,
    errorMsg:   "",
  });

  const setPhase = (patch: Partial<BLEStatus>) =>
    setStatus((prev) => ({ ...prev, ...patch }));

  const enc = (s: string) => new TextEncoder().encode(s);
  const dec = (dv: DataView) => new TextDecoder().decode(dv);

  function parseFields(s: string): Record<string, string> {
    const out: Record<string, string> = {};
    s.split(";").forEach((part) => {
      const i = part.indexOf("=");
      if (i > 0) out[part.slice(0, i)] = part.slice(i + 1);
    });
    return out;
  }

  // ---- Obsługa powiadomień CTRL ----------------------------
  const onCtrlNotify = useCallback((e: Event) => {
    const ev = e as BluetoothRemoteGATTCharacteristicValueChangedEvent;
    const line = dec(ev.target.value as DataView).trim();
    const f = parseFields(line);

    if (f.CMD === "DONE" && f.DIR === "TX" && txDoneRef.current) {
      txDoneRef.current(); txDoneRef.current = null;
    }
    if (f.CMD === "DONE" && f.DIR === "RX" && rxDoneRef.current) {
      rxDoneRef.current(); rxDoneRef.current = null;
    }
    if ((f.CMD === "GET" || f.CMD === "GET_TRACKS") && f.SIZE) {
      expectedSizeRef.current = Number(f.SIZE) || 0;
    }

    // Protokół A
    if (f.CMD === "LIST" && f.DIR === "SESSIONS" && typeof f.FILES === "string") {
      const parsed: SessionFile[] = [];
      for (const item of (f.FILES || "").split(",")) {
        const [name, size] = item.split(":");
        if (!name) continue;
        const bn = name.includes("/") ? name.split("/").pop()! : name;
        parsed.push({ name: bn, size: Number(size || 0) });
      }
      const sorted = parsed.sort((a, b) => b.name.localeCompare(a.name));
      sessionsBuf.current = sorted;
      setSessionFiles([...sorted]);
      return;
    }

    // Protokół B streaming
    if (line.startsWith("ITEM;")) {
      const it = parseFields(line);
      if (it.NAME) {
        const bn = it.NAME.includes("/") ? it.NAME.split("/").pop()! : it.NAME;
        sessionsBuf.current.push({ name: bn, size: Number(it.SIZE || 0) });
        listStreaming.current = true;
      }
      return;
    }

    if (f.END === "1" && f.CMD === "LIST" && listStreaming.current) {
      listStreaming.current = false;
      sessionsBuf.current.sort((a, b) => b.name.localeCompare(a.name));
      setSessionFiles([...sessionsBuf.current]);
    }

    if (f.CMD === "DEL" && delDoneRef.current) {
      if (f.OK === "1") {
        delDoneRef.current({ ok: true });
      } else if (f.ERR) {
        delDoneRef.current({ ok: false, err: f.ERR });
      }
      delDoneRef.current = null;
    }

    // LIST_REF streaming
    if (f.CMD === "LIST_REF" && f.OK === "1") {
      refLapsBuf.current = [];
      listRefStreaming.current = true;
      return;
    }
    if (line.startsWith("ITEM_REF;")) {
      const it = parseFields(line);
      if (it.NAME) refLapsBuf.current.push({ name: it.NAME, size: Number(it.SIZE || 0) });
      return;
    }
    if (f.END === "1" && f.CMD === "LIST_REF" && listRefStreaming.current) {
      listRefStreaming.current = false;
      refLapsBuf.current.sort((a, b) => a.name.localeCompare(b.name));
      setRefLapFiles([...refLapsBuf.current]);
    }

    // DEL_REF response
    if (f.CMD === "DEL_REF" && delRefDoneRef.current) {
      if (f.OK === "1") {
        delRefDoneRef.current({ ok: true });
      } else if (f.ERR) {
        delRefDoneRef.current({ ok: false, err: f.ERR });
      }
      delRefDoneRef.current = null;
    }
  }, []);

  const ctrlWrite = useCallback(async (cmd: string) => {
    if (!ctrlRef.current) throw new Error("Brak połączenia BLE");
    await ctrlRef.current.writeValue(enc(cmd));
  }, []);

  // ---- Pobierz plik (ACK flow control + progress) ----------
  const getFileText = useCallback(
    async (cmd: string): Promise<string> => {
      if (!dataRef.current || !ctrlRef.current) throw new Error("Brak połączenia BLE");

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      expectedSizeRef.current = 0;

      const onData = async (e: Event) => {
        const ev = e as BluetoothRemoteGATTCharacteristicValueChangedEvent;
        const dv = ev.target.value as DataView;
        const u8 = new Uint8Array(
          dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength)
        );
        chunks.push(u8);
        receivedBytes += u8.length;

        const total = expectedSizeRef.current;
        if (total > 0) {
          const pct = Math.min(100, Math.round((receivedBytes / total) * 100));
          setPhase({ progress: pct });
        }
      };

      await dataRef.current.startNotifications();
      dataRef.current.addEventListener("characteristicvaluechanged", onData);
      await ctrlWrite(cmd);

      await new Promise<void>((resolve) => { txDoneRef.current = resolve; });
      await new Promise((r) => setTimeout(r, 80));

      dataRef.current.removeEventListener("characteristicvaluechanged", onData);

      const total = chunks.reduce((a, c) => a + c.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { out.set(c, off); off += c.length; }

      let end = out.length;
      while (end > 0 && out[end - 1] === 0) end--;

      return new TextDecoder("utf-8").decode(out.slice(0, end)).replace(/\0/g, "");
    },
    [ctrlWrite]
  );

  const loadSessionInternal = useCallback(
    async (fileName: string): Promise<Session> => {
      const text = await getFileText(`CMD=GET;NAME=${fileName};`);
      return parseCsvToSession(text, fileName);
    },
    [getFileText]
  );

  // ---- connect ---------------------------------------------
  const connect = useCallback(async () => {
    try {
      setPhase({ phase: "connecting", errorMsg: "", progress: null });

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SVC] }],
      });

      setPhase({ phase: "connecting", deviceName: device.name || "ESP32" });

      const server = await device.gatt!.connect();
      const svc    = await server.getPrimaryService(SVC);

      ctrlRef.current = await svc.getCharacteristic(CTRL);
      dataRef.current  = await svc.getCharacteristic(DATA);

      await ctrlRef.current.startNotifications();
      ctrlRef.current.addEventListener("characteristicvaluechanged", onCtrlNotify);

      setConnected(true);

      // 1. Pobierz listę sesji
      setPhase({ phase: "listing" });
      sessionsBuf.current  = [];
      listStreaming.current = false;
      setSessionFiles([]);
      await ctrlWrite("CMD=LIST;");

      // 2. Czekaj na listę (max 3s)
      const newestFile = await new Promise<SessionFile | null>((resolve) => {
        const start = Date.now();
        const check = setInterval(() => {
          if (sessionsBuf.current.length > 0) {
            clearInterval(check);
            resolve(sessionsBuf.current[0]);
          } else if (Date.now() - start > 3000) {
            clearInterval(check);
            resolve(null);
          }
        }, 100);
      });

      // 3. Auto-pobierz najnowszy plik
      if (newestFile) {
        setLoadingFile(true);
        setLoadingName(newestFile.name);
        setPhase({ phase: "downloading", fileName: newestFile.name, progress: 0 });

        const session = await loadSessionInternal(newestFile.name);

        setPhase({ phase: "done", progress: 100 });
        onAutoLoadedRef.current?.(session);

        setTimeout(() => {
          setLoadingFile(false);
          setLoadingName("");
          setPhase({ phase: "idle", progress: null });
        }, 800);
      } else {
        setPhase({ phase: "idle" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Użytkownik anulował wybór urządzenia – nie pokazuj błędu
      if (msg.includes("cancelled") || msg.includes("User cancelled")) {
        setPhase({ phase: "idle" });
      } else {
        setPhase({ phase: "error", errorMsg: msg });
      }
    }
  }, [onCtrlNotify, ctrlWrite, loadSessionInternal]);

  const disconnect = useCallback(() => {
    ctrlRef.current?.service?.device?.gatt?.disconnect();
    ctrlRef.current = null;
    dataRef.current  = null;
    setConnected(false);
    setSessionFiles([]);
    setRefLapFiles([]);
    setLoadingFile(false);
    setLoadingName("");
    setPhase({ phase: "idle", deviceName: "", fileName: "", progress: null, errorMsg: "" });
  }, []);

  // ---- Ręczne ładowanie sesji ------------------------------
  const loadSession = useCallback(
    async (fileName: string): Promise<Session> => {
      setLoadingFile(true);
      setLoadingName(fileName);
      setPhase({ phase: "downloading", fileName, progress: 0 });
      try {
        const session = await loadSessionInternal(fileName);
        setPhase({ phase: "done", progress: 100 });
        return session;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setPhase({ phase: "error", errorMsg: msg });
        throw err;
      } finally {
        setTimeout(() => {
          setLoadingFile(false);
          setLoadingName("");
          setPhase({ phase: "idle", progress: null });
        }, 800);
      }
    },
    [loadSessionInternal]
  );

  // ---- Pobierz TRACKS.CSV ----------------------------------
  const loadTracksCsv = useCallback(
    async (): Promise<string> => {
      setPhase({ phase: "downloading", fileName: "TRACKS.CSV", progress: 0 });
      try {
        const text = await getFileText("CMD=GET_TRACKS;");
        setPhase({ phase: "done", progress: 100 });
        setTimeout(() => setPhase({ phase: "idle", progress: null }), 800);
        return text;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setPhase({ phase: "error", errorMsg: msg });
        throw err;
      }
    },
    [getFileText]
  );

  // ---- Upload TRACKS.CSV (z tekstu CSV) --------------------
  const uploadTracksText = useCallback(
    async (csvText: string) => {
      const buf = new TextEncoder().encode(csvText);
      await ctrlWrite(`CMD=PUT_TRACKS;SIZE=${buf.length};`);
      const CHUNK = 160;
      for (let off = 0; off < buf.length; off += CHUNK) {
        await dataRef.current!.writeValueWithoutResponse(buf.slice(off, off + CHUNK));
      }
      await ctrlWrite("CMD=DONE;");
      await new Promise<void>((resolve) => { rxDoneRef.current = resolve; });
    },
    [ctrlWrite]
  );

  // ---- Upload TRACKS.CSV (z pliku) -------------------------
  const uploadTracks = useCallback(
    async (file: File) => {
      const text = await file.text();
      await uploadTracksText(text);
    },
    [uploadTracksText]
  );

  // ---- Lista okrążeń referencyjnych z urządzenia ----------
  const listRefLaps = useCallback(async (): Promise<void> => {
    if (!ctrlRef.current) throw new Error("Brak połączenia BLE");
    refLapsBuf.current = [];
    listRefStreaming.current = false;
    setRefLapFiles([]);
    await ctrlWrite("CMD=LIST_REF;");
  }, [ctrlWrite]);

  // ---- Usuń referencję z urządzenia -----------------------
  const deleteRefLap = useCallback(
    async (fileName: string): Promise<void> => {
      if (!ctrlRef.current) throw new Error("Brak połączenia BLE");
      await ctrlWrite(`CMD=DEL_REF;NAME=${fileName};`);
      const result = await new Promise<{ ok: boolean; err?: string }>((resolve) => {
        delRefDoneRef.current = resolve;
        setTimeout(() => {
          if (delRefDoneRef.current) {
            delRefDoneRef.current = null;
            resolve({ ok: false, err: "timeout" });
          }
        }, 5000);
      });
      if (!result.ok) throw new Error(result.err ?? "Usuwanie referencji nieudane");
      setRefLapFiles((prev) => prev.filter((f) => f.name !== fileName));
    },
    [ctrlWrite]
  );

  // ---- Usuń plik sesji z urządzenia -----------------------
  const deleteSessionFile = useCallback(
    async (fileName: string): Promise<void> => {
      if (!ctrlRef.current) throw new Error("Brak połączenia BLE");
      await ctrlWrite(`CMD=DEL;NAME=${fileName};`);
      const result = await new Promise<{ ok: boolean; err?: string }>((resolve) => {
        delDoneRef.current = resolve;
        setTimeout(() => {
          if (delDoneRef.current) {
            delDoneRef.current = null;
            resolve({ ok: false, err: "timeout" });
          }
        }, 5000);
      });
      if (!result.ok) throw new Error(result.err ?? "Usuwanie nieudane");
      setSessionFiles((prev) => prev.filter((f) => f.name !== fileName));
    },
    [ctrlWrite]
  );

  return {
    connected,
    connecting: status.phase === "connecting",
    deviceName: status.deviceName,
    sessionFiles,
    refLapFiles,
    loadingFile,
    loadingName,
    progress:   status.progress,
    status,           // pełny obiekt dla modala
    connect,
    disconnect,
    loadSession,
    loadTracksCsv,
    uploadTracks,
    uploadTracksText,
    deleteSessionFile,
    listRefLaps,
    deleteRefLap,
  };
}