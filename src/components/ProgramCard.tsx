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
            <div className="w-20 sm:w-28 shrink-0 bg-muted">
              <SignedImage path={program.image_url} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate transition-base text-2xl text-destructive">{program.name}</h3>
                {!program.active && <span className="text-xs text-muted-foreground">Disattivato</span>}
              </div>
              <Badge className={cn("shrink-0 border-0 text-xl", DOSAGE_COLORS[program.dosage])}>
                <Droplets className="size-3 mr-1" />
                {DOSAGE_LABELS[program.dosage]}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 text-4xl">
                <Layers className="size-3.5" />
                Settori <span className="text-foreground font-medium">{formatSectors(program.sectors)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-4xl font-normal">
                <AlarmClock className="size-3.5" />
                <span className="text-foreground font-medium">{program.duration_minutes} min</span>
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
