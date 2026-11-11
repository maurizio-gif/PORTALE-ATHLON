import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { QuotaPiani, RigaSchedaLab, SedutaBreve, StatoTest } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import type { Dispositivi } from '../dispositivi/useDispositivi'
import { AggiungiAllenamento } from '../fit/AggiungiAllenamento'
import { CartaMovimento } from '../fit/CartaMovimento'
import { testoQuotaPiani } from '../quota'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Bollino, Carta, Entra, LinkSezione, Pulsante, Riga, Sezione, Tag } from '../ui/kit'
import { F, FUOCO, NOTTE, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { etichettaPiano, giorniAlTest, giornoTest, LIVELLI, quando } from './comune'
import { eDiVasca, ETICHETTA_VASCA } from './nuoto'
import { eAssistito, statoTrain, type StatoTestTrain } from './statoTrain'

// L'area Train, verticale sul piano di allenamento (11/11/2026, richiesta di Maurizio: «c'e' troppa roba in ordine sparso», mock-up
// approvati lo stesso giorno). Prima c'erano, in fila e con lo stesso peso, il test dei massimali, le calorie, l'allenamento a mano,
// il movimento dai dispositivi, i consigli, e solo dopo il piano. Adesso **si parte dal piano**, e il resto sta sotto «Altro in Train»:
//   - **nessun piano**: «Il tuo piano di allenamento» e i 3 modi per averlo. In evidenza l'**allenamento assistito** (questionario,
//     piano, test dei massimali, allenamento); poi «carichi il tuo piano» (da foto o PDF, o scritto a mano) e il personal trainer;
//   - **dopo il questionario**: il piano e' pronto e il **test dei massimali e' il passo dopo**. Il test non si offre piu' a tutti in
//     cima a Train: compare qui, a valle del questionario, e come riga di stato per chi ha un piano che lo usa (`statoTrain.ts`);
//   - **a regime**: il piano in cima, poi lo stato dei massimali, gli ultimi allenamenti, gli altri piani.
// La parte alta della schermata (Athlon Health Score, corpo, dispositivi, abitudini) non e' cambiata: sta in `Schede.tsx`.
// «Lo faccio dopo» sul test si ricorda sul dispositivo (`localStorage`): chi lo sceglie passa alla vista a regime, con la riga «Fai il test».

type Dati = { schede: RigaSchedaLab[]; ultimi: SedutaBreve[]; ai: QuotaPiani; test: StatoTest }

const CHIAVE_DOPO = 'athlon_train_test_dopo'
function testRimandato(): boolean {
  try {
    return globalThis.localStorage?.getItem(CHIAVE_DOPO) === '1'
  } catch {
    return false
  }
}
function ricordaRimandato() {
  try {
    globalThis.localStorage?.setItem(CHIAVE_DOPO, '1')
  } catch {
    // Senza memoria sul dispositivo la scelta vale finche' la schermata resta aperta.
  }
}

/** Si puo' comporre un altro piano questo mese? In prova non c'e' limite. */
function puoComporre(q: QuotaPiani): boolean {
  return !!q.in_prova || q.massimo - q.usate > 0
}

function Occhiello({ testo, chiaro = false }: { testo: string; chiaro?: boolean }) {
  const p = usePalette()
  return <Text style={[stili.occhiello, { color: chiaro ? '#FFA366' : p.testoSecondario }]}>{testo}</Text>
}

/** Un passo del percorso assistito: il numero (o la spunta) e due righe. */
function Passo({ n, titolo, testo, fatto = false, attivo = false, chiaro = false }: { n: number; titolo: string; testo?: string; fatto?: boolean; attivo?: boolean; chiaro?: boolean }) {
  const p = usePalette()
  const colore = chiaro ? '#fff' : p.testo
  const secondario = chiaro ? 'rgba(255,255,255,0.78)' : p.testoSecondario
  return (
    <View style={stili.passo}>
      <View style={[stili.passoNumero, fatto ? { backgroundColor: p.ok, borderColor: p.ok } : attivo ? { backgroundColor: FUOCO[1], borderColor: FUOCO[1] } : { borderColor: chiaro ? 'rgba(255,255,255,0.4)' : p.testoTerzo }]}>
        {fatto ? <Icona nome="spunta" size={16} colore="#fff" /> : <Text style={[stili.passoCifra, { color: attivo ? '#121316' : colore }]}>{n}</Text>}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[stili.passoTitolo, { color: fatto && !chiaro ? p.testoSecondario : colore }]}>{titolo}</Text>
        {testo ? <Text style={[stili.passoTesto, { color: secondario }]}>{testo}</Text> : null}
      </View>
    </View>
  )
}

