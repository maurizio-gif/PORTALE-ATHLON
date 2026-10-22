import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

import { progressiEsercizio, storicoAllenamenti, urlEsercizio, type EsercizioFatto, type SedutaEsercizio, type SedutaStorico } from '@/api/lab'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'
import { Image } from 'expo-image'

import { inMemoria, prendi } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Numero, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { quando } from './comune'
import { MediaEsercizio } from './MediaEsercizio'
import { serieInRiga } from './Scheda'

// Lo storico degli allenamenti e i progressi per esercizio: per ogni seduta
// il carico massimo, in colonne che crescono, e le serie fatte.

type Dati = { allenamenti: SedutaStorico[]; esercizi: EsercizioFatto[] }
/** Anche le calorie di una scheda la leggono: la durata vera delle sedute chiuse. */
export const CHIAVE_STORICO = 'schede:storico'
const CHIAVE = CHIAVE_STORICO

function Colonna({ valore, massimo, etichetta, indice, colore }: { valore: number; massimo: number; etichetta: string; indice: number; colore: string }) {
  const p = usePalette()
  const h = useSharedValue(0)
  const alto = massimo ? Math.max(6, (valore / massimo) * 120) : 6
  useEffect(() => {
    h.value = withDelay(indice * 60, withTiming(alto, { duration: 700, easing: Easing.out(Easing.cubic) }))
  }, [alto, indice, h])
  const stile = useAnimatedStyle(() => ({ height: h.value }))
  return (
    <View style={stili.colonna}>
      <Text style={[stili.colonnaValore, { color: p.testo }]}>{valore ? String(valore).replace('.', t(',', '.')) : '—'}</Text>
      <Animated.View style={[stili.colonnaBarra, { backgroundColor: colore }, stile]} />
      <Text style={[stili.colonnaEtichetta, { color: p.testoTerzo }]} numberOfLines={1}>
        {etichetta}
      </Text>
    </View>
  )
}

function Progressi({ esercizioId, onChiudi }: { esercizioId: string | null; onChiudi: () => void }) {
  const p = usePalette()
  const [dati, setDati] = useState<{ nome: string; immagini: string[]; video: string | null; sedute: SedutaEsercizio[] } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  useEffect(() => {
    setDati(null)
    setErrore(null)
    if (!esercizioId) return
    progressiEsercizio(esercizioId).then((r) => {
      if (r.ok) setDati({ nome: r.esercizio.nome, immagini: r.esercizio.immagini, video: r.esercizio.video, sedute: r.sedute })
      else setErrore(r.errore)
    })
  }, [esercizioId])
  const ultime = dati?.sedute.slice(-8) ?? []
  const massimo = Math.max(0, ...ultime.map((s) => s.kg_massimo ?? 0))
  const record = Math.max(0, ...(dati?.sedute ?? []).map((s) => s.kg_massimo ?? 0))
  return (
    <Foglio aperto={!!esercizioId} titolo={dati?.nome ?? t('Progressi', 'Progress')} sottotitolo={t('Il carico più alto di ogni seduta', 'The heaviest load of each workout')} onChiudi={onChiudi}>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {dati ? (
        <View style={{ gap: spazio.tre }}>
          <MediaEsercizio immagini={dati.immagini} video={dati.video} style={stili.media} />
          <View style={{ flexDirection: 'row', gap: spazio.cinque }}>
            <View>
              <Numero valore={String(dati.sedute.length)} size={30} />
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('sedute', 'workouts')}</Text>
            </View>
            {record ? (
              <View>
                <Numero valore={String(record).replace('.', t(',', '.'))} unita="kg" size={30} colore={p.accento} />
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('il massimo', 'the max')}</Text>
              </View>
            ) : null}
          </View>
          {massimo ? (
            <View style={[stili.grafico, { backgroundColor: p.incavo }]}>
              {ultime.map((s, i) => (
                <Colonna
                  key={s.inizio}
                  valore={s.kg_massimo ?? 0}
                  massimo={massimo}
                  etichetta={new Date(s.inizio).toLocaleDateString(locale(), { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })}
                  indice={i}
                  colore={s.kg_massimo === record ? p.accento : p.blu}
                />
              ))}
            </View>
          ) : null}
          <View style={{ gap: spazio.uno }}>
            {[...dati.sedute].reverse().map((s) => (
              <Text key={s.inizio} style={[stili.nota, { color: p.testo }]}>
                <Text style={{ fontFamily: F.bold }}>{quando(s.inizio)}</Text>
                {`  ${serieInRiga(s.serie)}`}
              </Text>
            ))}
          </View>
        </View>
      ) : !errore ? (
        <SchedeInArrivo quante={1} />
      ) : null}
    </Foglio>
  )
}

