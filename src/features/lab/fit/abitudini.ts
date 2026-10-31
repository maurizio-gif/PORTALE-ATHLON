import type { AllenamentoDispositivo, GiornoDispositivo, RegistroAbitudine, SceltaAbitudine, TipoAbitudine } from '../../../api/dispositivi'
import { eDaSalute, giornoDi } from '../dispositivi/comune'
import { lunediDi, spostaGiorno } from '../schede/contatoreCalorie'
import { MINUTI_GIORNO_ATTIVO, nottiDa } from './calcoloPunteggio'
import { CATALOGO, coricamentoDaOra, DI_PARTENZA, sceltePredefinite, sogliaDelGiorno, statoSfida, type Pilastro, type StatoSfida } from './catalogoAbitudini'

// Le abitudini (31/10/2026, richiesta di Maurizio). Prima versione: tre abitudini che si spuntano da sole con i dati di Apple Salute e di
// Health Connect (camminare, muoversi, dormire). **Seconda versione (stesso giorno): le sceglie la persona** — fra dieci, con la sua soglia e i suoi
// giorni a settimana —, **puo' farne una sfida a obiettivo crescente** (la soglia sale ogni giorno per 30 giorni, da dove si parte a dove si vuole
// arrivare) e puo' **scrivere a mano** quelle che il telefono non misura (plank con il cronometro, squat e flessioni con il contatore). Le scelte stanno
// sul server, sotto il consenso dei dispositivi (`api/dispositivi.ts`). Funzione **pura** dei dati che Fit e Recover gia' leggono (`useDispositivi`) e di
// quelle scelte: niente rete, niente salvataggio. Senza nessuna scelta salvata valgono le tre di partenza, come prima.
//
// Le regole, perche' stanno qui e non nel disegno:
//  - **Un giorno senza dati non e' un giorno saltato** (il Watch era in carica, il telefono spento): resta «senza dato», non spezza
//    la serie e non conta contro. Solo dove c'e' un dato sotto soglia il giorno e' «no». Per l'allenamento e la meditazione «nessuna sessione»
//    vale «no» solo nei giorni in cui il telefono ha mandato altro; per quelle che si scrivono a mano, un giorno senza valore e' un «no» solo da
//    quando la si segue (prima non c'era).
//  - **Oggi non e' finito**: se la soglia non e' ancora raggiunta il giorno e' «in corso», mai «no».
//  - **Il ritmo e' settimanale** (lunedi'-domenica), come il punteggio: «5 giorni su 7», non «ogni giorno». Una settimana storta non
//    azzera niente: la serie conta le **settimane di fila nel ritmo**, e una settimana senza nessun dato e' neutra (la salta).
//  - **Nella sfida la soglia di ogni giorno e' quella di quel giorno** (`sogliaDelGiorno`): la storia non si riscrive con l'obiettivo di oggi.
//  - **Descrive, non giudica**: nessun confronto con altri soci, nessun punto, nessuna classifica. Le abitudini **non entrano nel
//    punteggio ne' nei livelli** (non e' stato chiesto, e dipendono da dati che si danno con un consenso).
// Le soglie di partenza sono nostre e vanno fatte validare dal Direttore Tecnico (vedi `catalogoAbitudini.ts`).

export type IdAbitudine = TipoAbitudine
export type StatoGiorno = 'fatto' | 'no' | 'senza-dato' | 'in-corso' | 'futuro'

export const SOGLIA_PASSI = CATALOGO.passi.predefinita.soglia
export const SOGLIA_SONNO_MINUTI = CATALOGO.sonno.predefinita.soglia
export const GIORNI_VISTI = 28

/** Le tre di partenza, come nella prima versione (soglia e ritmo di `catalogoAbitudini.ts`). */
export const DEFINIZIONI: readonly { id: IdAbitudine; pilastro: Pilastro; soglia: number; obiettivo: number }[] = DI_PARTENZA.map((id) => ({ id, pilastro: CATALOGO[id].pilastro, soglia: CATALOGO[id].predefinita.soglia, obiettivo: CATALOGO[id].predefinita.giorni }))

export type GiornoAbitudine = { data: string; stato: StatoGiorno; valore: number | null }

