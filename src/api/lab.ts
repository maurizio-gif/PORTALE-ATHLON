import { SUPABASE_URL } from '@/config'
import { segnaRifiuto } from '@/features/lab/riservate/store'
import { vistaCorrente } from '@/features/lab/vista'
import { rpeValido } from '@/features/lab/schede/rpe'
import { supabase } from '@/lib/supabase'
import { canaleNativo } from '@/lib/adyenNativo'
import { intestazioneLingua, t } from '@/lib/lingua'

// Il laboratorio (binario B): login proprio, fuori da PerfectGym, solo per i
// tester (tabella portale_lab_tester nel database).
//
// Il codice lo manda la funzione `portale-accesso` dalla coda delle email del
// club; qui si verifica con Supabase Auth, e da li' in poi il portale ha una
// sessione vera, con il suo JWT. Funziona uguale sul web e nell'app.

export async function chiediCodice(email: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/portale-accesso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua() },
      body: JSON.stringify({ email }),
    })
    const dati = (await r.json().catch(() => null)) as { ok?: boolean; errore?: string } | null
    if (r.ok && dati?.ok) return { ok: true }
    return { ok: false, errore: dati?.errore || t('Non siamo riusciti a mandarti il codice. Riprova tra poco.', 'We couldn’t send you the code. Try again shortly.') }
  } catch {
    return { ok: false, errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') }
  }
}

export async function entra(email: string, codice: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const token = codice.replace(/\D/g, '')
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (!error) return { ok: true }
  if (await entraPerRevisione(email, token)) return { ok: true }
  if (/expired|invalid/i.test(error.message)) return { ok: false, errore: t('Codice sbagliato o scaduto. Controlla l’ultima email che ti abbiamo mandato.', 'Wrong or expired code. Check the latest email we sent you.') }
  return { ok: false, errore: t('Non siamo riusciti a farti entrare. Riprova tra poco.', 'We couldn’t sign you in. Try again shortly.') }
}

// L'accesso del revisore di Apple (04/11/2026): un indirizzo solo ha un codice fisso, scritto nelle note per la revisione su App Store
// Connect, perche' il revisore non legge la casella a cui arriva il codice. Lo decide `portale-accesso` (azione `revisione`, segreti
// `REVISIONE_APPLE_EMAIL` e `REVISIONE_APPLE_CODICE`, CLAUDE.md di APP-ATHLON): qui si chiede solo dopo che il codice normale non e'
// valso, e se combacia si apre la sessione col token monouso che torna. Per chiunque altro risponde «no» e resta l'errore di sempre.
async function entraPerRevisione(email: string, codice: string): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/portale-accesso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua() },
      body: JSON.stringify({ azione: 'revisione', email, codice }),
    })
    const dati = (await r.json().catch(() => null)) as { ok?: boolean; token_hash?: string } | null
    if (!r.ok || !dati?.ok || !dati.token_hash) return false
    for (const tipo of ['email', 'magiclink'] as const) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: dati.token_hash, type: tipo })
      if (!error) return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Esce. Di partenza `global` (chiude la sessione su tutti i dispositivi, come ha sempre fatto l'app); `local` chiude solo questa:
 * sul totem (`features/lab/totem`) chi esce non deve trovarsi senza accesso anche sul proprio telefono.
 */
export async function esci(ambito: 'global' | 'local' = 'global') {
  await supabase.auth.signOut({ scope: ambito })
}

export type PersonaArea = {
  member_id: number
  nome: string | null
  cognome: string | null
  numero: string | null
  /** Il tipo di scheda su PerfectGym (`Member`, `Guest`, `Lead`); assente con una funzione di prima. */
  tipo?: string | null
  data_nascita: string | null
  titolare: boolean
  email: string | null
  telefono: string | null
  /**
   * Codice fiscale, email e cellulare di un figlio come sono su PerfectGym (06/11/2026). Solo per i figli del genitore: manca per il titolare e
   * per i bambini raggiunti con una delega (decide il server). Assente con una funzione di prima.
   */
  dati?: { codice_fiscale: string | null; email: string | null; telefono: string | null } | null
  /** Un pagamento non andato (saldo negativo su PerfectGym), non quando un addebito e' ancora in corso. */
  debito?: { importo: number; dal: string | null } | null
}

export type ContrattoArea = {
  contract_id: number
  member_id: number
  piano: string | null
  stato: string | null
  data_firma: string | null
  data_inizio: string | null
  data_fine: string | null
  rinnovo_automatico: boolean | null
  canone: number | null
  metodo: unknown
  /**
   * Come il database classifica il contratto: `abbonamento` (con una quota), `gratuito` (Employee, Omaggio: il principale a
   * quota zero), `guest_pass` (una prova), `voucher_covid` (i voucher legati al Covid: non sono abbonamenti, richiesta del
   * club). Manca finche' la funzione del database non e' aggiornata (20/10/2026): allora si conta come abbonamento solo
   * chi ha una quota.
   */
  tipo?: string | null
  /** PerfectGym lo considera un contratto aggiuntivo (un servizio in piu'), non il principale. */
  aggiuntivo?: boolean | null
}

/**
 * L'ultimo certificato caricato dalla persona (17/10/2026), solo se serve alla schermata: `in_verifica` finche'
 * la segreteria non l'ha visto, `rifiutato` (da meno di 60 giorni) col motivo. Uno approvato non c'e': la prova
 * e' la scadenza nuova.
 */
export type CaricamentoArea = {
  stato: 'in_verifica' | 'rifiutato'
  caricato_il: string
  verificato_il: string | null
  motivo_rifiuto: string | null
}

export type CertificatoArea = {
  member_id: number
  scadenza: string | null
  tipo: string | null
  stato: string | null
  /** Manca finche' la funzione del database non e' aggiornata. */
  caricamento?: CaricamentoArea | null
  /** La proroga temporanea concessa dalla segreteria (il «temporaneo» del CRM), se e' ancora in corso. Manca finche' la funzione del database non e' aggiornata. */
  proroga?: { inizio: string | null; fine: string } | null
}

export type Area =
  | { trovato: false; email: string }
  | { trovato: true; email: string; titolare: number; persone: PersonaArea[]; contratti: ContrattoArea[]; certificati: CertificatoArea[] }

export type EsitoArea = { ok: true; area: Area } | { ok: false; nonAmmesso: boolean; errore: string }

/**
 * L'area riservata: la legge `portale_la_mia_area()` dal mirror di PerfectGym, solo per chi e' fra i tester.
 * In vista cliente (vista.ts) la Home e' quella del cliente, letta con `portale_area_di`: solo per chi e' abilitato.
 */
export async function laMiaArea(): Promise<EsitoArea> {
  const vista = vistaCorrente()
  const { data, error } = vista ? await supabase.rpc('portale_area_di', { p_email: vista }) : await supabase.rpc('portale_la_mia_area')
  if (!error) return { ok: true, area: data as Area }
  // 42501 e' anche «permission denied»: e' il rifiuto del tester (o della vista)
  // solo col messaggio della funzione, altrimenti e' un errore come gli altri.
  const nonAmmesso = error.code === '42501' && (vista ? /vista cliente/i : /tester/i).test(error.message)
  if (!nonAmmesso) console.error(vista ? 'portale_area_di:' : 'portale_la_mia_area:', error.code, error.message)
  // In vista cliente si dice con quale indirizzo il browser e' entrato: se il link del CRM non ha aperto la sessione di chi guarda (token
  // gia' usato o scaduto), resta quella che c'era, magari di un altro account, e senza il nome non si capisce perche' (04/11/2026).
  const chi = vista && nonAmmesso ? (await supabase.auth.getSession()).data.session?.user.email ?? null : null
  return {
    ok: false,
    nonAmmesso,
    errore: nonAmmesso
      ? vista
        ? chi
          ? t(
              `Questo browser e’ entrato come ${chi}, che non e’ abilitato alla vista cliente. Torna al CRM e premi di nuovo «Vedi come cliente».`,
              `This browser is signed in as ${chi}, which isn’t enabled for the member view. Go back to the CRM and press «View as member» again.`,
            )
          : t('Questo accesso non e’ abilitato alla vista cliente.', 'This account isn’t enabled for the member view.')
        : t('Questo indirizzo non ha ancora accesso al portale. Scrivi al club se pensi sia un errore.', 'This address doesn’t have access to the portal yet. Write to the club if you think this is a mistake.')
      : t('Non riusciamo a leggere i tuoi dati adesso. Riprova tra poco.', 'We can’t load your details right now. Try again shortly.'),
  }
}

// ---------------------------------------------------------------------------
// Il calendario (tappa 4): lezioni vere di PerfectGym, prenotazioni vere.

/**
 * Le categorie senza lista d'attesa (04/11/2026, richiesta di Maurizio): i recuperi della Scuola Nuoto Bambini. Una lezione al
 * completo non offre «Lista d'attesa»: dice che e' piena e di scegliere un altro giorno. La regola la applica
 * `portale-lab-calendario` (`senzaListaAttesa` in `_shared/lezioni-prenotabili.ts` di APP-ATHLON), che rifiuta anche se il
 * pulsante arrivasse lo stesso: qui serve a non offrirla. I due repository non si importano, quindi l'elenco e' scritto due volte.
 */
export const senzaListaAttesa = (categoria: string | null | undefined): boolean =>
  (categoria ?? '').toLowerCase().replace(/\s+/g, '') === 'recuperiscuolanuotobambini'

export type Lezione = {
  class_id: number
  inizio: string
  fine: string
  nome: string
  /** La macrocategoria di PerfectGym: Corsi Fitness, Group Reformer, Aqua Fitness, … */
  categoria: string
  istruttore: string | null
  /** Dove si fa (09/11/2026): la zona su PerfectGym, «Sala A», «Sala B», «Sala C», «Piscina Grande»… Manca finche' la funzione non e' aggiornata. */
  sala?: string | null
  posti: number
  iscritti: number
  liberi: number
  /** Chi e' in lista d'attesa (gia' compreso in `iscritti`). Manca finche' la funzione non e' aggiornata. */
  in_attesa?: number
  iniziata: boolean
  /** Se la prenotazione non e' ancora aperta: da quando (ISO). Si apre tre giorni prima. */
  prenotabile_dal: string | null
  prenotazione: { booking_id: number; attesa: boolean; posizione?: number | null } | null
  /**
   * Il limite delle prenotazioni attive, se e' gia' pieno: **tre in tutto fra Corsi Fitness, Aqua Fitness e Scuola
   * Nuoto Adulti** (dall'11/11/2026 le tre attivita' dividono lo stesso limite), piu' una di Group Reformer; la lista
   * d'attesa conta. `messaggio` dice perche' non si prenota, con il nome delle lezioni che lo occupano (`prenotate`, di
   * qualunque categoria del limite: `categorie`, che una funzione di prima non manda).
   */
  limite?: { categoria: string; categorie?: string[]; massimo: number; messaggio: string; prenotate: { class_id: number; nome: string; inizio: string; attesa: boolean }[] } | null
  /** La chiave della sua scheda in `Giorno.schede`, se il sito ne ha una. */
  scheda: string | null
}

/** La scheda di una lezione, da https://www.athlonroma.it/lezioni.json (la stessa del planning del sito). */
export type SchedaLezione = {
  nome: string
  /** HTML semplice: <b> e <br>. */
  descrizione: string
  video: string | null
  inizioVideo: number | null
  foto: string | null
  fuoco: string | null
  caratteristiche: { l: string; v: number }[]
  /** Un testo per fascia d'eta' (oggi il Baby Nuoto): si sceglie con i mesi scritti nel nome della lezione, «3-15 Mesi». */
  varianti?: { da: number; a: number; descrizione: string }[]
}

/** Di un corso di `lezioni.json` basta la foto (e il punto da tenere al centro): servono alle copertine di Athlon TV (`features/lab/tv/copertine.ts`). */
export type CorsoDelSito = { foto: string | null; fuoco: string | null }

export type PersonaCalendario = { member_id: number; nome: string | null; cognome: string | null; titolare: boolean }

/**
 * Una prenotazione in programma della persona, di qualunque giorno (non cominciata).
 * `posizione` (10/11/2026) c'e' solo se e' in lista d'attesa: il posto in coda, 1 = il primo; null se la funzione non ha saputo calcolarlo, e manca finche' la funzione non e' aggiornata.
 */
export type Prenotata = { class_id: number; nome: string; categoria: string; inizio: string; attesa: boolean; sala?: string | null; posizione?: number | null }

export type Giorno = {
  persone: PersonaCalendario[]
  giorni: string[]
  data: string
  member_id: number
  prenotazioni_lette: boolean
  lezioni: Lezione[]
  /** Tutte le prenotazioni in programma della persona, a prescindere dal giorno. Manca finche' la funzione non e' aggiornata: allora si usano quelle del giorno. */
  prenotate?: Prenotata[]
  schede: Record<string, SchedaLezione>
}

/**
 * Una funzione del laboratorio, con la sessione del tester. In vista cliente
 * (vista.ts) porta anche l'indirizzo del cliente: il server lo accetta solo da
 * chi e' abilitato, risponde con i dati di quel cliente e rifiuta ogni scrittura.
 */
export async function funzione(nome: string, corpo: Record<string, unknown>): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, stato: 401, dati: { errore: t('Sessione scaduta: entra di nuovo.', 'Session expired: sign in again.') } }
  const vista = vistaCorrente()
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua(), Authorization: `Bearer ${token}`, ...(vista ? { 'X-Athlon-Come': vista } : {}) },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    // Un'azione riservata a chi ha un abbonamento attivo (Athlon Health System, Athlon TV): lo stato che arriva col rifiuto mette la sezione
    // in anteprima (features/lab/riservate), anche se `accesso` non era ancora stato letto. Il modal no: lo apre il tocco, non una lettura.
    if (r.status === 403 && dati.codice === 'riservata') segnaRifiuto(dati.accesso)
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') } }
  }
}