/** Il primo modo, in evidenza: l'allenamento assistito, coi suoi quattro passi. */
function CartaAssistito({ quota }: { quota: QuotaPiani }) {
  const si = puoComporre(quota)
  const riga = testoQuotaPiani(quota)
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.assistito}>
      <View style={{ gap: 6 }}>
        <Occhiello chiaro testo={t('1 · ALLENAMENTO ASSISTITO', '1 · GUIDED TRAINING')} />
        <Text style={stili.assistitoTitolo} accessibilityRole="header">
          {t('Costruiamo insieme il tuo piano', 'Let’s build your plan together')}
        </Text>
        <Text style={stili.assistitoTesto}>{t('Un percorso in quattro passi. Il piano è fatto sulle tue risposte, e i chili sui tuoi massimali.', 'A four-step path. The plan is built on your answers, and the weights on your 1RMs.')}</Text>
      </View>
      <View style={{ gap: spazio.due + 4 }}>
        <Passo chiaro attivo n={1} titolo={t('Rispondi al questionario', 'Answer the questionnaire')} testo={t('Obiettivo, livello, giorni, fastidi. Una domanda per schermata.', 'Goal, level, days, aches. One question per screen.')} />
        <Passo chiaro n={2} titolo={t('Ricevi il piano e lo sistemi', 'Get your plan and adjust it')} testo={t('Lo guardi, lo modifichi e lo confermi.', 'You review it, edit it and confirm it.')} />
        <Passo chiaro n={3} titolo={t('Fai il test dei massimali', 'Take the 1RM test')} testo={t('Bastano 3 esercizi. Nel piano le percentuali diventano i tuoi chili.', '3 exercises are enough. The percentages in your plan become your own weights.')} />
        <Passo chiaro n={4} titolo={t('Ti alleni e il piano ti segue', 'You train and the plan follows you')} testo={t('Segni le serie, e i chili salgono con te.', 'You log your sets, and the weights go up with you.')} />
      </View>
      <Pulsante testo={t('Inizia dal questionario', 'Start with the questionnaire')} disabilitato={!si} onPress={() => router.push('/allenamento/agente')} />
      <Text style={stili.assistitoNota}>
        {[riga, t('Il piano lo compone un’intelligenza artificiale, con gli esercizi del club.', 'The plan is put together by an artificial intelligence, with the club’s exercises.')].filter(Boolean).join(' ')}
      </Text>
    </LinearGradient>
  )
}

/** Il secondo e il terzo modo: caricare il proprio piano, o chiederlo a un personal trainer. */
function AltriModi({ largo }: { largo: boolean }) {
  return (
    <View style={largo ? stili.fila : { gap: spazio.quattro }}>
      <View style={[{ gap: spazio.due + 2 }, largo && { flex: 1 }]}>
        <Occhiello testo={t('2 · CARICHI IL TUO PIANO', '2 · UPLOAD YOUR OWN PLAN')} />
        <Carta style={stili.elenco}>
          <Riga prima icona="fotocamera" tono="neutro" titolo={t('Carica il tuo piano', 'Upload your plan')} sotto={t('Da una foto o un PDF', 'From a photo or a PDF')} coda={<Freccia />} onPress={() => router.push('/allenamento/importa')} />
          <Riga icona="modifica" tono="neutro" titolo={t('Scrivilo tu', 'Write it yourself')} sotto={t('Parti da zero, esercizio per esercizio', 'Start from scratch, exercise by exercise')} coda={<Freccia />} onPress={() => router.push('/allenamento/nuova')} />
        </Carta>
      </View>
      <View style={[{ gap: spazio.due + 2 }, largo && { flex: 1 }]}>
        <Occhiello testo={t('3 · LO CHIEDI A UN PERSONAL TRAINER', '3 · ASK A PERSONAL TRAINER')} />
        <Carta style={stili.elenco}>
          <Riga
            prima
            icona="persona"
            tono="neutro"
            titolo={t('Prenota una seduta', 'Book a session')}
            sotto={t('Il piano te lo costruisce lui, e lo trovi qui fra i tuoi piani', 'They build the plan for you, and you’ll find it here among your plans')}
            coda={<Freccia />}
            onPress={() => router.push('/personal')}
          />
        </Carta>
      </View>
    </View>
  )
}

