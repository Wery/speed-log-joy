// =============================================================
// BLEDashboard.tsx
// Przykładowy komponent pokazujący jak używać useBLE + parseCsv
// Możesz go wkleić bezpośrednio lub rozłożyć na mniejsze komponenty.
// =============================================================

import { useRef, useState } from "react";
import { useBLE } from "@/hooks/useBLE";
import { computeStats, msToText, bytesToPretty } from "@/lib/parseCsv";

export default function BLEDashboard() {
  const {
    connected,
    sessions,
    activeFileName,
    laps,
    logText,
    logRightText,
    connect,
    listSessions,
    openSessionCsv,
    downloadSessionFile,
    downloadTracks,
    uploadTracks,
  } = useBLE();

  const [filter, setFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = sessions.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  const stats = computeStats(laps);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <h2 className="text-sm font-bold tracking-wide">ESP32 SD over BLE</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={connect}
            className="rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-400/20 to-teal-300/15 px-3 py-2 text-xs font-bold transition hover:brightness-110"
          >
            {connected ? "Connected ✓" : "Connect"}
          </button>
          <button
            onClick={listSessions}
            disabled={!connected}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold transition hover:bg-white/10 disabled:opacity-40"
          >
            List /SESSIONS
          </button>
          <button
            onClick={downloadTracks}
            disabled={!connected}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold transition hover:bg-white/10 disabled:opacity-40"
          >
            Download TRACKS.CSV
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[360px_1fr]">
        {/* LEFT – lista sesji */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-xs font-extrabold tracking-wide">/SESSIONS</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-400">
              {filtered.length}
            </span>
          </div>

          {/* Filtr */}
          <div className="border-b border-white/10 px-4 py-2.5">
            <input
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
              placeholder="Szukaj… np. 20250815_0843"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {/* Lista plików */}
          <div className="max-h-[540px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 font-mono text-xs text-slate-500">No files</div>
            ) : (
              filtered.map((f) => (
                <div
                  key={f.name}
                  className={`flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5 transition hover:bg-white/5 ${
                    f.name === activeFileName
                      ? "bg-gradient-to-r from-blue-400/10 to-teal-300/5"
                      : ""
                  }`}
                >
                  <div>
                    <div
                      className="max-w-[200px] cursor-pointer truncate rounded-lg px-1.5 py-1 font-mono text-[12.5px] hover:bg-blue-400/10"
                      title={f.name}
                      onClick={() => openSessionCsv(f.name)}
                    >
                      {f.name}
                    </div>
                    <div className="font-mono text-[11.5px] text-slate-400">
                      {bytesToPretty(f.size)}
                    </div>
                  </div>
                  <button
                    onClick={() => downloadSessionFile(f.name)}
                    className="flex-shrink-0 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] font-bold transition hover:bg-white/10"
                  >
                    Download
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Upload TRACKS.CSV */}
          <div className="border-t border-white/10 px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-slate-400">Replace TRACKS.CSV:</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="text-xs text-slate-400"
              />
              <button
                disabled={!connected}
                onClick={() => {
                  const file = fileInputRef.current?.files?.[0];
                  if (file) uploadTracks(file);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] font-bold transition hover:bg-white/10 disabled:opacity-40"
              >
                Upload & Replace
              </button>
            </div>
            {/* Log lewy */}
            <pre className="max-h-52 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-[12px] leading-snug text-slate-400">
              {logText || "…"}
            </pre>
          </div>
        </section>

        {/* RIGHT – tabela okrążeń */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-xs font-extrabold tracking-wide">Czasy okrążeń</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-400">
              {activeFileName || "brak"}
            </span>
          </div>

          <div className="px-4 py-3">
            {/* Statystyki */}
            <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono">
                {laps.length} lap
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono">
                best: {msToText(stats.best)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono">
                avg: {msToText(stats.avg)}
              </span>
              <span className="text-slate-400">
                Kliknij nazwę pliku po lewej, aby wczytać CSV.
              </span>
            </div>

            {/* Tabela */}
            <table className="w-full border-collapse font-mono text-[12px]">
              <thead>
                <tr>
                  <th className="w-20 border-b border-white/10 py-2 text-left text-slate-400">
                    Numer
                  </th>
                  <th className="border-b border-white/10 py-2 text-left text-slate-400">
                    Godzina okrążenia
                  </th>
                  <th className="w-36 border-b border-white/10 py-2 text-left text-slate-400">
                    Czas
                  </th>
                </tr>
              </thead>
              <tbody>
                {laps.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-2 text-slate-500">
                      Brak danych.
                    </td>
                  </tr>
                ) : (
                  laps.map((r) => {
                    const isBest =
                      Number.isFinite(r.lapMs) &&
                      Number.isFinite(stats.best) &&
                      r.lapMs === stats.best;
                    return (
                      <tr
                        key={r.lapNo}
                        className={
                          isBest
                            ? "bg-blue-400/15 [&>td]:border-b [&>td]:border-blue-400/30"
                            : "[&>td]:border-b [&>td]:border-white/10"
                        }
                      >
                        <td className="py-2.5">{r.lapNo}</td>
                        <td className="py-2.5">
                          {r.startDate} {r.startTime}
                        </td>
                        <td className="py-2.5">
                          {r.lapTime || msToText(r.lapMs)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Log prawy */}
            <pre className="mt-3 max-h-52 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-[12px] leading-snug text-slate-400">
              {logRightText || "…"}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}