const calendario = (corpo: Record<string, unknown>) => funzione('portale-lab-calendario', corpo)

export async function leggiGiorno(data?: string, memberId?: number): Promise<{ ok: true; giorno: Giorno } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'giorno', data, member_id: memberId })
  if (ok) return { ok: true, giorno: dati as unknown as Giorno }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere il calendario adesso.', 'We can’t load the calendar right now.') }
}

/**
 * Le lezioni di una categoria nei prossimi giorni, per la sezione Junior (22/10/2026): i recuperi della Scuola Nuoto Bambini
 * (`recuperi`) e il Baby Nuoto (`baby`), gia' filtrati per la nascita della persona e con la stessa forma di `leggiGiorno`.
 */
export async function leggiLezioniPeriodo(
  categoria: 'recuperi' | 'baby',
  memberId: number,
): Promise<{ ok: true; lezioni: Lezione[]; schede: Record<string, SchedaLezione> } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'periodo', categoria, member_id: memberId })
  if (ok) return { ok: true, lezioni: (dati.lezioni ?? []) as Lezione[], schede: (dati.schede ?? {}) as Record<string, SchedaLezione> }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere le lezioni adesso.' }
}

/** Una lezione a cui il titolare e' stato presente (segnata dalla reception), per il contatore delle calorie. */
export type PresenzaLezione = { inizio: string; fine: string; nome: string; categoria: string | null; scheda: string | null }

/** Le presenze alle lezioni delle ultime settimane, con le schede delle lezioni (le barre di intensita'). */
export async function presenzeLezioni(): Promise<Esito<{ presenze: PresenzaLezione[]; schede: Record<string, SchedaLezione> }>> {
  const { ok, dati } = await calendario({ azione: 'presenze' })
  if (ok) return { ok: true, presenze: (dati.presenze ?? []) as PresenzaLezione[], schede: (dati.schede ?? {}) as Record<string, SchedaLezione> }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere le tue lezioni adesso.', 'We can’t load your classes right now.') }
}

/**
 * Una prenotazione passata del titolare (09/11/2026, il riquadro «Prenotazioni» della Home). Dal 10/11/2026 (richiesta di Maurizio) lo
 * storico e' degli ultimi 30 giorni e si divide in due elenchi, entrambi decisi dalla funzione:
 *   `voci`      le lezioni con la presenza o l'assenza, solo di sei categorie (Corsi Fitness, Group Reformer, Aqua Fitness, Scuola Nuoto
 *               Adulti, Nuoto Libero, Master Class), e gli Eventi Gratuiti. Per una lezione `esito` e' `presente` o `assente`; per un
 *               evento gratuito `presente` solo se la presenza e' segnata, altrimenti `null` (mai `assente`: lì la presenza non si segna). Non ci
 *               sono le disdette, le lezioni ancora «da confermare» (l'istruttore ha tre ore dall'inizio per segnarle), la Gym Floor e i corsi junior.
 *   `personal`  le sedute di personal training non annullate, a parte, con `esito: null`: il segno non c'e'.
 */
export type EsitoPrenotazione = 'presente' | 'assente'
export type PrenotazionePassata = {
  tipo: 'lezione' | 'pt'
  id: number
  inizio: string
  fine: string | null
  nome: string
  /** La zona su PerfectGym («Sala A», «Piscina Grande»); null se manca e per i PT. */
  sala: string | null
  istruttore: string | null
  /** Presente o assente per una lezione; per un evento presente o null; null per il personal training. */
  esito: EsitoPrenotazione | null
}
export type StoricoPrenotazioni = {
  /** Quanti giorni indietro arriva l'elenco: i conteggi sono su questi. */
  giorni: number
  /** Le lezioni con presenza o assenza e gli eventi, dalla piu' recente. */
  voci: PrenotazionePassata[]
  /** Il personal training, a parte e senza segno, dal piu' recente. */
  personal: PrenotazionePassata[]
  /** Le pillole «Presente» e «Assente» di `voci`: le presenze includono gli eventi con la presenza segnata, le assenze mai un evento. */
  presenze: number
  assenze: number
}

/**
 * Le lezioni con presenza o assenza e, a parte, i personal degli ultimi 30 giorni. Con una funzione di prima (che non conosce l'azione)
 * risponde 400 e la sezione dice che non riesce a leggerle: niente di rotto, e il riquadro resta apribile.
 */
export async function storicoPrenotazioni(): Promise<Esito<StoricoPrenotazioni>> {
  const { ok, stato, dati } = await calendario({ azione: 'storico' })
  if (ok && Array.isArray(dati.voci)) {
    return {
      ok: true,
      giorni: Number(dati.giorni) || 30,
      voci: dati.voci as PrenotazionePassata[],
      personal: Array.isArray(dati.personal) ? (dati.personal as PrenotazionePassata[]) : [],
      presenze: Number(dati.presenze) || 0,
      assenze: Number(dati.assenze) || 0,
    }
  }
  // 400 e' «Azione sconosciuta»: la funzione non e' ancora quella nuova. Il testo del server non e' per la persona.
  const generico = t('Non riusciamo a leggere le tue prenotazioni adesso.', 'We can’t load your bookings right now.')
  return { ok: false, errore: stato === 400 ? generico : (dati.errore ?? generico) }
}

/** Una lezione a cui il titolare e' stato presente di recente e a cui non ha ancora dato le stelle. */
export type LezioneDaValutare = { class_id: number; inizio: string; fine: string; nome: string; istruttore: string | null }

/**
 * Le lezioni da valutare (24/10/2026): quelle a cui la reception ha segnato la presenza negli ultimi 7 giorni, senza voto.
 * Null se la funzione e' di prima o non risponde: la carta in Home semplicemente non compare.
 */
export async function lezioniDaValutare(): Promise<LezioneDaValutare[] | null> {
  const { ok, dati } = await calendario({ azione: 'da_valutare' })
  return ok && Array.isArray(dati.lezioni) ? (dati.lezioni as LezioneDaValutare[]) : null
}

/** Da 1 a 5 stelle a una lezione; votare di nuovo la stessa lezione cambia il voto. */
export async function valutaLezione(classId: number, stelle: number): Promise<Esito<Record<never, never>>> {
  const { ok, dati } = await calendario({ azione: 'valuta', class_id: classId, stelle })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a registrare il voto. Riprova fra poco.', 'We couldn’t record your rating. Try again shortly.') }
}

/** Il prodotto PerfectGym che apre la prenotazione di una lezione, per chi non ce l'ha compreso. */
export type ProdottoLezione = { product_id: number; nome: string; prezzo: number | null }

/** La carta gia' salvata su PerfectGym: si mostra, e si paga con quella. */
export type CartaSalvata = { id: number; finale: string | null; scadenza: string | null }

/** Cosa serve per comprare l'ingresso: il prodotto, il link gia' aperto e, se c'e', la carta salvata. */
export type DaPagare = { prodotto: ProdottoLezione; url?: string; acquisto_id?: string; carta?: CartaSalvata | null }

export async function prenotaLezione(
  classId: number,
  memberId: number,
): Promise<
  { ok: true; esito: 'prenotato' | 'attesa'; booking_id: number | null; posizione: number | null } | ({ ok: false; errore: string } & Partial<DaPagare>)
> {
  const { ok, dati } = await calendario({ azione: 'prenota', class_id: classId, member_id: memberId })
  if (ok) return { ok: true, esito: dati.esito, booking_id: dati.booking_id ?? null, posizione: typeof dati.posizione === 'number' ? dati.posizione : null }
  // Manca il prodotto (niente abbonamento che comprenda la lezione) e PerfectGym
  // lo vende: il link di pagamento e' gia' aperto.
  if (dati.da_pagare && dati.prodotto) {
    return {
      ok: false,
      errore: dati.errore ?? t('Questa lezione non è compresa nel tuo abbonamento.', 'This class isn’t included in your membership.'),
      prodotto: dati.prodotto,
      url: typeof dati.url === 'string' ? dati.url : undefined,
      acquisto_id: typeof dati.acquisto_id === 'string' ? dati.acquisto_id : undefined,
      carta: dati.carta ?? null,
    }
  }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a prenotare adesso.', 'We couldn’t book right now.') }
}

/** Il link di pagamento di PerfectGym per il prodotto della lezione; dopo il pagamento si torna al calendario con ?acquisto=<id>. */
export async function acquistaLezione(classId: number, memberId: number): Promise<{ ok: true; url: string; acquisto_id: string } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'acquista', class_id: classId, member_id: memberId })
  if (ok && typeof dati.url === 'string') return { ok: true, url: dati.url, acquisto_id: String(dati.acquisto_id ?? '') }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il pagamento adesso.', 'We can’t open the payment right now.') }
}

