# QR di accesso al club dall'app: fattibile, da riprendere

Stato al 17/10/2026: **provato, non implementato.** Nessun codice del portale cambia. Questo file serve a riprendere il lavoro senza rifare la verifica.

## Esito della prova

L'API di PerfectGym genera il QR: `POST /v2.2/AccessControl/GenerateQrCode` con `{ memberId, clubId: 1, deviceIdentifier }`.

Provato dal server (edge function temporanea, già neutralizzata) su un socio con abbonamento attivo, tre chiamate a 5 secondi l'una dall'altra:

| cosa | risultato |
| --- | --- |
| esito | 200 a tutte e tre, in 150–280 ms |
| risposta | solo `qrCode` e `validUntilUtc` |
| formato `qrCode` | stringa di testo di circa 40 caratteri, `qr_` + esadecimale. Non è immagine né link: il QR lo disegna il client |
| validità | **15 minuti** (`validUntilUtc` = adesso + 900 s), a ogni chiamata |
| ogni chiamata | restituisce un codice diverso |
| membro senza contratto "attivo" per PerfectGym | `499 NoActiveContract` (successo col socio 3309, errore col 4782, che ha solo contratti da dipendente: causa non verificata) |

Ogni generazione scrive una riga `QrCodeAccess` nel registro accessi del socio. Le tre chiamate di prova sono sul socio 3309, dispositivo `prova-claude-17-10-2026`.

## Perché è fattibile anche come PWA

- La chiamata sta lato server: le credenziali PerfectGym non possono stare nel browser. Serve una edge function nuova (nome previsto `portale-lab-qr`), con le stesse protezioni delle altre `portale-lab-*`: JWT del portale, `member_id` ricavato lato server, gating tester, vista cliente in sola lettura (**non deve generare QR** quando guarda un cliente per conto suo).
- Il QR si disegna sul telefono dalla stringa ricevuta (libreria client leggera, nessun servizio esterno).
- Su web l'apertura è immediata, senza passare dagli store. Su iOS lo schermo può spegnersi: serve il wake lock, che non è garantito ovunque; la luminosità non si controlla da una PWA, nell'app nativa sì.

## Decisioni aperte

1. **Rinnovo del codice.** Richiesta del club: refresh ogni 5 secondi. PerfectGym non lo impone, perché il codice vale 15 minuti. Con 12 chiamate al minuto per ogni QR aperto, il registro accessi si riempie di righe `QrCodeAccess`.
   Da verificare con le API: se generare un codice nuovo invalida il precedente. Se sì, la rotazione ogni 5 secondi rende inutile uno screenshot. Se no, uno screenshot vale fino a 15 minuti e il refresh veloce serve a poco. Alternativa: rigenerare solo a ogni apertura della schermata, o ogni pochi minuti.
2. **Il tornello legge questi codici?** Non provato. Serve una prova fisica con un telefono davanti al lettore e conferma di PerfectGym che `qr_…` è il formato atteso.
3. **Dove sta nell'app.** Da decidere: scheda in basso, pulsante in home, o dentro la scheda abbonamento.
4. **Chi può generarlo.** Solo soci con contratto attivo. Per gli altri (`NoActiveContract`) la schermata deve dire in chiaro che serve un abbonamento attivo, senza mostrare l'errore grezzo.

## Come si riprende

1. Chiedere a PerfectGym (o provare) se un nuovo `GenerateQrCode` invalida il precedente, e `GetMemberIdFromQrCode` per capire cosa fa il lettore col codice.
2. Prova al tornello con un telefono.
3. Edge function `portale-lab-qr` (`verify_jwt` come le altre, voce in `supabase/config.toml`, CORS da `_shared/sito.ts`) + schermata nel portale.
4. Limitare le chiamate: rinnovo solo a schermata aperta e visibile, nessuna chiamata in background, tetto di richieste al minuto per socio.

## Pulizia ancora da fare a mano

La funzione `perfectgym-qr-prova` è ancora sul progetto Supabase `kdbcwwpdazvtmjolybdm`: risponde `410` e non fa nulla, ma non ho modo di cancellarla. Va eliminata dalla dashboard (Edge Functions).
