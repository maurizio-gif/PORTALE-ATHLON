import { LinearGradient } from 'expo-linear-gradient'
import { router, useIsFocused } from 'expo-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useWindowDimensions } from '@/lib/finestra'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MESSAGGIO_SCUOLA_NUOTO } from '@/api/lab'
import { BISOGNI, DISCIPLINE, ESPERIENZE, FASCE, INTENSITA, LIVELLI, OBIETTIVI, OBIETTIVI_MAX, PAUSE, PERSONAL_ESPERIENZE, PERSONAL_INTERESSI, AMBIENTI_LEZIONE, TIPOLOGIE, type Gruppo, type StatoConsigli } from '@/api/percorso'
import { t } from '@/lib/lingua'
import { spazio, tinta } from '@/theme'

import { inMemoria, ricorda } from '../memoria'
import { GIORNI, GIORNO_BREVE, NOME_FASCIA } from '../percorso/comune'
import { notaSalto, testoAbitudine } from '../schede/abitudine'
import type { AbitudineTrain } from '@/api/lab'
import { AnelloPassi } from '../schede/AnelloPassi'
import { Griglia, OpzioneCarta } from '../schede/PassiUI'
import { nomeObiettivo } from '../schede/questionario'
import { momentoDaVisiteAlPosto, type CampoConsigli } from '../schede/profiloComune'
import { nomeSport } from '../dispositivi/allenamentiDispositivo'
import { useSegnaAzioneInAlto } from '../feedback/posizione'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import {
  AMBIENTE_TESTO,
  BISOGNO_TESTO,
  conEvitate,
  conGusti,
  conTipologie,
  DISCIPLINA_TESTO,
  ESPERIENZA_TESTO,
  GUSTI,
  gustiDi,
  INTENSITA_TESTO,
  LIVELLO_TESTO,
  PAUSA_TESTO,
  PERSONAL_ESPERIENZA_TESTO,
  PERSONAL_INTERESSE_TESTO,
  SPORT_ESTERNI,
  TIPOLOGIA_TESTO,
  volteTesto,
  type SceltePerConsigli,
} from './comune'
import { facoltativo, passiConsigli, passoCompleto, passoVuoto, riepilogoConsigli, type PassoConsigli } from './passi'

// Il questionario dei Consigli a passi (05/11/2026, richiesta di Maurizio: «come quello del piano»): una domanda per schermata,
// l'anello in alto a destra che si chiude, indietro a sinistra e «Continua» in basso (spento finche' non si risponde a una domanda
// obbligatoria; «Salta» su una facoltativa senza risposta). Alla fine «Ecco cosa abbiamo capito»: ogni riga si tocca per cambiarla, e
// finito il passo si torna li'. Solo «Dammi i consigli» fa partire la richiesta. Le scelte e la loro memoria restano di `Consigli.tsx`
// (qui arrivano gia' fatte, con `cambia`); le regole sono in `passi.ts`. Il passo a cui si era arrivati resta in memoria (mai sul
// disco), cosi' un «Dettagli» o un gesto indietro non fa ricominciare.

/** Il passo a cui si era arrivati, solo in memoria. */
const CHIAVE_PASSO = 'consigli:passo'
export const dimenticaPassoConsigli = () => ricorda(CHIAVE_PASSO, null)

type Props = {
  scelte: SceltePerConsigli
  cambia: (n: Partial<SceltePerConsigli>) => void
  limitazioni: string
  onLimitazioni: (v: string) => void
  riportate: CampoConsigli[]
  stato: StatoConsigli
  abitudine: AbitudineTrain | null
  consigliate: number | null
  /** L'errore dell'ultima richiesta, e la quota del mese gia' in parole (`quota.ts`). */
  errore: string | null
  quotaTesto: string | null
  finita: boolean
  /** Ci sono gia' dei consigli: dal primo passo si torna li', e il riepilogo lo offre. */
  conRisposta: boolean
  onTornaAiConsigli: () => void
  onInvia: () => void
}

