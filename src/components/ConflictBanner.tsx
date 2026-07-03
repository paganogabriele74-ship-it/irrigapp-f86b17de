import { AlertTriangle, Clock, CalendarDays, Layers } from "lucide-react";
import { Conflict } from "@/lib/conflicts";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, WEEK_PATTERN_LABELS } from "@/lib/irrigation";

const weekLabel = (week: Conflict["week"]) => {
  if (week === "Entrambe") return "Entrambe le settimane";
  return WEEK_PATTERN_LABELS[week] ?? `Settimana ${week}`;
};

const formatDays = (dayIds: number[]) => {
  const sorted = Array.from(new Set(dayIds)).sort((a, b) => a - b);
  if (sorted.length === 7) return "Tutti i giorni";

  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i === sorted.length || sorted[i] !== prev + 1) {
      const startLabel = DAYS.find(d => d.id === start)?.short ?? "";
      const endLabel = DAYS.find(d => d.id === prev)?.short ?? "";
      ranges.push(start === prev ? startLabel : `${startLabel}-${endLabel}`);
      start = sorted[i];
    }
    prev = sorted[i];
  }
  return ranges.join(", ");
};

type ConflictGroup = {
  programA: Conflict["programA"];
  programB: Conflict["programB"];
  sector: number;
  week: Conflict["week"];
  rangeA: string;
  rangeB: string;
  overlapMinutes: number;
  days: number[];
};

export const ConflictBanner = ({ conflicts }: { conflicts: Conflict[] }) => {
  const [open, setOpen] = useState(true);
  if (conflicts.length === 0) return null;

  const groupsMap = new Map<string, ConflictGroup>();
  for (const c of conflicts) {
    const ids = [c.programA.id, c.programB.id].sort().join("-");
    const key = `${ids}|${c.sector}|${c.week}|${c.rangeA}|${c.rangeB}|${c.overlapMinutes}`;
    const existing = groupsMap.get(key);
    if (existing) {
      existing.days.push(c.day);
    } else {
      groupsMap.set(key, {
        programA: c.programA,
        programB: c.programB,
        sector: c.sector,
        week: c.week,
        rangeA: c.rangeA,
        rangeB: c.rangeB,
        overlapMinutes: c.overlapMinutes,
        days: [c.day],
      });
    }
  }

  const groups = Array.from(groupsMap.values()).sort((a, b) => {
    if (a.sector !== b.sector) return a.sector - b.sector;
    return Math.min(...a.days) - Math.min(...b.days);
  });

  return (
    <Card className="mb-4 overflow-hidden border-2 border-destructive bg-destructive text-destructive-foreground shadow-xl">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full p-4 flex items-start gap-3 text-left">
          <div className="mt-0.5 size-10 rounded-full bg-destructive-foreground/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6 text-destructive-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg leading-tight">
              Attenzione: orari sovrapposti
            </p>
            <p className="text-sm font-semibold opacity-95 mt-0.5">
              {conflicts.length} {conflicts.length === 1 ? "sovrapposizione" : "sovrapposizioni"}: stesso settore e stesso orario.
            </p>
          </div>
          <ChevronDown className={cn("size-6 opacity-90 transition-transform shrink-0 mt-1", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {groups.map((g, i) => (
              <div
                key={i}
                className="rounded-xl bg-destructive-foreground/10 border border-destructive-foreground/20 p-3 text-sm"
              >
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                  <span className="inline-flex items-center gap-1.5 font-extrabold">
                    <Layers className="size-4" /> Settore {g.sector}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold opacity-90">
                    <CalendarDays className="size-4" /> {formatDays(g.days)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold opacity-90">
                    <Clock className="size-4" /> {weekLabel(g.week)}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="font-bold truncate">
                    {g.programA.name}{" "}
                    <span className="font-mono text-base font-black ml-1">{g.rangeA}</span>
                  </p>
                  <p className="font-bold truncate">
                    {g.programB.name}{" "}
                    <span className="font-mono text-base font-black ml-1">{g.rangeB}</span>
                  </p>
                </div>

                <p className="mt-2 text-xs font-extrabold uppercase tracking-wide opacity-90">
                  Sovrapposizione: {g.overlapMinutes} min
                </p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
