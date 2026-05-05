import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { AppShell } from "@/components/AppShell";
import { ProgramCard } from "@/components/ProgramCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Sparkles, Plus, ListTree, Timer } from "lucide-react";
import { DAYS, formatTime, jsDayToAppDay, Program } from "@/lib/irrigation";

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
  const activePrograms = programs.filter(p => p.active);

  // Today's slots
  const todaySlots: Slot[] = [];
  activePrograms
    .filter(p => p.days_of_week.includes(today))
    .forEach(p => p.program_times?.forEach(t => todaySlots.push({ time: t.start_time, program: p })));
  todaySlots.sort((a, b) => a.time.localeCompare(b.time));

  // Next upcoming
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  let nextSlot: { day: number; dayLabel: string; time: string; program: Program } | null = null;
  // Look ahead 7 days
  for (let offset = 0; offset < 7 && !nextSlot; offset++) {
    const checkDay = ((today - 1 + offset) % 7) + 1;
    const candidates: { time: string; program: Program }[] = [];
    activePrograms
      .filter(p => p.days_of_week.includes(checkDay))
      .forEach(p => p.program_times?.forEach(t => candidates.push({ time: t.start_time, program: p })));
    candidates.sort((a, b) => a.time.localeCompare(b.time));
    for (const c of candidates) {
      if (offset === 0 && toMin(c.time) <= nowMinutes) continue;
      nextSlot = {
        day: checkDay,
        dayLabel: offset === 0 ? "Oggi" : offset === 1 ? "Domani" : DAYS.find(d => d.id === checkDay)?.full ?? "",
        time: c.time,
        program: c.program,
      };
      break;
    }
  }

  const currentTimeStr = formatTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`);
  const upcomingTodayHighlight = todaySlots.find(s => toMin(s.time) > nowMinutes)?.time.slice(0, 5);

  // Compute next slot Date for countdown
  let nextSlotDate: Date | null = null;
  if (nextSlot) {
    const [h, m, s] = nextSlot.time.split(":").map(Number);
    const offsetDays = (nextSlot.day - today + 7) % 7;
    const target = new Date(now);
    target.setHours(h, m, s || 0, 0);
    if (offsetDays === 0 && target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 7);
    } else {
      target.setDate(target.getDate() + offsetDays);
    }
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
