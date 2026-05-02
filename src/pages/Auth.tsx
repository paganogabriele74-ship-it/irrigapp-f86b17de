import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Sprout, Mail, Lock, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri").max(80),
  email: z.string().trim().email("Email non valida").max(255),
  password: z.string().min(6, "Minimo 6 caratteri").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("Email non valida"),
  password: z.string().min(1, "Inserisci la password"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get("tab") === "signup" ? "signup" : "signin";
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: fd.get("fullName"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already") ? "Email già registrata" : error.message);
      return;
    }
    toast.success("Account creato! Benvenuto su IrrigApp 🌱");
    navigate("/");
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast.error("Credenziali non valide");
      return;
    }
    navigate("/");
  };

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email) return toast.error("Inserisci la tua email");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Ti abbiamo inviato un'email per reimpostare la password");
      setForgotMode(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Accesso con Google non riuscito");
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="size-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <Sprout className="size-7 text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold tracking-tight">IrrigApp</span>
        </Link>

        <Card className="p-6 shadow-elevated border-border/60">
          {forgotMode ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Recupera password</h2>
                <p className="text-sm text-muted-foreground mt-1">Inserisci la tua email per ricevere il link di reset.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-forgot">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="email-forgot" name="email" type="email" required className="pl-9" placeholder="tu@esempio.it" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "Invio..." : "Invia link di reset"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>
                Torna al login
              </Button>
            </form>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Accedi</TabsTrigger>
                <TabsTrigger value="signup">Registrati</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-in">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input id="email-in" name="email" type="email" required className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-in">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input id="pass-in" name="password" type="password" required className="pl-9" />
                    </div>
                  </div>
                  <button type="button" className="text-sm text-primary hover:underline" onClick={() => setForgotMode(true)}>
                    Password dimenticata?
                  </button>
                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? "Accesso..." : "Accedi"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-up">Nome completo</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input id="name-up" name="fullName" required className="pl-9" placeholder="Mario Rossi" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-up">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input id="email-up" name="email" type="email" required className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-up">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input id="pass-up" name="password" type="password" required minLength={6} className="pl-9" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? "Creazione..." : "Crea il mio account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Auth;
