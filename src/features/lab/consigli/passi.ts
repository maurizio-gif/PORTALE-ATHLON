import { t } from '@/lib/lingua'

import { nomeSport } from '../dispositivi/allenamentiDispositivo'
import { GIORNO_BREVE, NOME_FASCIA } from '../percorso/comune'
import { nomeObiettivo } from '../schede/questionario'
import {
  AMBIENTE_TESTO,
  BISOGNO_TESTO,
  DISCIPLINA_TESTO,
  ESPERIENZA_TESTO,
  GUSTI,
  gustiDi,
  INTENSITA_TESTO,
  LIVELLO_TESTO,
  PAUSA_TESTO,
  PERSONAL_ESPERIENZA_TESTO,
  PERSONAL_INTERESSE_TESTO,
  TIPOLOGIA_TESTO,
  volteTesto,
  type SceltePerConsigli,
} from './comune'

// Il questionario dei Consigli a passi (05/11/2026, richiesta di Maurizio: «come quello del piano di allenamento»). Una domanda
// per schermata, l'anello che si chiude, indietro e «Continua»; alla fine il riepilogo «Ecco cosa abbiamo capito», dove ogni riga
// si tocca per cambiarla. Le domande sono quelle di prima, nello stesso ordine, e partono nella stessa forma (`questionarioDa`):
// cambia solo come si presentano. Qui le regole pure (quali passi, quando si va avanti, il riepilogo); la schermata e'
// `PassiConsigli.tsx`.

export type PassoConsigli =
  | 'obiettivi'
  | 'bisogni'
  | 'esperienza'
  | 'pausa'
  | 'discipline'
  | 'livello'
  | 'gusti'
  | 'intensita'
  | 'volte'
  | 'quando'
  | 'esterno'
  | 'personal'
  | 'tipologie'
  | 'ambienti'
  | 'evita'
  | 'comprese'
  | 'limitazioni'
  | 'riepilogo'

/**
 * I passi, in ordine, per queste risposte: quando ha smesso solo per chi ha smesso, cosa fa (o faceva) e com'e' la sua forma
 * solo per chi ha praticato, e le lezioni non comprese solo se si sa cosa comprende il suo abbonamento.
 */
export function passiConsigli(s: Pick<SceltePerConsigli, 'esperienza'>, conComprese: boolean): PassoConsigli[] {
  const praticato = s.esperienza === 'ex' || s.esperienza === 'pratico'
  return [
    'obiettivi',
    'bisogni',
    'esperienza',
    ...(s.esperienza === 'ex' ? (['pausa'] as const) : []),
    ...(praticato ? (['discipline', 'livello'] as const) : []),
    'gusti',
    'intensita',
    'volte',
    'quando',
    'esterno',
    'personal',
    'tipologie',
    'ambienti',
    'evita',
    ...(conComprese ? (['comprese'] as const) : []),
    'limitazioni',
    'riepilogo',
  ]
}

/** I passi che si possono saltare: «Continua» diventa «Salta» finche' non si risponde. */
const FACOLTATIVI: ReadonlySet<PassoConsigli> = new Set(['bisogni', 'pausa', 'discipline', 'intensita', 'quando', 'esterno', 'personal', 'tipologie', 'ambienti', 'evita', 'limitazioni'])
export const facoltativo = (p: PassoConsigli) => FACOLTATIVI.has(p)

/** Si puo' andare avanti: gli obbligatori sono un obiettivo, l'esperienza, la forma (per chi ha praticato) e, per chi nuota, se sa lo stile. */
export function passoCompleto(p: PassoConsigli, s: SceltePerConsigli): boolean {
  switch (p) {
    case 'obiettivi':
      return s.obiettivi.length > 0
    case 'esperienza':
      return !!s.esperienza
    case 'livello':
      return !!s.livello
    case 'gusti':
      return !s.nuotare || s.saNuotare !== null
    default:
      return true
  }
}

/** Un passo facoltativo senza risposta (per scrivere «Salta» al posto di «Continua»). */
export function passoVuoto(p: PassoConsigli, s: SceltePerConsigli, limitazioni: string): boolean {
  switch (p) {
    case 'bisogni':
      return !s.bisogni.length
    case 'pausa':
      return !s.pausa
    case 'discipline':
      return !s.discipline.length
    case 'intensita':
      return !s.intensita
    case 'quando':
      return !s.giorni.length && !s.fasce.length
    case 'esterno':
      return !s.esterno_attivita.length
    case 'personal':
      return !s.personal_esperienza && !s.personal_interesse
    case 'tipologie':
      return !s.tipologie.length
    case 'ambienti':
      return !s.ambienti.length
    case 'evita':
      return !s.evita_gruppi.length && !s.evita_tipologie.length
    case 'limitazioni':
      return !limitazioni.trim()
    default:
      return false
  }
}

const elenco = (x: string[], vuoto: string) => (x.length ? x.join(', ') : vuoto)
const nessuna = () => t('Nessuna preferenza', 'No preference')

