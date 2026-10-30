# Ritiro degli ordini dello shop con il QR: cosa serve nel CRM

Lato app (PORTALE-ATHLON, 30/10/2026) è fatto: l'ordine **pagato e non ancora ritirato** mostra un QR e un codice breve, in `shop/CodiceRitiro.tsx` (esito del pagamento e «I miei ordini»).
**Nel CRM (APP-ATHLON) non è stato toccato niente**: finché la segreteria non può cercare un ordine con questo codice, il QR è solo un modo di mostrare l'ordine.

## Cosa c'è nel QR

- Il testo `ATHLON-ORDINE:<ordine_id>` (`shop/ritiro.ts`, `PREFISSO_RITIRO`), e basta: niente nome, email o importo. `ordine_id` è l'identificativo di `portale-lab-shop` (UUID).
- Sotto, il **codice breve**: le prime otto lettere/cifre di `ordine_id`, senza trattini, in maiuscolo (`codiceBreve`), da dettare se il lettore non legge.

## Cosa serve nel CRM (Segreteria → Shop → «Da consegnare»)

1. **Un campo di ricerca che accetti il QR.** Un lettore USB/Bluetooth scrive il testo e preme Invio: il campo deve togliere il prefisso `ATHLON-ORDINE:` e cercare per `ordine_id`.
2. **Ricerca per codice breve**: gli ordini il cui `ordine_id` senza trattini, maiuscolo, comincia con le otto lettere. Con più risultati (improbabile, 32 bit) si mostrano tutti.
3. **Il QR non è una chiave.** Chi lo legge trova l'ordine e **vede cosa consegnare**; consegnare resta un gesto della segreteria («Segna consegnato»), come oggi. Un ordine già `consegnato_il` si mostra come già ritirato (e l'app, rileggendo, toglie il QR da sola).
4. Facoltativo: scansione con la fotocamera dal CRM (una libreria di lettura QR nel browser). Non è necessaria col lettore.

## Cosa non è provato

Il QR è stato decodificato con un lettore software (jsQR) dallo screenshot del browser, in chiaro e scuro; **non** con un lettore da banco né con la fotocamera di un telefono, e nessuna ricerca nel CRM è stata provata.