function Freccia() {
  const p = usePalette()
  return <Icona nome="avanti" size={16} colore={p.testoTerzo} />
}

/** Dopo il questionario: il piano c'e', e il test dei massimali e' il passo dopo. */
function Percorso({ piano, test, stato, onDopo }: { piano: RigaSchedaLab; test: StatoTest; stato: StatoTestTrain; onDopo: () => void }) {
  const p = usePalette()
  const inCorso = stato === 'in_corso'
  return (
    <View style={{ gap: spazio.tre }}>
      <View style={{ gap: 6, paddingHorizontal: spazio.uno }}>
        <Occhiello testo={t('ALLENAMENTO ASSISTITO', 'GUIDED TRAINING')} />
        <Text style={[stili.titolone, { color: p.testo }]} accessibilityRole="header">
          {t('Il tuo piano è pronto. Manca un passo.', 'Your plan is ready. One step to go.')}
        </Text>
      </View>
      <Carta style={{ gap: spazio.due + 4 }}>
        <Passo n={1} fatto titolo={t('Questionario', 'Questionnaire')} />
        <Passo n={2} fatto titolo={t(`Piano confermato: ${piano.titolo}`, `Plan confirmed: ${piano.titolo}`)} />
        <View style={[stili.passoAttivo, { borderColor: FUOCO[1], backgroundColor: p.scuro ? 'rgba(255,87,1,0.12)' : '#FFF1E8' }]}>
          <Passo
            n={3}
            attivo
            titolo={inCorso ? t('Continua il test dei massimali', 'Continue the 1RM test') : t('Fai il test dei massimali', 'Take the 1RM test')}
            testo={
              inCorso
                ? t(`Hai fatto ${test.fatti} ${test.fatti === 1 ? 'esercizio' : 'esercizi'}. Ne servono 3: uno per la parte superiore, uno per il core, uno per la parte inferiore.`, `You’ve done ${test.fatti} ${test.fatti === 1 ? 'exercise' : 'exercises'}. You need 3: one for the upper body, one for the core, one for the lower body.`)
                : t('Bastano 3 esercizi: uno per la parte superiore, uno per il core, uno per la parte inferiore. Dopo, nel tuo piano le percentuali diventano i tuoi chili.', '3 exercises are enough: one for the upper body, one for the core, one for the lower body. Afterwards, the percentages in your plan become your own weights.')
            }
          />
          <Pulsante testo={inCorso ? t('Continua il test', 'Continue the test') : t('Fai il test', 'Take the test')} onPress={() => router.push('/allenamento/test')} />
          <Tocco onPress={onDopo} ruolo="button" etichetta={t('Lo faccio dopo: inizia senza i chili', 'I’ll do it later: start without the weights')} style={stili.dopo}>
            <Text style={[stili.dopoTesto, { color: p.accento }]}>{t('Lo faccio dopo: inizia senza i chili', 'I’ll do it later: start without the weights')}</Text>
          </Tocco>
        </View>
        <Passo n={4} titolo={t('Primo allenamento', 'First workout')} />
      </Carta>
    </View>
  )
}