/** L'ingresso addebitato sulla carta gia' salvata, senza uscire; l'esito come al ritorno dal pagamento. */
export async function pagaLezioneConCarta(acquistoId: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'paga_con_carta', acquisto_id: acquistoId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('La carta non è stata addebitata.', 'The card wasn’t charged.') }
}

export type EsitoAcquisto = {
  stato: 'avviato' | 'prenotato' | 'attesa' | 'errore'
  errore: string | null
  class_id: number
  member_id: number
  /** La lezione pagata, per dire cosa e' successo (la lista d'attesa vale per la stessa categoria). */
  lezione?: string | null
  categoria?: string | null
  inizio?: string | null
  giorno?: string | null
}

export async function esitoAcquistoLezione(acquistoId: string): Promise<{ ok: true; esito: EsitoAcquisto } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'esito_acquisto', acquisto_id: acquistoId })
  if (ok) return { ok: true, esito: dati as unknown as EsitoAcquisto }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a verificare il pagamento adesso.', 'We can’t check the payment right now.') }
}

export async function disdiciLezione(classId: number, memberId: number): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'disdici', class_id: classId, member_id: memberId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a disdire adesso.', 'We couldn’t cancel right now.') }
}

// ---------------------------------------------------------------------------
// Il personal training (15/10/2026): le sedute che la persona ha, gli orari
// liberi dei trainer e la prenotazione vera su PerfectGym (portale-lab-personal).
// Come le lezioni: la seduta si scala alla prenotazione, e chi non ne ha la
// compra (salva e paga) e al ritorno si prenota l'orario scelto.

const personal = (corpo: Record<string, unknown>) => funzione('portale-lab-personal', corpo)

/** Le sedute che la persona ha da usare, per tipo (il pacchetto del mese, un omaggio, una seduta comprata). */
export type CreditoPersonal = { definition_id: number; nome: string; minuti: number; product_id: number; quantita: number; scadenza: string | null }
/** La seduta singola che PerfectGym le vende (da socio o per esterni). */
export type AcquistoPersonal = { definition_id: number; nome: string; minuti: number; prodotto: ProdottoLezione }
export type SedutaPersonal = { booking_id: number; definition_id: number; nome: string; inizio: string; fine: string; trainer_id: number; trainer: string | null; completata: boolean }
/**
 * Un trainer di personal: foto e descrizione dalla sua scheda su PerfectGym,
 * col ripiego del sito (/trainer.json), che da' anche frase e specializzazioni.
 */
export type TrainerPersonal = {
  id: number
  nome: string
  foto: string | null
  descrizione: string | null
  descrizione_da: 'perfectgym' | 'sito' | null
  frase: string | null
  gruppi: { titolo: string; voci: string[] }[]
}

export type StatoPersonal = {
  persone: PersonaCalendario[]
  member_id: number
  /** Falso se PerfectGym non ha risposto: sedute e prenotazioni potrebbero mancare. */
  letti: boolean
  crediti: CreditoPersonal[]
  acquisto: AcquistoPersonal | null
  prenotate: SedutaPersonal[]
  trainer: TrainerPersonal[]
  disdetta_ore: number
  /** La carta salvata su PerfectGym, per pagare senza uscire. */
  carta: CartaSalvata | null
  /** L'abbonamento aggiuntivo PT in vendita: solo a chi ha un abbonamento attivo e non ne ha gia' uno PT. */
  pacchetti: PacchettoPersonal[]
  /** Il nome dell'abbonamento PT che la persona ha gia', se ce l'ha. */
  pacchetto_attivo: string | null
  /** I consensi del contratto da accettare per attivarlo. */
  consensi_contratto: { id: number; nome: string; allegato: string | null }[]
  /** Il conto (IBAN) salvato su PerfectGym, per attivare l'abbonamento PT con l'addebito SEPA. Solo se ci sono pacchetti in vendita. */
  conto?: ContoSalvato | null
}

export type ContoSalvato = { id: number; finale: string | null }

/** Come si paga l'abbonamento PT: la carta (salvata o no), o il conto (salvato, o un IBAN nuovo col suo mandato). */
export type MetodoPacchetto =
  | { metodo: 'carta'; con_carta: boolean }
  | { metodo: 'conto'; conto_salvato: true }
  | { metodo: 'conto'; iban: string; intestatario: string; via: string; cap: string; citta: string }

export type PacchettoPersonal = { piano_id: number; nome: string; sedute: number | null; prezzo_mese: number }

export async function statoPersonal(memberId?: number): Promise<Esito<{ stato: StatoPersonal }>> {
  const { ok, dati } = await personal({ azione: 'stato', member_id: memberId })
  if (ok) return { ok: true, stato: dati as unknown as StatoPersonal }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere il personal training adesso.', 'We can’t load personal training right now.') }
}

/** Un orario libero: l'istante, l'ora di Roma come la scrive PerfectGym (da rimandare), e il trainer. */
export type OrarioPersonal = { inizio: string; locale: string; trainer_id: number }
export type OrariPersonal = { definition_id: number; minuti: number; giorni: string[]; trainer: TrainerPersonal[]; orari: OrarioPersonal[]; incompleti: boolean }

export async function orariPersonal(memberId: number, definitionId: number): Promise<Esito<{ orari: OrariPersonal }>> {
  const { ok, dati } = await personal({ azione: 'orari', member_id: memberId, definition_id: definitionId })
  if (ok) return { ok: true, orari: dati as unknown as OrariPersonal }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere gli orari dei trainer adesso.', 'We can’t load the trainers’ schedules right now.') }
}

export type ScelteSeduta = { member_id: number; definition_id: number; trainer_id: number; locale: string }

export async function prenotaPersonal(s: ScelteSeduta): Promise<{ ok: true; booking_id: number } | ({ ok: false; errore: string } & Partial<DaPagare>)> {
  const { ok, dati } = await personal({ azione: 'prenota', ...s })
  if (ok) return { ok: true, booking_id: Number(dati.booking_id ?? 0) }
  if (dati.da_pagare && dati.prodotto) {
    return {
      ok: false,
      errore: dati.errore ?? t('Non hai sedute da usare.', 'You have no sessions to use.'),
      prodotto: dati.prodotto,
      url: typeof dati.url === 'string' ? dati.url : undefined,
      acquisto_id: typeof dati.acquisto_id === 'string' ? dati.acquisto_id : undefined,
      carta: dati.carta ?? null,
    }
  }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a prenotare adesso.', 'We couldn’t book right now.') }
}

/** Il link di pagamento della seduta; dopo il pagamento si torna a /personal?acquisto=<id> (il backend manda ancora /lab/personal, che vercel.json reindirizza). */
export async function acquistaPersonal(
  s: Omit<ScelteSeduta, 'definition_id'>,
): Promise<{ ok: true; url: string; acquisto_id: string; prodotto: ProdottoLezione | null; carta: CartaSalvata | null } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'acquista', ...s })
  if (ok && typeof dati.url === 'string') {
    return { ok: true, url: dati.url, acquisto_id: String(dati.acquisto_id ?? ''), prodotto: dati.prodotto ?? null, carta: dati.carta ?? null }
  }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il pagamento adesso.', 'We can’t open the payment right now.') }
}

export async function pagaPersonalConCarta(acquistoId: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'paga_con_carta', acquisto_id: acquistoId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('La carta non è stata addebitata.', 'The card wasn’t charged.') }
}

export type EsitoAcquistoPersonal = { stato: 'avviato' | 'prenotato' | 'errore'; errore: string | null; member_id: number; inizio: string | null; trainer: string | null }

export async function esitoAcquistoPersonal(acquistoId: string): Promise<{ ok: true; esito: EsitoAcquistoPersonal } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'esito_acquisto', acquisto_id: acquistoId })
  if (ok) return { ok: true, esito: dati as unknown as EsitoAcquistoPersonal }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a verificare il pagamento adesso.', 'We can’t check the payment right now.') }
}

/** La seduta singola senza orario: con la carta salvata si paga subito, senza si apre la pagina di pagamento. */
export async function compraSedutaPersonal(memberId: number, conCarta: boolean): Promise<{ ok: true; url: string | null } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'compra_seduta', member_id: memberId, con_carta: conCarta })
  if (ok) return { ok: true, url: typeof dati.url === 'string' ? dati.url : null }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il pagamento adesso.', 'We can’t open the payment right now.') }
}

/** L'abbonamento aggiuntivo PT: il contratto e la prima quota (con la carta), o il contratto sul conto (addebito SEPA). */
export async function attivaPacchettoPersonal(
  memberId: number,
  pianoId: number,
  metodo: MetodoPacchetto,
): Promise<{ ok: true; pacchetto_id: string; url: string | null; stato: 'avviato' | 'pagato' | 'addebito' } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'pacchetto', member_id: memberId, piano_id: pianoId, accetto: true, ...metodo })
  if (ok && dati.pacchetto_id) {
    const stato = dati.stato === 'pagato' || dati.stato === 'addebito' ? dati.stato : 'avviato'
    return { ok: true, pacchetto_id: String(dati.pacchetto_id), url: typeof dati.url === 'string' ? dati.url : null, stato }
  }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad attivare l’abbonamento adesso.', 'We can’t activate the membership right now.') }
}

export type EsitoPacchettoPersonal = { stato: 'avviato' | 'pagato' | 'addebito' | 'errore'; errore: string | null; member_id: number; nome: string }

export async function esitoPacchettoPersonal(pacchettoId: string): Promise<{ ok: true; esito: EsitoPacchettoPersonal } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'esito_pacchetto', pacchetto_id: pacchettoId })
  if (ok) return { ok: true, esito: dati as unknown as EsitoPacchettoPersonal }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a verificare il pagamento adesso.', 'We can’t check the payment right now.') }
}

export async function disdiciPersonal(memberId: number, bookingId: number): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'disdici', member_id: memberId, booking_id: bookingId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a disdire adesso.', 'We couldn’t cancel right now.') }
}

// ---------------------------------------------------------------------------
// I pagamenti (tappa 4b): Adyen diretto, soldi veri, tetto di 5 euro. Il lavoro
// con Adyen lo fa `lab-pagamenti` nel CRM; `portale-lab-pagamenti` controlla
// solo chi chiama e che l'abbonamento sia suo.

export type PianoLab = { id: string; nome: string; importo_cent: number; rate_totali: number; intervallo_giorni: number }

export type StatoPagamentoLab = 'creato' | 'in_attesa' | 'in_verifica' | 'autorizzato' | 'rifiutato' | 'errore' | 'annullato' | 'scaduto' | 'abbandonato'
export type StatoAbbonamentoLab = 'in_attesa' | 'attivo' | 'insoluto' | 'completato' | 'chiuso'

/** Gli addebiti che aspettano ancora un esito: le pagine si aggiornano da sole. */
export const STATI_IN_CORSO: StatoPagamentoLab[] = ['creato', 'in_attesa', 'in_verifica']

export type PagamentoLab = {
  riferimento: string
  numero_rata: number
  tentativo: number
  importo_cent: number
  stato: StatoPagamentoLab
  esito: string | null
  motivo: string | null
  creato_il: string
  aggiornato_il: string
}