export function Storico() {
  const p = usePalette()
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<Dati>(CHIAVE) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [esercizio, setEsercizio] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE, storicoAllenamenti)
    if (r.ok) setDati({ allenamenti: r.allenamenti, esercizi: r.esercizi })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  if (!dati) {
    return (
      <Schermata sopratitolo="Train" titolo={t('Storico e progressi', 'History and progress')} indietro="/allenamento" barra={false}>
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }

  const chiusi = dati.allenamenti.filter((a) => a.fine)
  const volume = dati.allenamenti.reduce((n, a) => n + (a.volume ?? 0), 0)
  return (
    <Schermata sopratitolo="Train" titolo={t('Storico e progressi', 'History and progress')} indietro="/allenamento" barra={false}>
      <Carta style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spazio.quattro }}>
        <View style={{ alignItems: 'center' }}>
          <Numero valore={String(chiusi.length)} size={32} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('allenamenti', 'workouts')}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Numero valore={String(dati.allenamenti.reduce((n, a) => n + a.serie, 0))} size={32} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('serie', 'sets')}</Text>
        </View>
        {volume ? (
          <View style={{ alignItems: 'center' }}>
            <Numero valore={`${Math.round(volume / 1000).toLocaleString(locale())}`} unita="t" size={32} colore={p.accento} />
            <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('sollevate', 'lifted')}</Text>
          </View>
        ) : null}
      </Carta>

      {dati.esercizi.length ? (
        <Sezione titolo={t('I tuoi esercizi', 'Your exercises')} conteggio={dati.esercizi.length}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {dati.esercizi.map((e, i) => (
              <Riga
                key={e.esercizio_id}
                prima={i === 0}
                testa={
                  <View style={[stili.miniatura, { backgroundColor: p.incavo }]}>
                    {e.immagini?.[0] ? <Image source={{ uri: urlEsercizio(e.immagini[0]) ?? '' }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                  </View>
                }
                titolo={e.nome}
                sotto={t(
                  `${e.sedute} ${e.sedute === 1 ? 'seduta' : 'sedute'}${e.kg_massimo ? ` · massimo ${String(e.kg_massimo).replace('.', ',')} kg` : ''}`,
                  `${e.sedute} ${e.sedute === 1 ? 'workout' : 'workouts'}${e.kg_massimo ? ` · max ${String(e.kg_massimo)} kg` : ''}`,
                )}
                onPress={() => setEsercizio(e.esercizio_id)}
              />
            ))}
          </Carta>
        </Sezione>
      ) : null}

      <Sezione titolo={t('Le sedute', 'Workouts')} conteggio={dati.allenamenti.length}>
        <Carta style={{ paddingVertical: spazio.due }}>
          {dati.allenamenti.length ? (
            dati.allenamenti.map((a, i) => (
              <Riga
                key={a.id}
                prima={i === 0}
                icona={a.fine ? 'bandiera' : 'cronometro'}
                tono={a.fine ? 'ok' : 'attenzione'}
                titolo={[a.titolo, a.giorno_nome].filter(Boolean).join(' · ') || t('Allenamento', 'Workout')}
                sotto={t(
                  `${quando(a.inizio)} · ${a.serie} serie · ${a.esercizi} esercizi${a.volume ? ` · ${Math.round(a.volume).toLocaleString(locale())} kg` : ''}${a.fine ? '' : ' · non chiuso'}`,
                  `${quando(a.inizio)} · ${a.serie} ${a.serie === 1 ? 'set' : 'sets'} · ${a.esercizi} ${a.esercizi === 1 ? 'exercise' : 'exercises'}${a.volume ? ` · ${Math.round(a.volume).toLocaleString(locale())} kg` : ''}${a.fine ? '' : ' · not finished'}`,
                )}
              />
            ))
          ) : (
            <Riga prima icona="cronometro" tono="neutro" titolo={t('Nessun allenamento ancora', 'No workouts yet')} sotto={t('Apri un piano e premi «Inizia l’allenamento»: le serie che segni finiscono qui.', 'Open a plan and tap “Start workout”: the sets you log end up here.')} />
          )}
        </Carta>
      </Sezione>

      <Progressi esercizioId={esercizio} onChiudi={() => setEsercizio(null)} />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  media: { width: '100%', aspectRatio: 16 / 9, borderRadius: 20 },
  piccola: { fontFamily: F.semi, fontSize: 12.5 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 20 },
  grafico: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, borderRadius: 18, padding: spazio.tre, height: 190 },
  colonna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  colonnaValore: { fontFamily: F.extra, fontSize: 11.5 },
  colonnaBarra: { width: '70%', borderRadius: 8 },
  colonnaEtichetta: { fontFamily: F.semi, fontSize: 10 },
  miniatura: { width: 48, height: 40, borderRadius: 10, overflow: 'hidden' },
})