/** Il piano in cima: scuro per quelli dell'allenamento assistito e del trainer, chiaro per quelli caricati o scritti dalla persona. */
function PianoInCima({ s }: { s: RigaSchedaLab }) {
  const p = usePalette()
  const vasca = eDiVasca(s)
  const scuro = eAssistito(s) || s.tipo === 'personalizzata'
  const apri = () => router.push({ pathname: '/allenamento/[scheda]', params: { scheda: s.id } })
  const testo = scuro ? '#fff' : p.testo
  const secondario = scuro ? 'rgba(255,255,255,0.78)' : p.testoSecondario
  const dentro = (
    <>
      <View style={stili.pianoTesta}>
        <Text style={[stili.occhiello, { color: scuro ? '#FFA366' : p.accento, flex: 1 }]}>{t('IL TUO PIANO', 'YOUR PLAN')}</Text>
        <Tag testo={vasca ? ETICHETTA_VASCA : eAssistito(s) ? t('Assistito', 'Guided') : etichettaPiano(s)} colore={scuro ? '#121316' : p.testo} fondo={scuro ? '#FFA366' : p.incavo} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={[stili.pianoTitolo, { color: testo }]} numberOfLines={2}>
          {s.titolo}
        </Text>
        <View style={stili.pillole}>
          {s.obiettivo ? <Text style={[stili.pillola, { color: testo, backgroundColor: scuro ? 'rgba(255,255,255,0.16)' : p.incavo }]}>{s.obiettivo}</Text> : null}
          {s.livello ? <Text style={[stili.pillola, { color: testo, backgroundColor: scuro ? 'rgba(255,255,255,0.16)' : p.incavo }]}>{LIVELLI[s.livello] ?? s.livello}</Text> : null}
          <Text style={[stili.pillola, { color: testo, backgroundColor: scuro ? 'rgba(255,255,255,0.16)' : p.incavo }]}>
            {t(`${s.giorni} ${vasca ? (s.giorni === 1 ? 'seduta' : 'sedute') : s.giorni === 1 ? 'giorno' : 'giorni'}`, `${s.giorni} ${vasca ? (s.giorni === 1 ? 'session' : 'sessions') : s.giorni === 1 ? 'day' : 'days'}`)}
          </Text>
        </View>
        <Text style={[stili.pianoSotto, { color: secondario }]}>
          {vasca ? t('Si legge a bordo vasca', 'Read at the poolside') : s.ultimo ? t(`Ultimo allenamento ${quando(s.ultimo)}`, `Last workout ${quando(s.ultimo)}`) : t('Non ancora iniziato', 'Not started yet')}
        </Text>
      </View>
      <Pulsante testo={vasca ? t('Apri il piano', 'Open the plan') : t('Inizia l’allenamento', 'Start your workout')} variante={scuro ? 'primario' : 'scuro'} onPress={apri} />
    </>
  )
  return scuro ? (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.piano}>
      {dentro}
    </LinearGradient>
  ) : (
    <Carta style={{ gap: spazio.tre }}>{dentro}</Carta>
  )
}

/** Lo stato dei massimali, in una riga: solo per chi ha un piano che li usa, o un test gia' fatto. */
function RigaTest({ test, stato }: { test: StatoTest; stato: StatoTestTrain }) {
  if (stato === 'nascosto') return null
  const prossimo = giorniAlTest(test.ultimo, test.giorni)
  const voce: { icona: NomeIcona; tono: 'ok' | 'attenzione' | 'accento'; titolo: string; sotto: string } =
    stato === 'fatto'
      ? {
          icona: 'ok',
          tono: 'ok',
          titolo: t('Massimali: fatti', '1RMs: done'),
          sotto: t(`Test del ${giornoTest(test.ultimo!)}. Da rifare fra ${prossimo} ${prossimo === 1 ? 'giorno' : 'giorni'}.`, `Test on ${giornoTest(test.ultimo!)}. Retake in ${prossimo} ${prossimo === 1 ? 'day' : 'days'}.`),
        }
      : stato === 'da_rifare'
        ? {
            icona: 'aggiorna',
            tono: 'attenzione',
            titolo: t('È ora di rifare il test dei massimali', 'Time to retake the 1RM test'),
            sotto: t(`L’ultimo è del ${giornoTest(test.ultimo!)}: i chili dei piani seguono i tuoi progressi.`, `Your last one was on ${giornoTest(test.ultimo!)}: the weights in your plans follow your progress.`),
          }
        : stato === 'in_corso'
          ? {
              icona: 'grafico',
              tono: 'attenzione',
              titolo: t('Continua il test dei massimali', 'Continue the 1RM test'),
              sotto: t(`${test.fatti} ${test.fatti === 1 ? 'esercizio fatto' : 'esercizi fatti'}: ne servono 3, uno per gruppo.`, `${test.fatti} ${test.fatti === 1 ? 'exercise' : 'exercises'} done: you need 3, one per group.`),
            }
          : {
              icona: 'grafico',
              tono: 'accento',
              titolo: t('Fai il test dei massimali', 'Take the 1RM test'),
              sotto: t('Bastano 3 esercizi: nel tuo piano le percentuali diventano i tuoi chili.', '3 exercises are enough: the percentages in your plan become your own weights.'),
            }
  return (
    <Carta style={stili.elenco}>
      <Riga prima icona={voce.icona} tono={voce.tono} titolo={voce.titolo} sotto={voce.sotto} coda={<Freccia />} onPress={() => router.push('/allenamento/test')} />
    </Carta>
  )
}

