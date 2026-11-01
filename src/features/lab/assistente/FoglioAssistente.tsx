import { router } from 'expo-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { pulsanteToccato, type AzioneAssistente } from '@/api/assistente'
import { t, tv } from '@/lib/lingua'
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
import type { Battuta } from './store'
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

// I suggerimenti all'apertura (30/10/2026, richiesta di Maurizio). **Prima le cose che l'assistente sa fare con un tocco** (prenotare una lezione, pagare una quota
// scaduta, aggiungere il metodo di pagamento: sono le funzioni da promuovere), poi due domande per sapere dove sono le cose. Toccarne uno manda quella frase come domanda.
type Funzione = { icona: NomeIcona; testo: string; sotto: string }

const FUNZIONI = (): Funzione[] => [
  { icona: 'calendario', testo: t('Aiutami a prenotare una lezione', 'Help me book a class'), sotto: t('Ti propongo una lezione e prenoti con un tocco', 'I’ll suggest one and you book with a tap') },
  { icona: 'carta', testo: t('Voglio pagare una rata scaduta', 'I want to pay an overdue instalment'), sotto: t('Vedi le quote e paghi da qui', 'See what’s due and pay from here') },
  { icona: 'wallet', testo: t('Voglio aggiungere il metodo di pagamento', 'I want to add a payment method'), sotto: t('Ti porto subito alla pagina giusta', 'I’ll take you straight to the right page') },
]

const ESEMPI = () =>
  tv(
    ['Dove vedo i miei pagamenti?', 'Come annullo una lezione?'],
    ['Where can I see my payments?', 'How do I cancel a class?'],
  )

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
        if (team) return <ScriviAlTeam key={`${a.destinazione}${i}`} proposta={team} messaggioId={messaggioId} />
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
  const [testo, setTesto] = useState('')
  const scorri = useRef<ScrollView>(null)
  const campo = useRef<TextInput>(null)
  const voce = useDettatura(setTesto)
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

  return (
    <Modal visible={aperto} transparent animationType="slide" onRequestClose={onChiudi}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stili.velo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('Chiudi', 'Close')} />
        <View style={[stili.foglio, { backgroundColor: p.carta, paddingBottom: ins.bottom + spazio.due }]} accessibilityViewIsModal>
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
            {s.battute.length === 0 ? (
              <View style={{ gap: spazio.tre }}>
                <Text style={[stili.testo, { color: p.testoSecondario }]}>{t('Posso fare per te:', 'I can do this for you:')}</Text>
                <View style={{ gap: spazio.due }}>
                  {FUNZIONI().map((f) => (
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
                <Text style={[stili.testo, { color: p.testoSecondario }]}>{t('Oppure chiedimi, per esempio:', 'Or ask me, for example:')}</Text>
                <View style={{ gap: spazio.due }}>
                  {ESEMPI().map((e) => (
                    <Tocco key={e} onPress={() => manda(e)} etichetta={e} style={[stili.esempio, { borderColor: p.linea, backgroundColor: p.fondo }]}>
                      <Text style={[stili.testo, { color: p.testo, flex: 1 }]}>{e}</Text>
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
      </KeyboardAvoidingView>
    </Modal>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  foglio: { width: '100%', maxWidth: 560, height: '88%', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
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
  esempio: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  fondo: { paddingHorizontal: spazio.quattro - 4, gap: 8, paddingTop: 4 },
  campo: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: 22, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, fontFamily: F.medio, fontSize: 15, lineHeight: 20, minHeight: 32, maxHeight: 110, paddingTop: 6, paddingBottom: 6 },
  invia: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  postilla: { fontFamily: F.medio, fontSize: 11.5, lineHeight: 16 },
})
