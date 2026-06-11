import { DAYS, Program, WeekPattern, getProgramTotalMinutes } from "./irrigation";

export interface Conflict {
  programA: Program;
  programB: Program;
  day: number;
  dayLabel: string;
  sector: number;
  week: "A" | "B" | "Entrambe";
  rangeA: string; // "HH:MM-HH:MM"
  rangeB: string;
  overlapMinutes: number;
}

interface Interval {
  program: Program;
  sector: number;
  day: number;
  weeks: ("A" | "B")[];
  start: number; // minutes
  end: number;
  startTime: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

const weeksFromPattern = (p: WeekPattern): ("A" | "B")[] =>
  p === "every" ? ["A", "B"] : [p as "A" | "B"];

const buildIntervals = (programs: Program[]): Interval[] => {
  const out: Interval[] = [];
  for (const p of programs) {
    if (!p.active) continue;
    if (!p.program_times || p.program_times.length === 0) continue;
    if (p.sectors.length === 0 || p.days_of_week.length === 0) continue;

    const weeks = weeksFromPattern((p.week_pattern ?? "every") as WeekPattern);
    const mode = p.sector_mode ?? "parallel";
    const sortedSectors = [...p.sectors].sort((a, b) => a - b);
    const dur = p.duration_minutes;

    for (const t of p.program_times) {
      const [h, m] = t.start_time.split(":").map(Number);
      const startBase = h * 60 + m;
      for (const day of p.days_of_week) {
        if (mode === "sequential") {
          sortedSectors.forEach((sec, i) => {
            out.push({
              program: p,
              sector: sec,
              day,
              weeks,
              start: startBase + i * dur,
              end: startBase + (i + 1) * dur,
              startTime: t.start_time,
            });
          });
        } else {
          for (const sec of sortedSectors) {
            out.push({
              program: p,
              sector: sec,
              day,
              weeks,
              start: startBase,
              end: startBase + dur,
              startTime: t.start_time,
            });
          }
        }
      }
    }
  }
  return out;
};

export const findConflicts = (programs: Program[]): Conflict[] => {
  const intervals = buildIntervals(programs);
  const conflicts: Conflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i], b = intervals[j];
      if (a.program.id === b.program.id && a.startTime === b.startTime) continue;
      if (a.day !== b.day) continue;
      if (a.sector !== b.sector) continue;
      const sharedWeeks = a.weeks.filter(w => b.weeks.includes(w));
      if (sharedWeeks.length === 0) continue;
      const overlapStart = Math.max(a.start, b.start);
      const overlapEnd = Math.min(a.end, b.end);
      if (overlapEnd <= overlapStart) continue;

      const week = sharedWeeks.length === 2 ? "Entrambe" : sharedWeeks[0];
      const key = [a.program.id, b.program.id, a.day, a.sector, week, a.startTime, b.startTime]
        .sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      conflicts.push({
        programA: a.program,
        programB: b.program,
        day: a.day,
        dayLabel: DAYS.find(d => d.id === a.day)?.full ?? "",
        sector: a.sector,
        week,
        rangeA: `${fmt(a.start)}-${fmt(a.end)}`,
        rangeB: `${fmt(b.start)}-${fmt(b.end)}`,
        overlapMinutes: overlapEnd - overlapStart,
      });
    }
  }
  return conflicts;
};

export const exportProgramsToXlsx = async (programs: Program[]) => {
  const XLSX = await import("xlsx");
  const rows = programs.map(p => {
    const total = getProgramTotalMinutes(p);
    const days = [...p.days_of_week].sort()
      .map(d => DAYS.find(x => x.id === d)?.short ?? "").join(", ");
    const sectors = [...p.sectors].sort((a, b) => a - b).join(", ");
    const times = (p.program_times ?? []).map(t => t.start_time.slice(0, 5)).sort().join(", ");
    const week = p.week_pattern === "every" ? "Ogni settimana"
      : p.week_pattern === "A" ? "Settimana concime" : "Settimana acido";
    const mode = (p.sector_mode ?? "parallel") === "sequential" ? "Uno alla volta" : "Tutti insieme";
    return {
      Nome: p.name,
      Attivo: p.active ? "Sì" : "No",
      Dosaggio: p.dosage,
      Settimana: week,
      Giorni: days,
      Orari: times,
      Settori: sectors,
      Modalità: mode,
      "Durata (min/settore)": p.duration_minutes,
      "Durata totale (min)": total,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 22 },
    { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Programmi");

  // Sheet orari
  const timeRows: Record<string, string | number>[] = [];
  programs.forEach(p => (p.program_times ?? []).forEach(t => {
    [...p.days_of_week].sort().forEach(d => {
      timeRows.push({
        Programma: p.name,
        Giorno: DAYS.find(x => x.id === d)?.full ?? "",
        Orario: t.start_time.slice(0, 5),
        Settori: [...p.sectors].sort((a, b) => a - b).join(", "),
        "Durata totale (min)": getProgramTotalMinutes(p),
        Attivo: p.active ? "Sì" : "No",
      });
    });
  }));
  if (timeRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(timeRows);
    ws2["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Orari");
  }

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `programmi-irrigapp-${today}.xlsx`);
};
