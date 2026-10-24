import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import type Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  esitoAcquistoLezione,
  leggiGiorno,
  type DaPagare,
  type EsitoAcquisto,
  type Giorno,
  type Lezione,
  type Prenotata,
  type PersonaCalendario,
  type SchedaLezione,
} from '@/api/lab'
import { InfoAdyen } from '@/components/InfoAdyen'
import { euro, giornoEsteso, ora } from '@/lib/eventi'
import { locale, t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from './memoria'
import { CalorieLezione, CorpoPerLezioni } from './schede/CalorieLezione'
import { posizione } from './SchedaLezione'
import { ingombroBarra } from './ui/BarraSchede'
import { FoglioLezione } from './ui/FoglioLezione'
import { Icona, type NomeIcona } from './ui/Icona'
import { Avatar, Barra, Bollino, Carta, Entra, Etichetta, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione, Tag } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { SceltaPrenotazioni } from './ui/SceltaPrenotazioni'
import { F, FUOCO, NOTTE, usePalette, velo, type ToniTutti } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'
import { usePrenotazioneLezione } from './usePrenotazioneLezione'

// Il calendario del laboratorio: le lezioni di gruppo di oggi e dei tre giorni
// dopo, e la prenotazione vera su PerfectGym, per se' o per un figlio.
// Le regole (apertura, posti, disdetta, quote da saldare) le applica
// PerfectGym; qui si mostrano i suoi rifiuti.

/** Nome e cognome per esteso, come sulla scheda del club. */
function nomeCompleto(p: Pick<PersonaCalendario, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].filter(Boolean).join(' ') || t('Senza nome', 'No name')
}

function maiuscola(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function etichettaGiorno(data: string): { settimana: string; numero: string } {
  const [settimana, numero] = giornoEsteso(data).split(' ')
  return { settimana: settimana.slice(0, 3), numero }
}

/** «gio 22 ott, 10:00», all'ora di Roma. */
function apertura(iso: string): string {
  const d = new Date(iso)
  const giorno = new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(d)
  return `${giorno}, ${ora(iso)}`
}

/** Il nome sopra e il cognome sotto: in una riga sola un nome lungo veniva tagliato. */
function suDueRighe(chi: string): string {
  const [nome, ...resto] = chi.trim().split(/\s+/)
  return resto.length ? `${nome}\n${resto.join(' ')}` : nome
}

function minuti(inizio: string, fine: string): number {
  return Math.round((new Date(fine).getTime() - new Date(inizio).getTime()) / 60000)
}

/** Chi aspetta un posto in una lezione completa: «3 in lista d'attesa». Senza il dato (funzione non ancora aggiornata) non dice niente. */
function inAttesa(l: Lezione): string | null {
  if (l.liberi > 0 || l.in_attesa === undefined) return null
  return l.in_attesa === 0 ? t('nessuno in lista d’attesa', 'no one on the waiting list') : `${l.in_attesa} ${t('in lista d’attesa', 'on the waiting list')}`
}

/** La copertina della lezione: la foto del sito, sfumata, col nome sopra. */
function Copertina({ l, scheda, onScheda }: { l: Lezione; scheda: SchedaLezione | null; onScheda: () => void }) {
  const p = usePalette()
  const b = l.prenotazione
  const tono = l.liberi <= 0 ? 'errore' : l.liberi < 5 ? 'attenzione' : 'ok'
  const corpo = (
    <View style={stili.copertina}>
      {scheda?.foto ? (
        <Image source={{ uri: scheda.foto }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={posizione(scheda.fuoco)} transition={200} />
      ) : (
        <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', right: -10, top: -6, transform: [{ rotate: '-14deg' }] }}>
            <Icona nome="abbonamento" size={130} colore="rgba(255,255,255,0.07)" />
          </View>
        </LinearGradient>
      )}
      <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={stili.copertinaAlto}>
        <Tag testo={l.categoria} colore="#fff" fondo="rgba(0,0,0,0.25)" />
        {b ? (
          <View style={[stili.vetrino, { backgroundColor: b.attesa ? p.attenzione : p.ok }]}>
            <Icona nome={b.attesa ? 'clessidra' : 'spunta'} size={13} colore="#fff" />
            <Text style={stili.vetrinoTesto}>{b.attesa ? t('In attesa', 'Waiting') : t('Prenotata', 'Booked')}</Text>
          </View>
        ) : l.iniziata ? (
          <View style={stili.vetrino}>
            <Text style={stili.vetrinoTesto}>{t('Già cominciata', 'Already started')}</Text>
          </View>
        ) : (
          <View style={stili.vetrino} accessibilityLabel={l.liberi <= 0 ? `${t('Lezione completa', 'Class full')}${inAttesa(l) ? `, ${inAttesa(l)}` : ''}` : `${l.liberi} ${l.liberi === 1 ? t('posto libero', 'spot available') : t('posti liberi', 'spots available')}`}>
            <View style={[stili.puntino, { backgroundColor: tono === 'ok' ? '#6DD58C' : tono === 'attenzione' ? '#F2B84B' : '#FF6B6B' }]} />
            <Text style={stili.vetrinoTesto}>
              {l.liberi <= 0 ? (l.in_attesa ? `${t('Completa', 'Full')} · ${l.in_attesa} ${t('in attesa', 'waiting')}` : t('Completa', 'Full')) : `${l.liberi} ${l.liberi === 1 ? t('posto', 'spot') : t('posti', 'spots')}`}
            </Text>
          </View>
        )}
      </View>
      <View style={{ gap: 2 }}>
        <Text style={stili.copertinaNome} numberOfLines={2}>
          {l.nome}
        </Text>
        {l.istruttore ? <Text style={stili.copertinaIstruttore}>{t('con', 'with')} {l.istruttore}</Text> : null}
      </View>
      {scheda ? (
        <View style={stili.info}>
          <Icona nome="play" size={16} colore="#fff" />
        </View>
      ) : null}
    </View>
  )
  return scheda ? (
    <Tocco onPress={onScheda} scala={0.99} etichetta={`${t('Scheda di', 'Details for')} ${l.nome}: ${t('video e descrizione', 'video and description')}`}>
      {corpo}
    </Tocco>
  ) : (
    corpo
  )
}

/** Cio' che serve ai pulsanti di una lezione: li usa anche il Percorso Athlon (`percorso/Percorso.tsx`). */
export type PropsLezione = {
  l: Lezione
  scheda: SchedaLezione | null
  onScheda: () => void
  occupato: boolean
  /** Null se e' andata; altrimenti il motivo e, se manca solo il prodotto, cosa comprare (col link gia' aperto). */
  onPrenota: () => Promise<({ errore: string } & Partial<DaPagare>) | null>
  onAcquista: (url?: string) => Promise<string | null>
  onPagaCarta: (acquistoId: string) => Promise<string | null>
  onDisdici: () => Promise<string | null>
}

/**
 * I pulsanti di una lezione: prenota (o lista d'attesa), disdici, paga se la
 * lezione non e' compresa, e i motivi per cui non si prenota. Li usano la card
 * della lezione e la griglia dei turni della Gym Floor.
 */
export function AzioniLezione({
  l,
  scheda,
  onScheda,
  occupato,
  onPrenota,
  onAcquista,
  onPagaCarta,
  onDisdici,
  testoPrenota,
}: PropsLezione & {
  /** Dopo «Prenota»: l'orario del turno, nella griglia della Gym Floor. */
  testoPrenota?: string
}) {
  const p = usePalette()
  const [conferma, setConferma] = useState(false)
  // Il prodotto da comprare, dopo che PerfectGym ha detto che la lezione non e' compresa.
  const [daPagare, setDaPagare] = useState<DaPagare | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const b = l.prenotazione

  async function esegui(azione: () => Promise<string | null>) {
    setErrore(null)
    setAttesa(true)
    const problema = await azione()
    setAttesa(false)
    setConferma(false)
    if (problema) {
      colpetto('errore')
      setErrore(problema)
    }
  }

  return (
    <>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {l.iniziata ? null : b ? (
        conferma ? (
          <View style={stili.azioni}>
            <Pulsante testo={t('Sì, disdici', 'Yes, cancel')} variante="pericolo" onPress={() => esegui(onDisdici)} inCorso={attesa} />
            <Pulsante testo={t('No', 'No')} variante="secondario" onPress={() => setConferma(false)} disabilitato={attesa} />
          </View>
        ) : (
          <Pulsante testo={t('Disdici', 'Cancel booking')} variante="contorno" icona="chiudi" onPress={() => setConferma(true)} disabilitato={occupato} />
        )
      ) : l.limite ? (
        <Messaggio tono="attenzione">{l.limite.messaggio}</Messaggio>
      ) : l.prenotabile_dal ? (
        <View style={[stili.apertura, { backgroundColor: p.incavo }]}>
          <Icona nome="lucchetto" size={16} colore={p.testoSecondario} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 14 }}>{t('Prenotabile da', 'Bookable from')} {apertura(l.prenotabile_dal)}</Text>
        </View>
      ) : daPagare ? (
        // Salva e paga: con la carta gia' salvata si paga con quella (o con
        // un'altra); senza, sulla pagina di Adyen, e la carta resta salvata.
        <View style={{ gap: spazio.due }}>
          {daPagare.carta && daPagare.acquisto_id && daPagare.prodotto.prezzo != null ? (
            <>
              <Pulsante
                testo={`${t('Paga', 'Pay')} ${euro(daPagare.prodotto.prezzo)} ${t('con la carta', 'with your card')}${daPagare.carta.finale ? ` •••• ${daPagare.carta.finale}` : ''}`}
                icona="carta"
                onPress={() => esegui(() => onPagaCarta(daPagare.acquisto_id!))}
                inCorso={attesa}
                disabilitato={occupato}
              />
              <Pulsante testo={t('Usa un’altra carta', 'Use another card')} variante="fantasma" piccolo onPress={() => esegui(() => onAcquista(daPagare.url))} />
            </>
          ) : (
            <Pulsante
              testo={`${t('Acquista e prenota', 'Buy and book')}${daPagare.prodotto.prezzo != null ? ` · ${euro(daPagare.prodotto.prezzo)}` : ''}`}
              icona="carta"
              onPress={() => esegui(() => onAcquista(daPagare.url))}
              inCorso={attesa}
              disabilitato={occupato}
            />
          )}
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {daPagare.carta ? t('La carta la custodisce ', 'Your card is held by ') : t('Paghi sulla pagina protetta di ', 'You pay on the secure page of ')}
            <InfoAdyen />
            {daPagare.carta
              ? t(': il club non vede mai il numero completo.', ': the club never sees the full number.')
              : t(', in un passo solo: la carta resta salvata per i prossimi acquisti e il club non ne vede mai il numero completo.', ', in one step: your card is saved for future purchases and the club never sees the full number.')}
          </Text>
        </View>
      ) : (
        <View style={stili.azioni}>
          {scheda ? <Pulsante testo={t('Dettagli', 'Details')} variante="contorno" onPress={onScheda} /> : null}
          <Pulsante
            testo={`${l.liberi <= 0 ? t('Lista d’attesa', 'Join waiting list') : t('Prenota', 'Book')}${testoPrenota ? ` ${testoPrenota}` : ''}`}
            icona={l.liberi <= 0 ? 'clessidra' : 'avanti'}
            variante={l.liberi <= 0 ? 'scuro' : 'primario'}
            onPress={async () => {
              setErrore(null)
              setAttesa(true)
              const r = await onPrenota()
              setAttesa(false)
              if (r) {
                colpetto('errore')
                setErrore(r.errore)
              } else colpetto('ok')
              if (r?.prodotto) setDaPagare({ prodotto: r.prodotto, url: r.url, acquisto_id: r.acquisto_id, carta: r.carta ?? null })
            }}
            inCorso={attesa}
            disabilitato={occupato}
          />
        </View>
      )}
    </>
  )
}

