import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Lezione, SchedaLezione } from '@/api/lab'
import { locale, t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { altezzaAl } from '../dati/calcoli'
import { Icona } from '../ui/Icona'
import { LinkSezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { useCorpo } from './Calorie'
import { etaDa, metabolismoBasale, type Sesso } from './stimaCalorie'
import { riconosci, stimaLezione, type StimaLezione } from './stimaCorso'

// Le calorie di una lezione di gruppo, nel calendario (17/10/2026): UNA PROVA.
// Come si sceglie il MET sta in stimaCorso.ts (si capisce che tipo di lezione
// e', non si scrive un MET per lezione); qui c'e' solo cosa si mostra e a chi.
//
// **A chi**: solo al titolare (`titolare`, dal calendario), e solo se e'
// maggiorenne. Peso, altezza ed eta' sono i suoi: dal calendario si puo' scegliere
// un'altra persona della famiglia (il coniuge, un figlio), e per lei il suo peso
// darebbe un numero sbagliato.
//
// **Dove**: una riga sotto i posti di ogni lezione (e sotto il turno scelto del
// Nuoto Libero), e un riquadro nella scheda della lezione. La riga c'e' anche
// dove la scheda non c'e' (la Scuola Nuoto Adulti non ne ha una sul sito).
//
// **I dati del socio** sono quelli delle schede (`useCorpo` di Calorie.tsx): il
// sesso lo sceglie il socio in una scheda, e finche' non sceglie vale il valore
// di mezzo.

type Corpo = { kg: number; cm: number; anni: number; sesso: NonNullable<Sesso> }
export type StatoCorpo =
  | { stato: 'no' }
  | { stato: 'attesa' }
  | { stato: 'mancano-dati'; motivo: 'misure' | 'eta' | 'sesso' }
  | { stato: 'ok'; corpo: Corpo }

const ContestoCorpo = createContext<StatoCorpo>({ stato: 'no' })

/**
 * I dati del socio per una stima delle calorie, o cosa manca: peso, altezza, eta'
 * e sesso, tutti e quattro, e la maggiore eta'. La usano le lezioni e il contatore.
 */
export function useStatoCorpo(): StatoCorpo {
  const { anagrafica, anagraficaLetta, misure, sesso } = useCorpo(false)
  return useMemo<StatoCorpo>(() => {
    if (!misure || !anagraficaLetta) return { stato: 'attesa' }
    const ultimoPeso = [...misure].reverse().find((m) => m.peso_kg != null) ?? null
    const cm = misure.length ? altezzaAl(misure, misure.length - 1) : null
    if (!ultimoPeso?.peso_kg || !cm) return { stato: 'mancano-dati', motivo: 'misure' }
    const anni = etaDa(anagrafica?.data_nascita)
    if (!anni) return { stato: 'mancano-dati', motivo: 'eta' }
    // La formula e' per gli adulti.
    if (anni < 18) return { stato: 'no' }
    // Come per le schede servono tutti e quattro i dati; ma qui, col sesso mancante, non si usa il valore di mezzo: non si stima.
    if (!sesso) return { stato: 'mancano-dati', motivo: 'sesso' }
    return { stato: 'ok', corpo: { kg: ultimoPeso.peso_kg, cm, anni, sesso } }
  }, [anagrafica, anagraficaLetta, misure, sesso])
}

/** Sta sopra il calendario: legge i dati del socio una volta sola e li da' a ogni lezione. */
export function CorpoPerLezioni({ children }: { children: ReactNode }) {
  return <ContestoCorpo.Provider value={useStatoCorpo()}>{children}</ContestoCorpo.Provider>
}

const intero = (n: number) => Math.round(n).toLocaleString(locale())
const decimale = (n: number, d = 1) => n.toLocaleString(locale(), { maximumFractionDigits: d, minimumFractionDigits: 0 })
/** Il livello come si legge (il valore viene dal nome del tipo di lezione, in italiano). */
const NOME_LIVELLO: Record<string, string> = { base: t('base', 'beginner'), intermedio: t('intermedio', 'intermediate'), avanzato: t('avanzato', 'advanced') }

/** `fondo`: il colore sotto la spiegazione, diverso da quello del riquadro che la contiene. */
function Spiegazione({ nome, s, corpo, fondo }: { nome: string; s: StimaLezione; corpo: Corpo; fondo: string }) {
  const p = usePalette()
  const alMinuto = metabolismoBasale(corpo) / 1440
  const forte = (x: string) => <Text style={{ fontFamily: F.extra, color: p.testo }}>{x}</Text>
  const { cardio, muscolare } = s.barre

  const chi =
    s.come === 'livello'
      ? s.livello
        ? t(
            `«${nome}» è un corso di nuoto di livello ${s.livello}. Più il livello sale, più si nuota di continuo e meno si sta fermi a bordo vasca: per questo il consumo cresce con lui.`,
            `“${nome}” is a ${NOME_LIVELLO[s.livello] ?? s.livello} swimming course. The higher the level, the more you swim non-stop and the less you wait at the side: that’s why the burn goes up with it.`,
          )
        : t('Di questo corso di nuoto non conosciamo il livello: usiamo quello di mezzo, con una forbice più larga.', 'We don’t know the level of this swimming course: we use the middle one, with a wider range.')
      : s.tipo.id === 'nuoto-libero'
        ? t(
            'Nel nuoto libero stile e ritmo li decidi tu, e fra una vasca e l’altra ci si ferma: per questo è un consumo indicativo, con una forbice più larga.',
            'In lap swimming you set the stroke and pace, and you stop between lengths: that’s why it’s an indicative burn, with a wider range.',
          )
        : s.come === 'nome'
          ? t(`Abbiamo riconosciuto «${nome}» come una lezione di tipo «${s.tipo.etichetta}».`, `We recognized “${nome}” as a “${s.tipo.etichetta}” class.`)
          : s.come === 'testo'
            ? t(
                `Il nome non dice che lezione sia: dal testo della sua scheda l’abbiamo riconosciuta come «${s.tipo.etichetta}».`,
                `The name doesn’t say what class it is: from its description we recognized it as “${s.tipo.etichetta}”.`,
              )
            : t('Non riconosciamo ancora questo tipo di lezione: la stimiamo solo dall’intensità che il club le dà.', 'We don’t recognize this type of class yet: we estimate it only from the intensity the club gives it.')

  const intensita: ReactNode =
    s.tipo.id === 'nuoto-corso'
      ? t(
          `Per questo livello usiamo ${decimale(s.met)} MET, calcolati sull’intera lezione, pause ed esercizi a bordo vasca compresi.`,
          `For this level we use ${decimale(s.met)} MET, worked out over the whole class, breaks and poolside drills included.`,
        )
      : s.tipo.id === 'nuoto-libero'
        ? t(`Usiamo ${decimale(s.met)} MET, il valore di mezzo di un turno di nuoto.`, `We use ${decimale(s.met)} MET, the middle value for a swim slot.`)
        : s.intensita != null
          ? (
              // JSX e non una stringa: `forte()` e' un elemento, in un template finirebbe come «[object Object]».
              tv(
                <>
                  Dentro quel tipo, l’intensità che il club indica per la lezione ({[cardio != null ? `cardiovascolare ${cardio}` : '', muscolare != null ? `muscolare ${muscolare}` : ''].filter(Boolean).join(', ')}) la porta a{' '}
                  {forte(`${decimale(s.met)} MET`)}. Un MET dice quante volte si consuma più che a riposo.
                </>,
                <>
                  Within that type, the intensity the club gives the class ({[cardio != null ? `cardio ${cardio}` : '', muscolare != null ? `strength ${muscolare}` : ''].filter(Boolean).join(', ')}) brings it to{' '}
                  {forte(`${decimale(s.met)} MET`)}. A MET says how many times more you burn than at rest.
                </>,
              )
            )
          : t(`La scheda non indica l’intensità: usiamo il valore di mezzo del tipo, ${decimale(s.met)} MET.`, `The description doesn’t give an intensity: we use the middle value for the type, ${decimale(s.met)} MET.`)

  return (
    <View style={[stili.spiegazione, { backgroundColor: fondo }]}>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{chi}</Text>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{intensita}</Text>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {tv(
          <>
            {s.minuti} minuti × {decimale(alMinuto, 2)} kcal al minuto (il tuo consumo a riposo) × {decimale(s.met)} MET = {forte(`circa ${intero(s.kcal.circa)} kcal`)}, da {intero(s.kcal.da)} a{' '}
            {intero(s.kcal.a)}. Contano anche le calorie che avresti consumato comunque in quei minuti.
          </>,
          <>
            {s.minuti} minutes × {decimale(alMinuto, 2)} kcal a minute (your resting burn) × {decimale(s.met)} MET = {forte(`about ${intero(s.kcal.circa)} kcal`)}, from {intero(s.kcal.da)} to{' '}
            {intero(s.kcal.a)}. This includes the calories you’d have burned anyway in those minutes.
          </>,
        )}
      </Text>
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>
        {t(
          `Sono stime: possono sbagliare anche del 20–30%, perché dipendono da come fai la lezione e da come è fatto il tuo corpo. Non sono un’indicazione per la dieta. Su ${corpo.anni} anni, ${decimale(corpo.kg)} kg e ${decimale(corpo.cm)} cm, ${
            corpo.sesso === 'f' ? 'come donna' : 'come uomo'
          }.`,
          `These are estimates: they can be off by 20–30%, because they depend on how you do the class and how your body is built. They aren’t dietary advice. Based on ${corpo.anni} years, ${decimale(corpo.kg)} kg and ${decimale(corpo.cm)} cm, ${
            corpo.sesso === 'f' ? 'as female' : 'as male'
          }.`,
        )}
      </Text>
    </View>
  )
}

/**
 * Le calorie stimate di una lezione. `riga` sta sotto i posti, `foglio` nella
 * scheda della lezione. Non mostra niente dove non si stima (la sala pesi, le
 * gestanti, i bambini), per chi non e' il titolare o e' minorenne.
 */
export function CalorieLezione({
  l,
  scheda,
  titolare,
  variante,
}: {
  l: Pick<Lezione, 'nome' | 'categoria' | 'inizio' | 'fine'>
  scheda: SchedaLezione | null
  /** Se la persona scelta nel calendario e' il titolare: i dati del corpo sono i suoi, di nessun altro. */
  titolare: boolean
  variante: 'riga' | 'foglio'
}) {
  const p = usePalette()
  const ctx = useContext(ContestoCorpo)
  const [spiega, setSpiega] = useState(false)
  const minuti = Math.round((new Date(l.fine).getTime() - new Date(l.inizio).getTime()) / 60000)
  const capita = useMemo(() => riconosci(l, scheda), [l, scheda])
  const stima = useMemo(
    () => (titolare && ctx.stato === 'ok' && capita ? stimaLezione({ nome: l.nome, categoria: l.categoria, minuti }, scheda, ctx.corpo) : null),
    [titolare, ctx, capita, l, minuti, scheda],
  )

  if (!capita || !titolare) return null

  if (!stima || ctx.stato !== 'ok') {
    // Nella scheda si dice cosa manca; nella riga, che e' in mezzo a una lista, non si dice niente.
    if (variante !== 'foglio' || ctx.stato !== 'mancano-dati') return null
    return (
      <View style={[stili.riquadro, { backgroundColor: p.incavo }]}>
        <View style={stili.titolo}>
          <Icona nome="fiamma" size={18} colore={p.accento} />
          <Text style={[stili.titoletto, { color: p.testo }]}>{t('Calorie stimate', 'Estimated calories')}</Text>
        </View>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {ctx.motivo === 'misure'
            ? t(
                'Segna il tuo peso e la tua altezza in «Il tuo corpo», in cima all’Athlon Health System: con l’età della tua scheda del club e il sesso ti diciamo quante calorie consuma questa lezione.',
                'Add your weight and height in “Your body”, at the top of Athlon Health System: with the age on your club profile and your sex we’ll tell you how many calories this class burns.',
              )
            : ctx.motivo === 'sesso'
              ? t(
                  'Per stimare le calorie serve sapere se calcolare come uomo o come donna: lo scegli una volta, nel riquadro «Calorie stimate» di un piano di allenamento.',
                  'To estimate calories we need to know whether to calculate as male or female: you choose once, in the “Estimated calories” box of a workout plan.',
                )
              : t(
                  'Nella tua scheda del club manca la data di nascita, e senza l’età la stima non si può fare. Chiedi al desk di aggiungerla.',
                  'Your club profile is missing your date of birth, and without your age we can’t estimate. Ask the front desk to add it.',
                )}
        </Text>
      </View>
    )
  }

  const { da, a, circa } = stima.kcal
  const interruttore = (
    <Tocco onPress={() => setSpiega((x) => !x)} etichetta={spiega ? t('Nascondi come calcoliamo le calorie', 'Hide how we calculate calories') : t('Come calcoliamo le calorie', 'How we calculate calories')} stato={{ selected: spiega }} style={stili.info}>
      <Icona nome="info" size={16} colore={spiega ? p.accento : p.testoSecondario} />
    </Tocco>
  )

  if (variante === 'riga') {
    return (
      <View style={{ gap: spazio.due }}>
        <View style={stili.riga}>
          <Icona nome="fiamma" size={16} colore={p.accento} />
          <Text style={[stili.testo, { color: p.testoSecondario }]} numberOfLines={2}>
            {stima.indicativo ? (
              <>
                {t('Consumo indicativo: ', 'Indicative burn: ')}
                <Text style={{ fontFamily: F.extra, color: p.testo }}>{t(`da ${intero(da)} a ${intero(a)} kcal`, `${intero(da)} to ${intero(a)} kcal`)}</Text>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: F.extra, color: p.testo }}>{t(`circa ${intero(circa)} kcal`, `about ${intero(circa)} kcal`)}</Text>
                {t(` · da ${intero(da)} a ${intero(a)}`, ` · ${intero(da)} to ${intero(a)}`)}
              </>
            )}
          </Text>
          {interruttore}
        </View>
        {spiega ? <Spiegazione nome={l.nome} s={stima} corpo={ctx.corpo} fondo={p.incavo} /> : null}
      </View>
    )
  }

  return (
    <View style={[stili.riquadro, { backgroundColor: p.incavo }]}>
      <View style={stili.titolo}>
        <Icona nome="fiamma" size={18} colore={p.accento} />
        <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>{stima.indicativo ? t('Consumo indicativo', 'Indicative burn') : t('Calorie stimate', 'Estimated calories')}</Text>
      </View>
      <View style={{ gap: 2 }}>
        <Text style={[stili.grande, { color: p.testo }]}>
          {stima.indicativo ? t(`da ${intero(da)} a ${intero(a)} `, `${intero(da)} to ${intero(a)} `) : t(`circa ${intero(circa)} `, `about ${intero(circa)} `)}
          <Text style={[stili.unita, { color: p.testoTerzo }]}>kcal</Text>
        </Text>
        <Text style={[stili.piccola, { color: p.testoSecondario }]}>
          {t(
            `${stima.indicativo ? '' : `da ${intero(da)} a ${intero(a)} kcal · `}${stima.minuti} minuti · ${stima.tipo.etichetta}${stima.livello ? `, livello ${stima.livello}` : ''}`,
            `${stima.indicativo ? '' : `${intero(da)} to ${intero(a)} kcal · `}${stima.minuti} minutes · ${stima.tipo.etichetta}${stima.livello ? `, ${NOME_LIVELLO[stima.livello] ?? stima.livello} level` : ''}`,
          )}
        </Text>
      </View>
      <LinkSezione testo={spiega ? t('Nascondi il calcolo', 'Hide the calculation') : t('Come le abbiamo calcolate', 'How we worked them out')} onPress={() => setSpiega((x) => !x)} />
      {spiega ? <Spiegazione nome={l.nome} s={stima} corpo={ctx.corpo} fondo={p.carta} /> : null}
    </View>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testo: { flex: 1, fontFamily: F.semi, fontSize: 14, lineHeight: 19 },
  info: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginVertical: -8 },
  riquadro: { gap: spazio.tre, borderRadius: 18, padding: spazio.tre },
  titolo: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  titoletto: { fontFamily: F.extra, fontSize: 16 },
  grande: { fontFamily: F.extra, fontSize: 30, letterSpacing: -1 },
  unita: { fontFamily: F.bold, fontSize: 15 },
  spiegazione: { gap: spazio.due + 2, borderRadius: 16, padding: spazio.tre },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
})
