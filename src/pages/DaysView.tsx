import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProgramCard } from "@/components/ProgramCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DAYS, formatTime, jsDayToAppDay, Program, getCurrentWeekLetter, programRunsThisWeek, WeekPattern } from "@/lib/irrigation";
import { cn } from "@/lib/utils";

const DaysView = () => {
  const { day } = useParams();
  const today = jsDayToAppDay(new Date().getDay());
  const selected = day ? Number(day) : today;
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const currentWeek = getCurrentWeekLetter();
  const [selectedWeek, setSelectedWeek] = useState<"A" | "B">(currentWeek);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

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
    .filter(p => p.days_of_week.includes(selected) && programRunsThisWeek((p.week_pattern ?? "every") as WeekPattern, selectedWeek))
    .forEach(p => p.program_times?.forEach(t => slots.push({ time: t.start_time, program: p })));
  slots.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Settimana</h1>
        <p className="text-muted-foreground text-sm">Tocca un giorno per vedere le irrigazioni.</p>
      </div>

      {/* Week selector A / B */}
      <div className="grid grid-cols-2 gap-1.5 mb-4 p-1 bg-secondary rounded-xl">
        {(["A", "B"] as const).map(w => {
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
                  ? w === "A"
                    ? "bg-fertilizer text-fertilizer-foreground shadow-soft"
                    : "bg-acid text-acid-foreground shadow-soft"
                  : "text-secondary-foreground hover:bg-background/50"
              )}
            >
              {w === "A" ? "Settimana concime" : "Settimana acido"}
              {isCurrent && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                  sel ? "bg-background/25" : "bg-primary text-primary-foreground"
                )}>Ora</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {DAYS.map((d) => {
          const count = programs
            .filter(p => p.days_of_week.includes(d.id) && programRunsThisWeek((p.week_pattern ?? "every") as WeekPattern, selectedWeek))
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
                  : "bg-card hover:bg-secondary border border-border/60"
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

      <Card className="p-4 mb-4 bg-secondary/50 border-secondary">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{selected === today ? "Oggi" : "Giorno selezionato"}</div>
            <div className="text-xl font-bold">{DAYS.find(d => d.id === selected)?.full}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{slots.length}</div>
            <div className="text-xs text-muted-foreground">irrigazioni</div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : slots.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground mb-4">Nessuna irrigazione prevista questo giorno.</p>
          <Button asChild>
            <Link to="/programmi/nuovo"><Plus className="size-4" /> Crea programma</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {slots.map((slot, i) => {
            const isToday = selected === today && selectedWeek === currentWeek;
            const p: any = slot.program;
            const totalMin = p.kind === "farfalla"
              ? p.duration_minutes
              : p.sector_mode === "sequential"
                ? p.duration_minutes * (p.sectors?.length || 1)
                : p.duration_minutes;
            const [hh, mm] = slot.time.split(":").map(Number);
            const now = new Date();
            const startMin = hh * 60 + mm;
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const isLive = isToday && nowMin >= startMin && nowMin < startMin + totalMin;
            return (
              <div key={`${slot.program.id}-${slot.time}-${i}`} className="flex gap-3">
                <div className="w-16 shrink-0 pt-3">
                  <div className={cn("text-lg font-bold tabular-nums", isLive && "text-primary")}>{formatTime(slot.time)}</div>
                </div>
                <div className={cn(
                  "flex-1 rounded-2xl transition-base",
                  isLive && "ring-2 ring-primary shadow-glow animate-pulse-slow"
                )}>
                  <ProgramCard program={slot.program} compact readonly />
                </div>
              </div>
            );
          })}
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
