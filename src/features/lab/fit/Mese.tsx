import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, Scheletro } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, NOTTE, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { SIGLE_GIORNI } from './analisiTraining'
import { condividiMese, type EsitoCondivisione } from './condividiMese'
import { immagineDisponibile } from './immagineMese'
import { mesePartenza, mesePrima, meseDi, oreBrevi, riepilogoMese, type RiepilogoMese } from './riepilogoMese'
import { useFit } from './useFit'

// «Il tuo mese in Athlon» (30/10/2026, richiesta di Maurizio: «strumenti wow»): una scheda del mese di Train (giorni attivi, sessioni, ore, giorni di fila,
// la lezione piu' fatta e il calendario con le palline accese) da guardare e da mandare, come immagine sul web e come testo sull'app nativa. Il calcolo
// sta in riepilogoMese.ts (puro), l'immagine in immagineMese.ts, la condivisione in condividiMese.ts. **Solo Train**: niente calorie, peso, diario o sonno,
// che hanno un consenso a parte. Descrive e basta: niente classifiche, il mese scorso e' un numero e non un giudizio. In vista cliente non c'e'.

const maiuscola = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

function Statistica({ valore, etichetta }: { valore: string; etichetta: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={stili.statValore} numberOfLines={1} adjustsFontSizeToFit>
        {valore}
      </Text>
      <Text style={stili.statEtichetta}>{etichetta}</Text>
    </View>
  )
}

