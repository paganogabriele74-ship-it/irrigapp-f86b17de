import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SignedImage } from "@/components/SignedImage";
import {
  Plus, X, Image as ImageIcon, Trash2, ArrowLeft, Save, Clock, Minus,
  ChevronRight, ChevronLeft, LayoutList, Layers, Copy, AlertTriangle, Sparkles, Sunrise, Moon,
} from "lucide-react";
import {
  DAYS, DOSAGE_LABELS, DosageType, Program, SECTORS, SectorMode, WeekPattern, formatTime,
} from "@/lib/irrigation";
import { findConflicts } from "@/lib/conflicts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome").max(60, "Massimo 60 caratteri"),
  duration: z.coerce.number().int().min(1, "Almeno 1 minuto").max(600, "Massimo 600 minuti"),
});

const DRAFT_ID = "__draft__";

const dayShort1 = (id: number) => DAYS.find(d => d.id === id)?.short.slice(0, 1) ?? "";

const suggestName = (dosage: DosageType, days: number[], times: string[]) => {
  const dosageL = DOSAGE_LABELS[dosage];
  let dayLabel = "—";
  const sorted = [...days].sort();
  const eq = (a: number[]) => a.length === sorted.length && a.every((v, i) => v === sorted[i]);
  if (eq([1, 2, 3, 4, 5, 6, 7])) dayLabel = "Ogni giorno";
  else if (eq([1, 2, 3, 4, 5])) dayLabel = "Lun-Ven";
  else if (eq([6, 7])) dayLabel = "Weekend";
  else if (sorted.length > 0) dayLabel = sorted.map(dayShort1).join("");
  const t = [...times].sort()[0] ?? "";
  return [dosageL, dayLabel, t].filter(Boolean).join(" · ");
};

