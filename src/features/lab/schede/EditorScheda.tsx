import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { leggiSchedaLab, salvaSchedaMia, type BozzaScheda, type SchedaDaSalvare, type SchedaLab } from '@/api/lab'
import { t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { dimentica } from '../memoria'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante, SchedeInArrivo, Sezione, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { leggiBozza, scartaBozza } from './bozza'
import { recupero } from './comune'
import { origineDellaCopia } from './copia'
import { eDiVasca, inMetri, metriDelGiorno, metriDi, nomeIntensita } from './nuoto'
import { eDellaLibreria, seminaAnteprime, useAnteprime } from './anteprime'
import { MediaEsercizio } from './MediaEsercizio'
import { SceltaEsercizio, type Scelta } from './SceltaEsercizio'

// Il piano del socio (19/10/2026), da quattro strade che finiscono qui: scritto a mano (`/nuova`), letto da un file
// (`Importa.tsx`) o scritto dall'agente AI (`Agente.tsx`), che passano la bozza da `bozza.ts` (`?da=bozza`), o
// copiato da un piano del club o del trainer (`?copia=<id>`, `copia.ts`). Giorni, esercizi dalla libreria del club o
// suoi, e per ognuno serie, ripetizioni, carico (o % del massimale), recupero, superserie e note. **Niente si salva
// finche' non si conferma**: la funzione (`salva_mia`) ricontrolla tutto e crea gli esercizi che il socio ha scritto
// con un nome suo, e il piano entra fra i suoi. Con `?id=` si modifica un piano gia' suo.
//
// **Un piano di nuoto** (20/10/2026, `ambiente: 'vasca'`) e' lo stesso editor con altre parole e altri campi: le sedute
// invece dei giorni, le ripetizioni invece delle serie, la **distanza** in metri (multipli di 25: la vasca e' da 25) e
// l'**intensita'** a parole invece di chili e percentuale. Gli esercizi si scelgono fra quelli di vasca e non si scrive
// un nome proprio: un esercizio suo sarebbe di sala e il piano smetterebbe di essere «di vasca», cioe' di leggersi senza «Inizia».
//
// **Ogni esercizio della libreria ha la sua miniatura** (23/10/2026, segnalazione di un tester): il poster accanto al nome, per
// capire di quale esercizio si tratta prima di confermare («Allungamento addominali, variante 3» da solo non dice niente).
// Arrivano da `anteprime.ts` (una chiamata per tutto il piano, e una per ogni esercizio che si cambia); quelle di un piano gia'
// salvato arrivano con il piano stesso. Un esercizio suo, o senza poster, non ha il riquadro; dove la funzione non risponde
// l'elenco e' quello di prima.

const GIORNI_MAX = 7
const ESERCIZI_GIORNO_MAX = 25
/** L'intensita' di un blocco di vasca, a parole: niente ritmi in numeri, che non conosciamo. */
const INTENSITA_VASCA = ['facile', 'medio', 'sostenuto', 'forte']
const METRI_MAX = 1000

type EsercizioForm = {
  chiave: string
  esercizio_id: string | null
  nome: string
  /** Com'era scritto nel file, se l'abbinamento ha dato un nome diverso. */
  scritto: string
  /** Dal file, e senza un esercizio della libreria che sia lo stesso: diventa un esercizio suo, se non lo cambia. */
  daControllare: boolean
  serie: number
  ripetizioni: string
  carico: string
  recupero_serie: number
  recupero_dopo: number
  superserie: string
  note: string
  /** Il carico in % del massimale (20-100), di un piano del club o dell'agente: nell'app diventa i chili del socio. */
  percentuale: number | null
}
type GiornoForm = { chiave: string; nome: string; note: string; esercizi: EsercizioForm[] }
type Form = { titolo: string; descrizione: string; obiettivo: string; livello: string; giorni: GiornoForm[] }

let contatore = 0
const nuovaChiave = () => `k${++contatore}`

const esercizioVuoto = (s: Scelta, vasca = false): EsercizioForm => ({
  chiave: nuovaChiave(),
  esercizio_id: 'esercizio_id' in s ? s.esercizio_id : null,
  nome: 'esercizio_id' in s ? s.nome : s.nome_libero,
  scritto: '',
  daControllare: false,
  // In vasca: quattro ripetizioni da 100 m, medie, con poco recupero. Si cambia subito.
  serie: vasca ? 4 : 3,
  ripetizioni: vasca ? '100 m' : '10',
  carico: vasca ? 'medio' : '',
  recupero_serie: vasca ? 20 : 90,
  recupero_dopo: vasca ? 30 : 120,
  superserie: '',
  note: '',
  percentuale: null,
})

const giornoVuoto = (i: number, vasca = false): GiornoForm => ({ chiave: nuovaChiave(), nome: `${vasca ? t('Seduta', 'Session') : t('Giorno', 'Day')} ${String.fromCharCode(65 + i)}`, note: '', esercizi: [] })

function daBozza(b: BozzaScheda): Form {
  return {
    titolo: b.titolo,
    descrizione: b.descrizione,
    obiettivo: b.obiettivo ?? '',
    livello: b.livello ?? '',
    giorni: b.giorni.map((g) => ({
      chiave: nuovaChiave(),
      nome: g.nome,
      note: g.note,
      esercizi: g.esercizi.map((e) => ({
        chiave: nuovaChiave(),
        esercizio_id: e.esercizio_id,
        nome: e.nome,
        // Un piano di nuoto scritto dall'agente non porta `nome_scritto` e la superserie e' vuota: mai `undefined` nei campi che si puliscono col trim.
        scritto: e.nome_scritto ?? '',
        daControllare: !e.esercizio_id,
        serie: e.serie,
        ripetizioni: e.ripetizioni,
        carico: e.carico,
        recupero_serie: e.recupero_serie,
        recupero_dopo: e.recupero_dopo,
        superserie: e.superserie ?? '',
        note: e.note ?? '',
        percentuale: e.percentuale ?? null,
      })),
    })),
  }
}

function daScheda(s: SchedaLab): Form {
  return {
    titolo: s.titolo,
    descrizione: s.descrizione ?? '',
    obiettivo: s.obiettivo ?? '',
    livello: s.livello ?? '',
    giorni: s.giorni.map((g) => ({
      chiave: nuovaChiave(),
      nome: g.nome,
      note: g.note ?? '',
      esercizi: g.esercizi.map((e) => ({
        chiave: nuovaChiave(),
        esercizio_id: e.esercizio_id,
        nome: e.nome,
        scritto: '',
        daControllare: false,
        serie: e.serie,
        ripetizioni: e.ripetizioni,
        carico: e.carico ?? '',
        recupero_serie: e.recupero_serie,
        recupero_dopo: e.recupero_dopo,
        superserie: e.superserie ?? '',
        note: e.note ?? '',
        percentuale: e.percentuale ?? null,
      })),
    })),
  }
}

/** «4 × 8-10 · 40 kg · recupero 1:30». */
function riassunto(e: EsercizioForm): string {
  return [
    `${e.serie} × ${e.ripetizioni || '—'}`,
    (e.carico ? nomeIntensita(e.carico) : '') || (e.percentuale ? t(`${e.percentuale}% del massimale`, `${e.percentuale}% of your 1RM`) : null),
    t(`recupero ${recupero(e.recupero_serie)}`, `rest ${recupero(e.recupero_serie)}`),
  ]
    .filter(Boolean)
    .join(' · ')
}

function Campo({
  etichetta,
  value,
  onChange,
  placeholder,
  multiline = false,
  max = 60,
  fondo,
  flessibile = false,
  numerico = false,
}: {
  etichetta: string
  value: string
  onChange: (t: string) => void
  placeholder?: string
  multiline?: boolean
  max?: number
  /** Il fondo del campo: di default l'incavo; dentro un esercizio, che e' gia' un incavo, la carta. */
  fondo?: string
  /** In una riga di campi, dividono lo spazio; da soli (in colonna) no. */
  flessibile?: boolean
  /** Solo cifre: il telefono apre il tastierino. */
  numerico?: boolean
}) {
  const p = usePalette()
  const [fuoco, setFuoco] = useState(false)
  return (
    <View style={[{ gap: 4 }, flessibile && { flex: 1 }]}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{etichetta}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.slice(0, max))}
        onFocus={() => setFuoco(true)}
        onBlur={() => setFuoco(false)}
        placeholder={placeholder}
        placeholderTextColor={p.testoTerzo}
        accessibilityLabel={etichetta}
        multiline={multiline}
        submitBehavior={multiline ? "blurAndSubmit" : undefined}
        returnKeyType={multiline ? "done" : undefined}
        keyboardType={numerico ? 'number-pad' : undefined}
        style={[stili.input, { color: p.testo, backgroundColor: fondo ?? p.incavo, borderColor: fuoco ? p.accento : 'transparent' }, multiline && stili.inputLungo]}
      />
    </View>
  )
}

