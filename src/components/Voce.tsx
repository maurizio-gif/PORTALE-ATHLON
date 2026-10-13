import { Link, type Href } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { spazio, useColori } from '@/theme'

// Una riga dell'elenco «cosa puoi fare»: titolo, una riga di spiegazione, e
// dove porta. Senza `href` e' una funzione annunciata ma non ancora aperta.
export function Voce({ titolo, descrizione, href, etichetta }: { titolo: string; descrizione: string; href?: Href; etichetta?: string }) {
  const c = useColori()
  const corpo = (
    <View style={[stili.riga, { backgroundColor: c.superficie, borderColor: c.bordo, opacity: href ? 1 : 0.6 }]}>
      <View style={stili.testi}>
        <Text style={[stili.titolo, { color: c.testo }]}>{titolo}</Text>
        <Text style={[stili.descrizione, { color: c.testoSecondario }]}>{descrizione}</Text>
      </View>
      {etichetta ? <Text style={[stili.etichetta, { color: c.testoSecondario, borderColor: c.bordo }]}>{etichetta}</Text> : null}
      {href ? <Text style={[stili.freccia, { color: c.accento }]}>›</Text> : null}
    </View>
  )
  if (!href) return corpo
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">{corpo}</Pressable>
    </Link>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre, borderRadius: 12, borderWidth: 1 },
  testi: { flex: 1, gap: spazio.uno },
  titolo: { fontSize: 16, fontWeight: '700' },
  descrizione: { fontSize: 14, lineHeight: 20 },
  etichetta: { fontSize: 12, borderWidth: 1, borderRadius: 999, paddingHorizontal: spazio.due, paddingVertical: 2 },
  freccia: { fontSize: 26, fontWeight: '700' },
})