export type AbbonamentoLab = {
  id: string
  creato_il: string
  piano: string
  importo_cent: number
  rate_totali: number
  intervallo_giorni: number
  prossima_il: string | null
  stato: StatoAbbonamentoLab
  metodo: string | null
  ultime_quattro: string | null
  scadenza_carta: string | null
  segnalazione: string | null
  pagamenti: PagamentoLab[]
}

/** Un pagamento visto dalla sua pagina di stato. */
export type StatoDelPagamento = {
  riferimento: string
  numero_rata: number
  tentativo: number
  importo_cent: number
  stato: StatoPagamentoLab
  esito: string | null
  motivo: string | null
  abbonamento_id: string
  piano: string
  stato_abbonamento: StatoAbbonamentoLab
  rate_totali: number
  prossima_il: string | null
  metodo: string | null
  ultime_quattro: string | null
}

/** Quello che serve al Drop-in di Adyen per aprire il pagamento. */
export type SessioneAdyen = {
  riferimento: string
  clientKey: string
  environment: string
  sessione: { id: string; sessionData: string }
  /** Solo per il Drop-in nativo dell'app: l'indirizzo di ritorno dato ad Adyen insieme alla sessione, che l'SDK deve rimandarle (`lib/adyenNativo.ts`). */
  ritornoNativo?: string
  /** Solo per il Drop-in nativo: l'importo della sessione, in centesimi, per il pulsante «Paga». Lo dice il server, non lo si rifa dal telefono. */
  importoCent?: number
}

type Esito<T> = ({ ok: true } & T) | { ok: false; errore: string; /** La funzione ha risposto 404: la cosa chiesta non c'e' (per questa persona), e riprovare non cambia niente. */ nonTrovato?: boolean }

const pagamenti = (corpo: Record<string, unknown>) => funzione('portale-lab-pagamenti', corpo)

export async function elencoPagamenti(): Promise<Esito<{ piani: PianoLab[]; abbonamenti: AbbonamentoLab[] }>> {
  const { ok, dati } = await pagamenti({ azione: 'elenco' })
  if (ok) return { ok: true, piani: dati.piani, abbonamenti: dati.abbonamenti }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i pagamenti adesso.', 'We can’t load the payments right now.') }
}

export async function avviaPagamento(pianoId: string): Promise<Esito<SessioneAdyen>> {
  // Nell'app nativa con l'SDK di Adyen la sessione e' per l'app (iOS o Android); sul web e senza l'SDK `canale` e' vuoto e la sessione e' quella di sempre.
  const canale = await canaleNativo('pagamenti')
  const { ok, dati } = await pagamenti({ azione: 'checkout', piano_id: pianoId, ...canale })
  if (ok) return { ok: true, riferimento: dati.riferimento, clientKey: dati.clientKey, environment: dati.environment, sessione: dati.sessione, ritornoNativo: canale.ritorno_nativo, importoCent: typeof dati.importo_cent === 'number' ? dati.importo_cent : undefined }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti ad aprire il pagamento adesso.', 'We couldn’t open the payment right now.') }
}

export async function statoPagamento(riferimento: string): Promise<Esito<{ pagamento: StatoDelPagamento }>> {
  const { ok, stato, dati } = await pagamenti({ azione: 'stato', riferimento })
  if (ok) return { ok: true, pagamento: dati.pagamento }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere il pagamento adesso.', 'We can’t load the payment right now.'), nonTrovato: stato === 404 }
}

/** Chiede ad Adyen, dal server, come e' andata la sessione: il browser non fa fede. */
export async function esitoPagamento(riferimento: string, sessioneId: string, risultato: string): Promise<Esito<{ adyen_status: string | null }>> {
  const { ok, dati } = await pagamenti({ azione: 'esito', riferimento, sessione_id: sessioneId, risultato })
  if (ok) return { ok: true, adyen_status: dati.adyen_status ?? null }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a verificare il pagamento adesso.', 'We can’t check the payment right now.') }
}

export async function configurazioneAdyen(): Promise<Esito<{ clientKey: string; environment: string }>> {
  const { ok, dati } = await pagamenti({ azione: 'config' })
  if (ok) return { ok: true, clientKey: dati.clientKey, environment: dati.environment }
  return { ok: false, errore: dati.errore ?? t('Configurazione di Adyen non disponibile.', 'Adyen configuration not available.') }
}

export async function addebitaRata(abbonamentoId: string): Promise<Esito<{ rata: number; esito: string | null; motivo: string | null }>> {
  const { ok, dati } = await pagamenti({ azione: 'addebita', abbonamento_id: abbonamentoId })
  if (ok) return { ok: true, rata: dati.rata, esito: dati.esito ?? null, motivo: dati.motivo ?? null }
  return { ok: false, errore: dati.errore ?? t('Addebito non riuscito.', 'Charge failed.') }
}

