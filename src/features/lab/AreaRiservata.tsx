import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router, type Href } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import type Animated from 'react-native-reanimated'

import { laMiaArea, leggiAnagrafica, leggiVetrine, elencoPagamenti, leggiGiorno, type Area, type CertificatoArea, type ContrattoArea, type PersonaArea } from '@/api/lab'
import { LARGO } from '@/components/Pagina'
import { MetodoAttualeBadge, statoLeggibile } from '@/features/metodo-pagamento/Metodo'
import { dataBreve, metodoDaPerfectGym } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'

import { inMemoria, precarica, prendi } from './memoria'
import { memoria as memoriaTv } from './tv/comune'
import { Icona, type NomeIcona } from './ui/Icona'
import { Avatar, Barra, Carta, Colonnine, Entra, Etichetta, Messaggio, Numero, Pulsante, Riga, SchedeInArrivo, Sezione, Tag } from './ui/kit'
import { Installa } from './ui/Installa'
import { AvvisoDebito, BollinoDebito } from './ui/Irregolarita'
import { Schermata } from './ui/Schermata'
import { PulsanteEsci } from './ui/Uscita'
import { F, FUOCO, MARE, NOTTE, usePalette } from './ui/tema'
import { Tocco } from './ui/Tocco'

// La mia area, in sola lettura: chi sono, la famiglia, gli abbonamenti col
// metodo di pagamento, il certificato medico. Tutto dal mirror di PerfectGym
// (portale_la_mia_area); niente si scrive.

function nome(p: Pick<PersonaArea, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'
}

const GIORNO = 86_400_000

/**
 * I giorni di calendario da oggi (a Roma) a quella data: 0 oggi, negativi nel
 * passato. Fra due mezzogiorni, non da adesso: con l'ora del momento le date
 * passate venivano un giorno corte.
 */
function giorniA(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso.slice(0, 10) + 'T12:00:00Z').getTime()
  const oggi = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date()) + 'T12:00:00Z').getTime()
  return Number.isFinite(t) ? Math.round((t - oggi) / GIORNO) : null
}

/** «martedì 14 ottobre», all'ora di Roma. */
function oggi(): string {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(new Date())
}

/** «1 giorno», «76 giorni». */
function giorni(n: number): string {
  return `${n} ${n === 1 ? 'giorno' : 'giorni'}`
}

