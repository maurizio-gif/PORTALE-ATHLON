import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { ClubLife } from '@/api/clubLife'
import { spazio } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante, SchedeInArrivo, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, raggio, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { Contenuto } from './Blocchi'
import { dataNews, giornoEvento } from './comune'
import { useClubLife } from './dati'
import { conChiE, useChiE } from './indirizzo'
import { apriFuori, apriLink } from './link'

// Le tre schermate di dettaglio di Club Life: una news, un evento, una scheda
// dell'Help Desk. Leggono la stessa copia dell'elenco (dati.ts), quindi si
// aprono subito; arrivandoci da un link diretto, aspettano che arrivi.

/** Mentre i dati arrivano, o se quella voce non c'e' (piu'): una news scaduta, un evento passato. */
function Stato({ dati, errore, riprova, cosa }: { dati: ClubLife | null; errore: string | null; riprova: () => void; cosa: string }) {
  if (!dati && !errore) return <SchedeInArrivo quante={1} />
  return (
    <View style={{ gap: spazio.tre }}>
      <Messaggio tono={dati ? 'attenzione' : 'errore'}>{dati ? `Questa ${cosa} non è più in Club Life.` : errore}</Messaggio>
      {dati ? null : <Pulsante testo="Riprova" icona="aggiorna" onPress={riprova} />}
      <Pulsante testo="Torna a Club Life" variante="contorno" onPress={() => router.replace('/club-life')} />
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

function SulSito({ url }: { url: string }) {
  const p = usePalette()
  return (
    <Tocco onPress={() => apriFuori(url)} ruolo="link" etichetta="Apri sul sito" style={{ alignSelf: 'center' }}>
      <Text style={[stili.sito, { color: p.testoTerzo }]}>Apri sul sito</Text>
    </Tocco>
  )
}

export function NewsDettaglio({ emailAccesso }: { emailAccesso?: string | null }) {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { dati, errore, riprova } = useClubLife()
  const chi = useChiE(emailAccesso)
  const n = dati?.news.find((x) => x.id === id)
  return (
    <Schermata indietro="/club-life" barra={false} sopratitolo={n?.categoria ?? 'News'} titolo={n?.titolo ?? 'News'} sottotitolo={n ? dataNews(n.data) : undefined}>
      {!n ? (
        <Stato dati={dati} errore={errore} riprova={riprova} cosa="news" />
      ) : (
        <>
          <Foto src={n.immagine} alt={n.alt} />
          <Contenuto blocchi={n.blocchi} dati={dati} chi={chi} />
          {n.cta ? <Pulsante testo={n.cta.etichetta} onPress={() => apriLink(n.cta!.url, dati)} /> : null}
          <SulSito url={n.url} />
        </>
      )}
    </Schermata>
  )
}

export function EventoDettaglio({ emailAccesso }: { emailAccesso?: string | null }) {
  const p = usePalette()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { dati, errore, riprova } = useClubLife()
  const chi = useChiE(emailAccesso)
  const e = dati?.eventi.find((x) => x.id === id)
  return (
    <Schermata indietro="/club-life" barra={false} sopratitolo={e?.etichetta ?? 'Evento'} titolo={e?.titolo ?? 'Evento'} sottotitolo={e?.sommario}>
      {!e ? (
        <Stato dati={dati} errore={errore} riprova={riprova} cosa="pagina" />
      ) : (
        <>
          <Foto src={e.immagine} alt={e.alt} />
          <Carta style={{ gap: spazio.tre }}>
            <Info icona="calendario">{giornoEvento(e.data)}</Info>
            {e.ora ? <Info icona="orologio">{e.ora}</Info> : null}
            {e.gratuito ? <Info icona="regalo">Gratuito</Info> : e.prezzo ? <Info icona="carta">{e.prezzo}</Info> : null}
            {e.note.map((x, i) => (
              <Info key={i} icona="info">
                {x}
              </Info>
            ))}
          </Carta>
          {e.prenotaSulSito ? (
            <Pulsante testo="Prenota il posto" icona="apriFuori" onPress={() => apriFuori(conChiE(`${e.url}#prenota`, chi ?? {}))} />
          ) : e.cta ? (
            <Pulsante testo={e.cta.etichetta} icona="apriFuori" onPress={() => apriLink(e.cta!.url, dati)} />
          ) : null}
          <Contenuto blocchi={e.blocchi} dati={dati} chi={chi} />
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
          <SulSito url={e.url} />
        </>
      )}
    </Schermata>
  )
}

export function SchedaDettaglio({ emailAccesso }: { emailAccesso?: string | null }) {
  const p = usePalette()
  const { scheda } = useLocalSearchParams<{ scheda: string | string[] }>()
  const id = Array.isArray(scheda) ? scheda.join('/') : String(scheda ?? '')
  const { dati, errore, riprova } = useClubLife()
  const chi = useChiE(emailAccesso)
  const s = dati?.schede.find((x) => x.id === id)
  const area = dati?.aree.find((a) => a.id === s?.area)
  return (
    <Schermata indietro="/club-life" barra={false} sopratitolo={area ? `Help Desk · ${area.etichetta}` : 'Help Desk'} titolo={s?.titolo ?? 'Help Desk'} sottotitolo={s?.descrizione}>
      {!s ? (
        <Stato dati={dati} errore={errore} riprova={riprova} cosa="scheda" />
      ) : (
        <>
          <View style={stili.tag}>
            {s.attivita.length ? s.attivita.map((a) => <Tag key={a} testo={a.toUpperCase()} colore={p.testoSecondario} />) : <Tag testo="TUTTE LE ATTIVITÀ" colore={p.testoSecondario} />}
          </View>
          <Contenuto blocchi={s.blocchi} dati={dati} chi={chi} />
          <SulSito url={s.url} />
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
  sito: { fontFamily: F.semi, fontSize: 13, textDecorationLine: 'underline', paddingVertical: spazio.due },
})
