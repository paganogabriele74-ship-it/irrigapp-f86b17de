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
import { Plus, Timer, Activity, SlidersHorizontal, X, Droplets, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle, Wind, MapPin } from "lucide-react";
import { DAYS, formatTime, jsDayToAppDay, Program, getCurrentWeekLetter, programRunsThisWeek, getProgramTotalMinutes } from "@/lib/irrigation";
import { findConflicts } from "@/lib/conflicts";
import { ConflictBanner } from "@/components/ConflictBanner";
import { cn } from "@/lib/utils";

interface Weather {
  temp: number;
  code: number;
  humidity: number;
  wind: number;
}

const weatherInfo = (code: number): { label: string; Icon: typeof Sun } => {
  if (code === 0) return { label: "Sereno", Icon: Sun };
  if (code <= 2) return { label: "Poco nuvoloso", Icon: Cloud };
  if (code === 3) return { label: "Nuvoloso", Icon: Cloud };
  if (code <= 48) return { label: "Nebbia", Icon: CloudFog };
  if (code <= 57) return { label: "Pioviggine", Icon: CloudDrizzle };
  if (code <= 67) return { label: "Pioggia", Icon: CloudRain };
  if (code <= 77) return { label: "Neve", Icon: CloudSnow };
  if (code <= 82) return { label: "Rovesci", Icon: CloudRain };
  if (code <= 86) return { label: "Neve", Icon: CloudSnow };
  if (code <= 99) return { label: "Temporale", Icon: CloudLightning };
  return { label: "—", Icon: Cloud };
};

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
  const conflicts = useMemo(() => findConflicts(programs), [programs]);
  const currentWeekLetter = getCurrentWeekLetter(now);
  const activePrograms = programs.filter(p => p.active);

  const dateLabel = now.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const timeLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buongiorno!" : hour < 18 ? "Buon pomeriggio!" : "Buonasera!";

  // Today's slots
  const todaySlots: Slot[] = [];
  activePrograms
    .filter(p => p.days_of_week.includes(today) && programRunsThisWeek(p.week_pattern ?? "every", currentWeekLetter))
    .forEach(p => p.program_times?.forEach(t => todaySlots.push({ time: t.start_time, program: p })));
  todaySlots.sort((a, b) => a.time.localeCompare(b.time));

  // Filter options & filtered slots
  const uniqueTimes = useMemo(() => Array.from(new Set(todaySlots.map(s => s.time))).sort(), [todaySlots]);
  const uniqueSectors = useMemo(() => {
    const set = new Set<number>();
    todaySlots.forEach(s => s.program.sectors.forEach(n => set.add(n)));
    return Array.from(set).sort((a, b) => a - b);
  }, [todaySlots]);
  const uniquePrograms = useMemo(() => {
    const map = new Map<string, Program>();
    todaySlots.forEach(s => map.set(s.program.id, s.program));
    return Array.from(map.values());
  }, [todaySlots]);
  const filteredSlots = todaySlots.filter(s =>
    (filterTime === "all" || s.time === filterTime) &&
    (filterSector === "all" || s.program.sectors.includes(Number(filterSector))) &&
    (filterProgram === "all" || s.program.id === filterProgram)
  );
  const activeFilterCount =
    (filterTime !== "all" ? 1 : 0) + (filterSector !== "all" ? 1 : 0) + (filterProgram !== "all" ? 1 : 0);

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
      {/* Hero: data + ora + benvenuto + settimana */}
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
          <div className="relative mt-4 pt-4 border-t border-white/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Droplets className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Settimana in corso</p>
                <p className="text-lg font-extrabold leading-tight uppercase">{currentWeekLetter === "A" ? "Concime" : "Acido"}</p>
              </div>
            </div>
            <div className="size-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-extrabold shrink-0">
              {currentWeekLetter === "A" ? "C" : "A"}
            </div>
          </div>
        </div>
      </section>

      <ConflictBanner conflicts={conflicts} />

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


      {/* Prossima irrigazione - countdown moderno */}
      {nextSlot && nextSlotDate && (
        <section className="mb-5">
          <Card className="p-5 border-0 shadow-elevated bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground relative overflow-hidden">
            <div className="absolute -right-16 -bottom-16 size-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-10 -top-10 size-32 rounded-full bg-white/5 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-widest opacity-90">
                  <Timer className="size-4" /> Prossima irrigazione
                </div>
                <span className="text-xs font-semibold tabular-nums opacity-90">{nextSlot.dayLabel} · {formatTime(nextSlot.time)}</span>
              </div>
              <div className="font-bold text-lg truncate mb-4 opacity-95">{nextSlot.program.name}</div>
              <div className="flex items-end justify-center gap-2 sm:gap-3 tabular-nums font-mono">
                {cdDays > 0 && (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-3 min-w-[64px] sm:min-w-[80px] text-center shadow-inner">
                        <span className="text-4xl sm:text-5xl font-extrabold leading-none">{cdDays}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-80">giorni</span>
                    </div>
                    <span className="text-4xl sm:text-5xl font-extrabold opacity-40 pb-7">:</span>
                  </>
                )}
                <div className="flex flex-col items-center">
                  <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-3 min-w-[64px] sm:min-w-[80px] text-center shadow-inner">
                    <span className="text-4xl sm:text-5xl font-extrabold leading-none">{pad(cdH)}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-80">ore</span>
                </div>
                <span className="text-4xl sm:text-5xl font-extrabold opacity-40 pb-7">:</span>
                <div className="flex flex-col items-center">
                  <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-3 min-w-[64px] sm:min-w-[80px] text-center shadow-inner">
                    <span className="text-4xl sm:text-5xl font-extrabold leading-none">{pad(cdM)}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-80">min</span>
                </div>
                <span className="text-4xl sm:text-5xl font-extrabold opacity-40 pb-7">:</span>
                <div className="flex flex-col items-center">
                  <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-3 min-w-[64px] sm:min-w-[80px] text-center shadow-inner">
                    <span className="text-4xl sm:text-5xl font-extrabold leading-none tabular-nums">{pad(cdS)}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-80">sec</span>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Programma di oggi */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-lg font-bold">Oggi</h2>
          <div className="flex items-center gap-1">
            {todaySlots.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <SlidersHorizontal className="size-4" />
                    Filtra
                    {activeFilterCount > 0 && (
                      <span className="ml-0.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Filtri</p>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => { setFilterTime("all"); setFilterSector("all"); setFilterProgram("all"); }}>
                        <X className="size-3" /> Azzera
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Orario</label>
                    <Select value={filterTime} onValueChange={setFilterTime}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti gli orari</SelectItem>
                        {uniqueTimes.map(t => <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Settore</label>
                    <Select value={filterSector} onValueChange={setFilterSector}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i settori</SelectItem>
                        {uniqueSectors.map(s => <SelectItem key={s} value={String(s)}>Settore {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Programma</label>
                    <Select value={filterProgram} onValueChange={setFilterProgram}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i programmi</SelectItem>
                        {uniquePrograms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {todaySlots.length > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/programmi"><Plus className="size-4" /> Nuovo</Link>
              </Button>
            )}
          </div>
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
        ) : filteredSlots.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground">Nessuna irrigazione corrisponde ai filtri.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSlots.map((slot, i) => (
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
