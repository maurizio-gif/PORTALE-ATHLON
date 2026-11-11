// Google Pay in prova sulle anteprime di Vercel (11/11/2026). Modulo puro, senza React: lo importa `features/lab/adyen.web.tsx`, e si prova con
// `scripts/prova-google-pay.ts`.
//
// **Perche' esiste.** Per avere l'accesso alla produzione Google chiede le schermate del flusso di acquisto con Google Pay, fatte con l'ambiente **TEST** (checklist
// dell'integrazione web). Il conto Adyen del club e' solo live, e il Drop-in porta Google Pay in produzione quando l'ambiente e' live: la carta di prova di Google
// non darebbe nemmeno il foglio di pagamento giusto. Sulle anteprime di Vercel Google Pay va invece in TEST, e **basta quello**: su `app.athlonroma.it` non cambia niente.
//
// **Perche' solo le anteprime.** Un token di prova non e' addebitabile: un cliente che toccasse il pulsante vedrebbe il pagamento fallire. Le anteprime stanno dietro
// l'accesso di Vercel e non le usa nessun cliente. Lo stesso modello di indirizzi che il server ammette per il ritorno (`lab-pagamenti`: `portale-athlon-<…>.vercel.app`),
// **senza** gli alias del ramo `main` (`portale-athlon-git-main-…`), che potrebbero essere condivisi.
const ANTEPRIMA = /^portale-athlon-(?!git-main[-.])[a-z0-9-]+\.vercel\.app$/

/** Questa pagina e' un'anteprima di Vercel? Si guarda solo l'indirizzo (`window.location.hostname`): nessun parametro che si possa dimenticare o inserire. */
export function googlePayInProva(hostname: string | null | undefined): boolean {
  return typeof hostname === 'string' && ANTEPRIMA.test(hostname.trim().toLowerCase())
}
