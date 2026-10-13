import { StyleSheet, Text, View } from 'react-native'

import { spazio, tinta, useColori } from '@/theme'

// Chi custodisce la carta o il conto, detto accanto alla scelta: chi sta per
// scrivere una carta o un IBAN deve sapere a chi li da' e come sono tenuti,
// senza uscire a cercarlo. Adyen per le carte, GoCardless per l'addebito SEPA.

function Riquadro({ sigla, titolo, righe }: { sigla: string; titolo: string; righe: string[] }) {
  const c = useColori()
  return (
    <View style={[stili.riquadro, { backgroundColor: tinta(c.testo, 0.035), borderColor: tinta(c.testo, 0.1) }]}>
      <View style={stili.testa}>
        <View style={[stili.scudo, { backgroundColor: tinta(c.ok, 0.16), borderColor: tinta(c.ok, 0.45) }]}>
          <Text style={{ color: c.ok, fontWeight: '800', fontSize: 13 }}>{sigla}</Text>
        </View>
        <Text style={[stili.titolo, { color: c.testo }]}>{titolo}</Text>
      </View>
      {righe.map((r) => (
        <View key={r} style={{ flexDirection: 'row', gap: spazio.due }}>
          <Text style={{ color: c.ok, fontWeight: '800', fontSize: 13, lineHeight: 20 }}>✓</Text>
          <Text style={[stili.riga, { color: c.testo }]}>{r}</Text>
        </View>
      ))}
    </View>
  )
}

export function ChiGestisceCarta({ salvaPagando = false }: { salvaPagando?: boolean }) {
  return (
    <Riquadro
      sigla="🔒"
      titolo="La carta la custodisce Adyen"
      righe={[
        'Adyen è la piattaforma di pagamento europea che gestisce per il club i pagamenti con carta: ha sede nei Paesi Bassi, è una banca autorizzata e vigilata in Europa e la usano molte delle più grandi aziende del mondo.',
        'Scrivi la carta sulla pagina protetta di Adyen, certificata PCI DSS al livello 1, il più alto per chi tratta i dati delle carte. La tua banca può chiederti la conferma (3D Secure).',
        'Il club non vede e non conserva mai il numero completo né il codice di sicurezza: riceve solo un riferimento cifrato e le ultime 4 cifre.',
        ...(salvaPagando
          ? ['Pagando, la carta resta salvata in modo sicuro su Adyen: per i prossimi acquisti al club non dovrai riscriverla. Il Guest Pass non ha rinnovi: nessun altro addebito automatico.']
          : []),
      ]}
    />
  )
}

export function ChiGestisceConto() {
  return (
    <Riquadro
      sigla="🔒"
      titolo="L’addebito su conto lo gestisce GoCardless"
      righe={[
        'GoCardless è un istituto di pagamento autorizzato e vigilato, specializzato negli addebiti diretti SEPA e usato da decine di migliaia di aziende in Europa.',
        'L’IBAN viaggia cifrato e lo custodisce GoCardless, con standard di sicurezza da banca: il club vede solo le ultime cifre.',
        'Sull’estratto conto l’addebito compare con i nomi di GoCardless e di Point 2000 (Athlon Club). Con l’addebito SEPA puoi chiedere il rimborso alla tua banca entro 8 settimane.',
      ]}
    />
  )
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.due },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  scudo: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontSize: 15, fontWeight: '700', flex: 1 },
  riga: { flex: 1, fontSize: 13, lineHeight: 20 },
})
