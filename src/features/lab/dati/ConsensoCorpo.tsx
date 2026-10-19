import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { daiConsensoCorpo, revocaConsensoCorpo, type ConsensoCorpo as Consenso } from '@/api/lab'
import { spazio } from '@/theme'

import { Foglio } from '../ui/Foglio'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, Sezione } from '../ui/kit'
import { F, usePalette, velo } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { dataCorta } from './calcoli'
import { CONSENSO_CORPO, INFORMATIVA_CORPO, VERSIONE_INFORMATIVA_CORPO } from './informativaCorpo'

// Il consenso alle misure del corpo (20/10/2026). Altezza, peso, BMI, circonferenze, massa grassa e magra e il sesso
// scelto per le calorie sono dati relativi alla salute: fino a oggi l'app li usava senza un consenso proprio, e
// l'analisi privacy dell'Athlon Health Score ha chiesto di metterlo. **Senza il consenso la funzione non restituisce
// le misure e rifiuta di salvarne** (portale-lab-misure): la schermata «Il tuo corpo» mostra questa pagina al posto
// dei dati, e tutto quello che dipende da peso e altezza (stime delle calorie, carichi stimati) dice «mancano dati»
// e porta qui. La revoca, in fondo a «Il tuo corpo», cancella le misure e il sesso scritti dal socio.
// Il testo e la versione sono in informativaCorpo.ts; la versione e' la stessa della funzione.

const GARANZIE: { icona: NomeIcona; testo: string }[] = [
  { icona: 'lucchetto', testo: 'Le vedi solo tu: dall’app nemmeno lo staff del club.' },
  { icona: 'scudo', testo: 'Servono solo alle stime e all’andamento: non entrano nel punteggio né nei livelli.' },
  { icona: 'cestino', testo: 'Ritiri il consenso quando vuoi, e cancelliamo subito le misure che hai scritto.' },
]

