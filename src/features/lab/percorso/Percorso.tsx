import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import type { SchedaLezione } from '@/api/lab'
import { eliminaPercorso, type GiornoSettimana, type TappaSettimana } from '@/api/percorso'
import { LARGO } from '@/components/Pagina'
import { giornoEsteso } from '@/lib/eventi'
import { t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { LIVELLI } from '../schede/comune'
import { giornoRoma, lunediDi, spostaGiorno } from '../schede/contatoreCalorie'
import { nomeObiettivo } from '../schede/questionario'
import { FoglioLezione } from '../ui/FoglioLezione'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Etichetta, Messaggio, Pulsante, SchedeInArrivo, Sezione, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { usePrenotazioneLezione } from '../usePrenotazioneLezione'
import { mettiBozzaPercorso, scartaBozzaPercorso } from './bozzaPercorso'
import { GIORNI, intervallo, NOME_GIORNO, tappeDelGiorno } from './comune'
import { PannelloEffetti } from './Effetti'
import { calcolaEffetti } from './effetti'
import { PianoOPercorso } from './PianoOPercorso'
import { dividiLaSettimana } from './dividi'
import { PrenotaSettimana } from './PrenotaSettimana'
import { TappaCarta } from './TappaCarta'
import { invalidaPercorso, usePercorso } from './usePercorso'
import { dimenticaGiornoCalendario, useSettimana } from './useSettimana'
import { useUltime } from './useUltime'

// Il Percorso Athlon (20/10/2026): il tutor tecnico della tua settimana. Una settimana tipo fatta di tappe —
// la sala (coi tuoi piani di allenamento), il cardio, le lezioni di gruppo, l'acqua — che ogni settimana
// diventa le lezioni vere del palinsesto, ciascuna prenotabile dalla sua tappa.
//
// **Non e' un piano di allenamento**, e la schermata lo dice subito: il piano e' l'allenamento in sala (gli
// esercizi, le serie, i carichi); il percorso e' la settimana intera e usa i piani come tappe di sala. Nei testi
// per il socio si scrive «percorso» e mai «piano» o «scheda» per questo.
//
// Cosa c'e' qui: senza percorso, la vetrina e l'invito a crearlo; con un percorso, la settimana (questa o la
// prossima) a tappe, «Prenota la settimana» con riepilogo e una conferma sola, gli effetti (`Effetti.tsx`:
// cosa fa la settimana, non solo le calorie) e i comandi per cambiare, rifare o togliere. Nella vista cliente
// dello staff si guarda e basta: niente prenotazioni, niente comandi.

const intestazione = { sopratitolo: 'Percorso Athlon', indietro: '/allenamento' as const }

export function Percorso() {
  const { stato, errore, ricarica, vista } = usePercorso()
  const percorso = stato?.percorso ?? null

  if (errore?.nonAttivo) {
    return (
      <Schermata {...intestazione} titolo={t('Il tuo percorso', 'Your program')}>
        <Messaggio tono="attenzione" titolo={t('Non è ancora attivo', 'Not active yet')}>
          {errore.messaggio}
        </Messaggio>
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...intestazione} titolo={t('Il tuo percorso', 'Your program')}>
        {errore ? (
          <>
            <Messaggio>{errore.messaggio}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={ricarica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }
  if (!stato.maggiorenne) {
    return (
      <Schermata {...intestazione} titolo={t('Il tuo percorso', 'Your program')}>
        <Messaggio tono="attenzione">{t('Il Percorso è riservato ai maggiorenni.', 'The program is for adults only.')}</Messaggio>
      </Schermata>
    )
  }
  if (!percorso) return <Vetrina vista={vista} />
  return <ConPercorso key={percorso.id} percorso={percorso} schede={stato.schede} vista={vista} dopoLaModifica={ricarica} />
}

// ---------------------------------------------------------------------------
// Senza percorso

function Vetrina({ vista }: { vista: boolean }) {
  const p = usePalette()
  return (
    <Schermata
      {...intestazione}
      titolo={t('Il tutor della tua settimana', 'Your weekly coach')}
      sottotitolo={t(
        'Ti chiede cosa ti piace, guarda il palinsesto vero e compone una settimana a tappe: sala, lezioni, acqua e cardio, nei giorni e negli orari giusti per te.',
        'It asks what you like, looks at the real timetable and builds a week in steps: gym floor, classes, water and cardio, on the days and at the times that suit you.',
      )}
    >
      <Entra>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.hero}>
          <Icona nome="stella" size={34} colore="#fff" />
          <Text style={stili.heroTitolo}>Percorso Athlon</Text>
          <Text style={stili.heroTesto}>{t('Il tutor tecnico della tua settimana: sala, lezioni e acqua, insieme.', 'The technical coach for your week: gym floor, classes and water, together.')}</Text>
        </LinearGradient>
      </Entra>

      <PianoOPercorso />

      <Sezione titolo={t('Cosa ottieni', 'What you get')}>
        <Carta style={{ gap: spazio.tre }}>
          {[
            ['calendario', t('Una settimana a tappe: giorno, ora e cosa fare, nelle lezioni che ci sono davvero.', 'A week in steps: day, time and what to do, in classes that really exist.')],
            ['avanti', t('Ogni lezione si prenota dalla sua tappa, o tutte insieme con «Prenota la settimana».', 'Book each class from its step, or all of them at once with “Book the week”.')],
            ['grafico', t('Cosa fa la settimana: lavoro, intensità, recupero e cosa copre il tuo obiettivo, non solo le calorie.', 'What the week does: workload, intensity, recovery and how it covers your goal, not just calories.')],
          ].map(([icona, testo]) => (
            <View key={testo} style={stili.differenzaRiga}>
              <Icona nome={icona as 'calendario'} size={19} colore={p.accento} />
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{testo}</Text>
            </View>
          ))}
        </Carta>
      </Sezione>

      {vista ? (
        <Messaggio tono="attenzione">{t('In vista cliente il Percorso si guarda e basta: questo socio non ne ha ancora uno.', 'In member view the program is view-only: this member doesn’t have one yet.')}</Messaggio>
      ) : (
        <Pulsante testo={t('Crea il tuo percorso', 'Create your program')} icona="stella" onPress={() => router.push('/allenamento/percorso-nuovo')} />
      )}
      <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>
        {t(
          'Il percorso è riservato ai maggiorenni. Lo compone un’intelligenza artificiale e lo confermi tu; i trainer del club lo possono vedere dal pannello.',
          'The program is for adults only. An artificial intelligence builds it and you confirm it; the club’s trainers can see it from their dashboard.',
        )}
      </Text>
    </Schermata>
  )
}

// ---------------------------------------------------------------------------
// Con un percorso

type PercorsoSalvato = NonNullable<ReturnType<typeof usePercorso>['stato']>['percorso'] & object

function ConPercorso({ percorso, schede, vista, dopoLaModifica }: { percorso: PercorsoSalvato; schede: Record<string, SchedaLezione>; vista: boolean; dopoLaModifica: () => void }) {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const largo = width >= LARGO
  const oggi = giornoRoma(new Date())
  const [avanti, setAvanti] = useState(0)
  const lunedi = spostaGiorno(lunediDi(oggi), 7 * avanti)
  const { settimana, errore, ricarica, prenotazione } = useSettimana(lunedi, true)
  const { corpo, ultime } = useUltime()
  const [riepilogo, setRiepilogo] = useState(false)
  const [aperta, setAperta] = useState<{ nome: string; categoria: string; scheda: SchedaLezione } | null>(null)
  const [conferma, setConferma] = useState(false)
  const [togliendo, setTogliendo] = useState(false)
  const [erroreTogli, setErroreTogli] = useState<string | null>(null)

  // Dopo una prenotazione o una disdetta la riga si aggiorna subito, la memoria del calendario non vale piu', e
  // fra poco si rilegge la settimana: i limiti delle altre lezioni (prenotabile dopo…) sono cambiati.
  const dopoLaPrenotazione = () => {
    if (settimana) for (const g of settimana.giorni) dimenticaGiornoCalendario(g, settimana.member_id)
    setTimeout(ricarica, 1200)
  }
  const azioni = usePrenotazioneLezione(settimana?.member_id, {
    prenotata: (id, b) => {
      prenotazione(id, b, b.attesa ? 0 : 1, b.attesa ? 1 : 0)
      dopoLaPrenotazione()
    },
    disdetta: (id, inAttesa) => {
      prenotazione(id, null, inAttesa ? 0 : -1, inAttesa ? -1 : 0)
      dopoLaPrenotazione()
    },
  })

  // Le schede del sito della settimana vera (quelle delle alternative comprese) e quelle del percorso salvato.
  const schedeDellaSettimana = useMemo(() => ({ ...schede, ...(settimana?.schede ?? {}) }), [schede, settimana?.schede])
  const effetti = useMemo(() => calcolaEffetti(percorso.tappe, schedeDellaSettimana, { obiettivo: percorso.obiettivo, corpo: corpo.stato === 'ok' ? corpo.corpo : null }), [percorso, schedeDellaSettimana, corpo])

  const tappe: TappaSettimana[] = settimana?.tappe ?? []
  // Quelle da decidere nel riepilogo: con posti, e quelle al completo (lista d'attesa o un'alternativa).
  const prenotabili = useMemo(() => {
    const g = dividiLaSettimana(tappe)
    return g.adesso.length + g.complete.length
  }, [tappe])
  const giorniConTappe = GIORNI.filter((g) => tappe.some((t) => t.giorno === g))
  const riposo = GIORNI.filter((g) => !giorniConTappe.includes(g))
  const giornoDi = (g: GiornoSettimana) => settimana?.giorni[g - 1]

  async function togli() {
    setErroreTogli(null)
    setTogliendo(true)
    const r = await eliminaPercorso()
    setTogliendo(false)
    if (!r.ok) {
      colpetto('errore')
      return setErroreTogli(r.errore)
    }
    colpetto('ok')
    invalidaPercorso()
    scartaBozzaPercorso()
    dopoLaModifica()
  }

  function modifica() {
    // Si parte dal percorso salvato, con le stesse tappe: l'editor lavora su una copia, e salva solo alla conferma.
    scartaBozzaPercorso()
    mettiBozzaPercorso({
      bozza: { titolo: percorso.titolo, sintesi: percorso.sintesi, obiettivo: percorso.obiettivo, livello: percorso.livello, preferenze: percorso.preferenze, tappe: percorso.tappe },
      schede,
      avvisi: [],
      modo: 'modifica',
    })
    router.push({ pathname: '/allenamento/percorso-modifica', params: { da: 'salvato' } })
  }

  return (
    <Schermata {...intestazione} titolo={percorso.titolo} sottotitolo={percorso.sintesi || undefined}>
      <View style={{ gap: spazio.tre }}>
        <View style={stili.etichette}>
          <Tag testo={nomeObiettivo(percorso.obiettivo)} colore={p.accento} />
          <Tag testo={tv(percorso.livello, LIVELLI[percorso.livello] ?? percorso.livello)} colore={p.testoSecondario} />
          <Tag testo={t(`${effetti.giorni.attivi} ${effetti.giorni.attivi === 1 ? 'giorno' : 'giorni'} a settimana`, `${effetti.giorni.attivi} ${effetti.giorni.attivi === 1 ? 'day' : 'days'} a week`)} colore={p.testoSecondario} />
        </View>
        <PianoOPercorso />
      </View>

      <Sezione titolo={t('La tua settimana', 'Your week')}>
        <View style={stili.settimane}>
          {[0, 1].map((n) => {
            const attivo = n === avanti
            const lun = spostaGiorno(lunediDi(oggi), 7 * n)
            return (
              <Tocco
                key={n}
                vibra="scelta"
                stato={{ selected: attivo }}
                onPress={() => setAvanti(n)}
                etichetta={`${n === 0 ? t('Questa settimana', 'This week') : t('Settimana prossima', 'Next week')}, ${intervallo(lun, spostaGiorno(lun, 6))}`}
                style={[stili.settimana, { backgroundColor: attivo ? p.testo : p.carta, borderColor: attivo ? p.testo : p.linea }]}
              >
                <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: F.extra, fontSize: 14.5 }}>{n === 0 ? t('Questa settimana', 'This week') : t('La prossima', 'Next week')}</Text>
                <Text style={{ color: attivo ? p.fondo : p.testoSecondario, fontFamily: F.medio, fontSize: 12.5 }}>{intervallo(lun, spostaGiorno(lun, 6))}</Text>
              </Tocco>
            )
          })}
        </View>

        {errore && !settimana ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={ricarica} />
          </>
        ) : !settimana ? (
          <SchedeInArrivo />
        ) : (
          <>
            {!settimana.prenotazioni_lette ? (
              <Messaggio tono="attenzione">{t('Non riusciamo a leggere le tue prenotazioni adesso: la settimana si vede, ma non sappiamo cosa hai già prenotato.', 'We can’t read your bookings right now: you can see the week, but we don’t know what you’ve already booked.')}</Messaggio>
            ) : null}
            {!vista && settimana.prenotazioni_lette ? (
              <Pulsante
                testo={prenotabili ? t(`Prenota la settimana · ${prenotabili} ${prenotabili === 1 ? 'lezione' : 'lezioni'}`, `Book the week · ${prenotabili} ${prenotabili === 1 ? 'class' : 'classes'}`) : t('Prenota la settimana', 'Book the week')}
                icona="avanti"
                onPress={() => setRiepilogo(true)}
              />
            ) : null}

            <View style={largo ? stili.griglia : { gap: spazio.quattro }}>
              {giorniConTappe.map((g, i) => {
                const delGiorno = tappeDelGiorno(tappe, g)
                const data = giornoDi(g)
                return (
                  <View key={g} style={largo ? { flexGrow: 1, flexBasis: '46%', gap: spazio.tre } : { gap: spazio.tre }}>
                    <Entra indice={i}>
                      <View style={stili.giornoTesta}>
                        <Text style={[stili.giornoNome, { color: p.testo }]}>{NOME_GIORNO[g]}</Text>
                        {data ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{giornoEsteso(data).replace(/^\S+\s/, '')}</Text> : null}
                        {data === oggi ? <Etichetta testo={t('Oggi', 'Today')} tono="accento" /> : null}
                      </View>
                    </Entra>
                    {delGiorno.map((t) => (
                      <TappaCarta
                        key={`${t.giorno}-${t.ordine}`}
                        t={t}
                        delGiorno={delGiorno}
                        schede={schedeDellaSettimana}
                        vista={vista}
                        azioni={azioni}
                        onScheda={setAperta}
                      />
                    ))}
                  </View>
                )
              })}
            </View>
            {riposo.length ? (
              <Carta piatta style={stili.riposo}>
                <Icona nome="foglia" size={20} colore={p.ok} />
                <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{t(`Riposo: ${riposo.map((g) => NOME_GIORNO[g].toLowerCase()).join(', ')}.`, `Rest: ${riposo.map((g) => NOME_GIORNO[g]).join(', ')}.`)}</Text>
              </Carta>
            ) : null}
          </>
        )}
      </Sezione>

      <PannelloEffetti effetti={effetti} ultime={ultime} corpo={corpo} />

      {vista ? null : (
        <Sezione titolo={t('Il tuo percorso', 'Your program')}>
          <View style={{ gap: spazio.due }}>
            <Pulsante testo={t('Cambia le tappe', 'Change the steps')} icona="modifica" variante="scuro" onPress={modifica} />
            <Pulsante testo={t('Fallo rifare al tutor', 'Have the coach redo it')} icona="stella" variante="secondario" onPress={() => router.push('/allenamento/percorso-nuovo')} />
            {conferma ? (
              <>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Il percorso sparisce: le lezioni che hai già prenotato restano prenotate, e i tuoi piani di allenamento non cambiano.', 'The program goes away: classes you’ve already booked stay booked, and your workout plans don’t change.')}</Text>
                <View style={stili.azioni}>
                  <Pulsante testo={t('Sì, toglilo', 'Yes, remove it')} variante="pericolo" onPress={togli} inCorso={togliendo} />
                  <Pulsante testo={t('No', 'No')} variante="secondario" onPress={() => setConferma(false)} disabilitato={togliendo} />
                </View>
              </>
            ) : (
              <Pulsante testo={t('Togli il percorso', 'Remove the program')} variante="fantasma" onPress={() => setConferma(true)} />
            )}
            {erroreTogli ? <Messaggio>{erroreTogli}</Messaggio> : null}
          </View>
        </Sezione>
      )}

      {settimana ? <PrenotaSettimana aperto={riepilogo} tappe={tappe} memberId={settimana.member_id} onChiudi={() => setRiepilogo(false)} onPrenotata={(id, b) => { prenotazione(id, b, b.attesa ? 0 : 1, b.attesa ? 1 : 0); dopoLaPrenotazione() }} /> : null}
      {aperta ? <FoglioLezione scheda={aperta.scheda} titolo={aperta.nome} categoria={aperta.categoria} onChiudi={() => setAperta(null)} /> : null}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  piccola: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  hero: { borderRadius: 30, padding: spazio.cinque, gap: spazio.due },
  heroTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 28, letterSpacing: -0.9 },
  heroTesto: { color: 'rgba(255,255,255,0.92)', fontFamily: F.semi, fontSize: 16, lineHeight: 22 },
  differenza: { borderRadius: 20, padding: spazio.tre + 2, gap: spazio.tre },
  differenzaRiga: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2 },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  settimane: { flexDirection: 'row', gap: spazio.due },
  settimana: { flex: 1, borderRadius: 18, paddingVertical: 10, paddingHorizontal: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth, gap: 1 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.quattro, alignItems: 'flex-start' },
  giornoTesta: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  giornoNome: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5 },
  riposo: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
