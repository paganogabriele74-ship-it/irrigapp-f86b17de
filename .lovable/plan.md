## Problema

Nella Dashboard su mobile (390px), le card della sezione "Programma di oggi" si vedono male perché in `ProgramCard.tsx` ci sono dimensioni testo eccessive (`text-2xl`, `text-4xl`) e l'orario a sinistra occupa una colonna fissa che riduce lo spazio della card. Risultato: testo che va a capo, badge "Leggera/Media/Forte" troppo grande, numeri "Settori" e "min" enormi, layout sbilanciato.

## Modifiche

### 1. `src/components/ProgramCard.tsx`
- Ridurre il titolo programma: da `text-xl` (e `text-destructive`) a dimensioni responsive `text-base sm:text-lg`, mantenendo il colore originale del tema (non destructive, che è rosso e fuori contesto).
- Ridurre il badge dosaggio: da `text-lg` a `text-xs` (dimensione standard dei badge).
- Ridurre la riga "Settori" e "min": da `text-2xl`/`text-4xl` a `text-sm` con il valore in `font-semibold text-foreground`. Allineamento pulito con icone piccole.
- Stringere la miniatura immagine su mobile: da `w-20 sm:w-28` a `w-16 sm:w-24` per dare più spazio al testo.
- Ridurre padding interno su mobile: `p-3 sm:p-4`.

### 2. `src/pages/Dashboard.tsx` — sezione "Programma di oggi"
- Restringere la colonna orario a sinistra su mobile: da `w-16` a `w-12 sm:w-16`, e l'orario da `text-lg` a `text-sm sm:text-base font-bold`.
- Ridurre il gap tra orario e card: da `gap-3` a `gap-2 sm:gap-3`.

### 3. (Opzionale, coerenza) Countdown card
Già accettabile su mobile, nessuna modifica necessaria.

## Risultato atteso

Su smartphone (390px) ogni riga "Programma di oggi" mostra: orario compatto a sinistra, card con miniatura, titolo leggibile su una riga, badge dosaggio piccolo, info settori/durata su una riga senza overflow.
