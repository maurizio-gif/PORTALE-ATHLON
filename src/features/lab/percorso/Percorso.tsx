import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import type { SchedaLezione } from '@/api/lab'
import { eliminaPercorso, type GiornoSettimana, type TappaSettimana } from '@/api/percorso'
import { LARGO } from '@/components/Pagina'
import { giornoEsteso } from '@/lib/eventi'
import { spazio } from '@/theme'

import { giornoRoma, lunediDi, spostaGiorno } from '../schede/contatoreCalorie'
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
import { PrenotaSettimana, dividiLaSettimana } from './PrenotaSettimana'
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
      <Schermata {...intestazione} titolo="Il tuo percorso">
        <Messaggio tono="attenzione" titolo="Non è ancora attivo">
          {errore.messaggio}
        </Messaggio>
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...intestazione} titolo="Il tuo percorso">
        {errore ? (
          <>
            <Messaggio>{errore.messaggio}</Messaggio>
            <Pulsante testo="Riprova" icona="aggiorna" onPress={ricarica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }
  if (!stato.maggiorenne) {
    return (
      <Schermata {...intestazione} titolo="Il tuo percorso">
        <Messaggio tono="attenzione">Il Percorso è riservato ai maggiorenni.</Messaggio>
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
      titolo="Il tutor della tua settimana"
      sottotitolo="Ti chiede cosa ti piace, guarda il palinsesto vero e compone una settimana a tappe: sala, lezioni, acqua e cardio, nei giorni e negli orari giusti per te."
    >
      <Entra>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.hero}>
          <Icona nome="stella" size={34} colore="#fff" />
          <Text style={stili.heroTitolo}>Percorso Athlon</Text>
          <Text style={stili.heroTesto}>Il tutor tecnico della tua settimana: sala, lezioni e acqua, insieme.</Text>
        </LinearGradient>
      </Entra>

      <PianoOPercorso />

      <Sezione titolo="Cosa ottieni">
        <Carta style={{ gap: spazio.tre }}>
          {[
            ['calendario', 'Una settimana a tappe: giorno, ora e cosa fare, nelle lezioni che ci sono davvero.'],
            ['avanti', 'Ogni lezione si prenota dalla sua tappa, o tutte insieme con «Prenota la settimana».'],
            ['grafico', 'Cosa fa la settimana: lavoro, intensità, recupero e cosa copre il tuo obiettivo, non solo le calorie.'],
          ].map(([icona, testo]) => (
            <View key={testo} style={stili.differenzaRiga}>
              <Icona nome={icona as 'calendario'} size={19} colore={p.accento} />
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{testo}</Text>
            </View>
          ))}
        </Carta>
      </Sezione>

      {vista ? (
        <Messaggio tono="attenzione">In vista cliente il Percorso si guarda e basta: questo socio non ne ha ancora uno.</Messaggio>
      ) : (
        <Pulsante testo="Crea il tuo percorso" icona="stella" onPress={() => router.push('/allenamento/percorso-nuovo')} />
      )}
      <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>
        Il percorso è riservato ai maggiorenni. Lo compone un’intelligenza artificiale e lo confermi tu; i trainer del club lo possono vedere dal pannello.
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

  const effetti = useMemo(() => calcolaEffetti(percorso.tappe, { ...schede, ...(settimana?.schede ?? {}) }, { obiettivo: percorso.obiettivo, corpo: corpo.stato === 'ok' ? corpo.corpo : null }), [percorso, schede, settimana?.schede, corpo])

  const tappe: TappaSettimana[] = settimana?.tappe ?? []
  const prenotabili = useMemo(() => dividiLaSettimana(tappe).adesso.length, [tappe])
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
          <Tag testo={percorso.obiettivo} colore={p.accento} />
          <Tag testo={percorso.livello} colore={p.testoSecondario} />
          <Tag testo={`${effetti.giorni.attivi} ${effetti.giorni.attivi === 1 ? 'giorno' : 'giorni'} a settimana`} colore={p.testoSecondario} />
        </View>
        <PianoOPercorso />
      </View>

      <Sezione titolo="La tua settimana">
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
                etichetta={`${n === 0 ? 'Questa settimana' : 'Settimana prossima'}, ${intervallo(lun, spostaGiorno(lun, 6))}`}
                style={[stili.settimana, { backgroundColor: attivo ? p.testo : p.carta, borderColor: attivo ? p.testo : p.linea }]}
              >
                <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: F.extra, fontSize: 14.5 }}>{n === 0 ? 'Questa settimana' : 'La prossima'}</Text>
                <Text style={{ color: attivo ? p.fondo : p.testoSecondario, fontFamily: F.medio, fontSize: 12.5 }}>{intervallo(lun, spostaGiorno(lun, 6))}</Text>
              </Tocco>
            )
          })}
        </View>

        {errore && !settimana ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo="Riprova" icona="aggiorna" onPress={ricarica} />
          </>
        ) : !settimana ? (
          <SchedeInArrivo />
        ) : (
          <>
            {!settimana.prenotazioni_lette ? (
              <Messaggio tono="attenzione">Non riusciamo a leggere le tue prenotazioni adesso: la settimana si vede, ma non sappiamo cosa hai già prenotato.</Messaggio>
            ) : null}
            {!vista && settimana.prenotazioni_lette ? (
              <Pulsante
                testo={prenotabili ? `Prenota la settimana · ${prenotabili} ${prenotabili === 1 ? 'lezione' : 'lezioni'}` : 'Prenota la settimana'}
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
                        {data === oggi ? <Etichetta testo="Oggi" tono="accento" /> : null}
                      </View>
                    </Entra>
                    {delGiorno.map((t) => (
                      <TappaCarta
                        key={`${t.giorno}-${t.ordine}`}
                        t={t}
                        delGiorno={delGiorno}
                        scheda={t.lezione?.scheda ? (settimana.schede[t.lezione.scheda] ?? schede[t.lezione.scheda] ?? null) : null}
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
                <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{`Riposo: ${riposo.map((g) => NOME_GIORNO[g].toLowerCase()).join(', ')}.`}</Text>
              </Carta>
            ) : null}
          </>
        )}
      </Sezione>

      <PannelloEffetti effetti={effetti} ultime={ultime} corpo={corpo} />

      {vista ? null : (
        <Sezione titolo="Il tuo percorso">
          <View style={{ gap: spazio.due }}>
            <Pulsante testo="Cambia le tappe" icona="modifica" variante="scuro" onPress={modifica} />
            <Pulsante testo="Fallo rifare al tutor" icona="stella" variante="secondario" onPress={() => router.push('/allenamento/percorso-nuovo')} />
            {conferma ? (
              <>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Il percorso sparisce: le lezioni che hai già prenotato restano prenotate, e i tuoi piani di allenamento non cambiano.</Text>
                <View style={stili.azioni}>
                  <Pulsante testo="Sì, toglilo" variante="pericolo" onPress={togli} inCorso={togliendo} />
                  <Pulsante testo="No" variante="secondario" onPress={() => setConferma(false)} disabilitato={togliendo} />
                </View>
              </>
            ) : (
              <Pulsante testo="Togli il percorso" variante="fantasma" onPress={() => setConferma(true)} />
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
