# Portale Athlon

Il portale clienti di Athlon Club. Oggi è una web app su **app.athlonroma.it**; domani lo stesso codice diventa l'app iOS e Android.

- Cosa c'è oggi nel CRM e cosa trasloca qui: [docs/inventario-funzioni-cliente.md](docs/inventario-funzioni-cliente.md)
- Le decisioni e le tappe della fase 1: [docs/piano-fase-1.md](docs/piano-fase-1.md)

## Com'è fatto

- **Expo SDK 57 con Expo Router.** Ogni file in `src/app/` è una schermata, e il suo percorso è anche il deep link dell'app. Le regole del framework stanno in [AGENTS.md](AGENTS.md).
- **Nessuna logica di dominio qui.** Il portale chiama le API cliente: in fase 1 le rotte che il CRM ha già (`src/api/`), poi le Edge Function `portale-*` sul progetto Supabase unico. Schema, migrazioni ed Edge Function restano nel repo **APP-ATHLON**; qui c'è solo l'interfaccia.
- **Due binari** (vedi il piano):
  - `/richiesta/*` e `/r/<token>`: le richieste via email, senza login, collegate a PerfectGym;
  - `/lab/*`: il laboratorio per i tester, con login proprio, area riservata, calendario e pagamenti di prova.

## Avvio

```bash
npm install
cp .env.example .env.local   # poi metti la publishable key di Supabase
npm run web                  # http://localhost:8081
```

- **iOS e Android:** `npm run ios` / `npm run android`.
- **Build web:** `npm run build:web` produce `dist/`. È una single page app, e `vercel.json` rimanda ogni percorso a `index.html`.
- **Controlli:** `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

Il CRM accetta già le chiamate da `http://localhost:<porta>`. Quindi in sviluppo il portale parla con le API vere di produzione, e **una richiesta inviata con un'email vera manda un'email vera**.

## Due cose da sapere

- **Il disco è exFAT.** macOS scrive un `._nome` accanto a ogni file. `metro.config.js` li nasconde a Metro: senza, Expo Router li prende per schermate e il bundle si rompe. `.gitignore` li tiene fuori dal repository.
- **Deep link.** `app.json` dichiara `app.athlonroma.it/r/*` per Universal Links (iOS) e App Links (Android). Perché funzionino, il dominio dovrà servire `/.well-known/apple-app-site-association` e `/.well-known/assetlinks.json`, cosa che si fa quando nasce la prima build dell'app.
