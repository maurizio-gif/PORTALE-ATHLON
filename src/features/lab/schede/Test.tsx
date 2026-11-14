import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { salvaTestMassimale, testMassimali, type CoperturaTest, type EsercizioTest } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { dimentica } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Etichetta, Messaggio, Numero, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette, velo } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { kg as formatoKg, giornoTest, stimaMassimale } from './comune'
import { MediaEsercizio } from './MediaEsercizio'
import { daCopertura, GRUPPI_CON_SECONDO_CONSIGLIATO, secondoConsigliato, statoMinimo, type GruppoTest, type StatoMinimo } from './minimoTest'

// Il test dei massimali (16/10/2026): pochi esercizi per la parte superiore,
// il core e la parte inferiore. A carico si scrive il peso e quante
// ripetizioni pulite si sono fatte (fra 4 e 10, al massimo 12), e il
// massimale si stima in modo indiretto; a corpo libero le ripetizioni
// massime; a tempo (il plank, 04/11/2026) i secondi di tenuta. Da quel momento, nelle schede, le percentuali diventano chili.
// **Quanti ne servono** (04/11/2026): per i chili basta un esercizio per gruppo (3); per controllare che i conti tornino, due per la parte superiore e
// due per l'inferiore, piu' il plank (5). Il server dice a che punto si e' (`copertura`) e quando due test non tornano fra loro.
// **Il minimo si vede** (11/11/2026, richiesta di Maurizio: «spiegare in maniera molto piu' chiara il numero minimo», e «tutti e tre fatti» quando
// c'e'): in cima un riquadro con i tre gruppi, ognuno con il suo cerchio che diventa una spunta verde, e «2 di 3». Raggiunto il minimo il riquadro
// dice «Tutti e tre fatti» e che gli altri esercizi sono facoltativi (rendono i chili piu' precisi). Sotto ogni gruppo una pillola: «Da fare:
// scegline uno» o «Minimo fatto»; gli esercizi in piu' di un gruppo gia' fatto sono «Facoltativo», non piu' «Consigliato» (che su tutti e sette
// faceva sembrare obbligatori tutti e sette). Lo stato viene da `minimoTest.ts` (puro, `scripts/prova-minimo-test.ts`).
// **Il secondo esercizio delle gambe e' «Consigliato»** (11/11/2026, deciso da Maurizio): fatto uno dei due della parte inferiore, l'altro non e'
// «Facoltativo» ma «Consigliato», perche' i due test delle gambe sono quelli che piu' spesso non tornano fra loro (`secondoConsigliato`). Il
// minimo resta tre, e «Tutti e tre fatti» non cambia: sotto, una riga invita a fare anche l'altro.

const GRUPPI: { chiave: EsercizioTest['test_gruppo']; titolo: string }[] = [
  { chiave: 'superiore', titolo: t('Parte superiore del corpo', 'Upper body') },
  { chiave: 'core', titolo: 'Core' },
  { chiave: 'inferiore', titolo: t('Parte inferiore del corpo', 'Lower body') },
]

function risultato(e: EsercizioTest): string | null {
  if (!e.ultimo) return null
  return e.test === 'carico'
    ? t(`Massimale ${formatoKg(e.ultimo.massimale)} kg (${e.ultimo.ripetizioni} × ${formatoKg(e.ultimo.kg ?? 0)} kg)`, `1RM ${formatoKg(e.ultimo.massimale)} kg (${e.ultimo.ripetizioni} × ${formatoKg(e.ultimo.kg ?? 0)} kg)`)
    : e.test === 'secondi'
      ? t(`${e.ultimo.ripetizioni} secondi`, `${e.ultimo.ripetizioni} seconds`)
      : t(`${e.ultimo.ripetizioni} ripetizioni`, `${e.ultimo.ripetizioni} reps`)
}

