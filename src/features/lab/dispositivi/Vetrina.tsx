import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { daiConsensoDispositivi } from '@/api/dispositivi'
import { spazio } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante } from '../ui/kit'
import { Foglio } from '../ui/Foglio'
import { F, RELAX, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CONSENSO, INFORMATIVA, VERSIONE_INFORMATIVA } from './informativa'

// La vetrina dei dispositivi (19/10/2026): quello che si ottiene scrivendo il sonno o collegando
// un anello Oura o un orologio Polar (20/10/2026: il sonno scritto a mano e' per tutti), e sotto il consenso. **Senza il consenso niente si collega** (richiesta
// del club): il pulsante si accende solo con la casella spuntata, e la funzione rifiuta ogni
// azione finche' il consenso non e' registrato. L'informativa completa si apre in un foglio.

const COSE: { icona: NomeIcona; colori: readonly [string, string]; titolo: string; testo: string }[] = [
  { icona: 'foglia', colori: ['#5EEAD4', '#0F766E'], titolo: 'Il tuo sonno', testo: 'Scrivi ogni mattina quanto hai dormito, in dieci secondi: conta nel tuo Athlon Health Score. Con un anello o un orologio arriva da solo.' },
  { icona: 'cronometro', colori: ['#FF8A2B', '#E84300'], titolo: 'I tuoi allenamenti', testo: 'Quelli registrati dal dispositivo, accanto a quelli che fai nel club.' },
  { icona: 'fiamma', colori: ['#5C8DFF', '#1F4FD8'], titolo: 'Il battito di notte', testo: 'Il valore più basso e la sua variabilità: un modo per vedere come recuperi.' },
]

const GARANZIE: { icona: NomeIcona; testo: string }[] = [
  { icona: 'lucchetto', testo: 'Li vedi solo tu: nemmeno lo staff o i trainer.' },
  { icona: 'scudo', testo: 'Non vediamo la tua password e non leggiamo posizione né percorsi.' },
  { icona: 'cestino', testo: 'Scolleghi o revochi quando vuoi, e cancelliamo tutto subito.' },
]

export function Vetrina({ onConsenso }: { onConsenso: () => void }) {
  const p = usePalette()
  const [spunta, setSpunta] = useState(false)
  const [aperta, setAperta] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function attiva() {
    setInCorso(true)
    setErrore(null)
    const r = await daiConsensoDispositivi(VERSIONE_INFORMATIVA)
    setInCorso(false)
    if (r.ok) onConsenso()
    else setErrore(r.errore)
  }

  return (
    <>
      <Entra indice={0}>
        <LinearGradient colors={RELAX} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.eroe}>
          <View style={stili.novita}>
            <Text style={stili.novitaTesto}>NOVITÀ</Text>
          </View>
          <Text style={stili.eroeTitolo}>Il recupero fa parte dell’allenamento</Text>
          <Text style={stili.eroeTesto}>Scrivi quanto dormi, o collega il tuo anello Oura o il tuo orologio Polar: nell’app vedi il sonno accanto a quello che fai nel club.</Text>
        </LinearGradient>
      </Entra>

      <View style={{ gap: spazio.tre }}>
        {COSE.map((c, i) => (
          <Entra key={c.titolo} indice={i + 1}>
            <Carta style={stili.cosa}>
              <LinearGradient colors={c.colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cosaIcona}>
                <Icona nome={c.icona} size={22} colore="#fff" />
              </LinearGradient>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.cosaTitolo, { color: p.testo }]}>{c.titolo}</Text>
                <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>{c.testo}</Text>
              </View>
            </Carta>
          </Entra>
        ))}
      </View>

      <Entra indice={4}>
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>I tuoi dati restano tuoi</Text>
          <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>
            Il sonno e il battito sono dati sulla salute: per scriverlo o collegare un dispositivo ci serve il tuo consenso, che puoi ritirare quando vuoi.
          </Text>
          <View style={{ gap: spazio.due }}>
            {GARANZIE.map((g) => (
              <View key={g.testo} style={stili.garanzia}>
                <Icona nome={g.icona} size={18} colore={RELAX[2]} />
                <Text style={[stili.cosaTesto, { color: p.testo, flex: 1 }]}>{g.testo}</Text>
              </View>
            ))}
          </View>
          <Tocco onPress={() => setAperta(true)} etichetta="Leggi l’informativa completa" ruolo="link" style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>Leggi l’informativa completa</Text>
          </Tocco>
          <Tocco onPress={() => setSpunta((v) => !v)} vibra="scelta" ruolo="checkbox" stato={{ selected: spunta }} etichetta={CONSENSO} scala={0.99}>
            <View style={[stili.spunta, { backgroundColor: p.incavo }]}>
              <View style={[stili.casella, { borderColor: spunta ? RELAX[2] : p.testoTerzo, backgroundColor: spunta ? RELAX[2] : 'transparent' }]}>
                {spunta ? <Icona nome="spunta" size={15} colore="#fff" /> : null}
              </View>
              <Text style={[stili.cosaTesto, { color: p.testo, flex: 1 }]}>{CONSENSO}</Text>
            </View>
          </Tocco>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo="Attiva Relax" icona="avanti" onPress={attiva} disabilitato={!spunta} inCorso={inCorso} />
        </Carta>
      </Entra>

      <FoglioInformativa aperto={aperta} onChiudi={() => setAperta(false)} />
    </>
  )
}

/** Il testo dell'informativa in un foglio, per chi ha gia' accettato e vuole rileggerla. */
export function FoglioInformativa({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const p = usePalette()
  return (
    <Foglio aperto={aperto} titolo="Informativa: Dispositivi" sottotitolo={`Versione del ${VERSIONE_INFORMATIVA.split('-').reverse().join('/')}`} onChiudi={onChiudi}>
      {INFORMATIVA.map((s) => (
        <View key={s.titolo} style={{ gap: 4 }}>
          <Text style={[stili.cosaTitolo, { color: p.testo }]}>{s.titolo}</Text>
          <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>{s.testo}</Text>
        </View>
      ))}
      <Pulsante testo="Ho letto" variante="secondario" onPress={onChiudi} />
    </Foglio>
  )
}

const stili = StyleSheet.create({
  eroe: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre, overflow: 'hidden' },
  eroeTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 26, lineHeight: 30 },
  eroeTesto: { color: 'rgba(255,255,255,0.92)', fontFamily: F.medio, fontSize: 15, lineHeight: 21 },
  novita: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  novitaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 11, letterSpacing: 1 },
  cosa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  cosaIcona: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cosaTitolo: { fontFamily: F.extra, fontSize: 16 },
  cosaTesto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  titoletto: { fontFamily: F.extra, fontSize: 18 },
  garanzia: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due },
  link: { fontFamily: F.bold, fontSize: 14, paddingVertical: 6 },
  spunta: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre, borderRadius: 16, padding: spazio.tre },
  casella: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
})
