import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { ImportiContratto } from '@/api/abbonamento'
import { euro } from '@/lib/eventi'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Carta } from './ui/kit'
import { F, usePalette } from './ui/tema'
import { Tocco } from './ui/Tocco'

// Il riepilogo dei costi: quello che si paga oggi e quello che si paga dopo,
// con le date (16/10/2026). Lo calcola il server e lo stampa uguale nel
// contratto: quello che si vede qui e' quello che si firma e che si addebita.

/** «1 novembre 2026». */
export function dataLunga(iso: string): string {
  const [a, m, g] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, g)))
}

const MOSTRA = 3

export function RiepilogoCosti({
  importi,
  metodo,
  primaLezione,
  fineStagione,
  senzaTotale = false,
}: {
  importi: ImportiContratto
  metodo?: 'carta' | 'conto'
  /** Data della prima lezione (ISO), se nota. */
  primaLezione?: string | null
  /** Fine del corso (ISO): una riga con la data. */
  fineStagione?: string
  /** Niente totale dell'impegno: sta solo nel contratto (Junior, 23/10/2026). */
  senzaTotale?: boolean
}) {
  const p = usePalette()
  const [tutte, setTutte] = useState(false)
  const c = importi.calendario
  const elenco = tutte ? c.prossimi : c.prossimi.slice(0, MOSTRA)
  const riga = { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'baseline' as const, gap: spazio.tre }
  return (
    <Carta piatta>
      <View style={{ gap: spazio.tre }}>
        {primaLezione || fineStagione ? (
          <View style={{ gap: 6 }}>
            {primaLezione ? (
              <View style={riga}>
                <Text style={[stili.voce, { color: p.testo, fontFamily: F.bold, flex: 1 }]}>{t('Prima lezione', 'First class')}</Text>
                <Text style={[stili.importo, { color: p.testo }]}>{dataLunga(primaLezione)}</Text>
              </View>
            ) : null}
            {fineStagione ? (
              <View style={riga}>
                <Text style={[stili.voce, { color: p.testo, fontFamily: F.bold, flex: 1 }]}>{t('Fine del corso', 'Course ends')}</Text>
                <Text style={[stili.importo, { color: p.testo }]}>{dataLunga(fineStagione)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={{ gap: 2 }}>
          <Text style={[stili.sopra, { color: p.testoSecondario }]}>{t('Oggi paghi', 'You pay today')}</Text>
          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 34, letterSpacing: -1 }}>{euro(c.totale_oggi)}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {metodo === 'conto'
              ? t('Si addebitano sul conto corrente, con l’addebito diretto SEPA.', 'Charged to your bank account by SEPA direct debit.')
              : metodo === 'carta'
                ? t('Si addebitano sulla carta.', 'Charged to your card.')
                : t('Il metodo di pagamento lo scegli dopo la firma: carta o conto corrente.', 'You choose the payment method after signing: card or bank account.')}
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          {c.oggi.map((v) => (
            <View key={v.label} style={riga}>
              <Text style={[stili.voce, { color: p.testo, flex: 1 }]}>{v.label}</Text>
              <Text style={[stili.importo, { color: v.nota ? p.ok : p.testo }]}>{v.nota ? t('non dovuta', 'not due') : euro(v.importo)}</Text>
            </View>
          ))}
        </View>

        {c.prossimi.length || c.ricorrenza ? (
          <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: p.linea, paddingTop: spazio.tre }}>
            <Text style={[stili.sopra, { color: p.testoSecondario }]}>{senzaTotale ? t('Prossimi pagamenti', 'Next payments') : t('Poi', 'Then')}</Text>
            {elenco.map((q) => (
              <View key={q.data} style={riga}>
                <Text style={[stili.voce, { color: p.testo, flex: 1 }]}>{dataLunga(q.data)}</Text>
                <Text style={[stili.importo, { color: p.testo }]}>{euro(q.importo)}</Text>
              </View>
            ))}
            {c.prossimi.length > MOSTRA ? (
              <Tocco ruolo="button" etichetta={tutte ? t('Mostra meno quote', 'Show fewer payments') : t(`Vedi tutte le ${c.prossimi.length} quote`, `See all ${c.prossimi.length} payments`)} onPress={() => setTutte((v) => !v)} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
                <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 13 }}>
                  {tutte ? t('Mostra meno', 'Show less') : t(`Vedi tutte le ${c.prossimi.length} quote ›`, `See all ${c.prossimi.length} payments ›`)}
                </Text>
              </Tocco>
            ) : null}
            {c.ricorrenza ? (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t(`Dal ${dataLunga(c.ricorrenza.dal)}: ${euro(c.ricorrenza.importo)} ${c.ricorrenza.ogni === 'anno' ? 'all’anno' : 'al mese'}, ${c.ricorrenza.nota}.`, `From ${dataLunga(c.ricorrenza.dal)}: ${euro(c.ricorrenza.importo)} ${c.ricorrenza.ogni === 'anno' ? 'a year' : 'a month'}, ${c.ricorrenza.nota}.`)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {senzaTotale ? null : (
        <View style={[riga, { borderTopWidth: 1, borderTopColor: p.linea, paddingTop: spazio.tre }]}>
          <Text style={[stili.voce, { color: p.testo, fontFamily: F.bold, flex: 1 }]}>
            {importi.formula === 'flex' ? t('Totale fino alla fine dell’impegno minimo', 'Total until the end of the minimum term') : t('Totale dell’impegno', 'Total commitment')}
          </Text>
          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18 }}>{euro(c.totale_impegno)}</Text>
        </View>
        )}
      </View>
    </Carta>
  )
}

const stili = StyleSheet.create({
  sopra: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  voce: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  importo: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
})