/** Il giorno dei 6 anni, dalla data di nascita: da li' il certificato e' obbligatorio. */
function seiAnni(nascita: string | null | undefined): string | null {
  const m = String(nascita ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  // Date.UTC porta il 29 febbraio di un anno non bisestile al 1° marzo.
  return new Date(Date.UTC(Number(m[1]) + 6, Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10)
}

type StatoCertificato = {
  testo: string
  tono: 'ok' | 'attenzione' | 'errore' | 'neutro'
  /** I giorni alla scadenza (negativi se scaduto); null se non c'e' una scadenza da contare. */
  giorni: number | null
  /** La riga per esteso: «Valido fino al 31/07/2027 · ancora 289 giorni». */
  dettaglio: string
  /** La riga corta del riquadro scuro, quando non ci sono giorni da contare. */
  breve: string
  /** Manca, e' scaduto o va consegnato: si spiega quale certificato serve. */
  daConsegnare: boolean
}

/**
 * Lo stato del certificato (la fine del definitivo, dal database): valido o in
 * scadenza (30 giorni) fino a quando e per quanti giorni ancora, scaduto da
 * quando e da quanti giorni, mancante se non e' mai stato consegnato. Sotto i
 * 6 anni non serve; nell'ultimo mese prima dei 6 va consegnato, come nel CRM
 * (certificati_stato: «non_dovuto», «compie_6_anni»).
 */
function statoCertificato(ce: CertificatoArea | undefined, nascita?: string | null): StatoCertificato {
  const g = giorniA(ce?.scadenza ?? null)
  const data = dataBreve(ce?.scadenza)
  const sei = seiAnni(nascita)
  const aiSei = giorniA(sei)
  if (sei && aiSei != null && aiSei > 30) {
    return { testo: 'Non serve', tono: 'neutro', giorni: null, dettaglio: `Non serve fino ai 6 anni, il ${dataBreve(sei)}`, breve: 'fino ai 6 anni', daConsegnare: false }
  }
  if (sei && aiSei != null && aiSei > 0 && (g == null || g < aiSei)) {
    return { testo: 'Da consegnare', tono: 'attenzione', giorni: null, dettaglio: `Da consegnare entro il ${dataBreve(sei)}, quando compie 6 anni`, breve: `entro il ${dataBreve(sei)}`, daConsegnare: true }
  }
  if (g == null || !data) return { testo: 'Mancante', tono: 'neutro', giorni: null, dettaglio: 'Non è mai stato consegnato', breve: 'mai consegnato', daConsegnare: true }
  if (g < 0) return { testo: 'Scaduto', tono: 'errore', giorni: g, dettaglio: `Scaduto il ${data} · ${giorni(-g)} fa`, breve: '', daConsegnare: true }
  if (g === 0) return { testo: 'Scade oggi', tono: 'attenzione', giorni: 0, dettaglio: `Valido fino a oggi, ${data}`, breve: '', daConsegnare: false }
  return { testo: g <= 30 ? 'In scadenza' : 'Valido', tono: g <= 30 ? 'attenzione' : 'ok', giorni: g, dettaglio: `Valido fino al ${data} · ancora ${giorni(g)}`, breve: '', daConsegnare: false }
}

/** Il colore del pallino di un certificato, sul riquadro scuro. */
const PALLINO = { ok: '#6DD58C', attenzione: '#F2B84B', errore: '#FF6B6B', neutro: '#8E9098' } as const

// Quale certificato serve, dal wiki del club (Generali → Certificato medico).
// Senza «invialo al desk»: nel portale non si rimanda al desk (13/10/2026).
const QUALE_CERTIFICATO = [
  'Il certificato di idoneità all’attività sportiva non agonistica, obbligatorio dai 6 anni. Si consegna solo in formato digitale.',
  'Lo rilasciano il medico di base o il pediatra (per i propri assistiti), o un medico dello sport.',
  'Vale un anno dalla data di rilascio. Serve un ECG a riposo almeno una volta nella vita; ogni anno dopo i 60 anni, con fattori di rischio cardiovascolare.',
  'Il certificato agonistico serve solo per pallanuoto Under 14 e Under 16, nuoto agonistico e nuoto propaganda: lo rilascia solo il medico dello sport, con il modulo della società.',
]

/** La «i» con il fumetto di quale certificato serve: sul web al passaggio del mouse, sul telefono al tocco. */
function InfoCertificato({ aperta, onCambia }: { aperta: boolean; onCambia: (aperta: boolean) => void }) {
  const p = usePalette()
  // Aperto dal mouse, il clic che segue non lo deve richiudere.
  const conMouse = useRef(false)
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={() => onCambia(conMouse.current ? true : !aperta)}
        onHoverIn={() => {
          conMouse.current = true
          onCambia(true)
        }}
        onHoverOut={() => {
          conMouse.current = false
          onCambia(false)
        }}
        accessibilityRole="button"
        accessibilityLabel={`Quale certificato serve. ${QUALE_CERTIFICATO.join(' ')}`}
        hitSlop={10}
        style={[stili.info, { backgroundColor: p.incavo }]}
      >
        <Icona nome="info" size={16} colore={p.testo} />
      </Pressable>
      {aperta ? (
        <View style={[stili.fumetto, { backgroundColor: p.scuro ? '#2A2B31' : p.carbone }]} pointerEvents="none">
          <Text style={stili.fumettoTitolo}>Quale certificato serve</Text>
          {QUALE_CERTIFICATO.map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={stili.fumettoPunto} />
              <Text style={stili.fumettoTesto}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** Una riga dell'elenco dei certificati; se manca o e' scaduto, con la «i». */
function RigaCertificato({ persona, ce, prima }: { persona: PersonaArea | undefined; ce: CertificatoArea; prima: boolean }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  const s = statoCertificato(ce, persona?.data_nascita)
  return (
    // Col fumetto aperto la riga sta sopra le altre, che altrimenti lo coprirebbero.
    <View style={{ zIndex: aperta ? 10 : 0, elevation: aperta ? 10 : 0 }}>
      <Riga
        prima={prima}
        icona="certificato"
        tono={s.tono}
        titolo={persona ? nome(persona) : 'Certificato'}
        // L'etichetta sotto il testo e a destra solo la «i»: insieme a destra stringevano il nome e la data.
        sotto={
          <View style={{ gap: 6, alignItems: 'flex-start' }}>
            <Text style={[stili.piccolo, { color: p.testoSecondario, fontSize: 13.5, lineHeight: 19 }]}>{s.dettaglio}</Text>
            <Etichetta testo={s.testo} tono={s.tono} />
          </View>
        }
        coda={s.daConsegnare ? <InfoCertificato aperta={aperta} onCambia={setAperta} /> : undefined}
      />
    </View>
  )
}

// ---------------------------------------------------------------------------

/** La testata scura: la data, l'avatar, il saluto, le pillole di chi sei. Toccandola si apre il profilo. */
function Benvenuto({ titolare, email, famiglia }: { titolare: PersonaArea | undefined; email: string; famiglia: number }) {
  return (
    <Tocco onPress={() => router.push('/lab/profilo')} ruolo="link" etichetta="Il mio profilo: anagrafica e contatti" scala={0.985}>
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.benvenuto}>
      <View style={stili.bagliore} />
      <View style={[stili.data, { justifyContent: 'space-between' }]}>
        <View style={[stili.data, { gap: 10 }]}>
          <Avatar nome={titolare?.nome ?? email} cognome={titolare?.cognome} size={38} anello="rgba(255,255,255,0.18)" />
          <Text style={stili.dataTesto}>{oggi().toUpperCase()}</Text>
        </View>
        <View style={stili.profilo}>
          <Icona nome="persona" size={14} colore="#fff" />
          <Text style={stili.profiloTesto}>Profilo</Text>
          <Icona nome="avanti" size={13} colore="rgba(255,255,255,0.7)" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={stili.ciao} numberOfLines={2}>
            Ciao, {titolare?.nome || 'tester'}!
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <View style={stili.pillola}>
              <View style={[stili.puntino, { backgroundColor: FUOCO[0] }]} />
              <Text style={stili.pillolaTesto}>{titolare?.numero ? `Tessera ${titolare.numero}` : 'Socio'}</Text>
            </View>
            <View style={stili.pillola}>
              <View style={[stili.puntino, { backgroundColor: MARE[0] }]} />
              <Text style={stili.pillolaTesto}>{famiglia ? `Famiglia di ${famiglia + 1}` : 'Tester'}</Text>
            </View>
            {titolare?.debito ? (
              <View style={[stili.pillola, { backgroundColor: 'rgba(255,69,58,0.28)' }]}>
                <View style={[stili.puntino, { backgroundColor: '#FF453A' }]} />
                <Text style={stili.pillolaTesto}>Pagamento in sospeso</Text>
              </View>
            ) : null}
          </View>
        </View>
        {/* Il marchio, arancio pieno e grande come nell'app di prima (15/10/2026): era una filigrana al 6%. */}
        <Image source={require('@/../assets/images/pittogramma.png')} style={stili.marchio} contentFit="contain" accessibilityLabel="Athlon Club" />
      </View>
      <Text style={stili.contatti} numberOfLines={2}>
        {[titolare?.email || email, titolare?.telefono].filter(Boolean).join('  ·  ')}
      </Text>
    </LinearGradient>
    </Tocco>
  )
}

// ---------------------------------------------------------------------------

/** I tre riquadri colorati: abbonamenti (arancio), famiglia (blu), certificato (carbone). */
function Metriche({
  attivi,
  totali,
  famiglia,
  certificato,
  certificatiFamiglia,
  onCertificati,
}: {
  attivi: number
  totali: number
  famiglia: PersonaArea[]
  certificato: StatoCertificato & { scadenza: string | null }
  /** I familiari col loro certificato, per i pallini del riquadro. */
  certificatiFamiglia: { persona: PersonaArea; stato: StatoCertificato }[]
  onCertificati: () => void
}) {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const larghezza = width < LARGO ? 158 : undefined
  const riquadri = [
    <LinearGradient key="a" colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.metrica, { width: larghezza }]}>
      <View style={stili.metricaTesta}>
        <Text style={stili.metricaTitolo}>Abbonamenti</Text>
        <Icona nome="abbonamento" size={18} colore="#fff" />
      </View>
      <Colonnine quante={7} piene={Math.max(1, Math.round((attivi / Math.max(1, totali)) * 7))} altezza={46} larghezza={8} animata ritardo={350} />
      <Numero valore={String(attivi)} unita={attivi === 1 ? 'attivo' : 'attivi'} size={38} colore="#fff" />
    </LinearGradient>,
    <LinearGradient key="f" colors={MARE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.metrica, { width: larghezza }]}>
      <View style={stili.metricaTesta}>
        <Text style={stili.metricaTitolo}>Famiglia</Text>
        <Icona nome="famiglia" size={18} colore="#fff" />
      </View>
      <View style={{ flexDirection: 'row', height: 46, alignItems: 'center' }}>
        {famiglia.slice(0, 4).map((f, i) => (
          <View key={f.member_id} style={{ marginLeft: i ? -12 : 0 }}>
            <Avatar nome={f.nome} cognome={f.cognome} size={38} anello="#2F6BFF" />
          </View>
        ))}
        {famiglia.length === 0 ? <Text style={[stili.metricaNota, { fontSize: 13 }]}>Solo tu</Text> : null}
      </View>
      <Numero valore={String(famiglia.length + 1)} unita={famiglia.length ? 'persone' : 'persona'} size={38} colore="#fff" />
    </LinearGradient>,
    <Tocco
      key="c"
      onPress={onCertificati}
      etichetta={`Certificato medico: ${certificato.dettaglio}. Apri l’elenco della famiglia`}
      scala={0.98}
      style={[stili.metrica, { width: larghezza, backgroundColor: p.scuro ? p.incavo : '#2A2B30' }]}
    >
      <View style={stili.metricaTesta}>
        <Text style={stili.metricaTitolo}>Certificato</Text>
        <Icona nome="certificato" size={18} colore="#fff" />
      </View>
      {certificatiFamiglia.length ? (
        // Gli altri del nucleo: l'avatar col pallino del loro certificato.
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {certificatiFamiglia.slice(0, 4).map(({ persona, stato }) => (
            <View key={persona.member_id}>
              <Avatar nome={persona.nome} cognome={persona.cognome} size={26} />
              <View style={[stili.pallino, { backgroundColor: PALLINO[stato.tono], borderColor: p.scuro ? p.incavo : '#2A2B30' }]} />
            </View>
          ))}
        </View>
      ) : (
        <View style={stili.puntini}>
          {Array.from({ length: 12 }, (_, i) => (
            <View
              key={i}
              style={[
                stili.quadretto,
                { backgroundColor: certificato.tono === 'ok' ? '#6DD58C' : certificato.tono === 'attenzione' ? '#F2B84B' : certificato.tono === 'errore' ? '#F2B8B5' : '#fff', opacity: i < 12 * Math.min(1, Math.max(0.1, (certificato.giorni ?? 0) / 365)) ? 1 : 0.18 },
              ]}
            />
          ))}
        </View>
      )}
      {certificato.giorni == null ? (
        <View style={{ gap: 2 }}>
          <Text style={stili.metricaGrande}>{certificato.testo}</Text>
          <Text style={[stili.metricaNota, { fontSize: 12.5 }]}>{certificato.breve}</Text>
        </View>
      ) : (
        <View style={{ gap: 2 }}>
          <Text style={[stili.metricaNota, { fontSize: 12.5 }]}>
            {certificato.giorni < 0 ? `scaduto il ${dataBreve(certificato.scadenza)}` : `fino al ${dataBreve(certificato.scadenza)}`}
          </Text>
          <Numero
            valore={String(Math.abs(certificato.giorni))}
            unita={certificato.giorni < 0 ? (certificato.giorni === -1 ? 'giorno fa' : 'giorni fa') : certificato.giorni === 1 ? 'giorno' : 'giorni'}
            size={34}
            colore={certificato.giorni < 0 ? '#F2B8B5' : '#fff'}
          />
        </View>
      )}
    </Tocco>,
  ]
  if (width >= LARGO) return <View style={{ flexDirection: 'row', gap: spazio.tre }}>{riquadri.map((r, i) => <View key={i} style={{ flex: 1 }}>{r}</View>)}</View>
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.tre, paddingHorizontal: spazio.tre + 2, paddingBottom: 6 }} style={{ marginHorizontal: -(spazio.tre + 2) }}>
      {riquadri}
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------

/** Le funzioni in prova: tre schede grandi, una per colore. */
function Novita() {
  const { width } = useWindowDimensions()
  const voci: { titolo: string; testo: string; tag: string; icona: NomeIcona; href: Href; colori: readonly [string, string, ...string[]] }[] = [
    { titolo: 'Prenotazioni', testo: 'Le lezioni di gruppo: posti liberi, prenota e disdici, per te e per la tua famiglia.', tag: 'Lezioni di gruppo', icona: 'calendario', href: '/lab/calendario', colori: MARE },
    { titolo: 'Pagamenti', testo: 'Pagamento diretto con carta e rate automatiche, con il tetto di prova di 5 €.', tag: 'Soldi veri · max 5 €', icona: 'carta', href: '/lab/pagamenti', colori: FUOCO },
    { titolo: 'Workout', testo: 'Le tue schede, il registro dei pesi col timer del recupero, i progressi. E una scheda su misura dall’agente AI.', tag: 'Nuovo', icona: 'peso', href: '/lab/allenamento', colori: ['#8B5CF6', '#5B21B6'] },
  ]
  return (
    <View style={{ flexDirection: width >= LARGO ? 'row' : 'column', flexWrap: 'wrap', gap: spazio.tre }}>
      {voci.map((v, i) => (
        <Entra key={v.titolo} indice={i + 3} style={width >= LARGO ? { flexGrow: 1, flexBasis: '45%' } : undefined}>
          <Tocco onPress={() => router.navigate(v.href)} ruolo="link" etichetta={v.titolo} scala={0.98}>
            <LinearGradient colors={v.colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.novita}>
              <View style={stili.novitaIcona}>
                <Icona nome={v.icona} size={110} colore="rgba(255,255,255,0.12)" />
              </View>
              <Tag testo={v.tag} colore="rgba(255,255,255,0.9)" />
              <Text style={stili.novitaTitolo}>{v.titolo}</Text>
              <Text style={stili.novitaTesto}>{v.testo}</Text>
              <View style={stili.novitaFreccia}>
                <Icona nome="avanti" size={18} colore={v.colori[1]} />
              </View>
            </LinearGradient>
          </Tocco>
        </Entra>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------

/** Un abbonamento: piano, per chi, lo stato, quanto ne e' passato, il metodo. */
function SchedaContratto({ k, persona }: { k: ContrattoArea; persona: PersonaArea | undefined }) {
  const p = usePalette()
  const inizio = k.data_inizio ? new Date(k.data_inizio.slice(0, 10)).getTime() : NaN
  const fine = k.data_fine ? new Date(k.data_fine.slice(0, 10)).getTime() : NaN
  const avanzamento = Number.isFinite(inizio) && Number.isFinite(fine) && fine > inizio ? (Date.now() - inizio) / (fine - inizio) : null
  const stato = statoLeggibile(k)
  const restano = giorniA(k.data_fine)
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre }}>
        <View style={{ flex: 1, gap: 6 }}>
          {persona ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Avatar nome={persona.nome} cognome={persona.cognome} size={22} />
              <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 13 }}>{nome(persona)}</Text>
            </View>
          ) : null}
          <Text style={[stili.piano, { color: p.testo }]}>{k.piano ?? 'Abbonamento'}</Text>
        </View>
        <Etichetta testo={stato} tono={stato === 'Attivo' ? 'ok' : stato === 'Sospeso' ? 'attenzione' : 'blu'} />
      </View>
      {avanzamento != null ? (
        <View style={{ gap: 8 }}>
          <Barra valore={avanzamento} colore={p.accento} altezza={8} animata ritardo={450} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[stili.piccolo, { color: p.testoSecondario }]}>dal {dataBreve(k.data_inizio)}</Text>
            {restano != null && restano >= 0 ? (
              <Text style={[stili.piccolo, { color: p.testo, fontFamily: F.bold }]}>{restano === 0 ? 'scade oggi' : `${restano} giorni`}</Text>
            ) : null}
            <Text style={[stili.piccolo, { color: p.testoSecondario }]}>al {dataBreve(k.data_fine)}</Text>
          </View>
        </View>
      ) : (
        <Text style={[stili.piccolo, { color: p.testoSecondario }]}>
          {[dataBreve(k.data_inizio) && `dal ${dataBreve(k.data_inizio)}`, dataBreve(k.data_fine) && `al ${dataBreve(k.data_fine)}`].filter(Boolean).join(' ')}
        </Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spazio.due }}>
        <MetodoAttualeBadge metodo={metodoDaPerfectGym(k.metodo)} />
        {k.rinnovo_automatico ? <Etichetta testo="Rinnovo automatico" tono="neutro" icona="rinnovo" /> : null}
        <Tocco onPress={() => router.push('/lab/metodo-pagamento')} etichetta="Cambia il metodo di pagamento" style={{ paddingVertical: 4 }}>
          <Text style={[stili.piccolo, { color: p.accento, fontFamily: F.bold }]}>Cambia metodo</Text>
        </Tocco>
      </View>
    </Carta>
  )
}

