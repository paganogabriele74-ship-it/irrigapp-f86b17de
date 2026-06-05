import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const STORAGE_KEY = "programs_unlocked";
const CODE = "1974";

export default function ProgramsGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1"
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code === CODE) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) navigate("/"); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Sezione protetta
          </DialogTitle>
          <DialogDescription>Inserisci il codice per accedere ai programmi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="Codice"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            className={error ? "border-destructive" : ""}
          />
          {error && <p className="text-sm text-destructive">Codice errato</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/")}>Annulla</Button>
            <Button type="submit">Entra</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
