import { BLEStatus } from "@/hooks/useBLE";
import { Bluetooth, CheckCircle2, AlertCircle, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BLEStatusModalProps {
  status: BLEStatus;
  onDismiss: () => void; // zamknij przy błędzie
}

// Etykiety kroków w pasku postępu
const STEPS = [
  { key: "connecting",  label: "Łączenie"         },
  { key: "listing",     label: "Lista sesji"       },
  { key: "downloading", label: "Pobieranie danych" },
  { key: "done",        label: "Gotowe"            },
] as const;

const STEP_KEYS = STEPS.map((s) => s.key);

function stepIndex(phase: BLEStatus["phase"]): number {
  const idx = STEP_KEYS.indexOf(phase as typeof STEP_KEYS[number]);
  return idx >= 0 ? idx : -1;
}

function phaseLabel(status: BLEStatus): string {
  switch (status.phase) {
    case "connecting":  return `Łączenie z urządzeniem…`;
    case "listing":     return "Pobieranie listy sesji…";
    case "downloading": return `Pobieranie: ${status.fileName}`;
    case "done":        return "Pobrano pomyślnie!";
    case "error":       return "Błąd połączenia";
    default:            return "";
  }
}

export default function BLEStatusModal({ status, onDismiss }: BLEStatusModalProps) {
  const visible =
    status.phase !== "idle";

  if (!visible) return null;

  const currentStep = stepIndex(status.phase);
  const isError     = status.phase === "error";
  const isDone      = status.phase === "done";

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Card */}
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200">

        {/* Icon + tytuł */}
        <div className="flex flex-col items-center gap-3 text-center">
          {isError ? (
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
          ) : isDone ? (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Bluetooth className="w-7 h-7 text-primary animate-pulse" />
            </div>
          )}

          <div>
            <p className="font-semibold text-base">
              {isError ? "Nie udało się połączyć" : isDone ? "Połączono!" : "Łączenie przez Bluetooth"}
            </p>
            {status.deviceName && !isError && (
              <p className="text-sm text-muted-foreground mt-0.5">{status.deviceName}</p>
            )}
          </div>
        </div>

        {/* Krokowy pasek postępu (tylko gdy nie ma błędu) */}
        {!isError && (
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => {
              const done    = currentStep > idx || isDone;
              const active  = currentStep === idx && !isDone;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
                  {/* Kulka */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                    ${done    ? "bg-primary text-primary-foreground"
                    : active  ? "bg-primary/20 border-2 border-primary text-primary"
                    :           "bg-muted text-muted-foreground"}`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : active ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {/* Etykieta */}
                  <span className={`text-[10px] text-center leading-tight
                    ${done || active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                  {/* Łącznik (nie po ostatnim) */}
                  {idx < STEPS.length - 1 && (
                    <div className={`hidden`} /> // spacer – linia jest w wierszu ikon
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Linia łącząca kroki */}
        {!isError && (
          <div className="relative -mt-4 px-3">
            <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{
                  width: isDone
                    ? "100%"
                    : `${Math.max(0, (currentStep / (STEPS.length - 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Bieżący status / progress */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-center text-muted-foreground min-h-[1.25rem]">
            {phaseLabel(status)}
          </p>

          {/* Progress bar pobierania pliku */}
          {status.phase === "downloading" && status.progress !== null && (
            <div className="flex flex-col gap-1">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>{status.fileName}</span>
                <span className="tabular-nums">{status.progress}%</span>
              </div>
            </div>
          )}

          {/* Błąd */}
          {isError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive font-mono break-all">
                {status.errorMsg || "Nieznany błąd"}
              </p>
            </div>
          )}
        </div>

        {/* Przycisk zamknięcia – tylko przy błędzie lub done */}
        {(isError || isDone) && (
          <Button
            variant={isError ? "destructive" : "default"}
            className="w-full"
            onClick={onDismiss}
          >
            {isError ? (
              <><WifiOff className="w-4 h-4 mr-2" /> Zamknij</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> OK</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}