/** Le righe di «Ecco cosa abbiamo capito»: una per passo (il riepilogo escluso), ognuna porta al suo passo. */
export function riepilogoConsigli(s: SceltePerConsigli, limitazioni: string, conComprese: boolean): { passo: PassoConsigli; titolo: string; valore: string }[] {
  const righe: { passo: PassoConsigli; titolo: string; valore: string }[] = []
  for (const passo of passiConsigli(s, conComprese)) {
    switch (passo) {
      case 'obiettivi':
        righe.push({ passo, titolo: t('Obiettivi', 'Goals'), valore: elenco(s.obiettivi.map(nomeObiettivo), '—') })
        break
      case 'bisogni':
        righe.push({ passo, titolo: t('Dietro agli obiettivi', 'Behind your goals'), valore: elenco(s.bisogni.map((b) => BISOGNO_TESTO[b].testo), nessuna()) })
        break
      case 'esperienza':
        righe.push({ passo, titolo: t('Esperienza', 'Experience'), valore: s.esperienza ? ESPERIENZA_TESTO[s.esperienza].testo : '—' })
        break
      case 'pausa':
        righe.push({ passo, titolo: t('Quando hai smesso', 'When you stopped'), valore: s.pausa ? PAUSA_TESTO[s.pausa] : nessuna() })
        break
      case 'discipline':
        righe.push({ passo, titolo: s.esperienza === 'ex' ? t('Cosa facevi', 'What you did') : t('Cosa fai', 'What you do'), valore: elenco(s.discipline.map((d) => DISCIPLINA_TESTO[d]), nessuna()) })
        break
      case 'livello':
        righe.push({ passo, titolo: t('La tua forma', 'Your fitness'), valore: s.livello ? LIVELLO_TESTO[s.livello].testo : '—' })
        break
      case 'gusti': {
        const gusti = GUSTI.filter((g) => gustiDi(s).includes(g.valore)).map((g) => g.testo)
        const nuoto = s.nuotare ? (s.saNuotare ? t('sai stile libero e dorso', 'you can swim freestyle and backstroke') : t('vuoi imparare', 'you want to learn')) : null
        righe.push({ passo, titolo: t('Cosa ti piace', 'What you like'), valore: [elenco(gusti, t('Tutte le lezioni', 'All classes')), nuoto].filter(Boolean).join(' · ') })
        break
      }
      case 'intensita':
        righe.push({ passo, titolo: t('Intensità', 'Intensity'), valore: s.intensita ? INTENSITA_TESTO[s.intensita].testo : nessuna() })
        break
      case 'volte':
        righe.push({ passo, titolo: t('Quante volte', 'How often'), valore: volteTesto(s.volte_settimana) })
        break
      case 'quando':
        righe.push({
          passo,
          titolo: t('Quando', 'When'),
          valore: s.giorni.length || s.fasce.length ? [...s.giorni.map((g) => GIORNO_BREVE[g as keyof typeof GIORNO_BREVE]), ...s.fasce.map((f) => NOME_FASCIA[f].titolo)].join(', ') : nessuna(),
        })
        break
      case 'esterno':
        righe.push({ passo, titolo: t('Fuori dal club', 'Outside the club'), valore: elenco(s.esterno_attivita.map((a) => nomeSport(a)), t('No', 'No')) })
        break
      case 'personal': {
        const v = [s.personal_esperienza ? PERSONAL_ESPERIENZA_TESTO[s.personal_esperienza] : null, s.personal_interesse ? PERSONAL_INTERESSE_TESTO[s.personal_interesse] : null].filter(Boolean)
        righe.push({ passo, titolo: t('Personal trainer', 'Personal trainer'), valore: elenco(v as string[], nessuna()) })
        break
      }
      case 'tipologie':
        righe.push({ passo, titolo: t('Ti attraggono', 'You like'), valore: elenco(s.tipologie.map((v) => TIPOLOGIA_TESTO[v].testo), nessuna()) })
        break
      case 'ambienti':
        righe.push({ passo, titolo: t('Dove', 'Where'), valore: s.ambienti.length === 1 ? AMBIENTE_TESTO[s.ambienti[0]].testo : t('Sala e acqua', 'Studio and water') })
        break
      case 'evita': {
        const v = [...GUSTI.filter((g) => (s.evita_gruppi as string[]).includes(g.valore)).map((g) => g.testo), ...s.evita_tipologie.map((x) => TIPOLOGIA_TESTO[x].testo)]
        righe.push({ passo, titolo: t('Da evitare', 'To avoid'), valore: elenco(v, t('Niente', 'Nothing')) })
        break
      }
      case 'comprese':
        righe.push({ passo, titolo: t('Non comprese', 'Not included'), valore: s.includi_non_comprese ? t('Anche quelle', 'Those too') : t('Solo le comprese', 'Only included ones') })
        break
      case 'limitazioni':
        righe.push({ passo, titolo: t('Limitazioni', 'Limitations'), valore: limitazioni.trim() || t('Nessuna', 'None') })
        break
    }
  }
  return righe
}
