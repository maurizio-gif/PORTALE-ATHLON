import type { GiornoSettimana, Tappa } from '@/api/percorso'

import { minutiDaOra, NOME_GIORNO, oraDaMinuti, titoloTappa } from './comune'

// Il controllo di un percorso modificato a mano (20/10/2026), nell'editor. **E' lo specchio di `validaRisposta`
// di portale-lab-percorso** (APP-ATHLON, `_shared/percorso/validazione.ts`): la funzione, al salvataggio, applica
// le stesse regole e rifiuta tutto se una tappa non regge; qui si dicono le stesse cose prima, sulla tappa
// giusta e con le parole giuste, cosi' il socio non scopre un «422» dopo aver cambiato dieci cose. **Il server
// resta l'autorita'**: se le due copie divergono, vince lui, e il socio legge il suo errore. Chi cambia una regola
// la cambia nei due posti.
//
// Le regole: niente si sovrappone (lezione e' a ora fissa, poi la sala, poi il cardio); sala e cardio stanno
// dentro l'orario in cui la sala e' aperta; al massimo quattro tappe e tre ore al giorno, diciotto tappe a
// settimana, sei giorni (c'e' sempre un giorno di riposo); un giorno di solo cardio non e' un giorno di percorso.

/** L'orario in cui la sala e' aperta (Gym Floor), per giorno della settimana, in minuti dalla mezzanotte. Da `gymFloor.hours` del sito. */
export const ORARI_SALA: Record<GiornoSettimana, [number, number]> = {
  1: [6 * 60, 22 * 60],
  2: [6 * 60, 22 * 60],
  3: [6 * 60, 22 * 60],
  4: [6 * 60, 22 * 60],
  5: [6 * 60, 22 * 60],
  6: [8 * 60, 20 * 60],
  7: [9 * 60, 18 * 60],
}

export const TETTI = { tappeGiorno: 4, minutiGiorno: 180, tappeSettimana: 18, giorni: 6, pausa: 10, minutiCardio: [5, 60], minutiSala: [20, 120] } as const

const PRIORITA: Record<Tappa['tipo'], number> = { lezione: 0, sala: 1, cardio: 2 }

const intervallo = (t: Tappa): [number, number] | null => {
  const da = minutiDaOra(t.ora)
  return da === null ? null : [da, da + t.minuti]
}

/** Due tappe dello stesso giorno si sovrappongono se i loro intervalli si toccano dentro. */
export function siSovrappongono(a: Tappa, b: Tappa): boolean {
  if (a.giorno !== b.giorno) return false
  const x = intervallo(a)
  const y = intervallo(b)
  return !!x && !!y && x[0] < y[1] && y[0] < x[1]
}

/**
 * Le ore delle tappe agganciate («prima» o «dopo» un'altra del giorno) rifatte come le rifa il server: dieci
 * minuti di pausa fra le due. Si fa in due passate, perche' il cardio puo' agganciarsi a una sala che a sua
 * volta si aggancia a una lezione.
 */
export function ricalcolaAncorate(tappe: Tappa[]): Tappa[] {
  let corrente = tappe
  for (let passata = 0; passata < 2; passata++) {
    corrente = corrente.map((t) => {
      if (t.ancora == null || !t.posizione || t.tipo === 'lezione') return t
      const a = corrente.find((x) => x.giorno === t.giorno && x.ordine === t.ancora && x !== t && x.tipo !== 'cardio')
      const ia = a ? intervallo(a) : null
      if (!a || !ia) return t
      const inizio = t.posizione === 'dopo' ? ia[1] + TETTI.pausa : ia[0] - TETTI.pausa - t.minuti
      return { ...t, ora: oraDaMinuti(inizio) }
    })
  }
  return corrente
}

/** Cosa non regge in un percorso, in parole per il socio. Vuoto = si puo' salvare. */
export function controllaTappe(tappe: Tappa[]): string[] {
  const problemi: string[] = []
  const nome = (t: Tappa) => `${titoloTappa(t)} di ${NOME_GIORNO[t.giorno].toLowerCase()}`

  if (tappe.length === 0) return ['Il percorso non ha tappe.']
  if (tappe.length > TETTI.tappeSettimana) problemi.push(`Troppe tappe: al massimo ${TETTI.tappeSettimana} a settimana.`)

  const giorni = new Set(tappe.map((t) => t.giorno))
  if (giorni.size > TETTI.giorni) problemi.push('Ti serve almeno un giorno di riposo: al massimo sei giorni di allenamento.')

  for (const g of giorni) {
    const delGiorno = tappe.filter((t) => t.giorno === g)
    const nomeGiorno = NOME_GIORNO[g].toLowerCase()
    if (delGiorno.length > TETTI.tappeGiorno) problemi.push(`${NOME_GIORNO[g]}: al massimo ${TETTI.tappeGiorno} tappe in un giorno.`)
    if (delGiorno.reduce((s, t) => s + t.minuti, 0) > TETTI.minutiGiorno) problemi.push(`${NOME_GIORNO[g]}: al massimo ${TETTI.minutiGiorno / 60} ore in un giorno.`)
    if (!delGiorno.some((t) => t.tipo !== 'cardio')) problemi.push(`${NOME_GIORNO[g]}: il cardio da solo non basta, aggiungi una lezione o la sala (o togli il cardio).`)
    const [apre, chiude] = ORARI_SALA[g]
    for (const t of delGiorno) {
      const i = intervallo(t)
      if (!i) {
        problemi.push(`${nome(t)}: manca l’orario.`)
        continue
      }
      if (t.tipo !== 'lezione' && (i[0] < apre || i[1] > chiude)) problemi.push(`${titoloTappa(t)} di ${nomeGiorno}: fuori dall’orario della sala (${oraDaMinuti(apre)}–${oraDaMinuti(chiude)}).`)
      if (t.tipo === 'sala' && (t.minuti < TETTI.minutiSala[0] || t.minuti > TETTI.minutiSala[1])) problemi.push(`${nome(t)}: da ${TETTI.minutiSala[0]} a ${TETTI.minutiSala[1]} minuti.`)
      if (t.tipo === 'cardio' && (t.minuti < TETTI.minutiCardio[0] || t.minuti > TETTI.minutiCardio[1])) problemi.push(`${nome(t)}: da ${TETTI.minutiCardio[0]} a ${TETTI.minutiCardio[1]} minuti.`)
    }
    // Le sovrapposizioni: una volta per coppia, e dicendo chi vince (la lezione ha l'ora fissa).
    const ordinate = [...delGiorno].sort((a, b) => PRIORITA[a.tipo] - PRIORITA[b.tipo])
    for (let i = 0; i < ordinate.length; i++)
      for (let j = i + 1; j < ordinate.length; j++)
        if (siSovrappongono(ordinate[i], ordinate[j])) problemi.push(`${NOME_GIORNO[g]}: ${titoloTappa(ordinate[j])} si sovrappone a ${titoloTappa(ordinate[i])}.`)
  }
  return [...new Set(problemi)]
}

/**
 * Cosa cambia in peggio aggiungendo (o cambiando) una tappa: i problemi che con lei ci sono e senza no. Un giorno
 * di solo cardio non e' un problema della tappa che si aggiunge (si puo' aggiungere la lezione subito dopo): si
 * dice quando si conferma il percorso.
 */
export function problemiDellaTappa(nuova: Tappa, altre: Tappa[]): string[] {
  const prima = new Set(controllaTappe(altre))
  return controllaTappe([...altre, nuova]).filter((p) => !prima.has(p) && !/il cardio da solo/.test(p))
}
