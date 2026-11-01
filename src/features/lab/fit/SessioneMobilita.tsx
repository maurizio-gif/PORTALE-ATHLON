import { router, useIsFocused } from 'expo-router'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { registraAbitudine, salvaAbitudine } from '@/api/dispositivi'
import { sessioneMobilita, type PassoMobilita, type SessioneMobilita as Sessione } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { useDispositivi } from '../dispositivi/useDispositivi'
import { MediaEsercizio } from '../schede/MediaEsercizio'
import { Scelte, SceltePiu } from '../ui/Campi'
import { Icona } from '../ui/Icona'
import { Carta, Etichetta, Messaggio, Pulsante, Scheletro, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette, type ToniTutti } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { CATALOGO } from './catalogoAbitudini'
import { avanti, avvia, ferma, indietro, minutiDaSecondi, MINUTI_SESSIONE, nomeFocus, nuovoCrono, progredisci, restanti, secondiFatti, vociFocus, vociZone, type Crono, type FocusMobilita, type ZonaFastidio } from './mobilita'
import { useAbitudiniScelte } from './useAbitudiniScelte'

// Le sessioni di mobilita' a richiesta (31/10/2026, richiesta di Maurizio): si sceglie su cosa lavorare e quanto tempo si ha (5, 10 o 15 minuti) e la funzione
// dice quali esercizi fare (`sessioneMobilita`: mobilita' e stretching della libreria, un minuto ciascuno, con il loro video). Qui si fanno uno dopo l'altro, con
// un cronometro (`mobilita.ts`, puro) che si ferma se si esce dalla schermata o dall'app. Alla fine i **minuti fatti si sommano da soli** all'abitudine «Mobilita'»
// se la si segue; se no, un tocco per cominciare a seguirla. **I fastidi indicati sono facoltativi e non si conservano** (dati sulla salute): servono solo a togliere
// i movimenti che li caricano. Descrive e propone, non cura: chi ha dolore o un problema di salute chiede al medico o al tecnico.

type Fase = 'scelta' | 'carica' | 'corsa' | 'fine'

