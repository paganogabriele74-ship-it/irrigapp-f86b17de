import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListTree, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import wordmark from "@/assets/irrigapp-wordmark.png.asset.json";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Oggi" },
  { to: "/giorni", icon: CalendarDays, label: "Giorni" },
  { to: "/programmi", icon: ListTree, label: "Programmi" },
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="IrrigApp" className="size-9 rounded-full shadow-soft object-cover" />
            <img src={wordmark.url} alt="IrrigApp" className="h-7 w-auto object-contain" />
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
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3 max-w-md mx-auto">
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
        </div>
      </nav>
    </div>
  );
};
