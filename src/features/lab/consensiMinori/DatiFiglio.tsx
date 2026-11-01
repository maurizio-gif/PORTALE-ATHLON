import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { AMBITI, datiFiglio, statoConsensiMinori, type AmbitoMinore, type DatiAmbito, type FiglioConsensi } from '@/api/consensiMinori'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import type { NomeIcona } from '../ui/Icona'
import { Bollino, Carta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { TESTI_AMBITO } from './informativa'

// «I dati di tuo figlio»: il genitore vede i dati sulla salute di un figlio da 13 a 17 anni (02/11/2026, decisione di Maurizio, che ribalta la
// proposta di tenerli riservati al ragazzo; l'informativa per il genitore lo dice). **Solo lettura**: il genitore non scrive e non cancella qui
// (togliere un consenso e' nella pagina dei consensi). Per ogni area si vede solo con il consenso vivo alla versione corrente dell'informativa:
// senza, una riga lo dice e rimanda ai consensi. Chi e' il figlio, l'eta' e il consenso li ricontrolla la funzione `portale-lab-consensi-minori`
// (azione `dati`, APP-ATHLON): l'app non decide niente. In vista cliente niente (lo staff non guarda i dati sulla salute di un minore).

const ICONA: Record<AmbitoMinore, NomeIcona> = { food: 'piatto', recover: 'luna', corpo: 'peso', piani_ai: 'fulmine' }

const giornoBreve = (iso: string) => {
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, g)).toLocaleDateString(t('it-IT', 'en-GB'), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
const ore = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')} min`
const uno = (n: number) => String(Math.round(n * 10) / 10).replace('.', t(',', '.'))

export function DatiFiglio() {
  const p = usePalette()
  const vista = vistaCorrente()
  const { figlio: parametro } = useLocalSearchParams<{ figlio: string }>()
  const id = Number(parametro)
  const [figlio, setFiglio] = useState<FiglioConsensi | null | undefined>(undefined)
  const [errore, setErrore] = useState<string | null>(null)
  const [dati, setDati] = useState<Partial<Record<AmbitoMinore, DatiAmbito>>>({})

  const carica = useCallback(async () => {
    if (vista) return
    setErrore(null)
    const s = await statoConsensiMinori()
    if (!s.ok) return setErrore(s.errore)
    const f = s.figli.find((x) => x.member_id === id) ?? null
    setFiglio(f)
    if (!f) return
    const attivi = AMBITI.filter((a) => f.consensi[a].attivo)
    const risposte = await Promise.all(attivi.map((a) => datiFiglio(id, a)))
    setDati(Object.fromEntries(attivi.map((a, i) => [a, risposte[i]])))
  }, [vista, id])
  useEffect(() => {
    carica()
  }, [carica])

  const nome = figlio?.nome || t('tuo figlio', 'your child')
  const intestazione = { titolo: t(`I dati di ${nome}`, `${nome}’s data`), sopratitolo: t('Il tuo nucleo', 'Your family'), indietro: '/consensi-minori' as const, barra: false }

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Vista cliente', 'Client view')}>
          {t('I dati sulla salute di un figlio li vede solo il genitore, dal suo telefono.', 'Only the parent can see a child’s health data, from their phone.')}
        </Messaggio>
      </Schermata>
    )
  }
  if (errore) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
      </Schermata>
    )
  }
  if (figlio === undefined) {
    return (
      <Schermata {...intestazione}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }
  if (figlio === null) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione">{t('Non troviamo questo figlio fra quelli per cui puoi dare il consenso.', 'We can’t find this child among those you can give consent for.')}</Messaggio>
      </Schermata>
    )
  }

  const piccolo = [stili.piccolo, { color: p.testoTerzo }]
  const riga = [stili.voce, { color: p.testo }]
  const vuoto = (testo: string) => <Text style={[stili.corpo, { color: p.testoSecondario }]}>{testo}</Text>

  function corpo(a: AmbitoMinore, d: DatiAmbito | undefined) {
    if (!d) return <SchedeInArrivo quante={1} />
    if (!d.ok) return <Messaggio>{d.errore}</Messaggio>
    if (!d.consenso) return vuoto(t('Il consenso non è attivo: non c’è niente da vedere.', 'Consent isn’t active: there’s nothing to see.'))
    if (d.ambito === 'food') {
      if (!d.voci.length) return vuoto(t(`Negli ultimi ${d.giorni} giorni non ha scritto niente.`, `Nothing entered in the last ${d.giorni} days.`))
      const perGiorno = new Map<string, typeof d.voci>()
      for (const v of d.voci) perGiorno.set(v.data, [...(perGiorno.get(v.data) ?? []), v])
      return (
        <View style={{ gap: spazio.tre }}>
          {[...perGiorno.entries()].map(([data, voci]) => {
            const kcal = voci.reduce((s, v) => s + (v.kcal ?? 0), 0)
            return (
              <View key={data} style={{ gap: 2 }}>
                <Text style={riga}>{`${giornoBreve(data)} · ${Math.round(kcal)} kcal`}</Text>
                {voci.map((v) => (
                  <Text key={v.id} style={piccolo}>{`${v.pasto ? `${v.pasto}: ` : ''}${v.nome}${v.grammi ? `, ${Math.round(v.grammi)} g` : ''}`}</Text>
                ))}
              </View>
            )
          })}
        </View>
      )
    }
    if (d.ambito === 'recover') {
      if (!d.giorni.length && !d.allenamenti.length) return vuoto(t(`Negli ultimi ${d.giorni_letti} giorni non ci sono dati di sonno o allenamento.`, `No sleep or workout data in the last ${d.giorni_letti} days.`))
      return (
        <View style={{ gap: spazio.tre }}>
          {d.giorni.map((g) => (
            <View key={`${g.data}-${g.fornitore}`} style={{ gap: 2 }}>
              <Text style={riga}>{`${giornoBreve(g.data)}${g.sonno_minuti ? ` · ${t('sonno', 'sleep')} ${ore(g.sonno_minuti)}` : ''}`}</Text>
              <Text style={piccolo}>
                {[
                  g.sonno_a_letto && g.sonno_sveglia ? `${g.sonno_a_letto} → ${g.sonno_sveglia}` : null,
                  g.sonno_punteggio != null ? t(`punteggio ${uno(g.sonno_punteggio)}`, `score ${uno(g.sonno_punteggio)}`) : null,
                  g.recupero_valore != null ? t(`recupero ${uno(g.recupero_valore)}`, `recovery ${uno(g.recupero_valore)}`) : null,
                  g.passi != null ? t(`${g.passi} passi`, `${g.passi} steps`) : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || t('Nessun dato di sonno', 'No sleep data')}
              </Text>
            </View>
          ))}
          {d.allenamenti.length ? <Text style={[stili.sotto, { color: p.testo }]}>{t('Allenamenti', 'Workouts')}</Text> : null}
          {d.allenamenti.map((x) => (
            <Text key={x.id} style={piccolo}>
              {[giornoBreve(x.inizio), x.sport, x.durata_minuti ? `${Math.round(x.durata_minuti)} min` : null, x.calorie ? `${Math.round(x.calorie)} kcal` : null].filter(Boolean).join(' · ')}
            </Text>
          ))}
        </View>
      )
    }
    if (d.ambito === 'corpo') {
      if (!d.misure.length) return vuoto(t('Non ci sono ancora misure.', 'No measurements yet.'))
      return (
        <View style={{ gap: spazio.tre }}>
          {d.sesso ? <Text style={piccolo}>{t(`Sesso scelto per le stime: ${d.sesso === 'm' ? 'maschio' : 'femmina'}`, `Sex chosen for estimates: ${d.sesso === 'm' ? 'male' : 'female'}`)}</Text> : null}
          {d.misure.map((m) => (
            <View key={m.id} style={{ gap: 2 }}>
              <Text style={riga}>{giornoBreve(m.data)}</Text>
              <Text style={piccolo}>
                {[
                  m.peso_kg != null ? `${uno(m.peso_kg)} kg` : null,
                  m.altezza_cm != null ? `${uno(m.altezza_cm)} cm` : null,
                  m.vita_cm != null ? t(`vita ${uno(m.vita_cm)} cm`, `waist ${uno(m.vita_cm)} cm`) : null,
                  m.massa_grassa_pct != null ? t(`massa grassa ${uno(m.massa_grassa_pct)}%`, `body fat ${uno(m.massa_grassa_pct)}%`) : null,
                  m.note,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      )
    }
    if (!d.piani.length) return vuoto(t('Non ha ancora salvato piani scritti con l’intelligenza artificiale.', 'No plans written with artificial intelligence have been saved yet.'))
    return (
      <View style={{ gap: spazio.tre }}>
        {d.piani.map((x) => (
          <View key={x.id} style={{ gap: 2 }}>
            <Text style={riga}>{x.titolo}</Text>
            <Text style={piccolo}>
              {[x.obiettivo, x.livello, x.giorni ? t(`${x.giorni} giorni`, `${x.giorni} days`) : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ))}
      </View>
    )
  }

  const nessuno = AMBITI.every((a) => !figlio.consensi[a].attivo)
  return (
    <Schermata {...intestazione} sottotitolo={t('Quello che tuo figlio scrive nelle aree per cui hai dato il consenso. Qui si guarda soltanto.', 'What your child enters in the areas you’ve consented to. This is view-only.')}>
      {nessuno ? (
        <Messaggio tono="attenzione" titolo={t('Nessun consenso attivo', 'No active consent')}>
          {t('Per vedere i dati di un’area devi prima dare il consenso, nella pagina dei consensi.', 'To see an area’s data you first have to give consent, on the consents page.')}
        </Messaggio>
      ) : null}
      {AMBITI.map((a) => (
        <Sezione key={a} titolo={TESTI_AMBITO[a].titolo}>
          <Carta style={{ gap: spazio.tre }}>
            <View style={stili.testa}>
              <Bollino icona={ICONA[a]} tono="accento" size={36} pieno />
              <Text style={[stili.piccolo, { color: p.testoTerzo, flex: 1 }]}>
                {figlio.consensi[a].attivo ? t('Consenso attivo', 'Consent active') : figlio.consensi[a].da_rinnovare ? t('Da rinnovare: l’informativa è cambiata', 'To renew: the notice has changed') : t('Consenso non dato', 'Consent not given')}
              </Text>
            </View>
            {figlio.consensi[a].attivo ? corpo(a, dati[a]) : null}
          </Carta>
        </Sezione>
      ))}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center' },
  voce: { fontFamily: F.semi, fontSize: 14.5, lineHeight: 20 },
  sotto: { fontFamily: F.bold, fontSize: 14, lineHeight: 20, marginTop: spazio.due },
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  piccolo: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
})