export async function chiudiAbbonamento(abbonamentoId: string): Promise<Esito<object>> {
  const { ok, dati } = await pagamenti({ azione: 'chiudi', abbonamento_id: abbonamentoId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a chiuderlo adesso.', 'We couldn’t settle it right now.') }
}

// ---------------------------------------------------------------------------
// L'anagrafica (laboratorio): i dati del titolare dalla scheda di PerfectGym,
// e la modifica dei contatti. Il lavoro lo fa `portale-lab-anagrafica`
// (repo APP-ATHLON), che controlla chi chiama e scrive su PerfectGym:
//
//   { azione: 'leggi' }                          -> { ok, anagrafica }
//   { azione: 'salva', telefono } oppure
//   { azione: 'salva', indirizzo: { via, cap, citta, paese? } }
//                                                -> { ok, anagrafica }
//   `paese` e' il codice ISO, Italia compresa ('IT', se manca); fuori dall'Italia
//   il CAP e' libero. Chi e' residente all'estero ha `residente_estero` e il
//   codice fiscale a null (il segnaposto di PerfectGym non si vede mai).
//   { azione: 'email', email }                   -> { ok }  (manda un codice al nuovo indirizzo)
//   { azione: 'conferma_email', email, codice }  -> { ok, anagrafica }
//   { azione: 'foto', immagine: 'data:image/jpeg;base64,…' } -> { ok, anagrafica, in_arrivo }
//
// L'anagrafica porta anche `foto`: il link firmato (un'ora) della foto del profilo che il club ha su
// PerfectGym, copiata nel bucket privato `foto-soci`, o null se non ne ha una. Si mostra solo nel Profilo.
// Il link e' dentro l'anagrafica - e non in una chiamata a parte - perche' `salva` e `conferma_email`
// rispondono con la stessa anagrafica e la schermata la sostituisce a quella che ha: altrimenti la foto
// sparirebbe dopo aver cambiato il telefono.
//
// **Cambiare la foto** (`foto`, 20/10/2026): la funzione la mette su PerfectGym come foto del profilo e torna con
// l'anagrafica gia' col link nuovo. `in_arrivo` e' vero se le misure non sono ancora pronte: la foto e' salvata e
// il link arriva in qualche minuto, e fino ad allora la schermata tiene quella appena scelta. `foto_modificabile`
// dice se chi guarda puo' cambiarla (non lo staff in vista cliente): l'invito si mostra solo se e' vero, quindi un'app
// pubblicata prima della funzione - che non lo manda - non offre un comando che non risponde.
//
// La funzione non risponde mai 404 per una scheda che non trova: qui il 404
// vuol dire che non e' pubblicata, e il profilo resta in sola lettura.
//
// L'email e' anche quella con cui si entra e con cui il portale trova la
// scheda: cambia solo dopo il codice arrivato al nuovo indirizzo, e la
// funzione aggiorna insieme PerfectGym e l'utente di Supabase Auth.

/** L'indirizzo come lo tiene PerfectGym: via, CAP, citta' e Paese (la provincia non e' un suo campo di testo). Senza `paese` e' l'Italia. */
export type Indirizzo = { via: string | null; cap: string | null; citta: string | null; paese?: string | null }

export type Anagrafica = {
  member_id: number
  nome: string | null
  cognome: string | null
  sesso: string | null
  data_nascita: string | null
  luogo_nascita: string | null
  /** Null per chi e' residente all'estero. */
  codice_fiscale: string | null
  residente_estero?: boolean
  numero: string | null
  email: string | null
  telefono: string | null
  indirizzo: Indirizzo | null
  /** Il link firmato (un'ora) della foto del profilo, se il club ne ha una; null o assente altrimenti. */
  foto?: string | null
  /** Chi guarda puo' cambiare la foto. Assente se la funzione non la conosce ancora: allora non si offre. */
  foto_modificabile?: boolean
}

/** `nonAttiva`: la funzione non c'e' ancora (404): si mostra la sola lettura. */
export type EsitoAnagrafica = { ok: true; anagrafica: Anagrafica } | { ok: false; errore: string; nonAttiva: boolean }

const anagrafica = (corpo: Record<string, unknown>) => funzione('portale-lab-anagrafica', corpo)

function esitoAnagrafica(r: { ok: boolean; stato: number; dati: Record<string, any> }, predefinito: string): EsitoAnagrafica {
  if (r.ok && r.dati.anagrafica) return { ok: true, anagrafica: r.dati.anagrafica as Anagrafica }
  if (r.stato === 404) return { ok: false, nonAttiva: true, errore: t('Al momento i dati non si possono modificare da qui.', 'For now, details can’t be changed from here.') }
  return { ok: false, nonAttiva: false, errore: r.dati.errore ?? predefinito }
}

export async function leggiAnagrafica(): Promise<EsitoAnagrafica> {
  return esitoAnagrafica(await anagrafica({ azione: 'leggi' }), t('Non riusciamo a leggere i tuoi dati adesso.', 'We can’t load your details right now.'))
}

/** Cio' che la persona sistema da sola dal Profilo (04/11/2026). La data di nascita e le schede doppie le vede solo la segreteria: qui non arrivano. */
export type DatoDaControllare = 'telefono' | 'telefono_non_valido'

/**
 * Il controllo dei dati all'accesso: la funzione guarda la scheda (e lascia un compito alla segreteria per cio' che la persona non puo' sistemare).
 * Non solleva mai: se non risponde, o se siamo in vista cliente (la funzione la rifiuta), non c'e' niente da mostrare.
 */
export async function controlloDati(): Promise<DatoDaControllare[]> {
  try {
    const r = await anagrafica({ azione: 'controllo' })
    const da = r.ok && Array.isArray(r.dati.da_completare) ? (r.dati.da_completare as unknown[]) : []
    return da.filter((x): x is DatoDaControllare => x === 'telefono' || x === 'telefono_non_valido')
  } catch {
    return []
  }
}

export async function salvaTelefono(telefono: string): Promise<EsitoAnagrafica> {
  return esitoAnagrafica(await anagrafica({ azione: 'salva', telefono }), t('Non siamo riusciti a salvare il telefono.', 'We couldn’t save the phone number.'))
}

export async function salvaIndirizzo(indirizzo: Indirizzo): Promise<EsitoAnagrafica> {
  return esitoAnagrafica(await anagrafica({ azione: 'salva', indirizzo }), t('Non siamo riusciti a salvare l’indirizzo.', 'We couldn’t save the address.'))
}

export type EsitoFotoProfilo = { ok: true; anagrafica: Anagrafica; inArrivo: boolean } | { ok: false; errore: string }

/** Cambia la foto del profilo. `immagine` e' un «data:image/…;base64,…» (`lib/fotoProfilo.ts`). La funzione ricontrolla i byte. */
export async function caricaFotoProfilo(immagine: string): Promise<EsitoFotoProfilo> {
  const r = await anagrafica({ azione: 'foto', immagine })
  if (r.ok && r.dati.anagrafica) return { ok: true, anagrafica: r.dati.anagrafica as Anagrafica, inArrivo: r.dati.in_arrivo === true }
  // Una funzione che non conosce ancora l'azione: «Azione sconosciuta.» (o 404 se non e' pubblicata).
  if (r.stato === 404 || /sconosciuta|unknown action/i.test(String(r.dati.errore ?? ''))) return { ok: false, errore: t('Il cambio foto non è ancora attivo.', 'Changing your photo isn’t active yet.') }
  return { ok: false, errore: r.dati.errore ?? t('Non siamo riusciti a salvare la foto.', 'We couldn’t save the photo.') }
}

export async function chiediCambioEmail(email: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const r = await anagrafica({ azione: 'email', email })
  if (r.ok) return { ok: true }
  if (r.stato === 404) return { ok: false, errore: t('Al momento i dati non si possono modificare da qui.', 'For now, details can’t be changed from here.') }
  return { ok: false, errore: r.dati.errore ?? t('Non siamo riusciti a mandare il codice al nuovo indirizzo.', 'We couldn’t send the code to the new address.') }
}

export async function confermaCambioEmail(email: string, codice: string): Promise<EsitoAnagrafica> {
  const esito = esitoAnagrafica(await anagrafica({ azione: 'conferma_email', email, codice: codice.replace(/\D/g, '') }), t('Codice sbagliato o scaduto.', 'Wrong or expired code.'))
  // La funzione ha cambiato l'email anche su Supabase Auth: la sessione si
  // rinnova, cosi' il token porta gia' quella nuova.
  if (esito.ok) await supabase.auth.refreshSession().catch(() => undefined)
  return esito
}

// ---------------------------------------------------------------------------
// Athlon TV: gli showcase di Vimeo del club, da `portale-lab-video` (repo
// APP-ATHLON), che tiene il token di Vimeo. Tre livelli: gli showcase, i
// video di uno showcase, i link per riprodurne uno (che scadono: si chiedono
// quando lo si apre).

export type VideoClub = {
  id: string
  titolo: string
  descrizione: string | null
  /** In secondi. */
  durata: number
  copertina: string | null
  miniatura: string | null
  pubblicato_il: string | null
}

/** `fuoco`: il punto della copertina da tenere al centro («50% 70%»), se il sito lo indica. */
export type Vetrina = { id: string; titolo: string; descrizione: string | null; copertina: string | null; fuoco?: string | null; totale: number }

export type VideoDaGuardare = VideoClub & { vetrina: { id: string; titolo: string }; hls: string | null; mp4: string | null }

const tv = (corpo: Record<string, unknown>) => funzione('portale-lab-video', corpo)

export async function leggiVetrine(): Promise<Esito<{ vetrine: Vetrina[] }>> {
  const { ok, dati } = await tv({ azione: 'vetrine' })
  if (ok) return { ok: true, vetrine: dati.vetrine as Vetrina[] }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i video adesso.', 'We can’t load the videos right now.') }
}

export async function leggiVetrina(id: string): Promise<Esito<{ vetrina: Vetrina; video: VideoClub[] }>> {
  const { ok, dati } = await tv({ azione: 'vetrina', id })
  if (ok) return { ok: true, vetrina: dati.vetrina as Vetrina, video: dati.video as VideoClub[] }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i video adesso.', 'We can’t load the videos right now.') }
}

export async function apriVideo(id: string, vetrina: string): Promise<Esito<{ video: VideoDaGuardare }>> {
  const { ok, dati } = await tv({ azione: 'video', id, vetrina })
  if (ok) return { ok: true, video: dati.video as VideoDaGuardare }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il video adesso.', 'We can’t open the video right now.') }
}

// ---------------------------------------------------------------------------
// Le schede di allenamento (16/10/2026), da `portale-lab-schede` (repo
// APP-ATHLON): le schede del socio (standard, personalizzate, AI), la seduta
// col registro delle serie, lo storico e i progressi, e la scheda chiesta
// all'agente AI. Il piano e' in docs/piano-schede.md.

export type RigaSchedaLab = {
  id: string
  tipo: 'standard' | 'personalizzata' | 'ai' | 'socio'
  titolo: string
  descrizione: string | null
  obiettivo: string | null
  livello: string | null
  giorni_settimana: number | null
  giorni: number
  /** Per i piani del socio: scritto a mano, letto da un file, scritto dall'agente AI o copiato dal club. */
  origine?: 'creata' | 'importata' | 'ai' | 'club' | null
  /** `vasca` per un piano di nuoto (20/10/2026): si legge in vasca e non si registra. Assente (o `sala`) per gli altri. */
  ambiente?: 'sala' | 'vasca'
  ultimo: string | null
}

export type SedutaBreve = { id: string; inizio: string; fine: string | null; giorno_nome: string | null; titolo: string | null; serie: number }

export type EsercizioScheda = {
  /** La riga della scheda (scheda_esercizi.id). */
  id: string
  esercizio_id: string
  nome: string
  serie: number
  ripetizioni: string
  carico: string | null
  /** La percentuale del massimale: con il massimale del socio diventa chili (o ripetizioni a corpo libero). */
  percentuale: number | null
  recupero_serie: number
  recupero_dopo: number
  superserie: string | null
  note: string | null
  immagini: string[]
  video: string | null
  muscoli_primari: string[]
  attrezzo: string | null
  istruzioni: string[]
  /** Una frase che dice cos'e' l'esercizio (libreria MoveKit); mancano per gli esercizi del club. */
  descrizione?: string | null
  /** Gli errori da evitare (libreria MoveKit). */
  errori_comuni?: string[]
  /** L'incremento della macchina (5 kg, 2,5 kg) e il peso minimo: i chili si arrotondano per difetto a quelli. */
  incremento_kg: number | null
  peso_minimo_kg: number | null
  /** Se l'esercizio e' nel test dei massimali, e come: a carico, a ripetizioni o a tempo (secondi di tenuta: il plank). */
  test: 'carico' | 'ripetizioni' | 'secondi' | null
}

/** Il massimale del socio per un esercizio: i kg stimati per una ripetizione, le ripetizioni massime, o i secondi di tenuta. */
export type Massimale = {
  esercizio_id: string
  tipo: 'carico' | 'ripetizioni' | 'secondi'
  massimale: number
  kg: number | null
  ripetizioni: number
  /**
   * test: dal test dei massimali; seduta: tarato alla prima seduta; stima:
   * stimato dal test del distretto (arti superiori, inferiori, core) per un
   * esercizio che il test non misura. La stima non e' salvata: la prima
   * seduta la sostituisce.
   */
  fonte: 'test' | 'seduta' | 'stima'
  creato_il: string
}

/**
 * Il test: quando e' stato fatto e quanti esercizi (`fatti` di `totale`). `minimo` sono gli esercizi che bastano per calcolare i chili (uno per gruppo: 3);
 * `per_verifica` quelli che servono per controllare che i conti tornino (due per ogni distretto di carico e il plank: 5). Opzionali: un server di prima non li manda.
 */
export type StatoTest = { ultimo: string | null; fatti: number; totale: number; giorni: number; minimo?: number; per_verifica?: number }

/** Lo stato del test di una persona, gruppo per gruppo (04/11/2026). */
export type CoperturaTest = {
  gruppi: Record<'superiore' | 'core' | 'inferiore', { fatti: number; minimo: number; per_verifica: number; stato: 'assente' | 'singola' | 'verificata' | 'discordante' }>
  /** Un esercizio per gruppo: i chili si calcolano. */
  calcolabile: boolean
  /** Due per distretto di carico, e tornano fra loro. */
  verificato: boolean
  /** I distretti i cui test non tornano fra loro. */
  discordanti: ('superiore' | 'inferiore')[]
  minimo: number
  per_verifica: number
}

export type GiornoSchedaLab = { id: string; nome: string; note: string | null; esercizi: EsercizioScheda[] }

export type SchedaLab = {
  id: string
  tipo: 'standard' | 'personalizzata' | 'ai' | 'socio'
  titolo: string
  descrizione: string | null
  obiettivo: string | null
  livello: string | null
  giorni_settimana: number | null
  rivista_il: string | null
  /** Per i piani del socio: da dove viene. */
  origine?: 'creata' | 'importata' | 'ai' | 'club' | null
  /** `vasca` se e' un piano di nuoto: si legge in vasca e non si registra (il server rifiuta `inizia`). */
  ambiente?: 'sala' | 'vasca'
  /** Il ciclo a settimane di un piano proprio (31/10/2026): durata e giorno d'inizio (lo mette il server). I numeri di ogni settimana li ricava l'app (`schede/progressione.ts`). */
  progressione?: { settimane: number; inizio: string } | null
  giorni: GiornoSchedaLab[]
}

export type SerieFatta = { numero: number; ripetizioni: number | null; kg: number | null; secondi: number | null }
export type Precedente = { esercizio_id: string; inizio: string; serie: SerieFatta[] }
/** `rpe`: lo sforzo percepito della serie, da 0 a 10 (11/11/2026). Facoltativo: null se la persona non l'ha indicato, assente con una funzione di prima. */
export type SerieSeduta = SerieFatta & { scheda_esercizio_id: string; esercizio_id: string; rpe?: number | null }

export type Questionario = {
  /** «Salute» non e' un obiettivo dell'agente (20/10/2026): l'app porta al personal trainer e non manda la richiesta; la funzione la rifiuta. */
  obiettivo: string
  livello: 'principiante' | 'intermedio' | 'esperto'
  giorni: number
  /** 30, 45, 60 o 80 (dal 20/10/2026; prima anche 75 e 90, che la funzione accetta ancora da un'app rimasta aperta). */
  minuti: number
  /** Cosa usa in sala (20/10/2026): una prevalenza, non un'esclusiva. `tutto`, `macchine` (isotoniche e cavi), `pesi_liberi` (e corpo libero). */
  attrezzatura: 'tutto' | 'macchine' | 'pesi_liberi'
  limitazioni: string
  note: string
  // Le risposte del questionario a passi (22/10/2026): tutte facoltative, una chiave c'e' solo se la risposta e' stata data. I valori sono
  // quelli di `schede/questionario.ts`, che la funzione ricontrolla (`_shared/schede/questionario.ts` di APP-ATHLON): una funzione che non li
  // conosce ancora li ignora, e il piano si scrive con le sette risposte di sempre.
  focus?: string[]
  esperienza?: string
  strumenti?: string[]
  capacita?: Record<string, string>
  zone?: string[]
  giornata?: string
  evita?: string[]
  cardio?: string
  intensita?: string
  fascia?: string
}

const schedeLab =(corpo: Record<string, unknown>) => funzione('portale-lab-schede', corpo)

/**
 * Quanto il socio viene al club e quando (22/10/2026): lo calcola la funzione dagli ingressi al tornello e dalle presenze alle lezioni, e
 * serve a due cose soltanto, il «consigliato» dei questionari e una riga che dice «la fai gia'». **Non va a nessun servizio esterno.**
 * `fasce` sono quelle dei Consigli (mattina_presto, mattina, pranzo, pomeriggio, sera, weekend), `giorni` quelli della settimana (1 = lunedi').
 * Null se la funzione e' di prima, o se non ha potuto leggere i dati: allora le schermate sono quelle di sempre.
 */
export type AbitudineTrain = {
  /** Vero se la storia e' abbastanza lunga (almeno tre settimane) perche' le medie dicano qualcosa. */
  affidabile: boolean
  giorni_28: number
  giorni_a_settimana: number
  ultima_visita_giorni: number | null
  fasce: string[]
  giorni: number[]
  lezioni_8_sett: number
  /** Un giorno in piu' di quanti ne fa oggi (al massimo sei); null se l'abitudine non e' affidabile. */
  volte_sostenibili: number | null
}

/** Ripulisce quello che arriva dalla funzione: una funzione di prima non lo manda, e un valore strano non deve rompere una schermata. */
export function abitudineDa(x: unknown): AbitudineTrain | null {
  if (!x || typeof x !== 'object') return null
  const a = x as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const g28 = num(a.giorni_28)
  const perSett = num(a.giorni_a_settimana)
  if (g28 === null || perSett === null) return null
  return {
    affidabile: a.affidabile === true,
    giorni_28: g28,
    giorni_a_settimana: perSett,
    ultima_visita_giorni: num(a.ultima_visita_giorni),
    fasce: Array.isArray(a.fasce) ? a.fasce.filter((f): f is string => typeof f === 'string') : [],
    giorni: Array.isArray(a.giorni) ? a.giorni.filter((g): g is number => typeof g === 'number' && g >= 1 && g <= 7) : [],
    lezioni_8_sett: num(a.lezioni_8_sett) ?? 0,
    volte_sostenibili: num(a.volte_sostenibili),
  }
}

/**
 * I piani composti al mese, di sala e di vasca insieme (05/11/2026: tre nel mese di calendario). `rinnovo` e' il primo del mese
 * dopo (`YYYY-MM-DD`); `in_prova` c'e' solo con una funzione di prima, che non applicava il limite.
 */
export type QuotaPiani = { usate: number; massimo: number; in_prova?: boolean; periodo?: 'mese'; rinnovo?: string }

export async function elencoSchede(): Promise<Esito<{ schede: RigaSchedaLab[]; ultimi: SedutaBreve[]; ai: QuotaPiani; abitudine: AbitudineTrain | null; test: StatoTest }>> {
  const { ok, dati } = await schedeLab({ azione: 'elenco' })
  if (ok) return { ok: true, schede: dati.schede, ultimi: dati.ultimi, ai: dati.ai, abitudine: abitudineDa(dati.abitudine), test: dati.test ?? { ultimo: null, fatti: 0, totale: 0, giorni: 42 } }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i tuoi piani adesso.', 'We can’t load your plans right now.') }
}

export async function leggiSchedaLab(id: string): Promise<Esito<{ scheda: SchedaLab; precedenti: Precedente[]; massimali: Massimale[]; ultimoTest: string | null; giorniTest: number; discordanti: string[] }>> {
  const { ok, dati } = await schedeLab({ azione: 'scheda', id })
  if (ok) {
    return {
      ok: true,
      scheda: dati.scheda,
      precedenti: dati.precedenti ?? [],
      massimali: dati.massimali ?? [],
      ultimoTest: dati.ultimo_test ?? null,
      giorniTest: dati.giorni_test ?? 42,
      // I distretti i cui test non tornano fra loro: le stime sono sul piu' prudente (04/11/2026).
      discordanti: Array.isArray(dati.discordanti) ? dati.discordanti : [],
    }
  }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il piano adesso.', 'We can’t open the plan right now.') }
}

/**
 * Il ciclo a settimane di un piano proprio: `settimane` da 3 a 8 lo accende (o lo cambia), `null` lo toglie; `riparti` lo fa ricominciare da oggi. Il giorno d'inizio lo
 * mette il server. Serve la funzione aggiornata (`progressione`): una vecchia risponde «Azione sconosciuta» e il piano resta com'e'.
 */
export async function impostaProgressione(id: string, settimane: number | null, riparti = false): Promise<Esito<{ progressione: { settimane: number; inizio: string } | null }>> {
  try {
    const { ok, dati } = await schedeLab({ azione: 'progressione', id, settimane, ...(riparti ? { riparti: true } : {}) })
    if (ok) return { ok: true, progressione: dati.progressione ?? null }
    const nonConosciuta = typeof dati?.errore === 'string' && /sconosciuta|unknown/i.test(dati.errore)
    return { ok: false, errore: nonConosciuta ? t('La progressione a settimane non è ancora attiva: riprova fra qualche giorno.', 'Weekly progression isn’t available yet: try again in a few days.') : (dati?.errore ?? t('Non siamo riusciti a salvare. Riprova.', 'We couldn’t save. Try again.')) }
  } catch {
    return { ok: false, errore: t('Non siamo riusciti a salvare. Controlla la connessione e riprova.', 'We couldn’t save. Check your connection and try again.') }
  }
}

/** `rpe`: la funzione sa salvare l'RPE di una serie (11/11/2026). Falso con una funzione di prima: la seduta non mostra il pulsante. */
export async function iniziaSeduta(schedaId: string, giornoId: string): Promise<Esito<{ allenamento: { id: string; inizio: string }; serie: SerieSeduta[]; rpe: boolean }>> {
  const { ok, dati } = await schedeLab({ azione: 'inizia', scheda_id: schedaId, giorno_id: giornoId })
  if (ok)
    return {
      ok: true,
      allenamento: dati.allenamento,
      serie: (dati.serie ?? []).map((s: any) => ({ ...s, kg: s.kg == null ? null : Number(s.kg), rpe: rpeValido(s.rpe) })),
      rpe: dati.rpe === true,
    }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a iniziare l’allenamento adesso.', 'We can’t start the workout right now.') }
}

export async function segnaSerie(s: { allenamento_id: string; scheda_esercizio_id: string; esercizio_id: string; numero: number; ripetizioni: number | null; kg: number | null; secondi?: number | null; rpe?: number | null }): Promise<Esito<object>> {
  const { ok, dati } = await schedeLab({ azione: 'serie', ...s })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('La serie non è stata salvata.', 'The set wasn’t saved.') }
}

export async function togliSerie(allenamentoId: string, schedaEsercizioId: string, numero: number): Promise<Esito<object>> {
  const { ok, dati } = await schedeLab({ azione: 'togli_serie', allenamento_id: allenamentoId, scheda_esercizio_id: schedaEsercizioId, numero })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('La serie non è stata tolta.', 'The set wasn’t removed.') }
}