export function SchermataMobilita() {
  const p = usePalette()
  const disp = useDispositivi()
  const consenso = !!(disp.stato?.ok && disp.stato.consenso)
  const sc = useAbitudiniScelte(!disp.vista && consenso)
  const inMobilita = sc.config?.scelte.find((s) => s.tipo === 'mobilita') ?? null

  const [fase, setFase] = useState<Fase>('scelta')
  const [focus, setFocus] = useState<FocusMobilita>('tutto')
  const [minuti, setMinuti] = useState<number>(10)
  const [zone, setZone] = useState<ZonaFastidio[]>([])
  const [variante, setVariante] = useState(0)
  const [sessione, setSessione] = useState<Sessione | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [fatti, setFatti] = useState(0)

  async function prepara(v = variante) {
    setFase('carica')
    setErrore(null)
    const r = await sessioneMobilita({ focus, minuti, zone, variante: v })
    if (!r.ok) {
      setErrore(r.errore)
      setFase('scelta')
      return
    }
    if (!r.sessione.esercizi.length) {
      setErrore(t('Non abbiamo trovato esercizi adatti a quello che hai indicato: togli un fastidio o scegli un’altra zona.', 'We couldn’t find exercises that fit what you chose: remove a discomfort or pick another area.'))
      setFase('scelta')
      return
    }
    setSessione(r.sessione)
    setFase('corsa')
  }

  const unAltra = () => {
    const v = variante + 1
    setVariante(v)
    setSessione(null)
    void prepara(v)
  }

  return (
    <Schermata sopratitolo="Athlon Health System" titolo={t('Sessione di mobilità', 'Mobility session')} sottotitolo={fase === 'scelta' ? t('Da 5 a 15 minuti per sciogliere il corpo: scegli su cosa lavorare e segui gli esercizi, uno al minuto.', 'From 5 to 15 minutes to loosen up: choose where to work and follow the exercises, one a minute.') : undefined} indietro="/allenamento" barra={false}>
      {disp.vista ? (
        <Messaggio tono="attenzione">{t('Le sessioni le fa il socio, dalla sua app.', 'Sessions are done by the member, from their own app.')}</Messaggio>
      ) : fase === 'scelta' ? (
        <>
          <Sezione titolo={t('Su cosa vuoi lavorare', 'Where do you want to work')}>
            <Scelte valori={vociFocus()} scelto={focus} onScegli={setFocus} />
          </Sezione>
          <Sezione titolo={t('Quanto tempo hai', 'How much time do you have')}>
            <Scelte valori={MINUTI_SESSIONE.map((m) => ({ valore: m as number, testo: t(`${m} minuti`, `${m} minutes`) }))} scelto={minuti} onScegli={setMinuti} />
            <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('Un esercizio al minuto: 10 minuti sono 10 esercizi, prima di mobilità e alla fine di stretching.', 'One exercise a minute: 10 minutes are 10 exercises, mobility first and stretching at the end.')}</Text>
          </Sezione>
          <Sezione titolo={t('Hai un fastidio? (facoltativo)', 'Any discomfort? (optional)')}>
            <SceltePiu valori={vociZone()} scelti={zone} onCambia={setZone} />
            <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Se ne indichi uno, tolgo i movimenti che lo caricano. Non lo conserviamo: vale solo per questa sessione.', 'If you pick one, I leave out the movements that load it. We don’t keep it: it only applies to this session.')}</Text>
          </Sezione>
          {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
          <Pulsante testo={t('Prepara la sessione', 'Get the session ready')} icona="avanti" onPress={() => void prepara()} />
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>
            {t('Muoviti piano e fermati se senti dolore. Se hai un problema di salute o dubbi, chiedi al tuo medico o al tecnico del club.', 'Move slowly and stop if you feel pain. If you have a health condition or doubts, ask your doctor or the club’s coach.')}
          </Text>
        </>
      ) : fase === 'carica' ? (
        <Scheletro altezza={320} tondo={20} />
      ) : fase === 'corsa' && sessione ? (
        <Corsa
          sessione={sessione}
          onFine={(secondi) => {
            setFatti(secondi)
            setFase('fine')
          }}
          onEsci={() => {
            setSessione(null)
            setFase('scelta')
          }}
        />
      ) : sessione ? (
        <Fine sessione={sessione} secondi={fatti} inMobilita={!!inMobilita} sc={sc} consenso={consenso} onUnaltra={unAltra} onRifai={() => setFase('scelta')} />
      ) : null}
    </Schermata>
  )
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Quello che serve alla `Corsa` di un esercizio: la forma di `PassoMobilita`, con un `tipo` qualunque (il rilascio con il rullo ne ha uno suo). */
export type PassoCorsa = Omit<PassoMobilita, 'tipo'> & { tipo: string }

/**
 * Gli esercizi uno dopo l'altro, col cronometro. La usano la mobilita' e, dal 01/11/2026, il rilascio con il foam roller (`rilascio/SessioneRilascio.tsx`):
 * stesso cronometro, stesse pause. Senza i tre agganci e' quella di prima: `etichetta` cambia la pillola del tipo, `media` prende il posto del video
 * (il rilascio ci mette il segnaposto «Video in arrivo» finche' i video non ci sono), `dettagli` aggiunge una carta dopo le istruzioni.
 */
export function Corsa<T extends PassoCorsa = PassoMobilita>({
  sessione,
  onFine,
  onEsci,
  etichetta,
  media,
  dettagli,
}: {
  sessione: { esercizi: T[] }
  onFine: (secondi: number) => void
  onEsci: () => void
  etichetta?: (e: T) => { testo: string; tono: ToniTutti }
  media?: (e: T) => ReactNode
  dettagli?: (e: T) => ReactNode
}) {
  const p = usePalette()
  const esercizi = sessione.esercizi
  const durate = esercizi.map((e) => e.secondi)
  const [crono, setCrono] = useState<Crono>(() => avvia(nuovoCrono(), Date.now()))
  const [ora, setOra] = useState(() => Date.now())
  const [uscita, setUscita] = useState(false)
  const finito = useRef(false)
  const focalizzata = useIsFocused()

  const passo = Math.min(crono.passo, esercizi.length - 1)
  const e = esercizi[passo]
  const resto = restanti(crono, ora, durate)
  const inPausa = crono.ripresoIl === null && !crono.finita
  const tipoEsercizio = e ? (etichetta ? etichetta(e) : e.tipo === 'mobilita' ? { testo: t('Mobilità', 'Mobility'), tono: 'accento' as ToniTutti } : { testo: 'Stretching', tono: 'neutro' as ToniTutti }) : null

  // Il tempo scorre dall'orologio vero: un timer in ritardo non cambia il conto. Cambiando esercizio, un colpetto.
  useEffect(() => {
    if (crono.finita || crono.ripresoIl === null) return
    const id = setInterval(() => {
      const adesso = Date.now()
      setOra(adesso)
      setCrono((c) => {
        const n = progredisci(c, adesso, durate)
        if (n.passo !== c.passo || n.finita !== c.finita) colpetto(n.finita ? 'ok' : 'leggero')
        return n === c ? c : n
      })
    }, 250)
    return () => clearInterval(id)
    // `durate` e' una funzione pura di `esercizi`, che non cambia durante la sessione.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crono.finita, crono.ripresoIl === null])

  // Finita da sola (o con «avanti» sull'ultimo): si passa al riepilogo, una volta.
  useEffect(() => {
    if (crono.finita && !finito.current) {
      finito.current = true
      onFine(secondiFatti(crono, Date.now(), durate))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crono.finita])

  const pausa = useCallback(() => setCrono((c) => ferma(c, Date.now(), durate)), [durate.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fuori dalla schermata o dall'app il cronometro si ferma: i minuti sono quelli in cui si e' davvero fatto.
  useEffect(() => {
    if (!focalizzata) pausa()
  }, [focalizzata, pausa])
  useEffect(() => {
    const s = AppState.addEventListener('change', (stato) => {
      if (stato !== 'active') pausa()
    })
    return () => s.remove()
  }, [pausa])

  const r = 52
  const giro = 2 * Math.PI * r
  const quota = e ? 1 - resto / e.secondi : 0

  if (!e) return null
  return (
    <>
      <View style={stili.testaCorsa}>
        <Text style={[stili.contatore, { color: p.testoSecondario }]}>{t(`Esercizio ${passo + 1} di ${esercizi.length}`, `Exercise ${passo + 1} of ${esercizi.length}`)}</Text>
        {tipoEsercizio ? <Etichetta testo={tipoEsercizio.testo} tono={tipoEsercizio.tono} /> : null}
      </View>
      <View style={stili.barra} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {esercizi.map((x, i) => (
          <View key={x.id} style={[stili.tacca, { backgroundColor: i < passo ? p.accento : i === passo ? p.accento : p.linea, opacity: i === passo ? 1 : i < passo ? 0.55 : 1 }]} />
        ))}
      </View>

      <View accessible accessibilityLabel={t(`Video: ${e.nome}`, `Video: ${e.nome}`)}>
        {media ? media(e) : <MediaEsercizio key={e.id} immagini={e.immagini} video={e.video} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 16 }} />}
      </View>

      <View style={stili.centro}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[stili.nome, { color: p.testo }]} accessibilityRole="header">{e.nome}</Text>
          {inPausa ? <Etichetta testo={t('In pausa', 'Paused')} tono="attenzione" /> : null}
        </View>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={t(`${resto} secondi`, `${resto} seconds`)} accessibilityLiveRegion="none">
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx={60} cy={60} r={r} stroke={p.linea} strokeWidth={9} fill="none" />
            <Circle cx={60} cy={60} r={r} stroke={p.accento} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${giro} ${giro}`} strokeDashoffset={giro * (1 - Math.max(0, Math.min(1, quota)))} transform="rotate(-90 60 60)" />
          </Svg>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={stili.dentroAnello}>
              <Text style={[stili.secondi, { color: p.testo }]}>{resto}</Text>
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('secondi', 'seconds')}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={stili.comandi}>
        <Tocco onPress={() => setCrono((c) => indietro(c, Date.now(), durate))} etichetta={t('Esercizio precedente', 'Previous exercise')} style={[stili.tondo, { backgroundColor: p.incavo }]}>
          <Icona nome="indietro" size={22} colore={p.testo} />
        </Tocco>
        <View style={{ flex: 1 }}>
          <Pulsante testo={inPausa ? t('Riprendi', 'Resume') : t('Pausa', 'Pause')} icona={inPausa ? 'riproduci' : 'pausa'} variante={inPausa ? 'primario' : 'scuro'} onPress={() => (inPausa ? setCrono((c) => avvia(c, Date.now())) : pausa())} />
        </View>
        <Tocco onPress={() => setCrono((c) => avanti(c, Date.now(), durate))} etichetta={passo + 1 >= esercizi.length ? t('Finisci la sessione', 'Finish the session') : t('Esercizio successivo', 'Next exercise')} style={[stili.tondo, { backgroundColor: p.incavo }]}>
          <Icona nome="avanti" size={22} colore={p.testo} />
        </Tocco>
      </View>

      {e.descrizione || e.istruzioni.length ? (
        <Carta piatta style={{ gap: spazio.due }}>
          {e.descrizione ? <Text style={[stili.testo, { color: p.testoSecondario }]}>{e.descrizione}</Text> : null}
          {e.istruzioni.slice(0, 4).map((x, i) => (
            <View key={i} style={stili.istruzione}>
              <Text style={[stili.numeroIstr, { color: p.accento }]}>{i + 1}</Text>
              <Text style={[stili.testo, { color: p.testo, flex: 1 }]}>{x}</Text>
            </View>
          ))}
        </Carta>
      ) : null}

      {dettagli ? dettagli(e) : null}

      {uscita ? (
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.nome, { color: p.testo }]}>{t('Vuoi fermarti qui?', 'Want to stop here?')}</Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>{t(`Hai fatto ${secondiLetti(secondiFatti(crono, ora, durate))}: lo conto lo stesso.`, `You’ve done ${secondiLetti(secondiFatti(crono, ora, durate))}: I’ll count it anyway.`)}</Text>
          <Pulsante testo={t('Finisci e conta', 'Finish and count it')} onPress={() => {
            const fine = ferma(crono, Date.now(), durate)
            finito.current = true
            onFine(secondiFatti(fine, Date.now(), durate))
          }} />
          <Pulsante testo={t('Esci senza contare', 'Leave without counting')} variante="contorno" onPress={onEsci} />
          <Pulsante testo={t('Continua la sessione', 'Keep going')} variante="fantasma" onPress={() => setUscita(false)} />
        </Carta>
      ) : (
        <Pulsante testo={t('Termina la sessione', 'End the session')} variante="fantasma" onPress={() => { pausa(); setUscita(true) }} />
      )}
    </>
  )
}

/** «3 minuti», «1 minuto e 20 secondi», «40 secondi». */
function secondiLetti(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return t(`${r} secondi`, `${r} seconds`)
  if (r === 0) return t(m === 1 ? '1 minuto' : `${m} minuti`, m === 1 ? '1 minute' : `${m} minutes`)
  return t(`${m} min e ${r} s`, `${m} min ${r} s`)
}

// ---------------------------------------------------------------------------------------------------------------------------------

function Fine({ sessione, secondi, inMobilita, sc, consenso, onUnaltra, onRifai }: { sessione: Sessione; secondi: number; inMobilita: boolean; sc: ReturnType<typeof useAbitudiniScelte>; consenso: boolean; onUnaltra: () => void; onRifai: () => void }) {
  const p = usePalette()
  const minuti = minutiDaSecondi(secondi)
  const [esito, setEsito] = useState<'ok' | 'errore' | 'invio' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const fatto = useRef(false)
  const puoContare = consenso && sc.disponibile && minuti >= 1

  // I minuti si sommano da soli all'abitudine che si segue (una volta sola per sessione); se non si segue, si propone.
  const somma = useCallback(async () => {
    setEsito('invio')
    setErrore(null)
    const r = await registraAbitudine('mobilita', Math.min(minuti, CATALOGO.mobilita.max), { aggiungi: true })
    if (!r.ok) {
      setErrore(r.errore)
      setEsito('errore')
      return
    }
    sc.imposta(r)
    setEsito('ok')
  }, [minuti, sc])

  useEffect(() => {
    if (inMobilita && puoContare && !fatto.current && sc.caricato) {
      fatto.current = true
      void somma()
    }
  }, [inMobilita, puoContare, sc.caricato, somma])

  async function comincia() {
    // Subito, prima di salvare: appena l'abitudine esiste l'effetto qui sopra scatterebbe e conterebbe i minuti una seconda volta.
    fatto.current = true
    setEsito('invio')
    setErrore(null)
    const s = await salvaAbitudine({ tipo: 'mobilita', soglia: CATALOGO.mobilita.predefinita.soglia, giorni: CATALOGO.mobilita.predefinita.giorni, sfida: null })
    if (!s.ok) {
      setErrore(s.errore)
      setEsito('errore')
      return
    }
    sc.imposta(s)
    const r = await registraAbitudine('mobilita', Math.min(minuti, CATALOGO.mobilita.max), { aggiungi: true })
    if (!r.ok) {
      setErrore(r.errore)
      setEsito('errore')
      return
    }
    sc.imposta(r)
    setEsito('ok')
  }

  return (
    <>
      <Carta style={{ gap: spazio.due, alignItems: 'center' }}>
        <View style={[stili.spunta, { backgroundColor: p.accento }]}>
          <Icona nome="spunta" size={26} colore="#fff" />
        </View>
        <Text style={[stili.titoloFine, { color: p.testo }]}>{minuti >= 1 ? t(minuti === 1 ? 'Fatto: 1 minuto' : `Fatto: ${minuti} minuti`, minuti === 1 ? 'Done: 1 minute' : `Done: ${minuti} minutes`) : t('Fatto', 'Done')}</Text>
        <Text style={[stili.testo, { color: p.testoSecondario, textAlign: 'center' }]}>
          {t(`${nomeFocus(sessione.focus)}, ${sessione.esercizi.length} esercizi di mobilità e stretching.`, `${nomeFocus(sessione.focus)}, ${sessione.esercizi.length} mobility and stretching exercises.`)}
        </Text>
      </Carta>

      {minuti >= 1 && puoContare ? (
        esito === 'ok' ? (
          <Messaggio tono="ok">{t(`Ho aggiunto ${minuti === 1 ? '1 minuto' : `${minuti} minuti`} alla tua abitudine Mobilità di oggi.`, `I added ${minuti === 1 ? '1 minute' : `${minuti} minutes`} to today’s Mobility habit.`)}</Messaggio>
        ) : inMobilita ? (
          esito === 'errore' ? (
            <>
              <Messaggio tono="errore">{errore}</Messaggio>
              <Pulsante testo={t('Riprova a contarli', 'Try counting them again')} variante="secondario" onPress={() => void somma()} />
            </>
          ) : (
            <Scheletro altezza={48} tondo={14} />
          )
        ) : (
          <Carta style={{ gap: spazio.tre }}>
            <Text style={[stili.nome, { color: p.testo }]}>{t('Vuoi tenere il conto?', 'Want to keep track?')}</Text>
            <Text style={[stili.testo, { color: p.testoSecondario }]}>{t('Aggiungi l’abitudine Mobilità: questi minuti ci entrano subito e quelli delle prossime sessioni si sommano da soli. Niente punti, solo il tuo ritmo.', 'Add the Mobility habit: these minutes count right away and those of your next sessions add up on their own. No points, just your rhythm.')}</Text>
            {esito === 'errore' && errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
            <Pulsante testo={t('Aggiungi l’abitudine', 'Add the habit')} inCorso={esito === 'invio'} onPress={() => void comincia()} />
          </Carta>
        )
      ) : null}

      <Pulsante testo={t('Un’altra sessione', 'Another session')} variante="secondario" onPress={onUnaltra} />
      <Pulsante testo={t('Cambia scelta', 'Change choices')} variante="contorno" onPress={onRifai} />
      <Pulsante testo={t('Torna ad Athlon Health System', 'Back to Athlon Health System')} variante="fantasma" onPress={() => router.replace('/allenamento')} />
    </>
  )
}

const stili = StyleSheet.create({
  testaCorsa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contatore: { fontFamily: F.semi, fontSize: 13 },
  barra: { flexDirection: 'row', gap: 4 },
  tacca: { flex: 1, height: 4, borderRadius: 2 },
  centro: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  nome: { fontFamily: F.extra, fontSize: 21, lineHeight: 26 },
  dentroAnello: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  secondi: { fontFamily: F.extra, fontSize: 34, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  comandi: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  tondo: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  istruzione: { flexDirection: 'row', gap: spazio.due, alignItems: 'flex-start' },
  numeroIstr: { fontFamily: F.extra, fontSize: 14, width: 16, lineHeight: 20 },
  spunta: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  titoloFine: { fontFamily: F.extra, fontSize: 24 },
})
