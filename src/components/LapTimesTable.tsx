import React, { useState, useMemo } from "react";
import { LapTime, SortDirection, SortField } from "@/types/laptimer";
import { getBestLap } from "@/lib/laptimer-utils";
import { Trophy, ArrowUpDown, ArrowUp, ArrowDown, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LapTimesTableProps {
  laps: LapTime[];
}

function formatDelta(deltaMs: number): string {
  const abs = Math.abs(deltaMs);
  const s = Math.floor(abs / 1000);
  const ms = abs % 1000;
  const sign = deltaMs >= 0 ? "+" : "-";
  return `${sign}${s}.${String(ms).padStart(3, "0")}`;
}

const LapTimesTable = ({ laps }: LapTimesTableProps) => {
  const [sortField, setSortField] = useState<SortField>("lapNumber");
  const [sortDir, setSortDir]     = useState<SortDirection>("asc");
  const [groupByTrack, setGroupByTrack] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const globalBest = useMemo(() => getBestLap(laps), [laps]);

  const sortedLaps = useMemo(() => {
    return [...laps].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "lapNumber":   cmp = a.lapNumber - b.lapNumber; break;
        case "time":        cmp = a.timeMs - b.timeMs; break;
        case "sessionName": cmp = a.sessionName.localeCompare(b.sessionName); break;
        case "date":        cmp = `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`); break;
        case "delta":       cmp = a.timeMs - b.timeMs; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [laps, sortField, sortDir]);

  // Pogrupowane według nazwy toru, zachowując kolejność sortowania wewnątrz grup
  const groups = useMemo<Map<string, LapTime[]> | null>(() => {
    if (!groupByTrack) return null;
    const map = new Map<string, LapTime[]>();
    for (const lap of sortedLaps) {
      const key = lap.trackName || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(lap);
    }
    return map;
  }, [sortedLaps, groupByTrack]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp   className="w-3.5 h-3.5 text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  const renderRow = (lap: LapTime, bestMs: number, idx: number) => {
    const isBest  = lap.timeMs === bestMs;
    const deltaMs = lap.timeMs - bestMs;
    return (
      <tr
        key={`${lap.sessionName}-${lap.lapNumber}-${idx}`}
        className={`border-t border-border/50 transition-colors hover:bg-secondary/30 ${isBest ? "bg-primary/5" : ""}`}
      >
        <td className="px-4 py-2.5 font-mono text-muted-foreground">{lap.lapNumber}</td>
        <td className={`px-4 py-2.5 font-mono font-semibold ${isBest ? "text-primary" : "text-foreground"}`}>
          {lap.time}
        </td>
        <td className="px-4 py-2.5 text-muted-foreground text-sm">{lap.sessionName}</td>
        {!groupByTrack && (
          <td className="px-4 py-2.5 text-muted-foreground text-sm">{lap.trackName || "—"}</td>
        )}
        <td className="px-4 py-2.5 font-mono text-muted-foreground text-sm">
          {lap.date ? `${lap.date}${lap.startTime ? ` ${lap.startTime}` : ""}` : "—"}
        </td>
        <td className="px-4 py-2.5 font-mono text-sm">
          {isBest ? (
            <span className="text-primary font-semibold">BEST</span>
          ) : (
            <span className="text-destructive">{formatDelta(deltaMs)}</span>
          )}
        </td>
      </tr>
    );
  };

  const colSpan = groupByTrack ? 5 : 6;

  return (
    <div className="space-y-4">

      {/* Najlepszy czas — globalny */}
      {globalBest && (
        <div className="flex items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Trophy className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Najlepszy czas</p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-3xl font-mono font-bold text-primary">{globalBest.time}</span>
              <span className="text-sm text-muted-foreground">
                Okrążenie #{globalBest.lapNumber} • {globalBest.sessionName}{globalBest.trackName ? ` • ${globalBest.trackName}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              {globalBest.date && (
                <span className="font-mono">
                  {globalBest.date}{globalBest.startTime ? ` ${globalBest.startTime}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Przełącznik grupowania */}
      <div className="flex items-center justify-end">
        <Button
          variant={groupByTrack ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setGroupByTrack(g => !g)}
        >
          <Layers className="w-3.5 h-3.5" />
          Grupuj po torze
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("lapNumber")} className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    # <SortIcon field="lapNumber" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("time")} className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Czas <SortIcon field="time" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("sessionName")} className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Sesja <SortIcon field="sessionName" />
                  </button>
                </th>
                {!groupByTrack && (
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tor</th>
                )}
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("date")} className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Data <SortIcon field="date" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("delta")} className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Delta <SortIcon field="delta" />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedLaps.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                    Brak danych. Załaduj sesję wyścigową.
                  </td>
                </tr>
              )}

              {groups
                ? Array.from(groups.entries()).map(([trackName, trackLaps]) => {
                    const groupBest = getBestLap(trackLaps);
                    const bestMs    = groupBest?.timeMs ?? 0;
                    return (
                      <React.Fragment key={`group-${trackName}`}>
                        {/* Nagłówek grupy — klikalny */}
                        <tr
                          className="bg-secondary/70 border-t border-border cursor-pointer select-none hover:bg-secondary/90 transition-colors"
                          onClick={() => toggleGroup(trackName)}
                        >
                          <td colSpan={colSpan} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {collapsedGroups.has(trackName)
                                ? <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                : <ChevronDown  className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                              <span className="font-semibold text-sm">{trackName}</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                {trackLaps.length} okr. • najlep.: {groupBest?.time ?? "—"}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* Okrążenia grupy — ukryte gdy zwinięte */}
                        {!collapsedGroups.has(trackName) &&
                          trackLaps.map((lap, i) => renderRow(lap, bestMs, i))}
                      </React.Fragment>
                    );
                  })
                : sortedLaps.map((lap, i) => renderRow(lap, globalBest?.timeMs ?? 0, i))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LapTimesTable;
