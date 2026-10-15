import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import type { PersonaArea } from '@/api/lab'
import { spazio } from '@/theme'

import { Icona } from './Icona'
import { Carta, Pulsante } from './kit'
import { F, usePalette, velo } from './tema'

// Un pagamento non andato (15/10/2026): il saldo negativo su PerfectGym di una
// persona del nucleo, ma non quando un addebito e' ancora in corso (un SEPA di
// GoCardless impiega giorni). Lo legge portale_la_mia_area (`debito`). In
// evidenza all'apertura dell'app e nel profilo, e un bollino accanto al nome.

function soldi(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function dal(iso: string | null): string {
  if (!iso) return ''
  return ` dal ${new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`
}

/** Il bollino rosso accanto al nome. */
export function BollinoDebito({ debito }: { debito: PersonaArea['debito'] }) {
  const p = usePalette()
  if (!debito) return null
  return (
    <View style={[stili.bollino, { backgroundColor: velo(p, 'errore', 0.16) }]} accessibilityLabel={`Pagamento in sospeso: ${soldi(debito.importo)}`}>
      <Icona nome="attenzione" size={12} colore={p.errore} />
      <Text style={[stili.bollinoTesto, { color: p.errore }]}>{`Da saldare ${soldi(debito.importo)}`}</Text>
    </View>
  )
}

/** Il riquadro in evidenza: chi, quanto, da quando, e dove sistemarlo. */
export function AvvisoDebito({ persone }: { persone: PersonaArea[] }) {
  const p = usePalette()
  const con = persone.filter((x) => x.debito)
  if (!con.length) return null
  const totale = con.reduce((t, x) => t + (x.debito?.importo ?? 0), 0)
  return (
    <Carta style={{ gap: spazio.tre, borderWidth: 1.5, borderColor: p.errore }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <View style={[stili.icona, { backgroundColor: velo(p, 'errore', 0.16) }]}>
          <Icona nome="attenzione" size={22} colore={p.errore} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>C’è un pagamento in sospeso</Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>{`${soldi(totale)} da saldare: un addebito non è andato a buon fine.`}</Text>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        {con.map((x) => (
          <Text key={x.member_id} style={[stili.testo, { color: p.testo }]}>
            <Text style={{ fontFamily: F.extra }}>{x.titolare ? 'Tu' : x.nome || 'Un familiare'}</Text>
            {`: ${soldi(x.debito!.importo)}${dal(x.debito!.dal)}`}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due }}>
        <View style={{ flexGrow: 1 }}>
          <Pulsante testo="Vedi i pagamenti" icona="carta" onPress={() => router.push('/lab/pagamenti')} />
        </View>
        <View style={{ flexGrow: 1 }}>
          <Pulsante testo="Aggiorna il metodo" variante="secondario" onPress={() => router.push('/lab/metodo-pagamento')} />
        </View>
      </View>
    </Carta>
  )
}

const stili = StyleSheet.create({
  bollino: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  bollinoTesto: { fontFamily: F.extra, fontSize: 11.5 },
  icona: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 16.5, letterSpacing: -0.3 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
})