export type Abitudine = {
  id: IdAbitudine
  pilastro: Pilastro
  /** La soglia di oggi (nella sfida sale ogni giorno). */
  soglia: number
  /** I giorni della settimana in cui la soglia va raggiunta perche' la settimana sia «nel ritmo». */
  obiettivo: number
  /** Si scrive a mano (cronometro o contatore). */
  manuale: boolean
  /** Meglio sotto la soglia (l'orario in cui ci si corica). */
  inverso: boolean
  /** La sfida a obiettivo crescente, se c'e': a che giorno e' e dove arriva. */
  sfida: StatoSfida | null
  /** La scelta com'e' salvata sul server; null per una delle tre di partenza non ancora toccata. */
  scelta: SceltaAbitudine | null
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
  /** Il valore di oggi, se c'e' (per il contatore e per «oggi: 3.200 su 6.000»). */
  oggi: number | null
  /** Gli ultimi `GIORNI_VISTI` giorni, dal piu' vecchio a oggi. */
  giorni: GiornoAbitudine[]
  /** C'e' almeno un dato in questi giorni: senza, la carta dice che non e' ancora arrivato niente. */
  conDati: boolean
}

type Valori = Map<string, number>

/** Il valore piu' alto per giorno: con due righe per lo stesso giorno (due app) non si somma, vale il maggiore. */
function alto(giorni: GiornoDispositivo[], campo: (g: GiornoDispositivo) => number | null | undefined): Valori {
  const m: Valori = new Map()
  for (const g of giorni) {
    const v = campo(g)
    if (v !== null && v !== undefined) m.set(g.data, Math.max(m.get(g.data) ?? 0, v))
  }
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

/**
 * Quando ci si e' coricati, in minuti dopo le 18:00: dal telefono (`coricamento_min`) e, per le notti scritte a mano, dall'ora in cui si e' andati a dormire.
 * Per la stessa notte vale il dispositivo; se ci sono piu' righe del telefono, la piu' tarda (la piu' prudente).
 */
function coricamentiDa(giorni: GiornoDispositivo[]): Valori {
  const dispositivo: Valori = new Map()
  const manuale: Valori = new Map()
  for (const g of giorni) {
    if (g.fornitore === 'manuale') {
      const v = g.sonno_a_letto ? coricamentoDaOra(g.sonno_a_letto) : null
      if (v !== null) manuale.set(g.data, v)
    } else if (g.coricamento_min !== null && g.coricamento_min !== undefined) {
      dispositivo.set(g.data, Math.max(dispositivo.get(g.data) ?? 0, g.coricamento_min))
    }
  }
  for (const [d, v] of manuale) if (!dispositivo.has(d)) dispositivo.set(d, v)
  return dispositivo
}

/** I valori scritti a mano di un'abitudine, per giorno. */
const registriDi = (registri: RegistroAbitudine[], tipo: TipoAbitudine): Valori => new Map(registri.filter((r) => r.tipo === tipo).map((r) => [r.data, r.valore]))

/** I valori di ogni giorno per un tipo, da tutto quello che il club sa (telefono, allenamenti, valori scritti a mano). Esportata: serve anche a suggerire il punto di partenza di una sfida. */
export function valoriDelTipo(tipo: TipoAbitudine, dati: { giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] }, registri: RegistroAbitudine[] = []): Valori {
  switch (tipo) {
    case 'passi':
      return alto(dati.giorni, (g) => g.passi)
    case 'movimento': {
      // I minuti di allenamento e l'anello Esercizio di Apple dicono in parte la stessa cosa: vale il maggiore, mai la somma.
      const m = minutiDa(dati.allenamenti)
      for (const [d, v] of alto(dati.giorni, (g) => g.esercizio_minuti)) m.set(d, Math.max(m.get(d) ?? 0, v))
      return m
    }
    case 'sonno':
      return nottiDa(dati.giorni)
    case 'coricamento':
      return coricamentiDa(dati.giorni)
    case 'in_piedi':
      return alto(dati.giorni, (g) => g.ore_in_piedi)
    case 'mindfulness':
      return alto(dati.giorni, (g) => g.mindfulness_minuti)
    case 'luce':
      return alto(dati.giorni, (g) => g.luce_minuti)
    default:
      return registriDi(registri, tipo)
  }
}

