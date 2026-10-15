import { router } from 'expo-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { elencoMisure, leggiAnagrafica, salvaSessoCalcolo, storicoAllenamenti, type Anagrafica, type Misura, type SchedaLab, type SedutaStorico, type SessoCalcolo } from '@/api/lab'
import { spazio } from '@/theme'

import { altezzaAl, dataCorta } from '../dati/calcoli'
import { CHIAVE_MISURE } from '../dati/Misure'
import { inMemoria, prendi, ricorda } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, LinkSezione, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CHIAVE_STORICO } from './Storico'
import {
  COSTANTE_SESSO,
  EPOC,
  etaDa,
  FATTORE_RIPOSO,
  MET_DEFATICAMENTO,
  MET_INTENSO,
  MET_MEDIO,
  MET_MODERATO,
  MET_RISCALDAMENTO,
  SECONDI_CAMBIO_ESERCIZIO,
  SECONDI_PER_RIPETIZIONE,
  SECONDI_PREPARAZIONE,
  stimaScheda,
  type Stima,
} from './stimaCalorie'

// Le calorie stimate di una scheda, sotto gli esercizi: la seduta del giorno
// scelto, la settimana, il metabolismo a riposo e il fabbisogno di massima.
// Il foglio «Come le abbiamo calcolate» rifa' il conto coi numeri del socio.
// Il sesso della formula lo sceglie il socio, qui, una volta (PerfectGym non
// e' affidabile): finche' non sceglie, la stima usa la via di mezzo.
// Il calcolo e' in stimaCalorie.ts (non calorie.ts: su un disco che non distingue le maiuscole si confondeva con questo file).
// Lo storico serve alla durata: le sedute chiuse di un giorno vincono sulla stima.

const intero = (n: number) => Math.round(n).toLocaleString('it-IT')
const decimale = (n: number, d = 1) => n.toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: 0 })

type Corpo = {
  anagrafica: Anagrafica | null
  anagraficaLetta: boolean
  misure: Misura[] | null
  sesso: SessoCalcolo
  setSesso: (s: SessoCalcolo) => void
  sedute: SedutaStorico[] | null
}
type StoricoInMemoria = { ok: true; allenamenti: SedutaStorico[] }
type MisureInMemoria = { ok: true; misure: Misura[]; sesso: SessoCalcolo }

function useCorpo(): Corpo {
  const [anagrafica, setAnagrafica] = useState<Anagrafica | null>(() => inMemoria<{ ok: true; anagrafica: Anagrafica }>('anagrafica')?.anagrafica ?? null)
  const [anagraficaLetta, setLetta] = useState(!!anagrafica)
  const [misure, setMisure] = useState<Misura[] | null>(() => inMemoria<MisureInMemoria>(CHIAVE_MISURE)?.misure ?? null)
  const [sesso, setSesso] = useState<SessoCalcolo>(() => inMemoria<MisureInMemoria>(CHIAVE_MISURE)?.sesso ?? null)
  const [sedute, setSedute] = useState<SedutaStorico[] | null>(() => inMemoria<StoricoInMemoria>(CHIAVE_STORICO)?.allenamenti ?? null)
  useEffect(() => {
    let vivo = true
    prendi('anagrafica', leggiAnagrafica).then((r) => {
      if (!vivo) return
      if (r.ok) setAnagrafica(r.anagrafica)
      setLetta(true)
    })
    prendi(CHIAVE_MISURE, elencoMisure).then((r) => {
      if (!vivo || !r.ok) return
      setMisure(r.misure)
      setSesso(r.sesso)
    })
    // Senza storico la stima resta quella della scheda: non si aspetta e non si avvisa.
    prendi(CHIAVE_STORICO, storicoAllenamenti).then((r) => {
      if (vivo && r.ok) setSedute(r.allenamenti)
    })
    return () => {
      vivo = false
    }
  }, [])
  return { anagrafica, anagraficaLetta, misure, sesso, setSesso, sedute }
}