export function PassiConsigli(props: Props) {
  const { scelte: s, cambia, limitazioni, onLimitazioni, riportate, stato, abitudine, consigliate, errore, quotaTesto, finita, conRisposta, onTornaAiConsigli, onInvia } = props
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const conComprese = stato.idoneita.categorie != null
  const ordine = passiConsigli(s, conComprese)

  const [passo, setPasso] = useState<PassoConsigli>(() => {
    const prima = inMemoria<PassoConsigli | null>(CHIAVE_PASSO)
    return prima && ordine.includes(prima) ? prima : ordine[0]
  })
  const [daRiepilogo, setDaRiepilogo] = useState(false)
  const scorri = useRef<ScrollView>(null)
  // L'anello sta dove di solito sta il pulsante «Richiedi assistenza»: gli si dice di farsi da parte.
  useSegnaAzioneInAlto(true, useIsFocused())

  useEffect(() => {
    ricorda(CHIAVE_PASSO, passo)
    scorri.current?.scrollTo({ y: 0, animated: false })
  }, [passo])
  // Un passo che non c'e' piu' (si e' cambiata l'esperienza dal riepilogo): si torna al riepilogo.
  const chiaveOrdine = ordine.join(',')
  useEffect(() => {
    if (!chiaveOrdine.split(',').includes(passo)) setPasso('riepilogo')
  }, [chiaveOrdine, passo])

  const i = Math.max(0, ordine.indexOf(passo))
  const completo = passoCompleto(passo, s)
  const ultimo = passo === 'riepilogo'

  function avanti() {
    if (!completo) return
    // Dal riepilogo si e' venuti a cambiare una riga: si torna li', passando prima da una domanda obbligatoria che la risposta ha
    // aperto (chi passa a «ho smesso» deve dire com'e' la sua forma).
    if (daRiepilogo) {
      const manca = ordine.find((x) => x !== passo && !passoCompleto(x, s))
      if (manca) return setPasso(manca)
      setDaRiepilogo(false)
      return setPasso('riepilogo')
    }
    if (i < ordine.length - 1) setPasso(ordine[i + 1])
  }
  function indietro() {
    if (daRiepilogo) {
      setDaRiepilogo(false)
      return setPasso('riepilogo')
    }
    if (i > 0) return setPasso(ordine[i - 1])
    if (conRisposta) return onTornaAiConsigli()
    if (router.canGoBack()) router.back()
    else router.replace('/allenamento')
  }
  function vaiA(a: PassoConsigli) {
    setDaRiepilogo(true)
    setPasso(a)
  }

  // ---- i pezzi -------------------------------------------------------------------------------------------------------------
  const una = <T extends string | number>(opzioni: { valore: T; testo: string; nota?: string; etichetta?: string }[], scelto: T | null, onScegli: (v: T) => void) => (
    <View style={stili.lista}>
      {opzioni.map((o) => (
        <OpzioneCarta key={String(o.valore)} testo={o.testo} nota={o.nota} etichetta={o.etichetta} attivo={scelto === o.valore} onPress={() => onScegli(o.valore)} />
      ))}
    </View>
  )
  const piu = <T extends string | number>(opzioni: { valore: T; testo: string; nota?: string }[], scelti: readonly T[], onCambia: (v: T[]) => void) => (
    <View style={stili.lista}>
      {opzioni.map((o) => (
        <OpzioneCarta key={String(o.valore)} multipla testo={o.testo} nota={o.nota} attivo={scelti.includes(o.valore)} onPress={() => onCambia(scelti.includes(o.valore) ? scelti.filter((x) => x !== o.valore) : [...scelti, o.valore])} />
      ))}
    </View>
  )
  const griglia = <T extends string | number>(opzioni: { valore: T; testo: string }[], scelti: readonly T[], onCambia: (v: T[]) => void) => (
    <Griglia>
      {opzioni.map((o) => (
        <OpzioneCarta key={String(o.valore)} compatta multipla testo={o.testo} attivo={scelti.includes(o.valore)} onPress={() => onCambia(scelti.includes(o.valore) ? scelti.filter((x) => x !== o.valore) : [...scelti, o.valore])} />
      ))}
    </Griglia>
  )
  const nota = (testo: string | null | undefined) => (testo ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{testo}</Text> : null)
  const etichettaPiccola = (testo: string) => <Text style={[stili.sottoDomanda, { color: p.testo }]}>{testo}</Text>
  const riportata = (campi: CampoConsigli[], daVisite = false) =>
    campi.some((c) => riportate.includes(c)) ? (
      <Text style={[stili.piccola, { color: p.accento, fontFamily: F.bold }]}>
        {daVisite ? t('Dalle tue visite al club: cambialo se serve.', 'From your visits to the club: change it if you like.') : t('Riportato dalle tue risposte precedenti: cambialo se serve.', 'Carried over from your earlier answers: change it if you like.')}
      </Text>
    ) : null

  let titolo = ''
  let sotto: string | null = null
  let corpo: ReactNode = null
  switch (passo) {
    case 'obiettivi':
      titolo = t('Quali sono i tuoi obiettivi?', 'What are your goals?')
      sotto =
        s.obiettivi.length > 1
          ? t(`Il primo che hai scelto, ${nomeObiettivo(s.obiettivi[0])}, è quello principale.`, `The first one you chose, ${nomeObiettivo(s.obiettivi[0])}, is the main one.`)
          : t('Fino a tre: il primo che scegli è quello principale. Poi ti diciamo quali lezioni potrebbero fare per te, perché, e quando le trovi.', 'Up to three: the first one you pick is the main one. Then we’ll tell you which classes might suit you, why, and when you can find them.')
      corpo = (
        <>
          {piu(
            OBIETTIVI.map((o) => ({ valore: o, testo: nomeObiettivo(o) })),
            s.obiettivi,
            (obiettivi) => obiettivi.length <= OBIETTIVI_MAX && cambia({ obiettivi }),
          )}
          {riportata(['obiettivi'])}
        </>
      )
      break
    case 'bisogni':
      titolo = t('Cosa c’è dietro ai tuoi obiettivi?', 'What’s behind your goals?')
      sotto = t('Scegli quello che ti somiglia, anche più di una cosa.', 'Pick whatever sounds like you, more than one if you like.')
      corpo = piu(BISOGNI.map((b) => ({ valore: b, testo: BISOGNO_TESTO[b].testo, nota: BISOGNO_TESTO[b].nota })), s.bisogni, (bisogni) => cambia({ bisogni }))
      break
    case 'esperienza':
      titolo = t('Qual è la tua esperienza?', 'What’s your experience?')
      corpo = (
        <>
          {una(ESPERIENZE.map((e) => ({ valore: e, testo: ESPERIENZA_TESTO[e].testo, nota: ESPERIENZA_TESTO[e].nota })), s.esperienza, (esperienza) => cambia({ esperienza }))}
          {riportata(['esperienza'])}
        </>
      )
      break
    case 'pausa':
      titolo = t('Quando hai smesso?', 'When did you stop?')
      corpo = una(PAUSE.map((v) => ({ valore: v, testo: PAUSA_TESTO[v] })), s.pausa, (pausa) => cambia({ pausa: pausa === s.pausa ? null : pausa }))
      break
    case 'discipline':
      titolo = s.esperienza === 'ex' ? t('Cosa facevi?', 'What did you do?') : t('Cosa fai?', 'What do you do?')
      sotto =
        s.esperienza === 'ex'
          ? t('Ripartire da quello che conosci rende la ripresa più facile.', 'Starting from what you know makes getting back into it easier.')
          : t('Ti proponiamo qualcosa che completi quello che fai già, senza ripeterlo.', 'We’ll suggest something that complements what you already do, without repeating it.')
      corpo = piu(DISCIPLINE.map((d) => ({ valore: d, testo: DISCIPLINA_TESTO[d] })), s.discipline, (discipline) => cambia({ discipline }))
      break
    case 'livello':
      titolo = t('Com’è la tua forma oggi?', 'How fit are you today?')
      corpo = (
        <>
          {una(LIVELLI.map((l) => ({ valore: l, testo: LIVELLO_TESTO[l].testo, nota: LIVELLO_TESTO[l].nota })), s.livello, (livello) => cambia({ livello }))}
          {riportata(['livello'])}
        </>
      )
      break
    case 'gusti':
      titolo = t('Cosa ti piace fare?', 'What do you like to do?')
      sotto = t('Se non scegli niente, guardiamo tutte le lezioni.', 'If you don’t choose anything, we look at all the classes.')
      corpo = (
        <>
          {piu(GUSTI.map((g) => ({ valore: g.valore, testo: g.testo, nota: g.nota })), gustiDi(s), (gusti) => cambia(conGusti(s, gusti)))}
          {s.nuotare ? (
            <Carta style={{ gap: spazio.tre }}>
              {etichettaPiccola(t('Sai nuotare stile libero e dorso?', 'Can you swim freestyle and backstroke?'))}
              <Griglia>
                <OpzioneCarta compatta testo={t('Sì', 'Yes')} attivo={s.saNuotare === true} onPress={() => cambia({ saNuotare: true })} />
                <OpzioneCarta compatta testo={t('Non ancora', 'Not yet')} attivo={s.saNuotare === false} onPress={() => cambia({ saNuotare: false })} />
              </Griglia>
              {nota(
                s.saNuotare === true
                  ? t('Ti diciamo come inserire il Nuoto Libero Assistito nella settimana, e ti portiamo a comporre il tuo piano di nuoto.', 'We’ll tell you how to fit Nuoto Libero Assistito into your week, and take you to build your swim plan.')
                  : s.saNuotare === false
                    ? t('Ti consigliamo la Scuola Nuoto Adulti, dove si comincia: sono gli istruttori a dirti quando passare al nuoto libero.', 'We recommend Scuola Nuoto Adulti, where you start: the instructors will tell you when to move on to lap swimming.')
                    : MESSAGGIO_SCUOLA_NUOTO,
              )}
              {s.saNuotare === true && conComprese && !stato.idoneita.categorie!.includes('Nuoto Libero') && !s.includi_non_comprese ? (
                <Messaggio tono="attenzione">{t('Il Nuoto Libero non risulta nel tuo abbonamento: i turni si prenotano a pagamento, come lezione singola.', 'Nuoto Libero isn’t in your membership: slots are booked for a fee, as a single class.')}</Messaggio>
              ) : null}
            </Carta>
          ) : null}
        </>
      )
      break
    case 'intensita':
      titolo = t('Che intensità preferisci?', 'What intensity do you prefer?')
      corpo = (
        <>
          {una(INTENSITA.map((v) => ({ valore: v, testo: INTENSITA_TESTO[v].testo, nota: INTENSITA_TESTO[v].nota })), s.intensita, (intensita) => cambia({ intensita: intensita === s.intensita ? null : intensita }))}
          {riportata(['intensita'])}
        </>
      )
      break
    case 'volte':
      titolo = t('Quante volte a settimana pensi di venire?', 'How many times a week do you plan to come?')
      sotto = [t(`Ti proponiamo cose per ${volteTesto(s.volte_settimana)}, più o meno: poi scegli tu.`, `We’ll suggest things for about ${volteTesto(s.volte_settimana)}: then it’s up to you.`), testoAbitudine(abitudine), notaSalto(s.volte_settimana, abitudine)]
        .filter(Boolean)
        .join(' ')
      corpo = (
        <Griglia>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <OpzioneCarta key={n} compatta testo={String(n)} etichetta={n === consigliate ? t('Consigliato', 'Suggested') : undefined} attivo={s.volte_settimana === n} onPress={() => cambia({ volte_settimana: n })} />
          ))}
        </Griglia>
      )
      break
    case 'quando':
      titolo = t('Quando ti piacerebbe venire?', 'When would you like to come?')
      sotto = t('Non è un vincolo: ti mostriamo prima le lezioni che ci stanno, ma ti diciamo anche quelle adatte a te in altri momenti.', 'It’s not a constraint: we show the classes that fit first, but we also tell you about ones that suit you at other times.')
      corpo = (
        <>
          {etichettaPiccola(t('In quali giorni', 'Which days'))}
          {griglia(GIORNI.map((g) => ({ valore: g as number, testo: GIORNO_BREVE[g] })), s.giorni, (v) => cambia({ giorni: [...v].sort((a, b) => a - b) }))}
          {etichettaPiccola(t('In quale momento', 'What time'))}
          {piu(FASCE.map((f) => ({ valore: f, testo: NOME_FASCIA[f].titolo, nota: NOME_FASCIA[f].nota })), s.fasce, (fasce) => cambia({ fasce }))}
          {riportata(['fasce', 'giorni'], riportate.includes('giorni') || (riportate.includes('fasce') && momentoDaVisiteAlPosto()))}
        </>
      )
      break
    case 'esterno':
      titolo = t('Ti alleni anche fuori dal club?', 'Do you also train outside the club?')
      sotto = t('Ne teniamo conto: niente lezioni intense negli stessi momenti o il giorno dopo un allenamento pesante.', 'We take it into account: no intense classes at the same times or the day after a hard workout.')
      corpo = (
        <>
          {griglia(SPORT_ESTERNI.map((id) => ({ valore: id as string, testo: nomeSport(id) })), s.esterno_attivita, (esterno_attivita) => cambia({ esterno_attivita }))}
          {s.esterno_attivita.length ? (
            <>
              {etichettaPiccola(t('In quali giorni?', 'On which days?'))}
              {griglia(GIORNI.map((g) => ({ valore: g as number, testo: GIORNO_BREVE[g] })), s.esterno_giorni, (v) => cambia({ esterno_giorni: [...v].sort((a, b) => a - b) }))}
              {etichettaPiccola(t('E in quale momento?', 'And at what time?'))}
              {griglia(FASCE.map((f) => ({ valore: f, testo: NOME_FASCIA[f].titolo })), s.esterno_fasce, (esterno_fasce) => cambia({ esterno_fasce }))}
            </>
          ) : null}
          {nota(t('Altri sport? Scrivili nelle limitazioni, più avanti.', 'Other sports? Write them under limitations, further on.'))}
        </>
      )
      break
    case 'personal':
      titolo = t('E il personal trainer?', 'What about a personal trainer?')
      sotto = t('Un trainer del club che lavora solo con te, accanto alle lezioni: se ti può servire, ti diciamo quante sedute al mese avrebbero senso.', 'A club trainer who works only with you, alongside classes: if it could help, we’ll tell you how many sessions a month would make sense.')
      corpo = (
        <>
          {etichettaPiccola(t('Ti ha mai seguito un personal trainer?', 'Have you ever worked with a personal trainer?'))}
          {una(PERSONAL_ESPERIENZE.map((v) => ({ valore: v, testo: PERSONAL_ESPERIENZA_TESTO[v] })), s.personal_esperienza, (v) => cambia({ personal_esperienza: v === s.personal_esperienza ? null : v }))}
          {etichettaPiccola(t('Ti piacerebbe allenarti con un personal trainer?', 'Would you like to train with a personal trainer?'))}
          {una(PERSONAL_INTERESSI.map((v) => ({ valore: v, testo: PERSONAL_INTERESSE_TESTO[v] })), s.personal_interesse, (v) => cambia({ personal_interesse: v === s.personal_interesse ? null : v }))}
          {s.personal_interesse === 'no' ? nota(t('Va bene: non te lo proponiamo.', 'That’s fine: we won’t suggest it.')) : null}
        </>
      )
      break
    case 'tipologie':
      titolo = t('Che tipo di lezioni ti attraggono?', 'Which kinds of classes appeal to you?')
      sotto = t('Le proponiamo per prime, ma non escludiamo le altre.', 'We suggest these first, but we don’t rule out the others.')
      corpo = piu(TIPOLOGIE.map((v) => ({ valore: v, testo: TIPOLOGIA_TESTO[v].testo, nota: TIPOLOGIA_TESTO[v].nota })), s.tipologie, (tipologie) => cambia(conTipologie(s, tipologie)))
      break
    case 'ambienti':
      titolo = t('Dove preferisci fare lezione?', 'Where would you rather take classes?')
      sotto =
        s.ambienti.length === 1
          ? s.ambienti[0] === 'sala'
            ? t('Solo lezioni in sala: niente acqua.', 'Studio classes only: no water classes.')
            : t('Solo lezioni in acqua: niente lezioni in sala.', 'Water classes only: no studio classes.')
          : t('Sala e acqua, come preferisci: se non scegli niente guardiamo tutte e due.', 'Studio and water, as you like: if you don’t choose, we look at both.')
      corpo = piu(AMBIENTI_LEZIONE.map((v) => ({ valore: v, testo: AMBIENTE_TESTO[v].testo, nota: AMBIENTE_TESTO[v].nota })), s.ambienti, (ambienti) => cambia({ ambienti }))
      break
    case 'evita':
      titolo = t('C’è qualcosa che vuoi evitare?', 'Is there anything you want to avoid?')
      sotto =
        s.evita_gruppi.length || s.evita_tipologie.length
          ? t('Non te le proponiamo, nemmeno come alternativa.', 'We won’t suggest them, not even as an alternative.')
          : t('Se non scegli niente, non togliamo niente.', 'If you don’t choose anything, we don’t rule anything out.')
      corpo = (
        <>
          {etichettaPiccola(t('Generi', 'Types'))}
          {griglia(
            GUSTI.filter((g) => g.valore !== 'sala' && g.valore !== 'nuotare').map((g) => ({ valore: g.valore as Gruppo, testo: g.testo })),
            s.evita_gruppi,
            (v) => cambia(conEvitate(s, v, s.evita_tipologie)),
          )}
          {etichettaPiccola(t('Tipologie', 'Kinds of classes'))}
          {griglia(TIPOLOGIE.map((v) => ({ valore: v, testo: TIPOLOGIA_TESTO[v].testo })), s.evita_tipologie, (v) => cambia(conEvitate(s, s.evita_gruppi, v)))}
        </>
      )
      break
    case 'comprese':
      titolo = t('Anche le lezioni non comprese?', 'Classes not included too?')
      sotto = t(
        'Quelle fuori dal tuo abbonamento compaiono segnate «da acquistare» e si prenotano come lezione singola, a pagamento. Di base le lasciamo fuori.',
        'Those outside your membership are marked “to purchase” and are booked as a paid single class. By default we leave them out.',
      )
      corpo = una(
        [
          { valore: 'no', testo: t('Solo quelle comprese', 'Only those included') },
          { valore: 'si', testo: t('Includi anche le altre', 'Include the others too') },
        ],
        s.includi_non_comprese ? 'si' : 'no',
        (v) => cambia({ includi_non_comprese: v === 'si' }),
      )
      break
    case 'limitazioni':
      titolo = t('Hai limitazioni o infortuni?', 'Any limitations or injuries?')
      sotto = t('Non le conserviamo: arrivano solo a chi scrive i consigli.', 'We don’t store them: they only go to whoever writes your tips.')
      corpo = (
        <TextInput
          value={limitazioni}
          onChangeText={(v) => onLimitazioni(v.slice(0, 500))}
          placeholder={t('Per esempio: mal di schiena, una spalla da proteggere. Lascia vuoto se non ne hai.', 'For example: back pain, a shoulder to protect. Leave empty if you have none.')}
          placeholderTextColor={p.testoTerzo}
          multiline
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          accessibilityLabel={t('Limitazioni o infortuni', 'Limitations or injuries')}
          style={[stili.testo, { color: p.testo, backgroundColor: p.carta, borderColor: p.linea }]}
        />
      )
      break
    case 'riepilogo':
      titolo = t('Ecco cosa abbiamo capito', 'Here’s what we understood')
      sotto = t('Controlla: tocca una riga per cambiarla.', 'Check it: tap a row to change it.')
      corpo = (
        <>
          <Carta style={{ padding: 0, overflow: 'hidden' }}>
            {riepilogoConsigli(s, limitazioni, conComprese).map((riga, k) => (
              <Tocco
                key={riga.passo}
                vibra="leggero"
                onPress={() => vaiA(riga.passo)}
                etichetta={`${riga.titolo}: ${riga.valore}. ${t('Cambia', 'Change')}`}
                style={[stili.rigaRiepilogo, k > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}
              >
                <Text style={[stili.rigaTitolo, { color: p.testoSecondario }]}>{riga.titolo}</Text>
                <Text style={[stili.rigaValore, { color: p.testo }]} numberOfLines={3}>
                  {riga.valore}
                </Text>
                <Icona nome="avanti" size={14} colore={p.testoTerzo} />
              </Tocco>
            ))}
          </Carta>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          {quotaTesto ? <Text style={[stili.piccola, { color: finita ? p.testo : p.testoSecondario, textAlign: 'center', fontFamily: finita ? F.bold : F.medio }]}>{quotaTesto}</Text> : null}
          {conRisposta ? <Pulsante testo={t('Torna ai consigli di prima', 'Back to the previous tips')} variante="fantasma" onPress={onTornaAiConsigli} /> : null}
          <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>
            {t(
              'I consigli li scrive un’intelligenza artificiale. Le limitazioni che scrivi non vengono conservate; i consigli e le altre risposte restano salvati, così li ritrovi quando torni. Non sostituiscono il parere di un medico: con dolori, infortuni o patologie parlane prima con un istruttore in sala.',
              'The tips are written by an artificial intelligence. The limitations you write aren’t stored; the tips and your other answers are saved, so you’ll find them when you come back. They don’t replace a doctor’s advice: if you have pain, injuries or medical conditions, talk to an instructor on the gym floor first.',
            )}
          </Text>
        </>
      )
      break
  }

  const colonna = Math.min(640, width)
  const salta = !ultimo && facoltativo(passo) && passoVuoto(passo, s, limitazioni)
  return (
    <View style={[stili.fondo, { backgroundColor: p.fondo }]}>
      <ScrollView ref={scorri} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ alignItems: 'center', paddingTop: ins.top + spazio.tre, paddingBottom: 130 + ins.bottom }}>
        <View style={{ width: colonna, paddingHorizontal: spazio.tre + 2, gap: spazio.tre + 2 }}>
          <View style={stili.testata}>
            <Tocco onPress={indietro} etichetta={t('Indietro', 'Back')} style={[stili.tondo, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}>
              <Icona nome="indietro" size={18} colore={p.testo} />
            </Tocco>
            <Text style={[stili.sopratitolo, { color: p.testoTerzo }]}>{t('CONSIGLI ATHLON', 'ATHLON TIPS')}</Text>
            <AnelloPassi fatti={i + 1} totali={ordine.length} />
          </View>
          <Entra key={passo} style={{ gap: spazio.tre + 2 }}>
            <View style={{ gap: spazio.due }}>
              {facoltativo(passo) ? <Text style={[stili.facoltativo, { color: p.testoTerzo }]}>{t('FACOLTATIVO', 'OPTIONAL')}</Text> : null}
              <Text accessibilityRole="header" style={[stili.titolo, { color: p.testo }]}>
                {titolo}
              </Text>
              {sotto ? <Text style={[stili.sottotitolo, { color: p.testoSecondario }]}>{sotto}</Text> : null}
            </View>
            {corpo}
          </Entra>
        </View>
      </ScrollView>
      <View pointerEvents="box-none" style={[stili.piede, { paddingBottom: ins.bottom + spazio.tre }]}>
        <LinearGradient pointerEvents="none" colors={[tinta(p.fondo, 0), tinta(p.fondo, 0.96)]} style={StyleSheet.absoluteFill} />
        <View style={{ width: colonna, paddingHorizontal: spazio.tre + 2 }}>
          <Pulsante
            testo={ultimo ? t('Dammi i consigli', 'Give me tips') : salta ? t('Salta', 'Skip') : t('Continua', 'Continue')}
            icona={ultimo ? 'stella' : undefined}
            variante={salta ? 'secondario' : 'primario'}
            onPress={ultimo ? onInvia : avanti}
            disabilitato={ultimo ? finita || !ordine.every((x) => passoCompleto(x, s)) : !completo}
          />
        </View>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  fondo: { flex: 1 },
  testata: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46, gap: spazio.tre },
  sopratitolo: { flex: 1, textAlign: 'center', fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  tondo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  facoltativo: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2 },
  titolo: { fontFamily: F.extra, fontSize: 30, lineHeight: 36, letterSpacing: -0.9 },
  sottotitolo: { fontFamily: F.medio, fontSize: 16, lineHeight: 22 },
  sottoDomanda: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.2, marginTop: spazio.due },
  lista: { gap: spazio.due + 2 },
  piccola: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  testo: { minHeight: 120, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: spazio.tre, fontFamily: F.medio, fontSize: 15, textAlignVertical: 'top' },
  piede: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: spazio.quattro },
  rigaRiepilogo: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre, paddingHorizontal: spazio.tre + 2 },
  rigaTitolo: { fontFamily: F.semi, fontSize: 13.5, width: 120 },
  rigaValore: { flex: 1, fontFamily: F.extra, fontSize: 15, textAlign: 'right' },
})
