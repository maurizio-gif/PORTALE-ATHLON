import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { CampoData } from '@/components/CampoData'
import { ChiGestisceCarta, ChiGestisceConto } from '@/components/ChiGestisce'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Scelta } from '@/components/Scelta'
import { Forte, Testo } from '@/components/Testo'
import {
  CAMPI,
  COSA_COMPRENDE,
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
  const daPerfectGym = (pp: PaginaGuestPass) =>
    Object.fromEntries(Object.keys(CAMPI).map((k) => [k, String((pp.persona as Record<string, unknown>)[k] ?? '')]))
  const [dati, setDati] = useState<Record<string, string>>(daPerfectGym(iniziale))
  const [confermati, setConfermati] = useState(!!iniziale.scelte.dati_confermati)
  // La password non si salva fra un passo e l'altro: va su PerfectGym solo alla conferma.
  const [password, setPassword] = useState({ nuova: '', conferma: '' })
  const [consensi, setConsensi] = useState<Set<number>>(new Set(iniziale.scelte.consensi))
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
  const [avviso, setAvviso] = useState<{ testo: string; tono: 'ok' | 'attenzione' | 'errore' } | null>(null)
  const giaFatto = useRef(false)

  async function ricarica() {
    const { ok, dati: d } = await chiamaLink(token, 'pagina')
    if (ok) {
      const { ok: _ok, ...resto } = d
      setP(resto as unknown as PaginaGuestPass)
      setDati(daPerfectGym(resto as unknown as PaginaGuestPass))
      return resto as unknown as PaginaGuestPass
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
  const giorni = giorniFra(p.inizio.dal, p.inizio.al)
  const tuttiIConsensi = p.consensi.every((k) => consensi.has(k.id))
  const originali = daPerfectGym(p)
  const cambiati = Object.fromEntries(Object.entries(dati).filter(([k, v]) => v.trim() !== (originali[k] ?? '').trim()))
  // Il codice fiscale deve essere ben scritto e di questa persona (cognome, nome, nascita).
  const erroreCf = problemaCodiceFiscale(dati)
  const datiCompleti = Object.keys(CAMPI).every((k) => (dati[k] ?? '').trim()) && !erroreCf
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
      consensi: [...consensi],
      inizio,
      metodo,
      ...extra,
    })
    if (!ok) setErrore(d.errore ?? 'Non siamo riusciti a salvare adesso.')
    return ok
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
          ? 'Fatto: il tuo Guest Pass è attivo. I 19 € saranno addebitati sul conto.'
          : 'Fatto: il tuo Guest Pass è attivo.',
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

  if (p.stato === 'attivato') {
    const daPagare = p.pagamento_stato === 'da_pagare' || p.pagamento_stato === 'sconosciuto'
    const periodo = p.inizio.scelto ? `dal ${giornoLungo(p.inizio.scelto)} al ${giornoLungo(fineSettimana(p.inizio.scelto))}` : null
    if (!daPagare) {
      return (
        <Pagina titolo="Il tuo Guest Pass è attivo" sottotitolo={periodo ? periodo.charAt(0).toUpperCase() + periodo.slice(1) : undefined}>
          {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}
          {p.pagamento_stato === 'addebito' ? <Testo>I {p.prezzo} € saranno addebitati sul conto che hai indicato.</Testo> : null}
          <Testo>Ti aspettiamo al club. Per prenotare le lezioni usa l’app Athlon con la tua email.</Testo>
        </Pagina>
      )
    }
    return (
      <Pagina titolo="Manca il pagamento" sottotitolo={`Il tuo Guest Pass ${periodo ? `(${periodo}) ` : ''}è registrato: per usarlo manca il pagamento di ${p.resta ?? p.prezzo} €.`}>
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
            <Campo etichetta="CAP" value={conto.cap} onChangeText={(v) => setConto((x) => ({ ...x, cap: v }))} keyboardType="number-pad" />
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
  const pronto = datiCompleti && confermati && !errorePassword && tuttiIConsensi && !!inizio && metodoPronto
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
    <Pagina titolo={nome ? `Ciao ${nome}, attiva il tuo Guest Pass` : 'Attiva il tuo Guest Pass'} sottotitolo={`Una settimana al club a ${p.prezzo} €.`}>
      {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}

      <Blocco numero={1} titolo="I tuoi dati" fatto={datiCompleti && confermati}>
        <Testo variante="piccolo">
          Controlla i tuoi dati e correggili se serve. Quelli che mancano — di solito codice fiscale, data di nascita e indirizzo — servono
          per registrarti al club.
        </Testo>
        {GRUPPI.map((g) => (
          <Gruppo key={g.titolo} titolo={g.titolo} due={dueColonne}>
            {g.campi.map((k) => {
              const cambia = (v: string) => {
                setDati((x) => ({ ...x, [k]: v }))
                setConfermati(false)
              }
              if (k === 'nascita') {
                return <CampoData key={k} etichetta={CAMPI[k]} value={dati[k] ?? ''} onChange={cambia} errore={!(dati[k] ?? '').trim()} sfondo={c.sfondo} />
              }
              return (
                <Campo
                  key={k}
                  etichetta={CAMPI[k]}
                  value={dati[k] ?? ''}
                  onChangeText={k === 'codice_fiscale' ? (v) => cambia(v.toUpperCase()) : cambia}
                  autoCapitalize={k === 'codice_fiscale' ? 'characters' : k === 'email' ? 'none' : 'words'}
                  keyboardType={k === 'email' ? 'email-address' : k === 'telefono' ? 'phone-pad' : k === 'cap' ? 'number-pad' : 'default'}
                  autoComplete={
                    ({ nome: 'given-name', cognome: 'family-name', email: 'email', telefono: 'tel', via: 'street-address', cap: 'postal-code', citta: 'address-level2' } as const)[
                      k as 'nome'
                    ]
                  }
                  maxLength={k === 'codice_fiscale' ? 16 : k === 'cap' ? 5 : undefined}
                  placeholder={k === 'codice_fiscale' ? 'RSSMRA80A01H501U' : k === 'telefono' ? '+39 340 123 4567' : undefined}
                  errore={!(dati[k] ?? '').trim() || (k === 'codice_fiscale' && !!erroreCf)}
                  style={{ backgroundColor: c.sfondo }}
                />
              )
            })}
          </Gruppo>
        ))}
        {erroreCf ? <Avviso>{erroreCf}</Avviso> : null}
        <Casella spuntata={confermati} onCambia={() => setConfermati((x) => !x)} etichetta="I miei dati sono corretti">
          <Testo style={{ fontWeight: '700' }}>I miei dati sono corretti</Testo>
        </Casella>
        {Object.keys(cambiati).length ? <Testo variante="piccolo">Le correzioni vanno sulla tua scheda del club quando confermi.</Testo> : null}
        <Gruppo titolo={passwordObbligatoria ? 'La tua password' : 'Password (facoltativa)'} due={dueColonne}>
          <Campo
            etichetta={passwordObbligatoria ? 'Scegli la password' : 'Nuova password'}
            value={password.nuova}
            onChangeText={(v) => setPassword((x) => ({ ...x, nuova: v }))}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            errore={passwordObbligatoria && !password.nuova}
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
          {passwordObbligatoria
            ? 'Con la tua email e questa password entri nell’app Athlon e nel portale, per prenotare le lezioni. Almeno 8 caratteri, con lettere e numeri.'
            : 'Hai già un accesso all’app? Lascia vuoto. Se non ricordi la password, o vuoi cambiarla, scrivine una nuova: almeno 8 caratteri, con lettere e numeri.'}
        </Testo>
        {(password.nuova || password.conferma) && errorePassword ? <Avviso tono="attenzione">{errorePassword}</Avviso> : null}
      </Blocco>

      <Blocco numero={2} titolo="Quando vuoi cominciare" fatto={!!inizio}>
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
      </Blocco>

      <Blocco numero={3} titolo="Come vuoi pagare" fatto={metodoPronto}>
        {salvati.length ? <Testo variante="piccolo">Hai già un metodo salvato al club: puoi usare quello.</Testo> : null}
        <View style={{ flexDirection: 'row', gap: spazio.due, flexWrap: 'wrap' }}>
          {salvati.map((m) => (
            <Scelta key={m.id} scelta={sceltaMetodo === `s${m.id}`} onPress={() => scegliMetodo(`s${m.id}`)} etichetta={nomeMetodo(m)} spento={!!occupato}>
              <Text style={{ color: sceltaMetodo === `s${m.id}` ? c.suAccento : c.testo, fontWeight: '600' }}>{nomeMetodo(m)}</Text>
            </Scelta>
          ))}
          <Scelta scelta={sceltaMetodo === 'carta'} onPress={() => scegliMetodo('carta')} etichetta="Carta" spento={!!occupato}>
            <Text style={{ color: sceltaMetodo === 'carta' ? c.suAccento : c.testo, fontWeight: '600' }}>{cartaSalvata ? 'Un’altra carta' : 'Carta'}</Text>
          </Scelta>
          <Scelta scelta={sceltaMetodo === 'iban'} onPress={() => scegliMetodo('iban')} etichetta="Addebito su conto" spento={!!occupato}>
            <Text style={{ color: sceltaMetodo === 'iban' ? c.suAccento : c.testo, fontWeight: '600' }}>
              {salvati.some((m) => m.tipo === 'iban') ? 'Un altro conto' : 'Addebito su conto'}
            </Text>
          </Scelta>
        </View>
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
                  <Campo etichetta="CAP" value={conto.cap} onChangeText={(v) => setConto((x) => ({ ...x, cap: v }))} keyboardType="number-pad" maxLength={5} style={{ backgroundColor: c.sfondo }} />
                  <Campo etichetta="Città" value={conto.citta} onChangeText={(v) => setConto((x) => ({ ...x, citta: v }))} style={{ backgroundColor: c.sfondo }} />
                </View>
              </View>
              <ChiGestisceConto />
              <Bottone testo="Salva il conto" onPress={salvaConto} inCorso={occupato === 'iban'} disabilitato={!!occupato} />
            </>
          )
        ) : null}
      </Blocco>

      <Blocco numero={4} titolo="Riepilogo e condizioni" fatto={tuttiIConsensi && !!inizio && metodoPronto}>
        <View style={[stili.contratto, { borderColor: c.bordo, backgroundColor: c.sfondo }]}>
          <Text style={[stili.titoloContratto, { color: c.testo }]}>Guest Pass Athlon Club · 1 settimana</Text>
          {[
            ['Intestatario', [dati.nome, dati.cognome].filter(Boolean).join(' ')],
            ['Validità', inizio ? `dal ${giornoLungo(inizio)} al ${giornoLungo(fineSettimana(inizio))} compresi` : 'scegli il giorno d’inizio'],
            ['Prezzo', `${p.prezzo} € una tantum, IVA inclusa`],
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
            {COSA_COMPRENDE.map((t) => (
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
              onCambia={() => setConsensi(tuttiIConsensi ? new Set() : new Set(p.consensi.map((k) => k.id)))}
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
          {erroreCf ? 'Controlla il codice fiscale. ' : !datiCompleti ? 'Completa i tuoi dati. ' : !confermati ? 'Conferma che i tuoi dati sono corretti. ' : ''}
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
