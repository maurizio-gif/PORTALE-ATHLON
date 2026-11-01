import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Casella } from '@/components/Casella'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Cerchi } from '../cultura/Illustrazione'
import { Corsa } from '../fit/SessioneMobilita'
import { minutiDaSecondi, vociZone, type ZonaFastidio } from '../fit/mobilita'
import { MediaEsercizio } from '../schede/MediaEsercizio'
import { Scelte, SceltePiu } from '../ui/Campi'
import { Icona } from '../ui/Icona'
import { Bollino, Carta, Entra, Etichetta, Messaggio, Pulsante, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, RELAX, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { componiSessione, MINUTI_RILASCIO, nomeFocusRilascio, vociFocusRilascio, type FocusRilascio, type PassoRilascio, type SessioneRilascio } from './esercizi'

// Il rilascio con il foam roller (01/11/2026, richiesta di Maurizio): una sessione a richiesta in Recover, accanto a quella di mobilita'. Si sceglie la zona,
// il tempo e, se serve, un fastidio (che toglie gli esercizi che lo caricano, e non si conserva); gli esercizi stanno in `esercizi.ts` e la sessione si
// compone qui, senza chiamare nessuna funzione. Si fanno con la `Corsa` della mobilita' (stesso cronometro, stesse pause).
// **I video non ci sono ancora**: al loro posto un segnaposto «Video in arrivo», esercizio per esercizio (vedi `esercizi.ts` per come si sostituisce).
// **Non somma i minuti a nessuna abitudine**: l'abitudine «Mobilita'» e' del server (catalogo di APP-ATHLON) e il rilascio e' un'altra cosa; se un giorno
// il club vuole contarlo si aggiunge li'. Descrive e propone, non cura: chi ha dolore o un problema di salute chiede al medico o al fisioterapista.

type Fase = 'scelta' | 'corsa' | 'fine'

const CORNICE = { width: '100%' as const, aspectRatio: 16 / 9, borderRadius: 16 }

export function SchermataRilascio() {
  const p = usePalette()
  const vista = !!vistaCorrente()
  const [fase, setFase] = useState<Fase>('scelta')
  const [focus, setFocus] = useState<FocusRilascio>('tutto')
  const [minuti, setMinuti] = useState<number>(10)
  const [zone, setZone] = useState<ZonaFastidio[]>([])
  const [letto, setLetto] = useState(false)
  const [variante, setVariante] = useState(0)
  const [sessione, setSessione] = useState<SessioneRilascio | null>(null)
  const [fatti, setFatti] = useState(0)

  // Quello che la persona sta per fare: si ricalcola a ogni scelta, ma la sessione che parte e' quella fissata al tocco di «Comincia».
  const anteprima = useMemo(() => componiSessione({ focus, minuti, zone, variante }), [focus, minuti, zone, variante])

  const comincia = (v = variante) => {
    const s = componiSessione({ focus, minuti, zone, variante: v })
    if (!s.esercizi.length) return
    setSessione(s)
    setFase('corsa')
  }

  const unAltra = () => {
    const v = variante + 1
    setVariante(v)
    comincia(v)
  }

  return (
    <Schermata
      sopratitolo="Athlon Health System"
      titolo="Foam roller"
      sottotitolo={fase === 'scelta' ? t('Da 5 a 15 minuti di rilascio sul rullo: scegli la zona e segui gli esercizi, dal basso verso l’alto.', 'From 5 to 15 minutes of foam rolling: choose the area and follow the exercises, from the bottom up.') : undefined}
      indietro="/allenamento?area=relax"
      barra={false}
    >
      {vista ? (
        <Messaggio tono="attenzione">{t('Le sessioni le fa il socio, dalla sua app.', 'Sessions are done by the member, from their own app.')}</Messaggio>
      ) : fase === 'scelta' ? (
        <>
          <Entra indice={0}>
            <Carta style={{ gap: spazio.due + 2 }}>
              <View style={stili.riga}>
                <Bollino icona="rullo" tono="blu" size={46} />
                <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>{t('Cos’è il rilascio con il rullo', 'What foam rolling is')}</Text>
              </View>
              <Text style={[stili.testo, { color: p.testoSecondario }]}>
                {t(
                  'Il foam roller è un rullo su cui appoggi il peso del corpo, per un automassaggio dei muscoli. Può darti la sensazione di muscoli più sciolti e aiutarti a muoverti meglio subito dopo: lo si usa prima o dopo l’allenamento, o nei giorni di scarico. Non cura contratture né dolori.',
                  'A foam roller is a roller you rest your body weight on, for a self-massage of your muscles. It can make your muscles feel looser and help you move better right afterwards: it’s used before or after training, or on rest days. It doesn’t treat knots or pain.',
                )}
              </Text>
            </Carta>
          </Entra>

          <Sezione titolo={t('Su cosa vuoi lavorare', 'Where do you want to work')}>
            <Scelte valori={vociFocusRilascio()} scelto={focus} onScegli={setFocus} />
          </Sezione>
          <Sezione titolo={t('Quanto tempo hai', 'How much time do you have')}>
            <Scelte valori={MINUTI_RILASCIO.map((m) => ({ valore: m as number, testo: t(`${m} minuti`, `${m} minutes`) }))} scelto={minuti} onScegli={setMinuti} />
            <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('Circa un minuto per esercizio. Se la zona ha pochi esercizi, ciascuno dura un po’ di più.', 'About a minute per exercise. If the area has few exercises, each one lasts a little longer.')}</Text>
          </Sezione>
          <Sezione titolo={t('Hai un fastidio? (facoltativo)', 'Any discomfort? (optional)')}>
            <SceltePiu valori={vociZone()} scelti={zone} onCambia={setZone} />
            <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Se ne indichi uno, tolgo gli esercizi che lo caricano. Non lo conserviamo: vale solo per questa sessione.', 'If you pick one, I leave out the exercises that load it. We don’t keep it: it only applies to this session.')}</Text>
          </Sezione>

          <Sezione titolo={t('Cosa farai', 'What you’ll do')}>
            {anteprima.esercizi.length ? (
              <Carta style={{ gap: spazio.tre }}>
                {anteprima.esercizi.map((e, i) => (
                  <View key={e.id} style={stili.riga}>
                    <View style={[stili.numero, { backgroundColor: p.incavo }]}>
                      <Text style={[stili.testoNumero, { color: p.testo }]}>{i + 1}</Text>
                    </View>
                    <Text style={[stili.nomeRiga, { color: p.testo, flex: 1 }]}>{e.nome}</Text>
                    <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t(`${e.secondi} s`, `${e.secondi} s`)}</Text>
                  </View>
                ))}
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                  {t(`${anteprima.esercizi.length} esercizi, circa ${anteprima.minuti} minuti. Dove c’è un lato destro e uno sinistro, metà tempo per lato.`, `${anteprima.esercizi.length} exercises, about ${anteprima.minuti} minutes. Where there’s a left and a right side, half the time on each.`)}
                </Text>
              </Carta>
            ) : (
              <Messaggio tono="attenzione">{t('Non abbiamo trovato esercizi adatti a quello che hai indicato: togli un fastidio o scegli un’altra zona.', 'We couldn’t find exercises that fit what you chose: remove a discomfort or pick another area.')}</Messaggio>
            )}
          </Sezione>

          <Sezione titolo={t('Prima di cominciare', 'Before you start')}>
            <Carta style={{ gap: spazio.tre }}>
              {AVVERTENZE().map((a) => (
                <View key={a.id} style={stili.avvertenza}>
                  <Icona nome="attenzione" size={16} colore={p.attenzione} style={{ marginTop: 3 }} />
                  <Text style={[stili.testo, { color: p.testoSecondario, flex: 1 }]}>{a.testo}</Text>
                </View>
              ))}
              <Casella spuntata={letto} onCambia={() => setLetto((x) => !x)} riquadro etichetta={t('Ho letto le avvertenze', 'I have read the warnings')}>
                <Text style={[stili.testo, { color: p.testo }]}>{t('Ho letto le avvertenze', 'I have read the warnings')}</Text>
              </Casella>
            </Carta>
          </Sezione>

          <Pulsante testo={t('Comincia', 'Start')} icona="avanti" disabilitato={!letto || !anteprima.esercizi.length} onPress={() => comincia()} />
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>
            {t('Questi sono consigli di base e non sostituiscono il parere di un medico o di un fisioterapista.', 'These are basic tips and do not replace the advice of a doctor or a physiotherapist.')}
          </Text>
        </>
      ) : fase === 'corsa' && sessione ? (
        <Corsa
          sessione={sessione}
          etichetta={() => ({ testo: t('Rilascio', 'Release'), tono: 'blu' })}
          media={(e) => <SegnapostoVideo key={e.id} e={e} />}
          dettagli={(e) => <DettagliPasso e={e} />}
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
        <Fine sessione={sessione} secondi={fatti} onUnaltra={unAltra} onRifai={() => setFase('scelta')} />
      ) : null}
    </Schermata>
  )
}

