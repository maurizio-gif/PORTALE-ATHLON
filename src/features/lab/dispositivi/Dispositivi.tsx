import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'

import { aggiornaDispositivi, collega, completaCollegamento, revocaConsensoDispositivi, scollega, type Collegamento, type Fornitore, type IdFornitore } from '@/api/dispositivi'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Bollino, Carta, Entra, Etichetta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, RELAX, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { dopo, FORNITORI } from './comune'
import { FoglioInformativa, Vetrina } from './Vetrina'
import { useDispositivi, type Dispositivi as DatiDispositivi } from './useDispositivi'

// La schermata dei dispositivi (/allenamento/dispositivi, 19/10/2026): si collegano e si
// scollegano l'anello Oura e gli orologi Polar, e da qui si revoca il consenso. In
// quest'ordine, e ogni passo chiude quelli dopo:
//   1. la vetrina col consenso all'informativa (Vetrina.tsx): senza, niente;
//   2. i fornitori, ognuno con il suo stato e i suoi comandi;
//   3. in fondo, la revoca del consenso, che scollega tutto e cancella i dati.
// **Il ritorno dal fornitore** arriva qui: Oura e Polar rimandano il socio a
// `/allenamento/dispositivi?code=…&state=…`. La schermata manda codice e state alla funzione
// (che li verifica con la SESSIONE del socio: lo state porta chi ha iniziato) e subito dopo
// toglie i parametri dall'indirizzo, perche' il codice vale una volta sola e non deve restare
// nella barra. Se il socio ha annullato, il fornitore rimanda `error`.
// Nella vista cliente dello staff la schermata non si apre: sono dati sulla salute.

const primo = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

type Avviso = { tono: 'ok' | 'attenzione' | 'errore'; testo: string }

export function Dispositivi() {
  const d = useDispositivi()
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>()
  const [avviso, setAvviso] = useState<Avviso | null>(null)
  const [completando, setCompletando] = useState(false)
  const partito = useRef(false)

  useEffect(() => {
    if (d.vista || partito.current) return
    const code = primo(params.code)
    const state = primo(params.state)
    const errore = primo(params.error)
    if (!code && !errore) return
    partito.current = true
    // Via subito dall'indirizzo, qualunque sia l'esito. Con setParams la schermata resta quella di prima
    // (un replace la rifarebbe da capo e l'avviso del risultato andrebbe perso).
    router.setParams({ code: undefined, state: undefined, error: undefined, error_description: undefined, scope: undefined })
    if (!code) {
      setAvviso({ tono: 'attenzione', testo: 'Il collegamento è stato annullato: non abbiamo letto nessun dato.' })
      return
    }
    setCompletando(true)
    completaCollegamento(code, state ?? '').then((r) => {
      setCompletando(false)
      if (r.ok) {
        d.imposta(r)
        setAvviso({ tono: 'ok', testo: `${FORNITORI[r.fornitore].nome} collegato. I primi dati sono già qui.` })
      } else {
        setAvviso({ tono: 'errore', testo: r.errore })
        d.rileggi()
      }
    })
    // Si parte una volta sola, dai parametri con cui la schermata e' stata aperta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.vista, params.code, params.state, params.error])

  const testata = { sopratitolo: 'Relax', titolo: 'I tuoi dispositivi', indietro: '/allenamento?area=relax' as const, barra: false as const }
  const stato = d.stato

  if (d.vista) {
    return (
      <Schermata {...testata}>
        <Messaggio tono="attenzione" titolo="Non visibile nella vista cliente">
          I dispositivi contengono dati sulla salute: li vede solo il socio, dalla sua app.
        </Messaggio>
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...testata}>
        {completando ? <Messaggio tono="attenzione">Stiamo completando il collegamento…</Messaggio> : null}
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }
  if (!stato.ok) {
    return (
      <Schermata {...testata}>
        <Messaggio>{stato.errore}</Messaggio>
        <Pulsante testo="Riprova" variante="secondario" onPress={d.rileggi} />
      </Schermata>
    )
  }
  if (!stato.maggiorenne) {
    return <Minorenni testata={testata} />
  }
  if (!stato.consenso) {
    return (
      <Schermata {...testata}>
        {avviso ? <Messaggio tono={avviso.tono}>{avviso.testo}</Messaggio> : null}
        <Vetrina onConsenso={d.rileggi} />
      </Schermata>
    )
  }
  return (
    <Schermata {...testata}>
      {completando ? <Messaggio tono="attenzione">Stiamo completando il collegamento…</Messaggio> : null}
      {avviso ? <Messaggio tono={avviso.tono}>{avviso.testo}</Messaggio> : null}
      <Gestione d={d} fornitori={stato.fornitori} collegamenti={stato.collegamenti} onRevocato={() => setAvviso(null)} />
    </Schermata>
  )
}

function Minorenni({ testata }: { testata: { sopratitolo: string; titolo: string; indietro: '/allenamento?area=relax'; barra: false } }) {
  const p = usePalette()
  return (
    <Schermata {...testata}>
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.titoletto, { color: p.testo }]}>Una sezione per i maggiorenni</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>I dispositivi sono pensati per gli adulti. Se nella tua scheda del club manca la data di nascita, chiedi al desk di aggiungerla.</Text>
      </Carta>
    </Schermata>
  )
}

