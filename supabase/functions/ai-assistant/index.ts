import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, programsContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('Missing LOVABLE_API_KEY');

    const system = `Sei un assistente esperto di irrigazione agricola integrato nell'app IrrigApp. Aiuti l'utente a:
- capire i programmi di irrigazione esistenti
- progettare nuovi programmi (settori, orari di partenza, dosaggio in mm o durata in minuti, giorni della settimana)
- dare consigli pratici basati sulla coltura, meteo e tipo di terreno
- suggerire come evitare sovrapposizioni di orari tra settori

Rispondi in italiano, in modo sintetico e pratico. Usa markdown (elenchi puntati, grassetto) quando aiuta la leggibilità. Se ti servono dati che non hai, chiedi prima di rispondere.

${programsContext ? `\nProgrammi attualmente configurati:\n${programsContext}` : ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: system }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite richieste raggiunto, riprova tra poco.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Crediti AI esauriti. Aggiungi crediti al workspace Lovable.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      throw new Error(`Gateway error ${response.status}: ${text}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('ai-assistant error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