export async function chiudiSeduta(allenamentoId: string, note?: string): Promise<Esito<{ vuota: boolean }>> {
  const { ok, dati } = await schedeLab({ azione: 'fine', allenamento_id: allenamentoId, note })
  if (ok) return { ok: true, vuota: dati.vuota === true }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a chiudere l’allenamento adesso.', 'We can’t finish the workout right now.') }
}

export type SedutaStorico = SedutaBreve & { note: string | null; esercizi: number; volume: number }
export type EsercizioFatto = { esercizio_id: string; nome: string; immagini: string[]; sedute: number; kg_massimo: number | null }

export async function storicoAllenamenti(): Promise<Esito<{ allenamenti: SedutaStorico[]; esercizi: EsercizioFatto[] }>> {
  const { ok, dati } = await schedeLab({ azione: 'storico' })
  if (ok) return { ok: true, allenamenti: dati.allenamenti, esercizi: dati.esercizi }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i tuoi allenamenti adesso.', 'We can’t load your workouts right now.') }
}

export type SedutaEsercizio = { inizio: string; kg_massimo: number | null; ripetizioni_massime: number | null; volume: number; serie: SerieFatta[] }

export async function progressiEsercizio(esercizioId: string): Promise<Esito<{ esercizio: { id: string; nome: string; immagini: string[]; video: string | null; muscoli_primari: string[] }; sedute: SedutaEsercizio[] }>> {
  const { ok, dati } = await schedeLab({ azione: 'progressi', esercizio_id: esercizioId })
  if (ok) return { ok: true, esercizio: dati.esercizio, sedute: dati.sedute }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i progressi adesso.', 'We can’t load your progress right now.') }
}

/**
 * «Componi il tuo piano»: l'agente ci mette qualche decina di secondi (20/10/2026: da quando scrive con Gemini; prima, coi modelli
 * gratuiti, andava in timeout). **Non salva niente**: risponde con una bozza (19/10/2026) che il socio rivede, modifica e conferma;
 * solo allora e' un piano suo (`salvaSchedaMia`, origine «ai»). Nei testi per il socio non si nomina l'agente: «comporre».
 */
/** Il numero della richiesta, se la funzione lo manda (una funzione di prima no): `{ richiesta }` da mettere nella bozza, o niente. */
const richiestaDa = (dati: { richiesta?: unknown }): { richiesta?: string } =>
  typeof dati.richiesta === 'string' || typeof dati.richiesta === 'number' ? { richiesta: String(dati.richiesta) } : {}

export async function chiediSchedaAi(questionario: Questionario): Promise<Esito<{ bozza: BozzaScheda }>> {
  const { ok, dati } = await schedeLab({ azione: 'chiedi_ai', questionario })
  if (ok) return { ok: true, bozza: { ...dati.bozza, origine: 'ai', ...richiestaDa(dati) } }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a comporre il piano adesso. Riprova fra qualche minuto.', 'We couldn’t put together the plan right now. Try again in a few minutes.') }
}

// Il piano di nuoto (20/10/2026): per chi si allena in vasca, al Nuoto Libero. Un piano come gli altri, con gli esercizi di nuoto:
// «4 x 100 m, recupero 20 secondi». Il Nuoto Libero chiede stile libero e dorso: senza, la funzione dice dove si comincia.

export const STILI = ['stile_libero', 'dorso', 'rana', 'farfalla'] as const
export type Stile = (typeof STILI)[number]
/** Quanti metri di fila senza fermarsi: serve a non scrivere una ripetuta che la persona non regge. */
export const CONTINUO = ['sotto_100', '100_400', '400_1000', 'oltre_1000'] as const
export type Continuo = (typeof CONTINUO)[number]

export type QuestionarioNuoto = {
  obiettivo: string
  livello: 'principiante' | 'intermedio' | 'esperto'
  /** Sedute a settimana, da 1 a 4. */
  volte: number
  /** Quanto dura una seduta in vasca: 30, 45 o 60 (il turno del Nuoto Libero e' di un'ora). */
  minuti: 30 | 45 | 60
  stili: Stile[]
  continuo: Continuo
  limitazioni: string
  note: string
}

/** Chi sa stile libero e dorso puo' fare il Nuoto Libero; chi no comincia dalla Scuola Nuoto Adulti. Stessa regola della funzione. */
export const saNuotareAbbastanza = (stili: readonly Stile[]): boolean => stili.includes('stile_libero') && stili.includes('dorso')

/** Cosa si dice a chi non ha stile libero e dorso: dove si comincia, non un «no». Le stesse parole della funzione. */
export const MESSAGGIO_SCUOLA_NUOTO =
  t('Il Nuoto Libero chiede di saper nuotare stile libero e dorso. Se non ci sei ancora si parte dalla Scuola Nuoto Adulti: sono gli istruttori a dirti quando passare al nuoto libero.', 'Nuoto Libero requires being able to swim freestyle and backstroke. If you’re not there yet, you start with Scuola Nuoto Adulti: the instructors will tell you when to move on to lap swimming.')

