import { LinearGradient } from 'expo-linear-gradient'
import { router, useIsFocused } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { avvia, ferma, minutiDaSecondi, nuovoCrono, progredisci, restanti, secondiFatti, type Crono } from '../fit/mobilita'
import { Scelte } from '../ui/Campi'
import { Icona } from '../ui/Icona'
import { Bollino, Carta, Entra, Pulsante, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, RELAX, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { cicloSecondi, parolaFase, passiScansione, passoScansione, statoRespiro, tecnicaPer, tecniche, type IdTecnica, type Tecnica } from './tecniche'

// Il respiro guidato (01/11/2026, richiesta di Maurizio: «meditazione o mindfulness o qualcosa del genere» in Recover): una pausa di 1–5 minuti. Si sceglie la
// pausa (respirazione lenta, a scatola, scansione del corpo) e il tempo, e si segue un cerchio che si allarga mentre si inspira e si restringe mentre si espira.
// **Solo animazione, niente audio; non si registra niente** (nessun server, nessun punteggio); non e' una terapia. Il cronometro e' quello della mobilita'
// (`fit/mobilita.ts`, puro: regge pause e l'app che va in secondo piano), e il punto del respiro lo da' `tecniche.ts` (puro) dal tempo vero trascorso.
// Con «riduci movimento» attivo il cerchio non si muove: restano le parole e il conto. Descrive e propone, non cura.

type Fase = 'scelta' | 'corsa' | 'fine'

export function SchermataRespiro() {
  const p = usePalette()
  const vista = !!vistaCorrente()
  const [fase, setFase] = useState<Fase>('scelta')
  const [id, setId] = useState<IdTecnica>('lenta')
  const [minuti, setMinuti] = useState<number>(3)
  const [fatti, setFatti] = useState(0)
  const [giro, setGiro] = useState(0)
  const tecnica = tecnicaPer(id)

  const scegli = (nuova: IdTecnica) => {
    setId(nuova)
    const durate = tecnicaPer(nuova).durate
    if (!durate.includes(minuti)) setMinuti(durate.includes(3) ? 3 : durate[0])
  }

  return (
    <Schermata
      sopratitolo="Athlon Health System"
      titolo={t('Respiro', 'Breathe')}
      sottotitolo={fase === 'scelta' ? t('Una pausa guidata da 1 a 5 minuti: segui il cerchio e lascia andare il resto.', 'A guided pause of 1 to 5 minutes: follow the circle and let the rest go.') : undefined}
      indietro="/allenamento?area=relax"
      barra={false}
    >
      {vista ? (
        <Carta>
          <Text style={[stili.testo, { color: p.testo }]}>{t('Le pause le fa il socio, dalla sua app.', 'Pauses are done by the member, from their own app.')}</Text>
        </Carta>
      ) : fase === 'scelta' ? (
        <>
          <Sezione titolo={t('Che pausa vuoi', 'Which pause do you want')}>
            <View style={{ gap: spazio.due + 2 }}>
              {tecniche().map((x) => {
                const sel = x.id === id
                return (
                  <Tocco key={x.id} onPress={() => scegli(x.id)} vibra="scelta" ruolo="radio" etichetta={x.nome} stato={{ checked: sel }} scala={0.985}>
                    <View style={[stili.opzione, { backgroundColor: p.carta, borderColor: sel ? p.accento : p.linea, borderWidth: sel ? 2 : StyleSheet.hairlineWidth }]}>
                      <Bollino icona={x.id === 'scansione' ? 'persona' : 'respiro'} tono={sel ? 'accento' : 'neutro'} size={44} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[stili.nome, { color: p.testo }]}>{x.nome}</Text>
                        <Text style={[stili.piccola, { color: p.testoSecondario }]}>{x.descrizione}</Text>
                      </View>
                      {sel ? <Icona nome="ok" size={22} colore={p.accento} /> : null}
                    </View>
                  </Tocco>
                )
              })}
            </View>
          </Sezione>
          <Sezione titolo={t('Quanto tempo hai', 'How much time do you have')}>
            <Scelte valori={tecnica.durate.map((m) => ({ valore: m as number, testo: t(`${m} ${m === 1 ? 'minuto' : 'minuti'}`, `${m} ${m === 1 ? 'minute' : 'minutes'}`) }))} scelto={minuti} onScegli={setMinuti} />
          </Sezione>
          <Carta piatta style={{ gap: spazio.due }}>
            <View style={stili.riga}>
              <Icona nome="info" size={16} colore={p.testoSecondario} />
              <Text style={[stili.nome, { color: p.testo, fontSize: 15 }]}>{t('Prima di cominciare', 'Before you start')}</Text>
            </View>
            <Text style={[stili.piccola, { color: p.testoSecondario, fontSize: 13.5, lineHeight: 20 }]}>
              {t('Respira in modo naturale, mai forzato. Se ti gira la testa o senti formicolio, torna a respirare normalmente e fermati.', 'Breathe naturally, never forced. If you feel dizzy or tingly, go back to normal breathing and stop.')}
              {tecnica.trattieneIlFiato ? t(' Le pause a fiato fermo non fanno per chi è in gravidanza o ha problemi respiratori o di cuore: in quel caso scegli la respirazione lenta.', ' Pauses with held breath aren’t for anyone who is pregnant or has breathing or heart problems: in that case choose slow breathing.') : ''}
            </Text>
          </Carta>
          <Pulsante testo={t('Comincia', 'Start')} icona="avanti" onPress={() => setFase('corsa')} />
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>
            {t('È una pausa per rallentare, non una terapia: questi sono consigli di base e non sostituiscono il parere di un medico o di un professionista.', 'It’s a pause to slow down, not a therapy: these are basic tips and don’t replace the advice of a doctor or a professional.')}
          </Text>
        </>
      ) : fase === 'corsa' ? (
        <Respira
          key={giro}
          tecnica={tecnica}
          minuti={minuti}
          onFine={(secondi) => {
            setFatti(secondi)
            setFase('fine')
          }}
        />
      ) : (
        <Fine tecnica={tecnica} secondi={fatti} onUnaltra={() => { setGiro((g) => g + 1); setFase('corsa') }} onRifai={() => setFase('scelta')} />
      )}
    </Schermata>
  )
}

