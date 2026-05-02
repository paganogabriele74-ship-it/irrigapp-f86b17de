export const DAYS = [
  { id: 1, short: "Lun", full: "Lunedì" },
  { id: 2, short: "Mar", full: "Martedì" },
  { id: 3, short: "Mer", full: "Mercoledì" },
  { id: 4, short: "Gio", full: "Giovedì" },
  { id: 5, short: "Ven", full: "Venerdì" },
  { id: 6, short: "Sab", full: "Sabato" },
  { id: 7, short: "Dom", full: "Domenica" },
];

// JS getDay(): 0=Dom..6=Sab → app: 1=Lun..7=Dom
export const jsDayToAppDay = (d: number) => (d === 0 ? 7 : d);

export const SECTORS = Array.from({ length: 32 }, (_, i) => i + 1);

export type DosageType = "acqua" | "concime" | "acido";

export const DOSAGE_LABELS: Record<DosageType, string> = {
  acqua: "Acqua",
  concime: "Concime",
  acido: "Acido",
};

export const DOSAGE_COLORS: Record<DosageType, string> = {
  acqua: "bg-water text-water-foreground",
  concime: "bg-fertilizer text-fertilizer-foreground",
  acido: "bg-acid text-acid-foreground",
};

export const formatTime = (t: string) => t.slice(0, 5);

export const formatSectors = (sectors: number[]) => {
  if (sectors.length === 0) return "—";
  const sorted = [...sectors].sort((a, b) => a - b);
  // Group consecutive
  const ranges: string[] = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i === sorted.length || sorted[i] !== prev + 1) {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = sorted[i];
    }
    prev = sorted[i];
  }
  return ranges.join(", ");
};

export interface Program {
  id: string;
  user_id: string;
  name: string;
  dosage: DosageType;
  duration_minutes: number;
  sectors: number[];
  days_of_week: number[];
  active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  program_times?: { id: string; start_time: string; program_id: string }[];
}
