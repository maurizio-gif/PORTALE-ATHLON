# L'assistente che propone una prenotazione: cosa serve lato server

Lato app (PORTALE-ATHLON, 30/10/2026) è fatto: `assistente/prenotaDaChat.ts` (puro), `assistente/PrenotaDaChat.tsx` e il ramo in `FoglioAssistente.tsx`.
**Lato server non è fatto**: `portale-lab-assistente` (APP-ATHLON) non manda ancora questo tipo di pulsante, quindi **oggi la funzione è inerte** (l'app ignora ciò che non conosce, niente si rompe).

## Il contratto

Dentro `azioni` della risposta (evento `fine`, e nel `sostituisci`), un elemento in più:

```json
{ "destinazione": "prenota-lezione", "parametri": { "class_id": "555", "giorno": "2026-10-31", "member_id": "200" }, "etichetta": "Prenota Pilates Matwork · sab 18:30" }
```

- `class_id`: cifre, l'id della lezione su PerfectGym come lo dà il calendario (`Lezione.class_id`). `giorno`: `AAAA-MM-GG`, il giorno **a Roma** della lezione. `member_id`: facoltativo, cifre, una persona del nucleo.
  L'app scarta la proposta se `class_id` o `giorno` non hanno questa forma (`prenotaDaAzione`).
- **Non è una destinazione**: `prenota-lezione` **non** va nella mappa chiusa `_shared/assistente/mappa.ts` (l'app e la funzione confrontano quell'elenco: una chiave in più lo romperebbe). È un secondo tipo di azione.
- L'app, alla pressione, **non prenota**: apre una carta che rilegge la lezione dal calendario (`portale-lab-calendario`, azione `giorno` con `data` e `member_id`) e mostra gli stessi pulsanti del Calendario. Prenota solo chi tocca «Prenota» sulla carta (`prenota` con `class_id` e `member_id`): stesse regole, stesso limite per categoria, stessa lista d'attesa, stesso acquisto per le lezioni non comprese.

## Regole che deve far rispettare la funzione

1. **Mai inventare un id.** `class_id` deve venire da dati letti in quella richiesta (le lezioni del calendario o le consigliate), non dal testo del modello. Si valida in codice: la lezione esiste, `giorno` è la sua data a Roma, non è già cominciata, `member_id` (se c'è) è del nucleo del titolare. Se un controllo non regge, **l'azione si toglie** (e la risposta resta solo testo).
2. **L'etichetta la scrive il codice**, non il modello: «Prenota {nome} · {giorno breve} {ora}» dai dati della lezione (nome e orario veri). L'app mostra l'etichetta così com'è.
3. **Al massimo una proposta per risposta** (più lezioni = una domanda alla persona), e solo quando la persona chiede di prenotare. Il testo deve dire che è una proposta («Ti propongo… confermi tu»), mai che è fatto.
4. **Lo staff in vista cliente non la vede** (l'assistente è già chiuso lì: 403).
5. **Il tocco si segna**: l'app chiama `toccato` con `destinazione: 'prenota-lezione'` (come per gli altri pulsanti); il registro del CRM deve accettare questo valore (non è nella mappa).
6. **Privacy**: nessun dato in più nelle richieste dell'app; la carta legge il calendario con la sessione della persona.

## Cosa non è provato

Nessuna risposta vera del modello con questa azione (la funzione non la manda). Lato app è provato con funzioni simulate (vedi `CLAUDE.md`, «L'assistente propone una prenotazione»).
