import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Droplets, Layers, Clock } from "lucide-react";
import {
  DAYS,
  DOSAGE_LABELS,
  formatSectors,
  formatTime,
  jsDayToAppDay,
  Program,
  getCurrentWeekLetter,
  programRunsThisWeek,
  WeekPattern,
  getProgramTotalMinutes,
} from "@/lib/irrigation";
import { cn } from "@/lib/utils";

// Dosage → coordinated color classes (border/bg/text/dot)
const DOSAGE_STYLES = {
  acqua: {
    border: "border-l-[hsl(var(--water))]",
    dot: "bg-[hsl(var(--water))]",
    chipBg: "bg-[hsl(var(--water))]/10",
    chipText: "text-[hsl(var(--water))]",
    soft: "bg-[hsl(var(--water))]/5",
  },
  concime: {
    border: "border-l-[hsl(var(--fertilizer))]",
    dot: "bg-[hsl(var(--fertilizer))]",
    chipBg: "bg-[hsl(var(--fertilizer))]/15",
    chipText: "text-[hsl(var(--fertilizer))]",
    soft: "bg-[hsl(var(--fertilizer))]/5",
  },
  acido: {
    border: "border-l-[hsl(var(--acid))]",
    dot: "bg-[hsl(var(--acid))]",
    chipBg: "bg-[hsl(var(--acid))]/10",
    chipText: "text-[hsl(var(--acid))]",
    soft: "bg-[hsl(var(--acid))]/5",
  },
} as const;

