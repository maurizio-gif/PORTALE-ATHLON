import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { CampoPaese } from '@/components/CampoPaese'
import { CampoTelefono } from '@/components/CampoTelefono'
import { CasellaResidenteEstero } from '@/components/CasellaResidenteEstero'
import { CampoData } from '@/components/CampoData'
import { ChiGestisceCarta, ChiGestisceConto } from '@/components/ChiGestisce'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { GuestPassAttivo } from '@/features/guest-pass/GuestPassAttivo'
import { PerChi } from '@/features/guest-pass/PerChi'
import { Scelta } from '@/components/Scelta'
import { Forte, Testo } from '@/components/Testo'
import {
  CAMPI,
  cosaComprende,
  fineSettimana,
  giornoBreve,
  giorniFra,
  giornoLungo,
  GRUPPI,
  nomeMetodo,
  problemaPassword,
  REGOLAMENTO_URL,
  REGOLE_PRENOTAZIONE,
  type PaginaGuestPass,
} from '@/lib/guestPass'

import { problemaCodiceFiscale } from '@/lib/codiceFiscale'
import { capLiberoValido, pulisciCapLibero } from '@/lib/residenteEstero'
import { spazio, tinta, useColori } from '@/theme'

// Il Guest Pass dal link (in prova): una pagina sola, in quattro blocchi.
//   1. i tuoi dati: tutti, gia' compilati (da PerfectGym e da quello che la
//      persona ha confermato sul sito) e modificabili; quelli che mancano —
//      codice fiscale, nascita, indirizzo — sono obbligatori. «I miei dati sono
//      corretti»: senza, non si attiva. Le correzioni vanno su PerfectGym alla
//      conferma, e un Lead si converte li';
//   2. il giorno d'inizio, entro 14 giorni;
//   3. come pagare: la carta o il conto gia' salvati (si mostrano), una carta
//      nuova (si paga e si salva in un passo, sulla pagina di Adyen) o un IBAN
//      nuovo; accanto, chi li custodisce (Adyen, GoCardless);
//   4. il riepilogo (decisione del 13/10/2026): chi, da quando a quando,
//      quanto e come si paga, senza impegno, cosa comprende, le regole di
//      prenotazione, e un solo flag — Termini e Condizioni Generali,
//      Regolamento del club e Condizioni di pagamento (consensi 36 e 20).
//      Niente privacy (data sul sito), niente clausole
//      vessatorie, niente firma.
// Poi «Conferma e attiva»: solo allora il Guest Pass si carica su PerfectGym;
// con la carta si paga la quota sulla pagina di PerfectGym e si torna qui.
//
// **Prima di tutto, per chi e'** (21/10/2026): il blocco «Per chi è il Guest Pass?» (`PerChi`), per se' o per un figlio
// dai 13 ai 17 anni. Finche' non si sceglie, il resto non si vede. Per un figlio i dati del primo blocco sono quelli del
// genitore (paga ed e' il tutore), il contratto e' intestato al figlio e il riepilogo lo dice. A Guest Pass fatto, se
// c'e' un altro idoneo, «Attiva un altro Guest Pass» apre un link nuovo (`anche_per`). Con una funzione di prima
// (`scelta` assente) la pagina e' quella di sempre.

function apri(url: string) {
  if (Platform.OS === 'web') window.location.assign(url)
  else Linking.openURL(url)
}

/** Una pagina del sito in un'altra scheda: chi legge non perde quello che ha compilato. */
function apriAccanto(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener')
  else Linking.openURL(url)
}

/**
 * Il solo flag del link, che vale due consensi su PerfectGym: Termini e
 * Condizioni Generali e Regolamento (36) e Consenso Contratto con le condizioni
 * di pagamento (20). La privacy l'ha data sul sito.
 */
const ACCETTO = 'Accetto i Termini e Condizioni Generali, il Regolamento del club e le Condizioni di pagamento.'

// Sopra questa larghezza (desktop) i dati vanno su due colonne; tablet e telefono una.
const DUE_COLONNE = 1024

/** Un gruppo di campi, col suo titoletto: due colonne su desktop. */
function Gruppo({ titolo, due, children }: { titolo: string; due: boolean; children: React.ReactNode[] }) {
  const c = useColori()
  return (
    <View style={[stili.gruppo, { borderColor: c.bordo, backgroundColor: tinta(c.testo, 0.025) }]}>
      <Text style={[stili.titoloGruppo, { color: c.accento }]}>{titolo.toUpperCase()}</Text>
      <View style={due ? { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spazio.tre / 2 } : { gap: spazio.tre }}>
        {children.map((figlio, i) => (
          <View key={i} style={due ? { width: '50%', paddingHorizontal: spazio.tre / 2, paddingBottom: spazio.tre } : undefined}>
            {figlio}
          </View>
        ))}
      </View>
    </View>
  )
}

function Blocco({ numero, titolo, fatto, children }: { numero: number; titolo: string; fatto: boolean; children: React.ReactNode }) {
  const c = useColori()
  return (
    <View style={[stili.blocco, { borderColor: fatto ? c.ok : c.bordo, backgroundColor: c.superficie }]}>
      <View style={stili.testaBlocco}>
        <Text style={[stili.numero, { backgroundColor: fatto ? c.ok : c.accento, color: c.suAccento }]}>{fatto ? '✓' : numero}</Text>
        <Text style={[stili.titoloBlocco, { color: c.testo }]}>{titolo}</Text>
      </View>
      {children}
    </View>
  )
}

