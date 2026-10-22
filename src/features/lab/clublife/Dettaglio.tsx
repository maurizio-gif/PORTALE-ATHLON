import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { ClubLife, Comando } from '@/api/clubLife'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante, SchedeInArrivo, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, raggio, usePalette } from '../ui/tema'
import { Contenuto } from './Blocchi'
import { dataNews, giornoEvento } from './comune'
import { condividiEvento } from './condividi'
import { useClubLife } from './dati'
import { apriLink, destinazione } from './link'

// Le tre schermate di dettaglio di Club Life: una news, un evento, una scheda
// dell'Help Desk. Leggono la stessa copia dell'elenco (dati.ts), quindi si
// aprono subito; arrivandoci da un link diretto, aspettano che arrivi.

/** Mentre i dati arrivano, o se quella voce non c'e' (piu'): una news scaduta, un evento passato. */
function Stato({ dati, errore, riprova, cosa }: { dati: ClubLife | null; errore: string | null; riprova: () => void; cosa: string }) {
  if (!dati && !errore) return <SchedeInArrivo quante={1} />
  return (
    <View style={{ gap: spazio.tre }}>
      <Messaggio tono={dati ? 'attenzione' : 'errore'}>{dati ? t(`Questa ${cosa} non è più in Club Life.`, `This ${cosa} is no longer in Club Life.`) : errore}</Messaggio>
      {dati ? null : <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={riprova} />}
      <Pulsante testo={t('Torna a Club Life', 'Back to Club Life')} variante="contorno" onPress={() => router.replace('/club-life')} />
    </View>
  )
}

function Foto({ src, alt }: { src: string | null; alt: string }) {
  const p = usePalette()
  if (!src) return null
  return <Image source={{ uri: src }} accessibilityLabel={alt} style={[stili.foto, { backgroundColor: p.incavo }]} contentFit="cover" transition={200} />
}

function Info({ icona, children }: { icona: NomeIcona; children: ReactNode }) {
  const p = usePalette()
  return (
    <View style={stili.info}>
      <Icona nome={icona} size={18} colore={p.accento} />
      <Text style={[stili.infoTesto, { color: p.testo }]}>{children}</Text>
    </View>
  )
}

/**
 * Il comando di una news o di un evento. Se nell'app non ha dove portare
 * («scarica l'app») non si disegna; se porta al calendario e dice «registrati» o
 * «dal portale», dice quello che fa: chi e' nell'app e' gia' registrato, e
 * partecipare e' prenotare.
 */
function Cta({ cta, dati }: { cta: Comando; dati: ClubLife | null }) {
  const d = destinazione(cta.url, dati, cta.etichetta)
  if (d.tipo === 'nascondi') return null
  const alCalendario = d.tipo === 'app' && d.href === '/calendario' && /registr|portale/i.test(cta.etichetta)
  return <Pulsante testo={alCalendario ? t('Prenota dal calendario', 'Book from the calendar') : cta.etichetta} icona={d.tipo === 'fuori' ? 'apriFuori' : 'avanti'} onPress={() => apriLink(cta.url, dati, cta.etichetta)} />
}

/** Oggi a Roma, «2026-10-21». */
const GIORNO_ROMA = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Il calendario delle Prenotazioni mostra oggi e i 14 giorni dopo, ed e' anche quando le prenotazioni di un evento si aprono. */
const GIORNI_CALENDARIO = 14

const MS_GIORNO = 86_400_000

/**
 * Gli eventi che si prenotano dal sito (20/10/2026) si prenotano dalle Prenotazioni dell'app: il pulsante porta li',
 * gia' sul giorno dell'evento e sulla sua categoria (21/10/2026, al posto del link per email). Se l'evento e' piu'
 * lontano di quello che il calendario mostra, lo dice invece di portare su un altro giorno.
 */
function PrenotaDalCalendario({ data, categoria }: { data: string; categoria: string | null }) {
  const giorno = data.slice(0, 10)
  const fra = Math.round((Date.parse(giorno) - Date.parse(GIORNO_ROMA.format(new Date()))) / MS_GIORNO)
  if (fra < 0) return null
  if (fra > GIORNI_CALENDARIO) {
    const apre = new Date(Date.parse(giorno) - GIORNI_CALENDARIO * MS_GIORNO).toISOString()
    return <Messaggio tono="attenzione" icona="calendario" titolo={t('Le prenotazioni non sono ancora aperte', 'Bookings are not open yet')}>{t(`Si prenota dalle Prenotazioni dell'app, a partire da ${giornoEvento(apre).toLowerCase()}.`, `You can book it from Bookings in the app, starting ${giornoEvento(apre)}.`)}</Messaggio>
  }
  return (
    <Pulsante
      testo={t('Prenota nel calendario', 'Book in the calendar')}
      icona="calendario"
      onPress={() => router.push({ pathname: '/calendario', params: categoria ? { giorno, attivita: categoria } : { giorno } })}
    />
  )
}

/** «Condividi con un amico»: il foglio di condivisione del telefono col link alla pagina dell'evento; dove non c'e', il link si copia. */
function CondividiEvento({ e }: { e: { titolo: string; data: string; ora: string | null; url: string } }) {
  const [esito, setEsito] = useState<'copiato' | 'errore' | null>(null)
  async function condividi() {
    setEsito(null)
    const r = await condividiEvento(e)
    if (r === 'copiato' || r === 'errore') setEsito(r)
  }
  return (
    <View style={{ gap: spazio.due }}>
      <Pulsante testo={t('Condividi con un amico', 'Share with a friend')} icona="condividi" variante="contorno" onPress={condividi} />
      {esito === 'copiato' ? <Messaggio tono="ok">{t('Link copiato: incollalo in un messaggio per il tuo amico.', 'Link copied: paste it into a message to your friend.')}</Messaggio> : null}
      {esito === 'errore' ? <Messaggio>{t('Da questo dispositivo non si può condividere direttamente. Apri la pagina dell’evento sul sito e copia il link.', 'You can’t share directly from this device. Open the event page on the website and copy the link.')}</Messaggio> : null}
    </View>
  )
}

