## Il Guest Pass si paga solo con la carta quando nasce sul nostro motore (13/11/2026)

Prima tappa del Guest Pass fuori da PerfectGym (nota 275 di APP-ATHLON, migrazione `20261113q`, funzione `guest-pass`). Quando l'interruttore `guest_pass` è acceso il contratto nasce da noi e si paga sulla pagina di Adyen: niente conto corrente e niente metodi salvati su PerfectGym.

**Nell'app cambia una cosa sola**: la risposta `pagina` porta `solo_carta` (`PaginaGuestPass` in `src/lib/guestPass.ts`), e con quella `AttivaGuestPass.tsx` non mostra la scheda «Conto corrente (addebito SEPA)». I metodi salvati arrivano già vuoti dal server. Con l'interruttore spento (com'è oggi) `solo_carta` è falso e la pagina è quella di sempre.

Una versione dell'app senza questa modifica mostra ancora il conto: se la persona lo sceglie, il server risponde «Il Guest Pass si paga con la carta». `tsc` pulito; **non guardato in un browser né su un telefono**.