/** Per chi ha solo piani caricati o scritti da se': l'invito all'allenamento assistito. */
function InvitoAssistito({ quota }: { quota: QuotaPiani }) {
  if (!puoComporre(quota)) return null
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.assistito, { gap: spazio.tre }]}>
      <Occhiello chiaro testo={t('ALLENAMENTO ASSISTITO', 'GUIDED TRAINING')} />
      <Text style={[stili.assistitoTitolo, { fontSize: 19, lineHeight: 24 }]}>{t('Vuoi un piano fatto su di te, con i chili calcolati?', 'Want a plan built around you, with the weights worked out?')}</Text>
      <Text style={stili.assistitoTesto}>{t('Rispondi al questionario, ricevi il piano e fai il test dei massimali: bastano 3 esercizi.', 'Answer the questionnaire, get your plan and take the 1RM test: 3 exercises are enough.')}</Text>
      <Pulsante testo={t('Inizia dal questionario', 'Start with the questionnaire')} piccolo onPress={() => router.push('/allenamento/agente')} />
    </LinearGradient>
  )
}

/** Gli altri piani della persona, e i modi per averne un altro (chiusi finche' non si toccano, se ci sono gia' altri piani da mostrare). */
function AltriPiani({ altri, quota }: { altri: RigaSchedaLab[]; quota: QuotaPiani }) {
  const [aperto, setAperto] = useState(false)
  const mostra = aperto || !altri.length
  const riga = testoQuotaPiani(quota)
  return (
    <Sezione titolo={altri.length ? t('Gli altri tuoi piani', 'Your other plans') : t('Un altro piano', 'Another plan')} conteggio={altri.length || undefined}>
      <Carta style={stili.elenco}>
        {altri.map((s, i) => (
          <Riga
            key={s.id}
            prima={i === 0}
            icona={eDiVasca(s) ? 'goccia' : 'peso'}
            tono="neutro"
            titolo={s.titolo}
            sotto={eDiVasca(s) ? ETICHETTA_VASCA : eAssistito(s) ? t('Assistito', 'Guided') : etichettaPiano(s)}
            coda={<Freccia />}
            onPress={() => router.push({ pathname: '/allenamento/[scheda]', params: { scheda: s.id } })}
          />
        ))}
        {altri.length ? (
          <Riga icona={aperto ? 'meno' : 'piu'} tono="accento" titolo={t('Un altro piano', 'Another plan')} sotto={t('Assistito, caricato da te o del personal trainer', 'Guided, uploaded by you or from a personal trainer')} onPress={() => setAperto((v) => !v)} />
        ) : null}
        {mostra ? (
          <>
            <Riga
              prima={!altri.length}
              icona="peso"
              tono="neutro"
              titolo={t('Allenamento assistito', 'Guided training')}
              sotto={puoComporre(quota) ? t('Questionario, piano e test dei massimali', 'Questionnaire, plan and 1RM test') : (riga ?? '')}
              coda={puoComporre(quota) ? <Freccia /> : undefined}
              onPress={puoComporre(quota) ? () => router.push('/allenamento/agente') : undefined}
            />
            <Riga icona="fotocamera" tono="neutro" titolo={t('Carica il tuo piano', 'Upload your plan')} sotto={t('Da una foto o un PDF', 'From a photo or a PDF')} coda={<Freccia />} onPress={() => router.push('/allenamento/importa')} />
            <Riga icona="modifica" tono="neutro" titolo={t('Scrivilo tu', 'Write it yourself')} sotto={t('Parti da zero, esercizio per esercizio', 'Start from scratch, exercise by exercise')} coda={<Freccia />} onPress={() => router.push('/allenamento/nuova')} />
            <Riga icona="persona" tono="neutro" titolo={t('Chiedilo a un personal trainer', 'Ask a personal trainer')} sotto={t('Prenota una seduta: il piano te lo costruisce lui', 'Book a session: they build the plan for you')} coda={<Freccia />} onPress={() => router.push('/personal')} />
          </>
        ) : null}
      </Carta>
    </Sezione>
  )
}

