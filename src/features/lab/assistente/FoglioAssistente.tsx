import { router } from 'expo-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { pulsanteToccato, type AzioneAssistente } from '@/api/assistente'
import { t } from '@/lib/lingua'
import { quantoAlzare } from '@/lib/alzaPerTastiera'
import { useAltezzaTastiera } from '@/lib/tastiera'
import { spazio } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Richiamo } from '../profilo/Richiamo'
import { Messaggio } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { hrefAssistente } from './destinazioni'
import { chiamataDaAzione } from './chiamataDaChat'
import { chiarimentoDaAzione } from './chiarimentoDaChat'
import { ChiamataDaChat } from './ChiamataDaChat'
import { PagaDaChat } from './PagaDaChat'
import { pagaDaAzione } from './pagaDaChat'
import { PrenotaDaChat } from './PrenotaDaChat'
import { prenotaDaAzione } from './prenotaDaChat'
import { ScriviAlTeam } from './ScriviAlTeam'
import { teamDaAzione } from './teamDaChat'
import { BenvenutoJunior } from './BenvenutoJunior'
import { useProfilo, type ProfiloSocio } from '../clublife/moduli/profilo'
import { leggiTemaJunior, type Battuta } from './store'
import { CARATTERI_MAX, mandaDomanda, ricominciaChat, useAssistente, votaRisposta } from './useAssistente'
import { useDettatura } from './useDettatura'

// Il foglio dell'assistente (29/10/2026): la chat. Sale dal pulsante «Assistente virtuale» in alto a destra (`PulsanteAssistente`, sempre visibile; fino al 30/10/2026 era la carta «Cerchi qualcosa?» in Home). La persona scrive, la risposta arriva a pezzi
// e, dove serve, porta uno o due pulsanti che la portano nel punto giusto dell'app: **l'assistente non annulla e non paga**, dice
// dove si fa e cosa toccare. **Una prenotazione la puo' proporre** (30/10/2026, `PrenotaDaChat`): una carta con la lezione letta dal calendario e gli stessi
// pulsanti del Calendario, e la prenotazione parte solo quando la persona tocca «Prenota». Sotto ogni risposta un voto («Utile» / «Non utile»), che il club legge insieme alle domande.
//
// **Dice sempre due cose**: che e' un assistente automatico che puo' sbagliare, e che le domande e le risposte vengono lette dal club per
// migliorarlo (si conservano e le vede chi apre la tua scheda in segreteria). L'invito a non scrivere dati sulla salute sta nella stessa riga:
// non si possono impedire, ma si puo' dire.

// Il campo si allarga con il testo, fino a quest'altezza: oltre, scorre. Su telefono lo fa da solo; sul web un campo su piu' righe
// resta alto quanto la sua prima riga, quindi l'altezza si ricalcola a ogni cambio (`adattaAltezza`).
const ALTEZZA_MAX = 110

type ElementoCampo = { style: { height: string }; scrollHeight: number }
function adattaAltezza(el: unknown) {
  if (Platform.OS !== 'web') return
  const campo = el as ElementoCampo | null
  if (!campo?.style) return
  // Prima si lascia che torni alta una riga, o togliendo testo non si accorcerebbe mai.
  campo.style.height = 'auto'
  campo.style.height = `${Math.min(campo.scrollHeight, ALTEZZA_MAX)}px`
}

// I suggerimenti all'apertura. Dal 30/10/2026 erano cinque: tre cose che l'assistente sa fare con un tocco e due domande d'esempio.
// **Dal 05/11/2026 sono tre in tutto** (richiesta di Maurizio): una riga di cose da toccare si legge; cinque sono una lista da scorrere.
// E sono **mescolati secondo chi apre la chat**, invece di essere gli stessi per tutti: uno sulle attivita' degli adulti, uno sul
// figlio quando nel nucleo c'e' un minorenne, uno sull'account o sull'iscrizione. Chi e' iscritto e chi ha un minorenne lo dice
// `useProfilo`, che legge l'area che la Home ha gia' caricato (nessuna chiamata in piu'). Finche' non si sa, restano i primi tre di
// prima: sono quelli che l'assistente sa fare con un tocco. Toccarne uno manda quella frase come domanda.
type Funzione = { icona: NomeIcona; testo: string; sotto: string }