/** I nomi dei gruppi nel riquadro del minimo (corti: stanno in tre colonne), e come si dicono in «ti manca…». */
const NOME_BREVE: Record<GruppoTest, string> = {
  superiore: t('Parte superiore', 'Upper body'),
  core: 'Core',
  inferiore: t('Parte inferiore', 'Lower body'),
}
const NOME_IN_FRASE: Record<GruppoTest, string> = {
  superiore: t('la parte superiore', 'the upper body'),
  core: t('il core', 'the core'),
  inferiore: t('la parte inferiore', 'the lower body'),
}

/** «a», «a e b», «a, b e c». */
function inFila(voci: string[]): string {
  if (voci.length <= 1) return voci[0] ?? ''
  return `${voci.slice(0, -1).join(', ')} ${t('e', 'and')} ${voci[voci.length - 1]}`
}

/** «Tutti e tre fatti» coi tre gruppi di oggi; se un giorno i gruppi cambiano, una frase che non dice un numero sbagliato. */
function titoloRaggiunto(totale: number): string {
  return totale === 3 ? t('Tutti e tre fatti', 'All three done') : t('Minimo fatto', 'Minimum done')
}

type NotaGruppo = { pillola: string; tono: 'ok' | 'attenzione'; testo: string | null }

/**
 * Cosa dire sotto un gruppo del test (04/11/2026, riscritto l'11/11/2026): prima se il minimo del gruppo c'e' (un esercizio), poi, per chi ne fa
 * di piu', se i test tornano fra loro. `fatto` viene dall'elenco degli esercizi, `c` dal server (puo' mancare).
 */
function notaGruppo(chiave: GruppoTest, c: CoperturaTest | null, fatto: boolean, quanti: number, fatti: number): NotaGruppo {
  if (!fatto) {
    if (quanti > 1 && GRUPPI_CON_SECONDO_CONSIGLIATO.includes(chiave)) {
      return { pillola: t('Da fare: scegline uno', 'To do: pick one'), tono: 'attenzione', testo: t('Per il minimo ne basta uno, quello che preferisci. Ti consigliamo di fare poi anche l’altro.', 'One is enough for the minimum, whichever you prefer. We recommend doing the other one too afterwards.') }
    }
    return quanti > 1
      ? { pillola: t('Da fare: scegline uno', 'To do: pick one'), tono: 'attenzione', testo: t('Per il minimo ne basta uno, quello che preferisci. Gli altri sono facoltativi.', 'One is enough for the minimum, whichever you prefer. The others are optional.') }
      : { pillola: t('Da fare', 'To do'), tono: 'attenzione', testo: null }
  }
  if (quanti <= 1 || chiave === 'core') return { pillola: t('Fatto', 'Done'), tono: 'ok', testo: null }
  switch (c?.gruppi[chiave]?.stato) {
    case 'verificata':
      return { pillola: t('Minimo fatto e controllato', 'Minimum done and checked'), tono: 'ok', testo: t('I tuoi test di questo gruppo tornano fra loro.', 'Your tests in this group match each other.') }
    case 'discordante':
      return {
        pillola: t('Da ricontrollare', 'Needs a recheck'),
        tono: 'attenzione',
        testo: t('I test non tornano fra loro: per i chili usiamo il più prudente. Rifanne uno', 'Your tests don’t match: we use the more cautious one for your weights. Retake one'),
      }
    default:
      if (secondoConsigliato(chiave, fatti, quanti)) {
        return { pillola: t('Minimo fatto', 'Minimum done'), tono: 'ok', testo: t('Consigliato: fai anche l’altro esercizio. Con uno solo i chili delle gambe sono i meno sicuri, con due li controlliamo.', 'Recommended: do the other exercise too. With just one, your leg weights are the least certain; with two we can check them.') }
      }
      return { pillola: t('Minimo fatto', 'Minimum done'), tono: 'ok', testo: t('Facoltativo: con un altro esercizio di questo gruppo controlliamo che i chili tornino.', 'Optional: with another exercise from this group we can check your weights add up.') }
  }
}

