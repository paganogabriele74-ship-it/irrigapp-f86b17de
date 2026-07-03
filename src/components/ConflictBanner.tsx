import { AlertTriangle, Clock, CalendarDays, Layers } from "lucide-react";
import { Conflict } from "@/lib/conflicts";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { WEEK_PATTERN_LABELS } from "@/lib/irrigation";

const weekLabel = (week: Conflict["week"]) => {
  if (week === "Entrambe") return "Entrambe le settimane";
  return WEEK_PATTERN_LABELS[week] ?? `Settimana ${week}`;
};

export const ConflictBanner = ({ conflicts }: { conflicts: Conflict[] }) => {
  const [open, setOpen] = useState(true);
  if (conflicts.length === 0) return null;
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
              {conflicts.length} {conflicts.length === 1 ? "programma occupa" : "programmi occupano"} lo stesso settore nello stesso orario.
            </p>
          </div>
          <ChevronDown className={cn("size-6 opacity-90 transition-transform shrink-0 mt-1", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {conflicts.map((c, i) => (
              <div key={i} className="rounded-xl bg-destructive-foreground/10 border border-destructive-foreground/20 p-3 text-sm">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 font-extrabold">
                    <Layers className="size-4" /> Settore {c.sector}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold opacity-90">
                    <CalendarDays className="size-4" /> {c.dayLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold opacity-90">
                    <Clock className="size-4" /> {weekLabel(c.week)}
                  </span>
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-center text-sm">
                  <span className="font-black text-destructive-foreground/80">A</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{c.programA.name}</p>
                    <p className="font-mono text-base font-black">{c.rangeA}</p>
                  </div>
                  <span className="font-black text-destructive-foreground/80">B</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{c.programB.name}</p>
                    <p className="font-mono text-base font-black">{c.rangeB}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs font-extrabold uppercase tracking-wide opacity-90">
                  Sovrapposizione: {c.overlapMinutes} min
                </p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

