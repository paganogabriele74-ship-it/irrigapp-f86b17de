import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { AppShell } from "@/components/AppShell";
import { ProgramCard } from "@/components/ProgramCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Sparkles, Plus, ListTree, Timer, Droplets, Activity } from "lucide-react";
import { DAYS, formatTime, jsDayToAppDay, Program, getCurrentWeekLetter, programRunsThisWeek } from "@/lib/irrigation";

interface Slot {
  time: string;
  program: Program;
}

const Dashboard = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

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

  // Today's slots (filtered by week pattern)
  const todaySlots: Slot[] = [];
  activePrograms
    .filter(p => p.days_of_week.includes(today) && programRunsThisWeek(p.week_pattern ?? "every", currentWeekLetter))
    .forEach(p => p.program_times?.forEach(t => todaySlots.push({ time: t.start_time, program: p })));
  todaySlots.sort((a, b) => a.time.localeCompare(b.time));

  // Next upcoming
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  let nextSlot: { day: number; dayLabel: string; time: string; program: Program; offsetDays: number } | null = null;
  // Look ahead 14 days (to cover A/B alternating weeks)
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

  const currentTimeStr = formatTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`);
  const upcomingTodayHighlight = todaySlots.find(s => toMin(s.time) > nowMinutes)?.time.slice(0, 5);

  // Currently running program (in real time)
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const toSec = (t: string) => {
    const [h, m, s] = t.split(":").map(Number);
    return h * 3600 + m * 60 + (s || 0);
  };
  let currentRun: {
    program: Program;
    startTime: string;
    totalSeconds: number;
    elapsedSeconds: number;
    currentSectorIndex: number;
    currentSector: number;
    sectorElapsedSeconds: number;
    sectorDurationSeconds: number;
  } | null = null;
  for (const slot of todaySlots) {
    const startSec = toSec(slot.time);
    const sectorDurSec = slot.program.duration_minutes * 60;
    const totalSec = sectorDurSec * slot.program.sectors.length;
    if (nowSeconds >= startSec && nowSeconds < startSec + totalSec) {
      const elapsed = nowSeconds - startSec;
      const idx = Math.floor(elapsed / sectorDurSec);
      const sortedSectors = [...slot.program.sectors].sort((a, b) => a - b);
      currentRun = {
        program: slot.program,
        startTime: slot.time,
        totalSeconds: totalSec,
        elapsedSeconds: elapsed,
        currentSectorIndex: idx,
        currentSector: sortedSectors[idx],
        sectorElapsedSeconds: elapsed - idx * sectorDurSec,
        sectorDurationSeconds: sectorDurSec,
      };
      break;
    }
  }

  // Compute next slot Date for countdown
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
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <AppShell>
      <section className="mb-6">
        <div className="rounded-2xl gradient-fresh p-6 sm:p-8 text-primary-foreground shadow-elevated relative overflow-hidden">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-sm uppercase tracking-wider opacity-80 mb-1">{todayLabel}</p>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              Benvenuto su IrrigApp.
            </h1>
            <p className="text-base sm:text-lg opacity-95 mt-1">Ecco cosa abbiamo in programma oggi! 🌱</p>
          </div>
        </div>
      </section>

      {/* Currently running */}
      {currentRun && (
        <section className="mb-6">
          <Card className="p-5 border-primary/40 bg-gradient-to-br from-primary/15 to-accent/10 shadow-elevated relative overflow-hidden">
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-primary" />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-primary font-extrabold text-base mb-2">
              <Activity className="size-4" /> IN ESECUZIONE ORA
            </div>
            <div className="font-bold text-lg leading-tight mb-3 truncate">{currentRun.program.name}</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg bg-background/60 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Settore attivo</div>
                <div className="text-2xl font-extrabold tabular-nums text-primary leading-tight">
                  {currentRun.currentSector}
                  <span className="text-sm text-muted-foreground font-medium ml-1">
                    ({currentRun.currentSectorIndex + 1}/{currentRun.program.sectors.length})
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-background/60 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tempo settore</div>
                <div className="text-2xl font-extrabold tabular-nums text-primary leading-tight">
                  {pad(Math.floor(currentRun.sectorElapsedSeconds / 60))}:{pad(currentRun.sectorElapsedSeconds % 60)}
                  <span className="text-sm text-muted-foreground font-medium ml-1">
                    /{currentRun.program.duration_minutes}m
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                <span>Avvio: {formatTime(currentRun.startTime)}</span>
                <span>
                  {pad(Math.floor(currentRun.elapsedSeconds / 60))}:{pad(currentRun.elapsedSeconds % 60)} / {Math.floor(currentRun.totalSeconds / 60)}m
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000"
                  style={{ width: `${Math.min(100, (currentRun.elapsedSeconds / currentRun.totalSeconds) * 100)}%` }}
                />
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Countdown to next irrigation */}
      {nextSlot && nextSlotDate && (
        <section className="mb-6">
          <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 text-muted-foreground font-extrabold text-base">
                <Timer className="size-4" /> PROSSIMA IRRIGAZIONE
              </div>
              <div className="text-muted-foreground truncate text-right text-xs">
                {nextSlot.dayLabel} · {formatTime(nextSlot.time)}
              </div>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="font-semibold truncate text-base">{nextSlot.program.name}</div>
              <div className="flex items-center gap-1.5 tabular-nums font-mono text-sm">
                {cdDays > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="sm:text-2xl font-bold leading-none text-primary text-3xl">{cdDays}</span>
                    <span className="text-muted-foreground uppercase text-sm">g</span>
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <span className="sm:text-2xl font-bold leading-none text-primary text-3xl">{pad(cdH)}</span>
                  <span className="text-muted-foreground uppercase text-sm">h</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-muted-foreground leading-none">:</span>
                <div className="flex flex-col items-center">
                  <span className="sm:text-2xl font-bold leading-none text-primary text-3xl">{pad(cdM)}</span>
                  <span className="text-muted-foreground uppercase text-sm">m</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-muted-foreground leading-none">:</span>
                <div className="flex flex-col items-center">
                  <span className="sm:text-2xl font-bold leading-none text-primary text-3xl">{pad(cdS)}</span>
                  <span className="text-muted-foreground uppercase text-sm">s</span>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <CalendarClock className="size-4" /> OGGI
          </div>
          <div className="text-2xl font-bold tabular-nums">{todaySlots.length}</div>
          <div className="text-xs text-muted-foreground">irrigazioni</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <ListTree className="size-4" /> ATTIVI
          </div>
          <div className="text-2xl font-bold tabular-nums">{activePrograms.length}</div>
          <div className="text-xs text-muted-foreground">programmi totali</div>
        </Card>
      </section>

      {/* Today list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Programma di oggi</h2>
          <span className="text-muted-foreground tabular-nums text-base">Ora: {currentTimeStr}</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : todaySlots.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground mb-4">Nessuna irrigazione prevista oggi.</p>
            <Button asChild>
              <Link to="/programmi/nuovo"><Plus className="size-4" /> Crea il primo programma</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {todaySlots.map((slot, i) => (
              <div key={`${slot.program.id}-${slot.time}-${i}`} className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <div className="self-start rounded-lg bg-primary px-3 py-1.5 shadow-soft sm:w-16 sm:shrink-0 sm:bg-transparent sm:px-0 sm:py-3 sm:shadow-none">
                  <div className="text-lg font-extrabold tabular-nums leading-none text-primary-foreground sm:text-primary sm:text-lg">{formatTime(slot.time)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <ProgramCard program={slot.program} highlightTime={upcomingTodayHighlight} compact />
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