const AVVERTENZE = () => [
  { id: 'dolore', testo: t('Un fastidio sopportabile va bene, un dolore acuto no: se fa male davvero alleggerisci, scaricando peso su mani e piedi, o salta l’esercizio.', 'A bearable discomfort is fine, sharp pain is not: if it really hurts, ease off by putting weight on your hands and feet, or skip the exercise.') },
  { id: 'zone', testo: t('Mai sulle articolazioni e sulle ossa, sulla zona lombare e sul collo; mai su una zona infortunata, gonfia o arrossata.', 'Never on joints and bones, on the lower back or the neck; never on an injured, swollen or red area.') },
  { id: 'modo', testo: t('Rotola piano, senza rimbalzi, e respira.', 'Roll slowly, without bouncing, and breathe.') },
  { id: 'medico', testo: t('Se hai trombosi o varici importanti, prendi anticoagulanti, hai osteoporosi, sei in gravidanza o hai una condizione medica, chiedi prima al medico.', 'If you have thrombosis or significant varicose veins, take blood thinners, have osteoporosis, are pregnant or have a medical condition, ask your doctor first.') },
]

// ---------------------------------------------------------------------------------------------------------------------------------

/** Il posto del video: il video vero quando c'e' (`video` o `immagini` dell'esercizio), se no un segnaposto «Video in arrivo». */
function SegnapostoVideo({ e }: { e: PassoRilascio }) {
  if (e.video || e.immagini.length) return <MediaEsercizio immagini={e.immagini} video={e.video} style={CORNICE} />
  return (
    <LinearGradient colors={RELAX} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[CORNICE, stili.segnaposto]} accessibilityLabel={t(`Video in arrivo: ${e.nome}`, `Video coming soon: ${e.nome}`)}>
      <Cerchi />
      <View style={stili.pillolaSegnaposto}>
        <Text style={stili.testoPillola}>{t('ANTEPRIMA', 'PREVIEW')}</Text>
      </View>
      <View style={stili.tondoSegnaposto}>
        <Icona nome="riproduci" size={30} colore="#fff" />
      </View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={stili.titoloSegnaposto}>{t('Video in arrivo', 'Video coming soon')}</Text>
        <Text style={stili.testoSegnaposto}>{t('Intanto segui i passaggi qui sotto', 'In the meantime follow the steps below')}</Text>
      </View>
    </LinearGradient>
  )
}

