import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListTree, Plus, CalendarDays, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import wordmark from "@/assets/irrigapp-wordmark.png.asset.json";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Oggi" },
  { to: "/giorni", icon: CalendarDays, label: "Giorni" },
  { to: "/programmi", icon: ListTree, label: "Programmi" },
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.jpg" alt="IrrigApp" className="size-10 rounded-full shadow-soft object-cover shrink-0" />
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

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="size-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-3/4 max-w-xs pb-[env(safe-area-inset-bottom)]">
                <div className="flex flex-col gap-6 mt-8">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Navigazione</p>
                  <nav className="flex flex-col gap-1">
                    {navItems.map((item) => {
                      const active = location.pathname === item.to;
                      return (
                        <SheetClose asChild key={item.to}>
                          <Link
                            to={item.to}
                            className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-base",
                              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            )}
                          >
                            <item.icon className="size-5" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};
