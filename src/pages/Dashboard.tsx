import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { AppShell } from "@/components/AppShell";
import { ProgramCard } from "@/components/ProgramCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Timer, Activity, SlidersHorizontal, X, FlaskConical } from "lucide-react";
import { DAYS, formatTime, jsDayToAppDay, Program, getCurrentWeekLetter, programRunsThisWeek, getProgramTotalMinutes } from "@/lib/irrigation";

interface Slot {
  time: string;
  program: Program;
}

const pad = (n: number) => String(n).padStart(2, "0");

const Dashboard = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [filterTime, setFilterTime] = useState<string>("all");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterProgram, setFilterProgram] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("programs")
        .select("*, program_times(*)")
        .order("created_at", { ascending: false });
      setPrograms((data ?? []) as unknown as Program[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = jsDayToAppDay(new Date().getDay());
  const todayLabel = DAYS.find(d => d.id === today)?.full ?? "";
  const currentWeekLetter = getCurrentWeekLetter(now);
  const activePrograms = programs.filter(p => p.active);

  const dateLabel = now.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const timeLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Today's slots
  const todaySlots: Slot[] = [];
  activePrograms
    .filter(p => p.days_of_week.includes(today) && programRunsThisWeek(p.week_pattern ?? "every", currentWeekLetter))
    .forEach(p => p.program_times?.forEach(t => todaySlots.push({ time: t.start_time, program: p })));
  todaySlots.sort((a, b) => a.time.localeCompare(b.time));

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // Next upcoming
  let nextSlot: { day: number; dayLabel: string; time: string; program: Program; offsetDays: number } | null = null;
  for (let offset = 0; offset < 14 && !nextSlot; offset++) {
    const checkDay = ((today - 1 + offset) % 7) + 1;
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);
    const checkWeek = getCurrentWeekLetter(checkDate);
    const candidates: { time: string; program: Program }[] = [];
    activePrograms
      .filter(p => p.days_of_week.includes(checkDay) && programRunsThisWeek(p.week_pattern ?? "every", checkWeek))
      .forEach(p => p.program_times?.forEach(t => candidates.push({ time: t.start_time, program: p })));
    candidates.sort((a, b) => a.time.localeCompare(b.time));
    for (const c of candidates) {
      if (offset === 0 && toMin(c.time) <= nowMinutes) continue;
      nextSlot = {
        day: checkDay,
        dayLabel: offset === 0 ? "Oggi" : offset === 1 ? "Domani" : DAYS.find(d => d.id === checkDay)?.full ?? "",
        time: c.time,
        program: c.program,
        offsetDays: offset,
      };
      break;
    }
  }

  const upcomingTodayHighlight = todaySlots.find(s => toMin(s.time) > nowMinutes)?.time.slice(0, 5);

  // Currently running
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const toSec = (t: string) => {
    const [h, m, s] = t.split(":").map(Number);
    return h * 3600 + m * 60 + (s || 0);
  };
  type CurrentRun = {
    program: Program;
    startTime: string;
    totalSeconds: number;
    elapsedSeconds: number;
    mode: "parallel" | "sequential";
    activeSectors: number[];
    currentSector?: number;
    currentSectorIndex?: number;
    sectorElapsedSeconds?: number;
    sectorDurationSeconds?: number;
  };
  let currentRun: CurrentRun | null = null;
  for (const slot of todaySlots) {
    const startSec = toSec(slot.time);
    const sectorDurSec = slot.program.duration_minutes * 60;
    const mode = (slot.program.sector_mode ?? "parallel") as "parallel" | "sequential";
    const totalSec = getProgramTotalMinutes(slot.program) * 60;
    if (nowSeconds >= startSec && nowSeconds < startSec + totalSec) {
      const elapsed = nowSeconds - startSec;
      const sortedSectors = [...slot.program.sectors].sort((a, b) => a - b);
      if (mode === "sequential") {
        const idx = Math.min(sortedSectors.length - 1, Math.floor(elapsed / sectorDurSec));
        currentRun = {
          program: slot.program, startTime: slot.time, totalSeconds: totalSec, elapsedSeconds: elapsed, mode,
          activeSectors: sortedSectors, currentSectorIndex: idx, currentSector: sortedSectors[idx],
          sectorElapsedSeconds: elapsed - idx * sectorDurSec, sectorDurationSeconds: sectorDurSec,
        };
      } else {
        currentRun = { program: slot.program, startTime: slot.time, totalSeconds: totalSec, elapsedSeconds: elapsed, mode, activeSectors: sortedSectors };
      }
      break;
    }
  }

  // Countdown
  let nextSlotDate: Date | null = null;
  if (nextSlot) {
    const [h, m, s] = nextSlot.time.split(":").map(Number);
    const target = new Date(now);
    target.setHours(h, m, s || 0, 0);
    target.setDate(target.getDate() + nextSlot.offsetDays);
    nextSlotDate = target;
  }
  const diffMs = nextSlotDate ? nextSlotDate.getTime() - now.getTime() : 0;
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const cdDays = Math.floor(totalSec / 86400);
  const cdH = Math.floor((totalSec % 86400) / 3600);
  const cdM = Math.floor((totalSec % 3600) / 60);
  const cdS = totalSec % 60;

  return (
    <AppShell>
      {/* Hero: data + ora + benvenuto */}
      <section className="mb-5">
        <div className="rounded-2xl gradient-fresh p-5 sm:p-7 text-primary-foreground shadow-elevated relative overflow-hidden">
          <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest opacity-80 font-semibold">{todayLabel}</p>
              <p className="text-sm opacity-90 mt-0.5 capitalize">{dateLabel}</p>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight mt-2">{greeting} 🌱</h1>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none font-mono">{timeLabel}</div>
              <p className="text-[10px] uppercase tracking-widest opacity-80 mt-1">Ora attuale</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live: in esecuzione */}
      {currentRun && (
        <section className="mb-5">
          <Card className="p-4 border-primary/40 bg-gradient-to-br from-primary/15 to-accent/10 shadow-elevated relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-primary font-extrabold text-sm">
                <Activity className="size-4" /> IN ESECUZIONE
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full size-2.5 bg-primary" />
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">LIVE</span>
              </div>
            </div>
            <div className="font-bold text-lg leading-tight mb-3 truncate">{currentRun.program.name}</div>

            {currentRun.mode === "sequential" && currentRun.currentSector !== undefined ? (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-background/60 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Settore</div>
                  <div className="text-2xl font-extrabold tabular-nums text-primary leading-tight">
                    {currentRun.currentSector}
                    <span className="text-sm text-muted-foreground font-medium ml-1">
                      ({(currentRun.currentSectorIndex ?? 0) + 1}/{currentRun.activeSectors.length})
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-background/60 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tempo settore</div>
                  <div className="text-2xl font-extrabold tabular-nums text-primary leading-tight">
                    {pad(Math.floor((currentRun.sectorElapsedSeconds ?? 0) / 60))}:{pad((currentRun.sectorElapsedSeconds ?? 0) % 60)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-background/60 p-2.5 mb-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Settori attivi</div>
                <div className="flex flex-wrap gap-1">
                  {currentRun.activeSectors.map(s => (
                    <span key={s} className="inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded-md bg-primary text-primary-foreground text-sm font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                <span>Avvio: {formatTime(currentRun.startTime)}</span>
                <span>{pad(Math.floor(currentRun.elapsedSeconds / 60))}:{pad(currentRun.elapsedSeconds % 60)} / {Math.floor(currentRun.totalSeconds / 60)}m</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary transition-all duration-1000"
                  style={{ width: `${Math.min(100, (currentRun.elapsedSeconds / currentRun.totalSeconds) * 100)}%` }} />
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Stats compatte */}
      <section className="grid grid-cols-3 gap-2 mb-5">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">
            <CalendarClock className="size-3.5" /> Oggi
          </div>
          <div className="text-2xl font-extrabold tabular-nums leading-none">{todaySlots.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">irrigazioni</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">
            <ListTree className="size-3.5" /> Attivi
          </div>
          <div className="text-2xl font-extrabold tabular-nums leading-none">{activePrograms.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">programmi</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">
            <Clock className="size-3.5" /> Sett.
          </div>
          <div className="text-2xl font-extrabold tabular-nums leading-none uppercase">{currentWeekLetter === "A" ? "C" : "A"}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{currentWeekLetter === "A" ? "concime" : "acido"}</div>
        </Card>
      </section>

      {/* Prossima irrigazione */}
      {nextSlot && nextSlotDate && (
        <section className="mb-5">
          <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-muted-foreground font-extrabold text-xs uppercase tracking-wider">
                <Timer className="size-3.5" /> Prossima
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{nextSlot.dayLabel} · {formatTime(nextSlot.time)}</span>
            </div>
            <div className="font-semibold truncate text-base mb-2">{nextSlot.program.name}</div>
            <div className="flex items-center justify-center gap-1.5 tabular-nums font-mono">
              {cdDays > 0 && (
                <div className="flex flex-col items-center px-2">
                  <span className="text-2xl font-extrabold leading-none text-primary">{cdDays}</span>
                  <span className="text-[10px] text-muted-foreground uppercase mt-0.5">giorni</span>
                </div>
              )}
              <div className="flex flex-col items-center px-2">
                <span className="text-2xl font-extrabold leading-none text-primary">{pad(cdH)}</span>
                <span className="text-[10px] text-muted-foreground uppercase mt-0.5">ore</span>
              </div>
              <span className="text-2xl font-extrabold text-muted-foreground/40 leading-none">:</span>
              <div className="flex flex-col items-center px-2">
                <span className="text-2xl font-extrabold leading-none text-primary">{pad(cdM)}</span>
                <span className="text-[10px] text-muted-foreground uppercase mt-0.5">min</span>
              </div>
              <span className="text-2xl font-extrabold text-muted-foreground/40 leading-none">:</span>
              <div className="flex flex-col items-center px-2">
                <span className="text-2xl font-extrabold leading-none text-primary">{pad(cdS)}</span>
                <span className="text-[10px] text-muted-foreground uppercase mt-0.5">sec</span>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Programma di oggi */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Oggi</h2>
          {todaySlots.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/programmi"><Plus className="size-4" /> Nuovo</Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : todaySlots.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground mb-4">Nessuna irrigazione prevista oggi.</p>
            <Button asChild>
              <Link to="/programmi/nuovo"><Plus className="size-4" /> Crea il primo programma</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {todaySlots.map((slot, i) => (
              <div key={`${slot.program.id}-${slot.time}-${i}`} className="flex gap-3">
                <div className="shrink-0 flex flex-col items-center justify-center rounded-lg bg-primary/10 px-2.5 py-2 w-16">
                  <div className="text-base font-extrabold tabular-nums leading-none text-primary">{formatTime(slot.time)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <ProgramCard program={slot.program} highlightTime={upcomingTodayHighlight} compact readonly />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
};

export default Dashboard;
