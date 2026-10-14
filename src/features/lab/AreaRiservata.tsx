import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router, type Href } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { laMiaArea, leggiAnagrafica, leggiVetrine, elencoPagamenti, leggiGiorno, type Area, type CertificatoArea, type ContrattoArea, type PersonaArea } from '@/api/lab'
import { LARGO } from '@/components/Pagina'
import { MetodoAttualeBadge, statoLeggibile } from '@/features/metodo-pagamento/Metodo'
import { dataBreve, metodoDaPerfectGym } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'

import { esciDalLaboratorio, inMemoria, precarica, prendi } from './memoria'
import { memoria as memoriaTv } from './tv/comune'
import { Icona, type NomeIcona } from './ui/Icona'
import { Avatar, Barra, Carta, Colonnine, Entra, Etichetta, Messaggio, Numero, Pulsante, Riga, SchedeInArrivo, Sezione, Tag } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, FUOCO, MARE, NOTTE, usePalette } from './ui/tema'
import { Tocco } from './ui/Tocco'

// La mia area, in sola lettura: chi sono, la famiglia, gli abbonamenti col
// metodo di pagamento, il certificato medico. Tutto dal mirror di PerfectGym
// (portale_la_mia_area); niente si scrive.

function nome(p: Pick<PersonaArea, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'
}

const GIORNO = 86_400_000

function giorniA(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso.slice(0, 10) + 'T12:00:00Z').getTime()
  return Number.isFinite(t) ? Math.ceil((t - Date.now()) / GIORNO) : null
}

/** «martedì 14 ottobre», all'ora di Roma. */
function oggi(): string {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(new Date())
}

/** Lo stato del certificato: valido, in scadenza (30 giorni), scaduto, assente. */
function statoCertificato(ce: CertificatoArea | undefined): { testo: string; tono: 'ok' | 'attenzione' | 'errore' | 'neutro'; giorni: number | null } {
  const g = giorniA(ce?.scadenza ?? null)
  if (g == null) return { testo: 'Non registrato', tono: 'neutro', giorni: null }
  if (g < 0) return { testo: 'Scaduto', tono: 'errore', giorni: g }
  if (g <= 30) return { testo: 'In scadenza', tono: 'attenzione', giorni: g }
  return { testo: 'Valido', tono: 'ok', giorni: g }
}

// ---------------------------------------------------------------------------

