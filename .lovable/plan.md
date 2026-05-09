## Obiettivo

Permettere a ciascun programma di scegliere se i settori partono **tutti insieme** (in parallelo) o **uno alla volta** (in sequenza). Il calcolo della durata totale e la vista "In esecuzione ora" devono adattarsi di conseguenza.

## Modifiche

### 1. Database
Aggiungere alla tabella `programs` una colonna:
- `sector_mode` (testo, default `'parallel'`) con valori ammessi `'parallel'` o `'sequential'`.

I programmi esistenti restano su `'parallel'` (cambiabile dal form).

### 2. Form programma (`ProgramForm.tsx`)
Aggiungere una nuova card "Modalità settori" con due pulsanti:
- **Tutti insieme** (parallelo) — durata totale = durata
- **Uno alla volta** (sequenza) — durata totale = durata × n. settori

Etichetta della durata per settore aggiornata dinamicamente.

### 3. Libreria (`irrigation.ts`)
- Aggiungere tipo `SectorMode = "parallel" | "sequential"`.
- Aggiungere campo `sector_mode` all'interfaccia `Program`.
- Helper `getProgramTotalMinutes(program)` per calcolare la durata totale.

### 4. Dashboard (`Dashboard.tsx`) — sezione "In esecuzione ora"
Logica condizionale in base a `sector_mode`:

- **parallel**: mostra tutti i settori attivi insieme con un unico timer (durata totale = `duration_minutes`).
- **sequential**: mostra il settore corrente (es. "Settore 2 (2/3)") con timer del settore + barra di avanzamento totale (durata totale = `duration_minutes × n_settori`), come era prima.

Anche il calcolo di `nextSlot` resta invariato (basato sull'orario di partenza), ma la durata totale per determinare se un programma è ancora in esecuzione userà l'helper.

### 5. ProgramCard
Aggiungere un piccolo badge che indica la modalità ("Parallelo" / "Sequenza") accanto al badge della settimana.

## Dettagli tecnici

- Migrazione SQL: `ALTER TABLE programs ADD COLUMN sector_mode text NOT NULL DEFAULT 'parallel';`
- Nessun impatto sulle RLS esistenti.
- `types.ts` viene rigenerato automaticamente dopo la migrazione.