/**
 * Il minimo del test, in vista (11/11/2026): tre cerchi, uno per gruppo, che diventano spunte verdi. Finche' non e' raggiunto dice quanti ne
 * mancano e quali; raggiunto, dice «Tutti e tre fatti» e che gli altri esercizi sono facoltativi.
 */
function RiquadroMinimo({ stato, esercizi }: { stato: StatoMinimo; esercizi: number }) {
  const p = usePalette()
  if (!stato.totale) return null
  const titolo = stato.raggiunto ? titoloRaggiunto(stato.totale) : t(`Il minimo: ${stato.totale} esercizi`, `The minimum: ${stato.totale} exercises`)
  const conteggio = t(`${stato.fatti} di ${stato.totale}`, `${stato.fatti} of ${stato.totale}`)
  // Gli esercizi non fatti si dividono in consigliati (il secondo delle gambe) e facoltativi: i primi hanno la loro riga, qui si dicono i secondi.
  const facoltativi = stato.altri - stato.consigliati
  const altriDetti =
    facoltativi > 0
      ? stato.consigliati > 0
        ? t(
            `${facoltativi === 1 ? 'L’altro esercizio è facoltativo' : `Gli altri ${facoltativi} sono facoltativi`}: con più test i calcoli sono più accurati.`,
            `The other ${facoltativi === 1 ? 'exercise is' : `${facoltativi} are`} optional: more tests make the numbers more accurate.`,
          )
        : t(
            `Vuoi chili più precisi? Fai anche ${facoltativi === 1 ? 'l’altro esercizio' : `gli altri ${facoltativi}`}: non è obbligatorio, ma con più test i calcoli sono più accurati.`,
            `Want more precise weights? Do the other ${facoltativi === 1 ? 'exercise' : `${facoltativi}`} too: it isn’t required, but more tests make the numbers more accurate.`,
          )
      : stato.consigliati > 0
        ? null
        : t('Hai fatto anche tutti gli altri: i tuoi chili sono i più precisi che possiamo calcolare.', 'You’ve done all the others too: your weights are as precise as we can make them.')
  return (
    <Carta style={[{ gap: spazio.tre }, stato.raggiunto && { borderColor: velo(p, 'ok', 0.55) }]}>
      <View style={{ gap: 4 }}>
        <View style={stili.minimoTesta}>
          {stato.raggiunto ? <Icona nome="ok" size={24} colore={p.ok} /> : null}
          <Text style={[stili.minimoTitolo, { color: p.testo }]} accessibilityRole="header">
            {titolo}
          </Text>
          <Etichetta testo={conteggio} tono={stato.raggiunto ? 'ok' : 'neutro'} icona={stato.raggiunto ? 'spunta' : undefined} grande />
        </View>
        {stato.raggiunto ? null : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              `Uno per gruppo, quello che preferisci: su ${esercizi} esercizi ne bastano ${stato.totale} per avere i tuoi chili nei piani.`,
              `One per group, whichever you prefer: out of ${esercizi} exercises, ${stato.totale} are enough to get your own weights in your plans.`,
            )}
          </Text>
        )}
      </View>

      <View style={stili.minimoPassi}>
        {stato.passi.map((passo, i) => (
          <View
            key={passo.gruppo}
            accessible
            accessibilityLabel={`${NOME_BREVE[passo.gruppo]}: ${passo.fatto ? t('fatto', 'done') : t('da fare', 'to do')}`}
            style={[stili.minimoPasso, { backgroundColor: passo.fatto ? velo(p, 'ok') : p.incavo }]}
          >
            <View style={[stili.minimoCerchio, passo.fatto ? { backgroundColor: p.ok, borderColor: p.ok } : { borderColor: p.testoTerzo }]}>
              {passo.fatto ? <Icona nome="spunta" size={20} colore="#fff" /> : <Text style={[stili.minimoNumero, { color: p.testoSecondario }]}>{i + 1}</Text>}
            </View>
            {/* Due righe riservate al nome: «Parte superiore» va a capo, «Core» no, e «Fatto» deve stare alla stessa altezza nei tre. */}
            <View style={stili.minimoNomeRiga}>
              <Text style={[stili.minimoNome, { color: p.testo }]}>{NOME_BREVE[passo.gruppo]}</Text>
            </View>
            <Text style={[stili.minimoStato, { color: passo.fatto ? p.ok : p.testoSecondario }]}>{passo.fatto ? t('Fatto', 'Done') : t('Da fare', 'To do')}</Text>
          </View>
        ))}
      </View>

      {stato.raggiunto ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.nota, { color: p.testo }]}>
            {t('Hai fatto il minimo: nei tuoi piani le percentuali sono diventate i tuoi chili.', 'You’ve done the minimum: the percentages in your plans have become your own weights.')}
          </Text>
          {stato.consigliati > 0 ? (
            <Text style={[stili.nota, { color: p.testo }]}>
              <Text style={{ fontFamily: F.bold, color: p.accento }}>{t('Consigliato: ', 'Recommended: ')}</Text>
              {t(
                'fai anche l’altro esercizio delle gambe. Con uno solo i chili delle gambe sono i meno sicuri, con due li controlliamo.',
                'do the other leg exercise too. With just one, your leg weights are the least certain; with two we can check them.',
              )}
            </Text>
          ) : null}
          {altriDetti ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{altriDetti}</Text> : null}
        </View>
      ) : stato.fatti > 0 ? (
        <Text style={[stili.nota, { color: p.testo }]}>
          {t(`Ti manca: ${inFila(stato.mancano.map((g) => NOME_IN_FRASE[g]))}.`, `Still to do: ${inFila(stato.mancano.map((g) => NOME_IN_FRASE[g]))}.`)}
        </Text>
      ) : null}
    </Carta>
  )
}