/** Uomo o donna, per la formula: due pulsanti uguali, e quello scelto pieno. */
function SceltaSesso({ sesso, onScegli, inCorso }: { sesso: SessoCalcolo; onScegli: (s: 'm' | 'f') => void; inCorso: boolean }) {
  const p = usePalette()
  return (
    <View style={{ flexDirection: 'row', gap: spazio.due }}>
      {(
        [
          ['m', 'Uomo'],
          ['f', 'Donna'],
        ] as const
      ).map(([v, testo]) => {
        const scelto = sesso === v
        return (
          <Tocco
            key={v}
            vibra="scelta"
            stato={{ selected: scelto, disabled: inCorso }}
            onPress={() => !inCorso && onScegli(v)}
            etichetta={`Calcola come ${testo.toLowerCase()}`}
            style={[stili.scelta, { backgroundColor: scelto ? p.testo : p.carta, borderColor: scelto ? p.testo : p.linea }]}
          >
            <Text style={{ color: scelto ? p.fondo : p.testo, fontFamily: F.extra, fontSize: 15 }}>{testo}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

function Cifra({ valore, etichetta, bordo }: { valore: string; etichetta: string; bordo: boolean }) {
  const p = usePalette()
  return (
    <View style={[stili.cifra, bordo && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: p.linea }]}>
      <Text style={[stili.cifraValore, { color: p.testo }]} numberOfLines={1}>
        {valore}
      </Text>
      <Text style={[stili.cifraEtichetta, { color: p.testoSecondario }]}>{etichetta}</Text>
    </View>
  )
}

function Paragrafo({ titolo, children }: { titolo: string; children: ReactNode }) {
  const p = usePalette()
  return (
    <View style={{ gap: 4 }}>
      <Text style={[stili.titoletto, { color: p.testo }]}>{titolo}</Text>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{children}</Text>
    </View>
  )
}

function FoglioCalcolo({ aperto, stima, giorno, dataPeso, onChiudi }: { aperto: boolean; stima: Stima; giorno: number; dataPeso: string | null; onChiudi: () => void }) {
  const p = usePalette()
  const g = stima.giorni[giorno]
  const costante = COSTANTE_SESSO[stima.sesso ?? 'x']
  const alMinuto = stima.bmr / 1440
  const forte = (t: string) => <Text style={{ fontFamily: F.extra, color: p.testo }}>{t}</Text>
  return (
    <Foglio aperto={aperto} titolo="Come le abbiamo calcolate" sottotitolo="Una stima di massima, rifatta qui coi tuoi numeri." onChiudi={onChiudi}>
      <View style={{ gap: spazio.tre + 2 }}>
        <Paragrafo titolo="1. Quanto consumi a riposo">
          Con la formula di Mifflin-St Jeor, la più usata per gli adulti: 10 × {decimale(stima.kg)} kg + 6,25 × {decimale(stima.cm)} cm − 5 × {stima.anni} anni{' '}
          {costante >= 0 ? '+' : '−'} {Math.abs(costante)}
          {stima.sesso === 'm' ? ' (uomo)' : stima.sesso === 'f' ? ' (donna)' : ' (il valore di mezzo fra uomo e donna, finché non scegli quale usare)'} ={' '}
          {forte(`${intero(stima.bmr)} kcal al giorno`)}. È quello che il corpo consuma senza fare niente: {decimale(alMinuto, 2)} kcal al minuto.
        </Paragrafo>
        {g ? (
          <Paragrafo titolo={`2. Quanto dura «${g.nome}»`}>
            {g.vera ? (
              <>
                La parte coi pesi l’abbiamo presa dalle tue sedute vere: {g.vera.sedute === 1 ? 'quella che hai chiuso' : `la durata di mezzo delle ${g.vera.sedute} che hai chiuso`}, dall’avvio
                alla chiusura, cioè {forte(`${g.pesi.minuti} minuti`)}. Vale più di qualunque stima, perché dentro ci sono i tuoi ritmi e i tuoi recuperi.
              </>
            ) : (
              <>
                La parte coi pesi l’abbiamo seguita serie per serie, superserie comprese: ogni ripetizione {SECONDI_PER_RIPETIZIONE} secondi (2 per salire e 2 per scendere), ogni serie{' '}
                {SECONDI_PREPARAZIONE} secondi per prendere posizione, poi il recupero scritto, e {intero(SECONDI_CAMBIO_ESERCIZIO / 60)} minuto per esercizio per sistemare la macchina o
                caricare il bilanciere. Sono {g.serie} serie: circa {g.pesi.lavoro} minuti di lavoro, {g.pesi.recupero} di recupero e {g.pesi.cambi} di cambi, {forte(`${g.pesi.minuti} minuti`)}.
                Quando chiudi qualche seduta di questo giorno, usiamo la durata vera.
              </>
            )}{' '}
            {g.riscaldamento.minuti || g.defaticamento.minuti
              ? `La nota del giorno aggiunge ${[
                  g.riscaldamento.minuti ? `${decimale(g.riscaldamento.minuti)} minuti di riscaldamento` : '',
                  g.defaticamento.minuti ? `${decimale(g.defaticamento.minuti)} di defaticamento` : '',
                ]
                  .filter(Boolean)
                  .join(' e ')}: in tutto circa ${g.minuti} minuti.`
              : 'La nota del giorno non dice quanto dura il riscaldamento, e non lo contiamo.'}
          </Paragrafo>
        ) : null}
        {g ? (
          <Paragrafo titolo="3. Quanto consuma la seduta">
            Il Compendium of Physical Activities dà a ogni attività un MET, cioè quante volte consuma più del riposo. Coi pesi va da {decimale(MET_MODERATO)} (intensità moderata) a{' '}
            {decimale(MET_INTENSO)} (impegnativa: recuperi brevi, serie vicine al cedimento), e la stima sta in mezzo, a {decimale(MET_MEDIO, 2)}: {g.pesi.minuti} minuti ×{' '}
            {decimale(alMinuto, 2)} kcal × {decimale(MET_MEDIO, 2)} = {forte(`circa ${intero(g.pesi.circa)} kcal`)} (da {intero(g.pesi.da)} a {intero(g.pesi.a)}).
            {g.riscaldamento.minuti ? ` Il riscaldamento, a ${decimale(MET_RISCALDAMENTO)} MET come la cyclette leggera, ne aggiunge ${intero(g.riscaldamento.kcal)}.` : ''}
            {g.defaticamento.minuti ? ` Il defaticamento, a ${decimale(MET_DEFATICAMENTO)} MET come lo stretching, ${intero(g.defaticamento.kcal)}.` : ''} Dopo i pesi il corpo
            continua a consumare di più per qualche ora: gli studi danno dal 5 al 15% di quello che la seduta ha aggiunto al riposo, e noi contiamo il {intero(EPOC * 100)}%, cioè circa{' '}
            {intero(g.epoc.circa)} kcal. In tutto {forte(`circa ${intero(g.circa)} kcal`)}, da {intero(g.da)} a {intero(g.a)}. Contano anche le calorie che avresti consumato comunque in
            quei minuti.
          </Paragrafo>
        ) : null}
        <Paragrafo titolo="4. La settimana e il fabbisogno">
          {stima.sedute} {stima.sedute === 1 ? 'seduta' : 'sedute'} a settimana, con la media dei giorni della scheda: {forte(`circa ${intero(stima.settimana.circa)} kcal`)}. Il fabbisogno
          di massima è il consumo a riposo × {decimale(FATTORE_RIPOSO)} per una giornata normale fuori dalla sala, più quello che l’allenamento aggiunge, spalmato sui sette giorni:{' '}
          {forte(`circa ${intero(stima.fabbisogno)} kcal al giorno`)}. Se di giorno ti muovi molto (lavoro in piedi, bici, camminate) è di più.
        </Paragrafo>
        <View style={[stili.avviso, { backgroundColor: p.incavo }]}>
          <Icona nome="info" size={17} colore={p.blu} />
          <Text style={[stili.piccola, { color: p.testo, flex: 1 }]}>
            {`Sono stime: possono sbagliare anche del 20–30%, perché dipendono da quanto carichi, da quanto rispetti i recuperi e da come è fatto il tuo corpo. Non sono un’indicazione per la dieta: per quella rivolgiti a un professionista. L’età viene dalla tua scheda del club, il sesso l’hai scelto tu, peso e altezza da «I tuoi dati»${dataPeso ? ` (peso del ${dataCorta(dataPeso)})` : ''}.`}
          </Text>
        </View>
      </View>
    </Foglio>
  )
}

/** Il riquadro delle calorie per una scheda, sul giorno scelto. */
export function CalorieScheda({ scheda, giorno }: { scheda: SchedaLab; giorno: number }) {
  const p = usePalette()
  const { anagrafica, anagraficaLetta, misure, sesso, setSesso, sedute } = useCorpo()
  const [spiega, setSpiega] = useState(false)
  const [cambia, setCambia] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroreSesso, setErroreSesso] = useState<string | null>(null)

  async function scegli(s: 'm' | 'f') {
    const prima = sesso
    setErroreSesso(null)
    setSesso(s)
    setSalvando(true)
    const r = await salvaSessoCalcolo(s)
    setSalvando(false)
    if (!r.ok) {
      setSesso(prima)
      return setErroreSesso(r.errore)
    }
    setCambia(false)
    // Anche «I tuoi dati» e le altre schede leggono questa memoria.
    const m = inMemoria<MisureInMemoria>(CHIAVE_MISURE)
    if (m) ricorda(CHIAVE_MISURE, { ...m, sesso: s })
  }

  const ultimoPeso = misure ? [...misure].reverse().find((m) => m.peso_kg != null) ?? null : null
  const cm = misure?.length ? altezzaAl(misure, misure.length - 1) : null
  const anni = etaDa(anagrafica?.data_nascita)

  const stima = useMemo(
    () =>
      ultimoPeso?.peso_kg && cm && anni
        ? stimaScheda(scheda.giorni, scheda.giorni_settimana, { kg: ultimoPeso.peso_kg, cm, anni, sesso }, { titolo: scheda.titolo, sedute })
        : null,
    [scheda, ultimoPeso?.peso_kg, cm, anni, sesso, sedute],
  )

  // Finche' arrivano i dati non si mostra niente: il riquadro sta in fondo e non deve saltare.
  if (!misure || !anagraficaLetta) return null

  const testa = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
      <Icona nome="fiamma" size={20} colore={p.accento} />
      <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>Calorie stimate</Text>
    </View>
  )

  if (!ultimoPeso?.peso_kg || !cm) {
    return (
      <Carta style={{ gap: spazio.due }}>
        {testa}
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          Segna il tuo peso e la tua altezza: con l’età della tua scheda del club ti diciamo quanto consuma questa scheda, seduta per seduta, e come l’abbiamo calcolato.
        </Text>
        <Pulsante testo="Aggiungi i tuoi dati" icona="piu" variante="secondario" onPress={() => router.push('/lab/allenamento/misure')} />
      </Carta>
    )
  }
  if (!anni || !stima) {
    return (
      <Carta style={{ gap: spazio.due }}>
        {testa}
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {anagrafica
            ? 'Nella tua scheda del club manca la data di nascita, e senza l’età la stima non si può fare. Chiedi al desk di aggiungerla: poi qui la trovi da sola.'
            : 'Adesso non riusciamo a leggere la tua età dalla scheda del club. Riprova fra poco.'}
        </Text>
      </Carta>
    )
  }

  const g = stima.giorni[Math.min(giorno, stima.giorni.length - 1)]
  return (
    <Carta style={{ gap: spazio.tre }}>
      {testa}
      {g ? (
        <View style={{ gap: 2 }}>
          <Text style={[stili.grande, { color: p.testo }]}>
            {`circa ${intero(g.circa)} `}
            <Text style={[stili.unita, { color: p.testoTerzo }]}>kcal</Text>
          </Text>
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`${scheda.giorni.length > 1 ? `${g.nome}: ` : ''}da ${intero(g.da)} a ${intero(g.a)} kcal · circa ${g.minuti} minuti${g.riscaldamento.minuti || g.defaticamento.minuti ? ' con riscaldamento e defaticamento' : ''}, ${g.serie} serie${g.vera ? ' · durata dalle tue sedute' : ''}`}</Text>
        </View>
      ) : null}
      <View style={[stili.cifre, { backgroundColor: p.incavo }]}>
        <Cifra valore={`${intero(stima.settimana.circa)}`} etichetta={`kcal a settimana · ${stima.sedute} ${stima.sedute === 1 ? 'seduta' : 'sedute'}`} bordo={false} />
        <Cifra valore={`${intero(stima.bmr)}`} etichetta="kcal/giorno a riposo" bordo />
        <Cifra valore={`${intero(stima.fabbisogno)}`} etichetta="kcal/giorno fabbisogno" bordo />
      </View>
      {!sesso || cambia ? (
        <View style={[stili.domanda, { backgroundColor: p.incavo }]}>
          <Text style={[stili.nota, { color: p.testo }]}>
            {sesso ? 'Quale formula usiamo per te?' : 'La formula cambia fra uomo e donna: quale usiamo per te? Finché non scegli, usiamo il valore di mezzo.'}
          </Text>
          <SceltaSesso sesso={sesso} onScegli={scegli} inCorso={salvando} />
          {erroreSesso ? <Messaggio>{erroreSesso}</Messaggio> : null}
        </View>
      ) : null}
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>
        {`Su ${stima.anni} anni, ${decimale(stima.kg)} kg e ${decimale(stima.cm)} cm, ${stima.sesso === 'm' ? 'come uomo' : stima.sesso === 'f' ? 'come donna' : 'col valore di mezzo fra uomo e donna'}. È una stima di massima.`}
        {sesso && !cambia ? (
          <Text style={{ color: p.accento, fontFamily: F.bold }} onPress={() => setCambia(true)} accessibilityRole="link">
            {' Cambia'}
          </Text>
        ) : null}
      </Text>
      <LinkSezione testo="Come le abbiamo calcolate" onPress={() => setSpiega(true)} />
      <FoglioCalcolo aperto={spiega} stima={stima} giorno={Math.min(giorno, stima.giorni.length - 1)} dataPeso={ultimoPeso.data} onChiudi={() => setSpiega(false)} />
    </Carta>
  )
}

const stili = StyleSheet.create({
  titoletto: { fontFamily: F.extra, fontSize: 16 },
  nota: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  piccola: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
  grande: { fontFamily: F.extra, fontSize: 32, letterSpacing: -1 },
  unita: { fontFamily: F.bold, fontSize: 15 },
  cifre: { flexDirection: 'row', borderRadius: 18, paddingVertical: spazio.tre },
  cifra: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  cifraValore: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  cifraEtichetta: { fontFamily: F.semi, fontSize: 11, textAlign: 'center' },
  domanda: { gap: spazio.due + 2, borderRadius: 18, padding: spazio.tre },
  scelta: { flex: 1, minHeight: 48, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  avviso: { flexDirection: 'row', gap: spazio.due, borderRadius: 16, padding: spazio.tre, alignItems: 'flex-start' },
})