function Gestione({ d, fornitori, collegamenti, onRevocato }: { d: DatiDispositivi; fornitori: Fornitore[]; collegamenti: Collegamento[]; onRevocato: () => void }) {
  const p = usePalette()
  const [errore, setErrore] = useState<string | null>(null)
  const [informativa, setInformativa] = useState(false)
  const [revoca, setRevoca] = useState<'no' | 'chiedi' | 'in-corso'>('no')

  async function revocaTutto() {
    setRevoca('in-corso')
    const r = await revocaConsensoDispositivi()
    if (!r.ok) {
      setRevoca('chiedi')
      setErrore(r.errore)
      return
    }
    // Il «collegato» di prima non ha piu' senso: la sezione si richiude.
    onRevocato()
    d.rileggi()
  }

  return (
    <>
      <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>
        Collega il tuo anello o il tuo orologio: i dati compaiono in Relax, e si aggiornano da soli quando il dispositivo ha sincronizzato col telefono. Senza un dispositivo il sonno lo scrivi tu, da Relax.
      </Text>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <View style={{ gap: spazio.tre }}>
        {fornitori.map((f, i) => (
          <Entra key={f.id} indice={i}>
            <CartaFornitore f={f} collegamento={collegamenti.find((c) => c.fornitore === f.id) ?? null} d={d} onErrore={setErrore} />
          </Entra>
        ))}
      </View>

      <Sezione titolo="I tuoi dati">
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            Li vedi solo tu, nemmeno lo staff. Teniamo gli ultimi 90 giorni; se scolleghi un dispositivo cancelliamo subito i suoi dati. Il sonno che scrivi tu si cancella con la revoca.
          </Text>
          <Tocco onPress={() => setInformativa(true)} etichetta="Leggi l’informativa" ruolo="link" style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>Leggi l’informativa</Text>
          </Tocco>
          {revoca === 'no' ? (
            <Pulsante testo="Revoca il consenso e cancella i dati" variante="pericolo" onPress={() => setRevoca('chiedi')} />
          ) : (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.nota, { color: p.testo }]}>
                Scolleghiamo tutti i dispositivi e cancelliamo subito i loro dati, e la sezione si richiude. Resta solo la registrazione del consenso e della revoca.
              </Text>
              <View style={stili.azioni}>
                <View style={{ flex: 1 }}>
                  <Pulsante testo="Annulla" variante="secondario" piccolo onPress={() => setRevoca('no')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Pulsante testo="Revoca e cancella" variante="pericolo" piccolo inCorso={revoca === 'in-corso'} onPress={revocaTutto} />
                </View>
              </View>
            </View>
          )}
        </Carta>
      </Sezione>
      <FoglioInformativa aperto={informativa} onChiudi={() => setInformativa(false)} />
    </>
  )
}

