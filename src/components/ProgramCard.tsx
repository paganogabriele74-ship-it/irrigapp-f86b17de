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
}

export const ProgramCard = ({ program, highlightTime, compact }: Props) => {
  const times = (program.program_times ?? []).map(t => t.start_time).sort();

  return (
    <Link to={`/programmi/${program.id}`} className="block group">
      <Card className={cn(
        "overflow-hidden border-border/60 shadow-soft hover:shadow-elevated transition-base",
        !program.active && "opacity-60"
      )}>
        <div className="flex">
          {program.image_url && (
            <div className="w-24 sm:w-28 shrink-0 bg-muted">
              <SignedImage path={program.image_url} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 p-3 sm:p-4 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-bold truncate transition-base text-lg sm:text-xl text-foreground">{program.name}</h3>
                {!program.active && <span className="text-xs text-muted-foreground">Disattivato</span>}
              </div>
              <Badge className={cn("shrink-0 border-0 text-sm font-semibold px-2.5 py-1", DOSAGE_COLORS[program.dosage])}>
                <Droplets className="size-3.5 mr-1" />
                {DOSAGE_LABELS[program.dosage]}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Layers className="size-4" />
                Settori <span className="text-foreground font-bold text-base">{formatSectors(program.sectors)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <AlarmClock className="size-4" />
                <span className="text-foreground font-bold text-base">{program.duration_minutes} min</span>
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