/** I giorni per cui il telefono ha mandato qualcosa (qualunque dato): per un allenamento, «nessun allenamento» vale «no» solo dove si sa che il telefono parlava. */
function giorniConDati(giorni: GiornoDispositivo[], allenamenti: AllenamentoDispositivo[]): Set<string> {
  const s = new Set<string>()
  for (const g of giorni) if (eDaSalute(g.fornitore)) s.add(g.data)
  for (const a of allenamenti) if (eDaSalute(a.fornitore)) s.add(giornoDi(a.inizio))
  return s
}

export function statoDelGiorno(giorno: string, oggi: string, valore: number | null, soglia: number, telefonoParlava: boolean, inverso = false): StatoGiorno {
  if (giorno > oggi) return 'futuro'
  if (valore !== null && (inverso ? valore <= soglia : valore >= soglia)) return 'fatto'
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

/** Quello che si sa delle scelte della persona: l'elenco salvato sul server e i valori scritti a mano. Senza scelte valgono le tre di partenza. */
export type ConfigAbitudini = { scelte: SceltaAbitudine[]; registri: RegistroAbitudine[] }

export function calcolaAbitudini(dati: { giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] }, oggi: string, config?: ConfigAbitudini | null): Abitudine[] {
  const registri = config?.registri ?? []
  const salvate = config?.scelte ?? []
  const scelte: { s: SceltaAbitudine; salvata: boolean }[] = salvate.length ? salvate.map((s) => ({ s, salvata: true })) : sceltePredefinite().map((s) => ({ s, salvata: false }))
  const parlava = giorniConDati(dati.giorni, dati.allenamenti)
  const inizio = spostaGiorno(oggi, -(GIORNI_VISTI - 1))
  const { da: lunedi } = settimanaDi(oggi)

  return scelte.map(({ s, salvata }) => {
    const cat = CATALOGO[s.tipo]
    const v = valoriDelTipo(s.tipo, dati, registri)
    const dal = s.dal ?? oggi
    // «Nessun valore» e' un «no» (e non «senza dato»): l'allenamento e la meditazione dove il telefono parlava; quelle scritte a mano da quando si seguono.
    const mancanza = (g: string) => (cat.manuale ? g >= dal : s.tipo === 'movimento' || s.tipo === 'mindfulness' ? parlava.has(g) : false)
    const stato = (g: string) => statoDelGiorno(g, oggi, v.get(g) ?? null, sogliaDelGiorno(s, g), mancanza(g), cat.inverso)

    const giorni: GiornoAbitudine[] = []
    for (let g = inizio; g <= oggi; g = spostaGiorno(g, 1)) giorni.push({ data: g, stato: stato(g), valore: v.get(g) ?? null })

    // La settimana in corso.
    let fatti = 0
    let inCorso = 0
    let dopoOggi = 0
    for (let g = lunedi; g <= spostaGiorno(lunedi, 6); g = spostaGiorno(g, 1)) {
      const st = stato(g)
      if (st === 'fatto') fatti++
      else if (st === 'in-corso') inCorso++
      else if (st === 'futuro') dopoOggi++
    }
    const inRitmo = fatti >= s.giorni

    // Le settimane concluse, dalla piu' recente: nel ritmo, sotto, o senza nessun dato (neutra: si salta).
    let serie = inRitmo ? 1 : 0
    for (let l = spostaGiorno(lunedi, -7), n = 0; n < 12; l = spostaGiorno(l, -7), n++) {
      let f = 0
      let conDato = false
      for (let g = l; g <= spostaGiorno(l, 6); g = spostaGiorno(g, 1)) {
        if (v.has(g) || mancanza(g)) conDato = true
        if (stato(g) === 'fatto') f++
      }
      if (!conDato) continue
      if (f >= s.giorni) serie++
      else break
    }

    const noti = [...v].filter(([g]) => g <= oggi).sort((a, b) => b[0].localeCompare(a[0]))
    return {
      id: s.tipo,
      pilastro: cat.pilastro,
      soglia: sogliaDelGiorno(s, oggi),
      obiettivo: s.giorni,
      manuale: cat.manuale,
      inverso: cat.inverso,
      sfida: statoSfida(s, oggi),
      scelta: salvata ? s : null,
      fatti,
      inRitmo,
      raggiungibile: inRitmo || fatti + inCorso + dopoOggi >= s.giorni,
      serie,
      ultimo: noti[0] ? { data: noti[0][0], valore: noti[0][1] } : null,
      oggi: v.get(oggi) ?? null,
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
