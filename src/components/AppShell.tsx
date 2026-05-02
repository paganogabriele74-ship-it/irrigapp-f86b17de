import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sprout, LayoutDashboard, ListTree, Plus, LogOut, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Oggi" },
  { to: "/giorni", icon: CalendarDays, label: "Giorni" },
  { to: "/programmi", icon: ListTree, label: "Programmi" },
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
              <Sprout className="size-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">IrrigApp</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-base flex items-center gap-2",
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate("/programmi/nuovo")} className="hidden sm:inline-flex">
              <Plus className="size-4" />
              Nuovo
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title={`Esci (${profile?.full_name ?? ""})`}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 transition-base",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-5" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/programmi/nuovo"
            className={cn(
              "flex flex-col items-center gap-1 py-2.5",
              location.pathname === "/programmi/nuovo" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Plus className="size-5" />
            <span className="text-[11px] font-medium">Nuovo</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};
