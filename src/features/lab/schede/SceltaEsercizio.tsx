import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { eserciziLibreria, type EsercizioLibreria } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante, Tag } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { MUSCOLI, muscoli, nomeAttrezzo } from './comune'

// La scelta di un esercizio per la scheda che il socio scrive (19/10/2026): la libreria accesa del club
// (senza video e poster: sono seicento) e gli esercizi che ha gia' scritto lui, con la ricerca per nome e il
// gruppo muscolare. **Chi non trova il suo scrive il nome**: diventa un esercizio suo, che si registra e si
// segue come gli altri (`nome_libero`, lo crea la funzione).
//
// **In un piano di nuoto** (20/10/2026, `ambiente="vasca"`) si scelgono solo gli esercizi di vasca e **non si scrive un
// nome proprio**: un esercizio suo e' di sala, e il piano smetterebbe di essere «di vasca». In un piano di sala gli
// esercizi di vasca non compaiono: il nuoto ha il suo piano.

export type Scelta = { esercizio_id: string; nome: string } | { nome_libero: string }

const CHIAVE_LIBRERIA = 'schede:libreria'
const PAGINA = 40
const GRUPPI = ['pettorali', 'schiena', 'spalle', 'bicipiti', 'tricipiti', 'core', 'glutei', 'quadricipiti', 'femorali', 'polpacci']

/** Senza accenti e maiuscole: «Rematore» e «rémator» si trovano. */
const norma = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Dati = { esercizi: EsercizioLibreria[] }