/**
 * Il piano di nuoto scritto dall'agente: ci mette qualche decina di secondi e **non salva niente** (come `chiediSchedaAi`):
 * risponde con una bozza che il socio rivede, modifica e conferma; solo allora e' un piano suo (`salvaSchedaMia`, origine «ai»).
 */
export async function chiediPianoNuoto(questionario: QuestionarioNuoto): Promise<Esito<{ bozza: BozzaScheda }>> {
  const { ok, dati } = await schedeLab({ azione: 'chiedi_nuoto', questionario })
  if (ok) return { ok: true, bozza: { ...dati.bozza, origine: 'ai', ...richiestaDa(dati) } }
  // Le frasi della funzione sono scritte per il socio: il piano di nuoto non ancora attivo, la regola del Nuoto Libero, la quota.
  // Una funzione pubblicata prima del piano di nuoto non conosce l'azione: per il socio e' la stessa cosa del workflow spento.
  if (dati.errore === 'Azione sconosciuta.' || dati.errore === 'Unknown action.') return { ok: false, errore: t('Il piano di nuoto non è ancora attivo: puoi scriverlo tu.', 'The swim plan isn’t active yet: you can write it yourself.') }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a comporre il piano di nuoto adesso. Riprova fra qualche minuto.', 'We couldn’t put together the swim plan right now. Try again in a few minutes.') }
}

// I piani del socio (19/10/2026): quelli che ha scelto lui. Vengono da quattro strade (`origine`): li scrive a mano,
// li importa da una foto o da un PDF, li fa scrivere all'agente AI, o li copia da un piano del club. In tutti i casi li
// rivede, li modifica se vuole e li conferma (`salvaSchedaMia`). Il personale del club li legge dal CRM.

/** Un esercizio della libreria accesa, o uno suo (`mio`), per sceglierlo in una scheda. Senza video e poster. */
export type EsercizioLibreria = { id: string; nome: string; muscoli_primari: string[]; attrezzo: string | null; categoria: string | null; mio: boolean; ambiente?: 'sala' | 'vasca' }

/** Un esercizio come lo si salva: della libreria (`esercizio_id`) o con un nome suo (`nome_libero`). */
export type EsercizioDaSalvare = {
  esercizio_id?: string | null
  nome_libero?: string
  serie: number
  ripetizioni: string
  carico: string
  recupero_serie: number
  recupero_dopo: number
  superserie: string
  note: string
  /** Il carico in % del massimale (20-100), di un piano del club o dell'agente: nell'app diventa i chili del socio. */
  percentuale?: number | null
}

export type SchedaDaSalvare = {
  /** Se c'e', si modifica quel piano (deve essere suo). */
  id?: string
  titolo: string
  descrizione?: string
  obiettivo?: string
  livello?: string
  origine?: 'creata' | 'importata' | 'ai' | 'club'
  /** Solo con origine «ai»: la richiesta all'agente da cui viene il piano (`BozzaScheda.richiesta`). */
  richiesta?: string
  giorni: { nome: string; note: string; esercizi: EsercizioDaSalvare[] }[]
}

/** Un esercizio letto da un file: `nome_scritto` e' com'era scritto, `nome` quello della libreria se e' stato abbinato. */
export type EsercizioBozza = {
  esercizio_id: string | null
  nome: string
  nome_scritto: string
  serie: number
  ripetizioni: string
  carico: string
  recupero_serie: number
  recupero_dopo: number
  superserie: string
  note: string
  percentuale?: number | null
}

/** Un piano letto da un file o scritto dall'agente: non e' salvato, il socio lo rivede, lo modifica e lo conferma. */
export type BozzaScheda = {
  titolo: string
  descrizione: string
  obiettivo?: string
  livello?: string
  /** Da dove viene: lo mette chi la riceve (`importaScheda`, `chiediSchedaAi`). */
  origine?: 'importata' | 'ai'
  /** `vasca` per un piano di nuoto scritto dall'agente (`chiediPianoNuoto`): le righe sono blocchi di vasca, «4 x 100 m». */
  ambiente?: 'vasca'
  /**
   * Il numero della richiesta all'agente (11/11/2026), che la funzione manda con la bozza e l'app rimanda con `salvaSchedaMia`: cosi' il piano che il socio
   * tiene porta le risposte non sanitarie al questionario, per «Come sono fatte» nel CRM. Con una funzione di prima non c'e', e non cambia niente.
   */
  richiesta?: string
  giorni: { nome: string; note: string; esercizi: EsercizioBozza[] }[]
}

export async function eserciziLibreria(): Promise<Esito<{ esercizi: EsercizioLibreria[] }>> {
  const { ok, dati } = await schedeLab({ azione: 'esercizi' })
  if (ok) return { ok: true, esercizi: dati.esercizi ?? [] }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire gli esercizi adesso.', 'We can’t open the exercises right now.') }
}

/**
 * Le miniature (il poster, gia' firmato) degli esercizi della libreria indicati, per l'editor di un piano composto o
 * importato (23/10/2026): senza immagine «Allungamento addominali, variante 3» non dice niente. Chi non ha il poster, o
 * non e' della libreria accesa, non compare. **Serve la funzione aggiornata** (`anteprime`): una vecchia risponde
 * «Azione sconosciuta» e l'editor resta com'era.
 */
export async function anteprimeEsercizi(ids: string[]): Promise<Esito<{ anteprime: { id: string; immagini: string[] }[] }>> {
  const { ok, dati } = await schedeLab({ azione: 'anteprime', ids })
  if (ok) return { ok: true, anteprime: Array.isArray(dati.anteprime) ? dati.anteprime : [] }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a caricare le immagini adesso.', 'We can’t load the images right now.') }
}

export async function salvaSchedaMia(scheda: SchedaDaSalvare): Promise<Esito<{ id: string }>> {
  const { ok, dati } = await schedeLab({ azione: 'salva_mia', ...scheda })
  if (ok) return { ok: true, id: dati.id }
  return { ok: false, errore: dati.errore ?? t('Il piano non è stato salvato. Riprova fra qualche minuto.', 'The plan wasn’t saved. Try again in a few minutes.') }
}

/** Toglie un piano del socio dall'elenco (si ritira: lo storico degli allenamenti ne tiene il titolo). */
export async function eliminaSchedaMia(id: string): Promise<Esito<{ eliminata: true }>> {
  const { ok, dati } = await schedeLab({ azione: 'elimina_mia', id })
  if (ok) return { ok: true, eliminata: true }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a togliere il piano. Riprova fra qualche minuto.', 'We couldn’t remove the plan. Try again in a few minutes.') }
}

/**
 * Legge un piano da una o piu' foto o PDF («data:…;base64,…», fino a quattro, in ordine: le pagine dello stesso piano).
 * Ci mette una decina di secondi, a volte un minuto. **Serve la funzione aggiornata** (`files`): una vecchia risponde «Manca il file».
 */
export async function importaScheda(files: string[]): Promise<Esito<{ bozza: BozzaScheda; daControllare: number }>> {
  const { ok, dati } = await schedeLab({ azione: 'importa', files })
  if (ok) return { ok: true, bozza: { ...dati.bozza, origine: 'importata' }, daControllare: Number(dati.da_controllare ?? 0) }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a leggere il piano adesso. Riprova fra qualche minuto, o scrivilo a mano.', 'We couldn’t read the plan right now. Try again in a few minutes, or write it by hand.') }
}

/**
 * L'indirizzo di un'immagine o di un video degli esercizi. I file della libreria MoveKit stanno in un
 * bucket privato (la licenza non permette indirizzi pubblici): la funzione li da' gia' come link firmati
 * (indirizzi interi), che qui restano com'e'. Un percorso «movekit/…» arrivato senza firma vuol dire che
 * la firma non e' riuscita: non c'e' un indirizzo pubblico da costruire, e si mostra il segnaposto.
 * Un percorso senza prefisso e' nel bucket pubblico «esercizi» (i video che il club carica dal CRM).
 */