// ---------------------------------------------------------------------------

export function AreaRiservata({ email }: { email: string }) {
  const p = usePalette()
  const [area, setArea] = useState<Area | null>(inMemoria<{ ok: true; area: Area }>('area')?.area ?? null)
  const [errore, setErrore] = useState<{ testo: string; nonAmmesso: boolean } | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const esito = await prendi('area', laMiaArea)
    if (!esito.ok) return setErrore({ testo: esito.errore, nonAmmesso: esito.nonAmmesso })
    setArea(esito.area)
    // Le schede che probabilmente si apriranno: i loro dati arrivano mentre si
    // guarda la Home, cosi' toccandole sono gia' pronte.
    if (esito.area.trovato) {
      precarica('giorno::', () => leggiGiorno())
      precarica('pagamenti', elencoPagamenti)
      precarica('anagrafica', leggiAnagrafica)
      if (!memoriaTv.vetrine) leggiVetrine().then((r) => r.ok && (memoriaTv.vetrine = r.vetrine))
    }
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  // Nelle schermate d'errore si esce subito; dalla Home con la conferma.
  const uscita = <PulsanteEsci testo="Esci dal laboratorio" conferma={false} />
  const scorrimento = useRef<Animated.ScrollView>(null)

  if (errore) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo={errore.nonAmmesso ? 'Non sei fra i tester' : 'Qualcosa non va'}>
        <Messaggio tono={errore.nonAmmesso ? 'attenzione' : 'errore'}>{errore.testo}</Messaggio>
        {!errore.nonAmmesso ? <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} /> : null}
        {uscita}
      </Schermata>
    )
  }

  if (!area) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="La mia area">
        <SchedeInArrivo />
      </Schermata>
    )
  }

  if (!area.trovato) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="La mia area">
        <Messaggio tono="attenzione" titolo="Non troviamo la tua scheda">
          {`Sei entrato come ${email}, ma non c’è una scheda del club con questo indirizzo. Il laboratorio legge i dati da PerfectGym: entra con l’email con cui sei iscritto.`}
        </Messaggio>
        {uscita}
      </Schermata>
    )
  }

  const perId = new Map(area.persone.map((x) => [x.member_id, x]))
  const titolare = perId.get(area.titolare)
  const famiglia = area.persone.filter((x) => !x.titolare)
  const attivi = area.contratti.filter((k) => statoLeggibile(k) === 'Attivo').length
  const certificatoTitolare = area.certificati.find((ce) => ce.member_id === area.titolare)
  const certTitolare = { ...statoCertificato(certificatoTitolare, titolare?.data_nascita), scadenza: certificatoTitolare?.scadenza ?? null }
  const certificatiFamiglia = famiglia.map((persona) => ({ persona, stato: statoCertificato(area.certificati.find((ce) => ce.member_id === persona.member_id), persona.data_nascita) }))

  return (
    <Schermata larga titolo={titolare?.nome ? `Ciao, ${titolare.nome}` : 'La mia area'} nascondiTitolo scorrimento={scorrimento}>
      <Entra indice={0}>
        <Benvenuto titolare={titolare} email={email} famiglia={famiglia.length} />
      </Entra>

      <AvvisoDebito persone={area.persone} />

      <Installa />

      <Entra indice={1}>
        <Sezione titolo="Il tuo club" destra={<Text style={{ color: p.testoTerzo, fontFamily: F.semi, fontSize: 12.5 }}>sola lettura</Text>}>
          <Metriche
            attivi={attivi}
            totali={area.contratti.length}
            famiglia={famiglia}
            certificato={certTitolare}
            certificatiFamiglia={certificatiFamiglia}
            // L'elenco dei certificati e' in fondo alla Home.
            onCertificati={() => scorrimento.current?.scrollToEnd({ animated: true })}
          />
        </Sezione>
      </Entra>

      <Entra indice={2}>
        <Sezione titolo="Prova le novità">
          <Novita />
        </Sezione>
      </Entra>

      <Sezione titolo="Abbonamenti" conteggio={area.contratti.length}>
        {area.contratti.length ? (
          <View style={stili.griglia}>
            {area.contratti.map((k, i) => (
              <Entra key={k.contract_id} indice={i + 5} style={stili.cella}>
                <SchedaContratto k={k} persona={area.persone.length > 1 ? perId.get(k.member_id) : undefined} />
              </Entra>
            ))}
          </View>
        ) : (
          <Carta>
            <Text style={[stili.piccolo, { color: p.testoSecondario, fontSize: 14 }]}>Nessun abbonamento attivo, tuo o della tua famiglia.</Text>
          </Carta>
        )}
      </Sezione>

      <View style={stili.griglia}>
        {famiglia.length ? (
          <Sezione titolo="La mia famiglia" conteggio={famiglia.length} style={stili.cella}>
            <Carta style={{ paddingVertical: spazio.due }}>
              {famiglia.map((x, i) => (
                <Riga
                  key={x.member_id}
                  prima={i === 0}
                  testa={<Avatar nome={x.nome} cognome={x.cognome} size={40} />}
                  titolo={nome(x)}
                  sotto={
                    <View style={{ gap: 4 }}>
                      {dataBreve(x.data_nascita) ? <Text style={[stili.piccolo, { color: p.testoSecondario, fontSize: 13.5 }]}>{`nato/a il ${dataBreve(x.data_nascita)}`}</Text> : null}
                      <BollinoDebito debito={x.debito} />
                    </View>
                  }
                />
              ))}
            </Carta>
          </Sezione>
        ) : null}

        <Sezione titolo="Certificato medico" style={stili.cella}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {area.certificati.length ? (
              area.certificati.map((ce, i) => <RigaCertificato key={ce.member_id} persona={perId.get(ce.member_id)} ce={ce} prima={i === 0} />)
            ) : (
              <Riga prima icona="certificato" tono="neutro" titolo="Mancante" sotto="Nessun certificato consegnato per te o per la tua famiglia." />
            )}
          </Carta>
        </Sezione>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <View style={{ width: '100%', maxWidth: 420 }}>
          <PulsanteEsci testo="Esci dal laboratorio" email={titolare?.email || email} />
        </View>
      </View>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  benvenuto: { borderRadius: 32, padding: spazio.quattro - 2, gap: spazio.tre + 2, overflow: 'hidden' },
  bagliore: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -90, top: -110, backgroundColor: '#FF5701', opacity: 0.28, filter: 'blur(50px)' } as object,
  marchio: { width: 104, height: 84 },
  data: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profilo: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 10, paddingRight: 8, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  profiloTesto: { color: '#fff', fontFamily: F.extra, fontSize: 12 },
  dataTesto: { color: 'rgba(255,255,255,0.6)', fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  ciao: { color: '#fff', fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  pillola: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntino: { width: 8, height: 8, borderRadius: 3 },
  pillolaTesto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi, fontSize: 13 },
  contatti: { color: 'rgba(255,255,255,0.5)', fontFamily: F.medio, fontSize: 12.5 },
  metrica: { borderRadius: 28, padding: spazio.tre + 2, gap: spazio.tre, minHeight: 190, justifyContent: 'space-between' },
  metricaTesta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricaTitolo: { color: 'rgba(255,255,255,0.92)', fontFamily: F.bold, fontSize: 14 },
  metricaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.semi },
  metricaGrande: { color: '#fff', fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5 },
  puntini: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, width: 110 },
  quadretto: { width: 14, height: 14, borderRadius: 4 },
  pallino: { position: 'absolute', right: -3, bottom: -3, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  info: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  fumetto: { position: 'absolute', bottom: 38, right: -4, width: 320, borderRadius: 18, padding: spazio.tre, gap: 8, zIndex: 10, elevation: 6, boxShadow: '0 14px 34px rgba(0,0,0,0.35)' },
  fumettoTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 14 },
  fumettoTesto: { flex: 1, color: 'rgba(255,255,255,0.86)', fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  fumettoPunto: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF8A2B', marginTop: 7 },
  novita: { borderRadius: 30, padding: spazio.quattro - 2, gap: spazio.due, minHeight: 170, overflow: 'hidden' },
  novitaIcona: { position: 'absolute', right: -14, top: -10, transform: [{ rotate: '-12deg' }] },
  novitaTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 24, letterSpacing: -0.7, marginTop: spazio.due },
  novitaTesto: { color: 'rgba(255,255,255,0.78)', fontFamily: F.medio, fontSize: 14, lineHeight: 20, maxWidth: '82%' },
  novitaFreccia: { position: 'absolute', right: 18, bottom: 18, width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  piano: { fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4, lineHeight: 24 },
  piccolo: { fontFamily: F.medio, fontSize: 12.5 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.tre },
  cella: { flexGrow: 1, flexBasis: 340, minWidth: 0 },
})