function TestoInformativa({ aperta, onChiudi }: { aperta: boolean; onChiudi: () => void }) {
  const p = usePalette()
  return (
    <Foglio aperto={aperta} titolo="Informativa: Il tuo corpo" sottotitolo={`Versione del ${VERSIONE_INFORMATIVA_CORPO.split('-').reverse().join('/')}`} onChiudi={onChiudi}>
      {INFORMATIVA_CORPO.map((s) => (
        <View key={s.titolo} style={{ gap: 4 }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>{s.titolo}</Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>{s.testo}</Text>
        </View>
      ))}
      <Pulsante testo="Ho letto" variante="secondario" onPress={onChiudi} />
    </Foglio>
  )
}

/** La pagina che prende il posto di «Il tuo corpo» finche' non c'e' il consenso. */
export function ConsensoCorpo({ onConsenso }: { onConsenso: () => void }) {
  const p = usePalette()
  const [spunta, setSpunta] = useState(false)
  const [aperta, setAperta] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function attiva() {
    setInCorso(true)
    setErrore(null)
    const r = await daiConsensoCorpo(VERSIONE_INFORMATIVA_CORPO)
    setInCorso(false)
    if (r.ok) onConsenso()
    else setErrore(r.errore)
  }

  return (
    <>
      <Entra indice={0}>
        <Carta style={{ gap: spazio.tre }}>
          <View style={[stili.bollo, { backgroundColor: velo(p, 'accento') }]}>
            <Icona nome="persona" size={30} colore={p.accento} />
          </View>
          <Text style={[stili.titolo, { color: p.testo }]}>Il tuo corpo, con il tuo consenso</Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            Altezza, peso, BMI, circonferenze e massa grassa sono dati sulla salute: per segnarli e usarli ci serve il tuo consenso, che puoi ritirare quando vuoi. Senza, le stime delle calorie e dei carichi che dipendono da peso e altezza non sono disponibili; il resto dell’app funziona.
          </Text>
          <View style={{ gap: spazio.due }}>
            {GARANZIE.map((g) => (
              <View key={g.testo} style={stili.garanzia}>
                <Icona nome={g.icona} size={18} colore={p.accento} />
                <Text style={[stili.testo, { color: p.testo, flex: 1 }]}>{g.testo}</Text>
              </View>
            ))}
          </View>
          <Tocco onPress={() => setAperta(true)} etichetta="Leggi l’informativa completa" ruolo="link" style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>Leggi l’informativa completa</Text>
          </Tocco>
          <Tocco onPress={() => setSpunta((v) => !v)} vibra="scelta" ruolo="checkbox" stato={{ selected: spunta }} etichetta={CONSENSO_CORPO} scala={0.99}>
            <View style={[stili.spunta, { backgroundColor: p.incavo }]}>
              <View style={[stili.casella, { borderColor: spunta ? p.accento : p.testoTerzo, backgroundColor: spunta ? p.accento : 'transparent' }]}>
                {spunta ? <Icona nome="spunta" size={15} colore="#fff" /> : null}
              </View>
              <Text style={[stili.testo, { color: p.testo, flex: 1 }]}>{CONSENSO_CORPO}</Text>
            </View>
          </Tocco>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo="Attiva «Il tuo corpo»" icona="avanti" onPress={attiva} disabilitato={!spunta} inCorso={inCorso} />
        </Carta>
      </Entra>
      <TestoInformativa aperta={aperta} onChiudi={() => setAperta(false)} />
    </>
  )
}

/** In fondo a «Il tuo corpo»: da quando c'e' il consenso, l'informativa e il modo di ritirarlo. */
export function ImpostazioniCorpo({ consenso, onRevocato }: { consenso: Consenso; onRevocato: () => void }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  const [revoca, setRevoca] = useState<'no' | 'chiedi' | 'in-corso'>('no')
  const [errore, setErrore] = useState<string | null>(null)

  async function ritira() {
    setRevoca('in-corso')
    setErrore(null)
    const r = await revocaConsensoCorpo()
    if (!r.ok) {
      setRevoca('chiedi')
      return setErrore(r.errore)
    }
    onRevocato()
  }

  return (
    <>
      <Sezione titolo="Il tuo consenso">
        <Carta style={{ gap: spazio.due }}>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {`Hai dato il consenso il ${dataCorta(consenso.accettato_il.slice(0, 10))}. Le misure e il sesso che hai scritto restano finché non li togli o non ritiri il consenso.`}
          </Text>
          <Tocco onPress={() => setAperta(true)} etichetta="Leggi l’informativa completa" ruolo="link" style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>Leggi l’informativa</Text>
          </Tocco>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          {revoca === 'no' ? (
            <Pulsante testo="Ritira il consenso e cancella le misure" variante="pericolo" onPress={() => setRevoca('chiedi')} />
          ) : (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.testo, { color: p.testo }]}>
                Cancelliamo subito le misure e il sesso che hai scritto, e la pagina si richiude. Le stime che dipendono da peso e altezza non saranno più disponibili. Resta solo la registrazione del consenso e della revoca.
              </Text>
              <View style={stili.azioni}>
                <View style={{ flex: 1 }}>
                  <Pulsante testo="Annulla" variante="secondario" piccolo onPress={() => setRevoca('no')} disabilitato={revoca === 'in-corso'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Pulsante testo="Ritira e cancella" variante="pericolo" piccolo inCorso={revoca === 'in-corso'} onPress={ritira} />
                </View>
              </View>
            </View>
          )}
        </Carta>
      </Sezione>
      <TestoInformativa aperta={aperta} onChiudi={() => setAperta(false)} />
    </>
  )
}

const stili = StyleSheet.create({
  bollo: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5 },
  titoletto: { fontFamily: F.extra, fontSize: 16 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  garanzia: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due },
  link: { fontFamily: F.bold, fontSize: 14, paddingVertical: 6 },
  spunta: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre, borderRadius: 16, padding: spazio.tre },
  casella: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