const DaysView = () => {
  const { day } = useParams();
  const today = jsDayToAppDay(new Date().getDay());
  const selected = day ? Number(day) : today;
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const currentWeek = getCurrentWeekLetter();
  const [selectedWeek, setSelectedWeek] = useState<"A" | "B">(currentWeek);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("programs")
        .select("*, program_times(*)")
        .eq("active", true);
      setPrograms((data ?? []) as unknown as Program[]);
      setLoading(false);
    })();
  }, []);

  const slots: { time: string; program: Program }[] = [];
  programs
    .filter(
      (p) =>
        p.days_of_week.includes(selected) &&
        programRunsThisWeek((p.week_pattern ?? "every") as WeekPattern, selectedWeek),
    )
    .forEach((p) => p.program_times?.forEach((t) => slots.push({ time: t.start_time, program: p })));
  slots.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold mb-1">Settimana</h1>
        <p className="text-muted-foreground text-sm">Tocca un giorno per vedere le irrigazioni.</p>
      </div>

      {/* Week selector A / B */}
      <div className="grid grid-cols-2 gap-1.5 mb-4 p-1 bg-secondary rounded-xl">
        {(["A", "B"] as const).map((w) => {
          const sel = selectedWeek === w;
          const isCurrent = currentWeek === w;
          return (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWeek(w)}
              className={cn(
                "py-2.5 rounded-lg text-sm font-semibold transition-base flex items-center justify-center gap-2",
                sel
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "text-secondary-foreground hover:bg-background/50",
              )}
            >
              {w === "A" ? "Settimana concime" : "Settimana acido"}
              {isCurrent && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                    sel ? "bg-primary-foreground/20" : "bg-primary text-primary-foreground",
                  )}
                >
                  Ora
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {DAYS.map((d) => {
          const count = programs
            .filter(
              (p) =>
                p.days_of_week.includes(d.id) &&
                programRunsThisWeek((p.week_pattern ?? "every") as WeekPattern, selectedWeek),
            )
            .reduce((acc, p) => acc + (p.program_times?.length ?? 0), 0);
          const active = d.id === selected;
          const isToday = d.id === today && selectedWeek === currentWeek;
          return (
            <Link
              key={d.id}
              to={`/giorni/${d.id}`}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-base relative",
                active
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "bg-card hover:bg-secondary border border-border/60",
              )}
            >
              <span className="text-[11px] uppercase tracking-wide opacity-80">{d.short}</span>
              <span className={cn("text-base font-bold", active ? "" : isToday && "text-primary")}>
                {count}
              </span>
              {isToday && !active && <span className="absolute bottom-1 size-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>

      {/* Today header */}
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {selected === today ? "Oggi" : "Giorno selezionato"}
          </div>
          <div className="text-2xl font-bold leading-tight">{DAYS.find((d) => d.id === selected)?.full}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-primary leading-none tabular-nums">{slots.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">irrigazioni</div>
        </div>
      </div>

      {/* Legend */}
      {slots.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 px-1">
          {(["acqua", "concime", "acido"] as const).map((d) => (
            <div key={d} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2.5 rounded-full", DOSAGE_STYLES[d].dot)} />
              <span className="font-medium">{DOSAGE_LABELS[d]}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 rounded-2xl bg-muted animate-pulse" />
          <div className="h-28 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : slots.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground mb-4">Nessuna irrigazione prevista questo giorno.</p>
          <Button asChild>
            <Link to="/programmi/nuovo">
              <Plus className="size-4" /> Crea programma
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-[53px] top-3 bottom-3 w-px bg-border/70" aria-hidden />

          <div className="space-y-3">
            {slots.map((slot, i) => {
              const p = slot.program;
              const style = DOSAGE_STYLES[p.dosage];
              const total = getProgramTotalMinutes(p);
              const isSequential = (p.sector_mode ?? "parallel") === "sequential";
              return (
                <Link
                  to={`/programmi/${p.id}`}
                  key={`${p.id}-${slot.time}-${i}`}
                  className="relative flex items-stretch gap-3 group"
                >
                  {/* Time column */}
                  <div className="w-12 shrink-0 flex flex-col items-end pt-3">
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {formatTime(slot.time)}
                    </span>
                  </div>

                  {/* Dot */}
                  <div className="relative w-3 shrink-0">
                    <span
                      className={cn(
                        "absolute left-1/2 -translate-x-1/2 top-4 size-3 rounded-full ring-4 ring-background z-10",
                        style.dot,
                      )}
                    />
                  </div>

                  {/* Card */}
                  <Card
                    className={cn(
                      "flex-1 min-w-0 p-3.5 border-l-4 shadow-soft group-hover:shadow-elevated transition-base",
                      style.border,
                    )}
                  >
                    {/* Header: name + dosage badge */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <h3 className="font-bold text-base leading-tight truncate">{p.name}</h3>
                      <span
                        className={cn(
                          "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide",
                          style.chipBg,
                          style.chipText,
                        )}
                      >
                        <Droplets className="size-3" />
                        {DOSAGE_LABELS[p.dosage]}
                      </span>
                    </div>

                    {/* Sectors */}
                    <div className={cn("rounded-lg p-2 mb-2", style.soft)}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Layers className={cn("size-3.5", style.chipText)} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Settori
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.sectors.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : p.sectors.length <= 8 ? (
                          [...p.sectors]
                            .sort((a, b) => a - b)
                            .map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-md bg-card border border-border/70 text-xs font-bold tabular-nums text-foreground"
                              >
                                {s}
                              </span>
                            ))
                        ) : (
                          <span className="inline-flex items-center px-2 h-[26px] rounded-md bg-card border border-border/70 text-xs font-bold tabular-nums text-foreground">
                            {formatSectors(p.sectors)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: duration + mode */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-sm font-bold tabular-nums">{total} min</span>
                        {isSequential && p.sectors.length > 1 && (
                          <span className="text-[10px] text-muted-foreground">
                            ({p.duration_minutes}′×{p.sectors.length})
                          </span>
                        )}
                      </div>
                      {isSequential ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                          Uno alla volta
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                          In parallelo
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Prev/Next quick nav */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/giorni/${selected === 1 ? 7 : selected - 1}`}>
            <ChevronLeft className="size-4" /> Precedente
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/giorni/${selected === 7 ? 1 : selected + 1}`}>
            Successivo <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </AppShell>
  );
};

export default DaysView;
