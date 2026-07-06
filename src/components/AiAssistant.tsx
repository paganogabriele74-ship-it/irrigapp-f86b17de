import { useEffect, useRef, useState } from "react";
import { Send, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import logoIcon from "@/assets/verde-bella-bot-icon.png.asset.json";


type Msg = { role: "user" | "assistant"; content: string };

export const AiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Ciao! Sono Verde Bella Bot, il tuo assistente per l'irrigazione. Chiedimi come strutturare un programma o informazioni sui settori." },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      // Fetch programs context
      const { data: progs } = await supabase
        .from("programs")
        .select("name, sectors, duration_minutes, dosage, days_of_week, active, program_times(start_time)")
        .limit(30);
      const programsContext = (progs ?? [])
        .map((p: any) => {
          const times = (p.program_times ?? []).map((t: any) => t.start_time?.slice(0, 5)).join(", ");
          return `- ${p.name} | settori: ${p.sectors?.join(",")} | ${p.duration_minutes}min | ${p.dosage} | giorni: ${p.days_of_week?.join(",")} | orari: ${times || "—"} | ${p.active ? "attivo" : "off"}`;
        })
        .join("\n");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          programsContext,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Errore assistente" }));
        toast.error(err.error || "Errore assistente");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Errore di rete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Verde Bella Bot"
        className={cn(
          "fixed z-50 right-4 bottom-24 md:bottom-6 size-14 rounded-full shadow-lg",
          "bg-white border-2 border-primary text-primary",
          "flex items-center justify-center transition-transform hover:scale-105 active:scale-95",
          "ring-4 ring-primary/20 overflow-hidden"
        )}
      >
        {open ? (
          <X className="size-6 text-primary" />
        ) : (
          <img src={logoIcon.url} alt="Verde Bella Bot" className="size-12 object-contain rounded-full" />
        )}
      </button>


      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 right-4 left-4 md:left-auto md:w-[380px]",
            "bottom-40 md:bottom-24 max-h-[70vh]",
            "bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          )}
        >
          <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center gap-2">
            <div className="size-8 rounded-full bg-white border border-primary/20 flex items-center justify-center overflow-hidden">
              <img src={logoIcon.url} alt="Verde Bella Bot" className="size-6 object-contain rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Verde Bella Bot</div>
              <div className="text-xs text-muted-foreground">Il tuo assistente irrigazione</div>
            </div>
          </div>


          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" /> Sto pensando…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-2 border-t border-border flex items-center gap-2 bg-background"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrivi un messaggio…"
              disabled={loading}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiAssistant;
