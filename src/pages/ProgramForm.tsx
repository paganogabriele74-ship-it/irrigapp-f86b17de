import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SignedImage } from "@/components/SignedImage";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Image as ImageIcon, Trash2, ArrowLeft, Save, Clock } from "lucide-react";
import { DAYS, DOSAGE_LABELS, DosageType, SECTORS, SectorMode, SECTOR_MODE_LABELS, WeekPattern, WEEK_PATTERN_LABELS } from "@/lib/irrigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      // Remove old image if replacing
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
      // Replace times
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

  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? "Modifica programma" : "Nuovo programma"}</h1>
      </div>

      <div className="space-y-5">
        {/* Name + active */}
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome del programma</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Programma 1" maxLength={60} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Attivo</Label>
              <p className="text-xs text-muted-foreground">I programmi disattivati non compaiono nella vista oggi</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </Card>

        {/* Days */}
        <Card className="p-5">
          <Label className="text-base mb-3 block">Giorni della settimana</Label>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {DAYS.map(d => {
              const sel = days.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDays(prev => toggle(prev, d.id))}
                  className={cn(
                    "py-3 rounded-xl text-sm font-semibold transition-base",
                    sel ? "gradient-primary text-primary-foreground shadow-soft" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  )}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setDays([1,2,3,4,5,6,7])} className="text-primary hover:underline">Tutti</button>
            <span className="text-muted-foreground">·</span>
            <button type="button" onClick={() => setDays([1,2,3,4,5])} className="text-primary hover:underline">Lun-Ven</button>
            <span className="text-muted-foreground">·</span>
            <button type="button" onClick={() => setDays([])} className="text-primary hover:underline">Nessuno</button>
          </div>
        </Card>

        {/* Week pattern */}
        <Card className="p-5">
          <Label className="text-base mb-1 block">Frequenza settimanale</Label>
          <p className="text-xs text-muted-foreground mb-3">Scegli se il programma parte ogni settimana o a settimane alternate (A / B).</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(WEEK_PATTERN_LABELS) as WeekPattern[]).map(w => {
              const sel = weekPattern === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeekPattern(w)}
                  className={cn(
                    "py-3 rounded-xl text-sm font-semibold transition-base",
                    sel ? "gradient-primary text-primary-foreground shadow-soft" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  )}
                >
                  {WEEK_PATTERN_LABELS[w]}
                </button>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Orari di partenza</Label>
            <Button type="button" size="sm" variant="outline" onClick={addTime}>
              <Plus className="size-3.5" /> Orario
            </Button>
          </div>
          <div className="space-y-2">
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} className="pl-9 tabular-nums" />
                </div>
                {times.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeTime(i)}>
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Dosage + duration */}
        <Card className="p-5 space-y-4">
          <div>
            <Label className="text-base mb-2 block">Tipo di dosaggio</Label>
            <Tabs value={dosage} onValueChange={(v) => setDosage(v as DosageType)}>
              <TabsList className="grid grid-cols-3 w-full">
                {(Object.keys(DOSAGE_LABELS) as DosageType[]).map(d => (
                  <TabsTrigger key={d} value={d}>{DOSAGE_LABELS[d]}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground mt-2">Applicato a tutti i settori del programma.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Durata per settore (minuti)</Label>
            <Input id="duration" type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="tabular-nums" />
            <p className="text-xs text-muted-foreground">Una sola durata per tutti i settori.</p>
          </div>
        </Card>

        {/* Sectors */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Settori (1-32)</Label>
            <span className="text-xs text-muted-foreground">{sectors.length} selezionati</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {SECTORS.map(s => {
              const sel = sectors.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSectors(prev => toggle(prev, s))}
                  className={cn(
                    "aspect-square rounded-lg text-sm font-semibold tabular-nums transition-base",
                    sel ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setSectors(SECTORS)} className="text-primary hover:underline">Tutti</button>
            <span className="text-muted-foreground">·</span>
            <button type="button" onClick={() => setSectors([])} className="text-primary hover:underline">Nessuno</button>
          </div>
        </Card>

        {/* Image */}
        <Card className="p-5">
          <Label className="text-base mb-3 block">Immagine (opzionale)</Label>
          {imagePreview || imagePath ? (
            <div className="relative rounded-xl overflow-hidden bg-muted">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-48 object-cover" />
              ) : (
                <SignedImage path={imagePath} className="w-full h-48 object-cover" />
              )}
              <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={removeImage}>
                <Trash2 className="size-3.5" /> Rimuovi
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-secondary/40 transition-base flex flex-col items-center justify-center gap-2 text-muted-foreground"
            >
              <ImageIcon className="size-6" />
              <span className="text-sm">Aggiungi foto della serra o del settore</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pb-4">
          <Button onClick={save} disabled={saving} size="lg" className="flex-1">
            <Save className="size-4" />
            {saving ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Crea programma"}
          </Button>
          {isEdit && (
            <Button onClick={removeProgram} variant="outline" size="lg" className="text-destructive hover:text-destructive">
              <Trash2 className="size-4" /> Elimina
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default ProgramForm;
