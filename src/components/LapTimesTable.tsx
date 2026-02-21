import { useState, useMemo } from "react";
import { LapTime, SortDirection, SortField } from "@/types/laptimer";
import { getBestLap } from "@/lib/laptimer-utils";
import { Trophy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface LapTimesTableProps {
  laps: LapTime[];
}

const LapTimesTable = ({ laps }: LapTimesTableProps) => {
  const [sortField, setSortField] = useState<SortField>('lapNumber');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const bestLap = useMemo(() => getBestLap(laps), [laps]);

  const sortedLaps = useMemo(() => {
    return [...laps].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'lapNumber':cmp = a.lapNumber - b.lapNumber;break;
        case 'time':cmp = a.timeMs - b.timeMs;break;
        case 'sessionName':cmp = a.sessionName.localeCompare(b.sessionName);break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [laps, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: {field: SortField;}) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <div className="space-y-4">
      {/* Best lap banner */}
      {bestLap &&
      <div className="flex items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4 glow-primary shadow">
          <Trophy className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Najlepszy czas</p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-3xl font-mono font-bold text-primary text-glow">{bestLap.time}</span>
              <span className="text-sm text-muted-foreground">
                Okrążenie #{bestLap.lapNumber} • {bestLap.sessionName}
              </span>
            </div>
          </div>
        </div>
      }

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('lapNumber')} className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    # <SortIcon field="lapNumber" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('time')} className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Czas <SortIcon field="time" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('sessionName')} className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Sesja <SortIcon field="sessionName" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Delta</th>
              </tr>
            </thead>
            <tbody>
              {sortedLaps.length === 0 &&
              <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    Brak danych. Załaduj sesję wyścigową.
                  </td>
                </tr>
              }
              {sortedLaps.map((lap, i) => {
                const isBest = bestLap && lap.timeMs === bestLap.timeMs && lap.lapNumber === bestLap.lapNumber && lap.sessionName === bestLap.sessionName;
                const delta = bestLap ? lap.timeMs - bestLap.timeMs : 0;
                return (
                  <tr
                    key={`${lap.sessionName}-${lap.lapNumber}-${i}`}
                    className={`border-t border-border/50 transition-colors hover:bg-secondary/30 ${isBest ? 'bg-primary/5' : ''}`}>

                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{lap.lapNumber}</td>
                    <td className={`px-4 py-2.5 font-mono font-semibold ${isBest ? 'text-primary text-glow' : 'text-foreground'}`}>
                      {lap.time}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{lap.sessionName}</td>
                    <td className="px-4 py-2.5 font-mono text-sm">
                      {isBest ?
                      <span className="text-primary">BEST</span> :

                      <span className="text-destructive">+{(delta / 1000).toFixed(3)}</span>
                      }
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>);

};

export default LapTimesTable;