// «Aiutami a prenotare una lezione» (11/11/2026, richiesta di Maurizio): a chi puo' prenotare l'assistente risponde col pulsante «Apri Prenotazioni», senza proporre una lezione scelta a caso
// (`rimandoPrenotazioni`, `lezioni.ts` di APP-ATHLON). La riga sotto dice quello che succede davvero.
const PRENOTA = (): Funzione => ({ icona: 'calendario', testo: t('Aiutami a prenotare una lezione', 'Help me book a class'), sotto: t('Ti porto subito alla pagina Prenotazioni', 'I’ll take you straight to the Bookings page') })
const PAGA = (): Funzione => ({ icona: 'carta', testo: t('Voglio pagare una rata scaduta', 'I want to pay an overdue instalment'), sotto: t('Vedi le quote e paghi da qui', 'See what’s due and pay from here') })
const METODO = (): Funzione => ({ icona: 'wallet', testo: t('Voglio aggiungere il metodo di pagamento', 'I want to add a payment method'), sotto: t('Ti porto subito alla pagina giusta', 'I’ll take you straight to the right page') })
const ABBONAMENTO = (): Funzione => ({ icona: 'abbonamento', testo: t('Quale abbonamento fa per me?', 'Which membership is right for me?'), sotto: t('Ti dico cosa comprende ognuno, e lo attivi dall’app', 'I’ll tell you what each one includes, and you start it from the app') })
const PROVA = (): Funzione => ({ icona: 'pass', testo: t('Posso provare il club prima di iscrivermi?', 'Can I try the club before joining?'), sotto: t('Ti dico se puoi e come si attiva', 'I’ll tell you if you can and how to start') })
const RECUPERO = (): Funzione => ({ icona: 'famiglia', testo: t('Come recupera una lezione mio figlio?', 'How can my child make up a missed class?'), sotto: t('Ti porto ai recuperi della sezione Junior', 'I’ll take you to make-up classes in the Junior section') })
const ISCRIVI_FIGLIO = (): Funzione => ({ icona: 'famiglia', testo: t('Voglio iscrivere mio figlio a un corso', 'I want to sign my child up for a course'), sotto: t('Ti mostro i turni per il suo anno nella sezione Junior', 'I’ll show you the groups for their year in the Junior section') })

/** Tre suggerimenti, uno per tipo: le attivita' degli adulti, il figlio (se nel nucleo c'e' un minorenne), l'account o l'iscrizione. */
function suggerimenti(profilo: ProfiloSocio | null): Funzione[] {
  if (!profilo) return [PRENOTA(), PAGA(), METODO()]
  // Le attivita' degli adulti guardano il titolare: un genitore che ha iscritto solo il figlio non ha lezioni da prenotare per se'.
  const adulti = profilo.titolareIscritto ? PRENOTA() : ABBONAMENTO()
  const figlio = profilo.figli ? (profilo.figlioIscritto ? RECUPERO() : ISCRIVI_FIGLIO()) : null
  // Le quote e il metodo di pagamento valgono per chiunque nel nucleo abbia un abbonamento, anche solo il figlio.
  const account = profilo.iscritto ? [PAGA(), METODO()] : [PROVA()]
  return [adulti, ...(figlio ? [figlio] : []), ...account].slice(0, 3)
}