function UltimiAllenamenti({ ultimi }: { ultimi: SedutaBreve[] }) {
  return (
    <Sezione titolo={t('Ultimi allenamenti', 'Recent workouts')} destra={<LinkSezione testo={t('Storico e progressi', 'History and progress')} onPress={() => router.push('/allenamento/storico')} />}>
      <Carta style={stili.elenco}>
        {ultimi.length ? (
          ultimi.map((a, i) => (
            <Riga
              key={a.id}
              prima={i === 0}
              icona={a.fine ? 'bandiera' : 'cronometro'}
              tono={a.fine ? 'ok' : 'attenzione'}
              titolo={[a.titolo, a.giorno_nome].filter(Boolean).join(' · ') || t('Allenamento', 'Workout')}
              sotto={t(`${quando(a.inizio)} · ${a.serie} serie${a.fine ? '' : ' · non chiuso'}`, `${quando(a.inizio)} · ${a.serie} ${a.serie === 1 ? 'set' : 'sets'}${a.fine ? '' : ' · not finished'}`)}
            />
          ))
        ) : (
          <Riga prima icona="cronometro" tono="neutro" titolo={t('Nessun allenamento registrato', 'No workouts logged')} sotto={t('Apri un piano e premi «Inizia l’allenamento».', 'Open a plan and tap “Start workout”.')} />
        )}
      </Carta>
    </Sezione>
  )
}

/**
 * «Altro in Train»: quello che non e' il piano. In ordine: i consigli sulle lezioni (in evidenza, con la spiegazione), le calorie,
 * gli allenamenti fatti fuori dal club, e il movimento che arriva dai dispositivi (c'e' solo se ci sono dati).
 */
function AltroInTrain({ disp, largo }: { disp: Dispositivi; largo: boolean }) {
  const p = usePalette()
  return (
    <Sezione titolo={t('Altro in Train', 'More in Train')}>
      <View style={largo ? stili.fila : { gap: spazio.tre }}>
        <Tocco onPress={() => router.push('/allenamento/consigli')} etichetta={t('Consigli sulle lezioni e sugli allenamenti da seguire', 'Tips on classes and workouts to follow')} scala={0.985} style={largo ? { flex: 1 } : undefined}>
          <View style={[stili.voce, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }, largo && { flex: 1 }]}>
            <LinearGradient colors={FUOCO} style={stili.voceIcona}>
              <Icona nome="stella" size={24} colore="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[stili.voceTitolo, { color: p.testo }]}>{t('Consigli sulle lezioni', 'Class tips')}</Text>
              <Text style={[stili.voceTesto, { color: p.testoSecondario }]}>{t('Le lezioni e gli allenamenti da seguire, in base alle tue preferenze e ai tuoi obiettivi.', 'The classes and workouts to follow, based on your preferences and goals.')}</Text>
            </View>
            <Freccia />
          </View>
        </Tocco>
        <Tocco onPress={() => router.push('/allenamento/calorie')} etichetta={t('Le tue calorie: il contatore di allenamenti e lezioni', 'Your calories: the workout and class counter')} scala={0.985} style={largo ? { flex: 1 } : undefined}>
          <View style={[stili.voce, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }, largo && { flex: 1 }]}>
            <Bollino icona="fiamma" tono="accento" size={46} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[stili.voceTitolo, { color: p.testo }]}>{t('Le tue calorie', 'Your calories')}</Text>
              <Text style={[stili.voceTesto, { color: p.testoSecondario }]}>{t('Gli allenamenti che chiudi e le lezioni a cui vieni, giorno per giorno.', 'The workouts you finish and the classes you attend, day by day.')}</Text>
            </View>
            <Freccia />
          </View>
        </Tocco>
      </View>
      <AggiungiAllenamento disp={disp} compatto />
      <CartaMovimento disp={disp} />
    </Sezione>
  )
}

