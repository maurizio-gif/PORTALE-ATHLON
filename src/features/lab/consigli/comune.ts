import type { DatiLezione, LezioneConsiglio, Livello, Obiettivo, QuestionarioConsigli, RispostaConsigli } from '@/api/percorso'

// Le parole e i piccoli conti dei Consigli di Athlon (20/10/2026). Sono **consigli**, non una settimana: quali tipi di
// lezione convengono, quali alternative ci sono per ognuno e, solo se il socio lo chiede, come affiancarli alla sala
// pesi e al Nuoto Libero. Le lezioni vere le trova la funzione (`portale-lab-percorso`, azione `consigli`); qui si
// mostrano, e si prenotano come dal Calendario, una alla volta. Niente «percorso» e niente «piano» nei testi per il socio:
// il percorso e' un'altra cosa (la settimana a tappe) e il piano sono gli esercizi di un allenamento.

/** Le chiavi di memoria del laboratorio: lo stato, l'ultima risposta (senza niente di sanitario) e le scelte fatte, **senza le limitazioni**. */
export const CHIAVE_STATO_CONSIGLI = 'consigli:stato'
export const CHIAVE_ULTIMI_CONSIGLI = 'consigli:ultimi'
export const CHIAVE_SCELTE_CONSIGLI = 'consigli:scelte'

/**
 * Le scelte del questionario nella forma in cui stanno nella schermata. **Le limitazioni non ci sono**: sono dati sulla salute,
 * vivono solo nel campo di testo e arrivano all'AI, e basta. Obiettivo e livello sono vuoti finche' il socio non li sceglie.
 */
export type SceltePerConsigli = Omit<QuestionarioConsigli, 'limitazioni' | 'evitate' | 'obiettivo' | 'livello'> & {
  obiettivo: Obiettivo | null
  livello: Livello | null
  /** Le lezioni da evitare come le ha scritte il socio, separate da virgole. */
  evitate: string
}

export const VOLTE_DI_PARTENZA = 3

/** «Martedì 20 ottobre»: il giorno com'e' scritto, con l'iniziale maiuscola. */
export const titoloGiorno = (testo: string) => testo.charAt(0).toUpperCase() + testo.slice(1)

export const volteTesto = (n: number) => (n === 1 ? 'una volta a settimana' : n === 2 ? 'due volte a settimana' : n === 3 ? 'tre volte a settimana' : `${n} volte a settimana`)

/** Le lezioni da evitare scritte dal socio: separate da virgola, punto e virgola o a capo, senza doppioni. */
export function evitateDa(testo: string): string[] {
  const visti = new Set<string>()
  for (const parte of testo.split(/[,;\n]/)) {
    const t = parte.replace(/\s+/g, ' ').trim().slice(0, 60)
    if (t) visti.add(t)
    if (visti.size >= 10) break
  }
  return [...visti]
}

/** Il questionario per la funzione, dalle scelte e dalle limitazioni; null finche' mancano obiettivo e livello (le uniche risposte obbligatorie). */
export function questionarioDa(s: SceltePerConsigli, limitazioni: string): QuestionarioConsigli | null {
  if (!s.obiettivo || !s.livello) return null
  return { ...s, obiettivo: s.obiettivo, livello: s.livello, evitate: evitateDa(s.evitate), limitazioni: limitazioni.trim() }
}

type Prenotazione = DatiLezione['prenotazione']

/** Cambia una lezione (se e' quella) dopo un clic: la prenotazione, i posti liberi e la lista d'attesa, come nel Calendario. */
function ritocca<T extends DatiLezione>(d: T, classId: number, prenotazione: Prenotazione, delta: number, deltaAttesa: number): T {
  if (d.class_id !== classId) return d
  return { ...d, prenotazione, liberi: Math.max(0, d.liberi - delta), in_attesa: Math.max(0, d.in_attesa + deltaAttesa) }
}

/**
 * La risposta con una prenotazione cambiata, in ogni posto in cui compare quella lezione (un consiglio, una sua
 * alternativa, un turno di sala o di vasca). Dopo un clic la riga si aggiorna subito, con quello che ha detto
 * PerfectGym: il mirror arriva con qualche secondo di ritardo e non si rilegge per confermare.
 */
export function conPrenotazione(r: RispostaConsigli, classId: number, nuova: Prenotazione, delta: number, deltaAttesa = 0): RispostaConsigli {
  const l = (x: LezioneConsiglio) => ritocca(x, classId, nuova, delta, deltaAttesa)
  return {
    ...r,
    consigli: r.consigli.map((c) => ({ ...c, prossime: c.prossime.map(l), alternative: c.alternative.map((a) => ({ ...a, prossime: a.prossime.map(l) })) })),
    sala: r.sala ? { ...r.sala, giorni: r.sala.giorni.map((g) => ({ ...g, turni: g.turni.map((t) => ({ ...l(t), fascia: t.fascia })) })) } : null,
    nuoto: r.nuoto ? { ...r.nuoto, giorni: r.nuoto.giorni.map((g) => ({ ...g, turni: g.turni.map(l) })) } : null,
  }
}

/** Una lezione della risposta, per id: serve a sapere di che giorno e' quando si prenota o si disdice. */
export function trovaLezione(r: RispostaConsigli, classId: number): LezioneConsiglio | null {
  const tutte: LezioneConsiglio[] = [
    ...r.consigli.flatMap((c) => [...c.prossime, ...c.alternative.flatMap((a) => a.prossime)]),
    ...(r.sala?.giorni.flatMap((g) => g.turni) ?? []),
    ...(r.nuoto?.giorni.flatMap((g) => g.turni) ?? []),
  ]
  return tutte.find((x) => x.class_id === classId) ?? null
}
