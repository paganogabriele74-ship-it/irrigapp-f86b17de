import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sprout } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in URL hash and sets a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 6) return toast.error("La password deve avere almeno 6 caratteri");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password aggiornata!");
    navigate("/");
  };

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <Sprout className="size-7 text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold">IrrigApp</span>
        </div>
        <Card className="p-6 shadow-elevated">
          <h2 className="text-xl font-semibold mb-1">Imposta nuova password</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {ready ? "Scegli una nuova password sicura." : "Verifica del link in corso..."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nuova password</Label>
              <Input id="password" name="password" type="password" required minLength={6} disabled={!ready} />
            </div>
            <Button type="submit" disabled={loading || !ready} className="w-full" size="lg">
              {loading ? "Salvataggio..." : "Aggiorna password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