function Stepper({ etichetta, valore, onCambia, min, max, passo, formato, fondo }: { etichetta: string; valore: number; onCambia: (n: number) => void; min: number; max: number; passo: number; formato?: (n: number) => string; fondo?: string }) {
  const p = usePalette()
  const vai = (d: number) => onCambia(Math.max(min, Math.min(max, valore + d * passo)))
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{etichetta}</Text>
      <View style={[stili.stepper, { backgroundColor: fondo ?? p.incavo }]}>
        <Tocco onPress={() => vai(-1)} etichetta={t(`Meno: ${etichetta}`, `Less: ${etichetta}`)} spento={valore <= min} style={stili.passo}>
          <Icona nome="meno" size={18} colore={p.testo} />
        </Tocco>
        <Text style={[stili.valore, { color: p.testo }]}>{formato ? formato(valore) : String(valore)}</Text>
        <Tocco onPress={() => vai(1)} etichetta={t(`Più: ${etichetta}`, `More: ${etichetta}`)} spento={valore >= max} style={stili.passo}>
          <Icona nome="piu" size={18} colore={p.testo} />
        </Tocco>
      </View>
    </View>
  )
}

function Icone({ icona, onPress, etichetta, spento = false }: { icona: NomeIcona; onPress: () => void; etichetta: string; spento?: boolean }) {
  const p = usePalette()
  return (
    <Tocco onPress={onPress} etichetta={etichetta} spento={spento} style={[stili.icona, { backgroundColor: p.incavo, opacity: spento ? 0.35 : 1 }]}>
      <Icona nome={icona} size={16} colore={p.testo} />
    </Tocco>
  )
}