function Pulsanti({ azioni, messaggioId, onVai, onManda }: { azioni: AzioneAssistente[]; messaggioId: string | null; onVai: () => void; onManda: (domanda: string) => void }) {
  const p = usePalette()
  return (
    <View style={stili.azioni}>
      {azioni.map((a, i) => {
        // La proposta di una prenotazione non porta altrove: apre una carta nella chat, e prenota solo chi tocca «Prenota» (30/10/2026).
        const proposta = prenotaDaAzione(a)
        if (proposta) return <PrenotaDaChat key={`${a.destinazione}${i}`} proposta={proposta} messaggioId={messaggioId} onVai={onVai} />
        // Il pagamento delle quote scadute (30/10/2026): apre la carta «Da pagare» nella chat, e paga solo chi tocca il pulsante di pagamento.
        const pagamento = pagaDaAzione(a)
        if (pagamento) return <PagaDaChat key={`${a.destinazione}${i}`} proposta={pagamento} messaggioId={messaggioId} />
        // «Scrivi al team» (31/10/2026): apre una carta nella chat, e la conversazione va al team solo quando la persona preme Invia.
        const team = teamDaAzione(a)
        if (team) return <ScriviAlTeam key={`${a.destinazione}${i}`} proposta={team} messaggioId={messaggioId} onVai={onVai} />
        // La telefonata col desk (31/10/2026): per chi non e' iscritto, apre il calendario del desk nella chat. L'orario lo sceglie e lo conferma la persona.
        const chiamata = chiamataDaAzione(a)
        if (chiamata) return <ChiamataDaChat key={`${a.destinazione}${i}`} proposta={chiamata} messaggioId={messaggioId} />
        // Un chiarimento (01/11/2026): la funzione ha chiesto «intendevi…?» e ogni opzione e' un pulsante che manda la sua domanda completa. Non porta altrove: la risposta arriva qui.
        const chiarimento = chiarimentoDaAzione(a)
        if (chiarimento) {
          return (
            <Tocco
              key={`${a.destinazione}${i}`}
              etichetta={chiarimento.etichetta}
              onPress={() => {
                if (messaggioId) pulsanteToccato(messaggioId, a.destinazione)
                onManda(chiarimento.testo)
              }}
              style={[stili.opzione, { borderColor: p.accento, backgroundColor: p.fondo }]}
            >
              <Text style={[stili.opzioneTesto, { color: p.accento }]} numberOfLines={1}>
                {chiarimento.etichetta}
              </Text>
            </Tocco>
          )
        }
        const href = hrefAssistente(a.destinazione, a.parametri)
        if (!href) return null
        return (
          <Tocco
            key={`${a.destinazione}${i}`}
            etichetta={a.etichetta}
            onPress={() => {
              if (messaggioId) pulsanteToccato(messaggioId, a.destinazione)
              onVai()
              router.navigate(href)
            }}
            style={[stili.azione, { backgroundColor: p.accento }]}
          >
            <Text style={[stili.azioneTesto]} numberOfLines={1}>
              {a.etichetta}
            </Text>
            <Icona nome="avanti" size={14} colore="#fff" />
          </Tocco>
        )
      })}
    </View>
  )
}

