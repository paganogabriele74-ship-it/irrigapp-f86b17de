import { AlertTriangle } from "lucide-react";
import { Conflict } from "@/lib/conflicts";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const ConflictBanner = ({ conflicts }: { conflicts: Conflict[] }) => {
  const [open, setOpen] = useState(true);
  if (conflicts.length === 0) return null;
  return (
    <Card className="mb-5 overflow-hidden border-2 border-destructive bg-destructive text-destructive-foreground shadow-elevated md:bg-destructive/5 md:text-foreground">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full p-3 sm:p-4 flex items-center gap-3 text-left">
          <div className="size-11 rounded-xl bg-destructive-foreground/20 md:bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6 text-destructive-foreground md:text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-lg leading-tight text-destructive-foreground md:text-destructive">
              ⚠️ {conflicts.length} {conflicts.length === 1 ? "sovrapposizione orari" : "sovrapposizioni orari"}
            </p>
            <p className="text-sm font-semibold opacity-95 mt-0.5 md:text-muted-foreground">
              Stesso settore nello stesso momento: dettagli visibili sotto.
            </p>
          </div>
          <ChevronDown className={cn("size-6 opacity-90 transition-transform shrink-0", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
            {conflicts.map((c, i) => (
              <div key={i} className="rounded-lg bg-background text-foreground border border-destructive/30 p-3 text-sm shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-base font-extrabold text-destructive">Settore {c.sector} · {c.dayLabel}</span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-destructive/15 text-destructive">
                    Sett. {c.week}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground break-words">{c.programA.name}</span>
                    <span className="font-mono text-base font-extrabold text-destructive">{c.rangeA}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground break-words">{c.programB.name}</span>
                    <span className="font-mono text-base font-extrabold text-destructive">{c.rangeB}</span>
                  </div>
                  <div className="text-destructive font-extrabold mt-2">Sovrapposizione: {c.overlapMinutes} min</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
