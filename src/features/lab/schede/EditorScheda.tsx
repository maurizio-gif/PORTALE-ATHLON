import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { leggiSchedaLab, salvaSchedaMia, type BozzaScheda, type SchedaDaSalvare, type SchedaLab } from '@/api/lab'
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
import { SceltaEsercizio, type Scelta } from './SceltaEsercizio'

// Il piano del socio (19/10/2026), da quattro strade che finiscono qui: scritto a mano (`/nuova`), letto da un file
// (`Importa.tsx`) o scritto dall'agente AI (`Agente.tsx`), che passano la bozza da `bozza.ts` (`?da=bozza`), o
// copiato da un piano del club o del trainer (`?copia=<id>`, `copia.ts`). Giorni, esercizi dalla libreria del club o
// suoi, e per ognuno serie, ripetizioni, carico (o % del massimale), recupero, superserie e note. **Niente si salva
// finche' non si conferma**: la funzione (`salva_mia`) ricontrolla tutto e crea gli esercizi che il socio ha scritto
// con un nome suo, e il piano entra fra i suoi. Con `?id=` si modifica un piano gia' suo.

const GIORNI_MAX = 7
const ESERCIZI_GIORNO_MAX = 25

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

const esercizioVuoto = (s: Scelta): EsercizioForm => ({
  chiave: nuovaChiave(),
  esercizio_id: 'esercizio_id' in s ? s.esercizio_id : null,
  nome: 'esercizio_id' in s ? s.nome : s.nome_libero,
  scritto: '',
  daControllare: false,
  serie: 3,
  ripetizioni: '10',
  carico: '',
  recupero_serie: 90,
  recupero_dopo: 120,
  superserie: '',
  note: '',
  percentuale: null,
})

const giornoVuoto = (i: number): GiornoForm => ({ chiave: nuovaChiave(), nome: `Giorno ${String.fromCharCode(65 + i)}`, note: '', esercizi: [] })

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
        scritto: e.nome_scritto,
        daControllare: !e.esercizio_id,
        serie: e.serie,
        ripetizioni: e.ripetizioni,
        carico: e.carico,
        recupero_serie: e.recupero_serie,
        recupero_dopo: e.recupero_dopo,
        superserie: e.superserie,
        note: e.note,
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
  return [`${e.serie} × ${e.ripetizioni || '—'}`, e.carico || (e.percentuale ? `${e.percentuale}% del massimale` : null), `recupero ${recupero(e.recupero_serie)}`].filter(Boolean).join(' · ')
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
        <Tocco onPress={() => vai(-1)} etichetta={`Meno: ${etichetta}`} spento={valore <= min} style={stili.passo}>
          <Icona nome="meno" size={18} colore={p.testo} />
        </Tocco>
        <Text style={[stili.valore, { color: p.testo }]}>{formato ? formato(valore) : String(valore)}</Text>
        <Tocco onPress={() => vai(1)} etichetta={`Più: ${etichetta}`} spento={valore >= max} style={stili.passo}>
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

