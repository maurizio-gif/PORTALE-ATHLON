import type { AllenamentoDispositivo, GiornoDispositivo } from '../../../api/dispositivi'
import { eDaSalute, giornoDi } from '../dispositivi/comune'
import { lunediDi, spostaGiorno } from '../schede/contatoreCalorie'
import { MINUTI_GIORNO_ATTIVO, nottiDa } from './calcoloPunteggio'

// Le abitudini che si spuntano da sole (31/10/2026, richiesta di Maurizio: «agganciare le abitudini il piu' possibile a quello che
// ci puo' dare Apple Health» e lo stesso per Google Salute / Health Connect). Funzione **pura** dei dati che Fit e Recover gia' leggono
// (`useDispositivi`): niente rete, niente salvataggio, niente da compilare. **Tre abitudini, tutte automatiche**: camminare, muoversi
// e dormire, ognuna col suo ritmo settimanale.
//
// Le regole, perche' stanno qui e non nel disegno:
//  - **Un giorno senza dati non e' un giorno saltato** (il Watch era in carica, il telefono spento): resta «senza dato», non spezza
//    la serie e non conta contro. Solo dove c'e' un dato sotto soglia il giorno e' «no».
//  - **Oggi non e' finito**: se la soglia non e' ancora raggiunta il giorno e' «in corso», mai «no».
//  - **Il ritmo e' settimanale** (lunedi'-domenica), come il punteggio: «5 giorni su 7», non «ogni giorno». Una settimana storta non
//    azzera niente: la serie conta le **settimane di fila nel ritmo**, e una settimana senza nessun dato e' neutra (la salta).
//  - **Descrive, non giudica**: nessun confronto con altri soci, nessun punto, nessuna classifica. Le abitudini **non entrano nel
//    punteggio ne' nei livelli** (non e' stato chiesto, e dipendono da dati che si danno con un consenso).
// Le soglie sono nostre (6.000 passi, 20 minuti, 7 ore, 5/3/5 giorni a settimana) e vanno fatte validare dal Direttore Tecnico: i 20
// minuti e le 7 ore sono quelle del punteggio, per non dire due cose diverse sulla stessa persona.

export type IdAbitudine = 'passi' | 'movimento' | 'sonno'
export type StatoGiorno = 'fatto' | 'no' | 'senza-dato' | 'in-corso' | 'futuro'

export const SOGLIA_PASSI = 6000
export const SOGLIA_SONNO_MINUTI = 420
export const GIORNI_VISTI = 28

type Definizione = { id: IdAbitudine; pilastro: 'train' | 'recover'; soglia: number; obiettivo: number }
/** `obiettivo`: i giorni della settimana in cui la soglia va raggiunta perche' la settimana sia «nel ritmo». */
export const DEFINIZIONI: readonly Definizione[] = [
  { id: 'passi', pilastro: 'train', soglia: SOGLIA_PASSI, obiettivo: 5 },
  { id: 'movimento', pilastro: 'train', soglia: MINUTI_GIORNO_ATTIVO, obiettivo: 3 },
  { id: 'sonno', pilastro: 'recover', soglia: SOGLIA_SONNO_MINUTI, obiettivo: 5 },
]

export type GiornoAbitudine = { data: string; stato: StatoGiorno; valore: number | null }

export type Abitudine = {
  id: IdAbitudine
  pilastro: 'train' | 'recover'
  soglia: number
  obiettivo: number
  /** Giorni di questa settimana (lunedi'-oggi) in cui la soglia e' stata raggiunta. */
  fatti: number
  /** La settimana e' gia' nel ritmo: `fatti >= obiettivo`. */
  inRitmo: boolean
  /** Si puo' ancora arrivarci: `fatti` piu' oggi (se e' in corso) e i giorni che restano bastano all'obiettivo. */
  raggiungibile: boolean
  /** Settimane di fila nel ritmo (la corrente conta solo se gia' nel ritmo); una settimana senza dati si salta. */
  serie: number
  /** L'ultimo valore ricevuto (non oltre oggi) e il suo giorno, per dire «ieri: 7.200 passi». */
  ultimo: { data: string; valore: number } | null
  /** Gli ultimi `GIORNI_VISTI` giorni, dal piu' vecchio a oggi. */
  giorni: GiornoAbitudine[]
  /** C'e' almeno un dato in questi giorni: senza, la carta dice che non e' ancora arrivato niente. */
  conDati: boolean
}

type Valori = Map<string, number>

/** I passi di ogni giorno: con due righe per lo stesso giorno (due app) vale il valore piu' alto, non la somma. */
function passiDa(giorni: GiornoDispositivo[]): Valori {
  const m: Valori = new Map()
  for (const g of giorni) if (g.passi !== null) m.set(g.data, Math.max(m.get(g.data) ?? 0, g.passi))
  return m
}

/** I minuti di allenamento di ogni giorno (a Roma), da tutti gli allenamenti: del dispositivo e scritti a mano. */
function minutiDa(allenamenti: AllenamentoDispositivo[]): Valori {
  const m: Valori = new Map()
  for (const a of allenamenti) {
    const g = giornoDi(a.inizio)
    m.set(g, (m.get(g) ?? 0) + a.durata_minuti)
  }
  return m
}

/** I giorni per cui il telefono ha mandato qualcosa (qualunque dato): per un allenamento, «nessun allenamento» vale «no» solo dove si sa che il telefono parlava. */
function giorniConDati(giorni: GiornoDispositivo[], allenamenti: AllenamentoDispositivo[]): Set<string> {
  const s = new Set<string>()
  for (const g of giorni) if (eDaSalute(g.fornitore)) s.add(g.data)
  for (const a of allenamenti) if (eDaSalute(a.fornitore)) s.add(giornoDi(a.inizio))
  return s
}

