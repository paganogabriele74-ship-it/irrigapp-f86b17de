
## Obiettivo
Ridurre i tap e il carico visivo del form "Nuovo/Modifica programma" (attualmente 5 card impilate) trasformandolo in un flusso a step con anteprima live e default intelligenti.

## Cosa cambia (UX)

### 1. Wizard a 3 step con progress bar in alto
Invece di una lunga pagina scroll-only, un wizard mobile-first:
- **Step 1 – Base**: nome + foto + dosaggio (acqua/concime/acido) + attivo
- **Step 2 – Quando**: giorni (chip L M M G V S D) + settimana (Ogni / Concime / Acido) + orari
- **Step 3 – Dove & quanto**: settori (griglia 8×4) + modalità (insieme / uno alla volta) + durata

Header fisso con: `< Indietro` · titolo · `Avanti >` / `Salva`. Progress bar 1/3 · 2/3 · 3/3.

### 2. Riquadro riassuntivo sempre visibile
In fondo ad ogni step una mini-card riassunto ("Alle 08:00 e 20:00 · Lun-Ven · Settori 1,3,5 · 15 min · Totale 15 min") così l'utente vede in tempo reale cosa sta creando senza dover scorrere.

### 3. Compilazione più veloce
- **Preset programma**: primo step mostra 3 bottoni "Copia da…" con i programmi esistenti (copia tutto tranne il nome) — utile per creare varianti concime/acido.
- **Nome auto-suggerito**: se vuoto, propone es. "Concime · Lun-Ven · 08:00".
- **Orari smart**: bottoni rapidi "Alba (06:00)", "Sera (20:00)", "+1h dall'ultimo", oltre a "Aggiungi orario". Rimozione con swipe / X.
- **Giorni**: aggiungere preset "Weekend" (S-D) e "A giorni alterni" (L-M-V) accanto a Tutti/L-V.
- **Settori**: aggiungere preset "1-8", "9-16", "17-24", "25-32" (righe della griglia) + "Inverti selezione".
- **Durata**: preset già presenti; aggiungere pulsanti ±5 min oltre a ±1, e ricordare l'ultima durata usata come default per un nuovo programma.

### 4. Feedback e validazione inline
- I bottoni "Avanti" si abilitano solo quando lo step è valido; se disabilitato, mostrare sotto il motivo ("Seleziona almeno un giorno").
- Rilevare **conflitti di orario** (già presente `lib/conflicts.ts`) direttamente nello step 2 con un banner arancione contestuale, non solo in dashboard.

### 5. Modifica rapida senza wizard
In modalità **modifica** aggiungere un toggle "Vista compatta" in alto che mostra tutti gli step in una singola schermata (l'attuale layout), per chi vuole cambiare al volo un solo campo senza cliccare Avanti/Indietro.

## Dettagli tecnici
- Un solo file: `src/pages/ProgramForm.tsx`. Nessuna modifica al DB o alle API.
- Stato locale nuovo: `step: 1 | 2 | 3`, `compact: boolean` (default `true` in edit, `false` in create).
- Estrarre i 3 step in sub-componenti nello stesso file (`Step1Base`, `Step2When`, `Step3Where`) per leggibilità.
- Riassunto: nuovo componente `<ProgramSummary>` riutilizzabile che accetta lo stato corrente.
- Preset "Copia da": fetch dei programmi esistenti al mount (già query simile in `ProgramsList`).
- Conflitti inline: importare `detectConflicts` da `@/lib/conflicts` e passargli il programma in bozza + gli altri programmi.
- Nessuna nuova dipendenza.

## Fuori scope
- Nessuna modifica a Dashboard, DaysView, ProgramsList.
- Nessuna modifica allo schema DB.
- Nessun cambio palette o tipografia.
