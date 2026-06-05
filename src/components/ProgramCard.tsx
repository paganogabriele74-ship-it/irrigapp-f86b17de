import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlarmClock, Clock, Droplets, Layers, Timer } from "lucide-react";
import { DOSAGE_COLORS, DOSAGE_LABELS, formatSectors, formatTime, Program } from "@/lib/irrigation";
import { SignedImage } from "./SignedImage";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  program: Program;
  highlightTime?: string;
  compact?: boolean;
  readonly?: boolean;
}

export const ProgramCard = ({ program, highlightTime, compact, readonly }: Props) => {
  const times = (program.program_times ?? []).map(t => t.start_time).sort();

  const Wrapper: any = readonly ? "div" : Link;
  const wrapperProps = readonly ? { className: "block" } : { to: `/programmi/${program.id}`, className: "block group" };

  return (
    <Wrapper {...wrapperProps}>
      <Card className={cn(
        "overflow-hidden border-border/60 shadow-soft hover:shadow-elevated transition-base",
        compact && "border-primary/15",
        !program.active && "opacity-60"
      )}>
        <div className={cn("flex", compact && "flex-col sm:flex-row")}>
          {program.image_url && (
            <div className={cn("shrink-0 bg-muted", compact ? "h-32 w-full sm:h-auto sm:w-28" : "w-24 sm:w-28")}>
              <SignedImage path={program.image_url} className="w-full h-full object-cover" />
            </div>
          )}
          <div className={cn("flex-1 p-3 sm:p-4 min-w-0", compact && "p-3") }>
            <div className={cn("flex items-start justify-between gap-2 mb-2", compact && "flex-col sm:flex-row sm:items-start")}>
              <div className="min-w-0">
                <h3 className={cn(
                  "font-bold transition-base text-lg sm:text-xl text-foreground",
                  compact ? "text-xl leading-tight break-words" : "truncate"
                )}>{program.name}</h3>
                {!program.active && <span className="text-xs text-muted-foreground">Disattivato</span>}
                {program.week_pattern && program.week_pattern !== "every" && (
                  <span className="ml-1 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-accent-foreground align-middle">
                    Sett. {program.week_pattern === "A" ? "concime" : "acido"}
                  </span>
                )}
                {program.sector_mode === "sequential" && (
                  <span className="ml-1 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground align-middle">
                    Uno alla volta
                  </span>
                )}
              </div>
              <Badge className={cn("shrink-0 border-0 text-sm font-semibold px-2.5 py-1", compact && "text-xs sm:text-sm", DOSAGE_COLORS[program.dosage])}>
                <Droplets className="size-3.5 mr-1" />
                {DOSAGE_LABELS[program.dosage]}
              </Badge>
            </div>

            <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm", compact && "grid grid-cols-2 gap-2") }>
              <span className={cn("flex items-center gap-1.5 text-muted-foreground", compact && "rounded-lg bg-secondary/70 p-2") }>
                <Layers className={cn("size-4", compact && "size-5 text-primary")} />
                <span className={cn(compact && "flex flex-col leading-tight")}>Settori <span className={cn("text-foreground font-bold text-base", compact && "text-xl")}>{formatSectors(program.sectors)}</span></span>
              </span>
              <span className={cn("flex items-center gap-1.5 text-muted-foreground", compact && "rounded-lg bg-secondary/70 p-2") }>
                <AlarmClock className={cn("size-4", compact && "size-5 text-primary")} />
                <span className={cn(compact && "flex flex-col leading-tight")}>Durata <span className={cn("text-foreground font-bold text-base", compact && "text-xl")}>{program.duration_minutes} min</span></span>
              </span>
            </div>

            {!compact && times.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {times.map((t) => (
                  <span
                    key={t}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium tabular-nums",
                      highlightTime === t.slice(0, 5)
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <Clock className="size-3" />
                    {formatTime(t)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};