export function statoDelGiorno(giorno: string, oggi: string, valore: number | null, soglia: number, telefonoParlava: boolean): StatoGiorno {
  if (giorno > oggi) return 'futuro'
  if (valore !== null && valore >= soglia) return 'fatto'
  if (giorno === oggi) return 'in-corso'
  if (valore !== null) return 'no'
  // Nessun valore: e' «no» solo per l'allenamento dei giorni in cui il telefono ha mandato altro (`telefonoParlava`).
  return telefonoParlava ? 'no' : 'senza-dato'
}

/** Il lunedi' e la domenica della settimana che contiene `giorno`. */
const settimanaDi = (giorno: string): { da: string; a: string } => {
  const da = lunediDi(giorno)
  return { da, a: spostaGiorno(da, 6) }
}

export function calcolaAbitudini(dati: { giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] }, oggi: string): Abitudine[] {
  const valori: Record<IdAbitudine, Valori> = {
    passi: passiDa(dati.giorni),
    movimento: minutiDa(dati.allenamenti),
    sonno: nottiDa(dati.giorni),
  }
  const parlava = giorniConDati(dati.giorni, dati.allenamenti)
  const inizio = spostaGiorno(oggi, -(GIORNI_VISTI - 1))
  const { da: lunedi } = settimanaDi(oggi)

  return DEFINIZIONI.map((def) => {
    const v = valori[def.id]
    // Solo per il movimento «nessun allenamento» e' un «no» (per passi e sonno un giorno vuoto e' un giorno senza dato).
    const nonRegistrato = (g: string) => def.id === 'movimento' && parlava.has(g)
    const stato = (g: string) => statoDelGiorno(g, oggi, v.get(g) ?? null, def.soglia, nonRegistrato(g))

    const giorni: GiornoAbitudine[] = []
    for (let g = inizio; g <= oggi; g = spostaGiorno(g, 1)) giorni.push({ data: g, stato: stato(g), valore: v.get(g) ?? null })

    // La settimana in corso.
    let fatti = 0
    let inCorso = 0
    let dopoOggi = 0
    for (let g = lunedi; g <= spostaGiorno(lunedi, 6); g = spostaGiorno(g, 1)) {
      const s = stato(g)
      if (s === 'fatto') fatti++
      else if (s === 'in-corso') inCorso++
      else if (s === 'futuro') dopoOggi++
    }
    const inRitmo = fatti >= def.obiettivo

    // Le settimane concluse, dalla piu' recente: nel ritmo, sotto, o senza nessun dato (neutra: si salta).
    let serie = inRitmo ? 1 : 0
    for (let l = spostaGiorno(lunedi, -7), n = 0; n < 12; l = spostaGiorno(l, -7), n++) {
      let f = 0
      let conDato = false
      for (let g = l; g <= spostaGiorno(l, 6); g = spostaGiorno(g, 1)) {
        if (v.has(g) || nonRegistrato(g)) conDato = true
        if (stato(g) === 'fatto') f++
      }
      if (!conDato) continue
      if (f >= def.obiettivo) serie++
      else break
    }

    const noti = [...v].filter(([g]) => g <= oggi).sort((a, b) => b[0].localeCompare(a[0]))
    return {
      id: def.id,
      pilastro: def.pilastro,
      soglia: def.soglia,
      obiettivo: def.obiettivo,
      fatti,
      inRitmo,
      raggiungibile: inRitmo || fatti + inCorso + dopoOggi >= def.obiettivo,
      serie,
      ultimo: noti[0] ? { data: noti[0][0], valore: noti[0][1] } : null,
      giorni,
      conDati: giorni.some((x) => x.valore !== null),
    }
  })
}

// ---------------------------------------------------------------------------------------------------------------------------------
// A che punto e' il collegamento: decide cosa mostra la carta delle abitudini (31/10/2026, richiesta di Maurizio).
//  - **Collegato** (il club ha ricevuto dati da Apple Salute o da Health Connect, da qualunque dispositivo, anche dalla PWA che li
//    legge dal server): si mostrano i risultati.
//  - **Da collegare** (app nativa con un'app Salute, non ancora attivata) e **senza dati** (attiva, ma non e' arrivato niente).
//  - **Da installare** (la PWA, o il browser, dove HealthKit e Health Connect non esistono): si spinge a installare l'app e a collegare.
//  - **Niente** dove non c'e' modo di averli (un telefono nativo senza app Salute).
// Funzione pura: chi la chiama dice che telefono e', se l'attivazione c'e' e quali dati sono arrivati.

export type StatoCollegamento = 'collegato' | 'da-collegare' | 'senza-dati' | 'da-installare' | 'niente'

export function haDatiDaSalute(dati: { giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] } | null | undefined): boolean {
  return !!dati && (dati.giorni.some((g) => eDaSalute(g.fornitore)) || dati.allenamenti.some((a) => eDaSalute(a.fornitore)))
}

export function statoCollegamento(args: {
  /** Dove gira: `web` (browser o PWA) o un telefono nativo. */
  piattaforma: 'web' | 'ios' | 'android'
  /** L'app Salute del telefono nativo (`appSaluteDelTelefono()`); null sul web. */
  appSalute: 'apple' | 'google' | null
  /** La persona l'ha attivata su questo telefono. */
  attivo: boolean
  dati: { giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] } | null | undefined
}): StatoCollegamento {
  if (haDatiDaSalute(args.dati)) return 'collegato'
  if (args.piattaforma === 'web') return 'da-installare'
  if (!args.appSalute) return 'niente'
  return args.attivo ? 'senza-dati' : 'da-collegare'
}
