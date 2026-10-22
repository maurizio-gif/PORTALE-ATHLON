import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { aggiornaDispositivi, type AllenamentoDispositivo, type GiornoDispositivo } from '@/api/dispositivi'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { dopo, durata, giornoBreve, giorniUnici, inizialeGiorno, nomeSport, piuRecenti, quando, recupero } from '../dispositivi/comune'
import { dispositiviCollegabili, type Dispositivi } from '../dispositivi/useDispositivi'
import { spostaGiorno } from '../schede/contatoreCalorie'
import { useProgresso } from '../schede/ContatoreCalorie'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Bollino, Carta, Entra, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { F, RELAX, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CheckInSonno } from './CheckInSonno'

// L'area Relax di Fit (19/10/2026): il recupero, con quello che dicono l'anello Oura e gli
// orologi Polar del socio. Dal 20/10/2026 **il sonno si scrive anche a mano** (CheckInSonno.tsx:
// una domanda al mattino), perche' Relax e' il terzo pilastro dell'Athlon Health Score e non puo'
// dipendere dal possedere un dispositivo: l'area c'e' per tutti i maggiorenni. Senza consenso e' la
// porta per attivarla (il consenso e i collegamenti stanno in /allenamento/dispositivi); col consenso
// mostra il check-in, la notte, il recupero, gli ultimi sette giorni di sonno e, se c'e' un dispositivo
// collegato, i suoi allenamenti.
// **Descrive, non consiglia**: nessuna frase dice cosa fare in base ai numeri, e le parole
// del recupero sono morbide («da ricaricare», mai un allarme), e gli anelli e le colonne sono in
// scala 0-10 ore (non c'e' un «obiettivo di sonno» che l'anello debba riempire). Sono valori
// indicativi del dispositivo, e lo si dice. Mai in vista cliente: sono dati sulla salute.

const apriDispositivi = () => router.push('/allenamento/dispositivi')

const cose = (collegabili: boolean): { icona: NomeIcona; testo: string }[] => [
  { icona: 'foglia', testo: t('Il tuo sonno: lo scrivi in dieci secondi ogni mattina, e conta nel tuo Athlon Health Score.', 'Your sleep: log it in ten seconds each morning, and it counts toward your Athlon Health Score.') },
  ...(collegabili ? [{ icona: 'cronometro' as const, testo: t('Con un anello Oura o un orologio Polar il sonno, il recupero e gli allenamenti arrivano da soli.', 'With an Oura ring or a Polar watch, your sleep, recovery and workouts come in by themselves.') }] : []),
  { icona: 'lucchetto', testo: t('Li vedi solo tu, e togli il permesso quando vuoi.', 'Only you see them, and you can withdraw permission whenever you like.') },
]

