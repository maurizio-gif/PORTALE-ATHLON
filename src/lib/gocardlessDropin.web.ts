import { t } from '@/lib/lingua'

// Il Drop-in di GoCardless sul web (12/11/2026): la stessa pagina del mandato SEPA (il Billing Request Flow che il server crea per il contratto)
// si apre in un riquadro sopra l'app, senza cambiare pagina. Lo script lo ospita GoCardless (la versione `v2` e' quella delle sue librerie
// ufficiali, `@gocardless/react-dropin`); non ha un hash fisso da controllare come quello di Adyen, perche' GoCardless lo aggiorna sotto lo
// stesso indirizzo. Nell'app installata c'e' `gocardlessDropin.ts`, che risponde `non_disponibile`: li' la pagina si apre nel browser integrato.
//
// L'esito del browser non decide niente: a mandato firmato il server lo vede da solo (al ritorno, `esito`, e dal webhook), e crea il primo
// addebito. Qui serve solo a sapere se far vedere la schermata dell'esito o dire «non hai completato».

const SCRIPT = 'https://pay.gocardless.com/billing/static/dropin/v2/initialise.js'

type Gestore = { open: () => void; exit: () => void }
type GoCardlessDropin = {
  create: (opzioni: {
    billingRequestFlowID: string
    environment: 'live' | 'sandbox'
    onSuccess: (billingRequest: unknown, billingRequestFlow: unknown) => void
    onExit: (errore: object | null, metadata: object) => void
  }) => Gestore
}

export type EsitoDropin = 'firmato' | 'uscito' | 'errore' | 'non_disponibile'

export const dropinDisponibile = true

let caricamento: Promise<GoCardlessDropin> | null = null

function caricaScript(): Promise<GoCardlessDropin> {
  const w = window as unknown as { GoCardlessDropin?: GoCardlessDropin }
  if (w.GoCardlessDropin) return Promise.resolve(w.GoCardlessDropin)
  if (caricamento) return caricamento
  caricamento = new Promise<GoCardlessDropin>((risolvi, rifiuta) => {
    const js = document.createElement('script')
    js.src = SCRIPT
    js.async = true
    js.onload = () => (w.GoCardlessDropin ? risolvi(w.GoCardlessDropin) : rifiuta(new Error('GoCardlessDropin assente')))
    js.onerror = () => rifiuta(new Error('script di GoCardless non scaricato'))
    document.head.appendChild(js)
  }).catch((e) => {
    caricamento = null
    throw e
  })
  return caricamento
}

/**
 * Apre la pagina del mandato nel riquadro di GoCardless e aspetta che la persona finisca (`firmato`) o chiuda (`uscito`). `errore`: lo script non
 * si e' caricato o il riquadro non si e' aperto; chi chiama apre allora la pagina come prima (`url`). Il riquadro sta sopra tutta la pagina e si
 * chiude da solo alla fine.
 */
export async function apriDropin(flusso: string): Promise<EsitoDropin> {
  if (!/^BRF[0-9A-Z]+$/.test(flusso)) return 'errore'
  let gc: GoCardlessDropin
  try {
    gc = await caricaScript()
  } catch (e) {
    console.error('gocardlessDropin:', e instanceof Error ? e.message : e)
    return 'errore'
  }
  return await new Promise<EsitoDropin>((risolvi) => {
    let finito = false
    const fine = (esito: EsitoDropin) => {
      if (finito) return
      finito = true
      risolvi(esito)
    }
    try {
      const gestore = gc.create({
        billingRequestFlowID: flusso,
        environment: 'live',
        onSuccess: () => fine('firmato'),
        onExit: (errore) => {
          if (errore) console.error('gocardlessDropin: uscita con errore', errore)
          fine(errore ? 'errore' : 'uscito')
        },
      })
      gestore.open()
    } catch (e) {
      console.error('gocardlessDropin: riquadro non aperto', e instanceof Error ? e.message : e)
      fine('errore')
    }
  })
}

/** Il testo che accompagna il riquadro, nella schermata sotto, mentre e' aperto. */
export const testoInAttesa = () => t('Completa l’autorizzazione nel riquadro di GoCardless.', 'Complete the authorisation in the GoCardless window.')