export function NewsDettaglio() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { dati, errore, riprova } = useClubLife()
  const n = dati?.news.find((x) => x.id === id)
  return (
    <Schermata indietro="/club-life" barra={false} sopratitolo={n?.categoria ?? 'News'} titolo={n?.titolo ?? 'News'} sottotitolo={n ? dataNews(n.data) : undefined}>
      {!n ? (
        <Stato dati={dati} errore={errore} riprova={riprova} cosa={t('news', 'news item')} />
      ) : (
        <>
          <Foto src={n.immagine} alt={n.alt} />
          <Contenuto blocchi={n.blocchi} dati={dati} />
          {n.cta ? <Cta cta={n.cta} dati={dati} /> : null}
        </>
      )}
    </Schermata>
  )
}

export function EventoDettaglio() {
  const p = usePalette()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { dati, errore, riprova } = useClubLife()
  const e = dati?.eventi.find((x) => x.id === id)
  return (
    <Schermata indietro="/club-life" barra={false} sopratitolo={e?.etichetta ?? t('Evento', 'Event')} titolo={e?.titolo ?? t('Evento', 'Event')} sottotitolo={e?.sommario}>
      {!e ? (
        <Stato dati={dati} errore={errore} riprova={riprova} cosa={t('pagina', 'page')} />
      ) : (
        <>
          <Foto src={e.immagine} alt={e.alt} />
          <Carta style={{ gap: spazio.tre }}>
            <Info icona="calendario">{giornoEvento(e.data)}</Info>
            {e.ora ? <Info icona="orologio">{e.ora}</Info> : null}
            {e.gratuito ? <Info icona="regalo">{t('Gratuito', 'Free')}</Info> : e.prezzo ? <Info icona="carta">{e.prezzo}</Info> : null}
            {e.note.map((x, i) => (
              <Info key={i} icona="info">
                {x}
              </Info>
            ))}
          </Carta>
          {e.prenotaSulSito ? <PrenotaDalCalendario data={e.data} categoria={e.categoria ?? null} /> : e.cta ? <Cta cta={e.cta} dati={dati} /> : null}
          <CondividiEvento e={e} />
          <Contenuto blocchi={e.blocchi} dati={dati} />
          {e.programma.map((sala) => (
            <View key={sala.sala} style={{ gap: spazio.due }}>
              <Text style={[stili.sala, { color: p.testo }]}>{sala.sala}</Text>
              <Carta style={{ paddingVertical: 4 }}>
                {sala.voci.map((v, i) => (
                  <View key={i} style={[stili.voceProgramma, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
                    <Text style={[stili.ora, { color: p.accento }]}>{v.ora}</Text>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[stili.lezione, { color: p.testo }]}>{v.lezione}</Text>
                      {v.trainer ? <Text style={[stili.trainer, { color: p.testoSecondario }]}>{v.trainer}</Text> : null}
                    </View>
                  </View>
                ))}
              </Carta>
            </View>
          ))}
        </>
      )}
    </Schermata>
  )
}

export function SchedaDettaglio() {
  const p = usePalette()
  const { scheda } = useLocalSearchParams<{ scheda: string | string[] }>()
  const id = Array.isArray(scheda) ? scheda.join('/') : String(scheda ?? '')
  const { dati, errore, riprova } = useClubLife()
  const s = dati?.schede.find((x) => x.id === id)
  const area = dati?.aree.find((a) => a.id === s?.area)
  return (
    <Schermata indietro="/club-life" barra={false} sopratitolo={area ? `Help Desk · ${area.etichetta}` : 'Help Desk'} titolo={s?.titolo ?? 'Help Desk'} sottotitolo={s?.descrizione}>
      {!s ? (
        <Stato dati={dati} errore={errore} riprova={riprova} cosa={t('scheda', 'article')} />
      ) : (
        <>
          <View style={stili.tag}>
            {s.attivita.length ? s.attivita.map((a) => <Tag key={a} testo={a.toUpperCase()} colore={p.testoSecondario} />) : <Tag testo={t('TUTTE LE ATTIVITÀ', 'ALL ACTIVITIES')} colore={p.testoSecondario} />}
          </View>
          <Contenuto blocchi={s.blocchi} dati={dati} />
        </>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  foto: { width: '100%', aspectRatio: 16 / 9, borderRadius: raggio.grande },
  info: { flexDirection: 'row', gap: spazio.tre - 4, alignItems: 'flex-start' },
  infoTesto: { flex: 1, fontFamily: F.semi, fontSize: 15, lineHeight: 21 },
  sala: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3, paddingHorizontal: 2 },
  voceProgramma: { flexDirection: 'row', gap: spazio.tre, paddingVertical: spazio.tre - 4, alignItems: 'flex-start' },
  ora: { fontFamily: F.extra, fontSize: 14, lineHeight: 20, minWidth: 92 },
  lezione: { fontFamily: F.bold, fontSize: 15, lineHeight: 20 },
  trainer: { fontFamily: F.medio, fontSize: 13.5 },
  tag: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
})