export function AreaRelax({ disp }: { disp: Dispositivi }) {
  const p = usePalette()
  const { stato, dati } = disp

  if (disp.vista) {
    return (
      <Messaggio tono="attenzione" titolo={t('Non visibile nella vista cliente', 'Not visible in client view')}>
        {t('Relax contiene dati sulla salute: lo vede solo il socio, dalla sua app.', 'Relax contains health data: only the member can see it, from their own app.')}
      </Messaggio>
    )
  }
  if (!stato) return <SchedeInArrivo quante={1} />
  if (!stato.ok) return <Messaggio>{stato.errore}</Messaggio>
  if (!stato.maggiorenne) {
    return (
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.titoletto, { color: p.testo }]}>{t('Relax è per i maggiorenni', 'Relax is for adults only')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Se nella tua scheda del club manca la data di nascita, chiedi al desk di aggiungerla.', 'If your date of birth is missing from your club profile, ask the front desk to add it.')}</Text>
      </Carta>
    )
  }

  if (!stato.consenso) {
    return (
      <Entra indice={0}>
        <Tocco onPress={apriDispositivi} etichetta={t('Attiva Relax', 'Turn on Relax')} scala={0.985}>
          <LinearGradient colors={RELAX} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.vetrina}>
            <Text style={stili.vetrinaTitolo}>{t('Recuperare fa parte dell’allenamento', 'Recovery is part of training')}</Text>
            <Text style={stili.vetrinaTesto}>{t('Scrivi quanto dormi e vedi qui come stai recuperando:', 'Log how much you sleep and see here how you’re recovering:')}</Text>
            <View style={{ gap: spazio.due }}>
              {cose(dispositiviCollegabili(stato)).map((c) => (
                <View key={c.icona} style={stili.riga}>
                  <View style={stili.bollo}>
                    <Icona nome={c.icona} size={16} colore="#fff" />
                  </View>
                  <Text style={[stili.vetrinaTesto, { flex: 1 }]}>{c.testo}</Text>
                </View>
              ))}
            </View>
            <Text style={stili.vetrinaPiccola}>{t('Prima di cominciare si legge e si accetta l’informativa: i dati sono tuoi, e li vedi solo tu.', 'Before you start, you read and accept the privacy notice: the data is yours, and only you see it.')}</Text>
            <View style={stili.vetrinaPulsante}>
              <Text style={stili.vetrinaPulsanteTesto}>{t('Attiva Relax', 'Turn on Relax')}</Text>
              <Icona nome="avanti" size={16} colore={RELAX[2]} />
            </View>
          </LinearGradient>
        </Tocco>
      </Entra>
    )
  }

  if (!dati) return <SchedeInArrivo quante={2} />
  return <Dati disp={disp} />
}

// ---------------------------------------------------------------------------

function Anello({ quota, centro, sotto, colore }: { quota: number; centro: string; sotto: string; colore: string }) {
  const a = useProgresso(1200)
  const r = 46
  const giro = 2 * Math.PI * r
  return (
    <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
      <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={112} height={112} viewBox="0 0 112 112">
          <Circle cx={56} cy={56} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={11} fill="none" />
          <Circle cx={56} cy={56} r={r} stroke={colore} strokeWidth={11} fill="none" strokeLinecap="round" strokeDasharray={`${giro} ${giro}`} strokeDashoffset={giro * (1 - Math.max(0, Math.min(1, quota)) * a)} transform="rotate(-90 56 56)" />
        </Svg>
        <View style={stili.anelloCentro}>
          <Text style={stili.anelloNumero} numberOfLines={1} adjustsFontSizeToFit>
            {centro}
          </Text>
        </View>
      </View>
      <Text style={stili.anelloSotto}>{sotto}</Text>
    </View>
  )
}