/** La testata scura: la data, l'avatar, il saluto, le pillole di chi sei. Toccandola si apre il profilo. */
function Benvenuto({ titolare, email, famiglia }: { titolare: PersonaArea | undefined; email: string; famiglia: number }) {
  return (
    <Tocco onPress={() => router.push('/lab/profilo')} ruolo="link" etichetta="Il mio profilo: anagrafica e contatti" scala={0.985}>
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.benvenuto}>
      <View style={stili.bagliore} />
      <Image source={require('@/../assets/images/pittogramma.png')} style={stili.filigrana} contentFit="contain" />
      <View style={[stili.data, { justifyContent: 'space-between' }]}>
        <View style={stili.data}>
          <Icona nome="calendario" size={14} colore="rgba(255,255,255,0.6)" />
          <Text style={stili.dataTesto}>{oggi().toUpperCase()}</Text>
        </View>
        <View style={stili.profilo}>
          <Icona nome="persona" size={14} colore="#fff" />
          <Text style={stili.profiloTesto}>Profilo</Text>
          <Icona nome="avanti" size={13} colore="rgba(255,255,255,0.7)" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <Avatar nome={titolare?.nome ?? email} cognome={titolare?.cognome} size={60} anello="rgba(255,255,255,0.18)" />
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
          </View>
        </View>
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
function Metriche({ attivi, totali, famiglia, certificato }: { attivi: number; totali: number; famiglia: PersonaArea[]; certificato: ReturnType<typeof statoCertificato> }) {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const larghezza = width < LARGO ? 158 : undefined
  const riquadri = [
    <LinearGradient key="a" colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.metrica, { width: larghezza }]}>
      <View style={stili.metricaTesta}>
        <Text style={stili.metricaTitolo}>Abbonamenti</Text>
        <Icona nome="abbonamento" size={18} colore="#fff" />
      </View>
      <Colonnine quante={7} piene={Math.max(1, Math.round((attivi / Math.max(1, totali)) * 7))} altezza={46} larghezza={8} />
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
    <View key="c" style={[stili.metrica, { width: larghezza, backgroundColor: p.scuro ? p.incavo : '#2A2B30' }]}>
      <View style={stili.metricaTesta}>
        <Text style={stili.metricaTitolo}>Certificato</Text>
        <Icona nome="certificato" size={18} colore="#fff" />
      </View>
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
      {certificato.giorni != null && certificato.giorni >= 0 ? (
        <Numero valore={String(certificato.giorni)} unita="giorni" size={38} colore="#fff" />
      ) : (
        <Text style={[stili.metricaGrande]}>{certificato.testo}</Text>
      )}
    </View>,
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
  const p = usePalette()
  const { width } = useWindowDimensions()
  const voci: { titolo: string; testo: string; tag: string; icona: NomeIcona; href: Href; colori: readonly [string, string, ...string[]] }[] = [
    { titolo: 'Calendario lezioni', testo: 'Posti liberi, prenota e disdici: prenotazioni vere su PerfectGym.', tag: 'Prenotazioni vere', icona: 'calendario', href: '/lab/calendario', colori: MARE },
    { titolo: 'Pagamenti', testo: 'Pagamento diretto con carta e rate automatiche, con il tetto di prova di 5 €.', tag: 'Soldi veri · max 5 €', icona: 'carta', href: '/lab/pagamenti', colori: FUOCO },
    { titolo: 'Guest Pass', testo: 'La procedura nuova dal link: dati, consensi, inizio e pagamento.', tag: 'In prova', icona: 'pass', href: '/lab/guest-pass', colori: [p.scuro ? '#2B2C31' : '#2A2B30', '#141518'] },
    { titolo: 'Animazioni esercizi', testo: 'Un giorno di scheda con le animazioni di tre librerie: quale ti piace di più?', tag: 'Da scegliere', icona: 'play', href: '/lab/animazioni', colori: ['#8B5CF6', '#5B21B6'] },
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
          <Barra valore={avanzamento} colore={p.accento} altezza={8} />
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

  const uscita = <Pulsante testo="Esci dal laboratorio" icona="esci" variante="secondario" onPress={esciDalLaboratorio} />

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
  const certTitolare = statoCertificato(area.certificati.find((ce) => ce.member_id === area.titolare))

  return (
    <Schermata larga titolo={titolare?.nome ? `Ciao, ${titolare.nome}` : 'La mia area'} nascondiTitolo>
      <Entra indice={0}>
        <Benvenuto titolare={titolare} email={email} famiglia={famiglia.length} />
      </Entra>

      <Entra indice={1}>
        <Sezione titolo="Il tuo club" destra={<Text style={{ color: p.testoTerzo, fontFamily: F.semi, fontSize: 12.5 }}>sola lettura</Text>}>
          <Metriche attivi={attivi} totali={area.contratti.length} famiglia={famiglia} certificato={certTitolare} />
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
                  sotto={dataBreve(x.data_nascita) ? `nato/a il ${dataBreve(x.data_nascita)}` : undefined}
                />
              ))}
            </Carta>
          </Sezione>
        ) : null}

        <Sezione titolo="Certificato medico" style={stili.cella}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {area.certificati.length ? (
              area.certificati.map((ce, i) => {
                const x = perId.get(ce.member_id)
                const s = statoCertificato(ce)
                return (
                  <Riga
                    key={ce.member_id}
                    prima={i === 0}
                    icona="certificato"
                    tono={s.tono}
                    titolo={x ? nome(x) : 'Certificato'}
                    sotto={[ce.scadenza ? `scade il ${dataBreve(ce.scadenza)}` : 'nessun certificato registrato', ce.stato].filter(Boolean).join(' · ')}
                    coda={<Etichetta testo={s.testo} tono={s.tono} />}
                  />
                )
              })
            ) : (
              <Riga prima icona="certificato" tono="neutro" titolo="Nessun certificato" sotto="Nessun certificato registrato per te o per la tua famiglia." />
            )}
          </Carta>
        </Sezione>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <View style={{ width: '100%', maxWidth: 420 }}>{uscita}</View>
      </View>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  benvenuto: { borderRadius: 32, padding: spazio.quattro - 2, gap: spazio.tre + 2, overflow: 'hidden' },
  bagliore: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -90, top: -110, backgroundColor: '#FF5701', opacity: 0.28, filter: 'blur(50px)' } as object,
  filigrana: { position: 'absolute', right: -20, bottom: -26, width: 170, height: 140, opacity: 0.06, tintColor: '#fff' } as object,
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