export function AreaTrain({ dati, largo, disp }: { dati: Dati; largo: boolean; disp: Dispositivi }) {
  const p = usePalette()
  const [rimandato, setRimandato] = useState(testRimandato)
  const stato = statoTrain(dati.schede, dati.test, rimandato)
  const dopo = () => {
    ricordaRimandato()
    setRimandato(true)
  }

  return (
    <>
      {stato.fase === 'vuoto' ? (
        <>
          <Entra indice={0}>
            <View style={{ gap: 6, paddingHorizontal: spazio.uno }}>
              <Text style={[stili.titolone, { color: p.testo }]} accessibilityRole="header">
                {t('Il tuo piano di allenamento', 'Your workout plan')}
              </Text>
              <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t('I 3 modi per avere il tuo piano di allenamento.', 'The 3 ways to get your workout plan.')}</Text>
            </View>
          </Entra>
          <Entra indice={1}>
            <CartaAssistito quota={dati.ai} />
          </Entra>
          <Entra indice={2}>
            <AltriModi largo={largo} />
          </Entra>
        </>
      ) : stato.fase === 'percorso' ? (
        <>
          <Entra indice={0}>
            <Percorso piano={stato.delPercorso!} test={dati.test} stato={stato.test} onDopo={dopo} />
          </Entra>
          <Entra indice={1}>
            <PianoInCima s={stato.principale!} />
          </Entra>
          <Entra indice={2}>
            <AltriPiani altri={stato.altri} quota={dati.ai} />
          </Entra>
        </>
      ) : (
        <>
          <Entra indice={0}>
            <PianoInCima s={stato.principale!} />
          </Entra>
          {stato.test !== 'nascosto' ? (
            <Entra indice={1}>
              <RigaTest test={dati.test} stato={stato.test} />
            </Entra>
          ) : null}
          {stato.invitoAssistito ? (
            <Entra indice={1}>
              <InvitoAssistito quota={dati.ai} />
            </Entra>
          ) : null}
          <UltimiAllenamenti ultimi={dati.ultimi} />
          <AltriPiani altri={stato.altri} quota={dati.ai} />
        </>
      )}
      <AltroInTrain disp={disp} largo={largo} />
    </>
  )
}

const stili = StyleSheet.create({
  occhiello: { fontFamily: F.extra, fontSize: 12, letterSpacing: 1.3 },
  titolone: { fontFamily: F.extra, fontSize: 28, lineHeight: 33, letterSpacing: -0.7 },
  sotto: { fontFamily: F.medio, fontSize: 15, lineHeight: 22 },
  fila: { flexDirection: 'row', gap: spazio.tre, alignItems: 'stretch' },
  elenco: { paddingVertical: spazio.due },
  assistito: { borderRadius: 28, padding: spazio.quattro, gap: spazio.quattro },
  assistitoTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 23, lineHeight: 28, letterSpacing: -0.5 },
  assistitoTesto: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  assistitoNota: { color: 'rgba(255,255,255,0.72)', fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  passo: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre },
  passoNumero: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  passoCifra: { fontFamily: F.extra, fontSize: 14 },
  passoTitolo: { fontFamily: F.bold, fontSize: 15, lineHeight: 20, marginTop: 4 },
  passoTesto: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  passoAttivo: { borderWidth: 2, borderRadius: 22, padding: spazio.tre, gap: spazio.tre },
  dopo: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dopoTesto: { fontFamily: F.bold, fontSize: 13.5 },
  piano: { borderRadius: 28, padding: spazio.quattro, gap: spazio.tre },
  pianoTesta: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  pianoTitolo: { fontFamily: F.extra, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
  pianoSotto: { fontFamily: F.semi, fontSize: 13 },
  pillole: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillola: { fontFamily: F.bold, fontSize: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  voce: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre + 2, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth },
  voceIcona: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  voceTitolo: { fontFamily: F.extra, fontSize: 16.5, letterSpacing: -0.3 },
  voceTesto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
