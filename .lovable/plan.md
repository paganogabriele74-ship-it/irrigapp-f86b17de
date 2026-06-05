## Codice di accesso alla sezione Programmi

Proteggere l'accesso alle pagine `/programmi`, `/programmi/nuovo` e `/programmi/:id` con il codice **1974**.

### Comportamento
- Aprendo una qualsiasi pagina dei programmi, appare un dialog che chiede il codice.
- Codice corretto (**1974**) → accesso sbloccato e ricordato per la sessione corrente (finché non si chiude il browser).
- Codice sbagliato → messaggio di errore, resta bloccato.
- Bottone "Annulla" → torna alla dashboard.

### Implementazione
1. Nuovo componente `src/components/ProgramsGuard.tsx`:
   - Controlla `sessionStorage.getItem("programs_unlocked")`.
   - Se non sbloccato, mostra un `Dialog` con `Input` numerico (`inputMode="numeric"`, type password) e bottone "Entra".
   - Su codice corretto, salva il flag in `sessionStorage` e renderizza i children.
2. In `src/App.tsx`, avvolgere le tre route dei programmi con `<ProgramsGuard>`.

### Nota
Il codice è nel frontend, quindi è una protezione di comodo (evita modifiche accidentali da parte di altri sul dispositivo), non una sicurezza reale.