function Dati({ disp }: { disp: Dispositivi }) {
  const p = usePalette()
  const dati = disp.dati!
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const oggi = oggiRoma()
  const ieri = spostaGiorno(oggi, -1)

  const giorni = giorniUnici(dati.giorni)
  const notte = giorni.find((g) => g.sonno_minuti !== null) ?? null
  const rec = notte ? recupero(notte.recupero_scala, notte.recupero_valore) : null
  const riautorizza = dati.collegamenti.filter((c) => c.stato === 'da_riautorizzare')
  const ultimaLettura = dati.collegamenti.map((c) => c.ultimo_sync_il).filter((x): x is string => !!x).sort().at(-1) ?? null
  const allenamenti = piuRecenti(dati.allenamenti, 5)
  const collegati = dati.collegamenti.length > 0
  const collegabili = dispositiviCollegabili(disp.stato)

  async function aggiorna() {
    setInCorso(true)
    setErrore(null)
    const r = await aggiornaDispositivi()
    setInCorso(false)
    if (r.ok) disp.imposta(r)
    else setErrore(r.errore)
  }

  return (
    <View style={{ gap: spazio.tre }}>
      {riautorizza.map((c) => (
        <Messaggio key={c.fornitore} tono="attenzione" titolo={t(`${c.fornitore === 'oura' ? 'Oura' : 'Polar'} va ricollegato`, `${c.fornitore === 'oura' ? 'Oura' : 'Polar'} needs to be reconnected`)}>
          {c.ultimo_errore ?? t('Il dispositivo ha tolto l’accesso: collegalo di nuovo.', 'The device removed access: connect it again.')}
        </Messaggio>
      ))}
      {riautorizza.length ? <Pulsante testo={t('Ricollega', 'Reconnect')} icona="avanti" variante="secondario" onPress={apriDispositivi} /> : null}

      <Entra indice={0}>
        <CheckInSonno disp={disp} giorni={dati.giorni} />
      </Entra>

      {notte ? (
        <Entra indice={0}>
          <LinearGradient colors={RELAX} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.notte}>
            <Text style={stili.notteEtichetta}>{(notte.data === oggi ? t('Questa notte', 'Last night') : notte.data === ieri ? t('La notte scorsa', 'The night before') : t(`Notte del ${giornoBreve(notte.data)}`, `Night of ${giornoBreve(notte.data)}`)).toUpperCase()}</Text>
            <View style={stili.anelli}>
              <Anello quota={(notte.sonno_minuti ?? 0) / 600} centro={durata(notte.sonno_minuti ?? 0)} sotto={notte.sonno_punteggio !== null ? t(`Sonno · punteggio ${notte.sonno_punteggio}`, `Sleep · score ${notte.sonno_punteggio}`) : t('Sonno', 'Sleep')} colore="#fff" />
              {rec ? <Anello quota={rec.quota} centro={rec.parole} sotto={t(`Recupero · ${rec.valore}`, `Recovery · ${rec.valore}`)} colore="#FFD166" /> : null}
            </View>
            {particolari(notte) ? <Text style={stili.notteTesto}>{particolari(notte)}</Text> : null}
          </LinearGradient>
        </Entra>
      ) : collegati ? (
        <Carta style={{ gap: spazio.due }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>{t('Ancora niente da mostrare', 'Nothing to show yet')}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('I dati arrivano quando il dispositivo ha sincronizzato col telefono: di solito entro la mezz’ora.', 'The data comes in once the device has synced with your phone: usually within half an hour.')}</Text>
        </Carta>
      ) : null}

      {!collegati && collegabili ? (
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.riga}>
            <Bollino icona="orologio" tono="neutro" size={46} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[stili.titoletto, { color: p.testo }]}>{t('Hai un anello o un orologio?', 'Do you have a ring or a watch?')}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Oura o Polar: il sonno e il recupero arrivano da soli, senza scriverli.', 'Oura or Polar: your sleep and recovery come in by themselves, no logging needed.')}</Text>
            </View>
          </View>
          <Pulsante testo={t('Collega', 'Connect')} icona="avanti" variante="secondario" onPress={apriDispositivi} />
        </Carta>
      ) : null}

      {giorni.length > 1 || notte ? (
        <Entra indice={1}>
          <Sezione titolo={t('Gli ultimi sette giorni', 'The last seven days')}>
            <Carta style={{ gap: spazio.tre }}>
              <Settimana giorni={giorni} oggi={oggi} />
              <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Ore di sonno per notte. Il giorno è quello del risveglio.', 'Hours of sleep per night. The day is the one you woke up.')}</Text>
            </Carta>
          </Sezione>
        </Entra>
      ) : null}

      <Attivita giorni={giorni} oggi={oggi} ieri={ieri} />

      {collegati ? (
      <Entra indice={3}>
        <Sezione titolo={t('Allenamenti dei dispositivi', 'Device workouts')}>
          {allenamenti.length ? (
            <Carta style={{ gap: spazio.tre }}>
              {allenamenti.map((a, i) => (
                <RigaAllenamento key={a.id} a={a} oggi={oggi} ieri={ieri} primo={i === 0} />
              ))}
            </Carta>
          ) : (
            <Carta>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Nessun allenamento registrato dal dispositivo negli ultimi giorni.', 'No workouts recorded by your device in the last few days.')}</Text>
            </Carta>
          )}
        </Sezione>
      </Entra>
      ) : null}

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Text style={[stili.piccola, { color: p.testoTerzo, paddingHorizontal: 2 }]}>
        {collegati
          ? t(`Aggiornato ${dopo(ultimaLettura)}. Valori indicativi del tuo dispositivo: non sono un parere medico.`, `Updated ${dopo(ultimaLettura)}. Approximate values from your device: not medical advice.`)
          : t('Il sonno che hai scritto tu. Sono valori indicativi: non sono un parere medico.', 'The sleep you logged yourself. These are approximate values: not medical advice.')}
      </Text>
      <View style={stili.azioni}>
        {collegati ? (
          <View style={{ flex: 1 }}>
            <Pulsante testo={t('Aggiorna', 'Refresh')} icona="aggiorna" variante="secondario" piccolo inCorso={inCorso} onPress={aggiorna} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Pulsante testo={collegati || collegabili ? t('I dispositivi', 'Devices') : t('Consenso e dati', 'Consent and data')} icona={collegati || collegabili ? 'orologio' : 'lucchetto'} variante="contorno" piccolo onPress={apriDispositivi} />
        </View>
      </View>
    </View>
  )
}