/** L'intensita' di un blocco di vasca: una parola fra quattro, accese a una a una. */
function Intensita({ valore, onCambia }: { valore: string; onCambia: (v: string) => void }) {
  const p = usePalette()
  return (
    <View style={{ gap: 4 }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('Intensità', 'Intensity')}</Text>
      <View style={stili.tag}>
        {INTENSITA_VASCA.map((v) => {
          const attivo = v === valore
          return (
            <Tocco key={v} vibra="scelta" stato={{ selected: attivo }} onPress={() => onCambia(v)} etichetta={t(`Intensità ${v}`, `Intensity ${nomeIntensita(v)}`)} style={[stili.pillola, { backgroundColor: attivo ? p.accento : p.carta }]}>
              <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{nomeIntensita(v).charAt(0).toUpperCase() + nomeIntensita(v).slice(1)}</Text>
            </Tocco>
          )
        })}
      </View>
    </View>
  )
}

export function EditorScheda() {
  const p = usePalette()
  const { id, da, copia } = useLocalSearchParams<{ id?: string; da?: string; copia?: string }>()
  // La bozza (letta da un file o scritta dall'agente) si prende una volta: dopo il salvataggio si butta.
  const [bozza] = useState(() => (!id && !copia && da === 'bozza' ? leggiBozza() : null))
  const modo: 'nuovo' | 'modifica' | 'copia' | 'file' | 'ai' = id ? 'modifica' : copia ? 'copia' : bozza ? (bozza.origine === 'ai' ? 'ai' : 'file') : 'nuovo'
  // Un piano di nuoto: lo dice la bozza dell'agente o il piano che si apre (si ricava dagli esercizi, il browser non lo decide).
  const [vasca, setVasca] = useState(() => eDiVasca(bozza))
  const [form, setForm] = useState<Form | null>(() => (id || copia ? null : bozza ? daBozza(bozza) : { titolo: '', descrizione: '', obiettivo: '', livello: '', giorni: [giornoVuoto(0)] }))
  /** Da dove viene la copia (un piano del club o del trainer, o uno suo), per dirlo al salvataggio. */
  const [origineCopia, setOrigineCopia] = useState<'club' | 'creata'>('club')
  const [daPiano, setDaPiano] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [caricaErrore, setCaricaErrore] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aperto, setAperto] = useState<string | null>(null)
  /** Dove si sta scegliendo un esercizio: in quale giorno, e quale esercizio si sostituisce (senza: se ne aggiunge uno). */
  const [scelta, setScelta] = useState<{ giorno: string; esercizio?: string } | null>(null)

  useEffect(() => {
    const quale = id ?? copia
    if (!quale) return
    let vivo = true
    leggiSchedaLab(String(quale)).then((r) => {
      if (!vivo) return
      if (!r.ok) return setCaricaErrore(r.errore)
      // Si modifica solo un piano proprio; quello di un altro (del club, del trainer) si copia con `?copia=`.
      if (id && r.scheda.tipo !== 'socio') return setCaricaErrore(t('Questo piano non si può modificare: puoi copiarlo e modificare la copia.', 'This plan can’t be edited: you can copy it and edit the copy.'))
      if (copia) {
        setOrigineCopia(origineDellaCopia(r.scheda))
        setDaPiano(r.scheda.titolo)
      }
      setVasca(eDiVasca(r.scheda))
      // I poster di un piano che si apre sono gia' nella risposta (firmati): non servono altre richieste.
      seminaAnteprime(r.scheda.giorni.flatMap((g) => g.esercizi))
      setForm(daScheda(r.scheda))
    })
    return () => {
      vivo = false
    }
  }, [id, copia])

  // Le miniature: gli esercizi della libreria che il piano ha adesso (anche quelli appena cambiati).
  const idLibreria = useMemo(() => (form ? form.giorni.flatMap((g) => g.esercizi.map((e) => e.esercizio_id)).filter(eDellaLibreria) : []), [form])
  const miniature = useAnteprime(idLibreria)

  const aggiorna = (f: (x: Form) => Form) => setForm((x) => (x ? f(x) : x))
  const sulGiorno = (g: string, f: (x: GiornoForm) => GiornoForm) => aggiorna((x) => ({ ...x, giorni: x.giorni.map((y) => (y.chiave === g ? f(y) : y)) }))
  const sulEsercizio = (g: string, e: string, f: (x: EsercizioForm) => EsercizioForm) => sulGiorno(g, (y) => ({ ...y, esercizi: y.esercizi.map((z) => (z.chiave === e ? f(z) : z)) }))
  const sposta = (g: string, e: string, d: number) =>
    sulGiorno(g, (y) => {
      const i = y.esercizi.findIndex((z) => z.chiave === e)
      const j = i + d
      if (i < 0 || j < 0 || j >= y.esercizi.length) return y
      const lista = [...y.esercizi]
      ;[lista[i], lista[j]] = [lista[j], lista[i]]
      return { ...y, esercizi: lista }
    })

  function scegliEsercizio(s: Scelta) {
    if (!scelta) return
    const { giorno, esercizio } = scelta
    setScelta(null)
    if (esercizio) {
      sulEsercizio(giorno, esercizio, (e) => ({
        ...e,
        esercizio_id: 'esercizio_id' in s ? s.esercizio_id : null,
        nome: 'esercizio_id' in s ? s.nome : s.nome_libero,
        daControllare: false,
      }))
      return
    }
    const nuovo = esercizioVuoto(s, vasca)
    sulGiorno(giorno, (y) => ({ ...y, esercizi: [...y.esercizi, nuovo] }))
    setAperto(nuovo.chiave)
  }

  async function salva() {
    if (!form) return
    setErrore(null)
    if (!form.titolo.trim()) return setErrore(t('Dai un nome al piano.', 'Give the plan a name.'))
    const vuoto = form.giorni.find((g) => !g.esercizi.length)
    if (vuoto) return setErrore(
        t(
          `«${vuoto.nome.trim() || 'Un giorno'}» non ha esercizi: aggiungine uno o togli il giorno.`,
          `“${vuoto.nome.trim() || 'A day'}” has no exercises: add one or remove the day.`,
        ),
      )
    const storta = form.giorni.flatMap((g) => g.esercizi).find((e) => e.percentuale != null && (e.percentuale < 20 || e.percentuale > 100))
    if (storta) return setErrore(
        t(
          `«${storta.nome}»: la percentuale del massimale va da 20 a 100. Lasciala vuota se vuoi scrivere i chili.`,
          `“${storta.nome}”: the percentage of your 1RM goes from 20 to 100. Leave it blank if you want to write the weight.`,
        ),
      )
    // In vasca la distanza e' «<metri> m», a multipli di 25: e' da li' che l'app fa i conti dei metri.
    const lunga = vasca
      ? form.giorni
          .flatMap((g) => g.esercizi)
          .find((e) => {
            const m = metriDi(e.ripetizioni)
            return !m || m % 25 !== 0 || m > METRI_MAX
          })
      : null
    if (lunga) return setErrore(
        t(
          `«${lunga.nome}»: scrivi la distanza di una ripetizione in metri, a multipli di 25 e fino a ${METRI_MAX} (per esempio 100).`,
          `“${lunga.nome}”: write the distance of one rep in meters, in multiples of 25 and up to ${METRI_MAX} (for example 100).`,
        ),
      )
    const scheda: SchedaDaSalvare = {
      ...(id ? { id: String(id) } : {}),
      titolo: form.titolo.trim(),
      descrizione: form.descrizione.trim(),
      obiettivo: form.obiettivo,
      livello: form.livello,
      origine: modo === 'modifica' ? undefined : modo === 'copia' ? origineCopia : modo === 'ai' ? 'ai' : modo === 'file' ? 'importata' : 'creata',
      giorni: form.giorni.map((g) => ({
        nome: g.nome.trim(),
        note: g.note.trim(),
        esercizi: g.esercizi.map((e) => ({
          ...(e.esercizio_id ? { esercizio_id: e.esercizio_id } : { nome_libero: e.nome }),
          serie: e.serie,
          ripetizioni: e.ripetizioni.trim(),
          carico: e.carico.trim(),
          recupero_serie: e.recupero_serie,
          recupero_dopo: e.recupero_dopo,
          superserie: e.superserie.trim().toUpperCase(),
          note: e.note.trim(),
          percentuale: e.percentuale,
        })),
      })),
    }
    setSalvando(true)
    const r = await salvaSchedaMia(scheda)
    setSalvando(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    scartaBozza()
    dimentica()
    router.replace({ pathname: '/allenamento/[scheda]', params: { scheda: r.id } })
  }

  const titolo = {
    modifica: vasca ? t('Modifica il piano di nuoto', 'Edit the swim plan') : t('Modifica il piano', 'Edit the plan'),
    copia: t('Modifica e aggiungi', 'Edit and add'),
    file: t('Controlla il piano', 'Check the plan'),
    ai: vasca ? t('Il piano di nuoto composto per te', 'The swim plan built for you') : t('Il piano composto per te', 'The plan built for you'),
    nuovo: t('Scrivi il tuo piano', 'Write your plan'),
  }[modo]
  const indietro = id ? (`/allenamento/${id}` as const) : copia ? (`/allenamento/${copia}` as const) : ('/allenamento' as const)
  const sottotitolo = {
    modifica: vasca
      ? t('Cambia sedute, distanze e recuperi: un piano di nuoto si legge a bordo vasca e non si registra.', 'Change sessions, distances and rest: a swim plan is read at the poolside and isn’t logged.')
      : t('Cambia giorni, esercizi e numeri: le sedute che hai già fatto restano nello storico.', 'Change days, exercises and numbers: the workouts you’ve already done stay in your history.'),
    copia: daPiano
      ? t(
          `Parti da «${daPiano}»: cambia quello che vuoi e conferma. Lo trovi poi fra i tuoi piani; l’originale resta com’è.`,
          `Start from “${daPiano}”: change what you like and confirm. You’ll then find it among your plans; the original stays as it is.`,
        )
      : t('Cambia quello che vuoi e conferma: lo trovi poi fra i tuoi piani.', 'Change what you like and confirm: you’ll then find it among your plans.'),
    file: t(
      'L’abbiamo letto dal tuo file. Controlla gli esercizi, le serie e i carichi: il piano si salva solo quando lo decidi tu.',
      'We read it from your file. Check the exercises, sets and loads: the plan is only saved when you decide.',
    ),
    ai: vasca
      ? t(
          'Ecco il piano di nuoto che abbiamo composto sulle tue risposte. Cambia sedute, distanze e recuperi e confermalo: lo trovi poi fra i tuoi piani, e si legge a bordo vasca.',
          'Here’s the swim plan we built from your answers. Change sessions, distances and rest and confirm it: you’ll then find it among your plans, to read at the poolside.',
        )
      : t(
          'Ecco il piano che abbiamo composto sulle tue risposte. Cambia quello che vuoi e confermalo: lo trovi poi fra i tuoi piani.',
          'Here’s the plan we built from your answers. Change what you like and confirm it: you’ll then find it among your plans.',
        ),
    nuovo: t(
      'Giorni ed esercizi, con serie, ripetizioni, carico e recupero. Lo usi come gli altri: inizi l’allenamento e segni le serie.',
      'Days and exercises, with sets, reps, load and rest. You use it like the others: start the workout and log your sets.',
    ),
  }[modo]

  if (!form) {
    return (
      <Schermata sopratitolo={t('I tuoi piani', 'Your plans')} titolo={titolo} indietro={indietro} barra={false}>
        {caricaErrore ? (
          <>
            <Messaggio>{caricaErrore}</Messaggio>
            <Pulsante testo={t('Torna ai piani', 'Back to plans')} variante="secondario" onPress={() => router.replace('/allenamento')} />
          </>
        ) : (
          <SchedeInArrivo quante={2} />
        )}
      </Schermata>
    )
  }

  const daControllare = form.giorni.flatMap((g) => g.esercizi).filter((e) => e.daControllare).length
  const sceltaCorrente = scelta ? form.giorni.find((g) => g.chiave === scelta.giorno) : null

  return (
    <Schermata sopratitolo={t('I tuoi piani', 'Your plans')} titolo={titolo} indietro={indietro} barra={false} sottotitolo={sottotitolo}>
      {modo === 'file' ? (
        <Messaggio tono="attenzione" titolo={t('Ricontrolla prima di salvare', 'Double-check before saving')}>
          {daControllare
            ? t(
                `${daControllare} ${daControllare === 1 ? 'esercizio non è' : 'esercizi non sono'} nella libreria del club: ${daControllare === 1 ? 'resta' : 'restano'} con il nome che hai scritto (segnati «Da controllare»), oppure scegli un esercizio simile con «Cambia esercizio». Una lettura automatica può sbagliare: guarda anche numeri e carichi.`,
                `${daControllare} ${daControllare === 1 ? 'exercise isn’t' : 'exercises aren’t'} in the club’s library: ${daControllare === 1 ? 'it keeps' : 'they keep'} the name you wrote (marked “To check”), or choose a similar exercise with “Change exercise”. Automatic reading can make mistakes: check numbers and loads too.`,
              )
            : t('Una lettura automatica può sbagliare: guarda numeri e carichi, e correggi quello che non torna.', 'Automatic reading can make mistakes: check numbers and loads, and fix anything that’s off.')}
        </Messaggio>
      ) : null}
      {modo === 'ai' ? (
        // L'avviso non nomina l'AI (20/10/2026): e' una prima versione da controllare, come ogni piano. Che sia composto con
        // l'aiuto di un'intelligenza artificiale si dice in fondo, nella postilla sotto il pulsante.
        <Messaggio tono="attenzione" titolo={t('Controllalo prima di confermare', 'Check it before confirming')}>
          {vasca
            ? t(
                'È una prima versione: guarda distanze e recuperi, e correggi quello che non ti torna. Con dolori o infortuni parlane prima con il tecnico a bordo vasca.',
                'It’s a first draft: check distances and rest, and fix anything that doesn’t feel right. If you have pain or injuries, talk to the coach at the poolside first.',
              )
            : t(
                'È una prima versione: guarda esercizi, carichi e recuperi, e correggi quello che non ti torna. Con dolori o infortuni parlane prima con un istruttore in sala.',
                'It’s a first draft: check exercises, loads and rest, and fix anything that doesn’t feel right. If you have pain or injuries, talk to an instructor on the gym floor first.',
              )}
        </Messaggio>
      ) : null}

      <Carta style={{ gap: spazio.tre }}>
        <Campo etichetta={t('Nome del piano', 'Plan name')} value={form.titolo} onChange={(v) => aggiorna((x) => ({ ...x, titolo: v }))} placeholder={t('Per esempio: Forza 3 giorni', 'For example: Strength 3 days')} max={120} />
        <Campo
          etichetta={vasca ? t('Descrizione (facoltativo)', 'Description (optional)') : t('Note (facoltativo)', 'Notes (optional)')}
          value={form.descrizione}
          onChange={(v) => aggiorna((x) => ({ ...x, descrizione: v }))}
          placeholder={t('Obiettivo, riscaldamento, indicazioni generali', 'Goal, warm-up, general notes')}
          max={2000}
          multiline
        />
      </Carta>

      {form.giorni.map((g, gi) => (
        <Sezione
          key={g.chiave}
          titolo={`${g.nome.trim() || `${vasca ? t('Seduta', 'Session') : t('Giorno', 'Day')} ${String.fromCharCode(65 + gi)}`}${vasca && metriDelGiorno(g) > 0 ? ` · ${inMetri(metriDelGiorno(g))}` : ''}`}
          conteggio={g.esercizi.length}
          destra={
            form.giorni.length > 1 ? (
              <Tocco onPress={() => aggiorna((x) => ({ ...x, giorni: x.giorni.filter((y) => y.chiave !== g.chiave) }))} etichetta={t(`Togli ${g.nome}`, `Remove ${g.nome}`)}>
                <Text style={{ color: p.errore, fontFamily: F.bold, fontSize: 13.5 }}>{vasca ? t('Togli la seduta', 'Remove session') : t('Togli il giorno', 'Remove day')}</Text>
              </Tocco>
            ) : undefined
          }
        >
          <Carta style={{ gap: spazio.tre }}>
            <Campo
              etichetta={vasca ? t('Nome della seduta', 'Session name') : t('Nome del giorno', 'Day name')}
              value={g.nome}
              onChange={(v) => sulGiorno(g.chiave, (y) => ({ ...y, nome: v }))}
              placeholder={`${vasca ? t('Seduta', 'Session') : t('Giorno', 'Day')} ${String.fromCharCode(65 + gi)}`}
            />
            {g.esercizi.map((e, ei) => {
              const espanso = aperto === e.chiave
              // Il riquadro c'e' dove c'e' il poster, e finche' si aspetta per un esercizio della libreria (cosi' la riga non si sposta all'arrivo).
              const poster = miniature.poster(e.esercizio_id)
              const miniatura = !!poster || (eDellaLibreria(e.esercizio_id) && miniature.inArrivo(e.esercizio_id))
              return (
                <View key={e.chiave} style={[stili.esercizio, { backgroundColor: p.incavo }]}>
                  <Tocco onPress={() => setAperto(espanso ? null : e.chiave)} etichetta={`${e.nome}: ${espanso ? t('chiudi', 'close') : t('modifica', 'edit')}`} scala={0.99}>
                    <View style={stili.testa}>
                      {miniatura ? (
                        // Decorativa: il nome e' accanto, e lo legge lo screen reader.
                        <View style={stili.miniatura} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                          {poster ? <MediaEsercizio immagini={[poster]} video={null} ferma style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: p.carta }]} />}
                        </View>
                      ) : null}
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={stili.tag}>
                          {e.superserie ? <Tag testo={t(`Superserie ${e.superserie}`, `Superset ${e.superserie}`)} colore={p.accento} /> : null}
                          {e.daControllare ? <Tag testo={t('Da controllare', 'To check')} colore={p.attenzione} /> : null}
                          {e.esercizio_id?.startsWith('socio-') || (!e.esercizio_id && !e.daControllare) ? <Tag testo={t('Tuo', 'Yours')} colore={p.blu} /> : null}
                        </View>
                        <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
                          {e.nome}
                        </Text>
                        <Text style={[stili.sotto, { color: p.testoSecondario }]}>{riassunto(e)}</Text>
                        {e.scritto && e.scritto.trim().toLowerCase() !== e.nome.trim().toLowerCase() ? (
                          <Text style={[stili.sotto, { color: p.testoTerzo }]}>{t(`Hai scritto: «${e.scritto}»`, `You wrote: “${e.scritto}”`)}</Text>
                        ) : null}
                      </View>
                      <Icona nome={espanso ? 'su' : 'modifica'} size={espanso ? 18 : 16} colore={p.testoSecondario} />
                    </View>
                  </Tocco>

                  {espanso ? (
                    <View style={[stili.dettagli, { borderTopColor: p.linea }]}>
                      {vasca ? (
                        <>
                          <View style={stili.fila}>
                            <Stepper fondo={p.carta} etichetta={t('Ripetizioni', 'Reps')} valore={e.serie} min={1} max={20} passo={1} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, serie: n }))} />
                            <Campo
                              flessibile
                              numerico
                              fondo={p.carta}
                              etichetta={t('Metri per ripetizione', 'Meters per rep')}
                              value={metriDi(e.ripetizioni) != null ? String(metriDi(e.ripetizioni)) : e.ripetizioni.replace(/\D/g, '')}
                              onChange={(v) => {
                                const cifre = v.replace(/\D/g, '')
                                sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, ripetizioni: cifre ? `${cifre} m` : '' }))
                              }}
                              placeholder={t('es. 100', 'e.g. 100')}
                              max={4}
                            />
                          </View>
                          <Text style={[stili.sotto, { color: p.testoSecondario }]}>
                            {t('La vasca è da 25 metri: scrivi la distanza di una ripetizione, a multipli di 25.', 'The pool is 25 meters: write the distance of one rep, in multiples of 25.')}
                          </Text>
                          <Intensita valore={e.carico} onCambia={(v) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, carico: v }))} />
                          <View style={stili.fila}>
                            <Stepper fondo={p.carta} etichetta={t('Recupero', 'Rest')} valore={e.recupero_serie} min={0} max={120} passo={5} formato={recupero} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, recupero_serie: n }))} />
                            <Stepper fondo={p.carta} etichetta={t('Pausa dopo', 'Pause after')} valore={e.recupero_dopo} min={0} max={300} passo={15} formato={recupero} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, recupero_dopo: n }))} />
                          </View>
                        </>
                      ) : (
                        <>
                      <View style={stili.fila}>
                        <Stepper fondo={p.carta} etichetta={t('Serie', 'Sets')} valore={e.serie} min={1} max={20} passo={1} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, serie: n }))} />
                        <Stepper fondo={p.carta} etichetta={t('Recupero fra le serie', 'Rest between sets')} valore={e.recupero_serie} min={0} max={900} passo={15} formato={recupero} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, recupero_serie: n }))} />
                      </View>
                      <View style={stili.fila}>
                        <Campo flessibile fondo={p.carta} etichetta={t('Ripetizioni', 'Reps')} value={e.ripetizioni} onChange={(v) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, ripetizioni: v }))} placeholder="8-10, 12, 30 s" max={30} />
                        <Campo flessibile fondo={p.carta} etichetta={t('Carico', 'Load')} value={e.carico} onChange={(v) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, carico: v }))} placeholder={t('40 kg, corpo libero', '40 kg, bodyweight')} max={40} />
                      </View>
                      <View style={stili.fila}>
                        <Campo
                          flessibile
                          numerico
                          fondo={p.carta}
                          etichetta={t('% del massimale', '% of 1RM')}
                          value={e.percentuale != null ? String(e.percentuale) : ''}
                          onChange={(v) => {
                            const cifre = v.replace(/\D/g, '')
                            sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, percentuale: cifre ? Number(cifre) : null }))
                          }}
                          placeholder={t('es. 70', 'e.g. 70')}
                          max={3}
                        />
                        <Campo
                          flessibile
                          fondo={p.carta}
                          etichetta={t('Superserie (una lettera)', 'Superset (one letter)')}
                          value={e.superserie}
                          onChange={(v) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, superserie: v.replace(/[^a-zA-Z]/g, '').toUpperCase() }))}
                          placeholder="A"
                          max={1}
                        />
                      </View>
                      {e.percentuale != null ? <Text style={[stili.sotto, { color: p.testoSecondario }]}>
                          {t(
                            'Dopo il test dei massimali, nell’app la percentuale diventa i tuoi chili. Vuota, vale il carico che scrivi sopra.',
                            'After the 1RM test, the app turns the percentage into your weights. If blank, the load you write above applies.',
                          )}
                        </Text> : null}
                      <View style={stili.fila}>
                        <Stepper fondo={p.carta} etichetta={t('Recupero dopo l’ultima serie', 'Rest after the last set')} valore={e.recupero_dopo} min={0} max={900} passo={15} formato={recupero} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, recupero_dopo: n }))} />
                      </View>
                        </>
                      )}
                      <Campo
                        fondo={p.carta}
                        etichetta={t('Note sull’esercizio', 'Exercise notes')}
                        value={e.note}
                        onChange={(v) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, note: v }))}
                        placeholder={vasca ? t('Respirazione, bracciata, tecnica…', 'Breathing, stroke, technique…') : t('Tempo, presa, cedimento…', 'Tempo, grip, failure…')}
                        max={300}
                        multiline
                      />
                      <View style={stili.comandi}>
                        <Icone icona="su" etichetta={t(`Sposta su ${e.nome}`, `Move up ${e.nome}`)} spento={ei === 0} onPress={() => sposta(g.chiave, e.chiave, -1)} />
                        <Icone icona="giu" etichetta={t(`Sposta giù ${e.nome}`, `Move down ${e.nome}`)} spento={ei === g.esercizi.length - 1} onPress={() => sposta(g.chiave, e.chiave, 1)} />
                        <Icone icona="cestino" etichetta={t(`Togli ${e.nome}`, `Remove ${e.nome}`)} onPress={() => sulGiorno(g.chiave, (y) => ({ ...y, esercizi: y.esercizi.filter((z) => z.chiave !== e.chiave) }))} />
                        <View style={{ flex: 1 }} />
                      </View>
                      <View style={stili.fila}>
                        <View style={{ flex: 1 }}>
                          <Pulsante testo={t('Cambia esercizio', 'Change exercise')} variante="contorno" piccolo onPress={() => setScelta({ giorno: g.chiave, esercizio: e.chiave })} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Pulsante testo={t('Fatto', 'Done')} variante="scuro" piccolo onPress={() => setAperto(null)} />
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              )
            })}
            {g.esercizi.length < ESERCIZI_GIORNO_MAX ? <Pulsante testo={vasca ? t('Aggiungi un blocco di nuoto', 'Add a swim block') : t('Aggiungi un esercizio', 'Add an exercise')} icona="piu" variante="secondario" onPress={() => setScelta({ giorno: g.chiave })} /> : null}
          </Carta>
        </Sezione>
      ))}

      {form.giorni.length < GIORNI_MAX ? (
        <Pulsante testo={vasca ? t('Aggiungi una seduta', 'Add a session') : t('Aggiungi un giorno', 'Add a day')} icona="piu" variante="contorno" onPress={() => aggiorna((x) => ({ ...x, giorni: [...x.giorni, giornoVuoto(x.giorni.length, vasca)] }))} />
      ) : null}

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo={modo === 'modifica' ? t('Salva le modifiche', 'Save changes') : modo === 'nuovo' ? t('Salva il piano', 'Save the plan') : t('Conferma e aggiungi ai tuoi piani', 'Confirm and add to your plans')} icona="spunta" inCorso={salvando} onPress={salva} />
      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        {tv(
          <>
            {modo === 'ai' ? 'Questa bozza è stata composta con il supporto di un’intelligenza artificiale, che può sbagliare. ' : ''}È un piano tuo, ma i trainer del club lo possono vedere dal pannello, per verificarlo e aiutarti a seguirlo. Non sostituisce il parere di un istruttore: con dolori o infortuni parlane prima con{' '}
            {vasca ? 'il tecnico a bordo vasca' : 'un istruttore in sala'}.
          </>,
          <>
            {modo === 'ai' ? 'This draft was built with the help of artificial intelligence, which can make mistakes. ' : ''}It’s your plan, but the club’s trainers can see it from their panel, to check it and help you follow it. It doesn’t replace an instructor’s advice: if you have pain or injuries, talk first to{' '}
            {vasca ? 'the coach at the poolside' : 'an instructor on the gym floor'}.
          </>,
        )}
      </Text>

      <SceltaEsercizio
        aperto={!!scelta}
        titolo={
          scelta?.esercizio
            ? t('Cambia esercizio', 'Change exercise')
            : sceltaCorrente
              ? t(`Aggiungi a ${sceltaCorrente.nome.trim() || 'questo giorno'}`, `Add to ${sceltaCorrente.nome.trim() || 'this day'}`)
              : t('Scegli un esercizio', 'Choose an exercise')
        }
        onChiudi={() => setScelta(null)}
        onScegli={scegliEsercizio}
        ambiente={vasca ? 'vasca' : 'sala'}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  etichetta: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.2 },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: spazio.tre, paddingVertical: 10, fontFamily: F.semi, fontSize: 15.5, outlineStyle: 'none' } as object,
  inputLungo: { minHeight: 74, textAlignVertical: 'top' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, minHeight: 46 },
  passo: { width: 44, height: 46, alignItems: 'center', justifyContent: 'center' },
  valore: { flex: 1, textAlign: 'center', fontFamily: F.extra, fontSize: 16 },
  icona: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  esercizio: { borderRadius: 18, padding: spazio.tre, gap: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due },
  // Il poster e' 16:9 e qui e' ritagliato a quadrato (`cover`), come le miniature del piano (`Scheda.tsx`).
  miniatura: { width: 68, height: 68, borderRadius: 14, overflow: 'hidden' },
  tag: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillola: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: spazio.tre },
  comandi: { flexDirection: 'row', gap: 6 },
  nome: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 19, letterSpacing: -0.2 },
  sotto: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
  dettagli: { gap: spazio.tre, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre },
  fila: { flexDirection: 'row', gap: spazio.due },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
})
