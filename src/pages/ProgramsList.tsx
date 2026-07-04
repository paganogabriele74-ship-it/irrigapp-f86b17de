import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SignedImage } from "@/components/SignedImage";
import { Edit3, Trash2, Copy, Plus, Search, Droplets, Layers, Timer, Calendar, FileSpreadsheet, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAYS, DOSAGE_COLORS, DOSAGE_LABELS, SECTORS, formatSectors, Program } from "@/lib/irrigation";
import { findConflicts, exportProgramsToXlsx } from "@/lib/conflicts";
import { ConflictBanner } from "@/components/ConflictBanner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ProgramsList = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterTime, setFilterTime] = useState<string>("all");
  const [filterDosage, setFilterDosage] = useState<string>("all");
  const [filterDuration, setFilterDuration] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("programs")
      .select("*, program_times(*)")
      .order("created_at", { ascending: false });
    setPrograms((data ?? []) as unknown as Program[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (p: Program) => {
    const newVal = !p.active;
    setPrograms(prev => prev.map(x => x.id === p.id ? { ...x, active: newVal } : x));
    const { error } = await supabase.from("programs").update({ active: newVal }).eq("id", p.id);
    if (error) {
      toast.error("Errore aggiornamento");
      load();
    } else toast.success(newVal ? "Programma attivato" : "Programma disattivato");
  };

  const duplicate = async (p: Program) => {
    const { data: newP, error } = await supabase.from("programs").insert({
      name: `${p.name} (copia)`,
      dosage: p.dosage,
      duration_minutes: p.duration_minutes,
      sectors: p.sectors,
      days_of_week: p.days_of_week,
      active: false,
      image_url: p.image_url,
    }).select().single();
    if (error || !newP) return toast.error("Errore duplicazione");
    if (p.program_times && p.program_times.length > 0) {
      await supabase.from("program_times").insert(
        p.program_times.map(t => ({ program_id: newP.id, start_time: t.start_time }))
      );
    }
    toast.success("Programma duplicato");
    load();
  };

  const remove = async (p: Program) => {
    const { error } = await supabase.from("programs").delete().eq("id", p.id);
    if (error) return toast.error("Errore eliminazione");
    toast.success("Programma eliminato");
    setPrograms(prev => prev.filter(x => x.id !== p.id));
  };

  const uniqueTimes = useMemo(() => Array.from(new Set(programs.flatMap(p => p.program_times?.map(t => t.start_time) ?? []))).sort(), [programs]);
  const uniqueDurations = useMemo(() => Array.from(new Set(programs.map(p => p.duration_minutes))).sort((a, b) => a - b), [programs]);

  const filtered = programs.filter(p => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filterSector !== "all" && !p.sectors.includes(Number(filterSector))) return false;
    if (filterTime !== "all" && !p.program_times?.some(t => t.start_time === filterTime)) return false;
    if (filterDosage !== "all" && p.dosage !== filterDosage) return false;
    if (filterDuration !== "all" && p.duration_minutes !== Number(filterDuration)) return false;
    return true;
  });

  const activeFilterCount =
    (q ? 1 : 0) +
    (filterSector !== "all" ? 1 : 0) +
    (filterTime !== "all" ? 1 : 0) +
    (filterDosage !== "all" ? 1 : 0) +
    (filterDuration !== "all" ? 1 : 0);

  const clearFilters = () => {
    setQ("");
    setFilterSector("all");
    setFilterTime("all");
    setFilterDosage("all");
    setFilterDuration("all");
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">I miei programmi</h1>
          <p className="text-sm text-muted-foreground">{programs.length} totali · {programs.filter(p => p.active).length} attivi</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={programs.length === 0}
            onClick={async () => {
              try { await exportProgramsToXlsx(programs); toast.success("Excel esportato"); }
              catch { toast.error("Errore esportazione"); }
            }}
          >
            <FileSpreadsheet className="size-4" /> Esporta
          </Button>
          <Button asChild>
            <Link to="/programmi/nuovo"><Plus className="size-4" /> Nuovo</Link>
          </Button>
        </div>
      </div>

      <ConflictBanner conflicts={findConflicts(programs)} />

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cerca programma..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <SlidersHorizontal className="size-4 text-muted-foreground shrink-0" />
        <Select value={filterSector} onValueChange={setFilterSector}>
          <SelectTrigger className="h-9 w-[140px] shrink-0">
            <SelectValue placeholder="Settore" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i settori</SelectItem>
            {SECTORS.map(s => <SelectItem key={s} value={String(s)}>Settore {s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTime} onValueChange={setFilterTime}>
          <SelectTrigger className="h-9 w-[130px] shrink-0">
            <SelectValue placeholder="Orario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli orari</SelectItem>
            {uniqueTimes.map(t => <SelectItem key={t} value={t}>{t.slice(0, 5)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDosage} onValueChange={setFilterDosage}>
          <SelectTrigger className="h-9 w-[130px] shrink-0">
            <SelectValue placeholder="Dosaggio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i dosaggi</SelectItem>
            {Object.entries(DOSAGE_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDuration} onValueChange={setFilterDuration}>
          <SelectTrigger className="h-9 w-[150px] shrink-0">
            <SelectValue placeholder="Durata" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le durate</SelectItem>
            {uniqueDurations.map(d => <SelectItem key={d} value={String(d)}>{d} min/settore</SelectItem>)}
          </SelectContent>
        </Select>
        {activeFilterCount > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2 shrink-0" onClick={clearFilters}>
            <X className="size-4" /> Cancella
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-muted-foreground mb-4">{programs.length === 0 ? "Nessun programma ancora." : "Nessun risultato per i filtri scelti."}</p>
          {programs.length === 0 ? (
            <Button asChild><Link to="/programmi/nuovo"><Plus className="size-4" /> Crea il primo</Link></Button>
          ) : activeFilterCount > 0 && (
            <Button variant="outline" onClick={clearFilters}><X className="size-4" /> Cancella filtri</Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <Card key={p.id} className={cn("overflow-hidden", !p.active && "opacity-70")}>
              <div className="flex">
                {p.image_url && (
                  <div className="w-24 shrink-0 bg-muted">
                    <SignedImage path={p.image_url} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge className={cn("border-0", DOSAGE_COLORS[p.dosage])}>
                      <Droplets className="size-3 mr-1" />{DOSAGE_LABELS[p.dosage]}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      <Timer className="size-3 mr-1" />{p.duration_minutes} min
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      <Layers className="size-3 mr-1" />Settori {formatSectors(p.sectors)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Calendar className="size-3.5" />
                    {p.days_of_week.length === 0 ? "Nessun giorno" :
                     p.days_of_week.length === 7 ? "Tutti i giorni" :
                     [...p.days_of_week].sort().map(d => DAYS.find(x => x.id === d)?.short).join(", ")}
                    {p.program_times && p.program_times.length > 0 && (
                      <span> · {p.program_times.length} {p.program_times.length === 1 ? "orario" : "orari"}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/programmi/${p.id}`}><Edit3 className="size-3.5" /> Modifica</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate(p)}>
                      <Copy className="size-3.5" /> Duplica
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                          <Trash2 className="size-3.5" /> Elimina
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare "{p.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(p)} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default ProgramsList;