const ProgramForm = () => {
  const { id } = useParams();
  const isEdit = !!(id && id !== "nuovo");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState<DosageType>("acqua");
  const [duration, setDuration] = useState<number>(15);
  const [days, setDays] = useState<number[]>([]);
  const [weekPattern, setWeekPattern] = useState<WeekPattern>("every");
  const [sectorMode, setSectorMode] = useState<SectorMode>("parallel");
  const [sectors, setSectors] = useState<number[]>([]);
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [active, setActive] = useState(true);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [compact, setCompact] = useState<boolean>(false);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);

  useEffect(() => {
    // Load other programs for "Copia da" + conflict detection
    (async () => {
      const { data } = await supabase
        .from("programs")
        .select("*, program_times(*)")
        .order("created_at", { ascending: false });
      if (data) setAllPrograms(data as unknown as Program[]);
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    setCompact(true);
    (async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*, program_times(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error || !data) {
        toast.error("Programma non trovato");
        navigate("/programmi");
        return;
      }
      setName(data.name);
      setDosage(data.dosage as DosageType);
      setDuration(data.duration_minutes);
      setDays(data.days_of_week);
      setWeekPattern((((data as any).week_pattern ?? "every") as WeekPattern));
      setSectorMode((((data as any).sector_mode ?? "parallel") as SectorMode));
      setSectors(data.sectors);
      setActive(data.active);
      setImagePath(data.image_url);
      const t = (data.program_times ?? []).map((x: any) => x.start_time.slice(0, 5)).sort();
      setTimes(t.length > 0 ? t : ["08:00"]);
      setLoading(false);
    })();
  }, [id, isEdit, navigate]);

  const toggleVal = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const addTime = () => setTimes(prev => [...prev, "12:00"]);
  const updateTime = (i: number, v: string) => setTimes(prev => prev.map((t, idx) => idx === i ? v : t));
  const removeTime = (i: number) => setTimes(prev => prev.filter((_, idx) => idx !== i));
  const addTimePreset = (v: string) => setTimes(prev => Array.from(new Set([...prev, v])).sort());
  const addTimeShift = () => {
    const last = [...times].sort().pop() ?? "08:00";
    const [h, m] = last.split(":").map(Number);
    const total = (h * 60 + m + 60) % (24 * 60);
    const nh = String(Math.floor(total / 60)).padStart(2, "0");
    const nm = String(total % 60).padStart(2, "0");
    addTimePreset(`${nh}:${nm}`);
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Immagine troppo grande (max 5MB)");
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const removeImage = async () => {
    setImageFile(null);
    setImagePreview(null);
    if (imagePath && isEdit) {
      await supabase.storage.from("program-images").remove([imagePath]);
      await supabase.from("programs").update({ image_url: null }).eq("id", id!);
    }
    setImagePath(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const copyFrom = (p: Program) => {
    setDosage(p.dosage as DosageType);
    setDuration(p.duration_minutes);
    setDays(p.days_of_week);
    setWeekPattern(((p.week_pattern ?? "every") as WeekPattern));
    setSectorMode(((p.sector_mode ?? "parallel") as SectorMode));
    setSectors(p.sectors);
    const t = (p.program_times ?? []).map(x => x.start_time.slice(0, 5)).sort();
    if (t.length > 0) setTimes(t);
    toast.success(`Copiato da "${p.name}"`);
  };

  const applyNameSuggestion = () => {
    if (!name.trim()) setName(suggestName(dosage, days, times));
  };

  const save = async () => {
    const parsed = schema.safeParse({ name, duration });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (days.length === 0) return toast.error("Seleziona almeno un giorno");
    if (sectors.length === 0) return toast.error("Seleziona almeno un settore");
    if (times.length === 0) return toast.error("Aggiungi almeno un orario");

    setSaving(true);

    let finalImagePath = imagePath;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `public/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("program-images").upload(path, imageFile, { upsert: false });
      if (upErr) { toast.error("Errore upload immagine"); setSaving(false); return; }
      if (imagePath) await supabase.storage.from("program-images").remove([imagePath]);
      finalImagePath = path;
    }

    const payload = {
      name: parsed.data.name,
      dosage,
      duration_minutes: parsed.data.duration,
      sectors,
      days_of_week: days,
      active,
      image_url: finalImagePath,
      week_pattern: weekPattern,
      sector_mode: sectorMode,
    };

    let programId = id!;
    if (isEdit) {
      const { error } = await supabase.from("programs").update(payload).eq("id", programId);
      if (error) { toast.error("Errore salvataggio"); setSaving(false); return; }
      await supabase.from("program_times").delete().eq("program_id", programId);
    } else {
      const { data: created, error } = await supabase.from("programs").insert(payload).select().single();
      if (error || !created) { toast.error("Errore creazione"); setSaving(false); return; }
      programId = created.id;
    }

    const uniqueTimes = Array.from(new Set(times));
    if (uniqueTimes.length > 0) {
      const { error: tErr } = await supabase.from("program_times").insert(
        uniqueTimes.map(t => ({ program_id: programId, start_time: `${t}:00` }))
      );
      if (tErr) { toast.error("Errore salvataggio orari"); setSaving(false); return; }
    }

    toast.success(isEdit ? "Programma aggiornato 🌱" : "Programma creato 🌱");
    setSaving(false);
    navigate("/programmi");
  };

  const removeProgram = async () => {
    if (!isEdit) return;
    if (!confirm("Eliminare questo programma?")) return;
    const { error } = await supabase.from("programs").delete().eq("id", id!);
    if (error) return toast.error("Errore eliminazione");
    if (imagePath) await supabase.storage.from("program-images").remove([imagePath]);
    toast.success("Programma eliminato");
    navigate("/programmi");
  };

  // Draft program for live conflict detection
  const draftConflicts = useMemo(() => {
    if (days.length === 0 || sectors.length === 0 || times.length === 0) return [];
    const draft: Program = {
      id: DRAFT_ID,
      name: name || "Nuovo programma",
      dosage,
      duration_minutes: duration,
      sectors,
      days_of_week: days,
      active: true,
      image_url: imagePath,
      week_pattern: weekPattern,
      sector_mode: sectorMode,
      program_times: Array.from(new Set(times)).map(t => ({ start_time: `${t}:00` })),
    } as unknown as Program;
    const others = allPrograms.filter(p => p.id !== id);
    const all = [draft, ...others];
    return findConflicts(all).filter(c => c.programA.id === DRAFT_ID || c.programB.id === DRAFT_ID);
  }, [name, dosage, duration, sectors, days, weekPattern, sectorMode, times, imagePath, allPrograms, id]);

  const totalMinutes = sectorMode === "sequential" ? duration * Math.max(1, sectors.length) : duration;

  // Validation per step
  const step1Valid = name.trim().length >= 1;
  const step2Valid = days.length >= 1 && times.length >= 1;
  const step3Valid = sectors.length >= 1;
  const allValid = step1Valid && step2Valid && step3Valid;

  const step1Msg = !step1Valid ? "Inserisci un nome" : "";
  const step2Msg = !step2Valid
    ? (days.length === 0 ? "Seleziona almeno un giorno" : "Aggiungi almeno un orario")
    : "";
  const step3Msg = !step3Valid ? "Seleziona almeno un settore" : "";

  if (loading) {
    return <AppShell><div className="h-96 animate-pulse rounded-2xl bg-muted" /></AppShell>;
  }

  const pill = (sel: boolean) => cn(
    "rounded-lg text-sm font-semibold transition-base",
    sel ? "gradient-primary text-primary-foreground shadow-soft" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
  );

  const dosageColor: Record<DosageType, string> = {
    acqua: "bg-water text-water-foreground",
    concime: "bg-fertilizer text-fertilizer-foreground",
    acido: "bg-acid text-acid-foreground",
  };

  // ------- Sub-blocks ---------

  const BlockBase = (
    <>
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-full h-32 bg-secondary/40 group"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="" className="w-full h-full object-cover" />
          ) : imagePath ? (
            <SignedImage path={imagePath} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <ImageIcon className="size-6" />
              <span className="text-xs">Tocca per aggiungere foto</span>
            </div>
          )}
          {(imagePreview || imagePath) && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); removeImage(); }}
              className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-background/90 size-8 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <Trash2 className="size-4" />
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome programma"
              maxLength={60}
              className="text-base font-semibold border-0 px-0 focus-visible:ring-0 shadow-none"
            />
            {!name.trim() && (
              <button
                type="button"
                onClick={applyNameSuggestion}
                className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1"
              >
                <Sparkles className="size-3" /> Suggerisci
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              {active ? "Attivo" : "Disattivo"}
            </span>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dosaggio</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(DOSAGE_LABELS) as DosageType[]).map(d => {
            const sel = dosage === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDosage(d)}
                className={cn("py-2.5 rounded-lg text-sm font-semibold transition-base", sel ? `${dosageColor[d]} shadow-soft` : "bg-secondary text-secondary-foreground hover:bg-secondary/70")}
              >
                {DOSAGE_LABELS[d]}
              </button>
            );
          })}
        </div>
      </Card>

      {!isEdit && allPrograms.length > 0 && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Copy className="size-3.5" /> Copia impostazioni da
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allPrograms.slice(0, 6).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => copyFrom(p)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary max-w-[10rem] truncate"
              >
                {p.name}
              </button>
            ))}
          </div>
        </Card>
      )}
    </>
  );

  const BlockWhen = (
    <>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giorni</div>
          <div className="flex flex-wrap gap-1 text-[11px]">
            <button type="button" onClick={() => setDays([1,2,3,4,5,6,7])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">Tutti</button>
            <button type="button" onClick={() => setDays([1,2,3,4,5])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">L-V</button>
            <button type="button" onClick={() => setDays([6,7])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">Weekend</button>
            <button type="button" onClick={() => setDays([1,3,5])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">Alterni</button>
            <button type="button" onClick={() => setDays([])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">—</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(d => {
            const sel = days.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDays(prev => toggleVal(prev, d.id))}
                className={cn("py-2.5", pill(sel))}
              >
                {d.short.slice(0,1)}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {([
            { v: "every" as WeekPattern, l: "Ogni sett." },
            { v: "A" as WeekPattern, l: "Sett. concime" },
            { v: "B" as WeekPattern, l: "Sett. acido" },
          ]).map(({ v, l }) => (
            <button key={v} type="button" onClick={() => setWeekPattern(v)} className={cn("py-2 text-xs", pill(weekPattern === v))}>{l}</button>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Orari</div>
          <Button type="button" size="sm" variant="ghost" onClick={addTime} className="h-7 px-2 text-primary">
            <Plus className="size-3.5" /> Aggiungi
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {times.map((t, i) => (
            <div key={i} className="flex items-center gap-1 bg-secondary/60 rounded-lg pr-1">
              <Clock className="size-3.5 text-muted-foreground ml-2" />
              <input
                type="time"
                value={t}
                onChange={(e) => updateTime(i, e.target.value)}
                className="bg-transparent border-0 outline-none text-sm font-semibold tabular-nums py-1.5 w-[5.5rem]"
              />
              {times.length > 1 && (
                <button type="button" onClick={() => removeTime(i)} className="size-6 inline-flex items-center justify-center rounded hover:bg-background/60">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button type="button" onClick={() => addTimePreset("06:00")} className="text-[11px] font-semibold px-2 py-1 rounded bg-secondary/70 hover:bg-secondary inline-flex items-center gap-1">
            <Sunrise className="size-3" /> Alba 06:00
          </button>
          <button type="button" onClick={() => addTimePreset("20:00")} className="text-[11px] font-semibold px-2 py-1 rounded bg-secondary/70 hover:bg-secondary inline-flex items-center gap-1">
            <Moon className="size-3" /> Sera 20:00
          </button>
          <button type="button" onClick={addTimeShift} className="text-[11px] font-semibold px-2 py-1 rounded bg-secondary/70 hover:bg-secondary">
            +1h dall'ultimo
          </button>
        </div>
      </Card>

      {draftConflicts.length > 0 && (
        <Card className="p-3 border-amber-500/60 bg-amber-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {draftConflicts.length} sovrapposizione{draftConflicts.length > 1 ? "i" : ""} con altri programmi
              </p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-amber-900/90 dark:text-amber-200/90">
                {draftConflicts.slice(0, 3).map((c, i) => {
                  const other = c.programA.id === DRAFT_ID ? c.programB : c.programA;
                  return (
                    <li key={i} className="truncate">
                      · {c.dayLabel} settore {c.sector} con <b>{other.name}</b> ({c.rangeA})
                    </li>
                  );
                })}
                {draftConflicts.length > 3 && <li>· e altre {draftConflicts.length - 3}…</li>}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </>
  );

  const BlockWhere = (
    <>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settori</div>
          <span className="text-xs text-muted-foreground tabular-nums">{sectors.length}/32</span>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {SECTORS.map(s => {
            const sel = sectors.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSectors(prev => toggleVal(prev, s))}
                className={cn(
                  "aspect-square rounded-md text-xs font-bold tabular-nums transition-base",
                  sel ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary/60 text-secondary-foreground hover:bg-secondary"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1 text-[11px] pt-1">
          <button type="button" onClick={() => setSectors(SECTORS)} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">Tutti</button>
          <button type="button" onClick={() => setSectors([1,2,3,4,5,6,7,8])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">1-8</button>
          <button type="button" onClick={() => setSectors([9,10,11,12,13,14,15,16])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">9-16</button>
          <button type="button" onClick={() => setSectors([17,18,19,20,21,22,23,24])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">17-24</button>
          <button type="button" onClick={() => setSectors([25,26,27,28,29,30,31,32])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">25-32</button>
          <button type="button" onClick={() => setSectors(prev => SECTORS.filter(s => !prev.includes(s)))} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">Inverti</button>
          <button type="button" onClick={() => setSectors([])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">—</button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modalità settori</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => setSectorMode("parallel")} className={cn("py-2.5 inline-flex items-center justify-center gap-1.5", pill(sectorMode === "parallel"))}>
            <Layers className="size-4" /> Tutti insieme
          </button>
          <button type="button" onClick={() => setSectorMode("sequential")} className={cn("py-2.5 inline-flex items-center justify-center gap-1.5", pill(sectorMode === "sequential"))}>
            <LayoutList className="size-4" /> Uno alla volta
          </button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Durata per settore</span>
          <span className="text-xs text-muted-foreground tabular-nums">Tot: {totalMinutes} min</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => setDuration(d => Math.max(1, d - 5))} title="-5">
            <Minus className="size-4" /><span className="text-[10px] font-bold">5</span>
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => setDuration(d => Math.max(1, d - 1))}>
            <Minus className="size-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              type="number"
              min={1}
              max={600}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="text-center text-lg font-bold tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">min</span>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => setDuration(d => Math.min(600, d + 1))}>
            <Plus className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => setDuration(d => Math.min(600, d + 5))} title="+5">
            <Plus className="size-4" /><span className="text-[10px] font-bold">5</span>
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[5, 10, 15, 20, 30, 45, 60].map(p => (
            <button key={p} type="button" onClick={() => setDuration(p)} className={cn("py-1.5 rounded-md text-xs font-semibold transition-base", duration === p ? "bg-primary text-primary-foreground" : "bg-secondary/60 hover:bg-secondary")}>
              {p}
            </button>
          ))}
        </div>
      </Card>
    </>
  );

  // Live summary card
  const summary = (
    <Card className="p-3 bg-primary/5 border-primary/30">
      <div className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1.5">Riepilogo</div>
      <p className="text-sm font-bold leading-snug truncate">{name || "— senza nome —"}</p>
      <div className="mt-1 text-[12px] text-foreground/85 leading-snug space-y-0.5">
        <p>
          <span className="font-semibold">{DOSAGE_LABELS[dosage]}</span>
          {" · "}
          {days.length > 0 ? [...days].sort().map(dayShort1).join("") : "nessun giorno"}
          {weekPattern !== "every" && ` · Sett. ${weekPattern === "A" ? "concime" : "acido"}`}
        </p>
        <p className="tabular-nums">
          {times.length > 0 ? [...times].sort().map(formatTime).join(" · ") : "nessun orario"}
        </p>
        <p>
          {sectors.length > 0 ? `Settori ${[...sectors].sort((a,b)=>a-b).join(", ")}` : "nessun settore"}
          {" · "}
          <span className="font-semibold">{sectorMode === "sequential" ? "uno alla volta" : "tutti insieme"}</span>
          {" · "}
          <span className="tabular-nums">{duration}′/set · tot {totalMinutes}′</span>
        </p>
      </div>
    </Card>
  );

  const isLast = step === 3;
  const canAdvance = (step === 1 && step1Valid) || (step === 2 && step2Valid) || (step === 3 && step3Valid);
  const currentMsg = step === 1 ? step1Msg : step === 2 ? step2Msg : step3Msg;

  return (
    <AppShell>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-3 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-base font-bold flex-1 truncate">{isEdit ? "Modifica" : "Nuovo programma"}</h1>
          <button
            type="button"
            onClick={() => setCompact(c => !c)}
            className="text-[11px] font-bold px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70"
            title="Cambia vista"
          >
            {compact ? "Guidato" : "Compatto"}
          </button>
          {(compact || isLast) ? (
            <Button onClick={save} disabled={saving || !allValid} size="sm">
              <Save className="size-4" />
              {saving ? "..." : "Salva"}
            </Button>
          ) : (
            <Button onClick={() => canAdvance && setStep(s => (s + 1) as 1|2|3)} disabled={!canAdvance} size="sm">
              Avanti <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
        {!compact && (
          <div className="mt-2 flex items-center gap-1.5">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setStep(n as 1|2|3)}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  step === n ? "bg-primary" : n < step ? "bg-primary/50" : "bg-secondary"
                )}
                aria-label={`Step ${n}`}
              />
            ))}
            <span className="text-[11px] font-bold text-muted-foreground w-8 text-right tabular-nums">{step}/3</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {compact ? (
          <>
            {BlockBase}
            {BlockWhen}
            {BlockWhere}
            {summary}
          </>
        ) : (
          <>
            {step === 1 && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">1 · Base</p>
                {BlockBase}
              </>
            )}
            {step === 2 && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">2 · Quando</p>
                {BlockWhen}
              </>
            )}
            {step === 3 && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">3 · Dove & quanto</p>
                {BlockWhere}
              </>
            )}
            {summary}
            {currentMsg && (
              <p className="text-xs font-semibold text-destructive text-center">{currentMsg}</p>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(s => (Math.max(1, s - 1)) as 1|2|3)}
                disabled={step === 1}
              >
                <ChevronLeft className="size-4" /> Indietro
              </Button>
              {isLast ? (
                <Button onClick={save} disabled={saving || !allValid} size="sm">
                  <Save className="size-4" /> {saving ? "..." : "Salva programma"}
                </Button>
              ) : (
                <Button onClick={() => canAdvance && setStep(s => (s + 1) as 1|2|3)} disabled={!canAdvance} size="sm">
                  Avanti <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </>
        )}

        {isEdit && (
          <Button onClick={removeProgram} variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="size-4" /> Elimina programma
          </Button>
        )}
        <div className="h-4" />
      </div>
    </AppShell>
  );
};

export default ProgramForm;