function FoglioTest({ e, minimoGiaFatto, gambe, onChiudi, onSalvato }: { e: EsercizioTest | null; /** Il minimo c'era gia' prima di questo test. */ minimoGiaFatto: boolean; /** Quanti esercizi della parte inferiore ci sono nel test. */ gambe: number; onChiudi: () => void; onSalvato: () => void }) {
  const p = usePalette()
  const [peso, setPeso] = useState('')
  const [rip, setRip] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [fatto, setFatto] = useState<number | null>(null)
  // Dopo il salvataggio: i test di questo distretto non tornano fra loro (04/11/2026).
  const [discordante, setDiscordante] = useState(false)
  // Dopo il salvataggio: a che punto e' il minimo (11/11/2026). `appena`: l'ha raggiunto con questo test.
  const [minimo, setMinimo] = useState<{ fatti: number; totale: number; raggiunto: boolean; mancano: GruppoTest[]; appena: boolean; consigliaGambe: boolean } | null>(null)

  useEffect(() => {
    setPeso(e?.ultimo?.kg ? String(e.ultimo.kg).replace('.', t(',', '.')) : '')
    setRip('')
    setErrore(null)
    setFatto(null)
    setDiscordante(false)
    setMinimo(null)
  }, [e])

  if (!e) return <Foglio aperto={false} titolo="" onChiudi={onChiudi}>{null}</Foglio>
  const carico = e.test === 'carico'
  // Il plank: si misura in secondi di tenuta, non in ripetizioni.
  const tempo = e.test === 'secondi'
  const kg = Number(peso.replace(',', '.'))
  const r = Number(rip)
  const anteprima = carico && kg > 0 && r >= 1 && r <= 12 ? stimaMassimale(kg, r) : null

  async function salva() {
    if (!e) return
    setErrore(null)
    setInCorso(true)
    const esito = await salvaTestMassimale(e.id, carico ? kg : null, r)
    setInCorso(false)
    if (!esito.ok) {
      colpetto('errore')
      return setErrore(esito.errore)
    }
    colpetto('ok')
    setFatto(esito.massimale)
    setDiscordante(!!esito.copertura?.discordanti.some((d) => d === e.test_gruppo))
    const m = daCopertura(esito.copertura)
    setMinimo(m ? { ...m, appena: m.raggiunto && !minimoGiaFatto, consigliaGambe: secondoConsigliato('inferiore', esito.copertura?.gruppi.inferiore?.fatti ?? 0, gambe) } : null)
    onSalvato()
  }

  return (
    <Foglio tastiera aperto={!!e} titolo={e.nome} sottotitolo={carico ? t('Test a carico: peso e ripetizioni', 'Weighted test: weight and reps') : tempo ? t('Test a tempo: secondi di tenuta', 'Timed test: seconds held') : t('Test a corpo libero: ripetizioni massime', 'Bodyweight test: max reps')} onChiudi={onChiudi}>
      <View style={{ gap: spazio.tre }}>
        <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.media} />
        <View style={[stili.istruzioni, { backgroundColor: p.incavo }]}>
          {(carico
            ? [
                t('Riscaldati con due serie leggere: una da 10 e una da 6 ripetizioni.', 'Warm up with two light sets: one of 10 reps and one of 6.'),
                t(
                  'Poi scegli un peso con cui riesci a fare fra 4 e 10 ripetizioni pulite, e fanne quante puoi finché la tecnica regge.',
                  'Then choose a weight you can lift for 4 to 10 clean reps, and do as many as you can while your form holds.',
                ),
                t('Scrivi il peso e le ripetizioni: calcoliamo il tuo massimale.', 'Enter the weight and reps: we’ll work out your 1RM.'),
              ]
            : tempo
              ? [
                  t('Mettiti sugli avambracci, con il corpo in linea dalla testa ai talloni e l’addome attivo.', 'Get onto your forearms, body in line from head to heels, abs engaged.'),
                  t('Tieni la posizione finché la tecnica regge: fermati appena i fianchi scendono o salgono.', 'Hold the position while your form holds: stop as soon as your hips sag or rise.'),
                  t('Scrivi per quanti secondi l’hai tenuta.', 'Enter how many seconds you held it.'),
                ]
              : [
                  t('Fai più ripetizioni che puoi, in modo controllato e senza lunghe pause.', 'Do as many reps as you can, under control and without long pauses.'),
                  t('Fermati quando la tecnica non regge più, e scrivi quante ne hai fatte.', 'Stop when your form breaks down, and enter how many you did.'),
                ]
          ).map((riga, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
              <Text style={[stili.passo, { color: p.accento }]}>{i + 1}</Text>
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{riga}</Text>
            </View>
          ))}
        </View>

        {fatto != null ? (
          <Carta style={{ alignItems: 'center', gap: spazio.due }}>
            <Icona nome="ok" size={30} colore={p.ok} />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{carico ? t('Il tuo massimale stimato', 'Your estimated 1RM') : tempo ? t('La tua tenuta massima', 'Your max hold') : t('Le tue ripetizioni massime', 'Your max reps')}</Text>
            <Numero valore={carico ? formatoKg(fatto) : String(fatto)} unita={carico ? 'kg' : tempo ? t('secondi', 'seconds') : t('ripetizioni', 'reps')} size={40} colore={p.accento} />
            {discordante ? (
              <Messaggio tono="attenzione">
                {t(
                  'I tuoi test di questo gruppo non tornano fra loro: per i chili usiamo il più prudente. Rifai quello che ti sembra sbagliato.',
                  'Your tests in this group don’t match each other: we use the more cautious one for your weights. Retake the one that seems off.',
                )}
              </Messaggio>
            ) : null}
            {minimo?.appena ? (
              <Messaggio tono="ok" titolo={titoloRaggiunto(minimo.totale)}>
                {minimo.consigliaGambe
                  ? t(
                      'Hai fatto il minimo: nei tuoi piani le percentuali diventano i tuoi chili. Ti consigliamo di fare anche l’altro esercizio delle gambe: con due controlliamo che i chili tornino. Gli altri sono facoltativi.',
                      'You’ve done the minimum: the percentages in your plans become your own weights. We recommend doing the other leg exercise too: with two we can check your weights add up. The others are optional.',
                    )
                  : t(
                      'Hai fatto il minimo: nei tuoi piani le percentuali diventano i tuoi chili. Gli altri esercizi sono facoltativi: con più test i calcoli sono più accurati.',
                      'You’ve done the minimum: the percentages in your plans become your own weights. The other exercises are optional: more tests make the numbers more accurate.',
                    )}
              </Messaggio>
            ) : minimo && !minimo.raggiunto ? (
              <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
                {t(
                  `Minimo: ${minimo.fatti} di ${minimo.totale}. Ti manca: ${inFila(minimo.mancano.map((g) => NOME_IN_FRASE[g]))}.`,
                  `Minimum: ${minimo.fatti} of ${minimo.totale}. Still to do: ${inFila(minimo.mancano.map((g) => NOME_IN_FRASE[g]))}.`,
                )}
              </Text>
            ) : null}
            <Pulsante testo={t('Fatto', 'Done')} variante="secondario" onPress={onChiudi} />
          </Carta>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spazio.due }}>
              {carico ? (
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('PESO (KG)', 'WEIGHT (KG)')}</Text>
                  <TextInput
                    value={peso}
                    onChangeText={(v) => setPeso(v.replace(/[^\d.,]/g, '').slice(0, 6))}
                    keyboardType="decimal-pad"
                    placeholder={t('es. 40', 'e.g. 40')}
                    placeholderTextColor={p.testoTerzo}
                    style={[stili.input, { color: p.testo, backgroundColor: p.incavo }]}
                    accessibilityLabel={t('Peso usato, in chili', 'Weight used, in kilos')}
                  />
                </View>
              ) : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{tempo ? t('SECONDI', 'SECONDS') : t('RIPETIZIONI', 'REPS')}</Text>
                <TextInput
                  value={rip}
                  onChangeText={(v) => setRip(v.replace(/[^\d]/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  placeholder={carico ? t('da 4 a 10', '4 to 10') : tempo ? t('es. 45', 'e.g. 45') : t('es. 20', 'e.g. 20')}
                  placeholderTextColor={p.testoTerzo}
                  style={[stili.input, { color: p.testo, backgroundColor: p.incavo }]}
                  accessibilityLabel={tempo ? t('Secondi di tenuta', 'Seconds held') : t('Ripetizioni fatte', 'Reps done')}
                />
              </View>
            </View>
            {carico && r > 12 ? (
              <Messaggio tono="attenzione">
                {t('Oltre 12 ripetizioni la stima non è affidabile: aumenta il peso, recupera due minuti e rifai la serie.', 'Beyond 12 reps the estimate isn’t reliable: increase the weight, rest two minutes and redo the set.')}
              </Messaggio>
            ) : anteprima ? (
              <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
                {t('Massimale stimato: ', 'Estimated 1RM: ')}<Text style={{ fontFamily: F.extra, color: p.testo }}>{formatoKg(anteprima)} kg</Text>
              </Text>
            ) : null}
            {errore ? <Messaggio>{errore}</Messaggio> : null}
            <Pulsante testo={t('Salva il risultato', 'Save the result')} icona="spunta" onPress={salva} inCorso={inCorso} disabilitato={!r || (carico && (!kg || r > 12))} />
          </>
        )}
      </View>
    </Foglio>
  )
}

