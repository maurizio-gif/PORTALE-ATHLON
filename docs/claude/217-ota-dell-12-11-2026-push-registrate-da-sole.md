## L'OTA del 12/11/2026 con la registrazione automatica delle push: tre runtime (3.0.0, 3.1.0, 3.1.1) (12/11/2026)

Richiesta di Maurizio, con il via esplicito a pubblicare: portare sui tre runtime la modifica della sezione 214 (`8833fb4`, PR #371: il dispositivo si iscrive da solo alle push se il permesso del telefono c'è già, e chi le ha spente dall'app resta spento), seguendo la procedura della 213 e della 210. **Pubblicata il 12/11/2026 fra le 09:52 e le 09:53 UTC** sul canale `production`, iOS e Android insieme, **un gruppo per runtime** (3.0.0 alle 09:52:33, 3.1.1 alle 09:53:01, 3.1.0 alle 09:53:26).

- **Cosa porta, rispetto alla 213**: solo `8833fb4`. `git diff --name-only 363cdcc 8833fb4 -- src scripts package.json package-lock.json app.json plugins assets` dà due file, `src/features/lab/notifiche/Notifiche.tsx` e `src/features/lab/notifiche/push.ts`.
- **Runtime 3.0.0**, gruppo `f7eeeb68-4d95-42d2-b3a9-d0d9b3e7960a` (iOS `01a1cf2c-5cec-7b10-a18c-b5108159ac7b`, Android `01a1cf2c-5cec-7c12-94eb-2b7696064ca4`): l'albero della 213 per il 3.0.0, ricostruito da capo (base `74279d4` + i commit della 210, la #347 e `391a497`, tutti senza conflitti), **più** `git show 8833fb4 --format= -- src | git apply --index --3way`: applicata pulita, nessun conflitto. Riscontro: prima della patch i file diversi da `e0d5de9` erano i 15 della 213 (i 14 di Adyen, Apple Pay, `package.json`, `app.json`, plugin BouncyCastle, `scripts/prova-rilascio.ts`, più `Schermata.tsx`), e `push.ts` e `Notifiche.tsx` erano identici a quelli di `363cdcc`; dopo la patch i due file in più sono proprio quelli, identici a `main`. Senza `node_modules/@adyen` e senza il Baby Nuoto col Drop-in, come sempre.
- **Runtime 3.1.1**, gruppo `8dfb5632-ed40-4c40-a547-46165a1dbfe2` (iOS `01a1cf2c-cb25-73ff-b9d9-9472e3f415c0`, Android `01a1cf2c-cb25-7c50-8534-c7174ae47f8a`): `main` (`8833fb4`) com'è.
- **Runtime 3.1.0** (le app degli store), gruppo `494a7ace-4c20-4837-ad7e-99bf743f2852` (iOS `01a1cf2d-2a32-74a8-9ac1-558af441eff7`, Android `01a1cf2d-2a32-78f2-896f-8fc37ddf0403`): lo stesso albero con `version` di `app.json` a `3.1.0`, lasciata così anche durante `eas update` e poi rimessa com'era (`git checkout app.json`).
- **Gruppi sostituiti come ultimo di ogni runtime**: quelli della 213, `5e407885…` (3.0.0), `c1f80a5f…` (3.1.1), `0bb87d5f…` (3.1.0). I nuovi sono un soprainsieme esatto (in più c'è solo `8833fb4`).
- **Verifica fatta**:
  - **Prima di costruire e di nuovo subito prima di pubblicare**, `eas update:list --branch production`: l'ultimo gruppo di 3.0.0, 3.1.1 e 3.1.0 era quello della 213, e fra gli ultimi dodici gruppi non c'era nessun altro runtime. Il secondo controllo e la pubblicazione stanno nello stesso comando: se il controllo non fosse passato non sarebbe partito nessun `eas update`. Dopo la pubblicazione, lo stesso elenco mette in cima i tre gruppi nuovi.
  - `tsc --noEmit`: **0 errori in `src/`** sui tre alberi. Restano i 45 errori fuori da `src/` della 213 (43 in `docs/classifica-server/`, 2 in `scripts/`), identici sui tre alberi.
  - `expo export --platform ios --platform android` per tre cartelle, sei bundle `.hbc`. **Marcatore della 214: `athlon.push.spente_a_mano`**, il nome del segno in `localStorage` (0 file in `src/` a `363cdcc`, 1 a `8833fb4`): **una volta in ciascuno dei sei bundle**. Il nome `registraSePermessoGiaConcesso` nel `.hbc` minificato non resta. Gli altri marcatori sono quelli della 213: `AdyenDropIn` e `sessione_acquisto` 0 nei due bundle del 3.0.0 e 1 nei quattro 3.1.x; `attiva-notifiche` e i tre testi di «Disdici» una volta in tutti e sei.
  - **`u.expo.dev`**, sei combinazioni (tre runtime, iOS e Android), tutte HTTP 200: l'`id` del manifest e l'intestazione `expo-update-id` sono gli id restituiti da `eas update`, `runtimeVersion` è quello giusto, `metadata.updateGroup` è il gruppo pubblicato, e `launchAsset.hash` (sha256, base64url) e `launchAsset.key` (md5) sono quelli del `.hbc` esportato. Sei su sei.

  | runtime | piattaforma | md5 del bundle (`launchAsset.key`) |
  | --- | --- | --- |
  | 3.0.0 | iOS | `eac21058879bce6c7a1761bec314897e` |
  | 3.0.0 | Android | `3c077d354bbdfe38ae7088c436c7cce0` |
  | 3.1.1 | iOS | `ca0e2f44495703260c2e818654591450` |
  | 3.1.1 | Android | `619cee90f1b1b3e41b05da0caee85fbe` |
  | 3.1.0 | iOS | `7eeaca50996126d540acffea3d143a5c` |
  | 3.1.0 | Android | `14003bc41bb0d5e2b290001878842c80` |

- **Come la 213, non la 210**: i byte del bundle da `assets.eascdn.net` non li ho scaricati (lì serve un'autorizzazione, sezione 213); il confronto è sugli hash che il manifest dichiara, gli stessi che `expo-updates` controlla prima di eseguire il bundle.
- **Per chi pubblica dopo**:
  - **`eas update:list` vuole `node_modules` nella cartella da cui si lancia**: dalla radice del repository, che non li ha, esce con «Failed to resolve plugin for module "expo-router"». Si lancia dall'albero del 3.1.1 dopo `npm ci`.
  - Il resto è come nella 213: `eas-cli` 27.7.2 fuori dal repository, `--environment production`, `npm ci` suo per il 3.0.0 e `cp -al` di `node_modules` per il 3.1.0, i testi non ASCII cercati in UTF-16LE sui byte grezzi.
- **Non verificato**: **su un telefono vero** (l'OTA si scarica al primo avvio e si vede al secondo). Che un Android fino alla 12 col permesso già concesso, o un iPhone dopo uscita e rientro, si iscriva da solo non l'ho visto: ho controllato il commit, il tipo e il marcatore nei bundle. Non ho contato sul server se dopo l'OTA i dispositivi con push salgono. **Il web** (`app.athlonroma.it`) non fa parte di questa OTA: segue il deploy di `main`, che non ho controllato. Non ho rifatto le prove di `scripts/` (il commit non ne tocca).
