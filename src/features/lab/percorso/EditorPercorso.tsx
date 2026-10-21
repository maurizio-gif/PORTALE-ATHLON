import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'

import { leggiCatalogo, salvaPercorso, type Affollamento, type Catalogo, type GiornoSettimana, type PercorsoBozza, type SlotRicorrente, type Tappa } from '@/api/percorso'
import { LARGO } from '@/components/Pagina'
import { t as tr } from '@/lib/lingua'
import { spazio } from '@/theme'

import { prendi } from '../memoria'
import { Carta, Entra, Etichetta, Messaggio, Pulsante, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { Icona } from '../ui/Icona'
import { CHIAVE_ELENCO_PIANI } from '../schede/comune'
import { inMetri } from '../schede/nuoto'
import { ricorda } from '../memoria'
import { leggiBozzaPercorso, scartaBozzaPercorso } from './bozzaPercorso'
import { alternativePerTappa, slotDiTappa, spessoCompleta, tappaDaSlot, type Suggerimento } from './affollamento'
import { CHIAVE_CATALOGO_PERCORSO, ETICHETTA_TIPO, fasciaOraria, GIORNI, GIORNO_BREVE, NOME_GIORNO, rinumera, tappeDelGiorno, titoloTappa } from './comune'
import { controllaTappe, ricalcolaAncorate } from './controllo'
import { PannelloEffetti } from './Effetti'
import { calcolaEffetti } from './effetti'
import { FoglioTappa } from './FoglioTappa'
import { eNuotoLibero, ereditaPiano, riagganciaNuoto } from './nuoto'
import { PianoNuotoCarta } from './PianoNuotoCarta'
import { PianoOPercorso } from './PianoOPercorso'
import { invalidaPercorso, usePercorso } from './usePercorso'
import { useUltime } from './useUltime'

// L'editor del Percorso Athlon (20/10/2026): la settimana a tappe, da rivedere e da cambiare prima di
// confermarla. Ci si arriva dal tutor (la bozza che ha scritto, che non e' ancora di nessuno) o da «Cambia le
// tappe» del percorso salvato. **Niente si salva finche' il socio non conferma**; alla conferma la funzione
// ricontrolla tutto con le stesse regole del tutor, e se una tappa non regge **non la toglie in silenzio**: si
// ferma e dice quale (togliere a un modello una lezione inventata e' una correzione, togliere a una persona una
// lezione che ha scelto e' una sorpresa).
//
// Le stesse regole le applica `controllo.ts` mentre il socio cambia le tappe, cosi' i problemi (due tappe che si
// sovrappongono, la sala chiusa, troppe ore in un giorno) si leggono subito, sulla tappa giusta, e «Conferma» non
// si accende finche' ce ne sono. Gli effetti (`Effetti.tsx`) si ricalcolano a ogni cambio.
//
// La bozza sta in memoria (`bozzaPercorso.ts`): se la pagina si ricarica non c'e' piu', e lo si dice.
//
// **Il piano di nuoto** (20/10/2026): se il socio ha chiesto di nuotare, la bozza porta anche un piano di nuoto
// (`piano_nuoto`), che si conferma con il percorso e che le tappe di Nuoto Libero aprono, una seduta ciascuna. Qui si
// vede (`PianoNuotoCarta`), si puo' togliere, e **spostando o aggiungendo turni le sedute si riagganciano** come le
// riagganciera' la funzione (`nuoto.ts`). Un piano di nuoto senza un turno che lo apra non si conferma: o si aggiunge
// il turno, o si toglie il piano. Il piano non si modifica da qui: dopo la conferma e' un piano del socio.

const intestazione = { sopratitolo: 'Percorso Athlon', indietro: '/allenamento/percorso' as const }

type Foglio = { giorno: GiornoSettimana; tappa: Tappa | null }

export function EditorPercorso() {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const largo = width >= LARGO
  const { da } = useLocalSearchParams<{ da?: string }>()
  const { stato } = usePercorso()
  const { corpo, ultime } = useUltime()

  // La bozza si legge una volta: React in sviluppo monta due volte, e la memoria non si svuota leggendo.
  const iniziale = useRef(leggiBozzaPercorso()).current
  const [bozza, setBozza] = useState<PercorsoBozza | null>(iniziale?.bozza ?? null)
  const [schede, setSchede] = useState(iniziale?.schede ?? {})
  const modo = iniziale?.modo ?? (da === 'salvato' ? 'modifica' : 'tutor')
  const [foglio, setFoglio] = useState<Foglio | null>(null)
  const [nonComprese, setNonComprese] = useState(() => !!iniziale && (iniziale.bozza.preferenze.includi_non_comprese || iniziale.bozza.tappe.some((t) => t.lezione?.compresa === false)))
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [erroreCatalogo, setErroreCatalogo] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [scartando, setScartando] = useState(false)

  // Il catalogo (lezioni che ricorrono, piani, macchine) serve per cambiare una tappa: si legge appena si arriva.
  const haBozza = !!bozza
  useEffect(() => {
    if (!haBozza) return
    let vivo = true
    setCatalogo(null)
    setErroreCatalogo(null)
    prendi(`${CHIAVE_CATALOGO_PERCORSO}:${nonComprese}`, () => leggiCatalogo(nonComprese)).then((r) => {
      if (!vivo) return
      if (r.ok) {
        setCatalogo(r.catalogo)
        // Le schede delle lezioni nuove servono agli effetti (le barre).
        setSchede((s) => ({ ...r.catalogo.schede, ...s }))
      } else setErroreCatalogo(r.errore)
    })
    return () => {
      vivo = false
    }
  }, [haBozza, nonComprese])

  const tappe = bozza?.tappe ?? []
  const pianoNuoto = bozza?.piano_nuoto ?? null
  // Il piano di nuoto si apre da un turno di Nuoto Libero: senza, la funzione non lo salverebbe (422). Lo si dice prima.
  const problemi = useMemo(() => {
    const p = controllaTappe(tappe)
    if (pianoNuoto && !tappe.some(eNuotoLibero)) p.push(tr('Il piano di nuoto si apre da un turno di Nuoto Libero e il percorso non ne ha: aggiungine uno, oppure togli il piano di nuoto.', 'The swim plan opens from a Nuoto Libero slot and the program has none: add one, or remove the swim plan.'))
    return p
  }, [tappe, pianoNuoto])
  const effetti = useMemo(
    () => (bozza ? calcolaEffetti(tappe, schede, { obiettivo: bozza.obiettivo, corpo: corpo.stato === 'ok' ? corpo.corpo : null }) : null),
    [bozza, tappe, schede, corpo],
  )
  const originale = useRef(iniziale?.bozza.tappe ?? []).current
  const modificata =
    JSON.stringify(tappe.map(chiaveTappa)) !== JSON.stringify(originale.map(chiaveTappa)) || (bozza?.titolo ?? '') !== (iniziale?.bozza.titolo ?? '') || !!bozza?.piano_nuoto !== !!iniziale?.bozza.piano_nuoto

  if (!bozza || !effetti) {
    return (
      <Schermata {...intestazione} titolo={tr('Il tuo percorso', 'Your program')}>
        <Messaggio tono="attenzione" titolo={tr('Non c’è niente da rivedere', 'Nothing to review')}>
          {tr('Il percorso che stavi modificando non è più qui (succede se la pagina si ricarica). Puoi ripartire dalla pagina del Percorso.', 'The program you were editing is no longer here (this happens if the page reloads). You can start again from the program page.')}
        </Messaggio>
        <Pulsante testo={tr('Torna al Percorso', 'Back to the program')} onPress={() => router.replace('/allenamento/percorso')} />
      </Schermata>
    )
  }

  const giorniAttivi = GIORNI.filter((g) => tappe.some((t) => t.giorno === g))

  // Le lezioni che nelle ultime settimane hanno spesso chiuso al completo, con le alternative: servono il catalogo
  // (che porta lo storico) e, per non proporre quello che il socio evita, le sue preferenze.
  const evitate = bozza.preferenze.evitate ?? []
  const avvisi = new Map<Tappa, { affollamento: Affollamento; alternative: Suggerimento[] }>()
  if (catalogo) {
    for (const t of tappe) {
      const slot = t.tipo === 'lezione' ? slotDiTappa(t, catalogo.slot) : null
      if (slot?.affollamento && spessoCompleta(slot.affollamento)) avvisi.set(t, { affollamento: slot.affollamento, alternative: alternativePerTappa(t, catalogo.slot, tappe.filter((x) => x !== t), evitate) })
    }
  }

  function metti(nuove: Tappa[]) {
    setErrore(null)
    // Le tappe di Nuoto Libero senza una seduta (nuove, o cambiate in un'altra lezione) la prendono in ordine, come alla nascita.
    setBozza((b) => (b ? { ...b, tappe: b.piano_nuoto ? riagganciaNuoto(nuove, b.piano_nuoto) : nuove } : b))
  }

  /** Toglie il piano di nuoto: il percorso resta, i turni di Nuoto Libero restano senza seduta. */
  function togliPianoNuoto() {
    setErrore(null)
    setBozza((b) => {
      if (!b) return b
      const { piano_nuoto: _tolto, ...resto } = b
      return { ...resto, tappe: b.tappe.map((t) => (t.piano ? { ...t, piano: undefined } : t)) }
    })
    colpetto('scelta')
  }

  /** Aggiunge una tappa, o ne sostituisce una. Le altre non cambiano: si rinumerano e le ancore seguono. */
  function conferma(nuova: Tappa) {
    const vecchia = foglio?.tappa ?? null
    const altre = tappe.filter((t) => t !== vecchia)
    // Una tappa cambiata non e' piu' quella di cui parlava il tutor: la sua frase non vale piu'.
    // Un turno di Nuoto Libero cambiato di giorno o di ora apre ancora la sua seduta.
    const senzaPerche: Tappa = { ...ereditaPiano(vecchia, nuova), perche: vecchia && vecchia.tipo === nuova.tipo && sonoLaStessa(vecchia, nuova) ? vecchia.perche : null }
    metti(rinumera(ricalcolaAncorate([...altre, senzaPerche])))
    colpetto('scelta')
    setFoglio(null)
  }

  /** Mette una lezione del catalogo al posto di una tappa spesso al completo: la tappa resta dov'e' e le ancore (il cardio) la seguono, se il giorno non cambia. */
  function sostituisci(vecchia: Tappa, slot: SlotRicorrente) {
    const stessoGiorno = slot.giorno === vecchia.giorno
    const nuova = tappaDaSlot(slot, stessoGiorno ? vecchia.ordine : 9999)
    // Lo stesso tipo di lezione in un altro orario tiene la frase del tutor; un altro tipo no: quella frase parlava d'altro.
    const conPerche: Tappa = { ...ereditaPiano(vecchia, nuova), perche: sonoLaStessa(vecchia, nuova) ? vecchia.perche : null }
    metti(rinumera(ricalcolaAncorate([...tappe.filter((t) => t !== vecchia), conPerche])))
    colpetto('scelta')
  }

  function togli(t: Tappa) {
    metti(rinumera(tappe.filter((x) => x !== t)))
    colpetto('scelta')
  }

  function ripristina() {
    // Il piano di nuoto torna com'era (anche se l'avevi tolto): si rimette prima, e le tappe tornano con le loro sedute.
    setErrore(null)
    setBozza((b) => (b && iniziale ? { ...b, titolo: iniziale.bozza.titolo, tappe: originale, piano_nuoto: iniziale.bozza.piano_nuoto } : b))
  }

  async function salva() {
    if (!bozza || problemi.length) return
    setErrore(null)
    setSalvando(true)
    // Una lezione non compresa nell'abbonamento e' una scelta del socio: la funzione la ammette solo se il percorso lo dice.
    const preferenze = { ...bozza.preferenze, includi_non_comprese: bozza.preferenze.includi_non_comprese || tappe.some((t) => t.lezione?.compresa === false) }
    const r = await salvaPercorso({ ...bozza, preferenze, titolo: bozza.titolo.trim() || bozza.titolo })
    setSalvando(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    invalidaPercorso()
    // Il piano di nuoto, se c'era, e' appena diventato un piano del socio: l'elenco dei piani lo deve mostrare.
    if (bozza.piano_nuoto) ricorda(CHIAVE_ELENCO_PIANI, undefined)
    scartaBozzaPercorso()
    router.replace('/allenamento/percorso')
  }

  const haGia = !!stato?.percorso
  const titoloSchermata = modo === 'tutor' ? tr('Rivedi il tuo percorso', 'Review your program') : tr('Cambia le tappe', 'Change the steps')
  const sottotitolo =
    modo === 'tutor'
      ? tr('Lo ha composto il tutor: cambialo come vuoi e, quando va bene, confermalo. Finché non lo confermi non è tuo.', 'The coach put it together: change it as you like and, when it’s right, confirm it. Until you confirm it, it’s not yours.')
      : tr('Aggiungi, cambia o togli le tappe. Il percorso cambia solo quando salvi.', 'Add, change or remove steps. The program only changes when you save.')

  return (
    <Schermata {...intestazione} titolo={titoloSchermata} sottotitolo={sottotitolo} barra={false}>
      {iniziale?.avvisi.length ? (
        <Messaggio tono="attenzione" titolo={tr('Il tutor ti segnala', 'The coach points out')}>
          {iniziale.avvisi.join(' ')}
        </Messaggio>
      ) : null}
      {modo === 'tutor' && haGia ? <Messaggio tono="attenzione">{tr('Confermandolo sostituisci il percorso che hai adesso. Le lezioni già prenotate restano prenotate.', 'Confirming it replaces the program you have now. Classes you’ve already booked stay booked.')}</Messaggio> : null}

      <Carta style={{ gap: spazio.tre }}>
        <Text style={[stili.campo, { color: p.testoSecondario }]}>{tr('IL NOME DEL PERCORSO', 'PROGRAM NAME')}</Text>
        <TextInput
          value={bozza.titolo}
          onChangeText={(t) => setBozza((b) => (b ? { ...b, titolo: t.slice(0, 120) } : b))}
          placeholder={tr('Dai un nome al tuo percorso', 'Give your program a name')}
          placeholderTextColor={p.testoTerzo}
          style={[stili.titoloCampo, { color: p.testo, backgroundColor: p.incavo }]}
        />
        {bozza.sintesi ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{bozza.sintesi}</Text> : null}
        <PianoOPercorso />
      </Carta>

      <Sezione titolo={tr('Le tappe della settimana', 'This week’s steps')} conteggio={tappe.length}>
        <View style={largo ? stili.griglia : { gap: spazio.quattro }}>
          {GIORNI.map((g, i) => {
            const delGiorno = tappeDelGiorno(tappe, g)
            return (
              <View key={g} style={largo ? { flexGrow: 1, flexBasis: '46%', gap: spazio.tre } : { gap: spazio.tre }}>
                <Entra indice={i}>
                  <View style={stili.giornoTesta}>
                    <Text style={[stili.giornoNome, { color: delGiorno.length ? p.testo : p.testoSecondario }]}>{NOME_GIORNO[g]}</Text>
                    {delGiorno.length ? null : <Etichetta testo={tr('Riposo', 'Rest')} tono="ok" icona="foglia" />}
                    <View style={{ flex: 1 }} />
                    <Pulsante testo={tr('Aggiungi', 'Add')} icona="piu" variante="secondario" piccolo pieno={false} onPress={() => setFoglio({ giorno: g, tappa: null })} />
                  </View>
                </Entra>
                {delGiorno.map((t) => (
                  <RigaTappa key={`${t.giorno}-${t.ordine}`} t={t} avviso={avvisi.get(t)} onSostituisci={(slot) => sostituisci(t, slot)} onCambia={() => setFoglio({ giorno: g, tappa: t })} onTogli={() => togli(t)} />
                ))}
              </View>
            )
          })}
        </View>
        {giorniAttivi.length === 0 ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{tr('Il percorso non ha tappe: aggiungine una a un giorno.', 'The program has no steps: add one to a day.')}</Text> : null}
      </Sezione>

      {pianoNuoto ? <PianoNuotoCarta piano={pianoNuoto} tappe={tappe} onTogli={togliPianoNuoto} disabilitato={salvando} /> : null}

      <PannelloEffetti effetti={effetti} ultime={ultime} corpo={corpo} titolo={tr('Cosa fa questa settimana', 'What this week does')} />

      <Sezione titolo={tr('Conferma', 'Confirm')}>
        <View style={{ gap: spazio.due }}>
          {problemi.map((x) => (
            <Messaggio key={x} tono="attenzione">
              {x}
            </Messaggio>
          ))}
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante
            testo={modo === 'tutor' ? tr('Conferma e salva il percorso', 'Confirm and save the program') : tr('Salva le modifiche', 'Save changes')}
            icona="spunta"
            onPress={salva}
            inCorso={salvando}
            disabilitato={problemi.length > 0}
          />
          {modificata ? <Pulsante testo={modo === 'tutor' ? tr('Torna alla proposta del tutor', 'Back to the coach’s proposal') : tr('Annulla le modifiche', 'Undo changes')} variante="secondario" onPress={ripristina} disabilitato={salvando} /> : null}
          {scartando ? (
            <View style={stili.azioni}>
              <Pulsante
                testo={tr('Sì, scarta', 'Yes, discard')}
                variante="pericolo"
                onPress={() => {
                  scartaBozzaPercorso()
                  router.replace('/allenamento/percorso')
                }}
              />
              <Pulsante testo={tr('No', 'No')} variante="secondario" onPress={() => setScartando(false)} />
            </View>
          ) : (
            <Pulsante testo={modo === 'tutor' ? tr('Scarta questo percorso', 'Discard this program') : tr('Esci senza salvare', 'Leave without saving')} variante="fantasma" onPress={() => (modificata || modo === 'tutor' ? setScartando(true) : router.replace('/allenamento/percorso'))} disabilitato={salvando} />
          )}
          <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>
            {tr(
              `Confermando, il percorso diventa tuo. I trainer del club lo possono vedere dal pannello, in sola lettura. Non è un piano di allenamento: quelli restano come sono${pianoNuoto ? ', e il piano di nuoto entra fra i tuoi piani' : ''}.`,
              `Once you confirm, the program is yours. The club’s trainers can see it from their dashboard, read-only. It’s not a workout plan: those stay as they are${pianoNuoto ? ', and the swim plan joins your plans' : ''}.`,
            )}
          </Text>
        </View>
      </Sezione>

      {foglio ? (
        <FoglioTappa
          key={`${foglio.giorno}-${foglio.tappa ? `${foglio.tappa.giorno}-${foglio.tappa.ordine}` : 'nuova'}`}
          giorno={foglio.giorno}
          iniziale={foglio.tappa}
          altre={tappe.filter((t) => t !== foglio.tappa)}
          catalogo={catalogo}
          errore={erroreCatalogo}
          nonComprese={nonComprese}
          onNonComprese={setNonComprese}
          onChiudi={() => setFoglio(null)}
          onConferma={conferma}
        />
      ) : null}
    </Schermata>
  )
}

/** Cio' che identifica una tappa, per sapere se il socio ha cambiato qualcosa. */
const chiaveTappa = (t: Tappa) => [t.giorno, t.tipo, t.ora, t.minuti, t.lezione?.class_type_id, t.sala?.scheda_id, t.sala?.giorno_posizione, t.piano?.giorno_posizione, t.cardio?.esercizio_id, t.ancora, t.posizione].join('|')

/** Cambiando solo il giorno o l'ora di una tappa, la frase del tutor (il perche') ha ancora senso: cambiando cosa si fa, no. */
function sonoLaStessa(a: Tappa, b: Tappa): boolean {
  if (a.tipo === 'lezione') return a.lezione?.class_type_id === b.lezione?.class_type_id
  if (a.tipo === 'sala') return a.sala?.scheda_id === b.sala?.scheda_id && a.sala?.giorno_posizione === b.sala?.giorno_posizione
  return a.cardio?.esercizio_id === b.cardio?.esercizio_id
}

function RigaTappa({
  t,
  avviso,
  onSostituisci,
  onCambia,
  onTogli,
}: {
  t: Tappa
  /** Se la lezione ha spesso chiuso al completo: com'e' andata, e cosa si puo' mettere al suo posto. */
  avviso?: { affollamento: Affollamento; alternative: Suggerimento[] }
  onSostituisci: (slot: SlotRicorrente) => void
  onCambia: () => void
  onTogli: () => void
}) {
  const p = usePalette()
  return (
    <Carta piatta style={{ gap: spazio.due, padding: spazio.tre }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.quando, { color: p.testoSecondario }]}>{`${fasciaOraria(t.ora, t.minuti)} · ${ETICHETTA_TIPO[t.tipo]}`}</Text>
          <Text style={[stili.titolo, { color: p.testo }]}>{titoloTappa(t)}</Text>
        </View>
        {t.tipo === 'lezione' && t.lezione?.compresa === false ? <Etichetta testo={tr('Da acquistare', 'To purchase')} tono="attenzione" /> : null}
      </View>
      {t.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{t.perche}</Text> : null}
      {t.tipo === 'sala' && t.sala?.disponibile === false ? <Messaggio tono="attenzione">{tr('Il piano di questa tappa non c’è più: cambiala.', 'This step’s plan is no longer there: change it.')}</Messaggio> : null}
      {t.piano && t.piano.disponibile !== false ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icona nome="goccia" size={15} colore={p.blu} />
          <Text style={[stili.nota, { color: p.testoSecondario, flex: 1 }]}>{`${tr('In vasca', 'In the pool')}: ${t.piano.giorno_nome ?? tr('una seduta del piano di nuoto', 'a swim plan session')}${t.piano.metri ? ` · ${inMetri(t.piano.metri)}` : ''}`}</Text>
        </View>
      ) : null}
      {t.piano?.disponibile === false ? <Messaggio tono="attenzione">{tr('Il piano di nuoto di questa tappa non c’è più: cambiala, e resta senza piano.', 'This step’s swim plan is no longer there: change the step, and it stays without a plan.')}</Messaggio> : null}
      {avviso ? (
        <View style={[stili.avviso, { backgroundColor: p.incavo }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icona nome="clessidra" size={15} colore={p.attenzione} />
            <Text style={[stili.avvisoTitolo, { color: p.testo }]}>{tr('Spesso al completo', 'Often full')}</Text>
          </View>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {tr(
              `Nelle ultime quattro settimane questo orario ha chiuso con tutti i posti presi ${avviso.affollamento.piene} volte su ${avviso.affollamento.osservate}. I posti si prenotano da tre giorni prima: conviene farlo appena si aprono${avviso.alternative.length ? ', oppure scegliere un orario con più posto:' : '.'}`,
              `In the last four weeks this time slot filled up ${avviso.affollamento.piene} times out of ${avviso.affollamento.osservate}. Booking opens three days ahead: it’s best to book as soon as it opens${avviso.alternative.length ? ', or choose a time with more space:' : '.'}`,
            )}
          </Text>
          {avviso.alternative.map(({ slot, tipo }) => (
            <Tocco
              key={slot.id}
              onPress={() => onSostituisci(slot)}
              etichetta={tr(`Metti ${slot.nome} di ${NOME_GIORNO[slot.giorno]} alle ${slot.ora} al posto di ${titoloTappa(t)}`, `Put ${slot.nome} on ${NOME_GIORNO[slot.giorno]} at ${slot.ora} instead of ${titoloTappa(t)}`)}
              style={[stili.suggerimento, { backgroundColor: p.carta, borderColor: p.linea }]}
            >
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 14 }}>{`${GIORNO_BREVE[slot.giorno]} ${slot.ora} · ${slot.nome}${tipo === 'simile' ? tr(' (simile)', ' (similar)') : ''}`}</Text>
                <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12.5 }}>
                  {slot.affollamento
                    ? tr(`Al completo ${slot.affollamento.piene} ${slot.affollamento.piene === 1 ? 'volta' : 'volte'} su ${slot.affollamento.osservate}`, `Full ${slot.affollamento.piene} ${slot.affollamento.piene === 1 ? 'time' : 'times'} out of ${slot.affollamento.osservate}`)
                    : tr('Di questo orario non abbiamo lo storico', 'We have no history for this time slot')}
                </Text>
              </View>
              <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 13.5 }}>{tr('Metti questa', 'Use this one')}</Text>
            </Tocco>
          ))}
        </View>
      ) : null}
      <View style={stili.azioni}>
        <Tocco onPress={onCambia} etichetta={tr(`Cambia ${titoloTappa(t)}`, `Change ${titoloTappa(t)}`)} style={[stili.azione, { backgroundColor: p.incavo }]}>
          <Icona nome="modifica" size={15} colore={p.testo} />
          <Text style={[stili.azioneTesto, { color: p.testo }]}>{tr('Cambia', 'Change')}</Text>
        </Tocco>
        <Tocco onPress={onTogli} etichetta={tr(`Togli ${titoloTappa(t)}`, `Remove ${titoloTappa(t)}`)} style={[stili.azione, { backgroundColor: p.incavo }]}>
          <Icona nome="cestino" size={15} colore={p.errore} />
          <Text style={[stili.azioneTesto, { color: p.errore }]}>{tr('Togli', 'Remove')}</Text>
        </Tocco>
      </View>
    </Carta>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  piccola: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  campo: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.3 },
  titoloCampo: { borderRadius: 14, padding: spazio.tre, fontFamily: F.bold, fontSize: 17, minHeight: 52 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.quattro, alignItems: 'flex-start' },
  giornoTesta: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, flexWrap: 'wrap' },
  giornoNome: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5 },
  quando: { fontFamily: F.semi, fontSize: 12.5 },
  titolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  perche: { fontFamily: F.medio, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  azioni: { flexDirection: 'row', gap: spazio.due },
  avviso: { borderRadius: 14, padding: spazio.tre, gap: spazio.due },
  avvisoTitolo: { fontFamily: F.bold, fontSize: 14 },
  suggerimento: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 9, paddingHorizontal: spazio.tre },
  azione: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  azioneTesto: { fontFamily: F.bold, fontSize: 13.5 },
})