/** «A letto 23:30 · sveglio 07:00 · Profondo 1 h 20 · REM 1 h 40 · battito più basso 48 · HRV 62 ms», con solo quello che c'e'. */
function particolari(g: GiornoDispositivo): string {
  const pezzi: string[] = []
  if (g.sonno_a_letto && g.sonno_sveglia) pezzi.push(t(`A letto ${g.sonno_a_letto} · sveglio ${g.sonno_sveglia}`, `In bed ${g.sonno_a_letto} · awake ${g.sonno_sveglia}`))
  if (g.sonno_profondo_minuti !== null) pezzi.push(t(`Profondo ${durata(g.sonno_profondo_minuti)}`, `Deep ${durata(g.sonno_profondo_minuti)}`))
  if (g.sonno_rem_minuti !== null) pezzi.push(`REM ${durata(g.sonno_rem_minuti)}`)
  if (g.fc_notte !== null) pezzi.push(t(`battito più basso ${g.fc_notte}`, `lowest heart rate ${g.fc_notte}`))
  if (g.hrv_ms !== null) pezzi.push(`HRV ${Math.round(g.hrv_ms)} ms`)
  return pezzi.join(' · ')
}

function Settimana({ giorni, oggi }: { giorni: GiornoDispositivo[]; oggi: string }) {
  const p = usePalette()
  const a = useProgresso(900)
  const sette = Array.from({ length: 7 }, (_, i) => spostaGiorno(oggi, i - 6))
  const per = new Map(giorni.map((g) => [g.data, g]))
  const ALTEZZA = 84
  return (
    <View style={stili.settimana}>
      {sette.map((d) => {
        const m = per.get(d)?.sonno_minuti ?? null
        const h = m === null ? 4 : Math.max(6, Math.min(1, m / 600) * ALTEZZA * a)
        return (
          <View key={d} style={stili.colonna}>
            <Text style={[stili.colonnaValore, { color: p.testoSecondario }]}>{m === null ? '' : t((m / 60).toFixed(1).replace('.', ','), (m / 60).toFixed(1))}</Text>
            <View style={{ height: ALTEZZA, justifyContent: 'flex-end' }}>
              <View style={{ height: h, width: 22, borderRadius: 8, backgroundColor: m === null ? p.incavo : d === oggi ? RELAX[1] : `${RELAX[1]}99` }} />
            </View>
            <Text style={[stili.colonnaGiorno, { color: d === oggi ? p.testo : p.testoTerzo }]}>{inizialeGiorno(d)}</Text>
          </View>
        )
      })}
    </View>
  )
}

