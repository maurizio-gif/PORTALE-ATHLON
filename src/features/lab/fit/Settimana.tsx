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
import { type EsitoCondivisione } from './condividiMese'
import { condividiSettimana } from './condividiSettimana'
import { immagineSettimanaDisponibile, type FormatoImmagine } from './immagineSettimana'
import { oreBrevi } from './riepilogoMese'
import { fraseSettimana, riepilogoSettimana, settimanaDi, settimanaPartenza, settimanaPrima, type RiepilogoSettimana } from './riepilogoSettimana'
import { useFit } from './useFit'

// «La tua settimana in Athlon» (31/10/2026, richiesta di Maurizio): il riepilogo della settimana di Train (giorni attivi, allenamenti, ore, giorni di fila,
// le lezioni fatte e sette palline lunedi'-domenica) con la sua frase scritta dal codice, da guardare e da mandare: un'immagine per un post o per una storia
// sul web, il testo sull'app nativa. Il calcolo sta in riepilogoSettimana.ts (puro), l'immagine in immagineSettimana.ts, la condivisione in condividiSettimana.ts.
// **Solo Train**, come «Il tuo mese»: niente calorie, peso, diario o sonno, che hanno un consenso a parte. Descrive e basta: niente classifiche, la settimana
// prima e' un numero e non un giudizio. In vista cliente non c'e'.

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
export function SchedaSettimana({ r }: { r: RiepilogoSettimana }) {
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cornice}>
      {/* L'alone arancio in alto a destra, sfumato come nell'immagine (un cerchio pieno avrebbe il bordo netto). */}
      <Svg style={stili.alone} width={420} height={420} viewBox="0 0 420 420" pointerEvents="none">
        <Defs>
          <RadialGradient id="aloneSettimana" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={FUOCO[1]} stopOpacity={0.34} />
            <Stop offset="1" stopColor={FUOCO[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={420} height={420} fill="url(#aloneSettimana)" />
      </Svg>
      <View style={{ gap: 2 }}>
        <Text style={stili.titolo}>{r.titolo}</Text>
        <Text style={stili.sottoTitolo}>{t('La mia settimana in Athlon', 'My week at Athlon')}</Text>
      </View>
      <View style={stili.numeroRiga}>
        <Text style={stili.numero}>{r.giorniAttivi}</Text>
        <View style={{ flex: 1, paddingBottom: 12 }}>
          <Text style={stili.numeroEtichetta}>{r.giorniAttivi === 1 ? t('giorno attivo', 'active day') : t('giorni attivi', 'active days')}</Text>
          <Text style={stili.numeroSotto}>{r.incorso ? t('su 7, la settimana è in corso', 'of 7, the week is ongoing') : t('su 7', 'of 7')}</Text>
        </View>
      </View>
      <View
        style={{ gap: 6 }}
        accessible
        accessibilityLabel={t(`Settimana del ${r.titolo}: ${r.giorniAttivi} giorni attivi su 7`, `Week of ${r.titolo}: ${r.giorniAttivi} active days out of 7`)}
      >
        <View style={stili.settimana}>
          {SIGLE_GIORNI.map((s, i) => (
            <Text key={i} style={stili.sigla}>
              {s}
            </Text>
          ))}
        </View>
        <View style={stili.settimana}>
          {r.celle.map((cella) => (
            <View key={cella.giorno} style={stili.cella}>
              <View
                style={[
                  stili.pallina,
                  { backgroundColor: cella.attivo ? FUOCO[1] : cella.futuro ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)' },
                  cella.oggi ? { borderWidth: 2, borderColor: '#fff' } : null,
                ]}
              >
                <Text style={[stili.giorno, { color: cella.attivo ? '#fff' : cella.futuro ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)' }]}>{cella.numero}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={stili.statistiche}>
        <Statistica valore={String(r.sessioni)} etichetta={r.sessioni === 1 ? t('allenamento', 'workout') : t('allenamenti', 'workouts')} />
        <Statistica valore={oreBrevi(r.minuti)} etichetta={t('di allenamento', 'of training')} />
        <Statistica valore={String(r.serieMax)} etichetta={r.serieMax === 1 ? t('giorno di fila', 'day in a row') : t('giorni di fila', 'days in a row')} />
      </View>
      {r.lezioniFatte.length ? (
        <Text style={stili.lezioni} numberOfLines={2}>
          {`${t('Le mie lezioni', 'My classes')}: ${r.lezioniFatte.map((l) => (l.volte > 1 ? `${l.nome} ×${l.volte}` : l.nome)).join(' · ')}`}
        </Text>
      ) : null}
      <View style={stili.piede}>
        <Text style={stili.piedeTesto}>athlonroma.it</Text>
        <Text style={stili.piedeTesto}>#AthlonRoma</Text>
      </View>
    </LinearGradient>
  )
}

export function SchermataSettimana() {
  const p = usePalette()
  const vista = !!vistaCorrente()
  const fit = useFit()
  const oggi = oggiRoma()
  const [scelta, setScelta] = useState<string | null>(null)
  const [formato, setFormato] = useState<FormatoImmagine>('feed')
  const [esito, setEsito] = useState<EsitoCondivisione | null>(null)
  const [invio, setInvio] = useState(false)

  const inizio = scelta ?? (fit.sessioni ? settimanaPartenza(fit.sessioni, oggi) : settimanaDi(oggi))
  const r = useMemo(() => (fit.sessioni ? riepilogoSettimana(fit.sessioni, inizio, oggi) : null), [fit.sessioni, inizio, oggi])
  const questa = settimanaDi(oggi)
  const settimane = [questa, settimanaPrima(questa)]
  const web = immagineSettimanaDisponibile()

  async function manda(soloScarica = false) {
    if (!r) return
    setInvio(true)
    setEsito(null)
    const e = await condividiSettimana(r, formato, soloScarica)
    setInvio(false)
    setEsito(e)
  }

  return (
    <Schermata
      sopratitolo="Athlon Health System"
      titolo={t('La tua settimana', 'Your week')}
      sottotitolo={t('Gli allenamenti della settimana, da condividere.', 'Your week of training, ready to share.')}
      indietro="/allenamento"
      barra={false}
    >
      {vista ? (
        <Messaggio tono="attenzione">{t('Il riepilogo della settimana lo vede e lo condivide il socio.', 'The weekly summary is for the member to see and share.')}</Messaggio>
      ) : !r ? (
        <Scheletro altezza={460} tondo={28} />
      ) : (
        <>
          <View style={stili.scelta}>
            {settimane.map((s, i) => {
              const attiva = s === inizio
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    setScelta(s)
                    setEsito(null)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: attiva }}
                  style={[stili.pillola, { borderColor: attiva ? p.accento : p.linea, backgroundColor: attiva ? p.incavo : 'transparent' }]}
                >
                  <Text style={[stili.pillolaTesto, { color: attiva ? p.accento : p.testoSecondario }]}>{i === 0 ? t('Questa settimana', 'This week') : t('Settimana scorsa', 'Last week')}</Text>
                </Pressable>
              )
            })}
          </View>

          {!r.haDati ? (
            <Messaggio tono="attenzione" titolo={t('Ancora niente in questa settimana', 'Nothing yet this week')}>
              {t(
                'La settimana si riempie con i piani di allenamento chiusi nell’app, le lezioni con la presenza segnata dalla reception e gli allenamenti dei dispositivi.',
                'The week fills up with workout plans finished in the app, classes where reception marked your attendance, and workouts from your devices.',
              )}
            </Messaggio>
          ) : (
            <>
              <Entra indice={0}>
                <SchedaSettimana r={r} />
              </Entra>
              <Entra indice={1}>
                <Carta piatta>
                  <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 }}>{fraseSettimana(r)}</Text>
                  {r.precedente ? (
                    <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
                      {t(
                        `La settimana prima: ${r.precedente.giorniAttivi} ${r.precedente.giorniAttivi === 1 ? 'giorno attivo' : 'giorni attivi'}, ${r.precedente.sessioni} ${r.precedente.sessioni === 1 ? 'allenamento' : 'allenamenti'}, ${oreBrevi(r.precedente.minuti)}.`,
                        `The week before: ${r.precedente.giorniAttivi} active ${r.precedente.giorniAttivi === 1 ? 'day' : 'days'}, ${r.precedente.sessioni} ${r.precedente.sessioni === 1 ? 'workout' : 'workouts'}, ${oreBrevi(r.precedente.minuti)}.`,
                      )}
                    </Text>
                  ) : null}
                </Carta>
              </Entra>
              {web ? (
                <View style={{ gap: spazio.due }}>
                  <Text style={[stili.etichettaFormato, { color: p.testoSecondario }]}>{t('Dove la metti?', 'Where will you post it?')}</Text>
                  <View style={stili.scelta}>
                    {(
                      [
                        { f: 'feed', testo: t('Post (4:5)', 'Post (4:5)') },
                        { f: 'storia', testo: t('Storia (9:16)', 'Story (9:16)') },
                      ] as const
                    ).map(({ f, testo }) => {
                      const attivo = f === formato
                      return (
                        <Pressable
                          key={f}
                          onPress={() => setFormato(f)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: attivo }}
                          style={[stili.pillola, { borderColor: attivo ? p.accento : p.linea, backgroundColor: attivo ? p.incavo : 'transparent' }]}
                        >
                          <Text style={[stili.pillolaTesto, { color: attivo ? p.accento : p.testoSecondario }]}>{testo}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              ) : null}
              <View style={{ gap: spazio.due }}>
                <Pulsante testo={web ? t('Condividi l’immagine', 'Share the image') : t('Condividi', 'Share')} icona="condividi" onPress={() => manda()} inCorso={invio} />
                {web ? <Pulsante testo={t('Scarica l’immagine', 'Download the image')} variante="secondario" piccolo onPress={() => manda(true)} disabilitato={invio} /> : null}
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
export function CartaSettimana() {
  const p = usePalette()
  const fit = useFit()
  const oggi = oggiRoma()
  const r = useMemo(() => {
    if (fit.vista || !fit.sessioni) return null
    const x = riepilogoSettimana(fit.sessioni, settimanaPartenza(fit.sessioni, oggi), oggi)
    return x.haDati ? x : null
  }, [fit.vista, fit.sessioni, oggi])
  if (!r) return null
  return (
    <Carta onPress={() => router.push('/allenamento/settimana')}>
      <View style={stili.cartaRiga}>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cartaIcona}>
          <Icona nome="condividi" size={20} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.cartaTitolo, { color: p.testo }]}>{r.incorso ? t('La tua settimana in Athlon', 'Your week at Athlon') : t('La tua settimana scorsa in Athlon', 'Your last week at Athlon')}</Text>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
            {t(
              `${r.giorniAttivi} ${r.giorniAttivi === 1 ? 'giorno attivo' : 'giorni attivi'} · ${r.sessioni} ${r.sessioni === 1 ? 'allenamento' : 'allenamenti'}. Guardala e condividila.`,
              `${r.giorniAttivi} active ${r.giorniAttivi === 1 ? 'day' : 'days'} · ${r.sessioni} ${r.sessioni === 1 ? 'workout' : 'workouts'}. See it and share it.`,
            )}
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
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 30, letterSpacing: -0.8 },
  sottoTitolo: { color: 'rgba(255,255,255,0.62)', fontFamily: F.semi, fontSize: 14 },
  numeroRiga: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  numero: { color: FUOCO[0], fontFamily: F.extra, fontSize: 84, lineHeight: 90, letterSpacing: -3 },
  numeroEtichetta: { color: '#fff', fontFamily: F.bold, fontSize: 17 },
  numeroSotto: { color: 'rgba(255,255,255,0.5)', fontFamily: F.medio, fontSize: 12.5 },
  settimana: { flexDirection: 'row' },
  sigla: { flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: F.bold, fontSize: 11 },
  cella: { flex: 1, alignItems: 'center' },
  pallina: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  giorno: { fontFamily: F.bold, fontSize: 12.5 },
  statistiche: { flexDirection: 'row', gap: spazio.tre },
  statValore: { color: '#fff', fontFamily: F.extra, fontSize: 24, letterSpacing: -0.6 },
  statEtichetta: { color: 'rgba(255,255,255,0.55)', fontFamily: F.medio, fontSize: 12 },
  lezioni: { color: 'rgba(255,255,255,0.7)', fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  piede: { flexDirection: 'row', justifyContent: 'space-between' },
  piedeTesto: { color: 'rgba(255,255,255,0.4)', fontFamily: F.medio, fontSize: 11.5 },
  scelta: { flexDirection: 'row', gap: spazio.due },
  etichettaFormato: { fontFamily: F.semi, fontSize: 13.5 },
  pillola: { height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  pillolaTesto: { fontFamily: F.semi, fontSize: 13.5 },
  nota: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  cartaRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  cartaIcona: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cartaTitolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
})
