## Modifiche Dashboard

**1. Countdown "Prossima irrigazione" — sfondo bianco, testo azzurro**
- In `src/pages/Dashboard.tsx`, cambiare la card countdown: sfondo bianco pieno, bordo azzurro sottile, ombra leggera.
- I 4 riquadri (giorni/ore/minuti/secondi) diventano azzurri su bianco: numeri grandi in `text-primary` (azzurro acqua), etichette in azzurro più tenue.
- Etichetta "Prossima irrigazione" e nome programma in azzurro scuro per massimo contrasto anche in pieno sole.

**2. Meteo cliccabile — previsioni prossime 8 ore**
- Rendere il blocco meteo nell'hero un pulsante che apre un `Sheet` (bottom sheet mobile-first).
- Estendere la fetch Open-Meteo aggiungendo `hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m` (già parziale).
- Nel Sheet mostrare le prossime 8 ore in lista compatta: ora, icona meteo, temperatura, **probabilità pioggia %**, **vento km/h** (evidenziato in rosso se ≥ 20 km/h).
- Piccolo hint visivo sulla card meteo ("Tocca per previsioni") così l'utente capisce che è interattiva.

**3. Allerta vento — chiarire lo scopo "sportelli"**
- Cambiare il testo dell'alert vento da generico a specifico:
  > "Allerta vento (X km/h) — chiudere gli sportelli"
- Applicare la stessa dicitura anche nel Sheet delle previsioni orarie quando una fascia supera la soglia.
- Soglia: ≥ 30 km/h.

Nessuna modifica a database, logica programmi o altre schermate.