/** Passi e calorie dell'attivita' dell'ultimo giorno che li ha: oggi, o ieri se oggi non ne ha ancora. */
function Attivita({ giorni, oggi, ieri }: { giorni: GiornoDispositivo[]; oggi: string; ieri: string }) {
  const p = usePalette()
  const g = giorni.find((x) => (x.data === oggi || x.data === ieri) && (x.passi !== null || x.calorie_attive !== null))
  if (!g) return null
  return (
    <Entra indice={2}>
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.sottoTitolo, { color: p.testo }]}>{g.data === oggi ? t('Oggi', 'Today') : t('Ieri', 'Yesterday')}</Text>
        <View style={stili.azioni}>
          {g.passi !== null ? <Cifra valore={g.passi.toLocaleString(locale())} etichetta={t('passi', 'steps')} /> : null}
          {g.calorie_attive !== null ? <Cifra valore={g.calorie_attive.toLocaleString(locale())} etichetta={t('kcal di movimento', 'active kcal')} /> : null}
        </View>
      </Carta>
    </Entra>
  )
}

function Cifra({ valore, etichetta }: { valore: string; etichetta: string }) {
  const p = usePalette()
  return (
    <View style={[stili.cifra, { backgroundColor: p.incavo }]}>
      <Text style={[stili.cifraValore, { color: p.testo }]}>{valore}</Text>
      <Text style={[stili.piccola, { color: p.testoSecondario }]}>{etichetta}</Text>
    </View>
  )
}

function RigaAllenamento({ a, oggi, ieri, primo }: { a: AllenamentoDispositivo; oggi: string; ieri: string; primo: boolean }) {
  const p = usePalette()
  const pezzi = [durata(a.durata_minuti), a.calorie !== null ? `${a.calorie} kcal` : null, a.fc_media !== null ? t(`battito medio ${a.fc_media}`, `average heart rate ${a.fc_media}`) : null].filter(Boolean)
  return (
    <View style={[stili.allenamento, !primo && { borderTopColor: p.linea, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre }]}>
      <Bollino icona="cronometro" tono="accento" size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[stili.nome, { color: p.testo }]}>{nomeSport(a.sport)}</Text>
        <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`${quando(a.inizio, oggi, ieri)} · ${pezzi.join(' · ')}`}</Text>
      </View>
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>{a.fornitore === 'oura' ? 'Oura' : 'Polar'}</Text>
    </View>
  )
}

const stili = StyleSheet.create({
  titoletto: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  sottoTitolo: { fontFamily: F.extra, fontSize: 16 },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  azioni: { flexDirection: 'row', gap: spazio.due },
  vetrina: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre },
  vetrinaTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  vetrinaTesto: { color: 'rgba(255,255,255,0.92)', fontFamily: F.semi, fontSize: 14, lineHeight: 19 },
  vetrinaPiccola: { color: 'rgba(255,255,255,0.85)', fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  bollo: { width: 32, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  vetrinaPulsante: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 999, minHeight: 48 },
  vetrinaPulsanteTesto: { color: RELAX[2], fontFamily: F.extra, fontSize: 15 },
  notte: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre },
  notteEtichetta: { color: 'rgba(255,255,255,0.75)', fontFamily: F.bold, fontSize: 11, letterSpacing: 0.8 },
  notteTesto: { color: 'rgba(255,255,255,0.9)', fontFamily: F.medio, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  anelli: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', gap: spazio.due },
  anelloCentro: { position: 'absolute', alignItems: 'center', width: 76 },
  anelloNumero: { color: '#fff', fontFamily: F.extra, fontSize: 21 },
  anelloSotto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi, fontSize: 12, textAlign: 'center' },
  settimana: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  colonna: { alignItems: 'center', gap: 4, flex: 1 },
  colonnaValore: { fontFamily: F.semi, fontSize: 11, minHeight: 14 },
  colonnaGiorno: { fontFamily: F.bold, fontSize: 12 },
  cifra: { flex: 1, borderRadius: 16, padding: spazio.tre, gap: 2 },
  cifraValore: { fontFamily: F.extra, fontSize: 22 },
  allenamento: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
})
