import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'

import {
  acquistaPersonal,
  attivaPacchettoPersonal,
  compraSedutaPersonal,
  esitoPacchettoPersonal,
  disdiciPersonal,
  esitoAcquistoPersonal,
  orariPersonal,
  pagaPersonalConCarta,
  prenotaPersonal,
  statoPersonal,
  type DaPagare,
  type EsitoAcquistoPersonal,
  type EsitoPacchettoPersonal,
  type PacchettoPersonal,
  type OrariPersonal,
  type SedutaPersonal,
  type StatoPersonal,
  type TrainerPersonal,
} from '@/api/lab'
import { Casella } from '@/components/Casella'
import { InfoAdyen } from '@/components/InfoAdyen'
import { ModuloIban, type DatiConto } from '@/features/metodo-pagamento/ModuloIban'
import { ETA_MINIMA_PERSONAL, etaDa } from '@/lib/eta'
import { euro, giornoEsteso, ora } from '@/lib/eventi'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from './memoria'
import { SEZIONE_9, VERSIONE_TERMINI_PERSONAL } from './personal/termini'
import { useNascite } from './nascite'
import { Foglio } from './ui/Foglio'
import { Icona } from './ui/Icona'
import { Avatar, Carta, Etichetta, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from './ui/kit'
import { SceltaPrenotazioni } from './ui/SceltaPrenotazioni'
import { Schermata } from './ui/Schermata'
import { F, FUOCO, usePalette, velo } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

// Il personal training del laboratorio (15/10/2026): la seconda faccia di
// «Prenotazioni». Funziona come PerfectGym lo fa funzionare (vedi
// portale-lab-personal): ogni tipo di seduta ha il suo prodotto, che si scala
// alla prenotazione. Chi ha sedute (il pacchetto del mese dell'abbonamento PT,
// un omaggio, una seduta gia' comprata) sceglie giorno, ora e trainer e
// prenota; chi non ne ha prenota lo stesso, e la seduta si paga in quel passo
// (salva e paga, come le lezioni), poi si torna qui e la prenotazione si fa da
// sola.
//
// Gli orari sono quelli liberi dei trainer nei prossimi 30 giorni, dalla loro
// disponibilita' su PerfectGym. Un orario con piu' trainer liberi si tocca e
// poi si sceglie con chi.
//
// I trainer hanno la loro foto e la loro scheda, che si apre dalla «i» accanto
// al nome: foto e testi sono quelli del sito (www.athlonroma.it/personal-training),
// con la frase, gli studi, le specializzazioni e i servizi proposti. Nelle
// schede si vede solo il nome: il resto sta nella scheda (portale-lab-personal).

/** Il nome di un tipo di seduta, detto come lo dice il club e senza prezzi dentro. */
function nomeSeduta(nome: string): string {
  if (/pacchetto/i.test(nome)) return t('Pacchetto PT', 'PT package')
  if (/omaggio/i.test(nome)) return t('Seduta omaggio', 'Complimentary session')
  if (/coppia/i.test(nome)) return t('Seduta in coppia', 'Couples session')
  if (/seduta|non iscritt|€/i.test(nome)) return t('Seduta singola', 'Single session')
  return nome
}

function maiuscola(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** «31 ottobre», a Roma. */
function giornoMese(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(new Date(iso))
}

/** Il giorno a Roma di un istante: «2026-10-19». */
function giornoDi(iso: string): string {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  )
  return `${parti.year}-${parti.month}-${parti.day}`
}

/** «lun», «19», «ott»: il giorno della settimana, il numero e il mese, per le caselle del calendario. */
function etichettaGiorno(data: string): { settimana: string; numero: string; mese: string } {
  const [settimana, numero, mese] = giornoEsteso(data).split(' ')
  return { settimana: settimana.slice(0, 3), numero, mese: (mese ?? '').slice(0, 3) }
}

function nomeProprio(nome: string): string {
  return nome.split(' ')[0]
}

const FASCE = [
  { nome: t('Mattina', 'Morning'), fino: 12 },
  { nome: t('Pomeriggio', 'Afternoon'), fino: 17 },
  { nome: t('Sera', 'Evening'), fino: 24 },
] as const

/** Una delle sedute che si possono usare: un credito, o la seduta singola da comprare. */
type Opzione = { definition_id: number; titolo: string; sotto: string; acquisto: boolean }

function opzioniDi(s: StatoPersonal): Opzione[] {
  const out: Opzione[] = s.crediti.map((c) => ({
    definition_id: c.definition_id,
    titolo: nomeSeduta(c.nome),
    sotto: t(
      `${c.quantita} ${c.quantita === 1 ? 'seduta da usare' : 'sedute da usare'}${c.scadenza ? ` · ${c.quantita === 1 ? 'scade' : 'scadono'} il ${giornoMese(c.scadenza)}` : ''}`,
      `${c.quantita} ${c.quantita === 1 ? 'session to use' : 'sessions to use'}${c.scadenza ? ` · expires on ${giornoMese(c.scadenza)}` : ''}`,
    ),
    acquisto: false,
  }))
  if (s.acquisto && !out.some((o) => o.definition_id === s.acquisto?.definition_id)) {
    out.push({
      definition_id: s.acquisto.definition_id,
      titolo: `${t('Seduta singola', 'Single session')}${s.acquisto.prodotto.prezzo != null ? ` · ${euro(s.acquisto.prodotto.prezzo)}` : ''}`,
      sotto: t(`${s.acquisto.minuti} minuti con un trainer, la paghi quando prenoti`, `${s.acquisto.minuti} minutes with a trainer, you pay when you book`),
      acquisto: true,
    })
  }
  return out
}

/** La foto del trainer (da PerfectGym, o dal sito); senza foto, o se non si carica, le iniziali. */
function FotoTrainer({ trainer, nome, size, anello }: { trainer: TrainerPersonal | undefined; nome: string; size: number; anello?: string }) {
  const [rotta, setRotta] = useState(false)
  if (!trainer?.foto || rotta) return <Avatar nome={nome} size={size} anello={anello} />
  return (
    <Image
      source={{ uri: trainer.foto }}
      onError={() => setRotta(true)}
      contentFit="cover"
      contentPosition="top"
      transition={150}
      accessibilityIgnoresInvertColors
      style={[{ width: size, height: size, borderRadius: size * 0.36, backgroundColor: '#ddd' }, anello ? { borderWidth: 2.5, borderColor: anello } : null]}
    />
  )
}

/** La «i» accanto al nome: apre la scheda del trainer. */
function InfoTrainer({ nome, onPress }: { nome: string; onPress: () => void }) {
  const p = usePalette()
  return (
    <Tocco onPress={onPress} ruolo="button" etichetta={t(`Chi è ${nome}`, `Who is ${nome}`)} style={[stili.info, { backgroundColor: p.incavo }]}>
      <Icona nome="info" size={18} colore={p.testoSecondario} />
    </Tocco>
  )
}

/** La scheda del trainer: la foto grande e tutto il testo del sito (frase, studi, specializzazioni, servizi). */
function FoglioTrainer({ trainer: tr, onChiudi }: { trainer: TrainerPersonal | null; onChiudi: () => void }) {
  const p = usePalette()
  const gruppi = tr?.gruppi ?? []
  // La descrizione di PerfectGym solo se il sito non ha la scheda di questo trainer.
  const righe = !gruppi.length ? (tr?.descrizione ?? '').split('\n').map((r) => r.trim()).filter(Boolean) : []
  return (
    <Foglio aperto={!!tr} titolo={tr?.nome ?? ''} sottotitolo={t('Personal trainer di Athlon Club', 'Athlon Club personal trainer')} onChiudi={onChiudi}>
      {tr ? (
        <View style={{ gap: spazio.tre }}>
          {tr.foto ? (
            <Image source={{ uri: tr.foto }} contentFit="cover" contentPosition="top" transition={200} style={[stili.fotoGrande, { backgroundColor: p.incavo }]} />
          ) : null}
          {tr.frase ? <Text style={[stili.frase, { color: p.testo, borderLeftColor: p.accento }]}>{`«${tr.frase}»`}</Text> : null}
          {righe.length ? (
            <View style={{ gap: 6 }}>
              {righe.map((r, i) => (
                <View key={i} style={stili.voce}>
                  <View style={[stili.pallino, { backgroundColor: p.accento }]} />
                  <Text style={[stili.voceTesto, { color: p.testo }]}>{r}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {gruppi.map((g) => (
            <View key={g.titolo} style={{ gap: 6 }}>
              <Text style={[stili.fascia, { color: p.testoSecondario }]}>{g.titolo.toUpperCase()}</Text>
              {g.voci.map((v, i) => (
                <View key={i} style={stili.voce}>
                  <View style={[stili.pallino, { backgroundColor: p.accento }]} />
                  <Text style={[stili.voceTesto, { color: p.testo }]}>{v}</Text>
                </View>
              ))}
            </View>
          ))}
          {!righe.length && !gruppi.length && !tr.frase ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('La scheda di questo trainer non è ancora pronta.', 'This trainer’s profile isn’t ready yet.')}</Text>
          ) : null}
        </View>
      ) : null}
    </Foglio>
  )
}

/** Cosa si compra dalla sezione «Acquista»: la seduta singola o un abbonamento PT. */
type DaComprare = { tipo: 'seduta'; prezzo: number } | { tipo: 'pacchetto'; pacchetto: PacchettoPersonal }

/**
 * Il foglio dell'acquisto. Con la carta salvata si paga senza uscire; con
 * un'altra carta, o senza, si va sulla pagina di Adyen, che la salva. Per
 * l'abbonamento PT prima si accettano i consensi del contratto, e si sceglie
 * se pagarlo con la carta o sul conto corrente (addebito SEPA): col conto non
 * si paga niente adesso, le quote le addebita il club.
 */
function FoglioCompra({
  cosa,
  stato,
  onChiudi,
  onSedutaPagata,
}: {
  cosa: DaComprare | null
  stato: StatoPersonal
  onChiudi: () => void
  onSedutaPagata: () => void
}) {
  const p = usePalette()
  const [accetto, setAccetto] = useState(false)
  const [attesa, setAttesa] = useState<'carta' | 'altra' | 'conto' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [metodo, setMetodo] = useState<'carta' | 'conto'>('carta')
  /** Sul conto: il modulo dell'IBAN nuovo, invece del conto salvato. */
  const [nuovoConto, setNuovoConto] = useState(false)
  useEffect(() => {
    setAccetto(false)
    setErrore(null)
    setAttesa(null)
    setMetodo('carta')
    setNuovoConto(false)
  }, [cosa])
  const persona = stato.persone.find((x) => x.member_id === stato.member_id)

  /** Dopo l'attivazione si legge l'esito come al ritorno da Adyen. */
  function aEsito(id: string) {
    if (Platform.OS === 'web') window.location.assign(`/personal?pacchetto=${id}`)
    else router.replace({ pathname: '/personal', params: { pacchetto: id } })
  }

  /** Sul conto: quello salvato, o un IBAN nuovo dal modulo. Restituisce l'errore da mostrare. */
  async function attivaSulConto(d: DatiConto | null): Promise<string | null> {
    if (cosa?.tipo !== 'pacchetto') return null
    if (!accetto) return t('Per attivare l’abbonamento servono i consensi del contratto.', 'To activate the membership you need to give the contract consents.')
    setErrore(null)
    setAttesa('conto')
    const r = await attivaPacchettoPersonal(
      stato.member_id,
      cosa.pacchetto.piano_id,
      d ? { metodo: 'conto', iban: d.iban, intestatario: d.intestatario, via: d.via, cap: d.cap, citta: d.citta } : { metodo: 'conto', conto_salvato: true },
    )
    if (!r.ok) {
      setAttesa(null)
      colpetto('errore')
      return r.errore
    }
    colpetto('ok')
    aEsito(r.pacchetto_id)
    return null
  }

  async function vai(url: string) {
    if (Platform.OS === 'web') window.location.assign(url)
    else await Linking.openURL(url)
  }

  async function paga(conCarta: boolean) {
    if (!cosa) return
    setErrore(null)
    setAttesa(conCarta ? 'carta' : 'altra')
    if (cosa.tipo === 'seduta') {
      const r = await compraSedutaPersonal(stato.member_id, conCarta)
      if (!r.ok) {
        setAttesa(null)
        colpetto('errore')
        return setErrore(r.errore)
      }
      if (r.url) return vai(r.url)
      setAttesa(null)
      colpetto('ok')
      return onSedutaPagata()
    }
    const r = await attivaPacchettoPersonal(stato.member_id, cosa.pacchetto.piano_id, { metodo: 'carta', con_carta: conCarta })
    if (!r.ok) {
      setAttesa(null)
      colpetto('errore')
      return setErrore(r.errore)
    }
    if (r.url) return vai(r.url)
    // Pagata con la carta salvata (o niente da pagare).
    aEsito(r.pacchetto_id)
  }

  const prezzo = cosa?.tipo === 'seduta' ? cosa.prezzo : cosa?.pacchetto.prezzo_mese ?? 0
  const bloccato = cosa?.tipo === 'pacchetto' && !accetto
  const verbo = cosa?.tipo === 'pacchetto' ? t('Attiva e paga', 'Activate and pay') : t('Paga', 'Pay')
  const sulConto = cosa?.tipo === 'pacchetto' && metodo === 'conto'
  return (
    <Foglio
      aperto={!!cosa}
      titolo={cosa?.tipo === 'pacchetto' ? t('Abbonamento PT', 'PT membership') : t('Seduta singola', 'Single session')}
      sottotitolo={cosa?.tipo === 'pacchetto' ? cosa.pacchetto.nome : t('60 minuti con un trainer', '60 minutes with a trainer')}
      onChiudi={onChiudi}
    >
      {cosa ? (
        <View style={{ gap: spazio.tre }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[stili.prezzo, { color: p.testo }]}>{euro(prezzo)}</Text>
            {cosa.tipo === 'pacchetto' ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('al mese', 'a month')}</Text> : null}
          </View>
          {cosa.tipo === 'seduta' ? (
            <Text style={[stili.voceTesto, { color: p.testo }]}>
              {t('Una seduta di personal da 60 minuti: resta sul tuo conto e la prenoti quando vuoi, con il trainer e l’orario che preferisci.', 'A 60-minute personal training session: it stays on your account and you book it whenever you like, with the trainer and time you prefer.')}
            </Text>
          ) : (
            <View style={{ gap: 6 }}>
              {[
                t(`${cosa.pacchetto.sedute ?? 'Le'} sedute di personal ogni mese, da prenotare quando vuoi con i trainer del club.`, `${cosa.pacchetto.sedute ?? 'The'} personal training sessions every month, to book whenever you like with the club’s trainers.`),
                t('Le sedute si caricano il giorno 1 di ogni mese e vanno usate entro la fine dello stesso mese solare: quelle non usate non passano al mese dopo.', 'Sessions are loaded on the 1st of every month and must be used by the end of that calendar month: unused ones don’t carry over to the next month.'),
                t(`Se lo attivi a mese iniziato, la quota del mese si paga per intero e le sedute si caricano tutte insieme subito: le usi entro il ${fineMeseRoma()}.`, `If you activate it after the month has started, the month’s fee is paid in full and all the sessions are loaded at once: use them by ${fineMeseRoma()}.`),
                t('Si aggiunge al tuo abbonamento e si rinnova ogni mese, con un impegno di un mese.', 'It’s added to your membership and renews every month, with a one-month minimum term.'),
                sulConto
                  ? t('Le quote, la prima compresa, si addebitano ogni mese sul conto corrente, con l’addebito diretto SEPA.', 'Payments, the first included, are charged every month to your bank account by SEPA direct debit.')
                  : t('La prima quota la paghi adesso; le altre si addebitano ogni mese sulla stessa carta.', 'You pay the first installment now; the others are charged every month to the same card.'),
              ].map((r) => (
                <View key={r} style={stili.voce}>
                  <View style={[stili.pallino, { backgroundColor: p.accento }]} />
                  <Text style={[stili.voceTesto, { color: p.testo }]}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          {cosa.tipo === 'pacchetto' ? (
            <View style={{ gap: spazio.due }}>
              <Casella spuntata={accetto} onCambia={() => setAccetto((v) => !v)} etichetta={t('Accetto le condizioni del contratto', 'I accept the contract terms')}>
                <Text style={[stili.voceTesto, { color: p.testo }]}>
                  {t(`Accetto ${stato.consensi_contratto.length ? stato.consensi_contratto.map((c) => `«${c.nome}»`).join(' e ') : 'le condizioni del contratto e del regolamento del club'}.`, `I accept ${stato.consensi_contratto.length ? stato.consensi_contratto.map((c) => `“${c.nome}”`).join(' and ') : 'the contract terms and the club rules'}.`)}
                </Text>
              </Casella>
              <EstrattoTermini />
            </View>
          ) : null}

          {cosa.tipo === 'pacchetto' ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.nota, { color: p.testoSecondario, fontFamily: F.bold }]}>{t('Come vuoi pagarlo?', 'How do you want to pay?')}</Text>
              <View style={{ flexDirection: 'row', gap: spazio.due }}>
                {(
                  [
                    ['carta', t('Carta', 'Card'), 'carta'],
                    ['conto', t('Conto corrente', 'Bank account'), 'banca'],
                  ] as const
                ).map(([chiave, nome, icona]) => {
                  const attivo = metodo === chiave
                  return (
                    <Tocco
                      key={chiave}
                      vibra="scelta"
                      stato={{ selected: attivo }}
                      etichetta={t(`Paga con ${nome.toLowerCase()}`, `Pay by ${nome.toLowerCase()}`)}
                      spento={attesa != null}
                      onPress={() => {
                        setMetodo(chiave)
                        setErrore(null)
                      }}
                      style={[stili.filtro, { flex: 1, justifyContent: 'center' }, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { backgroundColor: p.carta, borderColor: p.linea }]}
                    >
                      <Icona nome={icona} size={18} colore={attivo ? '#fff' : p.testoSecondario} />
                      <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{nome}</Text>
                    </Tocco>
                  )
                })}
              </View>
            </View>
          ) : null}

          {errore ? <Messaggio>{errore}</Messaggio> : null}
          {sulConto ? (
            stato.conto && !nuovoConto ? (
              <>
                <Pulsante
                  testo={t(`Attiva con il conto${stato.conto.finale ? ` •••• ${stato.conto.finale}` : ''}`, `Activate with account${stato.conto.finale ? ` •••• ${stato.conto.finale}` : ''}`)}
                  icona="banca"
                  onPress={async () => {
                    const e = await attivaSulConto(null)
                    if (e) setErrore(e)
                  }}
                  inCorso={attesa === 'conto'}
                  disabilitato={bloccato || attesa != null}
                />
                <Pulsante testo={t('Usa un altro conto', 'Use another account')} variante="fantasma" piccolo onPress={() => setNuovoConto(true)} disabilitato={attesa != null} />
                <Text style={[stili.nota, { color: p.testoSecondario }]}>
                  {t('Usiamo il conto già salvato sulla tua scheda, con il mandato SEPA che hai già firmato. Adesso non paghi niente.', 'We’ll use the account already saved on your profile, with the SEPA mandate you’ve already signed. You don’t pay anything now.')}
                </Text>
              </>
            ) : (
              <View style={{ gap: spazio.tre }}>
                <ModuloIban
                  nomeCompleto={[persona?.nome, persona?.cognome].filter(Boolean).join(' ')}
                  introduzione={
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>
                      {t('Scrivi l’IBAN su cui addebitare le quote dell’abbonamento PT. Adesso non paghi niente.', 'Enter the IBAN to charge the PT membership payments to. You don’t pay anything now.')}
                    </Text>
                  }
                  etichettaInvio={t('Attiva l’abbonamento', 'Activate the membership')}
                  onInvia={(d) => attivaSulConto(d)}
                  onIndietro={() => (stato.conto ? setNuovoConto(false) : setMetodo('carta'))}
                />
              </View>
            )
          ) : stato.carta ? (
            <>
              <Pulsante
                testo={t(`${verbo} ${euro(prezzo)} con la carta${stato.carta.finale ? ` •••• ${stato.carta.finale}` : ''}`, `${verbo} ${euro(prezzo)} with your card${stato.carta.finale ? ` •••• ${stato.carta.finale}` : ''}`)}
                icona="carta"
                onPress={() => paga(true)}
                inCorso={attesa === 'carta'}
                disabilitato={bloccato || attesa != null}
              />
              <Pulsante testo={t('Usa un’altra carta', 'Use another card')} variante="fantasma" piccolo onPress={() => paga(false)} inCorso={attesa === 'altra'} disabilitato={bloccato || attesa != null} />
            </>
          ) : (
            <Pulsante testo={`${verbo} ${euro(prezzo)}`} icona="carta" onPress={() => paga(false)} inCorso={attesa != null} disabilitato={bloccato} />
          )}
          {sulConto ? null : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {stato.carta ? t('La carta la custodisce ', 'Your card is stored by ') : t('Paghi sulla pagina protetta di ', 'You pay on the secure page of ')}
            <InfoAdyen />
            {stato.carta
              ? t(': il club non vede mai il numero completo.', ': the club never sees the full number.')
              : t(', e la carta resta salvata per i prossimi acquisti.', ', and your card stays saved for future purchases.')}
          </Text>
          )}
        </View>
      ) : null}
    </Foglio>
  )
}

/**
 * L'estratto della sezione 9 dei Termini (21/10/2026): chiuso, si apre al tocco. E' il testo alla lettera
 * (`personal/termini.ts`). Il file dei Termini non si apre piu' da qui: c'e' solo questo estratto.
 */
function EstrattoTermini() {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  return (
    <View style={[stili.estratto, { borderColor: p.linea, backgroundColor: p.carta }]}>
      <Tocco
        vibra="scelta"
        etichetta={aperto ? t(`Chiudi la sezione ${SEZIONE_9.numero} dei Termini e Condizioni`, `Close section ${SEZIONE_9.numero} of the Terms and Conditions`) : t(`Leggi la sezione ${SEZIONE_9.numero} dei Termini e Condizioni`, `Read section ${SEZIONE_9.numero} of the Terms and Conditions`)}
        stato={{ expanded: aperto }}
        onPress={() => setAperto((v) => !v)}
        style={stili.estrattoTesta}
      >
        <Text style={[stili.voceTesto, { color: p.testo, fontFamily: F.bold }]}>
          {t(`Termini e Condizioni, sez. ${SEZIONE_9.numero}: ${SEZIONE_9.titolo}`, `Terms and Conditions, sec. ${SEZIONE_9.numero}: ${SEZIONE_9.titolo}`)}
        </Text>
        <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 18 }}>{aperto ? '−' : '+'}</Text>
      </Tocco>
      {aperto ? (
        <View style={{ gap: spazio.due, paddingHorizontal: spazio.tre, paddingBottom: spazio.tre }}>
          {SEZIONE_9.clausole.map((c) => (
            <View key={c.id} style={{ gap: 2 }}>
              <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>{`${c.id} ${c.titolo}`}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{c.testo}</Text>
            </View>
          ))}
          {locale() === 'en-GB' ? <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>The terms are available in Italian only.</Text> : null}
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Estratto dei Termini e Condizioni Generali, versione ${VERSIONE_TERMINI_PERSONAL}.`, `Extract from the General Terms and Conditions, version ${VERSIONE_TERMINI_PERSONAL}.`)}</Text>
        </View>
      ) : null}
    </View>
  )
}

/** L'ultimo giorno del mese in corso a Roma, a parole: «31 ottobre». */
function fineMeseRoma(): string {
  const [a, m] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit' })
    .format(new Date())
    .split('-')
    .map(Number)
  return new Date(Date.UTC(a, m, 0)).toLocaleDateString(locale(), { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** Le sedute gia' prenotate, con «Annulla» finche' mancano piu' delle ore della regola. */
function SedutePrenotate({ sedute, ore, onAnnulla }: { sedute: SedutaPersonal[]; ore: number; onAnnulla: (s: SedutaPersonal) => Promise<string | null> }) {
  const p = usePalette()
  const [conferma, setConferma] = useState<number | null>(null)
  const [inCorso, setInCorso] = useState<number | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function annulla(s: SedutaPersonal) {
    setErrore(null)
    setInCorso(s.booking_id)
    const problema = await onAnnulla(s)
    setInCorso(null)
    setConferma(null)
    if (problema) {
      colpetto('errore')
      setErrore(problema)
    } else colpetto('ok')
  }

  return (
    <Sezione titolo={t('Le tue sedute prenotate', 'Your booked sessions')} conteggio={sedute.length}>
      <Carta style={{ paddingVertical: spazio.due }}>
        {sedute.map((s, i) => {
          const disdicibile = new Date(s.inizio).getTime() - Date.now() >= ore * 3600_000
          return (
            <Riga
              key={s.booking_id}
              prima={i === 0}
              testa={
                <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.orario}>
                  <Text style={stili.orarioTesto}>{ora(s.inizio)}</Text>
                </LinearGradient>
              }
              titolo={`${maiuscola(giornoEsteso(giornoDi(s.inizio)))}`}
              sotto={`${nomeSeduta(s.nome)}${s.trainer ? t(` con ${s.trainer}`, ` with ${s.trainer}`) : ''}`}
              coda={
                s.completata ? (
                  <Etichetta testo={t('Fatta', 'Done')} tono="ok" />
                ) : !disdicibile ? (
                  <Etichetta testo={t(`Meno di ${ore} ore`, `Less than ${ore} hours`)} tono="neutro" />
                ) : conferma === s.booking_id ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pulsante testo={t('Sì, annulla', 'Yes, cancel')} variante="pericolo" piccolo pieno={false} onPress={() => annulla(s)} inCorso={inCorso === s.booking_id} />
                    <Pulsante testo={t('No', 'No')} variante="secondario" piccolo pieno={false} onPress={() => setConferma(null)} disabilitato={inCorso !== null} />
                  </View>
                ) : (
                  <Pulsante testo={t('Annulla', 'Cancel')} variante="secondario" piccolo pieno={false} onPress={() => setConferma(s.booking_id)} disabilitato={inCorso !== null} />
                )
              }
            />
          )
        })}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Text style={[stili.nota, { color: p.testoTerzo, paddingTop: spazio.due }]}>
          {t(`Una seduta si annulla fino a ${ore} ore prima, e torna sul tuo conto. Dopo, scrivi al club.`, `You can cancel a session up to ${ore} hours before, and it goes back to your account. After that, contact the club.`)}
        </Text>
      </Carta>
    </Sezione>
  )
}

export function Personal() {
  const p = usePalette()
  const [stato, setStato] = useState<StatoPersonal | null>(inMemoria<{ ok: true; stato: StatoPersonal }>('personal:stato:')?.stato ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [definizione, setDefinizione] = useState<number | null>(null)
  const [orari, setOrari] = useState<OrariPersonal | null>(null)
  const [erroreOrari, setErroreOrari] = useState<string | null>(null)
  const [caricaOrari, setCaricaOrari] = useState(false)
  const [giorno, setGiorno] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<number | null>(null)
  const [scelto, setScelto] = useState<{ locale: string; inizio: string } | null>(null)
  const [trainer, setTrainer] = useState<number | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [erroreAzione, setErroreAzione] = useState<string | null>(null)
  const [daPagare, setDaPagare] = useState<DaPagare | null>(null)
  const [fatto, setFatto] = useState<string | null>(null)
  const riquadro = useRef<View>(null)
  const [chiE, setChiE] = useState<TrainerPersonal | null>(null)
  const [daComprare, setDaComprare] = useState<DaComprare | null>(null)

  // Lo stato gia' letto si mostra subito, e intanto si rilegge.
  const chiaveStato = useRef('personal:stato:')
  const leggi = useCallback(async (memberId?: number) => {
    const chiave = `personal:stato:${memberId ?? ''}`
    chiaveStato.current = chiave
    const gia = inMemoria<{ ok: true; stato: StatoPersonal }>(chiave)
    if (gia) setStato(gia.stato)
    setErrore(null)
    const r = await prendi(chiave, () => statoPersonal(memberId))
    if (chiaveStato.current !== chiave) return
    if (r.ok) setStato(r.stato)
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    leggi()
  }, [leggi])

  // Il personal training e' dai 13 anni: chi e' piu' piccolo non si puo' scegliere.
  // Chi non ha una data letta non si esclude (non si sa quanti anni ha).
  const nascite = useNascite()
  const { idonee, troppoPiccoli } = useMemo(() => {
    const persone = stato?.persone ?? []
    const piccoli = (x: { member_id: number }) => {
      const anni = etaDa(nascite.get(String(x.member_id)))
      return anni !== null && anni < ETA_MINIMA_PERSONAL
    }
    return { idonee: persone.filter((x) => !piccoli(x)), troppoPiccoli: persone.filter(piccoli) }
  }, [stato, nascite])
  // La funzione parte dal titolare: se la persona scelta e' troppo piccola, si passa alla prima che puo'.
  const daCambiare = !!stato && idonee.length > 0 && !idonee.some((x) => x.member_id === stato.member_id)
  useEffect(() => {
    if (daCambiare) leggi(idonee[0].member_id)
  }, [daCambiare, idonee, leggi])

  const opzioni = useMemo(() => (stato ? opzioniDi(stato) : []), [stato])
  // Si parte dalla prima seduta che si ha (la prima che scade), o da quella da comprare.
  useEffect(() => {
    if (!stato) return
    if (definizione == null || !opzioni.some((o) => o.definition_id === definizione)) setDefinizione(opzioni[0]?.definition_id ?? null)
  }, [stato, opzioni, definizione])

  const caricaGliOrari = useCallback(async (memberId: number, definitionId: number) => {
    setCaricaOrari(true)
    setErroreOrari(null)
    const r = await prendi(`personal:orari:${memberId}:${definitionId}`, () => orariPersonal(memberId, definitionId))
    setCaricaOrari(false)
    if (!r.ok) return setErroreOrari(r.errore)
    setOrari(r.orari)
    // Il primo giorno con un orario libero, se quello scelto non ne ha.
    setGiorno((g) => (g && r.orari.orari.some((o) => giornoDi(o.inizio) === g) ? g : r.orari.orari[0] ? giornoDi(r.orari.orari[0].inizio) : r.orari.giorni[0]))
  }, [])

  useEffect(() => {
    if (!stato || definizione == null) return
    setScelto(null)
    setDaPagare(null)
    caricaGliOrari(stato.member_id, definizione)
  }, [stato?.member_id, definizione, caricaGliOrari]) // eslint-disable-line react-hooks/exhaustive-deps

  // Il ritorno dal pagamento (?acquisto=<id>): si chiede com'e' andata finche'
  // la seduta non e' prenotata (il pagamento arriva a PerfectGym qualche
  // secondo dopo), per due minuti; poi si rilegge tutto.
  const { acquisto } = useLocalSearchParams<{ acquisto?: string }>()
  const [ritorno, setRitorno] = useState<EsitoAcquistoPersonal | { stato: 'avviato' } | null>(null)
  const avviato = useRef(false)
  useEffect(() => {
    if (!acquisto || avviato.current) return
    avviato.current = true
    let giri = 0
    let fermo = false
    const giro = async () => {
      const r = await esitoAcquistoPersonal(acquisto)
      if (fermo) return
      if (!r.ok) return setRitorno({ stato: 'errore', errore: r.errore, member_id: 0, inizio: null, trainer: null })
      if (r.esito.stato === 'avviato' && ++giri < 30) {
        setRitorno(r.esito)
        setTimeout(giro, 4000)
        return
      }
      setRitorno(r.esito.stato === 'avviato' ? { ...r.esito, stato: 'errore', errore: null } : r.esito)
      ricorda(`personal:stato:${r.esito.member_id || ''}`, undefined)
      leggi(r.esito.member_id || undefined)
    }
    setRitorno({ stato: 'avviato' })
    giro()
    return () => {
      fermo = true
    }
  }, [acquisto, leggi])

  // Da un consiglio (21/10/2026): `?compra=<piano_id>` apre il foglio dell'abbonamento PT, `?compra=seduta` quello della seduta
  // singola. Solo se quel piano e' davvero in vendita a questa persona (lo dice `stato`): altrimenti la schermata e' quella di sempre.
  const { compra } = useLocalSearchParams<{ compra?: string }>()
  const compraAperto = useRef(false)
  useEffect(() => {
    if (!compra || !stato || compraAperto.current) return
    compraAperto.current = true
    if (compra === 'seduta') {
      if (stato.acquisto?.prodotto.prezzo != null) setDaComprare({ tipo: 'seduta', prezzo: stato.acquisto.prodotto.prezzo })
      return
    }
    const k = stato.pacchetti.find((x) => String(x.piano_id) === compra)
    if (k) setDaComprare({ tipo: 'pacchetto', pacchetto: k })
  }, [compra, stato])

  // Il ritorno dall'abbonamento PT (?pacchetto=<id>): come per la seduta, si
  // chiede l'esito finche' il pagamento non e' arrivato.
  const { pacchetto, seduta } = useLocalSearchParams<{ pacchetto?: string; seduta?: string }>()
  const [esitoPacchetto, setEsitoPacchetto] = useState<EsitoPacchettoPersonal | { stato: 'avviato' } | null>(null)
  const pacchettoAvviato = useRef(false)
  useEffect(() => {
    if (!pacchetto || pacchettoAvviato.current) return
    pacchettoAvviato.current = true
    let giri = 0
    let fermo = false
    const giro = async () => {
      const r = await esitoPacchettoPersonal(pacchetto)
      if (fermo) return
      if (!r.ok) return setEsitoPacchetto({ stato: 'errore', errore: r.errore, member_id: 0, nome: t('Abbonamento PT', 'PT membership') })
      if (r.esito.stato === 'avviato' && ++giri < 30) {
        setEsitoPacchetto(r.esito)
        setTimeout(giro, 4000)
        return
      }
      setEsitoPacchetto(r.esito.stato === 'avviato' ? { ...r.esito, stato: 'errore', errore: t('Non abbiamo ancora la conferma del pagamento: controlla fra qualche minuto in Pagamenti.', 'We don’t have the payment confirmation yet: check again in a few minutes in Payments.') } : r.esito)
      ricorda(`personal:stato:${r.esito.member_id || ''}`, undefined)
      leggi(r.esito.member_id || undefined)
    }
    setEsitoPacchetto({ stato: 'avviato' })
    giro()
    return () => {
      fermo = true
    }
  }, [pacchetto, leggi])

  // Una seduta singola comprata (dalla pagina di pagamento, ?seduta=comprata, o
  // con la carta salvata): arriva sul conto qualche secondo dopo, quindi si
  // rilegge per un po' finche' non compare.
  const [sedutaInArrivo, setSedutaInArrivo] = useState<'attesa' | 'arrivata' | 'non_ancora' | null>(seduta ? 'attesa' : null)
  const quanteSedute = useRef<number | null>(null)
  useEffect(() => {
    if (sedutaInArrivo !== 'attesa') return
    let giri = 0
    let fermo = false
    const giro = async () => {
      ricorda(chiaveStato.current, undefined)
      const r = await statoPersonal(stato?.member_id)
      if (fermo) return
      if (r.ok) {
        setStato(r.stato)
        const ora = r.stato.crediti.reduce((tot, c) => tot + c.quantita, 0)
        if (quanteSedute.current == null) quanteSedute.current = seduta ? 0 : ora
        if (ora > (quanteSedute.current ?? 0)) return setSedutaInArrivo('arrivata')
      }
      if (++giri < 12) setTimeout(giro, 4000)
      else setSedutaInArrivo('non_ancora')
    }
    setTimeout(giro, seduta ? 0 : 2500)
    return () => {
      fermo = true
    }
  }, [sedutaInArrivo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (errore && !stato) {
    return (
      <Schermata titolo={t('Prenotazioni', 'Bookings')}>
        <SceltaPrenotazioni attiva="personal" />
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={() => leggi()} />
      </Schermata>
    )
  }
  if (!stato || daCambiare) {
    return (
      <Schermata titolo={t('Prenotazioni', 'Bookings')}>
        <SceltaPrenotazioni attiva="personal" />
        <SchedeInArrivo />
      </Schermata>
    )
  }
  // Nessuno del nucleo ha l'eta': non c'e' niente da prenotare.
  if (!idonee.length && troppoPiccoli.length) {
    return (
      <Schermata titolo={t('Prenotazioni', 'Bookings')}>
        <SceltaPrenotazioni attiva="personal" />
        <Messaggio>{t(`Il personal training è dai ${ETA_MINIMA_PERSONAL} anni.`, `Personal training starts from age ${ETA_MINIMA_PERSONAL}.`)}</Messaggio>
      </Schermata>
    )
  }

  const opzione = opzioni.find((o) => o.definition_id === definizione) ?? null
  // «Le tue sedute» mostra solo i prodotti personal attivi: la seduta da comprare sta in «Acquista».
  const usabili = opzioni.filter((o) => !o.acquisto)
  const trainerDi = new Map((orari?.trainer ?? stato.trainer).map((x) => [x.id, x]))
  const nomeTrainer = new Map([...trainerDi.values()].map((x) => [x.id, x.nome]))
  // Gli orari liberi del giorno scelto, col filtro del trainer, raccolti per ora.
  const delGiorno = (orari?.orari ?? []).filter((o) => giornoDi(o.inizio) === giorno && (filtro == null || o.trainer_id === filtro))
  const perOra = new Map<string, { locale: string; inizio: string; trainer: number[] }>()
  for (const o of delGiorno) {
    const g = perOra.get(o.locale) ?? { locale: o.locale, inizio: o.inizio, trainer: [] }
    g.trainer.push(o.trainer_id)
    perOra.set(o.locale, g)
  }
  const ore = [...perOra.values()]
  const quantiPerGiorno = new Map<string, number>()
  for (const o of orari?.orari ?? []) {
    if (filtro != null && o.trainer_id !== filtro) continue
    quantiPerGiorno.set(giornoDi(o.inizio), (quantiPerGiorno.get(giornoDi(o.inizio)) ?? 0) + 1)
  }
  // I trainer con almeno un orario libero nei 30 giorni.
  const conOrari = [...new Set((orari?.orari ?? []).map((o) => o.trainer_id))].sort((a, b) => (nomeTrainer.get(a) ?? '').localeCompare(nomeTrainer.get(b) ?? '', locale()))
  // Si mostrano solo i trainer con disponibilita' reale a calendario: chi non ne ha
  // non e' detto che non lavori piu', ma da qui non si prenota, quindi non si mostra.
  const disponibili = conOrari.map((id) => trainerDi.get(id)).filter((x): x is TrainerPersonal => !!x)
  const sceltoQui = scelto ? perOra.get(scelto.locale) ?? null : null
  const conChi = trainer ?? (sceltoQui?.trainer.length === 1 ? sceltoQui.trainer[0] : null)

  function scegliOra(locale: string, inizio: string, liberi: number[]) {
    setScelto({ locale, inizio })
    setTrainer(liberi.length === 1 ? liberi[0] : null)
    setDaPagare(null)
    setErroreAzione(null)
    setFatto(null)
    requestAnimationFrame(() => {
      if (Platform.OS === 'web') (riquadro.current as unknown as HTMLElement | null)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    })
  }

  async function prenota() {
    if (!stato || !scelto || conChi == null || definizione == null) return
    setErroreAzione(null)
    setAttesa(true)
    const r = await prenotaPersonal({ member_id: stato.member_id, definition_id: definizione, trainer_id: conChi, locale: scelto.locale })
    setAttesa(false)
    if (r.ok) {
      colpetto('ok')
      setFatto(t(`Seduta prenotata: ${giornoEsteso(giornoDi(scelto.inizio))} alle ${ora(scelto.inizio)} con ${nomeTrainer.get(conChi) ?? 'il trainer'}.`, `Session booked: ${giornoEsteso(giornoDi(scelto.inizio))} at ${ora(scelto.inizio)} with ${nomeTrainer.get(conChi) ?? 'the trainer'}.`))
      setScelto(null)
      // Le sedute e gli orari sono cambiati: si rileggono.
      ricorda(`personal:orari:${stato.member_id}:${definizione}`, undefined)
      ricorda(chiaveStato.current, undefined)
      await leggi(stato.member_id)
      caricaGliOrari(stato.member_id, definizione)
      return
    }
    colpetto('errore')
    setErroreAzione(r.errore)
    if (r.prodotto) setDaPagare({ prodotto: r.prodotto, url: r.url, acquisto_id: r.acquisto_id, carta: r.carta ?? null })
  }

  /**
   * Senza sedute da usare, il pulsante porta dritto all'acquisto: con una carta
   * salvata si sceglie se pagare con quella, senza si va alla pagina di pagamento.
   */
  async function acquista() {
    if (!stato || !scelto || conChi == null) return
    setErroreAzione(null)
    setAttesa(true)
    const r = await acquistaPersonal({ member_id: stato.member_id, trainer_id: conChi, locale: scelto.locale })
    if (!r.ok) {
      setAttesa(false)
      colpetto('errore')
      return setErroreAzione(r.errore)
    }
    const prodotto = r.prodotto ?? stato.acquisto?.prodotto ?? null
    if (r.carta && prodotto?.prezzo != null) {
      setAttesa(false)
      return setDaPagare({ prodotto, url: r.url, acquisto_id: r.acquisto_id, carta: r.carta })
    }
    if (Platform.OS === 'web') window.location.assign(r.url)
    else {
      setAttesa(false)
      await Linking.openURL(r.url)
    }
  }

  /** Alla pagina di pagamento; si torna qui con ?acquisto=<id>. */
  async function vaiAlPagamento(pronto?: string) {
    if (!stato || !scelto || conChi == null) return
    let url = pronto
    if (!url) {
      setAttesa(true)
      const r = await acquistaPersonal({ member_id: stato.member_id, trainer_id: conChi, locale: scelto.locale })
      setAttesa(false)
      if (!r.ok) return setErroreAzione(r.errore)
      url = r.url
    }
    if (Platform.OS === 'web') window.location.assign(url)
    else await Linking.openURL(url)
  }

  async function pagaConCarta(acquistoId: string) {
    setErroreAzione(null)
    setAttesa(true)
    const r = await pagaPersonalConCarta(acquistoId)
    setAttesa(false)
    if (!r.ok) {
      colpetto('errore')
      return setErroreAzione(r.errore)
    }
    if (Platform.OS === 'web') window.location.assign(`/personal?acquisto=${acquistoId}`)
    else router.replace({ pathname: '/personal', params: { acquisto: acquistoId } })
  }

  async function annulla(s: SedutaPersonal): Promise<string | null> {
    if (!stato) return null
    const r = await disdiciPersonal(stato.member_id, s.booking_id)
    if (!r.ok) return r.errore
    ricorda(chiaveStato.current, undefined)
    if (definizione != null) ricorda(`personal:orari:${stato.member_id}:${definizione}`, undefined)
    await leggi(stato.member_id)
    if (definizione != null) caricaGliOrari(stato.member_id, definizione)
    return null
  }

  const perChi = stato.persone.find((x) => x.member_id === stato.member_id)

  return (
    <Schermata titolo={t('Prenotazioni', 'Bookings')}>
      <SceltaPrenotazioni attiva="personal" />

      {esitoPacchetto ? (
        esitoPacchetto.stato === 'avviato' ? (
          <Messaggio tono="attenzione" icona="clessidra" titolo={t('Aspettiamo la conferma', 'Waiting for confirmation')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
              <ActivityIndicator color={p.attenzione} />
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{t('Aspettiamo da PerfectGym la conferma del pagamento dell’abbonamento PT. Non chiudere la pagina.', 'We’re waiting for PerfectGym to confirm the PT membership payment. Don’t close the page.')}</Text>
            </View>
          </Messaggio>
        ) : esitoPacchetto.stato === 'pagato' ? (
          <Messaggio tono="ok" titolo={t('Abbonamento PT attivo', 'PT membership active')}>
            {t(`«${esitoPacchetto.nome}» è attivo. Le sedute del mese compaiono in «Le tue sedute» appena PerfectGym le carica.`, `“${esitoPacchetto.nome}” is active. This month’s sessions will appear in “Your sessions” as soon as PerfectGym loads them.`)}
          </Messaggio>
        ) : esitoPacchetto.stato === 'addebito' ? (
          <Messaggio tono="ok" titolo={t('Abbonamento PT attivo', 'PT membership active')}>
            {t(`«${esitoPacchetto.nome}» è attivo. Le quote si addebitano sul tuo conto corrente con l’addebito SEPA; le sedute del mese compaiono in «Le tue sedute» appena PerfectGym le carica.`, `“${esitoPacchetto.nome}” is active. Payments are charged to your bank account by SEPA direct debit; this month’s sessions will appear in “Your sessions” as soon as PerfectGym loads them.`)}
          </Messaggio>
        ) : (
          <Messaggio tono="attenzione" titolo={t('Il pagamento non è andato a buon fine', 'The payment didn’t go through')}>
            {esitoPacchetto.errore ?? t('Non abbiamo la conferma del pagamento.', 'We don’t have the payment confirmation.')}
          </Messaggio>
        )
      ) : null}

      {sedutaInArrivo === 'attesa' ? (
        <Messaggio tono="attenzione" icona="clessidra" titolo={t('Aspettiamo la conferma', 'Waiting for confirmation')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
            <ActivityIndicator color={p.attenzione} />
            <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{t('La seduta arriva sul tuo conto appena PerfectGym conferma il pagamento.', 'The session arrives on your account as soon as PerfectGym confirms the payment.')}</Text>
          </View>
        </Messaggio>
      ) : sedutaInArrivo === 'arrivata' ? (
        <Messaggio tono="ok" titolo={t('Seduta acquistata', 'Session purchased')}>
          {t('La trovi in «Le tue sedute»: scegli giorno, orario e trainer qui sotto.', 'You’ll find it in “Your sessions”: choose day, time and trainer below.')}
        </Messaggio>
      ) : sedutaInArrivo === 'non_ancora' ? (
        <Messaggio tono="attenzione" titolo={t('La seduta non è ancora arrivata', 'The session hasn’t arrived yet')}>
          {t('Se il pagamento è andato a buon fine compare fra poco in «Le tue sedute»; altrimenti lo trovi in Pagamenti.', 'If the payment went through, it will appear shortly in “Your sessions”; otherwise you’ll find it in Payments.')}
        </Messaggio>
      ) : null}

      {ritorno ? (
        ritorno.stato === 'avviato' ? (
          <Messaggio tono="attenzione" icona="clessidra" titolo={t('Aspettiamo la conferma', 'Waiting for confirmation')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
              <ActivityIndicator color={p.attenzione} />
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{t('Aspettiamo da PerfectGym la conferma del pagamento, poi prenotiamo la seduta. Non chiudere la pagina.', 'We’re waiting for PerfectGym to confirm the payment, then we’ll book the session. Don’t close the page.')}</Text>
            </View>
          </Messaggio>
        ) : ritorno.stato === 'prenotato' ? (
          <Messaggio tono="ok" titolo={t('Pagamento ricevuto', 'Payment received')}>
            {t(
              `La seduta è prenotata${'inizio' in ritorno && ritorno.inizio ? `: ${giornoEsteso(giornoDi(ritorno.inizio))} alle ${ora(ritorno.inizio)}` : ''}${'trainer' in ritorno && ritorno.trainer ? ` con ${ritorno.trainer}` : ''}. La trovi qui sotto e nell’app Athlon.`,
              `The session is booked${'inizio' in ritorno && ritorno.inizio ? `: ${giornoEsteso(giornoDi(ritorno.inizio))} at ${ora(ritorno.inizio)}` : ''}${'trainer' in ritorno && ritorno.trainer ? ` with ${ritorno.trainer}` : ''}. You’ll find it below and in the Athlon app.`,
            )}
          </Messaggio>
        ) : (
          <Messaggio>{('errore' in ritorno && ritorno.errore) || t('Non vediamo ancora il pagamento. Se l’hai completato, ricarica la pagina fra qualche minuto.', 'We can’t see the payment yet. If you completed it, reload the page in a few minutes.')}</Messaggio>
        )
      ) : null}

      {idonee.length > 1 || troppoPiccoli.length ? (
        <View style={{ gap: spazio.due }}>
          {idonee.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
            {idonee.map((x) => {
              const attivo = x.member_id === stato.member_id
              return (
                <Tocco
                  key={x.member_id}
                  vibra="scelta"
                  stato={{ selected: attivo }}
                  onPress={() => {
                    setDefinizione(null)
                    setOrari(null)
                    leggi(x.member_id)
                  }}
                  etichetta={t(`Personal per ${[x.nome, x.cognome].filter(Boolean).join(' ')}`, `Personal training for ${[x.nome, x.cognome].filter(Boolean).join(' ')}`)}
                  style={[stili.persona, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { backgroundColor: p.carta, borderColor: p.linea }]}
                >
                  <Avatar nome={x.nome} cognome={x.cognome} size={30} anello={attivo ? 'rgba(255,255,255,0.9)' : undefined} />
                  <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{x.nome || t('Senza nome', 'No name')}</Text>
                </Tocco>
              )
            })}
          </ScrollView>
          ) : null}
          {perChi && idonee.length > 1 ? (
            <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>
              {t('Stai prenotando per', 'You’re booking for')} <Text style={{ fontFamily: F.bold, color: p.testo }}>{[perChi.nome, perChi.cognome].filter(Boolean).join(' ')}</Text>
            </Text>
          ) : null}
          {troppoPiccoli.length ? (
            <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>
              {t(`Il personal training è dai ${ETA_MINIMA_PERSONAL} anni: ${troppoPiccoli.map((x) => x.nome || 'un familiare').join(', ')} non si può prenotare.`, `Personal training starts from age ${ETA_MINIMA_PERSONAL}: you can’t book for ${troppoPiccoli.map((x) => x.nome || 'a family member').join(', ')}.`)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!stato.letti ? <Messaggio tono="attenzione">{t('PerfectGym non risponde: le tue sedute potrebbero non comparire.', 'PerfectGym isn’t responding: your sessions might not show up.')}</Messaggio> : null}
      {fatto ? (
        <Messaggio tono="ok" titolo={t('Fatto', 'Done')}>
          {fatto}
        </Messaggio>
      ) : null}

      {stato.prenotate.length ? <SedutePrenotate sedute={stato.prenotate} ore={stato.disdetta_ore} onAnnulla={annulla} /> : null}

      {usabili.length ? (
        <Sezione titolo={t('Le tue sedute', 'Your sessions')}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {usabili.map((o, i) => {
              const qui = o.definition_id === definizione
              return (
                <Riga
                  key={o.definition_id}
                  prima={i === 0}
                  icona="pass"
                  tono="accento"
                  titolo={o.titolo}
                  sotto={o.sotto}
                  onPress={usabili.length > 1 ? () => setDefinizione(o.definition_id) : undefined}
                  coda={
                    usabili.length > 1 ? (
                      <View style={[stili.radio, { borderColor: qui ? p.accento : p.linea, backgroundColor: qui ? p.accento : 'transparent' }]}>
                        {qui ? <Icona nome="spunta" size={13} colore="#fff" /> : null}
                      </View>
                    ) : undefined
                  }
                />
              )
            })}
          </Carta>
        </Sezione>
      ) : null}

      {stato.acquisto?.prodotto.prezzo != null || stato.pacchetti.length || stato.pacchetto_attivo ? (
        <Sezione titolo={t('Acquista', 'Buy')}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {stato.acquisto?.prodotto.prezzo != null ? (
              <Riga
                prima
                icona="carta"
                tono="neutro"
                titolo={t(`Compra una seduta · ${euro(stato.acquisto.prodotto.prezzo)}`, `Buy a session · ${euro(stato.acquisto.prodotto.prezzo)}`)}
                sotto={t('La tieni sul conto e la prenoti quando vuoi', 'It stays on your account and you book it whenever you like')}
                onPress={() => setDaComprare({ tipo: 'seduta', prezzo: stato.acquisto!.prodotto.prezzo! })}
                coda={<Icona nome="avanti" size={18} colore={p.testoTerzo} />}
              />
            ) : null}
            {stato.pacchetti.map((k, i) => (
              <Riga
                key={k.piano_id}
                prima={i === 0 && stato.acquisto?.prodotto.prezzo == null}
                icona="rinnovo"
                tono="accento"
                titolo={t(`Abbonamento PT · ${k.sedute ?? ''} sedute al mese`, `PT membership · ${k.sedute ?? ''} sessions a month`)}
                sotto={t(`${euro(k.prezzo_mese)} al mese, si aggiunge al tuo abbonamento`, `${euro(k.prezzo_mese)} a month, added to your membership`)}
                onPress={() => setDaComprare({ tipo: 'pacchetto', pacchetto: k })}
                coda={<Icona nome="avanti" size={18} colore={p.testoTerzo} />}
              />
            ))}
            {stato.pacchetto_attivo ? (
              <Text style={[stili.nota, { color: p.testoSecondario, paddingTop: spazio.due }]}>
                {t(`Hai già l’abbonamento PT «${stato.pacchetto_attivo}»: le sedute del mese le trovi qui sopra.`, `You already have the PT membership “${stato.pacchetto_attivo}”: you’ll find this month’s sessions above.`)}
              </Text>
            ) : !stato.pacchetti.length ? (
              <Text style={[stili.nota, { color: p.testoSecondario, paddingTop: spazio.due }]}>
                {t('L’abbonamento PT mensile si aggiunge a un abbonamento attivo.', 'The monthly PT membership is added to an active membership.')}
              </Text>
            ) : null}
          </Carta>
        </Sezione>
      ) : null}

      {opzione ? (
        <Sezione titolo={t('Scegli giorno e orario', 'Choose day and time')}>
          {erroreOrari ? (
            <View style={{ gap: spazio.due }}>
              <Messaggio>{erroreOrari}</Messaggio>
              <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="contorno" onPress={() => definizione != null && caricaGliOrari(stato.member_id, definizione)} />
            </View>
          ) : !orari || caricaOrari ? (
            <SchedeInArrivo quante={1} />
          ) : !orari.orari.length ? (
            <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
              <Icona nome="calendario" size={34} colore={p.testoTerzo} />
              <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
                {t('Nei prossimi 30 giorni i trainer non hanno orari liberi. Riprova fra qualche giorno, o chiedi al club.', 'The trainers have no free slots in the next 30 days. Try again in a few days, or ask the club.')}
              </Text>
            </Carta>
          ) : (
            <View style={{ gap: spazio.tre }}>
              {orari.incompleti ? <Messaggio tono="attenzione">{t('Gli orari di qualche trainer non si leggono adesso: ne mancano alcuni.', 'We can’t read some trainers’ schedules right now: a few are missing.')}</Messaggio> : null}
              {conOrari.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
                  {[null, ...conOrari].map((tid) => {
                    const attivo = tid === filtro
                    return (
                      <Tocco
                        key={tid ?? 'tutti'}
                        vibra="scelta"
                        stato={{ selected: attivo }}
                        onPress={() => {
                          setFiltro(tid)
                          setScelto(null)
                        }}
                        etichetta={tid == null ? t('Tutti i trainer', 'All trainers') : t(`Solo ${nomeTrainer.get(tid)}`, `Only ${nomeTrainer.get(tid)}`)}
                        style={[stili.filtro, { backgroundColor: attivo ? p.testo : p.carta, borderColor: attivo ? p.testo : p.linea }]}
                      >
                        {tid != null ? <FotoTrainer trainer={trainerDi.get(tid)} nome={nomeTrainer.get(tid) ?? ''} size={26} /> : null}
                        <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>
                          {tid == null ? t('Tutti i trainer', 'All trainers') : nomeTrainer.get(tid) ?? t('Trainer', 'Trainer')}
                        </Text>
                      </Tocco>
                    )
                  })}
                </ScrollView>
              ) : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
                {orari.giorni.map((d) => {
                  const attivo = d === giorno
                  const quanti = quantiPerGiorno.get(d) ?? 0
                  const e = etichettaGiorno(d)
                  const contenuto = (
                    <>
                      <Text style={[stili.settimana, { color: attivo ? 'rgba(255,255,255,0.85)' : quanti ? p.testoSecondario : p.testoTerzo }]}>{e.settimana}</Text>
                      <Text style={[stili.numero, { color: attivo ? '#fff' : quanti ? p.testo : p.testoTerzo }]}>{e.numero}</Text>
                      <Text style={[stili.mese, { color: attivo ? 'rgba(255,255,255,0.85)' : quanti ? p.testoSecondario : p.testoTerzo }]}>{e.mese}</Text>
                      <View style={[stili.puntino, { backgroundColor: quanti ? (attivo ? '#fff' : p.ok) : 'transparent' }]} />
                    </>
                  )
                  return (
                    <Tocco
                      key={d}
                      vibra="scelta"
                      stato={{ selected: attivo, disabled: !quanti }}
                      onPress={() => {
                        if (!quanti) return
                        setGiorno(d)
                        setScelto(null)
                      }}
                      etichetta={`${giornoEsteso(d)}, ${quanti ? t(`${quanti} orari liberi`, `${quanti} free slots`) : t('nessun orario libero', 'no free slots')}`}
                    >
                      {attivo ? (
                        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.giorno, { boxShadow: '0 10px 20px rgba(255,87,1,0.3)' }]}>
                          {contenuto}
                        </LinearGradient>
                      ) : (
                        <View style={[stili.giorno, { backgroundColor: quanti ? p.carta : 'transparent', borderColor: p.linea, borderWidth: StyleSheet.hairlineWidth, opacity: quanti ? 1 : 0.6 }]}>{contenuto}</View>
                      )}
                    </Tocco>
                  )
                })}
              </ScrollView>

              <Carta style={{ gap: spazio.tre }}>
                <Text style={[stili.giornoTitolo, { color: p.testo }]}>{giorno ? maiuscola(giornoEsteso(giorno)) : ''}</Text>
                {!ore.length ? (
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>
                    {filtro != null ? t(`${nomeTrainer.get(filtro)} non ha orari liberi in questo giorno.`, `${nomeTrainer.get(filtro)} has no free slots on this day.`) : t('Nessun orario libero in questo giorno.', 'No free slots on this day.')}
                  </Text>
                ) : (
                  FASCE.map((f, i) => {
                    const da = i ? FASCE[i - 1].fino : 0
                    const qui = ore.filter((o) => {
                      const h = Number(ora(o.inizio).slice(0, 2))
                      return h >= da && h < f.fino
                    })
                    if (!qui.length) return null
                    return (
                      <View key={f.nome} style={{ gap: spazio.due }}>
                        <Text style={[stili.fascia, { color: p.testoSecondario }]}>{f.nome.toUpperCase()}</Text>
                        <View style={stili.orari}>
                          {qui.map((o) => {
                            const attivo = scelto?.locale === o.locale
                            return (
                              <View key={o.locale} style={stili.orarioCella}>
                                <Tocco
                                  vibra="scelta"
                                  stato={{ selected: attivo }}
                                  onPress={() => scegliOra(o.locale, o.inizio, o.trainer)}
                                  etichetta={`${ora(o.inizio)}, ${o.trainer.length === 1 ? t(`con ${nomeTrainer.get(o.trainer[0])}`, `with ${nomeTrainer.get(o.trainer[0])}`) : t(`${o.trainer.length} trainer liberi`, `${o.trainer.length} trainers available`)}`}
                                  style={[stili.turno, { backgroundColor: attivo ? p.accento : velo(p, 'ok', 0.12) }]}
                                >
                                  <Text style={[stili.turnoOra, { color: attivo ? '#fff' : p.testo }]}>{ora(o.inizio)}</Text>
                                  <Text style={[stili.turnoSotto, { color: attivo ? 'rgba(255,255,255,0.9)' : p.testoSecondario }]} numberOfLines={1}>
                                    {o.trainer.length === 1 ? nomeProprio(nomeTrainer.get(o.trainer[0]) ?? '') : t(`${o.trainer.length} trainer`, `${o.trainer.length} trainers`)}
                                  </Text>
                                </Tocco>
                              </View>
                            )
                          })}
                        </View>
                      </View>
                    )
                  })
                )}

                {scelto && sceltoQui ? (
                  <View ref={riquadro} style={[stili.scelto, { borderTopColor: p.linea }]}>
                    <Text style={[stili.sceltoOra, { color: p.testo }]}>
                      {`${ora(scelto.inizio)} – ${ora(new Date(new Date(scelto.inizio).getTime() + (orari.minuti || 60) * 60_000).toISOString())}`}
                    </Text>
                    {sceltoQui.trainer.length > 1 ? (
                      <View style={{ gap: spazio.due }}>
                        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Con chi?', 'With whom?')}</Text>
                        <View style={{ gap: spazio.due }}>
                          {sceltoQui.trainer.map((tid) => {
                            const attivo = conChi === tid
                            const tr = trainerDi.get(tid)
                            return (
                              // La «i» sta accanto alla scelta e non dentro: un pulsante dentro un pulsante non e' valido.
                              <View key={tid} style={[stili.sceltaTrainer, { borderColor: attivo ? p.accento : p.linea, backgroundColor: attivo ? velo(p, 'accento', 0.1) : p.carta }]}>
                                <Tocco
                                  vibra="scelta"
                                  stato={{ selected: attivo }}
                                  onPress={() => {
                                    setTrainer(tid)
                                    setDaPagare(null)
                                    setErroreAzione(null)
                                  }}
                                  etichetta={t(`Con ${nomeTrainer.get(tid)}`, `With ${nomeTrainer.get(tid)}`)}
                                  style={stili.sceltaTocco}
                                >
                                  <View style={[stili.radio, { borderColor: attivo ? p.accento : p.linea, backgroundColor: attivo ? p.accento : 'transparent' }]}>
                                    {attivo ? <Icona nome="spunta" size={13} colore="#fff" /> : null}
                                  </View>
                                  <FotoTrainer trainer={tr} nome={nomeTrainer.get(tid) ?? ''} size={52} />
                                  <Text style={{ flex: 1, color: p.testo, fontFamily: F.extra, fontSize: 15.5 }}>{nomeTrainer.get(tid) ?? t('Trainer', 'Trainer')}</Text>
                                </Tocco>
                                {tr ? <InfoTrainer onPress={() => setChiE(tr)} nome={tr.nome} /> : null}
                              </View>
                            )
                          })}
                        </View>
                      </View>
                    ) : conChi != null ? (
                      <View style={stili.conChi}>
                        <FotoTrainer trainer={trainerDi.get(conChi)} nome={nomeTrainer.get(conChi) ?? ''} size={52} />
                        <Text style={[stili.nota, { flex: 1, color: p.testoSecondario }]}>
                          {t('Con', 'With')} <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 15.5 }}>{nomeTrainer.get(conChi)}</Text>
                        </Text>
                        {trainerDi.get(conChi) ? <InfoTrainer onPress={() => setChiE(trainerDi.get(conChi) ?? null)} nome={nomeTrainer.get(conChi) ?? ''} /> : null}
                      </View>
                    ) : null}

                    {erroreAzione ? <Messaggio tono={daPagare ? 'attenzione' : 'errore'}>{erroreAzione}</Messaggio> : null}
                    {daPagare ? (
                      // Salva e paga, come per le lezioni.
                      <View style={{ gap: spazio.due }}>
                        {daPagare.carta && daPagare.acquisto_id && daPagare.prodotto.prezzo != null ? (
                          <>
                            <Pulsante
                              testo={t(`Paga ${euro(daPagare.prodotto.prezzo)} con la carta${daPagare.carta.finale ? ` •••• ${daPagare.carta.finale}` : ''}`, `Pay ${euro(daPagare.prodotto.prezzo)} with your card${daPagare.carta.finale ? ` •••• ${daPagare.carta.finale}` : ''}`)}
                              icona="carta"
                              onPress={() => pagaConCarta(daPagare.acquisto_id!)}
                              inCorso={attesa}
                            />
                            <Pulsante testo={t('Usa un’altra carta', 'Use another card')} variante="fantasma" piccolo onPress={() => vaiAlPagamento(daPagare.url)} disabilitato={attesa} />
                          </>
                        ) : (
                          <Pulsante
                            testo={t(`Acquista e prenota${daPagare.prodotto.prezzo != null ? ` · ${euro(daPagare.prodotto.prezzo)}` : ''}`, `Buy and book${daPagare.prodotto.prezzo != null ? ` · ${euro(daPagare.prodotto.prezzo)}` : ''}`)}
                            icona="carta"
                            onPress={() => vaiAlPagamento(daPagare.url)}
                            inCorso={attesa}
                          />
                        )}
                        <Text style={[stili.nota, { color: p.testoSecondario }]}>
                          {daPagare.carta ? t('La carta la custodisce ', 'Your card is stored by ') : t('Paghi sulla pagina protetta di ', 'You pay on the secure page of ')}
                          <InfoAdyen />
                          {daPagare.carta
                            ? t(': il club non vede mai il numero completo. Pagata la seduta, la prenotiamo a questo orario.', ': the club never sees the full number. Once the session is paid, we book it at this time.')
                            : t(', in un passo solo: la carta resta salvata per i prossimi acquisti, e pagata la seduta la prenotiamo a questo orario.', ', in a single step: your card stays saved for future purchases, and once the session is paid we book it at this time.')}
                        </Text>
                      </View>
                    ) : (
                      <Pulsante
                        testo={
                          conChi == null
                            ? t('Scegli il trainer', 'Choose a trainer')
                            : opzione.acquisto
                              ? `${t('Acquista', 'Buy')}${stato.acquisto?.prodotto.prezzo != null ? ` · ${euro(stato.acquisto.prodotto.prezzo)}` : ''}`
                              : t('Prenota', 'Book')
                        }
                        icona={opzione.acquisto ? 'carta' : 'avanti'}
                        onPress={opzione.acquisto ? acquista : prenota}
                        inCorso={attesa}
                        disabilitato={conChi == null}
                      />
                    )}
                    {!daPagare && !opzione.acquisto ? (
                      <Text style={[stili.nota, { color: p.testoTerzo }]}>{t(`Prenotando si scala una seduta da «${opzione.titolo}».`, `Booking uses one session from “${opzione.titolo}”.`)}</Text>
                    ) : null}
                  </View>
                ) : null}
              </Carta>
            </View>
          )}
        </Sezione>
      ) : null}

      {disponibili.length ? (
        <Sezione titolo={t('I trainer', 'Trainers')} conteggio={disponibili.length}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
            {disponibili.map((tr) => (
              <Tocco key={tr.id} onPress={() => setChiE(tr)} etichetta={t(`Chi è ${tr.nome}`, `Who is ${tr.nome}`)} scala={0.97} style={[stili.vetrina, { backgroundColor: p.carta, borderColor: p.linea }]}>
                {tr.foto ? (
                  <Image source={{ uri: tr.foto }} contentFit="cover" contentPosition="top" transition={150} style={[stili.vetrinaFoto, { backgroundColor: p.incavo }]} />
                ) : (
                  <View style={[stili.vetrinaFoto, { alignItems: 'center', justifyContent: 'center', backgroundColor: p.incavo }]}>
                    <Avatar nome={tr.nome} size={56} />
                  </View>
                )}
                <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 14 }} numberOfLines={2}>
                  {tr.nome}
                </Text>
              </Tocco>
            ))}
          </ScrollView>
        </Sezione>
      ) : null}

      <FoglioTrainer trainer={chiE} onChiudi={() => setChiE(null)} />
      <FoglioCompra
        cosa={daComprare}
        stato={stato}
        onChiudi={() => setDaComprare(null)}
        onSedutaPagata={() => {
          setDaComprare(null)
          quanteSedute.current = stato.crediti.reduce((tot, c) => tot + c.quantita, 0)
          setSedutaInArrivo('attesa')
        }}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  fila: { gap: spazio.due, paddingHorizontal: spazio.tre + 2, paddingVertical: 4 },
  fuori: { marginHorizontal: -(spazio.tre + 2), flexGrow: 0 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 18, paddingVertical: 6, paddingLeft: 6, paddingRight: spazio.tre, borderWidth: StyleSheet.hairlineWidth },
  filtro: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 999, paddingVertical: 7, paddingHorizontal: spazio.tre, borderWidth: StyleSheet.hairlineWidth, minHeight: 40 },
  giorno: { width: 64, height: 98, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 2 },
  settimana: { fontSize: 11, fontFamily: F.extra, textTransform: 'uppercase', letterSpacing: 1 },
  numero: { fontSize: 24, fontFamily: F.extra, letterSpacing: -0.6 },
  mese: { fontSize: 11, fontFamily: F.extra, textTransform: 'uppercase', letterSpacing: 1 },
  puntino: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  giornoTitolo: { fontSize: 20, fontFamily: F.extra, letterSpacing: -0.5 },
  nota: { fontSize: 13.5, lineHeight: 20, fontFamily: F.medio },
  orario: { width: 56, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  orarioTesto: { color: '#fff', fontFamily: F.extra, fontSize: 14, fontVariant: ['tabular-nums'] },
  fascia: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2 },
  orari: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  orarioCella: { width: '25%', padding: 4 },
  turno: { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 1 },
  turnoOra: { fontFamily: F.extra, fontSize: 15, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  turnoSotto: { fontFamily: F.bold, fontSize: 11 },
  scelto: { gap: spazio.tre, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre },
  sceltoOra: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  conChi: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  sceltaTrainer: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 20, borderWidth: 1.5, paddingRight: spazio.due + 2 },
  sceltaTocco: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.due + 2 },
  fotoGrande: { width: '100%', aspectRatio: 1, maxHeight: 360, borderRadius: 24 },
  prezzo: { fontFamily: F.extra, fontSize: 30 },
  info: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  frase: { fontFamily: F.semi, fontSize: 16, lineHeight: 23, fontStyle: 'italic', borderLeftWidth: 3, paddingLeft: spazio.tre },
  voce: { flexDirection: 'row', gap: spazio.due, alignItems: 'flex-start' },
  pallino: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  voceTesto: { flex: 1, fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  estratto: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: 'hidden' },
  estrattoTesta: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, padding: spazio.tre },
  vetrina: { width: 132, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 8, gap: 8 },
  vetrinaFoto: { width: '100%', height: 140, borderRadius: 16 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
