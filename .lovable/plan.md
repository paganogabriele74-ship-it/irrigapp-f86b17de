## Problema
Su iPhone, aggiungendo l'app alla schermata Home, non compare il logo come icona dell'app.

## Causa
Mancano nel progetto:
1. Il file `manifest.webmanifest` che descrive l'app al browser.
2. Il tag `<link rel="apple-touch-icon">` richiesto da iOS per generare l'icona.
3. Il riferimento al manifest in `index.html`.

## Piano

1. **Generare le icone PWA** a partire dal logo esistente (`public/logo.jpg`):
   - `public/icon-192x192.png` — per Android e manifest
   - `public/icon-512x512.png` — per Android e manifest
   - `public/apple-touch-icon.png` (180×180) — per iOS
   - Generare un'icona quadrata con sfondo blu acqua coerente con la palette attuale, centrando il logo irrigazione.

2. **Creare `public/manifest.webmanifest`** con:
   - `name`: "IrrigApp"
   - `short_name`: "IrrigApp"
   - `icons`: riferimenti a 192×192 e 512×512
   - `theme_color`: `#0a5a8a` (blu acqua scuro attuale)
   - `background_color`: `#0a5a8a`
   - `display`: `"standalone"`
   - `start_url`: `"/"`

3. **Aggiornare `index.html`** aggiungendo nell'`<head>`:
   - `<link rel="manifest" href="/manifest.webmanifest">`
   - `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`
   - (mantenere il favicon esistente)

## Risultato atteso
Su iPhone l'icona dell'app sulla Home mostrerà il logo IrrigApp. Su Android comparirà l'opzione "Aggiungi a schermata Home" con il medesimo logo. Nessun service worker o cache offline verrà aggiunto.