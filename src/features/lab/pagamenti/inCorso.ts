import type { Movimento } from '@/api/lab'

// I pagamenti «in corso» che la sezione Pagamenti della Home mette in vista (05/11/2026, richiesta di Maurizio): un addebito SEPA
// che la banca non ha ancora confermato — le gare del Trofeo Athlon, ma anche un SEPA di PerfectGym — e che per giorni non è
// né pagato né da pagare. Prima stava solo nello storico, con una clessidra fra i pagamenti effettuati.
//
// **Non è `inCorsoFrase`.** Quella è il blocco di PerfectGym: una quota scaduta con un pagamento già partito, per non pagarla
// due volte, e si legge solo dentro «Da pagare». Questo elenco è il racconto di ciò che sta succedendo ai soldi, e non blocca
// niente: un SEPA di una gara non ha una quota da saldare.
//
// **Quali sono.** Le righe dello storico con esito `in_corso`, ma solo quelle che possono davvero essere in corso: un SEPA delle
// gare porta il giorno dell'addebito in `scadenza` (il server lo mette nelle righe che la banca non ha ancora chiuso), e per le
// altre si guarda la data. Un pagamento di PerfectGym fermo in «in corso» da più di un mese non sta più aspettando la banca: è un
// dato rimasto indietro, e metterlo in vetrina direbbe al socio una cosa falsa. Resta nello storico come prima.

/** Oltre questi giorni un pagamento senza giorno d'addebito non si considera più in corso. */
export const GIORNI_IN_CORSO = 30

const GIORNO = 24 * 60 * 60 * 1000

export function eInCorso(m: Movimento, adesso: number = Date.now()): boolean {
  if (m.esito !== 'in_corso') return false
  if (m.scadenza) return true
  const quando = m.data ? Date.parse(m.data) : NaN
  return Number.isFinite(quando) && adesso - quando <= GIORNI_IN_CORSO * GIORNO
}

/** I pagamenti in corso, dal più vicino all'addebito (o, senza giorno, dal più recente). */
export function pagamentiInCorso(storico: Movimento[], adesso: number = Date.now()): Movimento[] {
  return storico
    .filter((m) => eInCorso(m, adesso))
    .sort((a, b) => {
      const da = a.scadenza ?? ''
      const db = b.scadenza ?? ''
      if (da && db) return da < db ? -1 : da > db ? 1 : 0
      if (da || db) return da ? -1 : 1
      return (b.data ? Date.parse(b.data) : 0) - (a.data ? Date.parse(a.data) : 0)
    })
}

/** Lo storico senza i pagamenti in corso: sono già nel loro riquadro, e fra gli «effettuati» ci vanno quando la banca li conferma. */
export function senzaInCorso(storico: Movimento[], adesso: number = Date.now()): Movimento[] {
  return storico.filter((m) => !eInCorso(m, adesso))
}