// ---------------------------------------------------------------------------------------------------------------------------------

const LATO = 260

function Respira({ tecnica, minuti, onFine }: { tecnica: Tecnica; minuti: number; onFine: (secondi: number) => void }) {
  const p = usePalette()
  const meno = useReducedMotion()
  const durate = [minuti * 60]
  const totaleMs = minuti * 60 * 1000
  const [crono, setCrono] = useState<Crono>(() => avvia(nuovoCrono(), Date.now()))
  const [ora, setOra] = useState(() => Date.now())
  const finito = useRef(false)
  const focalizzata = useIsFocused()
  const inPausa = crono.ripresoIl === null && !crono.finita
  const passi = useRef(passiScansione()).current

  // Il tempo scorre dall'orologio vero: un timer in ritardo non cambia il conto. Piccoli passi (80 ms) per un cerchio che non scatta.
  useEffect(() => {
    if (crono.finita || crono.ripresoIl === null) return
    const id = setInterval(() => {
      const adesso = Date.now()
      setOra(adesso)
      setCrono((c) => {
        const n = progredisci(c, adesso, durate)
        if (n.finita && !c.finita) colpetto('ok')
        return n === c ? c : n
      })
    }, 80)
    return () => clearInterval(id)
    // `durate` dipende solo da `minuti`, che non cambia durante la pausa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crono.finita, crono.ripresoIl === null])

  useEffect(() => {
    if (crono.finita && !finito.current) {
      finito.current = true
      onFine(secondiFatti(crono, Date.now(), durate))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crono.finita])

  const pausa = useCallback(() => setCrono((c) => ferma(c, Date.now(), durate)), [minuti]) // eslint-disable-line react-hooks/exhaustive-deps
  // Fuori dalla schermata o dall'app si ferma: i minuti sono quelli in cui si e' davvero respirato.
  useEffect(() => {
    if (!focalizzata) pausa()
  }, [focalizzata, pausa])
  useEffect(() => {
    const s = AppState.addEventListener('change', (stato) => {
      if (stato !== 'active') pausa()
    })
    return () => s.remove()
  }, [pausa])

  const trascorsoMs = Math.min(totaleMs, crono.accTotale + (crono.ripresoIl === null ? 0 : ora - crono.ripresoIl))
  const st = statoRespiro(tecnica.fasi, trascorsoMs)
  const scala = meno ? 0.8 : 0.5 + 0.5 * st.pienezza
  const resto = restanti(crono, ora, durate)
  const mm = `${Math.floor(resto / 60)}:${String(resto % 60).padStart(2, '0')}`
  const frase = tecnica.id === 'scansione' ? passoScansione(passi, trascorsoMs, totaleMs) : null
  // Il conto per fase non serve dove una fase dura piu' di un ciclo breve: qui sempre da 1 a 6.
  const conto = cicloSecondi(tecnica.fasi) > 0 ? st.restano : 0

  return (
    <>
      <View style={stili.campo} accessible accessibilityLabel={`${parolaFase(st.fase)}, ${conto}`} accessibilityLiveRegion="polite">
        <View style={[stili.anello, { borderColor: p.linea }]} />
        <View style={[stili.disco, { transform: [{ scale: scala }] }]}>
          <LinearGradient colors={RELAX} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </View>
        <View pointerEvents="none" style={stili.centro}>
          <Text style={stili.parola}>{inPausa ? t('In pausa', 'Paused') : parolaFase(st.fase)}</Text>
          {inPausa ? null : <Text style={stili.conto}>{conto}</Text>}
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={[stili.tempo, { color: p.testo }]}>{mm}</Text>
        <Text style={[stili.piccola, { color: p.testoSecondario }]}>{tecnica.nome}</Text>
      </View>

      {frase ? (
        <Animated.View key={frase.indice} entering={FadeIn.duration(600)} style={[stili.frase, { backgroundColor: p.incavo }]}>
          <Text style={[stili.testoFrase, { color: p.testo }]}>{frase.testo}</Text>
        </Animated.View>
      ) : null}

      <View style={stili.comandi}>
        <View style={{ flex: 1 }}>
          <Pulsante testo={inPausa ? t('Riprendi', 'Resume') : t('Pausa', 'Pause')} icona={inPausa ? 'riproduci' : 'pausa'} variante={inPausa ? 'primario' : 'scuro'} onPress={() => (inPausa ? setCrono((c) => avvia(c, Date.now())) : pausa())} />
        </View>
      </View>
      <Pulsante
        testo={t('Termina', 'End')}
        variante="fantasma"
        onPress={() => {
          const chiuso = ferma(crono, Date.now(), durate)
          finito.current = true
          onFine(secondiFatti(chiuso, Date.now(), durate))
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------------------------------------------------------------

function Fine({ tecnica, secondi, onUnaltra, onRifai }: { tecnica: Tecnica; secondi: number; onUnaltra: () => void; onRifai: () => void }) {
  const p = usePalette()
  const minuti = minutiDaSecondi(secondi)
  const durata = minuti >= 1 ? t(minuti === 1 ? '1 minuto' : `${minuti} minuti`, minuti === 1 ? '1 minute' : `${minuti} minutes`) : t(`${Math.max(1, secondi)} secondi`, `${Math.max(1, secondi)} seconds`)
  return (
    <>
      <Entra indice={0}>
        <Carta style={{ gap: spazio.due, alignItems: 'center' }}>
          <View style={[stili.spunta, { backgroundColor: p.accento }]}>
            <Icona nome="spunta" size={26} colore="#fff" />
          </View>
          <Text style={[stili.titoloFine, { color: p.testo }]}>{t('Pausa fatta', 'Pause done')}</Text>
          <Text style={[stili.testo, { color: p.testoSecondario, textAlign: 'center' }]}>{t(`${tecnica.nome}, ${durata}.`, `${tecnica.nome}, ${durata}.`)}</Text>
        </Carta>
      </Entra>
      <Pulsante testo={t('Un’altra pausa', 'Another pause')} variante="secondario" onPress={onUnaltra} />
      <Pulsante testo={t('Cambia scelta', 'Change choices')} variante="contorno" onPress={onRifai} />
      <Pulsante testo={t('Torna a Recover', 'Back to Recover')} variante="fantasma" onPress={() => router.replace('/allenamento?area=relax')} />
    </>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  opzione: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre - 2, padding: spazio.tre - 2, borderRadius: 22 },
  nome: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  campo: { width: LATO, height: LATO, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: spazio.tre },
  anello: { position: 'absolute', width: LATO, height: LATO, borderRadius: LATO / 2, borderWidth: 2 },
  disco: { position: 'absolute', width: LATO - 20, height: LATO - 20, borderRadius: (LATO - 20) / 2, overflow: 'hidden' },
  centro: { alignItems: 'center', gap: 2 },
  parola: { color: '#fff', fontFamily: F.extra, fontSize: 22, letterSpacing: -0.4 },
  conto: { color: '#fff', fontFamily: F.extra, fontSize: 44, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  tempo: { fontFamily: F.extra, fontSize: 32, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  frase: { borderRadius: 20, padding: spazio.tre, minHeight: 84, justifyContent: 'center' },
  testoFrase: { fontFamily: F.semi, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  comandi: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  spunta: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  titoloFine: { fontFamily: F.extra, fontSize: 24 },
})