/** La scheda: la stessa cosa che esce nell'immagine, in vista. */
export function SchedaMese({ r }: { r: RiepilogoMese }) {
  const righe = Math.ceil((r.inizio + r.giorniNelMese) / 7)
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cornice}>
      {/* L'alone arancio in alto a destra, sfumato come nell'immagine (un cerchio pieno avrebbe il bordo netto). */}
      <Svg style={stili.alone} width={420} height={420} viewBox="0 0 420 420" pointerEvents="none">
        <Defs>
          <RadialGradient id="aloneMese" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={FUOCO[1]} stopOpacity={0.34} />
            <Stop offset="1" stopColor={FUOCO[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={420} height={420} fill="url(#aloneMese)" />
      </Svg>
      <View style={{ gap: 2 }}>
        <Text style={stili.mese}>{`${maiuscola(r.nome)} ${r.anno}`}</Text>
        <Text style={stili.sottoMese}>{t('Il mio mese in Athlon', 'My month at Athlon')}</Text>
      </View>
      <View style={stili.numeroRiga}>
        <Text style={stili.numero}>{r.giorniAttivi}</Text>
        <View style={{ flex: 1, paddingBottom: 12 }}>
          <Text style={stili.numeroEtichetta}>{r.giorniAttivi === 1 ? t('giorno attivo', 'active day') : t('giorni attivi', 'active days')}</Text>
          {r.incorso ? <Text style={stili.numeroSotto}>{t(`su ${r.giorniNelMese}, il mese è in corso`, `of ${r.giorniNelMese}, the month is ongoing`)}</Text> : null}
        </View>
      </View>
      <View
        style={{ gap: 6 }}
        accessible
        accessibilityLabel={t(`Calendario di ${r.nome}: ${r.giorniAttivi} giorni attivi su ${r.giorniNelMese}`, `${r.nome} calendar: ${r.giorniAttivi} active days out of ${r.giorniNelMese}`)}
      >
        <View style={stili.settimana}>
          {SIGLE_GIORNI.map((s, i) => (
            <Text key={i} style={stili.sigla}>
              {s}
            </Text>
          ))}
        </View>
        {Array.from({ length: righe }, (_, riga) => (
          <View key={riga} style={stili.settimana}>
            {Array.from({ length: 7 }, (_, col) => {
              const cella = r.celle[riga * 7 + col - r.inizio]
              if (!cella) return <View key={col} style={stili.cella} />
              return (
                <View key={col} style={stili.cella}>
                  <View style={[stili.pallina, cella.attivo ? { backgroundColor: FUOCO[1] } : { backgroundColor: cella.futuro ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)' }]}>
                    <Text style={[stili.giorno, { color: cella.attivo ? '#fff' : cella.futuro ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)' }]}>{cella.giorno}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        ))}
      </View>
      <View style={stili.statistiche}>
        <Statistica valore={String(r.sessioni)} etichetta={r.sessioni === 1 ? t('allenamento', 'workout') : t('allenamenti', 'workouts')} />
        <Statistica valore={oreBrevi(r.minuti)} etichetta={t('di allenamento', 'of training')} />
        <Statistica valore={String(r.serieMax)} etichetta={r.serieMax === 1 ? t('giorno di fila', 'day in a row') : t('giorni di fila', 'days in a row')} />
      </View>
      {r.preferita ? (
        <Text style={stili.preferita}>{t(`La lezione che ho fatto di più: ${r.preferita.nome} (${r.preferita.volte} volte)`, `The class I did most: ${r.preferita.nome} (${r.preferita.volte} times)`)}</Text>
      ) : null}
    </LinearGradient>
  )
}

export function SchermataMese() {
  const p = usePalette()
  const vista = !!vistaCorrente()
  const fit = useFit()
  const oggi = oggiRoma()
  const [scelto, setScelto] = useState<string | null>(null)
  const [esito, setEsito] = useState<EsitoCondivisione | null>(null)
  const [invio, setInvio] = useState(false)

  const mese = scelto ?? (fit.sessioni ? mesePartenza(fit.sessioni, oggi) : meseDi(oggi))
  const r = useMemo(() => (fit.sessioni ? riepilogoMese(fit.sessioni, mese, oggi) : null), [fit.sessioni, mese, oggi])
  const mesi = [meseDi(oggi), mesePrima(meseDi(oggi))]

  async function manda(soloScarica = false) {
    if (!r) return
    setInvio(true)
    setEsito(null)
    const e = await condividiMese(r, soloScarica)
    setInvio(false)
    setEsito(e)
  }

  return (
    <Schermata sopratitolo="Athlon Health System" titolo={t('Il tuo mese', 'Your month')} sottotitolo={t('Gli allenamenti del mese, da condividere.', 'Your month of training, ready to share.')} indietro="/allenamento" barra={false}>
      {vista ? (
        <Messaggio tono="attenzione">{t('Il riepilogo del mese lo vede e lo condivide il socio.', 'The monthly summary is for the member to see and share.')}</Messaggio>
      ) : !r ? (
        <Scheletro altezza={460} tondo={28} />
      ) : (
        <>
          <View style={stili.scelta}>
            {mesi.map((m, i) => {
              const attivo = m === mese
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setScelto(m)
                    setEsito(null)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: attivo }}
                  style={[stili.pillola, { borderColor: attivo ? p.accento : p.linea, backgroundColor: attivo ? p.incavo : 'transparent' }]}
                >
                  <Text style={[stili.pillolaTesto, { color: attivo ? p.accento : p.testoSecondario }]}>{i === 0 ? t('Questo mese', 'This month') : t('Mese scorso', 'Last month')}</Text>
                </Pressable>
              )
            })}
          </View>

          {!r.haDati ? (
            <Messaggio tono="attenzione" titolo={t('Ancora niente in questo mese', 'Nothing yet this month')}>
              {t('Il mese si riempie con i piani di allenamento chiusi nell’app, le lezioni con la presenza segnata dalla reception e gli allenamenti dei dispositivi.', 'The month fills up with workout plans finished in the app, classes where reception marked your attendance, and workouts from your devices.')}
            </Messaggio>
          ) : (
            <>
              <Entra indice={0}>
                <SchedaMese r={r} />
              </Entra>
              {r.precedente ? (
                <Entra indice={1}>
                  <Carta piatta>
                    <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>
                      {t(
                        `Il mese prima: ${r.precedente.giorniAttivi} ${r.precedente.giorniAttivi === 1 ? 'giorno attivo' : 'giorni attivi'}, ${r.precedente.sessioni} ${r.precedente.sessioni === 1 ? 'allenamento' : 'allenamenti'}, ${oreBrevi(r.precedente.minuti)}.`,
                        `The month before: ${r.precedente.giorniAttivi} active ${r.precedente.giorniAttivi === 1 ? 'day' : 'days'}, ${r.precedente.sessioni} ${r.precedente.sessioni === 1 ? 'workout' : 'workouts'}, ${oreBrevi(r.precedente.minuti)}.`,
                      )}
                    </Text>
                  </Carta>
                </Entra>
              ) : null}
              <View style={{ gap: spazio.due }}>
                <Pulsante testo={immagineDisponibile() ? t('Condividi l’immagine', 'Share the image') : t('Condividi', 'Share')} icona="condividi" onPress={() => manda()} inCorso={invio} />
                {immagineDisponibile() ? <Pulsante testo={t('Scarica l’immagine', 'Download the image')} variante="secondario" piccolo onPress={() => manda(true)} disabilitato={invio} /> : null}
                {esito === 'scaricato' ? <Messaggio tono="ok">{t('Immagine scaricata: la trovi fra i tuoi file.', 'Image downloaded: you’ll find it in your files.')}</Messaggio> : null}
                {esito === 'errore' ? <Messaggio>{t('Non siamo riusciti a preparare l’immagine. Riprova.', 'We couldn’t prepare the image. Try again.')}</Messaggio> : null}
              </View>
              <Text style={[stili.nota, { color: p.testoTerzo }]}>
                {t(
                  'Nell’immagine ci sono solo le cifre di questa pagina e il nome del club: niente nome tuo, peso o calorie. Si crea sul tuo dispositivo.',
                  'The image only shows the figures on this page and the club’s name: no name, weight or calories. It is created on your device.',
                )}
              </Text>
            </>
          )}
        </>
      )}
    </Schermata>
  )
}

/** La carta in Train che porta al riepilogo: compare solo quando c'e' qualcosa da mostrare. */
export function CartaMese() {
  const p = usePalette()
  const fit = useFit()
  const oggi = oggiRoma()
  const r = useMemo(() => {
    if (fit.vista || !fit.sessioni) return null
    const x = riepilogoMese(fit.sessioni, mesePartenza(fit.sessioni, oggi), oggi)
    return x.haDati ? x : null
  }, [fit.vista, fit.sessioni, oggi])
  if (!r) return null
  return (
    <Carta onPress={() => router.push('/allenamento/mese')}>
      <View style={stili.cartaRiga}>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cartaIcona}>
          <Icona nome="condividi" size={20} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.cartaTitolo, { color: p.testo }]}>{t(`Il tuo ${r.nome} in Athlon`, `Your ${r.nome} at Athlon`)}</Text>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
            {t(`${r.giorniAttivi} ${r.giorniAttivi === 1 ? 'giorno attivo' : 'giorni attivi'} · ${r.sessioni} ${r.sessioni === 1 ? 'allenamento' : 'allenamenti'}. Guardalo e condividilo.`, `${r.giorniAttivi} active ${r.giorniAttivi === 1 ? 'day' : 'days'} · ${r.sessioni} ${r.sessioni === 1 ? 'workout' : 'workouts'}. See it and share it.`)}
          </Text>
        </View>
        <Icona nome="avanti" size={16} colore={p.testoTerzo} />
      </View>
    </Carta>
  )
}

const stili = StyleSheet.create({
  cornice: { borderRadius: 28, padding: spazio.quattro, gap: spazio.quattro - 4, overflow: 'hidden' },
  alone: { position: 'absolute', top: -170, right: -170, width: 420, height: 420 },
  mese: { color: '#fff', fontFamily: F.extra, fontSize: 30, letterSpacing: -0.8 },
  sottoMese: { color: 'rgba(255,255,255,0.62)', fontFamily: F.semi, fontSize: 14 },
  numeroRiga: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  numero: { color: FUOCO[0], fontFamily: F.extra, fontSize: 84, lineHeight: 90, letterSpacing: -3 },
  numeroEtichetta: { color: '#fff', fontFamily: F.bold, fontSize: 17 },
  numeroSotto: { color: 'rgba(255,255,255,0.5)', fontFamily: F.medio, fontSize: 12.5 },
  settimana: { flexDirection: 'row' },
  sigla: { flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: F.bold, fontSize: 11 },
  cella: { flex: 1, alignItems: 'center' },
  pallina: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  giorno: { fontFamily: F.bold, fontSize: 11.5 },
  statistiche: { flexDirection: 'row', gap: spazio.tre },
  statValore: { color: '#fff', fontFamily: F.extra, fontSize: 24, letterSpacing: -0.6 },
  statEtichetta: { color: 'rgba(255,255,255,0.55)', fontFamily: F.medio, fontSize: 12 },
  preferita: { color: 'rgba(255,255,255,0.7)', fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  scelta: { flexDirection: 'row', gap: spazio.due },
  pillola: { height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  pillolaTesto: { fontFamily: F.semi, fontSize: 13.5 },
  nota: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  cartaRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  cartaIcona: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cartaTitolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
})
