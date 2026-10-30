import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { idNewsDaAvviso, type AvvisoClub, type EccezioneClub, type OrariClub } from '@/api/club'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Bollino, Carta, Entra, Sezione } from '../ui/kit'
import { F, usePalette, velo } from '../ui/tema'
import { useOrariClub } from './useOrariClub'

// Gli orari del club, sempre in evidenza (30/10/2026, richiesta di Maurizio): in Home una carta con l'orario di oggi, in Club Life il blocco intero
// con la settimana. **Se il club ha scritto un avviso che tocca gli orari** (una chiusura, un orario ridotto: una news della categoria Struttura o Orari)
// **compare per primo e in evidenza**, sopra l'orario ordinario: «oggi il club chiude alle 8:30, riapre alle 17:00» non si legge dopo «aperti dalle 6».
// Il giorno e gli orari li calcola la funzione (`api/club.ts`), l'app non ne ha una copia; l'avviso e' una news vera di Club Life e si apre da qui.

const apri = (a: AvvisoClub) => {
  const id = idNewsDaAvviso(a.id)
  if (id) router.push({ pathname: '/club-life/news/[id]', params: { id } })
}

/** «06:00» -> «6:00»: sul telefono l'ora senza lo zero davanti si legge meglio, e e' come scrive il club («dalle 8:30»). */
const ora = (s: string) => s.replace(/^0(\d:)/, '$1')

/** L'orario di oggi in una riga: «6:00 – 22:00», «Chiuso». */
export function testoOrarioOggi(o: OrariClub['oggi']): string {
  if (o.chiuso) return t('Chiuso', 'Closed')
  return `${ora(o.da!)} – ${ora(o.a!)}`
}

function Avvisi({ avvisi, compatto }: { avvisi: AvvisoClub[]; compatto?: boolean }) {
  const p = usePalette()
  if (!avvisi.length) return null
  const mostrati = compatto ? avvisi.slice(0, 1) : avvisi
  return (
    <View style={{ gap: spazio.due }}>
      {mostrati.map((a) => (
        <Carta
          key={a.id}
          piatta
          onPress={() => apri(a)}
          style={[stili.avviso, { borderColor: p.attenzione, backgroundColor: velo(p, 'attenzione', p.scuro ? 0.14 : 0.08) }]}
        >
          <View accessibilityRole="alert" style={stili.rigaAvviso}>
            <Icona nome="info" size={20} colore={p.attenzione} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[stili.occhiello, { color: p.attenzione }]}>{t('AVVISO DEL CLUB', 'CLUB NOTICE')}</Text>
              <Text style={[stili.titoloAvviso, { color: p.testo }]}>{a.titolo}</Text>
              <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t('Leggi l’avviso', 'Read the notice')}</Text>
            </View>
            <Icona nome="avanti" size={16} colore={p.testoTerzo} />
          </View>
        </Carta>
      ))}
      {compatto && avvisi.length > 1 ? (
        <Text style={[stili.sotto, { color: p.testoSecondario, paddingHorizontal: 2 }]}>{t(`E altri ${avvisi.length - 1} avvisi in Club Life.`, `And ${avvisi.length - 1} more in Club Life.`)}</Text>
      ) : null}
    </View>
  )
}

/** Una riga: «domenica 1 novembre · Chiuso · Tutti i Santi», o «giovedì 24 dicembre · Chiude alle 18:00 · Vigilia di Natale». */
function testoEccezione(e: EccezioneClub): string {
  const stato = e.tipo === 'chiuso' ? t('Chiuso', 'Closed') : t(`Chiude alle ${ora(e.a!)}`, `Closes at ${ora(e.a!)}`)
  return [e.giorno, stato, e.nome].filter(Boolean).join(' · ')
}

/**
 * Le chiusure per festivita' e gli orari ridotti dei prossimi 7 giorni, in evidenza (30/10/2026, richiesta di Maurizio): rosso per «Chiuso», ambra per
 * «orario ridotto». Li calcola la funzione dai giorni che il club ha scritto sul sito; qui si mostrano soltanto. In Home ne compaiono due, in Club Life tutti.
 */
function Eccezioni({ eccezioni, compatto }: { eccezioni: EccezioneClub[]; compatto?: boolean }) {
  const p = usePalette()
  if (!eccezioni.length) return null
  const mostrate = compatto ? eccezioni.slice(0, 2) : eccezioni
  return (
    <View style={[stili.eccezioni, { borderColor: eccezioni.some((e) => e.tipo === 'chiuso') ? p.errore : p.attenzione, backgroundColor: velo(p, eccezioni.some((e) => e.tipo === 'chiuso') ? 'errore' : 'attenzione', p.scuro ? 0.14 : 0.08) }]} accessibilityRole="alert">
      <Text style={[stili.occhiello, { color: eccezioni.some((e) => e.tipo === 'chiuso') ? p.errore : p.attenzione }]}>{t('NEI PROSSIMI 7 GIORNI', 'IN THE NEXT 7 DAYS')}</Text>
      {mostrate.map((e) => (
        <View key={e.data} style={stili.rigaEccezione}>
          <Icona nome={e.tipo === 'chiuso' ? 'attenzione' : 'orologio'} size={17} colore={e.tipo === 'chiuso' ? p.errore : p.attenzione} />
          <Text style={[stili.testoEccezione, { color: p.testo }]}>{testoEccezione(e)}</Text>
        </View>
      ))}
      {compatto && eccezioni.length > mostrate.length ? (
        <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t(`E altri ${eccezioni.length - mostrate.length} in Club Life.`, `And ${eccezioni.length - mostrate.length} more in Club Life.`)}</Text>
      ) : null}
    </View>
  )
}