export function EditorScheda() {
  const p = usePalette()
  const { id, da, copia } = useLocalSearchParams<{ id?: string; da?: string; copia?: string }>()
  // La bozza (letta da un file o scritta dall'agente) si prende una volta: dopo il salvataggio si butta.
  const [bozza] = useState(() => (!id && !copia && da === 'bozza' ? leggiBozza() : null))
  const modo: 'nuovo' | 'modifica' | 'copia' | 'file' | 'ai' = id ? 'modifica' : copia ? 'copia' : bozza ? (bozza.origine === 'ai' ? 'ai' : 'file') : 'nuovo'
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
      if (id && r.scheda.tipo !== 'socio') return setCaricaErrore('Questo piano non si può modificare: puoi copiarlo e modificare la copia.')
      if (copia) {
        setOrigineCopia(origineDellaCopia(r.scheda))
        setDaPiano(r.scheda.titolo)
      }
      setForm(daScheda(r.scheda))
    })
    return () => {
      vivo = false
    }
  }, [id, copia])

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
    const nuovo = esercizioVuoto(s)
    sulGiorno(giorno, (y) => ({ ...y, esercizi: [...y.esercizi, nuovo] }))
    setAperto(nuovo.chiave)
  }

  async function salva() {
    if (!form) return
    setErrore(null)
    if (!form.titolo.trim()) return setErrore('Dai un nome al piano.')
    const vuoto = form.giorni.find((g) => !g.esercizi.length)
    if (vuoto) return setErrore(`«${vuoto.nome.trim() || 'Un giorno'}» non ha esercizi: aggiungine uno o togli il giorno.`)
    const storta = form.giorni.flatMap((g) => g.esercizi).find((e) => e.percentuale != null && (e.percentuale < 20 || e.percentuale > 100))
    if (storta) return setErrore(`«${storta.nome}»: la percentuale del massimale va da 20 a 100. Lasciala vuota se vuoi scrivere i chili.`)
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

  const titolo = { modifica: 'Modifica il piano', copia: 'Modifica e aggiungi', file: 'Controlla il piano', ai: 'Il piano dell’agente', nuovo: 'Scrivi il tuo piano' }[modo]
  const indietro = id ? (`/allenamento/${id}` as const) : copia ? (`/allenamento/${copia}` as const) : ('/allenamento' as const)
  const sottotitolo = {
    modifica: 'Cambia giorni, esercizi e numeri: le sedute che hai già fatto restano nello storico.',
    copia: daPiano ? `Parti da «${daPiano}»: cambia quello che vuoi e conferma. Lo trovi poi fra i tuoi piani; l’originale resta com’è.` : 'Cambia quello che vuoi e conferma: lo trovi poi fra i tuoi piani.',
    file: 'L’abbiamo letto dal tuo file. Controlla gli esercizi, le serie e i carichi: il piano si salva solo quando lo decidi tu.',
    ai: 'Ecco il piano che l’agente ha scritto per te. Cambia quello che vuoi e confermalo: lo trovi poi fra i tuoi piani.',
    nuovo: 'Giorni ed esercizi, con serie, ripetizioni, carico e recupero. Lo usi come gli altri: inizi l’allenamento e segni le serie.',
  }[modo]

  if (!form) {
    return (
      <Schermata sopratitolo="I tuoi piani" titolo={titolo} indietro={indietro} barra={false}>
        {caricaErrore ? (
          <>
            <Messaggio>{caricaErrore}</Messaggio>
            <Pulsante testo="Torna ai piani" variante="secondario" onPress={() => router.replace('/allenamento')} />
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
    <Schermata sopratitolo="I tuoi piani" titolo={titolo} indietro={indietro} barra={false} sottotitolo={sottotitolo}>
      {modo === 'file' ? (
        <Messaggio tono="attenzione" titolo="Ricontrolla prima di salvare">
          {daControllare
            ? `${daControllare} ${daControllare === 1 ? 'esercizio non è' : 'esercizi non sono'} nella libreria del club: ${daControllare === 1 ? 'resta' : 'restano'} con il nome che hai scritto (segnati «Da controllare»), oppure scegli un esercizio simile con «Cambia esercizio». Una lettura automatica può sbagliare: guarda anche numeri e carichi.`
            : 'Una lettura automatica può sbagliare: guarda numeri e carichi, e correggi quello che non torna.'}
        </Messaggio>
      ) : null}
      {modo === 'ai' ? (
        <Messaggio tono="attenzione" titolo="Scritto da un’intelligenza artificiale">
          Può sbagliare: guarda esercizi, carichi e recuperi, e correggi quello che non ti torna. Con dolori o infortuni parlane prima con un istruttore in sala.
        </Messaggio>
      ) : null}

      <Carta style={{ gap: spazio.tre }}>
        <Campo etichetta="Nome del piano" value={form.titolo} onChange={(t) => aggiorna((x) => ({ ...x, titolo: t }))} placeholder="Per esempio: Forza 3 giorni" max={120} />
        <Campo etichetta="Note (facoltativo)" value={form.descrizione} onChange={(t) => aggiorna((x) => ({ ...x, descrizione: t }))} placeholder="Obiettivo, riscaldamento, indicazioni generali" max={2000} multiline />
      </Carta>

      {form.giorni.map((g, gi) => (
        <Sezione
          key={g.chiave}
          titolo={g.nome.trim() || `Giorno ${String.fromCharCode(65 + gi)}`}
          conteggio={g.esercizi.length}
          destra={
            form.giorni.length > 1 ? (
              <Tocco onPress={() => aggiorna((x) => ({ ...x, giorni: x.giorni.filter((y) => y.chiave !== g.chiave) }))} etichetta={`Togli ${g.nome}`}>
                <Text style={{ color: p.errore, fontFamily: F.bold, fontSize: 13.5 }}>Togli il giorno</Text>
              </Tocco>
            ) : undefined
          }
        >
          <Carta style={{ gap: spazio.tre }}>
            <Campo etichetta="Nome del giorno" value={g.nome} onChange={(t) => sulGiorno(g.chiave, (y) => ({ ...y, nome: t }))} placeholder={`Giorno ${String.fromCharCode(65 + gi)}`} />
            {g.esercizi.map((e, ei) => {
              const espanso = aperto === e.chiave
              return (
                <View key={e.chiave} style={[stili.esercizio, { backgroundColor: p.incavo }]}>
                  <Tocco onPress={() => setAperto(espanso ? null : e.chiave)} etichetta={`${e.nome}: ${espanso ? 'chiudi' : 'modifica'}`} scala={0.99}>
                    <View style={stili.testa}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={stili.tag}>
                          {e.superserie ? <Tag testo={`Superserie ${e.superserie}`} colore={p.accento} /> : null}
                          {e.daControllare ? <Tag testo="Da controllare" colore={p.attenzione} /> : null}
                          {e.esercizio_id?.startsWith('socio-') || (!e.esercizio_id && !e.daControllare) ? <Tag testo="Tuo" colore={p.blu} /> : null}
                        </View>
                        <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
                          {e.nome}
                        </Text>
                        <Text style={[stili.sotto, { color: p.testoSecondario }]}>{riassunto(e)}</Text>
                        {e.scritto && e.scritto.trim().toLowerCase() !== e.nome.trim().toLowerCase() ? (
                          <Text style={[stili.sotto, { color: p.testoTerzo }]}>{`Hai scritto: «${e.scritto}»`}</Text>
                        ) : null}
                      </View>
                      <Icona nome={espanso ? 'su' : 'modifica'} size={espanso ? 18 : 16} colore={p.testoSecondario} />
                    </View>
                  </Tocco>

                  {espanso ? (
                    <View style={[stili.dettagli, { borderTopColor: p.linea }]}>
                      <View style={stili.fila}>
                        <Stepper fondo={p.carta} etichetta="Serie" valore={e.serie} min={1} max={20} passo={1} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, serie: n }))} />
                        <Stepper fondo={p.carta} etichetta="Recupero fra le serie" valore={e.recupero_serie} min={0} max={900} passo={15} formato={recupero} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, recupero_serie: n }))} />
                      </View>
                      <View style={stili.fila}>
                        <Campo flessibile fondo={p.carta} etichetta="Ripetizioni" value={e.ripetizioni} onChange={(t) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, ripetizioni: t }))} placeholder="8-10, 12, 30 s" max={30} />
                        <Campo flessibile fondo={p.carta} etichetta="Carico" value={e.carico} onChange={(t) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, carico: t }))} placeholder="40 kg, corpo libero" max={40} />
                      </View>
                      <View style={stili.fila}>
                        <Campo
                          flessibile
                          numerico
                          fondo={p.carta}
                          etichetta="% del massimale"
                          value={e.percentuale != null ? String(e.percentuale) : ''}
                          onChange={(t) => {
                            const cifre = t.replace(/\D/g, '')
                            sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, percentuale: cifre ? Number(cifre) : null }))
                          }}
                          placeholder="es. 70"
                          max={3}
                        />
                        <Campo flessibile fondo={p.carta} etichetta="Superserie (una lettera)" value={e.superserie} onChange={(t) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, superserie: t.replace(/[^a-zA-Z]/g, '').toUpperCase() }))} placeholder="A" max={1} />
                      </View>
                      {e.percentuale != null ? <Text style={[stili.sotto, { color: p.testoSecondario }]}>Dopo il test dei massimali, nell’app la percentuale diventa i tuoi chili. Vuota, vale il carico che scrivi sopra.</Text> : null}
                      <View style={stili.fila}>
                        <Stepper fondo={p.carta} etichetta="Recupero dopo l’ultima serie" valore={e.recupero_dopo} min={0} max={900} passo={15} formato={recupero} onCambia={(n) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, recupero_dopo: n }))} />
                      </View>
                      <Campo fondo={p.carta} etichetta="Note sull’esercizio" value={e.note} onChange={(t) => sulEsercizio(g.chiave, e.chiave, (z) => ({ ...z, note: t }))} placeholder="Tempo, presa, cedimento…" max={300} multiline />
                      <View style={stili.comandi}>
                        <Icone icona="su" etichetta={`Sposta su ${e.nome}`} spento={ei === 0} onPress={() => sposta(g.chiave, e.chiave, -1)} />
                        <Icone icona="giu" etichetta={`Sposta giù ${e.nome}`} spento={ei === g.esercizi.length - 1} onPress={() => sposta(g.chiave, e.chiave, 1)} />
                        <Icone icona="cestino" etichetta={`Togli ${e.nome}`} onPress={() => sulGiorno(g.chiave, (y) => ({ ...y, esercizi: y.esercizi.filter((z) => z.chiave !== e.chiave) }))} />
                        <View style={{ flex: 1 }} />
                      </View>
                      <View style={stili.fila}>
                        <View style={{ flex: 1 }}>
                          <Pulsante testo="Cambia esercizio" variante="contorno" piccolo onPress={() => setScelta({ giorno: g.chiave, esercizio: e.chiave })} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Pulsante testo="Fatto" variante="scuro" piccolo onPress={() => setAperto(null)} />
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              )
            })}
            {g.esercizi.length < ESERCIZI_GIORNO_MAX ? <Pulsante testo="Aggiungi un esercizio" icona="piu" variante="secondario" onPress={() => setScelta({ giorno: g.chiave })} /> : null}
          </Carta>
        </Sezione>
      ))}

      {form.giorni.length < GIORNI_MAX ? (
        <Pulsante testo="Aggiungi un giorno" icona="piu" variante="contorno" onPress={() => aggiorna((x) => ({ ...x, giorni: [...x.giorni, giornoVuoto(x.giorni.length)] }))} />
      ) : null}

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo={modo === 'modifica' ? 'Salva le modifiche' : modo === 'nuovo' ? 'Salva il piano' : 'Conferma e aggiungi ai tuoi piani'} icona="spunta" inCorso={salvando} onPress={salva} />
      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        È un piano tuo, ma i trainer del club lo possono vedere dal pannello, per verificarlo e aiutarti a seguirlo. Non sostituisce il parere di un istruttore: con dolori o infortuni parlane prima con un istruttore in sala.
      </Text>

      <SceltaEsercizio
        aperto={!!scelta}
        titolo={scelta?.esercizio ? 'Cambia esercizio' : sceltaCorrente ? `Aggiungi a ${sceltaCorrente.nome.trim() || 'questo giorno'}` : 'Scegli un esercizio'}
        onChiudi={() => setScelta(null)}
        onScegli={scegliEsercizio}
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
  tag: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  comandi: { flexDirection: 'row', gap: 6 },
  nome: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 19, letterSpacing: -0.2 },
  sotto: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
  dettagli: { gap: spazio.tre, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre },
  fila: { flexDirection: 'row', gap: spazio.due },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
})