export function urlEsercizio(percorso: string | null | undefined): string | null {
  if (!percorso) return null
  if (/^https?:\/\//.test(percorso)) return percorso
  if (percorso.startsWith('movekit/')) return null
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/esercizi/${percorso}`
}

// Il test dei massimali: gli esercizi del test (superiore, core, inferiore)
// coi risultati precedenti, e il salvataggio di un risultato.

export type EsercizioTest = {
  id: string
  nome: string
  immagini: string[]
  video: string | null
  istruzioni: string[]
  muscoli_primari: string[]
  attrezzo: string | null
  test: 'carico' | 'ripetizioni' | 'secondi'
  test_gruppo: 'superiore' | 'core' | 'inferiore'
  test_ordine: number | null
  incremento_kg: number | null
  peso_minimo_kg: number | null
  ultimo: { kg: number | null; ripetizioni: number; massimale: number; creato_il: string } | null
}

export async function testMassimali(): Promise<Esito<{ esercizi: EsercizioTest[]; ultimo: string | null; giorni: number; copertura: CoperturaTest | null }>> {
  const { ok, dati } = await schedeLab({ azione: 'test' })
  if (ok) return { ok: true, esercizi: dati.esercizi, ultimo: dati.ultimo ?? null, giorni: dati.giorni ?? 42, copertura: dati.copertura ?? null }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il test adesso.', 'We can’t open the test right now.') }
}

export type VideoCapacita = Partial<Record<'squat' | 'flessioni' | 'plank', { immagini: string[]; video: string | null }>>

/** Poster e video (link firmati dalla funzione) dei tre movimenti dei test del questionario di sala. Senza la funzione aggiornata o senza rete: niente video, mai un errore. */
export async function videoCapacita(): Promise<VideoCapacita> {
  try {
    const { ok, dati } = await schedeLab({ azione: 'video_capacita' })
    return ok && dati.video && typeof dati.video === 'object' ? (dati.video as VideoCapacita) : {}
  } catch {
    return {}
  }
}

/** Un esercizio di una sessione di mobilita' a richiesta (31/10/2026): un minuto, con poster e video (link firmati dalla funzione). */
export type PassoMobilita = {
  id: string
  nome: string
  tipo: 'mobilita' | 'stretching'
  secondi: number
  descrizione: string
  istruzioni: string[]
  immagini: string[]
  video: string | null
}
export type SessioneMobilita = { focus: string; /** I minuti veri: meno di quelli chiesti se la libreria adatta non basta. */ minuti: number; esercizi: PassoMobilita[] }

/**
 * Una sessione di mobilita' a richiesta: la funzione sceglie gli esercizi della libreria (mobilita' e stretching, a corpo libero, un minuto ciascuno).
 * I fastidi (`zone`, facoltativi) servono solo a togliere i movimenti che li caricano e **non si conservano**. Con una funzione di prima o senza rete: un errore, mai un crash.
 */
export async function sessioneMobilita(r: { focus: string; minuti: number; zone?: string[]; variante?: number }): Promise<{ ok: true; sessione: SessioneMobilita } | { ok: false; errore: string }> {
  try {
    const { ok, dati } = await schedeLab({ azione: 'mobilita_sessione', focus: r.focus, minuti: r.minuti, ...(r.zone?.length ? { zone: r.zone } : {}), ...(r.variante ? { variante: r.variante } : {}) })
    if (ok && dati.sessione && Array.isArray(dati.sessione.esercizi)) return { ok: true, sessione: dati.sessione as SessioneMobilita }
    const nonConosciuta = typeof dati?.errore === 'string' && /sconosciuta|unknown/i.test(dati.errore)
    return { ok: false, errore: nonConosciuta ? t('Le sessioni di mobilità non sono ancora attive: riprova fra qualche giorno.', 'Mobility sessions aren’t available yet: try again in a few days.') : (dati?.errore ?? t('Non siamo riusciti a preparare la sessione. Riprova.', 'We couldn’t put the session together. Try again.')) }
  } catch {
    return { ok: false, errore: t('Non siamo riusciti a preparare la sessione. Controlla la connessione e riprova.', 'We couldn’t put the session together. Check your connection and try again.') }
  }
}

export async function salvaTestMassimale(esercizioId: string, kg: number | null, ripetizioni: number): Promise<Esito<{ massimale: number; tipo: 'carico' | 'ripetizioni' | 'secondi'; copertura: CoperturaTest | null }>> {
  const { ok, dati } = await schedeLab({ azione: 'salva_test', esercizio_id: esercizioId, kg, ripetizioni })
  if (ok) return { ok: true, massimale: Number(dati.massimale), tipo: dati.tipo, copertura: dati.copertura ?? null }
  return { ok: false, errore: dati.errore ?? t('Il risultato non è stato salvato.', 'The result wasn’t saved.') }
}

// ---------------------------------------------------------------------------
// I dati del corpo (16/10/2026): altezza, peso, circonferenze, composizione.

export type Misura = {
  id: string
  /** «AAAA-MM-GG». */
  data: string
  altezza_cm: number | null
  peso_kg: number | null
  vita_cm: number | null
  fianchi_cm: number | null
  petto_cm: number | null
  braccio_cm: number | null
  coscia_cm: number | null
  massa_grassa_pct: number | null
  massa_magra_kg: number | null
  note: string | null
  inserita_da: string
}

export type NuovaMisura = Partial<Omit<Misura, 'id' | 'inserita_da'>>

const misureLab = (corpo: Record<string, unknown>) => funzione('portale-lab-misure', corpo)

/** Il sesso per la stima delle calorie, scelto dal socio (quello di PerfectGym non e' affidabile). */
export type SessoCalcolo = 'm' | 'f' | null

/** Il consenso alle misure del corpo (20/10/2026): la versione dell'informativa accettata e quando. */
export type ConsensoCorpo = { versione: string; accettato_il: string }

/**
 * Le misurazioni del socio, dalla piu' vecchia, e il sesso scelto per le calorie.
 * **Senza consenso la funzione risponde vuoto e `consenso: null`** (misure e sesso non escono). `consenso` assente
 * (`undefined`) vuol dire una funzione che non conosce ancora il consenso: niente blocco e niente comando di revoca.
 */
export async function elencoMisure(): Promise<Esito<{ misure: Misura[]; sesso: SessoCalcolo; consenso?: ConsensoCorpo | null }>> {
  const { ok, dati } = await misureLab({ azione: 'elenco' })
  if (ok) {
    const consenso: ConsensoCorpo | null | undefined = dati.consenso === undefined ? undefined : dati.consenso && typeof dati.consenso.versione === 'string' ? dati.consenso : null
    return { ok: true, misure: dati.misure ?? [], sesso: dati.sesso === 'm' || dati.sesso === 'f' ? dati.sesso : null, consenso }
  }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i tuoi dati adesso.', 'We can’t load your details right now.') }
}

/** Il consenso alle misure del corpo: dati relativi alla salute, si usano solo dopo. */
export async function daiConsensoCorpo(versione: string): Promise<Esito<{ consenso: ConsensoCorpo }>> {
  const { ok, dati } = await misureLab({ azione: 'consenso', versione })
  if (ok && dati.consenso) return { ok: true, consenso: dati.consenso }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a registrare il consenso. Riprova.', 'We couldn’t record your consent. Try again.') }
}

/** Ritira il consenso: la funzione cancella le misure e il sesso scritti dal socio. */
export async function revocaConsensoCorpo(): Promise<Esito<object>> {
  const { ok, dati } = await misureLab({ azione: 'revoca' })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a ritirare il consenso. Riprova.', 'We couldn’t withdraw your consent. Try again.') }
}

/** Una misurazione: quella dello stesso giorno si sostituisce. */
export async function salvaMisura(m: NuovaMisura): Promise<Esito<{ misura: Misura }>> {
  const { ok, dati } = await misureLab({ azione: 'salva', ...m })
  if (ok) return { ok: true, misura: dati.misura }
  return { ok: false, errore: dati.errore ?? t('I dati non sono stati salvati.', 'The details weren’t saved.') }
}

export async function salvaSessoCalcolo(sesso: SessoCalcolo): Promise<Esito<{ sesso: SessoCalcolo }>> {
  const { ok, dati } = await misureLab({ azione: 'sesso', sesso })
  if (ok) return { ok: true, sesso: dati.sesso ?? null }
  return { ok: false, errore: dati.errore ?? t('La scelta non è stata salvata.', 'The choice wasn’t saved.') }
}

export async function eliminaMisura(id: string): Promise<Esito<object>> {
  const { ok, dati } = await misureLab({ azione: 'elimina', id })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('La misurazione non è stata tolta.', 'The measurement wasn’t removed.') }
}

// ---------------------------------------------------------------------------
// Il metodo di pagamento vero (PerfectGym), dall'app (16/10/2026): la stessa
// procedura del link per email, senza l'email. `portale-lab-pagamenti` apre la
// richiesta del nucleo e da' il suo token; il resto lo fa `portale-link`.

export async function tokenMetodoPagamento(): Promise<Esito<{ token: string }>> {
  const { ok, dati } = await pagamenti({ azione: 'metodo_link' })
  if (ok && typeof dati.token === 'string') return { ok: true, token: dati.token }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il metodo di pagamento adesso.', 'We can’t open the payment method right now.') }
}

// ---------------------------------------------------------------------------
// I pagamenti veri del nucleo (15/10/2026), dal mirror di PerfectGym:
// lo storico, le quote scadute da saldare e quelle future.

export type VoceMovimento = { cosa: string; dettaglio: string | null; importo: number | null }

export type Movimento = {
  id: string
  data: string | null
  importo: number
  esito: 'riuscito' | 'rimborso' | 'in_corso' | 'da_pagare'
  metodo: string | null
  titolo: string
  voci: VoceMovimento[]
  /** Il nome del familiare, se non e' per il titolare. */
  per: string | null
  scadenza: string | null
  nota: string | null
}

export type QuotaFutura = {
  id: string
  scadenza: string
  importo: number
  totale: number
  titolo: string
  dettaglio: string | null
  per: string | null
  metodo: string | null
  /** «AAAA-MM» della carta registrata. */
  carta_scade: string | null
}

/** Con quale carta si propone di saldare le quote scadute: le ultime cifre e la scadenza («AAAA-MM»), o null. */
export type CartaSaldo = { finale: string | null; scade: string | null }

/**
 * Un pagamento elettronico in corso (03/11/2026): un addebito SEPA che impiega 3-5 giorni lavorativi, o una carta appena partita. Finche' c'e'
 * la quota resta «da pagare» su PerfectGym, e pagarla di nuovo sarebbe un doppio addebito: l'app lo scrive al posto dei pulsanti di pagamento.
 */
export type PagamentoInCorso = { metodo: 'sepa' | 'carta'; importo: number; dal: string; per: string | null }

export async function movimentiPagamenti(): Promise<
  Esito<{ storico: Movimento[]; daSaldare: Movimento[]; futuri: QuotaFutura[]; cartaSaldo: CartaSaldo | null; inCorso: PagamentoInCorso[]; inCorsoFrase: string | null }>
> {
  const { ok, dati } = await pagamenti({ azione: 'movimenti' })
  // `saldo` manca con la funzione di prima (22/10/2026): niente carta da proporre, si paga dalla pagina della carta.
  // `in_corso` manca con la funzione di prima del 03/11/2026: nessun blocco dall'app (resta quello del server, che rifiuta il pagamento).
  if (ok) {
    return {
      ok: true,
      storico: dati.storico ?? [],
      daSaldare: dati.da_saldare ?? [],
      futuri: dati.futuri ?? [],
      cartaSaldo: dati.saldo?.carta ?? null,
      inCorso: Array.isArray(dati.in_corso) ? dati.in_corso : [],
      inCorsoFrase: typeof dati.in_corso_frase === 'string' ? dati.in_corso_frase : null,
    }
  }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i tuoi pagamenti adesso.', 'We can’t load your payments right now.') }
}

// ---------------------------------------------------------------------------
// Il saldo delle quote scadute (22/10/2026): si pagano adesso, con la carta salvata o dalla pagina della carta di Adyen.
// Il server rilegge le quote da PerfectGym e non addebita niente se il totale non e' quello mostrato (`importo_cambiato`).

export type EsitoSaldo =
  | { ok: true; stato: 'in_corso' | 'pagato'; url?: undefined }
  | { ok: true; stato: 'redirect'; url: string }
  | { ok: false; errore: string; importoCambiato?: number; nonAttivo?: boolean; /** C'e' gia' un pagamento in corso: il server non ha addebitato niente. */ inCorso?: boolean }

export async function saldaPagamenti(totale: number, conCarta: boolean): Promise<EsitoSaldo> {
  const { ok, dati } = await pagamenti({ azione: 'salda', totale, con_carta: conCarta })
  if (ok && dati.stato === 'redirect' && typeof dati.url === 'string') return { ok: true, stato: 'redirect', url: dati.url }
  if (ok && (dati.stato === 'in_corso' || dati.stato === 'pagato')) return { ok: true, stato: dati.stato }
  // Una funzione di prima non conosce l'azione: il pagamento da qui non c'e' ancora.
  if (dati.errore === 'Azione sconosciuta.' || dati.errore === 'Unknown action.') {
    return { ok: false, nonAttivo: true, errore: t('Il pagamento dall’app non è ancora attivo: aggiorna il metodo di pagamento, il club riprova l’addebito.', 'Paying from the app isn’t available yet: update your payment method, the club will retry the charge.') }
  }
  return {
    ok: false,
    errore: dati.errore ?? t('Non siamo riusciti a completare il pagamento adesso.', 'We couldn’t complete the payment right now.'),
    importoCambiato: dati.codice === 'importo_cambiato' && typeof dati.totale === 'number' ? dati.totale : undefined,
    inCorso: dati.codice === 'pagamento_in_corso' ? true : undefined,
  }
}

export type StatoSaldo = { stato: 'nessuno' | 'in_corso' | 'pagato' | 'fallito'; daPagare: number | null; motivo: string | null }

export async function esitoSaldo(): Promise<Esito<StatoSaldo>> {
  const { ok, dati } = await pagamenti({ azione: 'saldo_esito' })
  if (ok) return { ok: true, stato: dati.stato ?? 'nessuno', daPagare: typeof dati.da_pagare === 'number' ? dati.da_pagare : null, motivo: dati.motivo ?? null }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a verificare il pagamento adesso.', 'We can’t check the payment right now.') }
}