/** L'orario di oggi, grande: e' la risposta a «a che ora apre?». */
function OggiGrande({ o, conAvviso }: { o: OrariClub['oggi']; conAvviso: boolean }) {
  const p = usePalette()
  const sotto = o.chiuso
    ? o.festivo
      ? t(`${o.giorno} · giorno festivo`, `${o.giorno} · public holiday`)
      : o.giorno
    : o.ridotto
      ? t(`${o.giorno} · orario ridotto`, `${o.giorno} · reduced hours`)
      : conAvviso
        ? t(`${o.giorno} · vedi l’avviso qui sopra`, `${o.giorno} · see the notice above`)
        : t(`${o.giorno} · orario di apertura`, `${o.giorno} · opening hours`)
  return (
    <View style={stili.oggi}>
      <Bollino icona="orologio" tono={o.chiuso ? 'errore' : 'accento'} size={44} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.occhiello, { color: p.testoTerzo }]}>{conAvviso && !o.chiuso ? t('OGGI · ORARIO ORDINARIO', 'TODAY · REGULAR HOURS') : t('OGGI', 'TODAY')}</Text>
        <Text style={[stili.grande, { color: o.chiuso ? p.errore : p.testo }]}>{testoOrarioOggi(o)}</Text>
        <Text style={[stili.sotto, { color: p.testoSecondario }]}>{sotto}</Text>
      </View>
    </View>
  )
}

/** In Home: una carta, con l'avviso in evidenza se c'e'. Si tocca per aprire Club Life. Non c'e' finche' gli orari non si leggono: niente riquadro vuoto. */
export function CartaOrariClub() {
  const dati = useOrariClub()
  if (!dati) return null
  return (
    <Entra indice={1}>
      <View style={{ gap: spazio.due }}>
        <Avvisi avvisi={dati.avvisi} compatto />
        <Eccezioni eccezioni={dati.prossimi} compatto />
        <Carta onPress={() => router.push('/club-life')} style={{ gap: spazio.tre }}>
          <View accessibilityRole="summary" accessibilityLabel={t(`Orario di oggi: ${testoOrarioOggi(dati.oggi)}`, `Today’s hours: ${testoOrarioOggi(dati.oggi)}`)}>
            <OggiGrande o={dati.oggi} conAvviso={dati.avvisi.length > 0} />
          </View>
        </Carta>
      </View>
    </Entra>
  )
}

/** In Club Life, in cima: gli avvisi, l'orario di oggi e la settimana. Il giorno di oggi e' evidenziato nella tabella. */
export function BloccoOrariClub() {
  const p = usePalette()
  const dati = useOrariClub()
  if (!dati) return null
  // Il giorno di oggi nella tabella: lunedi-venerdi, sabato o domenica, dal giorno della settimana della data (a Roma, gia' calcolata dalla funzione).
  const [y, m, d] = dati.oggi.data.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
  const riga = dow === 0 ? 2 : dow === 6 ? 1 : 0
  return (
    <Sezione titolo={t('Orari del club', 'Club hours')}>
      <Avvisi avvisi={dati.avvisi} />
      <Eccezioni eccezioni={dati.prossimi} />
      <Carta style={{ gap: spazio.tre }}>
        <OggiGrande o={dati.oggi} conAvviso={dati.avvisi.length > 0} />
        {dati.settimana.length ? (
          <View style={[stili.tabella, { borderTopColor: p.linea }]}>
            {dati.settimana.map((f, i) => (
              <View key={f.giorni} style={stili.rigaTabella}>
                <Text style={[stili.giorni, { color: i === riga ? p.testo : p.testoSecondario, fontFamily: i === riga ? F.semi : F.medio }]}>{f.giorni}</Text>
                <Text style={[stili.orario, { color: i === riga ? p.testo : p.testoSecondario, fontFamily: i === riga ? F.semi : F.medio }]}>
                  {ora(f.da)} – {ora(f.a)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={[stili.sotto, { color: p.testoTerzo }]}>
          {t(
            'Sono gli orari di apertura della sala pesi. Gli orari delle lezioni e dei turni li trovi nel Calendario, e il club è chiuso nei giorni festivi.',
            'These are the weight room’s opening hours. Class and session times are in the Calendar, and the club is closed on public holidays.',
          )}
        </Text>
      </Carta>
    </Sezione>
  )
}

const stili = StyleSheet.create({
  avviso: { borderWidth: 1.5, padding: spazio.tre },
  eccezioni: { borderWidth: 1.5, borderRadius: 18, padding: spazio.tre, gap: 6 },
  rigaEccezione: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  testoEccezione: { flex: 1, fontFamily: F.semi, fontSize: 14.5, lineHeight: 20 },
  rigaAvviso: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  occhiello: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.1 },
  titoloAvviso: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 20, letterSpacing: -0.2 },
  sotto: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  oggi: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  grande: { fontFamily: F.extra, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  tabella: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.due, gap: 6 },
  rigaTabella: { flexDirection: 'row', justifyContent: 'space-between', gap: spazio.tre },
  giorni: { fontSize: 14.5, lineHeight: 20 },
  orario: { fontSize: 14.5, lineHeight: 20, fontVariant: ['tabular-nums'] },
})