export function Test() {
  const p = usePalette()
  const [dati, setDati] = useState<{ esercizi: EsercizioTest[]; ultimo: string | null; giorni: number; copertura: CoperturaTest | null } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [aperti, setAperti] = useState<Record<string, boolean>>({ superiore: true, core: true, inferiore: true })
  const [scelto, setScelto] = useState<EsercizioTest | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await testMassimali()
    if (r.ok) setDati({ esercizi: r.esercizi, ultimo: r.ultimo, giorni: r.giorni, copertura: r.copertura })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  if (!dati) {
    return (
      <Schermata sopratitolo="Train" titolo={t('Test dei massimali', '1RM test')} indietro="/allenamento" barra={false}>
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }

  const fatti = dati.esercizi.filter((e) => e.ultimo).length
  const minimo = statoMinimo(dati.esercizi)
  return (
    <Schermata sopratitolo="Train" titolo={t('Test dei massimali', '1RM test')} indietro="/allenamento" barra={false}>
      <RiquadroMinimo stato={minimo} esercizi={dati.esercizi.length} />

      <View style={{ gap: spazio.tre }}>
        {[
          t(
            'Sugli esercizi a carico usa un peso con cui fai fra 4 e 10 ripetizioni pulite: da peso e ripetizioni calcoliamo il tuo massimale.',
            'For weighted exercises use a weight you can lift for 4 to 10 clean reps: from weight and reps we work out your 1RM.',
          ),
          t(
            `Dopo il test, nei piani le percentuali diventano i tuoi chili. Rifallo ogni ${Math.round(dati.giorni / 7)} settimane.`,
            `After the test, the percentages in your plans become your own weights. Retake it every ${Math.round(dati.giorni / 7)} weeks.`,
          ),
        ].map((riga, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
            <Icona nome="info" size={20} colore={p.blu} />
            <Text style={[stili.consiglio, { color: p.testo, flex: 1 }]}>{riga}</Text>
          </View>
        ))}
        <Text style={[stili.piccola, { color: p.testoSecondario }]}>
          {dati.ultimo
            ? t(`${fatti} di ${dati.esercizi.length} esercizi fatti · ultimo test ${giornoTest(dati.ultimo)}`, `${fatti} of ${dati.esercizi.length} exercises done · last test ${giornoTest(dati.ultimo)}`)
            : t(`${dati.esercizi.length} esercizi in tutto: a farli tutti serve una quindicina di minuti`, `${dati.esercizi.length} exercises in all: doing them all takes about fifteen minutes`)}
        </Text>
      </View>

      {GRUPPI.map((g, gi) => {
        const qui = dati.esercizi.filter((e) => e.test_gruppo === g.chiave)
        if (!qui.length) return null
        const aperto = aperti[g.chiave]
        const fattoQui = qui.some((e) => e.ultimo)
        const fattiQui = qui.filter((e) => e.ultimo).length
        const nota = notaGruppo(g.chiave, dati.copertura, fattoQui, qui.length, fattiQui)
        const consigliato = secondoConsigliato(g.chiave, fattiQui, qui.length)
        return (
          <View key={g.chiave} style={{ gap: spazio.due }}>
            <Tocco onPress={() => setAperti((a) => ({ ...a, [g.chiave]: !aperto }))} etichetta={g.titolo} stato={{ selected: aperto }} style={stili.gruppo}>
              <Text style={[stili.gruppoTitolo, { color: p.testo }]}>{g.titolo}</Text>
              <Text style={[stili.piccola, { color: p.testoTerzo }]}>{`${qui.filter((e) => e.ultimo).length}/${qui.length}`}</Text>
              <Icona nome={aperto ? 'meno' : 'piu'} size={18} colore={p.testoSecondario} />
            </Tocco>
            <View style={stili.notaGruppo}>
              <Etichetta testo={nota.pillola} tono={nota.tono} icona={nota.tono === 'ok' ? 'spunta' : undefined} />
              {nota.testo ? <Text style={[stili.piccola, { color: nota.tono === 'attenzione' && fattoQui ? p.attenzione : p.testoSecondario, flexShrink: 1 }]}>{nota.testo}</Text> : null}
            </View>
            {aperto ? (
              <Carta style={{ paddingVertical: spazio.uno, paddingHorizontal: spazio.tre }}>
                {qui.map((e, i) => (
                  <Entra key={e.id} indice={gi + i}>
                    <Tocco onPress={() => setScelto(e)} etichetta={t(`Test: ${e.nome}`, `Test: ${e.nome}`)} scala={0.99} style={[stili.riga, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
                      <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.miniatura} ferma />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[stili.nome, { color: p.testo }]}>{e.nome}</Text>
                        {/* Finche' il gruppo non ha il suo esercizio la scelta e' libera (lo dice la pillola del gruppo); dopo, gli altri sono in piu'. */}
                        {e.ultimo ? (
                          <Text style={[stili.etichettaTest, { color: p.ok }]}>{t('✓ Fatto', '✓ Done')}</Text>
                        ) : consigliato ? (
                          <Text style={[stili.etichettaTest, { color: p.accento }]}>{t('Consigliato: controlla i chili delle gambe', 'Recommended: checks your leg weights')}</Text>
                        ) : fattoQui ? (
                          <Text style={[stili.etichettaTest, { color: p.testoSecondario }]}>{t('Facoltativo: chili più precisi', 'Optional: more precise weights')}</Text>
                        ) : null}
                        {risultato(e) ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t(`Risultato precedente: ${risultato(e)}`, `Previous result: ${risultato(e)}`)}</Text> : null}
                      </View>
                      <Icona nome="avanti" size={16} colore={p.testoTerzo} />
                    </Tocco>
                  </Entra>
                ))}
              </Carta>
            ) : null}
          </View>
        )
      })}

      <FoglioTest
        e={scelto}
        minimoGiaFatto={minimo.raggiunto}
        gambe={dati.esercizi.filter((x) => x.test_gruppo === 'inferiore').length}
        onChiudi={() => setScelto(null)}
        onSalvato={() => {
          // Le schede ricalcolano i chili col massimale nuovo.
          dimentica()
          carica()
        }}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  consiglio: { fontFamily: F.medio, fontSize: 15, lineHeight: 22 },
  piccola: { fontFamily: F.semi, fontSize: 12.5 },
  minimoTesta: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  minimoTitolo: { flex: 1, fontFamily: F.extra, fontSize: 20, lineHeight: 25, letterSpacing: -0.4 },
  minimoPassi: { flexDirection: 'row', gap: spazio.due },
  minimoPasso: { flex: 1, alignItems: 'center', gap: 6, borderRadius: 18, paddingVertical: spazio.tre, paddingHorizontal: spazio.uno },
  minimoCerchio: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  minimoNumero: { fontFamily: F.extra, fontSize: 16 },
  minimoNomeRiga: { minHeight: 34, justifyContent: 'center' },
  minimoNome: { fontFamily: F.bold, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  minimoStato: { fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  notaGruppo: { gap: 6, alignItems: 'flex-start', paddingHorizontal: spazio.uno },
  gruppo: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, paddingVertical: spazio.uno },
  gruppoTitolo: { flex: 1, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre },
  miniatura: { width: 76, height: 76, borderRadius: 16 },
  nome: { fontFamily: F.extra, fontSize: 16, lineHeight: 20 },
  etichettaTest: { fontFamily: F.bold, fontSize: 13 },
  media: { width: '100%', aspectRatio: 16 / 9, borderRadius: 20 },
  istruzioni: { borderRadius: 18, padding: spazio.tre, gap: spazio.due },
  passo: { fontFamily: F.extra, fontSize: 15, width: 18 },
  nota: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  etichetta: { fontFamily: F.extra, fontSize: 11, letterSpacing: 0.8 },
  input: { height: 54, borderRadius: 16, paddingHorizontal: spazio.tre, fontFamily: F.extra, fontSize: 22, textAlign: 'center' },
})
