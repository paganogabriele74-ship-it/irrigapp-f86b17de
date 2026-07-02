import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SignedImage } from "@/components/SignedImage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Image as ImageIcon, Trash2, ArrowLeft, Save, Clock, Minus, Copy } from "lucide-react";
import { DAYS, DOSAGE_LABELS, DosageType, SECTORS, SectorMode, WeekPattern, WEEK_PATTERN_LABELS } from "@/lib/irrigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type OtherProgram = {
  id: string;
  name: string;
  dosage: DosageType;
  duration_minutes: number;
  days_of_week: number[];
  sectors: number[];
  week_pattern: WeekPattern;
  sector_mode: SectorMode;
  program_times: { start_time: string }[];
};

const CopyFrom = ({
  programs,
  label,
  onPick,
  describe,
}: {
  programs: OtherProgram[];
  label: string;
  onPick: (p: OtherProgram) => void;
  describe: (p: OtherProgram) => string;
}) => {
  const [open, setOpen] = useState(false);
  if (programs.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          <Copy className="size-3" /> Copia da…
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1 max-h-72 overflow-y-auto">
        <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Copia {label} da
        </div>
        {programs.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => { onPick(p); setOpen(false); toast.success(`${label} copiato da "${p.name}"`); }}
            className="w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors"
          >
            <div className="text-sm font-semibold truncate">{p.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{describe(p)}</div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const schema = z.object({
  name: z.string().trim().min(1, "Inserisci un nome").max(60, "Massimo 60 caratteri"),
  duration: z.coerce.number().int().min(1, "Almeno 1 minuto").max(600, "Massimo 600 minuti"),
});

const ProgramForm = () => {
  const { id } = useParams();
  const isEdit = id && id !== "nuovo";
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

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
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
      setWeekPattern(((data as any).week_pattern ?? "every") as WeekPattern);
      setSectorMode(((data as any).sector_mode ?? "parallel") as SectorMode);
      setSectors(data.sectors);
      setActive(data.active);
      setImagePath(data.image_url);
      const t = (data.program_times ?? []).map((x: any) => x.start_time.slice(0, 5)).sort();
      setTimes(t.length > 0 ? t : ["08:00"]);
      setLoading(false);
    })();
  }, [id, isEdit, navigate]);
  const [others, setOthers] = useState<OtherProgram[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("programs")
        .select("id,name,dosage,duration_minutes,days_of_week,sectors,week_pattern,sector_mode,program_times(start_time)")
        .order("name");
      const list = ((data ?? []) as any[]).filter(p => !isEdit || p.id !== id) as OtherProgram[];
      setOthers(list);
    })();
  }, [id, isEdit]);

  const toggle = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const addTime = () => setTimes(prev => [...prev, "12:00"]);
  const updateTime = (i: number, v: string) => setTimes(prev => prev.map((t, idx) => idx === i ? v : t));
  const removeTime = (i: number) => setTimes(prev => prev.filter((_, idx) => idx !== i));

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
      if (upErr) {
        toast.error("Errore upload immagine");
        setSaving(false);
        return;
      }
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

  if (loading) {
    return <AppShell><div className="h-96 animate-pulse rounded-2xl bg-muted" /></AppShell>;
  }

  const totalMinutes = sectorMode === "sequential" ? duration * Math.max(1, sectors.length) : duration;

  // Compact pill button helper styles
  const pill = (sel: boolean) => cn(
    "rounded-lg text-sm font-semibold transition-base",
    sel ? "gradient-primary text-primary-foreground shadow-soft" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
  );

  const dosageColor: Record<DosageType, string> = {
    acqua: "bg-water text-water-foreground",
    concime: "bg-fertilizer text-fertilizer-foreground",
    acido: "bg-acid text-acid-foreground",
  };

  return (
    <AppShell>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-4 bg-background/85 backdrop-blur-md border-b border-border flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1 truncate">{isEdit ? "Modifica" : "Nuovo programma"}</h1>
        <Button onClick={save} disabled={saving} size="sm">
          <Save className="size-4" />
          {saving ? "..." : "Salva"}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Hero: image + name + active */}
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome programma"
              maxLength={60}
              className="text-base font-semibold border-0 px-0 focus-visible:ring-0 shadow-none"
            />
            <div className="flex items-center justify-between">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                {active ? "Attivo" : "Disattivo"}
              </span>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
        </Card>

        {/* Dosage as colored pills + duration stepper */}
        <Card className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dosaggio</div>
              <CopyFrom
                programs={others}
                label="dosaggio"
                onPick={(p) => setDosage(p.dosage)}
                describe={(p) => DOSAGE_LABELS[p.dosage]}
              />
            </div>
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
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2 gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Durata per settore</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">Tot: {totalMinutes} min</span>
                <CopyFrom
                  programs={others}
                  label="durata"
                  onPick={(p) => setDuration(p.duration_minutes)}
                  describe={(p) => `${p.duration_minutes} min`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
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
            </div>
            <div className="flex gap-1.5 mt-2">
              {[5, 10, 15, 20, 30, 45, 60].map(p => (
                <button key={p} type="button" onClick={() => setDuration(p)} className={cn("flex-1 py-1 rounded-md text-xs font-medium transition-base", duration === p ? "bg-primary text-primary-foreground" : "bg-secondary/60 hover:bg-secondary")}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settori:</div>
              <CopyFrom
                programs={others}
                label="modalità"
                onPick={(p) => setSectorMode(p.sector_mode)}
                describe={(p) => p.sector_mode === "sequential" ? "Uno alla volta" : "Tutti insieme"}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setSectorMode("parallel")} className={cn("py-2.5", pill(sectorMode === "parallel"))}>Tutti insieme</button>
              <button type="button" onClick={() => setSectorMode("sequential")} className={cn("py-2.5", pill(sectorMode === "sequential"))}>Uno alla volta</button>
            </div>
          </div>
        </Card>

        {/* Days + week pattern combined */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giorni</div>
            <div className="flex gap-1 text-[11px]">
              <button type="button" onClick={() => setDays([1,2,3,4,5,6,7])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">Tutti</button>
              <button type="button" onClick={() => setDays([1,2,3,4,5])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">L-V</button>
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
                  onClick={() => setDays(prev => toggle(prev, d.id))}
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

        {/* Times - compact chip rows */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
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
        </Card>

        {/* Sectors - compact grid */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settori</div>
            <div className="flex gap-1 text-[11px]">
              <span className="text-xs text-muted-foreground mr-1 self-center">{sectors.length}/32</span>
              <button type="button" onClick={() => setSectors(SECTORS)} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">Tutti</button>
              <button type="button" onClick={() => setSectors([])} className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary">—</button>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {SECTORS.map(s => {
              const sel = sectors.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSectors(prev => toggle(prev, s))}
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
        </Card>

        {/* Delete (only edit) */}
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
