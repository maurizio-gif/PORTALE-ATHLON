## Recover: il sonno in una carta chiusa, con dentro inserimento, ultima notte e ultimi sette giorni (01/11/2026)

Richiesta di Maurizio. In Recover (`fit/Relax.tsx`, `?area=relax`) il sonno non è più una fila di carte separate (check-in, notte, suggerimento,
sette giorni) sopra la mobilità: è **una sola carta «Sonno», chiusa all'apertura della schermata** (`CartaSonno` in `Relax.tsx`). Chiusa mostra
solo il titolo e una riga: l'ultima notte («Questa notte: 6 h 40») o, se non c'è, «Scrivi come hai dormito: conta nel tuo Athlon Health Score».

- **Aperta, in quest'ordine**: (1) il sonno scritto a mano, cioè il check-in di sempre (`CheckInSonno`, ora con `dentro` per stare dentro un'altra
  carta senza la sua), e sotto, **solo per chi non ha collegato niente**, il suggerimento di collegare Apple Salute o Health Connect con «Come
  si fa» (porta a `/allenamento/dispositivi`); (2) **«L'ultima notte registrata»** con l'anello (dispositivo o scritta a mano), o una frase se non
  c'è niente; (3) **«Gli ultimi sette giorni»** con le colonne (da 0 a 10 ore, come prima), o una frase se non ci sono ancora notti; (4) l'avviso
  «valori indicativi, non un parere medico» e i comandi «Aggiorna» (sul telefono) e «I dispositivi».
- **Sempre chiusa all'apertura**, a ogni visita: lo stato non si ricorda. Chi arriva da un invito a scrivere il sonno trova la carta chiusa e la apre
  con un tocco (nessun collegamento della Home o del punteggio apriva il check-in da sé: portano all'area).
- **Fuori dalla carta restano** la sessione di mobilità, il Foam roller e, dal 01/11/2026, il Respiro (sezione 84), ognuno con la sua carta, sotto il sonno. Il resto del comportamento (la notte scritta a mano
  che cede al dato del dispositivo, la durata calcolata dalle due ore, le sette notti tra cui scegliere) è quello del check-in, invariato.
- **Verifica**: `tsc` pulito; guardato nel browser a 390 px con dati finti (carta chiusa, aperta con cinque notti, aperta senza notti); **non
  guardato con dati veri né su un telefono**.