function CartaFornitore({ f, collegamento, d, onErrore }: { f: Fornitore; collegamento: Collegamento | null; d: DatiDispositivi; onErrore: (e: string | null) => void }) {
  const p = usePalette()
  const info = FORNITORI[f.id]
  const [fase, setFase] = useState<'no' | 'collega' | 'aggiorna' | 'chiedi' | 'scollega'>('no')
  const riautorizza = collegamento?.stato === 'da_riautorizzare'

  async function collegaOra() {
    onErrore(null)
    setFase('collega')
    const r = await collega(f.id as IdFornitore)
    if (!r.ok) {
      setFase('no')
      onErrore(r.errore)
      return
    }
    // Si lascia l'app per il sito del fornitore: da li' torna a questa stessa schermata.
    if (Platform.OS === 'web') window.location.assign(r.url)
    else {
      await Linking.openURL(r.url)
      setFase('no')
    }
  }

  async function aggiorna() {
    onErrore(null)
    setFase('aggiorna')
    const r = await aggiornaDispositivi()
    setFase('no')
    if (r.ok) d.imposta(r)
    else onErrore(r.errore)
  }

  async function scollegaOra() {
    onErrore(null)
    setFase('scollega')
    const r = await scollega(f.id as IdFornitore)
    setFase('no')
    if (r.ok) d.imposta(r)
    else onErrore(r.errore)
  }

  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <Bollino icona="orologio" tono="neutro" size={46} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.nome, { color: p.testo }]}>{info.nome}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{info.cosa}</Text>
        </View>
        {!f.disponibile ? (
          <Etichetta testo="Non ancora attivo" />
        ) : riautorizza ? (
          <Etichetta testo="Da ricollegare" tono="attenzione" />
        ) : collegamento ? (
          <Etichetta testo="Collegato" tono="ok" icona="ok" />
        ) : (
          <Etichetta testo="Non collegato" />
        )}
      </View>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{info.testo}</Text>

      {collegamento && !riautorizza ? (
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>
          {collegamento.ultimo_sync_il ? `Ultima lettura ${dopo(collegamento.ultimo_sync_il)}.` : 'Non abbiamo ancora letto niente.'}
          {collegamento.ultimo_errore ? ` ${collegamento.ultimo_errore}` : ''}
        </Text>
      ) : null}
      {riautorizza ? (
        <Messaggio tono="attenzione">{collegamento?.ultimo_errore ?? 'Il dispositivo ha tolto l’accesso: collegalo di nuovo.'}</Messaggio>
      ) : null}

      {fase === 'chiedi' || fase === 'scollega' ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.nota, { color: p.testo }]}>{`Togliamo il permesso a ${info.nome} e cancelliamo subito i dati letti da lì.`}</Text>
          <View style={stili.azioni}>
            <View style={{ flex: 1 }}>
              <Pulsante testo="Annulla" variante="secondario" piccolo onPress={() => setFase('no')} />
            </View>
            <View style={{ flex: 1 }}>
              <Pulsante testo="Scollega" variante="pericolo" piccolo inCorso={fase === 'scollega'} onPress={scollegaOra} />
            </View>
          </View>
        </View>
      ) : !collegamento || riautorizza ? (
        <Pulsante testo={riautorizza ? `Ricollega ${info.nome}` : `Collega ${info.nome}`} icona="avanti" disabilitato={!f.disponibile} inCorso={fase === 'collega'} onPress={collegaOra} />
      ) : (
        <View style={stili.azioni}>
          <View style={{ flex: 1 }}>
            <Pulsante testo="Aggiorna ora" icona="aggiorna" variante="secondario" piccolo inCorso={fase === 'aggiorna'} onPress={aggiorna} />
          </View>
          <View style={{ flex: 1 }}>
            <Pulsante testo="Scollega" variante="contorno" piccolo onPress={() => setFase('chiedi')} />
          </View>
        </View>
      )}
    </Carta>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  nome: { fontFamily: F.extra, fontSize: 18 },
  titoletto: { fontFamily: F.extra, fontSize: 18 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  link: { fontFamily: F.bold, fontSize: 14, paddingVertical: 6 },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