/** Sotto le istruzioni: se si cambia lato a meta' tempo, e la cautela di quell'esercizio. */
function DettagliPasso({ e }: { e: PassoRilascio }) {
  if (!e.perLato && !e.attenzione) return null
  const meta = Math.round(e.secondi / 2)
  return (
    <View style={{ gap: spazio.due + 2 }}>
      {e.perLato ? <Etichetta testo={t(`${meta} secondi per lato: a metà tempo cambia lato`, `${meta} seconds per side: switch sides halfway`)} tono="blu" icona="rinnovo" grande /> : null}
      {e.attenzione ? <Messaggio tono="attenzione" icona="attenzione">{e.attenzione}</Messaggio> : null}
    </View>
  )
}

// ---------------------------------------------------------------------------------------------------------------------------------

function Fine({ sessione, secondi, onUnaltra, onRifai }: { sessione: SessioneRilascio; secondi: number; onUnaltra: () => void; onRifai: () => void }) {
  const p = usePalette()
  const minuti = minutiDaSecondi(secondi)
  return (
    <>
      <Carta style={{ gap: spazio.due, alignItems: 'center' }}>
        <View style={[stili.spunta, { backgroundColor: p.accento }]}>
          <Icona nome="spunta" size={26} colore="#fff" />
        </View>
        <Text style={[stili.titoloFine, { color: p.testo }]}>{minuti >= 1 ? t(minuti === 1 ? 'Fatto: 1 minuto' : `Fatto: ${minuti} minuti`, minuti === 1 ? 'Done: 1 minute' : `Done: ${minuti} minutes`) : t('Fatto', 'Done')}</Text>
        <Text style={[stili.testo, { color: p.testoSecondario, textAlign: 'center' }]}>
          {t(`${nomeFocusRilascio(sessione.focus)}, ${sessione.esercizi.length} esercizi di rilascio con il rullo.`, `${nomeFocusRilascio(sessione.focus)}, ${sessione.esercizi.length} foam rolling exercises.`)}
        </Text>
      </Carta>

      <Carta piatta style={{ gap: spazio.due }}>
        <Text style={[stili.titoletto, { color: p.testo }]}>{t('Dopo il rullo', 'After rolling')}</Text>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>
          {t(
            'È normale sentire i muscoli un po’ sensibili. Bevi un po’ d’acqua e, se vuoi, chiudi con qualche minuto di mobilità. Se il giorno dopo senti un dolore forte o un livido, fermati e chiedi a un medico o a un fisioterapista.',
            'It’s normal for your muscles to feel a little tender. Drink some water and, if you like, finish with a few minutes of mobility. If the next day you feel strong pain or a bruise, stop and ask a doctor or a physiotherapist.',
          )}
        </Text>
      </Carta>

      <Pulsante testo={t('Ora un po’ di mobilità', 'Now a little mobility')} icona="mobilita" onPress={() => router.push('/allenamento/mobilita')} />
      <Pulsante testo={t('Un’altra sessione', 'Another session')} variante="secondario" onPress={onUnaltra} />
      <Pulsante testo={t('Cambia scelta', 'Change choices')} variante="contorno" onPress={onRifai} />
      <Pulsante testo={t('Torna a Recover', 'Back to Recover')} variante="fantasma" onPress={() => router.replace('/allenamento?area=relax')} />
    </>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  titoletto: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  nomeRiga: { fontFamily: F.bold, fontSize: 15 },
  numero: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  testoNumero: { fontFamily: F.extra, fontSize: 14 },
  avvertenza: { flexDirection: 'row', gap: spazio.due + 2 },
  segnaposto: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: spazio.tre - 2 },
  pillolaSegnaposto: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  testoPillola: { color: '#fff', fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.4 },
  tondoSegnaposto: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' },
  titoloSegnaposto: { color: '#fff', fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  testoSegnaposto: { color: 'rgba(255,255,255,0.88)', fontFamily: F.medio, fontSize: 13 },
  spunta: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  titoloFine: { fontFamily: F.extra, fontSize: 24 },
})