/** La riga sotto la barra dei posti: chi aspetta, con la clessidra. */
function RigaAttesa({ testo }: { testo: string }) {
  const p = usePalette()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icona nome="clessidra" size={14} colore={p.attenzione} />
      <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 13.5 }}>{testo.charAt(0).toUpperCase() + testo.slice(1)}</Text>
    </View>
  )
}

function RigaLezione(props: PropsLezione & { titolare: boolean }) {
  const { l, scheda, onScheda, titolare } = props
  const p = usePalette()
  const b = l.prenotazione

  // I posti sono la cosa che si guarda per prima: verdi quando ce n'e',
  // gialli quando stanno finendo, rossi quando la lezione e' completa.
  const colorePosti = l.liberi <= 0 ? p.errore : l.liberi < 5 ? p.attenzione : p.ok
  const dettagli = [
    { valore: ora(l.inizio), etichetta: t('Inizio', 'Start') },
    { valore: `${minuti(l.inizio, l.fine)}′`, etichetta: t('Durata', 'Duration') },
    { valore: l.iniziata ? '—' : `${Math.max(0, l.liberi)}/${l.posti}`, etichetta: t('Posti liberi', 'Open spots') },
  ]

  return (
    <View style={[stili.lezione, { backgroundColor: p.carta, borderColor: b ? (b.attesa ? p.attenzione : p.ok) : p.linea, borderWidth: b ? 2 : StyleSheet.hairlineWidth, boxShadow: p.ombra }]}>
      <Copertina l={l} scheda={scheda} onScheda={onScheda} />
      <View style={stili.corpo}>
        <View style={stili.cifre}>
          {dettagli.map((d, i) => (
            <View key={d.etichetta} style={[stili.cifra, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: p.linea }]}>
              <Text style={[stili.cifraValore, { color: i === 2 && !l.iniziata ? colorePosti : p.testo }]}>{d.valore}</Text>
              <Text style={[stili.cifraEtichetta, { color: p.testoSecondario }]}>{d.etichetta}</Text>
            </View>
          ))}
        </View>
        {!l.iniziata ? <Barra valore={l.posti ? Math.min(1, l.iscritti / l.posti) : 0} colore={colorePosti} altezza={6} animata ritardo={250} /> : null}
        {!l.iniziata && inAttesa(l) ? <RigaAttesa testo={inAttesa(l) as string} /> : null}
        <CalorieLezione l={l} scheda={scheda} titolare={titolare} variante="riga" />
        <AzioniLezione {...props} />
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Le attivita' a turni: la Gym Floor (turni da 80 minuti ogni mezz'ora, una
// trentina al giorno) e il Nuoto Libero (un turno l'ora). Una card per turno
// faceva scorrere all'infinito (15/10/2026): qui sono una card sola, con gli
// orari in griglia divisi per fascia; si tocca un orario e sotto ci sono i
// suoi numeri e «Prenota».
//
// Cosa dicono gli orari (scelta dell'utente, 15/10/2026): nella Gym Floor solo
// i prenotati, perche' in sala la capienza non e' un problema; nel Nuoto
// Libero i posti liberi, coi colori, perche' le corsie si riempiono.
//
// L'istruttore (15/10/2026): nella Gym Floor su PerfectGym e' uno di due nomi
// finti, «Con Assistenza» (c'e' l'assistente in sala) o «Allenamento Libero»
// (non c'e'): gli orari con l'assistente hanno il bollino blu. Nel Nuoto
// Libero e' l'assistente vero, col suo nome.

// I filtri per attivita' (20/10/2026, richiesta dei tester: «i filtri non si vedono»): una tessera per attivita',
// tutte in vista, con icona e colore. Nell'acqua il blu, in sala l'arancio, il resto neutro; un'attivita' nuova
// del listino prende l'icona del calendario finche' non se ne sceglie una.
function segnoAttivita(categoria: string | null): { icona: NomeIcona; tono: ToniTutti } {
  if (!categoria) return { icona: 'elenco', tono: 'neutro' }
  const c = categoria.toLowerCase()
  if (/aqua|nuoto|acqua/.test(c)) return { icona: 'goccia', tono: 'blu' }
  if (/gym|sala|forza/.test(c)) return { icona: 'peso', tono: 'accento' }
  if (/corsi|fitness|reformer|master|pilates|yoga/.test(c)) return { icona: 'persone', tono: 'accento' }
  return { icona: 'calendario', tono: 'neutro' }
}

const A_TURNI = [
  { categoria: 'Gym Floor', conPosti: false, assistente: 'in sala' },
  { categoria: 'Nuoto Libero', conPosti: true, assistente: 'nome' },
] as const

/** Nella Gym Floor: c'e' l'assistente in sala? Dal nome finto dell'istruttore; null se non si sa. */
function conAssistenza(istruttore: string | null): boolean | null {
  if (/assisten/i.test(istruttore ?? '')) return true
  if (/libero/i.test(istruttore ?? '')) return false
  return null
}

const FASCE = [
  { nome: t('Mattina', 'Morning'), fino: 12 },
  { nome: t('Pomeriggio', 'Afternoon'), fino: 17 },
  { nome: t('Sera', 'Evening'), fino: 24 },
] as const

/** Chi c'e' nel turno scelto: l'assistente in sala o no (Gym Floor), il suo nome (Nuoto Libero). */
function Assistente({ turno, come }: { turno: Lezione; come: 'in sala' | 'nome' }) {
  const p = usePalette()
  if (come === 'nome') {
    if (!turno.istruttore) return null
    return (
      <View style={stili.assistente}>
        <Avatar nome={turno.istruttore.split(' ')[0]} cognome={turno.istruttore.split(' ').slice(1).join(' ')} size={30} />
        <Text style={[stili.nota, { color: p.testoSecondario, flexShrink: 1 }]}>
          {t('Assistente:', 'Assistant:')} <Text style={{ color: p.testo, fontFamily: F.bold }}>{turno.istruttore}</Text>
        </Text>
      </View>
    )
  }
  const c = conAssistenza(turno.istruttore)
  if (c == null) return null
  return (
    <View style={[stili.assistente, { backgroundColor: c ? velo(p, 'blu', 0.12) : p.incavo, borderRadius: 14, padding: spazio.due }]}>
      <View style={[stili.bollinoAssistente, { position: 'relative', top: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: c ? p.blu : p.testoTerzo }]}>
        <Icona nome="persona" size={14} colore="#fff" />
      </View>
      <Text style={[stili.nota, { color: c ? p.testo : p.testoSecondario, flexShrink: 1 }]}>
        {c ? (
          <Text style={{ fontFamily: F.bold }}>{t('Con l’assistente in sala', 'With the floor assistant')}</Text>
        ) : (
          <>
            <Text style={{ fontFamily: F.bold }}>{t('Allenamento libero', 'Free training')}</Text>{t(': senza assistente in sala', ': no floor assistant')}
          </>
        )}
      </Text>
    </View>
  )
}

function TurniInGriglia({
  nome,
  conPosti,
  assistente,
  turni,
  scheda,
  titolare,
  onScheda,
  occupato,
  onPrenota,
  onAcquista,
  onPagaCarta,
  onDisdici,
  onMostra,
}: {
  /** Le calorie si stimano solo per il titolare: peso, altezza ed eta' sono i suoi. */
  titolare: boolean
  /** Porta in vista il riquadro del turno scelto, col suo «Prenota». */
  onMostra: (riquadro: View | null) => void
  /** Il nome dell'attivita', che e' anche la sua categoria: «Gym Floor», «Nuoto Libero». */
  nome: string
  /** Sugli orari i posti liberi coi colori (Nuoto Libero); senza, i prenotati (Gym Floor). */
  conPosti: boolean
  /** «in sala»: il bollino blu dove c'e' l'assistente (Gym Floor); «nome»: chi e' l'assistente (Nuoto Libero). */
  assistente: 'in sala' | 'nome'
  turni: Lezione[]
  scheda: SchedaLezione | null
  onScheda: () => void
  occupato: boolean
  onPrenota: (l: Lezione) => Promise<({ errore: string } & Partial<DaPagare>) | null>
  onAcquista: (l: Lezione, url?: string) => Promise<string | null>
  onPagaCarta: (acquistoId: string) => Promise<string | null>
  onDisdici: (l: Lezione) => Promise<string | null>
}) {
  const p = usePalette()
  // Si parte dal turno gia' prenotato, se c'e', o dal primo con posti.
  const [sceltoId, setSceltoId] = useState(
    () => (turni.find((tu) => tu.prenotazione) ?? turni.find((tu) => !tu.iniziata && tu.liberi > 0) ?? turni[0]).class_id,
  )
  const scelto = turni.find((tu) => tu.class_id === sceltoId) ?? turni[0]
  const riquadro = useRef<View>(null)

  /** Sceglie il turno e scende al suo «Prenota», dopo che il riquadro si e' ridisegnato. */
  function scegli(id: number) {
    setSceltoId(id)
    requestAnimationFrame(() => onMostra(riquadro.current))
  }
  const durata = minuti(turni[0].inizio, turni[0].fine)
  const prenotati = (tu: Lezione) => `${tu.iscritti} ${t('prenotati', 'booked')}`
  const tonoPosti = (tu: Lezione): 'errore' | 'attenzione' | 'ok' => (tu.liberi <= 0 ? 'errore' : tu.liberi < 5 ? 'attenzione' : 'ok')
  const colorePosti = (tu: Lezione) => p[tonoPosti(tu)]
  const posti = (tu: Lezione) => (tu.liberi <= 0 ? `${t('completo', 'full')}${inAttesa(tu) ? `, ${inAttesa(tu)}` : ''}` : `${tu.liberi} ${tu.liberi === 1 ? t('posto libero', 'spot available') : t('posti liberi', 'spots available')}`)

  return (
    <View style={[stili.lezione, { backgroundColor: p.carta, borderColor: p.linea, borderWidth: StyleSheet.hairlineWidth, boxShadow: p.ombra }]}>
      <Tocco onPress={onScheda} scala={0.99} etichetta={`${nome}: ${t('video e descrizione', 'video and description')}`}>
        <View style={[stili.copertina, { height: 124 }]}>
          {scheda?.foto ? (
            <Image source={{ uri: scheda.foto }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={posizione(scheda.fuoco)} transition={200} />
          ) : (
            <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <Tag testo={nome} colore="#fff" fondo="rgba(0,0,0,0.25)" />
          <View style={{ gap: 2 }}>
            <Text style={stili.copertinaNome}>{nome}</Text>
            <Text style={stili.copertinaIstruttore}>{`${turni.length} ${t('turni da', 'sessions of')} ${durata} ${t('minuti · scegli l’orario', 'minutes · pick a time')}`}</Text>
          </View>
          {scheda ? (
            <View style={stili.info}>
              <Icona nome="play" size={16} colore="#fff" />
            </View>
          ) : null}
        </View>
      </Tocco>

      <View style={stili.corpo}>
        {assistente === 'in sala' ? (
          // La legenda del bollino.
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
            <View style={[stili.bollinoAssistente, { position: 'relative', top: 0, right: 0, backgroundColor: p.blu }]}>
              <Icona nome="persona" size={9} colore="#fff" />
            </View>
            <Text style={[stili.nota, { color: p.testoSecondario, flexShrink: 1 }]}>
              <Text style={{ color: p.testo, fontFamily: F.bold }}>{t('Con l’assistente in sala', 'With the floor assistant')}</Text> {t('· senza bollino: allenamento libero', '· no badge: free training')}
            </Text>
          </View>
        ) : null}
        {FASCE.map((f, i) => {
          const da = i ? FASCE[i - 1].fino : 0
          const qui = turni.filter((tu) => {
            const h = Number(ora(tu.inizio).slice(0, 2))
            return h >= da && h < f.fino
          })
          if (!qui.length) return null
          return (
            <View key={f.nome} style={{ gap: spazio.due }}>
              <Text style={[stili.fascia, { color: p.testoSecondario }]}>{f.nome.toUpperCase()}</Text>
              <View style={stili.orari}>
                {qui.map((tu) => {
                  const attivo = tu.class_id === scelto.class_id
                  const mio = !!tu.prenotazione
                  const assistito = assistente === 'in sala' && conAssistenza(tu.istruttore) === true
                  return (
                    <View key={tu.class_id} style={stili.orarioCella}>
                      <Tocco
                        vibra="scelta"
                        stato={{ selected: attivo }}
                        onPress={() => scegli(tu.class_id)}
                        etichetta={`${ora(tu.inizio)}${assistito ? t(', con l’assistente in sala', ', with the floor assistant') : ''}, ${mio ? (tu.prenotazione?.attesa ? t('sei in lista d’attesa', 'you are on the waiting list') : t('ci sei anche tu', 'you are booked too')) : conPosti ? posti(tu) : prenotati(tu)}`}
                        style={[
                          stili.turno,
                          mio
                            ? { backgroundColor: tu.prenotazione?.attesa ? p.attenzione : p.accento }
                            : { backgroundColor: conPosti && !tu.iniziata ? velo(p, tonoPosti(tu), 0.13) : p.incavo },
                          attivo && { borderColor: mio ? '#fff' : p.testo, borderWidth: 2 },
                        ]}
                      >
                        <Text style={[stili.turnoOra, { color: mio ? '#fff' : tu.iniziata ? p.testoTerzo : p.testo }]}>{ora(tu.inizio)}</Text>
                        {mio || tu.iniziata ? (
                          <Text style={[stili.turnoPosti, { color: mio ? 'rgba(255,255,255,0.9)' : p.testoTerzo }]} numberOfLines={1}>
                            {mio ? (tu.prenotazione?.attesa ? t('in attesa', 'waiting') : t('✓ tuo', '✓ yours')) : t('iniziato', 'started')}
                          </Text>
                        ) : conPosti ? (
                          <Text style={[stili.turnoPosti, { color: colorePosti(tu) }]} numberOfLines={1}>
                            {tu.liberi <= 0 ? t('pieno', 'full') : `${tu.liberi} ${t('posti', 'spots')}`}
                          </Text>
                        ) : (
                          // Quanti prenotati: l'omino e il numero.
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Icona nome="persona" size={11} colore={p.testoSecondario} />
                            <Text style={[stili.turnoPosti, { color: p.testoSecondario }]}>{tu.iscritti}</Text>
                          </View>
                        )}
                        {assistito ? (
                          <View style={[stili.bollinoAssistente, { backgroundColor: p.blu, borderColor: mio ? p.accento : p.carta }]}>
                            <Icona nome="persona" size={9} colore="#fff" />
                          </View>
                        ) : null}
                      </Tocco>
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}

        <View ref={riquadro} style={[stili.scelto, { borderTopColor: p.linea }]}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spazio.due }}>
            <Text style={[stili.sceltoOra, { color: p.testo }]}>{`${ora(scelto.inizio)} – ${ora(scelto.fine)}`}</Text>
            {conPosti ? (
              !scelto.iniziata ? (
                <Text style={{ color: colorePosti(scelto), fontFamily: F.extra, fontSize: 14 }}>
                  {scelto.liberi <= 0 ? t('Completo', 'Full') : `${scelto.liberi}/${scelto.posti} ${t('posti liberi', 'spots available')}`}
                </Text>
              ) : null
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icona nome="persone" size={16} colore={p.testoSecondario} />
                <Text style={{ color: p.testoSecondario, fontFamily: F.extra, fontSize: 14 }}>{prenotati(scelto)}</Text>
              </View>
            )}
          </View>
          <Assistente turno={scelto} come={assistente} />
          {/* Il Nuoto Libero ha un consumo indicativo; la Gym Floor niente (ha la stima della sua scheda): lo decide stimaCorso. */}
          <CalorieLezione l={scelto} scheda={scheda} titolare={titolare} variante="riga" />
          {conPosti && !scelto.iniziata ? (
            <Barra key={`barra-${scelto.class_id}`} valore={scelto.posti ? Math.min(1, scelto.iscritti / scelto.posti) : 0} colore={colorePosti(scelto)} altezza={6} animata />
          ) : null}
          {conPosti && !scelto.iniziata && inAttesa(scelto) ? <RigaAttesa testo={inAttesa(scelto) as string} /> : null}
          <AzioniLezione
            // Cambiando turno i pulsanti ripartono da capo (conferme, errori, pagamento).
            key={scelto.class_id}
            l={scelto}
            scheda={null}
            onScheda={onScheda}
            occupato={occupato}
            onPrenota={() => onPrenota(scelto)}
            onAcquista={(url) => onAcquista(scelto, url)}
            onPagaCarta={onPagaCarta}
            onDisdici={() => onDisdici(scelto)}
            testoPrenota={ora(scelto.inizio)}
          />
        </View>
      </View>
    </View>
  )
}

const SUBENTRO = t('Potrai ricevere una notifica via email in caso di subentro, entro massimo un’ora dal suo inizio.', 'You may get an email notification if a spot opens up, up to one hour before the class starts.')

/** La «i» della lista d'attesa: sul web al passaggio del mouse, sul telefono al tocco. */
function InfoAttesa() {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={() => setAperta((a) => !a)}
        onHoverIn={() => setAperta(true)}
        onHoverOut={() => setAperta(false)}
        accessibilityRole="button"
        accessibilityLabel={SUBENTRO}
        hitSlop={8}
      >
        <Icona nome="info" size={18} colore={p.attenzione} />
      </Pressable>
      {aperta ? (
        <View style={[stili.fumetto, { backgroundColor: p.carbone }]}>
          <Text style={{ color: '#fff', fontSize: 13, lineHeight: 18, fontFamily: F.medio }}>{SUBENTRO}</Text>
        </View>
      ) : null}
    </View>
  )
}

/** «sab 24 ott», all'ora di Roma. */
function giornoBreve(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(new Date(iso))
}

/**
 * Le prenotazioni in programma della persona scelta, di qualunque giorno (25/10/2026, richiesta di Maurizio): stanno sopra i
 * giorni e non dentro quello scelto. Prenotata o in lista d'attesa, e Annulla.
 */
function LezioniPrenotate({ lezioni, occupato, onAnnulla }: { lezioni: Prenotata[]; occupato: boolean; onAnnulla: (l: Prenotata) => Promise<string | null> }) {
  const p = usePalette()
  const [conferma, setConferma] = useState<number | null>(null)
  const [inCorso, setInCorso] = useState<number | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function annulla(l: Prenotata) {
    setErrore(null)
    setInCorso(l.class_id)
    const problema = await onAnnulla(l)
    setInCorso(null)
    setConferma(null)
    if (problema) setErrore(problema)
  }

  return (
    <Sezione titolo={t('Le tue prenotazioni', 'Your bookings')} conteggio={lezioni.length}>
      <Carta style={{ paddingVertical: spazio.due, zIndex: 2 }}>
        {lezioni.map((l, i) => {
          const attesa = l.attesa
          return (
            <View key={l.class_id} style={{ zIndex: lezioni.length - i }}>
              <Riga
                prima={i === 0}
                testa={
                  <LinearGradient colors={attesa ? ['#F5B33B', '#C27800'] : FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.orario}>
                    <Text style={stili.orarioTesto}>{ora(l.inizio)}</Text>
                  </LinearGradient>
                }
                titolo={l.nome}
                sotto={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 13 }}>{maiuscola(giornoBreve(l.inizio))}</Text>
                    <Etichetta testo={attesa ? t('In lista d’attesa', 'On the waiting list') : t('Prenotata', 'Booked')} tono={attesa ? 'attenzione' : 'ok'} />
                    {attesa ? <InfoAttesa /> : null}
                  </View>
                }
                coda={
                  conferma === l.class_id ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pulsante testo={t('Sì, annulla', 'Yes, cancel')} variante="pericolo" piccolo pieno={false} onPress={() => annulla(l)} inCorso={inCorso === l.class_id} />
                      <Pulsante testo={t('No', 'No')} variante="secondario" piccolo pieno={false} onPress={() => setConferma(null)} disabilitato={inCorso !== null} />
                    </View>
                  ) : (
                    <Pulsante testo={t('Annulla', 'Cancel')} variante="secondario" piccolo pieno={false} onPress={() => setConferma(l.class_id)} disabilitato={occupato || inCorso !== null} />
                  )
                }
              />
            </View>
          )
        })}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
      </Carta>
    </Sezione>
  )
}

export function Calendario() {
  // I dati del socio per le calorie delle lezioni si leggono una volta, qui sopra, e non a ogni riga.
  return (
    <CorpoPerLezioni>
      <CalendarioGiorno />
    </CorpoPerLezioni>
  )
}

function CalendarioGiorno() {
  const p = usePalette()
  const [giorno, setGiorno] = useState<Giorno | null>(inMemoria<{ ok: true; giorno: Giorno }>('giorno::')?.giorno ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [carica, setCarica] = useState(true)
  // La categoria scelta (Corsi Fitness, Group Reformer, …) resta passando da
  // un giorno all'altro: chi cerca il Reformer lo cerca in tutta la settimana.
  const [attivita, setAttivita] = useState<string | null>(null)
  const [aperta, setAperta] = useState<Lezione | null>(null)
  const scorrimento = useRef<Animated.ScrollView>(null)
  const { height: altezza } = useWindowDimensions()
  const ins = useSafeAreaInsets()

  /**
   * L'ancora al «Prenota» del turno scelto nelle griglie. Sul web lo scorrimento
   * del browser lo mette a meta' schermo; nell'app si misura dove sta e si
   * scorre quanto basta perche' resti sopra la barra delle schede.
   */
  const mostra = useCallback(
    (v: View | null) => {
      if (!v) return
      if (Platform.OS === 'web') {
        ;(v as unknown as HTMLElement).scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        return
      }
      const sv = scorrimento.current as unknown as ScrollView | null
      const contenuto = sv?.getInnerViewNode?.()
      if (!sv || !contenuto) return
      v.measureLayout(
        contenuto,
        (_x, y, _l, h) => sv.scrollTo({ y: Math.max(0, y + h - (altezza - ingombroBarra(ins.bottom) - spazio.tre)), animated: true }),
        () => undefined,
      )
    },
    [altezza, ins.bottom],
  )

  // Il giorno gia' letto si mostra subito (memoria del laboratorio) e intanto
  // si rilegge; la Home precarica quello di oggi ('giorno::').
  const chiaveGiorno = useRef('giorno::')
  const leggi = useCallback(async (data?: string, memberId?: number) => {
    const chiave = `giorno:${data ?? ''}:${memberId ?? ''}`
    chiaveGiorno.current = chiave
    const gia = inMemoria<{ ok: true; giorno: Giorno }>(chiave)
    if (gia) setGiorno(gia.giorno)
    setCarica(!gia)
    setErrore(null)
    const esito = await prendi(chiave, () => leggiGiorno(data, memberId))
    if (chiaveGiorno.current !== chiave) return
    if (esito.ok) setGiorno(esito.giorno)
    else setErrore(esito.errore)
    setCarica(false)
  }, [])

  // Si puo' arrivare con un giorno e una categoria gia' scelti (`?giorno=2026-10-31&attivita=Eventi Gratuiti`): e' il
  // pulsante «Prenota nel calendario» della pagina di un evento (21/10/2026). Un valore che non ha la forma giusta si
  // ignora; un giorno fuori dai quindici del calendario il server lo riporta a oggi.
  const { giorno: giornoDaFuori, attivita: attivitaDaFuori } = useLocalSearchParams<{ giorno?: string; attivita?: string }>()
  const giornoScelto = typeof giornoDaFuori === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(giornoDaFuori) ? giornoDaFuori : undefined
  const attivitaScelta = giornoScelto && typeof attivitaDaFuori === 'string' && attivitaDaFuori.length <= 60 ? attivitaDaFuori : null
  useEffect(() => {
    setAttivita(attivitaScelta)
    leggi(giornoScelto)
  }, [giornoScelto, attivitaScelta, leggi])

  // Il ritorno dal pagamento di PerfectGym (?acquisto=<id>): si chiede
  // com'e' andata finche' la prenotazione non c'e' (il pagamento arriva a
  // PerfectGym qualche secondo dopo), per due minuti; poi si rilegge il giorno.
  const { acquisto } = useLocalSearchParams<{ acquisto?: string }>()
  const [ritorno, setRitorno] = useState<EsitoAcquisto | { stato: 'avviato' } | null>(null)
  const avviato = useRef(false)
  useEffect(() => {
    if (!acquisto || avviato.current) return
    avviato.current = true
    let giri = 0
    let fermo = false
    const giro = async () => {
      const r = await esitoAcquistoLezione(acquisto)
      if (fermo) return
      if (!r.ok) return setRitorno({ stato: 'errore', errore: r.errore, class_id: 0, member_id: 0 })
      if (r.esito.stato === 'avviato' && ++giri < 30) {
        setRitorno(r.esito)
        setTimeout(giro, 4000)
        return
      }
      setRitorno(r.esito.stato === 'avviato' ? { ...r.esito, stato: 'errore', errore: null } : r.esito)
      leggi(undefined, r.esito.member_id || undefined)
    }
    setRitorno({ stato: 'avviato' })
    giro()
    return () => {
      fermo = true
    }
  }, [acquisto, leggi])

  // Dopo un clic si aggiorna la riga subito, con quello che dice PerfectGym,
  // senza ricaricare la giornata: il mirror puo' essere indietro.
  function aggiorna(classId: number, prenotazione: Lezione['prenotazione'], delta: number, deltaAttesa = 0) {
    setGiorno((g) => {
      if (!g) return g
      const lez = g.lezioni.find((l) => l.class_id === classId)
      const resto = (g.prenotate ?? []).filter((x) => x.class_id !== classId)
      const nuovo = {
        ...g,
        ...(g.prenotate
          ? {
              prenotate: prenotazione && lez
                ? [...resto, { class_id: classId, nome: lez.nome, categoria: lez.categoria, inizio: lez.inizio, attesa: prenotazione.attesa }].sort((x, y) => x.inizio.localeCompare(y.inizio))
                : resto,
            }
          : {}),
        lezioni: g.lezioni.map((l) =>
          l.class_id === classId
            ? {
                ...l,
                prenotazione,
                iscritti: l.iscritti + delta,
                liberi: Math.max(0, l.liberi - delta),
                ...(l.in_attesa === undefined ? {} : { in_attesa: Math.max(0, l.in_attesa + deltaAttesa) }),
              }
            : l
        ),
      }
      // Anche la memoria: tornando qui la prenotazione appena fatta c'e' gia'.
      ricorda(chiaveGiorno.current, { ok: true, giorno: nuovo })
      return nuovo
    })
  }

  // Prenotare, disdire e pagare stanno in `usePrenotazioneLezione`: li fa anche il Percorso Athlon dalle sue tappe.
  const {
    occupato,
    prenota: prenotaClasse,
    acquista: acquistaClasse,
    pagaCarta,
    disdici: disdiciClasse,
  } = usePrenotazioneLezione(giorno?.member_id, {
    prenotata: (id, b) => aggiorna(id, b, b.attesa ? 0 : 1, b.attesa ? 1 : 0),
    disdetta: (id, inAttesa) => aggiorna(id, null, inAttesa ? 0 : -1, inAttesa ? -1 : 0),
  })
  const prenota = (l: Lezione) => prenotaClasse(l.class_id)
  const acquista = (l: Lezione, pronto?: string) => acquistaClasse(l.class_id, pronto)
  const disdici = (l: Lezione) => disdiciClasse(l.class_id, !!l.prenotazione?.attesa)
  const disdiciPrenotata = (l: Prenotata) => disdiciClasse(l.class_id, l.attesa)

  if (errore && !giorno) {
    return (
      <Schermata titolo={t('Prenotazioni', 'Bookings')}>
        <SceltaPrenotazioni attiva="lezioni" />
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={() => leggi()} />
      </Schermata>
    )
  }
  if (!giorno) {
    return (
      <Schermata titolo={t('Prenotazioni', 'Bookings')}>
        <SceltaPrenotazioni attiva="lezioni" />
        <SchedeInArrivo />
      </Schermata>
    )
  }

  // Tutte le prenotazioni in programma, sopra i giorni. Con la funzione di prima si hanno solo quelle del giorno scelto.
  const mie: Prenotata[] =
    giorno.prenotate ??
    giorno.lezioni.filter((l) => l.prenotazione && !l.iniziata).map((l) => ({ class_id: l.class_id, nome: l.nome, categoria: l.categoria, inizio: l.inizio, attesa: !!l.prenotazione?.attesa }))
  // Le lezioni gia' cominciate non si prenotano piu': si tengono solo quelle
  // con una prenotazione, che dicono «ci sei andato».
  const visibili = giorno.lezioni.filter((l) => !l.iniziata || l.prenotazione)
  const nascoste = giorno.lezioni.length - visibili.length
  const conteggi = new Map<string, number>()
  for (const l of visibili) conteggi.set(l.categoria, (conteggi.get(l.categoria) ?? 0) + 1)
  const attivitaDelGiorno = [...conteggi.keys()].sort((x, y) => x.localeCompare(y, locale()))
  const filtrate = attivita ? visibili.filter((l) => l.categoria === attivita) : visibili
  // Le attivita' a turni (Gym Floor, Nuoto Libero) vanno ognuna in una card
  // sola, a griglia (vedi TurniInGriglia), se quel giorno hanno piu' di un turno.
  const aTurni = A_TURNI.map((a) => ({ ...a, turni: filtrate.filter((l) => l.categoria === a.categoria) })).filter((a) => a.turni.length > 1)
  const altre = filtrate.filter((l) => !aTurni.some((a) => a.categoria === l.categoria))
  const perChi = giorno.persone.find((x) => x.member_id === giorno.member_id)
  const titolare = !!perChi?.titolare
  const schedaAperta = aperta?.scheda ? giorno.schede?.[aperta.scheda] ?? null : null
  return (
    <Schermata titolo={t('Prenotazioni', 'Bookings')} scorrimento={scorrimento}>
      <SceltaPrenotazioni attiva="lezioni" />

      {ritorno ? (
        ritorno.stato === 'avviato' ? (
          <Messaggio tono="attenzione" icona="clessidra" titolo={t('Aspettiamo la conferma', 'Waiting for confirmation')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
              <ActivityIndicator color={p.attenzione} />
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{t('Aspettiamo da PerfectGym la conferma del pagamento, poi prenotiamo. Non chiudere la pagina.', 'We are waiting for PerfectGym to confirm the payment, then we will book. Do not close the page.')}</Text>
            </View>
          </Messaggio>
        ) : ritorno.stato === 'prenotato' ? (
          <Messaggio tono="ok" titolo={t('Pagamento ricevuto', 'Payment received')}>
            {t('La lezione è prenotata. La trovi qui sotto e nell’app Athlon.', 'The class is booked. You can find it below and in the Athlon app.')}
          </Messaggio>
        ) : ritorno.stato === 'attesa' ? (
          <Messaggio tono="attenzione" titolo={t('Pagamento ricevuto: sei in lista d’attesa', 'Payment received: you are on the waiting list')}>
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {tv(
                  `I posti di ${'lezione' in ritorno && ritorno.lezione ? `«${ritorno.lezione}»` : 'questa lezione'}${
                    'inizio' in ritorno && ritorno.inizio ? ` del ${giornoEsteso(ritorno.giorno ?? ritorno.inizio.slice(0, 10))} alle ${ora(ritorno.inizio)}` : ''
                  } sono finiti mentre pagavi, quindi ti abbiamo messo in lista d’attesa. Se si libera un posto subentri tu, e ti avvisiamo via email. Se non subentrerai, l’ingresso che hai acquistato resta valido per un’altra prenotazione ${
                    'categoria' in ritorno && ritorno.categoria ? `di ${ritorno.categoria}` : 'della stessa categoria'
                  }.`,
                  `The spots for ${'lezione' in ritorno && ritorno.lezione ? `“${ritorno.lezione}”` : 'this class'}${
                    'inizio' in ritorno && ritorno.inizio ? ` on ${giornoEsteso(ritorno.giorno ?? ritorno.inizio.slice(0, 10))} at ${ora(ritorno.inizio)}` : ''
                  } ran out while you were paying, so we put you on the waiting list. If a spot opens up, it is yours and we will let you know by email. If you do not get a spot, the access you bought stays valid for another booking ${
                    'categoria' in ritorno && ritorno.categoria ? `in ${ritorno.categoria}` : 'in the same category'
                  }.`,
                )}
              </Text>
              {'categoria' in ritorno && ritorno.categoria ? (
                <Pulsante testo={`${t('Vedi le altre lezioni di', 'See other classes in')} ${ritorno.categoria}`} variante="contorno" piccolo onPress={() => setAttivita(ritorno.categoria ?? null)} />
              ) : null}
            </View>
          </Messaggio>
        ) : (
          <Messaggio>{('errore' in ritorno && ritorno.errore) || t('Non vediamo ancora il pagamento. Se l’hai completato, ricarica la pagina fra qualche minuto.', 'We do not see the payment yet. If you completed it, reload the page in a few minutes.')}</Messaggio>
        )
      ) : null}

      <View style={{ gap: spazio.tre }}>
        {giorno.persone.length > 1 ? (
          // Per chi si prenota: la persona scelta in arancio come il giorno, gli altri della famiglia in chiaro.
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
            {giorno.persone.map((x) => {
              const attivo = x.member_id === giorno.member_id
              return (
                <Tocco
                  key={x.member_id}
                  vibra="scelta"
                  stato={{ selected: attivo }}
                  onPress={() => leggi(giorno.data, x.member_id)}
                  etichetta={`${t('Prenota per', 'Book for')} ${nomeCompleto(x)}`}
                  style={[stili.persona, attivo ? { backgroundColor: p.accento, borderColor: p.accento, boxShadow: '0 8px 18px rgba(255,87,1,0.3)' } : { backgroundColor: p.carta, borderColor: p.linea }]}
                >
                  <Avatar nome={x.nome} cognome={x.cognome} size={30} anello={attivo ? 'rgba(255,255,255,0.9)' : undefined} />
                  <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{x.nome || nomeCompleto(x)}</Text>
                </Tocco>
              )
            })}
          </ScrollView>
        ) : null}
        {perChi ? (
          <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>
            {t('Stai prenotando per', 'You are booking for')} <Text style={{ fontFamily: F.bold, color: p.testo }}>{nomeCompleto(perChi)}</Text>
          </Text>
        ) : null}

        {!giorno.prenotazioni_lette ? <Messaggio tono="attenzione">{t('PerfectGym non risponde: le tue prenotazioni potrebbero non comparire.', 'PerfectGym is not responding: your bookings may not show up.')}</Messaggio> : null}
        {mie.length ? <LezioniPrenotate lezioni={mie} occupato={occupato} onAnnulla={disdiciPrenotata} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
          {giorno.giorni.map((d) => {
            const attivo = d === giorno.data
            const e = etichettaGiorno(d)
            const contenuto = (
              <>
                <Text style={[stili.settimana, { color: attivo ? 'rgba(255,255,255,0.85)' : p.testoSecondario }]}>{e.settimana}</Text>
                <Text style={[stili.numero, { color: attivo ? '#fff' : p.testo }]}>{e.numero}</Text>
              </>
            )
            return (
              <Tocco key={d} vibra="scelta" stato={{ selected: attivo }} onPress={() => leggi(d, giorno.member_id)} etichetta={giornoEsteso(d)}>
                {attivo ? (
                  <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.giorno, { boxShadow: '0 10px 20px rgba(255,87,1,0.3)' }]}>
                    {contenuto}
                  </LinearGradient>
                ) : (
                  <View style={[stili.giorno, { backgroundColor: p.carta, borderColor: p.linea, borderWidth: StyleSheet.hairlineWidth }]}>{contenuto}</View>
                )}
              </Tocco>
            )
          })}
        </ScrollView>
      </View>

      <View style={{ gap: spazio.tre }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2 }}>
          <Text style={[stili.giornoTitolo, { color: p.testo }]}>{maiuscola(giornoEsteso(giorno.data))}</Text>
          <Text style={{ color: p.testoTerzo, fontFamily: F.semi, fontSize: 13 }}>{`${visibili.length} ${visibili.length === 1 ? t('lezione', 'class') : t('lezioni', 'classes')}`}</Text>
        </View>
        {attivitaDelGiorno.length > 1 || attivita ? (
          // Tutte le attivita' del giorno in vista, a tessere (niente fila da scorrere). Una tessera sola attiva:
          // «Tutte» le toglie il filtro. Toccare quella attiva la toglie.
          <View style={{ gap: spazio.due }}>
            <Text style={[stili.filtriTitolo, { color: p.testoSecondario }]} accessibilityRole="header">{t('Cosa vuoi fare?', 'What would you like to do?')}</Text>
            <View style={stili.tessere}>
              {[null, ...attivitaDelGiorno].map((a) => {
                const attivo = a === attivita
                const n = a ? conteggi.get(a) ?? 0 : visibili.length
                const segno = segnoAttivita(a)
                return (
                  <Tocco
                    key={a ?? 'tutte'}
                    vibra="scelta"
                    stato={{ selected: attivo }}
                    onPress={() => setAttivita(attivo && a ? null : a)}
                    etichetta={`${a ?? t('Tutte le attività', 'All activities')}, ${n} ${n === 1 ? t('lezione', 'class') : t('lezioni', 'classes')}`}
                    style={[
                      stili.tessera,
                      { backgroundColor: attivo ? velo(p, 'accento', p.scuro ? 0.16 : 0.1) : p.carta, borderColor: attivo ? p.accento : p.linea, borderWidth: attivo ? 1.5 : StyleSheet.hairlineWidth },
                    ]}
                  >
                    <Bollino icona={segno.icona} tono={attivo ? 'accento' : segno.tono} size={34} pieno={attivo} />
                    <Text style={{ color: p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 13.5, lineHeight: 17 }} numberOfLines={2}>{a ?? t('Tutte', 'All')}</Text>
                    <Text style={{ color: attivo ? p.accento : p.testoTerzo, fontFamily: F.extra, fontSize: 11.5 }}>{`${n} ${n === 1 ? t('lezione', 'class') : t('lezioni', 'classes')}`}</Text>
                  </Tocco>
                )
              })}
            </View>
          </View>
        ) : null}
      </View>

      {carica ? (
        <SchedeInArrivo quante={2} />
      ) : visibili.length === 0 ? (
        <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
          <Icona nome="calendario" size={34} colore={p.testoTerzo} />
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>{t('Nessuna lezione ancora da cominciare in questo giorno.', 'No classes left to start on this day.')}</Text>
        </Carta>
      ) : filtrate.length === 0 ? (
        <Carta style={{ alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.cinque }}>
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>{tv(`Nessuna lezione di «${attivita}» ancora da cominciare in questo giorno.`, `No “${attivita}” classes left to start on this day.`)}</Text>
          <Pulsante testo={t('Mostra tutte le attività', 'Show all activities')} variante="contorno" piccolo pieno={false} onPress={() => setAttivita(null)} />
        </Carta>
      ) : (
        <View style={{ gap: spazio.tre }}>
          {nascoste && !attivita ? (
            <Text style={[stili.nota, { color: p.testoTerzo, paddingHorizontal: 2 }]}>{nascoste === 1 ? t('Una lezione è già cominciata.', 'One class has already started.') : `${nascoste} ${t('lezioni sono già cominciate.', 'classes have already started.')}`}</Text>
          ) : null}
          {aTurni.length ? (
            // Due sezioni coi titoli: prima l'allenamento libero (le griglie), poi i corsi.
            <>
              <Sezione titolo={t('Allenamento libero', 'Free training')}>
                <View style={stili.griglia}>
                {aTurni.map((a, n) => (
                  <Entra key={`${giorno.member_id}-${giorno.data}-${a.categoria}`} indice={n} style={stili.cella}>
                    <TurniInGriglia
                      // Cambiando giorno o persona si riparte dal turno giusto.
                      key={`${giorno.member_id}-${giorno.data}`}
                      nome={a.categoria}
                      conPosti={a.conPosti}
                      assistente={a.assistente}
                      turni={a.turni}
                      scheda={a.turni[0].scheda ? giorno.schede?.[a.turni[0].scheda] ?? null : null}
                      titolare={titolare}
                      onScheda={() => setAperta(a.turni[0])}
                      occupato={occupato}
                      onPrenota={prenota}
                      onAcquista={acquista}
                      onPagaCarta={pagaCarta}
                      onDisdici={disdici}
                      onMostra={mostra}
                    />
                  </Entra>
                ))}
                </View>
              </Sezione>
              {altre.length ? (
                <Sezione titolo={t('Corsi', 'Classes')} conteggio={altre.length} style={{ marginTop: spazio.due }}>
                  <View style={stili.griglia}>
                    {altre.map((l, i) => (
                      <Entra
                        // Con la persona cambia anche cosa le manca: la riga riparte da «Prenota».
                        key={`${giorno.member_id}-${l.class_id}`}
                        indice={i}
                        style={stili.cella}
                      >
                        <RigaLezione
                          l={l}
                          scheda={l.scheda ? giorno.schede?.[l.scheda] ?? null : null}
                          titolare={titolare}
                          onScheda={() => setAperta(l)}
                          occupato={occupato}
                          onPrenota={() => prenota(l)}
                          onAcquista={(url) => acquista(l, url)}
                          onPagaCarta={pagaCarta}
                          onDisdici={() => disdici(l)}
                        />
                      </Entra>
                    ))}
                  </View>
                </Sezione>
              ) : null}
            </>
          ) : (
            <View style={stili.griglia}>
                {altre.map((l, i) => (
                  <Entra
                    // Con la persona cambia anche cosa le manca: la riga riparte da «Prenota».
                    key={`${giorno.member_id}-${l.class_id}`}
                    indice={i}
                    style={stili.cella}
                  >
                    <RigaLezione
                      l={l}
                      scheda={l.scheda ? giorno.schede?.[l.scheda] ?? null : null}
                      titolare={titolare}
                      onScheda={() => setAperta(l)}
                      occupato={occupato}
                      onPrenota={() => prenota(l)}
                      onAcquista={(url) => acquista(l, url)}
                      onPagaCarta={pagaCarta}
                      onDisdici={() => disdici(l)}
                    />
                  </Entra>
                ))}
            </View>
          )}
        </View>
      )}
      <FoglioLezione
        scheda={schedaAperta}
        titolo={aperta?.nome ?? ''}
        categoria={aperta?.categoria}
        dettagli={
          aperta
            ? [
                { valore: ora(aperta.inizio), etichetta: t('Inizio', 'Start') },
                { valore: `${minuti(aperta.inizio, aperta.fine)} min`, etichetta: t('Durata', 'Duration') },
                // Nelle attivita' a turni l'istruttore cambia da un turno all'altro (e nella Gym Floor e' un nome finto): si contano i turni.
                A_TURNI.some((a) => a.categoria === aperta.categoria)
                  ? { valore: String(giorno.lezioni.filter((l) => l.categoria === aperta.categoria && !l.iniziata).length), etichetta: t('Turni', 'Sessions') }
                  : { valore: aperta.istruttore ? suDueRighe(aperta.istruttore) : '—', etichetta: t('Istruttore', 'Instructor') },
              ]
            : undefined
        }
        extra={aperta ? <CalorieLezione l={aperta} scheda={schedaAperta} titolare={titolare} variante="foglio" /> : undefined}
        onChiudi={() => setAperta(null)}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  fila: { gap: spazio.due, paddingHorizontal: spazio.tre + 2, paddingVertical: 4 },
  fuori: { marginHorizontal: -(spazio.tre + 2), flexGrow: 0 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 18, paddingVertical: 6, paddingLeft: 6, paddingRight: spazio.tre, borderWidth: StyleSheet.hairlineWidth },
  giorno: { width: 64, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 2 },
  settimana: { fontSize: 11, fontFamily: F.extra, textTransform: 'uppercase', letterSpacing: 1 },
  numero: { fontSize: 24, fontFamily: F.extra, letterSpacing: -0.6 },
  giornoTitolo: { fontSize: 22, fontFamily: F.extra, letterSpacing: -0.6 },
  filtriTitolo: { fontSize: 13, fontFamily: F.extra, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 2 },
  tessere: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  tessera: { flexGrow: 1, flexBasis: 104, maxWidth: 220, minWidth: 0, gap: 6, padding: spazio.tre - 2, borderRadius: 18 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.tre },
  cella: { flexGrow: 1, flexBasis: 340, minWidth: 0, maxWidth: 560 },
  lezione: { borderRadius: 30, overflow: 'hidden' },
  copertina: { height: 178, padding: spazio.tre, justifyContent: 'space-between', backgroundColor: '#111' },
  copertinaAlto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spazio.due },
  copertinaNome: { color: '#fff', fontFamily: F.extra, fontSize: 25, lineHeight: 29, letterSpacing: -0.8, maxWidth: '85%' },
  copertinaIstruttore: { color: 'rgba(255,255,255,0.78)', fontFamily: F.semi, fontSize: 13.5 },
  vetrino: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.45)' },
  vetrinoTesto: { color: '#fff', fontFamily: F.extra, fontSize: 12 },
  puntino: { width: 7, height: 7, borderRadius: 4 },
  info: { position: 'absolute', right: spazio.tre, bottom: spazio.tre, width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  corpo: { padding: spazio.tre + 2, gap: spazio.tre },
  cifre: { flexDirection: 'row' },
  cifra: { flex: 1, alignItems: 'center', gap: 1 },
  cifraValore: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  cifraEtichetta: { fontFamily: F.semi, fontSize: 11.5 },
  azioni: { flexDirection: 'row', gap: spazio.due },
  apertura: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spazio.due, minHeight: 52, borderRadius: 18 },
  nota: { fontSize: 13.5, lineHeight: 20, fontFamily: F.medio },
  orario: { width: 56, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  orarioTesto: { color: '#fff', fontFamily: F.extra, fontSize: 14, fontVariant: ['tabular-nums'] },
  fascia: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2 },
  orari: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  orarioCella: { width: '25%', padding: 4 },
  turno: { borderRadius: 14, paddingVertical: 8, alignItems: 'center', gap: 1, borderWidth: 2, borderColor: 'transparent' },
  turnoOra: { fontFamily: F.extra, fontSize: 15, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  turnoPosti: { fontFamily: F.bold, fontSize: 11 },
  bollinoAssistente: { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  assistente: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  scelto: { gap: spazio.tre, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre },
  sceltoOra: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  fumetto: { position: 'absolute', top: 26, left: -120, width: 250, borderRadius: 14, padding: spazio.tre - 4, zIndex: 10, elevation: 4 },
})