export function AttivaGuestPass({ token, nome, iniziale }: { token: string; nome: string | null; iniziale: PaginaGuestPass }) {
  const c = useColori()
  const { carta: tornatoCarta, pagato: tornatoPagato } = useLocalSearchParams<{ carta?: string; pagato?: string }>()
  const [p, setP] = useState(iniziale)
  // Oltre ai campi del riepilogo, `residente_estero` ('1'/'0') e `paese`: le chiavi che `guest-pass` legge e scrive.
  const daPerfectGym = (pp: PaginaGuestPass): Record<string, string> => ({
    ...Object.fromEntries(Object.keys(CAMPI).map((k) => [k, String((pp.persona as Record<string, unknown>)[k] ?? '')])),
    residente_estero: pp.persona.residente_estero ? '1' : '0',
    paese: pp.persona.paese ?? '',
  })
  const [dati, setDati] = useState<Record<string, string>>(daPerfectGym(iniziale))
  const [confermati, setConfermati] = useState(!!iniziale.scelte.dati_confermati)
  // La password non si salva fra un passo e l'altro: va su PerfectGym solo alla conferma.
  const [password, setPassword] = useState({ nuova: '', conferma: '' })
  // Un solo flag, che vale tutti i consensi che la pagina riceve (oggi 36 e 20): si
  // accetta il flag, non un elenco di id, cosi' un consenso aggiunto lato server
  // non resta fuori da una spunta data prima.
  const [accetto, setAccetto] = useState(() => iniziale.consensi.every((k) => iniziale.scelte.consensi.includes(k.id)))
  const [inizio, setInizio] = useState<string | null>(iniziale.inizio.scelto)
  // La scelta del metodo: uno gia' salvato («s<id>»), una carta nuova o un IBAN nuovo.
  const [sceltaMetodo, setSceltaMetodo] = useState<string | null>(() => {
    const id = iniziale.scelte.payment_source_id
    if (id && (iniziale.salvati ?? []).some((m) => m.id === id)) return `s${id}`
    return iniziale.scelte.metodo
  })
  const { width } = useWindowDimensions()
  const dueColonne = width >= DUE_COLONNE
  const [conto, setConto] = useState({ iban: '', intestatario: '', via: iniziale.persona.via ?? '', cap: iniziale.persona.cap ?? '', citta: iniziale.persona.citta ?? '' })
  const [occupato, setOccupato] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  // L'errore dei dati, mostrato nel primo blocco: la verifica si fa li', alla spunta.
  const [erroreDati, setErroreDati] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<{ testo: string; tono: 'ok' | 'attenzione' | 'errore' } | null>(null)
  const giaFatto = useRef(false)

  async function ricarica() {
    const { ok, dati: d } = await chiamaLink(token, 'pagina')
    if (ok) {
      const { ok: _ok, ...resto } = d
      const nuova = resto as unknown as PaginaGuestPass
      setP(nuova)
      setDati(daPerfectGym(nuova))
      // Per un figlio l'ultimo giorno d'inizio puo' essere piu' vicino (il giorno prima dei 18 anni).
      setInizio((x) => (x && (x > nuova.inizio.al || x < nuova.inizio.dal) ? null : x))
      return nuova
    }
    return null
  }

  // Il ritorno dalla pagina della carta (?carta=1) o dal pagamento (?pagato=1).
  useEffect(() => {
    if (giaFatto.current) return
    giaFatto.current = true
    if (tornatoCarta) {
      ;(async () => {
        setOccupato('carta')
        const { ok, dati: d } = await chiamaLink(token, 'carta_esito')
        if (ok && d.salvata && d.attivato) {
          // Il Guest Pass c'e' gia': con la carta nuova si paga subito.
          const r = await chiamaLink(token, 'ripaga')
          setOccupato(null)
          if (r.ok && typeof r.dati.url === 'string') return apri(r.dati.url)
          setAvviso({ testo: 'Carta salvata. Ora puoi pagare il Guest Pass.', tono: 'ok' })
          return void (await ricarica())
        }
        setOccupato(null)
        if (ok && d.salvata) setAvviso({ testo: 'Carta salvata. Ora conferma per attivare il Guest Pass.', tono: 'ok' })
        else if (ok && d.motivo) setAvviso({ testo: `La carta non è stata salvata. ${d.motivo}`, tono: 'errore' })
        else setAvviso({ testo: 'Non vediamo ancora la carta: se hai completato la pagina, riprova fra un minuto, altrimenti inseriscila di nuovo.', tono: 'attenzione' })
        await ricarica()
      })()
    }
    if (tornatoPagato) {
      ;(async () => {
        setOccupato('pagamento')
        for (let i = 0; i < 20; i++) {
          const { ok, dati: d } = await chiamaLink(token, 'pagamento_esito')
          if (ok && d.pagato) {
            setOccupato(null)
            setAvviso({ testo: 'Pagamento ricevuto: il tuo Guest Pass è attivo.', tono: 'ok' })
            return ricarica()
          }
          if (ok && d.fallito) {
            setOccupato(null)
            setAvviso({ testo: `Il pagamento non è andato a buon fine. ${d.motivo ?? ''}`.trim(), tono: 'errore' })
            return ricarica()
          }
          await new Promise((r) => setTimeout(r, 4000))
        }
        setOccupato(null)
        setAvviso({ testo: 'Non vediamo ancora il pagamento. Se l’hai completato, ricarica la pagina fra qualche minuto.', tono: 'attenzione' })
        await ricarica()
      })()
    }
  }, [tornatoCarta, tornatoPagato, token])

  const persona = p.persona
  const scelta = p.scelta ?? null
  const perFiglio = scelta?.per === 'figlio'
  const figlio = perFiglio ? scelta?.figlio ?? null : null
  const nomeFiglio = figlio ? `${figlio.nome ?? ''} ${figlio.cognome ?? ''}`.trim() : ''
  const primoFiglio = figlio?.nome?.split(/\s+/)[0] ?? null
  // Con una funzione di prima non c'e' la scelta: e' per chi ha l'email, come sempre.
  const sceltoPerChi = !scelta || !!scelta.per
  // Il blocco «Per chi» c'e' solo con la funzione nuova: gli altri si numerano dopo di lui.
  const n0 = scelta ? 1 : 0
  const giorni = giorniFra(p.inizio.dal, p.inizio.al)
  const tuttiIConsensi = accetto
  const originali = daPerfectGym(p)
  // Residente all'estero: niente codice fiscale (e niente controlli su di lui), il Paese e' obbligatorio e il CAP e' libero.
  const estero = dati.residente_estero === '1'
  const cambiati: Record<string, string> = Object.fromEntries(Object.entries(dati).filter(([k, v]) => v.trim() !== (originali[k] ?? '').trim()))
  if (estero) {
    // Con la spunta il codice fiscale non parte (insieme alla spunta il server risponde 400), e il Paese parte con lei.
    delete cambiati.codice_fiscale
    if ('residente_estero' in cambiati || 'paese' in cambiati) cambiati.paese = dati.paese
  } else {
    // Senza la spunta il Paese non si manda: l'indirizzo e' italiano.
    delete cambiati.paese
  }
  // Il codice fiscale deve essere ben scritto e di questa persona (cognome, nome, nascita).
  const erroreCf = estero ? null : problemaCodiceFiscale(dati)
  const senzaPaese = estero && !dati.paese
  const erroreCap = estero && !!dati.cap.trim() && !capLiberoValido(dati.cap)
  const datiCompleti =
    Object.keys(CAMPI).every((k) => (estero && k === 'codice_fiscale') || (dati[k] ?? '').trim()) && !erroreCf && !senzaPaese && !erroreCap

  // La casella cambia il tipo di CAP: tolta la spunta, un CAP che non ha cinque cifre non vale piu'.
  function cambiaEstero() {
    setDati((x) => ({ ...x, residente_estero: x.residente_estero === '1' ? '0' : '1', cap: x.residente_estero === '1' && !/^\d{5}$/.test(x.cap) ? '' : x.cap }))
    setConfermati(false)
    setErroreDati(null)
  }
  const salvati = p.salvati ?? []
  const cartaSalvata = salvati.find((m) => m.tipo === 'carta') ?? null
  const salvatoScelto = sceltaMetodo?.startsWith('s') ? (salvati.find((m) => `s${m.id}` === sceltaMetodo) ?? null) : null
  const metodo: 'carta' | 'iban' | null = salvatoScelto ? salvatoScelto.tipo : sceltaMetodo === 'carta' || sceltaMetodo === 'iban' ? sceltaMetodo : null
  const metodoPronto =
    !!salvatoScelto || sceltaMetodo === 'carta' || (sceltaMetodo === 'iban' && p.scelte.metodo === 'iban' && p.scelte.metodo_pronto)

  async function scegliMetodo(scelta: string) {
    setSceltaMetodo(scelta)
    setErrore(null)
    const m = salvati.find((x) => `s${x.id}` === scelta)
    if (m) await salva({ metodo: m.tipo, usa_salvato: m.id })
    else if (scelta === 'carta') await salva({ metodo: 'carta', nuovo: true })
    else await salva({ metodo: 'iban' })
    await ricarica()
  }

  async function salva(extra: Record<string, unknown> = {}): Promise<boolean> {
    setErrore(null)
    const { ok, dati: d } = await chiamaLink(token, 'salva', {
      ...(Object.keys(cambiati).length ? { dati: cambiati } : {}),
      dati_confermati: confermati && datiCompleti,
      // Solo a flag spuntato: una lista vuota il server la rifiuta, e il flag sta in fondo, dopo il metodo.
      ...(accetto ? { consensi: p.consensi.map((k) => k.id) } : {}),
      inizio,
      metodo,
      ...extra,
    })
    if (!ok && d.campo === 'dati') {
      setConfermati(false)
      setErroreDati(d.errore ?? 'Controlla i tuoi dati.')
    } else if (!ok) setErrore(d.errore ?? 'Non siamo riusciti a salvare adesso.')
    return ok
  }

  // «I miei dati sono corretti»: la verifica si fa subito (decisione del
  // 13/10/2026), non alla conferma finale. Il server controlla i dati e li porta
  // su PerfectGym; se uno non va, lo dice qui e la spunta si toglie.
  async function confermaDati() {
    setErroreDati(null)
    if (confermati) return setConfermati(false)
    if (erroreCf) return // l'avviso del codice fiscale e' gia' sotto i dati
    if (!datiCompleti) return setErroreDati('Completa tutti i dati prima di confermarli.')
    setConfermati(true)
    setOccupato('dati')
    const { ok, dati: d } = await chiamaLink(token, 'salva', {
      ...(Object.keys(cambiati).length ? { dati: cambiati } : {}),
      dati_confermati: true,
    })
    setOccupato(null)
    if (!ok) {
      setConfermati(false)
      setErroreDati(d.errore ?? 'Non siamo riusciti a controllare i dati adesso. Riprova fra qualche minuto.')
      // Un'anagrafica simile apre la verifica della segreteria: la pagina lo dice in cima.
      return void (await ricarica())
    }
    await ricarica()
  }

  async function salvaConto() {
    setOccupato('iban')
    if (p.stato === 'aperta' && !(await salva({ metodo: 'iban' }))) return setOccupato(null)
    const { ok, dati: d } = await chiamaLink(token, 'iban', conto)
    setOccupato(null)
    if (!ok) return setErrore(d.errore ?? 'Non siamo riusciti a salvare il conto.')
    setAvviso({ testo: d.addebito ? `Conto salvato: i ${p.prezzo} € li addebitiamo sul conto. Il tuo Guest Pass è attivo.` : 'Conto salvato. Ora conferma per attivare il Guest Pass.', tono: 'ok' })
    await ricarica()
  }

  async function conferma() {
    setOccupato('conferma')
    if (!(await salva())) return setOccupato(null)
    const { ok, dati: d } = await chiamaLink(token, 'conferma', password.nuova ? { password: password.nuova } : {})
    setOccupato(null)
    if (!ok) return setErrore(d.errore ?? 'Non siamo riusciti ad attivare il Guest Pass adesso.')
    if (d.pagamento === 'da_pagare' && typeof d.url === 'string') return apri(d.url)
    if (d.pagamento === 'link_non_aperto') {
      setAvviso({ testo: 'Il Guest Pass è registrato, ma non riusciamo ad aprire il pagamento adesso: riprova da qui fra qualche minuto.', tono: 'attenzione' })
      return void (await ricarica())
    }
    setAvviso({
      testo:
        d.pagamento === 'addebito'
          ? `Fatto: ${perFiglio ? `il Guest Pass di ${primoFiglio ?? 'tuo figlio'}` : 'il tuo Guest Pass'} è attivo. I ${p.prezzo} € saranno addebitati sul conto.`
          : `Fatto: ${perFiglio ? `il Guest Pass di ${primoFiglio ?? 'tuo figlio'}` : 'il tuo Guest Pass'} è attivo.`,
      tono: 'ok',
    })
    await ricarica()
  }

  async function ripaga(come: { nuova?: boolean; usa_salvato?: number } = {}) {
    setErrore(null)
    setOccupato(come.nuova ? 'nuova' : 'ripaga')
    const { ok, dati: d } = await chiamaLink(token, 'ripaga', come)
    setOccupato(null)
    if (ok && typeof d.url === 'string') return apri(d.url)
    if (ok && d.pagamento === 'pagato') {
      setAvviso({ testo: 'Pagamento ricevuto: il tuo Guest Pass è attivo.', tono: 'ok' })
      return void (await ricarica())
    }
    setErrore(d.errore ?? 'Non riusciamo ad aprire il pagamento adesso. Riprova fra qualche minuto.')
  }

  // «Attiva un altro Guest Pass»: un link nuovo dello stesso genitore, dove si sceglie per chi (anche per email).
  async function unAltro() {
    setErrore(null)
    setOccupato('altro')
    const { ok, dati: d } = await chiamaLink(token, 'anche_per')
    setOccupato(null)
    if (ok && typeof d.token === 'string') return router.replace(`/r/${d.token}`)
    setErrore(d.errore ?? 'Non riusciamo ad aprire un altro Guest Pass adesso. Riprova fra qualche minuto.')
  }
  const altri = p.anche_per ?? []
  const nomiAltri = altri.map((x) => (x.chi === 'me' ? 'te' : (x.nome ?? '').split(/\s+/)[0] || 'un figlio'))
  const unAltroGuestPass =
    p.stato === 'attivato' && altri.length ? (
      <View style={{ gap: spazio.due }}>
        <Testo>
          {`Puoi attivare il Guest Pass anche per ${nomiAltri.length > 1 ? `${nomiAltri.slice(0, -1).join(', ')} e ${nomiAltri[nomiAltri.length - 1]}` : nomiAltri[0]}, o per un altro figlio dai 13 ai 17 anni: ognuno ha il suo.`}
        </Testo>
        <Bottone testo="Attiva un altro Guest Pass" variante="contorno" onPress={unAltro} inCorso={occupato === 'altro'} disabilitato={!!occupato} />
        {errore ? <Avviso>{errore}</Avviso> : null}
      </View>
    ) : null

  if (p.stato === 'attivato') {
    const daPagare = p.pagamento_stato === 'da_pagare' || p.pagamento_stato === 'sconosciuto'
    const periodo = p.inizio.scelto ? `dal ${giornoLungo(p.inizio.scelto)} al ${giornoLungo(fineSettimana(p.inizio.scelto))}` : null
    if (!daPagare) {
      return (
        <GuestPassAttivo
          email={p.persona.email}
          nuovoAccount={!!p.password?.obbligatoria}
          nome={p.persona.nome}
          cognome={p.persona.cognome}
          inizio={p.inizio.scelto}
          fine={p.inizio.scelto ? fineSettimana(p.inizio.scelto) : null}
          prezzo={p.prezzo}
          // L'avviso appena confermato dice gia' dell'addebito: non due volte.
          addebito={p.pagamento_stato === 'addebito' && !avviso}
          avviso={avviso}
          figlio={perFiglio ? { nome: nomeFiglio || null, primo: primoFiglio } : null}
          dopo={unAltroGuestPass}
        />
      )
    }
    return (
      <Pagina
        titolo="Manca il pagamento"
        sottotitolo={`${perFiglio ? `Il Guest Pass di ${primoFiglio ?? 'tuo figlio'}` : 'Il tuo Guest Pass'} ${periodo ? `(${periodo}) ` : ''}è registrato: per usarlo manca il pagamento di ${p.resta ?? p.prezzo} €.`}
      >
        {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}
        {occupato === 'pagamento' ? (
          <View style={{ flexDirection: 'row', gap: spazio.due, alignItems: 'center' }}>
            <ActivityIndicator color={c.accento} />
            <Testo>Aspettiamo l’esito del pagamento…</Testo>
          </View>
        ) : null}
        {cartaSalvata ? (
          <Bottone
            testo={`Paga ${p.resta ?? p.prezzo} € con la ${nomeMetodo(cartaSalvata).replace(/^Carta/, 'carta')}`}
            onPress={() => ripaga({ usa_salvato: cartaSalvata.id })}
            inCorso={occupato === 'ripaga'}
            disabilitato={!!occupato}
          />
        ) : null}
        <Bottone
          testo={cartaSalvata ? 'Paga con un’altra carta' : `Paga ${p.resta ?? p.prezzo} € con la carta`}
          variante={cartaSalvata ? 'contorno' : undefined}
          onPress={() => ripaga({ nuova: true })}
          inCorso={occupato === 'nuova'}
          disabilitato={!!occupato}
        />
        <ChiGestisceCarta salvaPagando={!cartaSalvata} />
        <Blocco numero={1} titolo="Oppure: addebito su conto" fatto={false}>
          <Testo variante="piccolo">Salva il conto e i {p.prezzo} € li addebitiamo noi: il Guest Pass resta com’è.</Testo>
          <ChiGestisceConto />
          <Campo etichetta="IBAN" value={conto.iban} onChangeText={(v) => setConto((x) => ({ ...x, iban: v }))} autoCapitalize="characters" />
          <Campo etichetta="Intestatario del conto" value={conto.intestatario} onChangeText={(v) => setConto((x) => ({ ...x, intestatario: v }))} />
          <Campo etichetta="Via e numero civico" value={conto.via} onChangeText={(v) => setConto((x) => ({ ...x, via: v }))} />
          <View style={{ flexDirection: 'row', gap: spazio.due }}>
            <Campo etichetta="CAP" value={conto.cap} onChangeText={(v) => setConto((x) => ({ ...x, cap: v }))} keyboardType={estero ? 'default' : 'number-pad'} maxLength={estero ? 12 : undefined} />
            <Campo etichetta="Città" value={conto.citta} onChangeText={(v) => setConto((x) => ({ ...x, citta: v }))} />
          </View>
          <Bottone testo="Salva il conto" variante="contorno" onPress={salvaConto} inCorso={occupato === 'iban'} disabilitato={!!occupato} />
        </Blocco>
        {errore ? <Avviso>{errore}</Avviso> : null}
      </Pagina>
    )
  }

  const passwordObbligatoria = !!p.password?.obbligatoria
  const errorePassword = problemaPassword(password.nuova, password.conferma, passwordObbligatoria)
  const pronto = !p.verifica && sceltoPerChi && datiCompleti && confermati && !errorePassword && tuttiIConsensi && !!inizio && metodoPronto
  const metodoLeggibile = salvatoScelto
    ? salvatoScelto.tipo === 'carta'
      ? `${nomeMetodo(salvatoScelto)}, addebito alla conferma`
      : `addebito su conto (SEPA), ${nomeMetodo(salvatoScelto).toLowerCase()}`
    : sceltaMetodo === 'carta'
      ? 'carta, pagamento alla conferma sulla pagina protetta di Adyen'
      : sceltaMetodo === 'iban'
        ? 'addebito su conto (SEPA)'
        : null
  return (
    <Pagina
      titolo={
        perFiglio && primoFiglio
          ? `Attiva il Guest Pass di ${primoFiglio}`
          : !sceltoPerChi
            ? nome
              ? `Ciao ${nome}, per chi è il Guest Pass?`
              : 'Per chi è il Guest Pass?'
            : nome
              ? `Ciao ${nome}, attiva il tuo Guest Pass`
              : 'Attiva il tuo Guest Pass'
      }
      sottotitolo={`Una settimana al club a ${p.prezzo} €.`}
    >
      {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}
      {/* Un'anagrafica simile: finche' la segreteria non risponde (per email) non si conferma. */}
      {p.verifica ? <Avviso tono={p.verifica.stato === 'bloccata' ? 'errore' : 'attenzione'}>{p.verifica.testo}</Avviso> : null}

      {scelta ? (
        <Blocco numero={1} titolo="Per chi è il Guest Pass" fatto={!!scelta.per}>
          <PerChi token={token} scelta={scelta} onScelto={ricarica} />
        </Blocco>
      ) : null}

      {sceltoPerChi ? (
      <>
      <Blocco numero={n0 + 1} titolo={perFiglio ? 'I tuoi dati, come genitore' : 'I tuoi dati'} fatto={datiCompleti && confermati}>
        <Testo variante="piccolo">
          {perFiglio
            ? `Sei tu a pagare e ad attivare il Guest Pass di ${primoFiglio ?? 'tuo figlio'} come genitore: servono i tuoi dati. Quelli che mancano — di solito codice fiscale, data di nascita e indirizzo — servono per registrarti al club.`
            : 'Controlla i tuoi dati e correggili se serve. Quelli che mancano — di solito codice fiscale, data di nascita e indirizzo — servono per registrarti al club.'}
        </Testo>
        {GRUPPI.map((g) => (
          <Gruppo key={g.titolo} titolo={g.titolo} due={dueColonne}>
            {[
              // Residente all'estero: il Paese apre il gruppo dell'indirizzo.
              ...(g.titolo === 'Residenza' && estero
                ? [
                    <CampoPaese
                      key="paese"
                      value={dati.paese ?? ''}
                      onChange={(v) => {
                        setDati((x) => ({ ...x, paese: v }))
                        setConfermati(false)
                        setErroreDati(null)
                      }}
                      errore={senzaPaese}
                      style={{ backgroundColor: c.sfondo }}
                    />,
                  ]
                : []),
              ...g.campi.flatMap((k) => {
                const cambia = (v: string) => {
                  setDati((x) => ({ ...x, [k]: v }))
                  setConfermati(false)
                  setErroreDati(null)
                }
                // Con la spunta il codice fiscale non c'e': resta la casella, sotto il posto che occupava.
                const casella = k === 'codice_fiscale' ? [<CasellaResidenteEstero key="estero" spuntata={estero} onCambia={cambiaEstero} />] : []
                if (k === 'codice_fiscale' && estero) return casella
                if (k === 'telefono') {
                  return [<CampoTelefono key={k} etichetta={CAMPI[k]} value={dati[k] ?? ''} onChange={cambia} errore={!(dati[k] ?? '').trim()} sfondo={c.sfondo} />]
                }
                if (k === 'nascita') {
                  return [<CampoData key={k} etichetta={CAMPI[k]} value={dati[k] ?? ''} onChange={cambia} errore={!(dati[k] ?? '').trim()} sfondo={c.sfondo} />]
                }
                const capLibero = k === 'cap' && estero
                return [
                  <Campo
                    key={k}
                    etichetta={CAMPI[k]}
                    value={dati[k] ?? ''}
                    onChangeText={k === 'codice_fiscale' ? (v) => cambia(v.toUpperCase()) : capLibero ? (v) => cambia(pulisciCapLibero(v)) : cambia}
                    autoCapitalize={k === 'codice_fiscale' || capLibero ? 'characters' : k === 'email' ? 'none' : 'words'}
                    keyboardType={k === 'email' ? 'email-address' : k === 'telefono' ? 'phone-pad' : k === 'cap' && !estero ? 'number-pad' : 'default'}
                    autoComplete={
                      ({ nome: 'given-name', cognome: 'family-name', email: 'email', telefono: 'tel', via: 'street-address', cap: 'postal-code', citta: 'address-level2' } as const)[
                        k as 'nome'
                      ]
                    }
                    maxLength={k === 'codice_fiscale' ? 16 : k === 'cap' ? (estero ? 12 : 5) : undefined}
                    placeholder={k === 'codice_fiscale' ? 'RSSMRA80A01H501U' : k === 'telefono' ? '+39 340 123 4567' : capLibero ? 'SW1A 1AA' : undefined}
                    errore={!(dati[k] ?? '').trim() || (k === 'codice_fiscale' && !!erroreCf) || (capLibero && erroreCap)}
                    style={{ backgroundColor: c.sfondo }}
                  />,
                  ...casella,
                ]
              }),
            ]}
          </Gruppo>
        ))}
        {erroreCf ? <Avviso>{erroreCf}</Avviso> : null}
        <Casella spuntata={confermati} onCambia={confermaDati} etichetta="I miei dati sono corretti">
          <Testo style={{ fontWeight: '700' }}>I miei dati sono corretti</Testo>
        </Casella>
        {occupato === 'dati' ? (
          <View style={{ flexDirection: 'row', gap: spazio.due, alignItems: 'center' }}>
            <ActivityIndicator color={c.accento} />
            <Testo variante="piccolo">Controlliamo i tuoi dati…</Testo>
          </View>
        ) : null}
        {erroreDati ? <Avviso>{erroreDati}</Avviso> : null}
        {Object.keys(cambiati).length && !confermati ? (
          <Testo variante="piccolo">Le correzioni vanno sulla tua scheda del club quando spunti «I miei dati sono corretti».</Testo>
        ) : null}
        {/* La password solo a chi sta creando l'account (14/10/2026): chi era gia'
            Guest o Member ce l'ha, e se non la ricorda la reimposta dalla pagina finale. */}
        {passwordObbligatoria ? (
          <>
            <Gruppo titolo="La tua password" due={dueColonne}>
              <Campo
                etichetta="Scegli la password"
                value={password.nuova}
                onChangeText={(v) => setPassword((x) => ({ ...x, nuova: v }))}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                errore={!password.nuova}
                style={{ backgroundColor: c.sfondo }}
              />
              <Campo
                etichetta="Ripeti la password"
                value={password.conferma}
                onChangeText={(v) => setPassword((x) => ({ ...x, conferma: v }))}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                errore={!!password.nuova && password.conferma !== password.nuova}
                style={{ backgroundColor: c.sfondo }}
              />
            </Gruppo>
            <Testo variante="piccolo">
              Con la tua email e questa password entri nell’app Athlon Club e nel portale, per prenotare le lezioni. Almeno 8 caratteri,
              con lettere e numeri.
            </Testo>
            {(password.nuova || password.conferma) && errorePassword ? <Avviso tono="attenzione">{errorePassword}</Avviso> : null}
          </>
        ) : null}
      </Blocco>

      <Blocco numero={n0 + 2} titolo="Quando vuoi cominciare" fatto={!!inizio}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }}>
          {giorni.map((g) => {
            const b = giornoBreve(g)
            const attivo = g === inizio
            const colore = attivo ? c.suAccento : c.testo
            return (
              <Scelta key={g} scelta={attivo} onPress={() => setInizio(g)} stile={{ minWidth: 64, alignItems: 'center' }} etichetta={giornoLungo(g)}>
                <Text style={{ color: colore, fontSize: 11, textTransform: 'uppercase' }}>{b.settimana}</Text>
                <Text style={{ color: colore, fontSize: 18, fontWeight: '700' }}>{b.numero}</Text>
                <Text style={{ color: colore, fontSize: 11 }}>{b.mese}</Text>
              </Scelta>
            )
          })}
        </ScrollView>
        {inizio ? <Testo variante="piccolo">{`Dal ${giornoLungo(inizio)} al ${giornoLungo(fineSettimana(inizio))}.`}</Testo> : null}
        {perFiglio && giorni.length && giorni.length < 15 ? (
          <Testo variante="piccolo">{`Il Guest Pass di ${primoFiglio ?? 'tuo figlio'} deve cominciare prima che compia 18 anni.`}</Testo>
        ) : null}
      </Blocco>

      <Blocco numero={n0 + 3} titolo="Come vuoi pagare" fatto={metodoPronto}>
        {salvati.length ? <Testo variante="piccolo">Hai già un metodo salvato al club: puoi usare quello.</Testo> : null}
        {(
          [
            { tipo: 'carta', titolo: 'Carte', nuovo: 'carta', altro: 'Usa un’altra carta', primo: 'Paga con la carta' },
            { tipo: 'iban', titolo: 'Conto corrente', nuovo: 'iban', altro: 'Usa un altro conto', primo: 'Addebito su conto' },
          ] as const
        ).map((g) => {
          const suoi = salvati.filter((m) => m.tipo === g.tipo)
          return (
            <View key={g.tipo} style={{ gap: spazio.due }}>
              <Text style={[stili.titoloGruppo, { color: c.accento }]}>{g.titolo.toUpperCase()}</Text>
              {suoi.map((m) => (
                <Scelta
                  key={m.id}
                  scelta={sceltaMetodo === `s${m.id}`}
                  onPress={() => scegliMetodo(`s${m.id}`)}
                  etichetta={nomeMetodo(m)}
                  spento={!!occupato}
                  stile={{ alignSelf: 'stretch' }}
                >
                  <Text style={{ color: sceltaMetodo === `s${m.id}` ? c.suAccento : c.testo, fontWeight: '600' }}>{nomeMetodo(m)}</Text>
                </Scelta>
              ))}
              <Scelta
                scelta={sceltaMetodo === g.nuovo}
                onPress={() => scegliMetodo(g.nuovo)}
                etichetta={suoi.length ? g.altro : g.primo}
                spento={!!occupato}
                stile={{ alignSelf: 'stretch' }}
              >
                <Text style={{ color: sceltaMetodo === g.nuovo ? c.suAccento : c.testo, fontWeight: '600' }}>
                  {suoi.length ? `+ ${g.altro}` : g.primo}
                </Text>
              </Scelta>
            </View>
          )
        })}
        {salvatoScelto?.tipo === 'carta' ? (
          <>
            <Testo variante="piccolo">Alla conferma addebitiamo i {p.prezzo} € su questa carta, senza riscriverla.</Testo>
            <ChiGestisceCarta />
          </>
        ) : null}
        {salvatoScelto?.tipo === 'iban' ? (
          <>
            <Testo variante="piccolo">I {p.prezzo} € li addebitiamo su questo conto, dopo la conferma.</Testo>
            <ChiGestisceConto />
          </>
        ) : null}
        {sceltaMetodo === 'carta' ? (
          <>
            <Testo variante="piccolo">
              Alla conferma si apre la pagina protetta di Adyen: scrivi la carta e paghi i {p.prezzo} € in un passo solo. Poi torni qui.
            </Testo>
            <ChiGestisceCarta salvaPagando />
          </>
        ) : null}
        {sceltaMetodo === 'iban' ? (
          p.scelte.metodo === 'iban' && p.scelte.metodo_pronto ? (
            <>
              <Avviso tono="ok">Conto salvato: i {p.prezzo} € saranno addebitati sul conto.</Avviso>
              <ChiGestisceConto />
            </>
          ) : (
            <>
              <View style={dueColonne ? { flexDirection: 'row', gap: spazio.tre } : { gap: spazio.tre }}>
                <Campo etichetta="IBAN" value={conto.iban} onChangeText={(v) => setConto((x) => ({ ...x, iban: v.toUpperCase() }))} autoCapitalize="characters" placeholder="IT60 X054 2811 1010 0000 0123 456" style={{ backgroundColor: c.sfondo }} />
                <Campo etichetta="Intestatario del conto" value={conto.intestatario} onChangeText={(v) => setConto((x) => ({ ...x, intestatario: v }))} style={{ backgroundColor: c.sfondo }} />
              </View>
              <View style={dueColonne ? { flexDirection: 'row', gap: spazio.tre } : { gap: spazio.tre }}>
                <Campo etichetta="Via e numero civico" value={conto.via} onChangeText={(v) => setConto((x) => ({ ...x, via: v }))} style={{ backgroundColor: c.sfondo }} />
                <View style={{ flexDirection: 'row', gap: spazio.due, flex: 1 }}>
                  <Campo etichetta="CAP" value={conto.cap} onChangeText={(v) => setConto((x) => ({ ...x, cap: v }))} keyboardType={estero ? 'default' : 'number-pad'} maxLength={estero ? 12 : 5} style={{ backgroundColor: c.sfondo }} />
                  <Campo etichetta="Città" value={conto.citta} onChangeText={(v) => setConto((x) => ({ ...x, citta: v }))} style={{ backgroundColor: c.sfondo }} />
                </View>
              </View>
              <ChiGestisceConto />
              <Bottone testo="Salva il conto" onPress={salvaConto} inCorso={occupato === 'iban'} disabilitato={!!occupato} />
            </>
          )
        ) : null}
      </Blocco>

      <Blocco numero={n0 + 4} titolo="Riepilogo e condizioni" fatto={tuttiIConsensi && !!inizio && metodoPronto}>
        <View style={[stili.contratto, { borderColor: c.bordo, backgroundColor: c.sfondo }]}>
          <Text style={[stili.titoloContratto, { color: c.testo }]}>Guest Pass Athlon Club · 1 settimana</Text>
          {[
            ['Intestatario', perFiglio ? nomeFiglio || 'tuo figlio' : [dati.nome, dati.cognome].filter(Boolean).join(' ')],
            ...(perFiglio ? [['Genitore che paga', [dati.nome, dati.cognome].filter(Boolean).join(' ')]] : []),
            ['Validità', inizio ? `dal ${giornoLungo(inizio)} al ${giornoLungo(fineSettimana(inizio))} compresi` : 'scegli il giorno d’inizio'],
            ['Prezzo', `${p.prezzo} € una tantum`],
            ['Rinnovo', 'nessuno: finisce da solo, senza impegno e senza altri addebiti'],
            ['Pagamento', metodoLeggibile ?? 'scegli come pagare'],
          ].map(([k, v]) => (
            <View key={k} style={[stili.riga, { borderTopColor: c.bordo }]}>
              <Text style={[stili.chiave, { color: c.testoSecondario }]}>{k}</Text>
              <Text style={[stili.valore, { color: c.testo }]}>{v}</Text>
            </View>
          ))}
          <Text style={[stili.sezione, { color: c.testo }]}>Le condizioni in breve</Text>
          <View style={{ gap: spazio.uno + 2 }}>
            {cosaComprende(p.prezzo).map((t) => (
              <View key={t} style={{ flexDirection: 'row', gap: spazio.due }}>
                <Text style={{ color: c.accento, fontWeight: '800' }}>✓</Text>
                <Testo variante="piccolo" style={{ flex: 1, color: c.testo }}>
                  {t}
                </Testo>
              </View>
            ))}
          </View>
          <Text style={[stili.sezione, { color: c.testo }]}>Regole di prenotazione</Text>
          {REGOLE_PRENOTAZIONE.map((t) => (
            <Testo key={t} variante="piccolo">{`• ${t}`}</Testo>
          ))}
          <Testo variante="piccolo">Società Sportiva Dilettantistica Point 2000 SSD, Via Ugo Ojetti 134, 00137 Roma.</Testo>
        </View>
        {p.consensi.length ? (
          <View style={{ gap: 4 }}>
            <Casella
              spuntata={tuttiIConsensi}
              onCambia={() => setAccetto((x) => !x)}
              etichetta={ACCETTO}
            >
              <Testo variante="piccolo" style={{ color: c.testo }}>
                {ACCETTO}
              </Testo>
            </Casella>
            <Text
              accessibilityRole="link"
              style={{ color: c.accento, fontSize: 13, textDecorationLine: 'underline', marginLeft: 34 }}
              onPress={() => apriAccanto(REGOLAMENTO_URL)}
            >
              Leggi il Regolamento e i Termini e Condizioni ↗
            </Text>
          </View>
        ) : null}
      </Blocco>

      {errore ? <Avviso>{errore}</Avviso> : null}
      {occupato === 'carta' && tornatoCarta ? <ActivityIndicator color={c.accento} /> : null}
      <Bottone testo={metodo === 'carta' ? `Conferma e paga · ${p.prezzo} €` : `Conferma e attiva · ${p.prezzo} €`} onPress={conferma} inCorso={occupato === 'conferma'} disabilitato={!pronto || !!occupato} />
      {!pronto ? (
        <Testo variante="piccolo">
          {errorePassword ? `${errorePassword} ` : ''}
          {erroreCf
            ? 'Controlla il codice fiscale. '
            : senzaPaese
              ? 'Scegli il Paese in cui risiedi. '
              : erroreCap
                ? 'Controlla il CAP. '
                : !datiCompleti
                  ? 'Completa i tuoi dati. '
                  : !confermati
                    ? 'Conferma che i tuoi dati sono corretti. '
                    : ''}
          {!inizio ? 'Scegli il giorno d’inizio. ' : ''}
          {!metodoPronto ? 'Completa il metodo di pagamento. ' : ''}
          {!tuttiIConsensi ? 'Accetta i Termini e Condizioni, il Regolamento e le Condizioni di pagamento.' : ''}
        </Testo>
      ) : (
        <Testo variante="piccolo">
          Confermando attivi il Guest Pass <Forte>dal {giornoLungo(inizio!)}</Forte>
          {metodo === 'carta' ? ` e paghi subito i ${p.prezzo} € con la carta.` : ` con l’addebito dei ${p.prezzo} € sul conto.`}
        </Testo>
      )}
      </>
      ) : null}
    </Pagina>
  )
}

const stili = StyleSheet.create({
  blocco: { borderWidth: 1, borderRadius: 16, padding: spazio.tre, gap: spazio.due },
  testaBlocco: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  numero: { width: 26, height: 26, borderRadius: 13, textAlign: 'center', lineHeight: 26, fontWeight: '800', overflow: 'hidden' },
  titoloBlocco: { fontSize: 17, fontWeight: '700' },
  contratto: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.uno + 2 },
  titoloContratto: { fontSize: 16, fontWeight: '800', marginBottom: spazio.uno },
  riga: { flexDirection: 'row', gap: spazio.tre, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.uno + 2 },
  chiave: { width: 130, fontSize: 13 },
  valore: { flex: 1, fontSize: 13, fontWeight: '600' },
  sezione: { fontSize: 14, fontWeight: '700', marginTop: spazio.due },
  gruppo: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.tre },
  titoloGruppo: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
})
