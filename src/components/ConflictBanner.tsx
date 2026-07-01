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
    <Card className="mb-5 border-destructive/40 bg-destructive/5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 text-left">
          <div className="size-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-destructive leading-tight">
              {conflicts.length} {conflicts.length === 1 ? "sovrapposizione rilevata" : "sovrapposizioni rilevate"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Più programmi usano lo stesso settore nello stesso momento. Tocca per dettagli.
            </p>
          </div>
          <ChevronDown className={cn("size-5 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {conflicts.map((c, i) => (
              <div key={i} className="rounded-lg bg-background/80 border border-destructive/20 p-3 text-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold">Settore {c.sector} · {c.dayLabel}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-destructive/15 text-destructive">
                    Sett. {c.week}
                  </span>
                </div>
                <div className="text-xs space-y-0.5 text-muted-foreground">
                  <div><span className="font-medium text-foreground">{c.programA.name}</span> · {c.rangeA}</div>
                  <div><span className="font-medium text-foreground">{c.programB.name}</span> · {c.rangeB}</div>
                  <div className="text-destructive font-semibold mt-1">Sovrapposizione: {c.overlapMinutes} min</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