function Fumetto({ b, onVai, onManda }: { b: Battuta; onVai: () => void; onManda: (domanda: string) => void }) {
  const p = usePalette()
  const socio = b.ruolo === 'socio'
  const attesa = b.stato === 'scrive' && !b.testo
  return (
    <View style={[stili.riga, socio ? stili.destra : stili.sinistra]}>
      <View style={[stili.fumetto, socio ? { backgroundColor: p.accento } : { backgroundColor: p.incavo }]}>
        {attesa ? (
          <Text style={[stili.testo, { color: p.testoSecondario }]}>{t('Sto cercando…', 'Looking…')}</Text>
        ) : (
          <Text style={[stili.testo, { color: socio ? '#fff' : p.testo }]} selectable>
            {b.testo}
            {b.stato === 'interrotta' ? t(' … (la connessione si è interrotta)', ' … (the connection dropped)') : ''}
          </Text>
        )}
      </View>
      {!socio && b.stato === 'fatto' && b.azioni.length > 0 ? <Pulsanti azioni={b.azioni} messaggioId={b.messaggioId} onVai={onVai} onManda={onManda} /> : null}
      {!socio && b.stato === 'fatto' && b.messaggioId ? (
        <View style={stili.voti}>
          {(['su', 'giu'] as const).map((v) => (
            <Tocco
              key={v}
              onPress={() => votaRisposta(b.id, v)}
              vibra="scelta"
              etichetta={v === 'su' ? t('Risposta utile', 'Helpful answer') : t('Risposta non utile', 'Unhelpful answer')}
              stato={{ selected: b.valutazione === v }}
              style={[stili.voto, { borderColor: b.valutazione === v ? p.accento : p.linea, backgroundColor: b.valutazione === v ? p.incavo : 'transparent' }]}
            >
              <Text style={[stili.votoTesto, { color: b.valutazione === v ? p.accento : p.testoSecondario }]}>{v === 'su' ? t('Utile', 'Helpful') : t('Non utile', 'Not helpful')}</Text>
            </Tocco>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function FoglioAssistente({ aperto, schermata, onChiudi }: { aperto: boolean; schermata: string | null; onChiudi: () => void }) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const s = useAssistente()
  const profilo = useProfilo()
  const [testo, setTesto] = useState('')
  const scorri = useRef<ScrollView>(null)
  const campo = useRef<TextInput>(null)
  const voce = useDettatura(setTesto)
  const android = Platform.OS === 'android'

  // **Su Android nativo il foglio non e' un `Modal`** (10/11/2026, segnalazione di Maurizio: «quando si scrive in chat la tastiera copre il campo e non si
  // riesce a scrivere»). Un `Modal` e' una finestra a parte, e dall'app per Android 16 (`targetSdk` 36) il sistema disegna le finestre a schermo
  // intero senza ridimensionarle quando compare la tastiera: il campo, in fondo al foglio, restava sotto. Le notifiche della tastiera (`Keyboard`)
  // arrivano dalla finestra dell'attivita', non da quella del `Modal`: il foglio sta quindi nella stessa finestra della schermata, sopra a tutto
  // (`stili.sopra`), e la tastiera lo alza (`sollevamento`). Su iOS e sul web resta il `Modal` di prima.
  const tastiera = useAltezzaTastiera(android && aperto)
  // Altezza del livello adesso e la piu' alta vista: la differenza e' quanto ha gia' tolto il sistema, se la finestra si ridimensiona (versioni e
  // telefoni che lo fanno ancora). Si alza solo di quello che manca: con la finestra ridimensionata non si alza due volte.
  const [livello, setLivello] = useState({ massima: 0, adesso: 0 })
  const alLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height
    setLivello((l) => ({ massima: Math.max(l.massima, h), adesso: h }))
  }
  // A tastiera chiusa la misura buona e' quella di adesso: se la finestra e' cambiata (schermo diviso) la massima vecchia non vale piu'.
  useEffect(() => {
    if (tastiera === 0) setLivello((l) => ({ massima: l.adesso, adesso: l.adesso }))
  }, [tastiera])
  // La tastiera sale dal bordo di sotto dello schermo di `tastiera` piu' la barra di navigazione che copre.
  const sollevamento = quantoAlzare(tastiera, ins.bottom, livello.massima, livello.adesso)
  // Il foglio si accorcia con la tastiera, e l'ultimo messaggio deve restare in vista.
  useEffect(() => {
    if (tastiera > 0) scorri.current?.scrollToEnd({ animated: true })
  }, [tastiera])
  // Senza `Modal` il tasto «indietro» di Android non chiude piu' niente da solo.
  useEffect(() => {
    if (!android || !aperto) return
    const ascolto = BackHandler.addEventListener('hardwareBackPress', () => {
      onChiudi()
      return true
    })
    return () => ascolto.remove()
  }, [android, aperto, onChiudi])
  const puoMandare = !s.inCorso && testo.trim().length > 0 && testo.length <= CARATTERI_MAX

  const manda = (domanda: string) => {
    // Se il microfono sta ancora ascoltando si butta quello che arriva: la domanda parte com'e' e il campo resta vuoto.
    voce.annulla()
    mandaDomanda(domanda, schermata)
    setTesto('')
  }

  useLayoutEffect(() => adattaAltezza(campo.current), [testo, aperto])
  // Chiuso il foglio non si resta in ascolto.
  useEffect(() => {
    if (!aperto) voce.annulla()
  }, [aperto, voce.annulla])

  // Con la tastiera su (Android) il foglio riempie lo spazio che resta, sotto la barra di stato; a tastiera chiusa e' alto l'88%, come sempre.
  const pieno = android && tastiera > 0

  const corpo = (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('Chiudi', 'Close')} />
      <View style={[stili.foglio, pieno ? stili.foglioPieno : stili.foglioAlto, { backgroundColor: p.carta, paddingBottom: (pieno ? 0 : ins.bottom) + spazio.due }]} accessibilityViewIsModal>
        <View style={[stili.maniglia, { backgroundColor: p.incavo }]} />
        <View style={stili.testata}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
              {t('Assistente virtuale', 'Virtual assistant')}
            </Text>
            <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t('Chiedimi dove trovare le cose o cosa risulta sul tuo account.', 'Ask me where to find things or what shows on your account.')}</Text>
          </View>
          {s.battute.length > 0 ? (
            <Tocco onPress={ricominciaChat} etichetta={t('Ricomincia la conversazione', 'Start over')} style={[stili.icona, { backgroundColor: p.incavo }]}>
              <Icona nome="aggiorna" size={16} colore={p.testo} />
            </Tocco>
          ) : null}
          <Tocco onPress={onChiudi} etichetta={t('Chiudi', 'Close')} style={[stili.icona, { backgroundColor: p.incavo }]}>
            <Icona nome="chiudi" size={17} colore={p.testo} />
          </Tocco>
        </View>

        <ScrollView
          ref={scorri}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: spazio.tre, padding: spazio.tre + 4, paddingBottom: spazio.tre }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scorri.current?.scrollToEnd({ animated: true })}
        >
          {s.battute.length === 0 && schermata === 'junior' && leggiTemaJunior() ? (
            // Nella sezione Junior (e dal link del sito che la apre) la chat comincia dal corso del bambino, con un testo nostro (04/11/2026).
            <BenvenutoJunior tema={leggiTemaJunior()!} onManda={manda} />
          ) : s.battute.length === 0 ? (
            <View style={{ gap: spazio.tre }}>
              <Text style={[stili.testo, { color: p.testoSecondario }]}>{t('Posso fare per te:', 'I can do this for you:')}</Text>
              <View style={{ gap: spazio.due }}>
                {suggerimenti(profilo.profilo).map((f) => (
                  <Tocco key={f.testo} onPress={() => manda(f.testo)} etichetta={f.testo} style={[stili.funzione, { borderColor: p.accento, backgroundColor: p.fondo }]}>
                    <View style={[stili.funzioneIcona, { backgroundColor: p.accento }]}>
                      <Icona nome={f.icona} size={17} colore="#fff" />
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={[stili.testo, { color: p.testo, fontFamily: F.semi }]}>{f.testo}</Text>
                      <Text style={[stili.funzioneSotto, { color: p.testoSecondario }]}>{f.sotto}</Text>
                    </View>
                    <Icona nome="avanti" size={14} colore={p.testoTerzo} />
                  </Tocco>
                ))}
              </View>
            </View>
          ) : null}
          {s.battute.map((b) => (
            <Fumetto key={b.id} b={b} onVai={onChiudi} onManda={manda} />
          ))}
          {s.errore ? <Messaggio tono={s.nonAttivo ? 'attenzione' : 'errore'}>{s.errore}</Messaggio> : null}
        </ScrollView>

        <View style={stili.fondo}>
          <View style={[stili.campo, { borderColor: p.linea, backgroundColor: p.fondo }]}>
            <TextInput
              // Il riferimento serve sul web: appena il campo compare, anche con una bozza gia' scritta, si porta alla sua altezza.
              ref={(el) => {
                campo.current = el
                adattaAltezza(el)
              }}
              value={testo}
              onChangeText={setTesto}
              placeholder={voce.ascolto ? t('Ti ascolto…', 'Listening…') : t('Scrivi qui…', 'Write here…')}
              placeholderTextColor={p.testoTerzo}
              multiline
              // Una riga di partenza: sul web react-native-web ne darebbe due. Poi cresce `adattaAltezza`.
              numberOfLines={1}
              maxLength={CARATTERI_MAX}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => puoMandare && manda(testo)}
              // Sul web un campo su piu' righe va a capo con Invio: qui Invio manda, Maiusc+Invio va a capo.
              onKeyPress={(e) => {
                const n = e.nativeEvent as unknown as { key?: string; shiftKey?: boolean }
                if (Platform.OS === 'web' && n.key === 'Enter' && !n.shiftKey) {
                  e.preventDefault()
                  if (puoMandare) manda(testo)
                }
              }}
              accessibilityLabel={t('La tua domanda', 'Your question')}
              style={[stili.input, { color: p.testo }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            />
            {voce.disponibile ? (
              <Tocco
                onPress={() => voce.tocca(testo)}
                etichetta={voce.ascolto ? t('Smetti di dettare', 'Stop dictating') : t('Detta la domanda con la voce', 'Dictate your question')}
                stato={{ selected: voce.ascolto }}
                style={[stili.invia, { backgroundColor: voce.ascolto ? p.accento : p.incavo }]}
              >
                {voce.ascolto ? <Richiamo raggio={18} colore={p.accento} ingrandimento={1.45} finoAlFatto /> : null}
                <Icona nome="microfono" size={17} colore={voce.ascolto ? '#fff' : p.accento} />
              </Tocco>
            ) : null}
            <Tocco onPress={() => puoMandare && manda(testo)} spento={!puoMandare} etichetta={t('Invia', 'Send')} style={[stili.invia, { backgroundColor: puoMandare ? p.accento : p.incavo }]}>
              <Icona nome="invia" size={16} colore={puoMandare ? '#fff' : p.testoTerzo} />
            </Tocco>
          </View>
          {voce.errore ? <Text style={[stili.postilla, { color: p.testoSecondario }]}>{voce.errore}</Text> : null}
          <Text style={[stili.postilla, { color: p.testoTerzo }]}>
            {t(
              'Assistente automatico: può sbagliare e non fa niente al posto tuo. Le domande e le risposte vengono lette dal club per migliorarlo: non scrivere dati sulla salute.',
              'Automated assistant: it can make mistakes and doesn’t do anything on your behalf. Questions and answers are read by the club to improve it: don’t write health information.',
            )}
            {voce.disponibile
              ? t(' Il microfono trascrive la voce con il servizio del tuo browser: puoi rileggere e correggere il testo prima di inviarlo.', ' The microphone transcribes your voice with your browser’s service: you can review and edit the text before sending it.')
              : ''}
          </Text>
        </View>
      </View>
    </>
  )

  if (android) {
    return aperto ? (
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} onLayout={alLayout} style={[stili.velo, stili.sopra, { paddingTop: pieno ? ins.top + spazio.due : 0, paddingBottom: sollevamento }]}>
        {corpo}
      </Animated.View>
    ) : null
  }

  return (
    // **Dissolvenza e non «slide»** (04/11/2026, telefoni Android con l'app installata: toccando il campo la tastiera si apriva e si richiudeva subito). Il «slide» di React Native Web
    // lascia sul contenitore fisso del foglio una `transform: translateY(0%)` per sempre, anche a fine animazione: un campo di testo dentro un elemento fisso con una `transform` e' il caso
    // in cui Chrome su Android (nella modalita' a schermo intero della PWA) perde il fuoco quando la tastiera ridimensiona la finestra. La dissolvenza lascia solo `opacity`.
    <Modal visible={aperto} transparent animationType="fade" onRequestClose={onChiudi}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stili.velo}>
        {corpo}
      </KeyboardAvoidingView>
    </Modal>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  // Sopra a tutto, nella finestra della schermata (Android nativo): `zIndex` per l'ordine fra fratelli, `elevation` perche' su Android una vista con ombra (la barra delle schede) sta sopra a una con elevazione 0.
  sopra: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100 },
  foglio: { width: '100%', maxWidth: 560, borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  foglioAlto: { height: '88%' },
  foglioPieno: { flex: 1 },
  maniglia: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  testata: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due, paddingHorizontal: spazio.quattro - 4, paddingTop: spazio.due },
  titolo: { fontFamily: F.extra, fontSize: 22, letterSpacing: -0.6 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  icona: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  riga: { gap: 8, maxWidth: '100%' },
  destra: { alignItems: 'flex-end' },
  sinistra: { alignItems: 'flex-start' },
  fumetto: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  testo: { fontFamily: F.medio, fontSize: 15, lineHeight: 21 },
  azioni: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, maxWidth: '100%' },
  azione: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999 },
  azioneTesto: { fontFamily: F.semi, fontSize: 14, color: '#fff', maxWidth: 240 },
  opzione: { height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, justifyContent: 'center' },
  opzioneTesto: { fontFamily: F.semi, fontSize: 14, maxWidth: 240 },
  voti: { flexDirection: 'row', gap: 8 },
  voto: { height: 28, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  votoTesto: { fontFamily: F.semi, fontSize: 12 },
  funzione: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 16, borderWidth: 1.5 },
  funzioneIcona: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  funzioneSotto: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  fondo: { paddingHorizontal: spazio.quattro - 4, gap: 8, paddingTop: 4 },
  campo: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: 22, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, fontFamily: F.medio, fontSize: 15, lineHeight: 20, minHeight: 32, maxHeight: 110, paddingTop: 6, paddingBottom: 6 },
  invia: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  postilla: { fontFamily: F.medio, fontSize: 11.5, lineHeight: 16 },
})