export function SceltaEsercizio({ aperto, titolo = t('Scegli un esercizio', 'Choose an exercise'), onChiudi, onScegli, ambiente = 'sala' }: { aperto: boolean; titolo?: string; onChiudi: () => void; onScegli: (s: Scelta) => void; ambiente?: 'sala' | 'vasca' }) {
  const p = usePalette()
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<Dati>(CHIAVE_LIBRERIA) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [gruppo, setGruppo] = useState<string | null>(null)
  const [quanti, setQuanti] = useState(PAGINA)
  const [libero, setLibero] = useState('')

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_LIBRERIA, eserciziLibreria)
    if (r.ok) setDati({ esercizi: r.esercizi })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    if (!aperto) return
    setQ('')
    setGruppo(null)
    setQuanti(PAGINA)
    setLibero('')
    carica()
  }, [aperto, carica])

  const trovati = useMemo(() => {
    if (!dati) return []
    const parole = norma(q).split(/\s+/).filter(Boolean)
    return dati.esercizi.filter((e) => (ambiente === 'vasca' ? e.ambiente === 'vasca' : e.ambiente !== 'vasca') && (!gruppo || e.muscoli_primari.includes(gruppo)) && parole.every((x) => norma(e.nome).includes(x)))
  }, [dati, q, gruppo, ambiente])

  const nomeLibero = libero.trim() || q.trim()

  return (
    <Foglio aperto={aperto} titolo={titolo} sottotitolo={
        ambiente === 'vasca'
          ? t('Gli esercizi di nuoto della libreria del club.', 'The swimming exercises in the club’s library.')
          : t('Cerca nella libreria del club, oppure scrivi il nome del tuo esercizio.', 'Search the club’s library, or write the name of your exercise.')
      } onChiudi={onChiudi}>
      <View style={[stili.cerca, { backgroundColor: p.incavo }]}>
        <Icona nome="cerca" size={18} colore={p.testoSecondario} />
        <TextInput
          value={q}
          onChangeText={(v) => {
            setQ(v.slice(0, 60))
            setQuanti(PAGINA)
          }}
          placeholder={ambiente === 'vasca' ? t('Cerca: stile libero, dorso, gambe…', 'Search: freestyle, backstroke, kick…') : t('Cerca: panca, squat, lat machine…', 'Search: bench, squat, lat pulldown…')}
          placeholderTextColor={p.testoTerzo}
          accessibilityLabel={t('Cerca un esercizio', 'Search for an exercise')}
          autoCorrect={false}
          style={[stili.campo, { color: p.testo }]}
        />
      </View>

      {ambiente === 'sala' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }} style={{ flexGrow: 0 }}>
          {[null, ...GRUPPI].map((g) => {
            const attivo = g === gruppo
            return (
              <Tocco
                key={g ?? 'tutti'}
                vibra="scelta"
                stato={{ selected: attivo }}
                onPress={() => {
                  setGruppo(g)
                  setQuanti(PAGINA)
                }}
                etichetta={g ? MUSCOLI[g] : t('Tutti i muscoli', 'All muscles')}
                style={[stili.chip, { backgroundColor: attivo ? p.testo : p.incavo }]}
              >
                <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 13.5 }}>{g ? MUSCOLI[g] : t('Tutti', 'All')}</Text>
              </Tocco>
            )
          })}
        </ScrollView>
      ) : null}

      {errore ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
        </>
      ) : !dati ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Apro la libreria…', 'Opening the library…')}</Text>
      ) : (
        <View style={{ gap: spazio.due }}>
          {trovati.slice(0, quanti).map((e) => (
            <Tocco key={e.id} onPress={() => onScegli({ esercizio_id: e.id, nome: e.nome })} etichetta={e.nome} scala={0.985}>
              <View style={[stili.riga, { backgroundColor: p.incavo }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
                    {e.nome}
                  </Text>
                  <Text style={[stili.sotto, { color: p.testoSecondario }]} numberOfLines={1}>
                    {[muscoli(e.muscoli_primari.slice(0, 2)), e.attrezzo ? nomeAttrezzo(e.attrezzo) : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {e.mio ? <Tag testo={t('Tuo', 'Yours')} colore={p.accento} /> : null}
                <Icona nome="piu" size={18} colore={p.testoSecondario} />
              </View>
            </Tocco>
          ))}
          {trovati.length > quanti ? <Pulsante testo={t(`Mostra altri (${trovati.length - quanti})`, `Show more (${trovati.length - quanti})`)} variante="secondario" piccolo onPress={() => setQuanti((n) => n + PAGINA)} /> : null}
          {!trovati.length ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Nessun esercizio con questo nome nella libreria.', 'No exercise with this name in the library.')}</Text> : null}
        </View>
      )}

      {ambiente === 'sala' ? (
        <View style={[stili.libero, { borderColor: p.linea }]}>
          <Text style={[stili.titoletto, { color: p.testo }]}>{t('Non lo trovi?', 'Can’t find it?')}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t('Scrivi il nome come lo chiami tu: resta un esercizio tuo, senza video, e lo segui come gli altri.', 'Write the name you call it: it stays your own exercise, without a video, and you follow it like the others.')}
          </Text>
          <TextInput
            value={libero}
            onChangeText={(v) => setLibero(v.slice(0, 80))}
            placeholder={q.trim() ? q.trim() : t('Il nome del tuo esercizio', 'Your exercise’s name')}
            placeholderTextColor={p.testoTerzo}
            accessibilityLabel={t('Il nome del tuo esercizio', 'Your exercise’s name')}
            style={[stili.input, { color: p.testo, backgroundColor: p.incavo }]}
          />
          <Pulsante testo={nomeLibero ? t(`Aggiungi «${nomeLibero}»`, `Add “${nomeLibero}”`) : t('Aggiungi un esercizio tuo', 'Add your own exercise')} icona="piu" variante="scuro" disabilitato={!nomeLibero} onPress={() => onScegli({ nome_libero: nomeLibero })} />
        </View>
      ) : null}
    </Foglio>
  )
}

const stili = StyleSheet.create({
  cerca: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 16, paddingHorizontal: spazio.tre, minHeight: 48 },
  campo: { flex: 1, fontFamily: F.semi, fontSize: 15.5, minHeight: 48, outlineStyle: 'none' } as object,
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: spazio.tre },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 16, padding: spazio.tre },
  nome: { fontFamily: F.extra, fontSize: 15, lineHeight: 19, letterSpacing: -0.2 },
  sotto: { fontFamily: F.semi, fontSize: 12.5 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  titoletto: { fontFamily: F.extra, fontSize: 16 },
  libero: { gap: spazio.due, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre },
  input: { minHeight: 48, borderRadius: 14, paddingHorizontal: spazio.tre, fontFamily: F.semi, fontSize: 15.5, outlineStyle: 'none' } as object,
})
