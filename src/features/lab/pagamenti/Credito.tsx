import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { leggiCredito, type AmbitoCredito, type Credito, type LottoCredito } from '@/api/credito'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Icona } from '../ui/Icona'
import { Carta, Numero } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// «Credito disponibile da scalare» nella sezione Pagamenti (12/11/2026, richiesta di Maurizio): il credito in euro che il
// club carica dal CRM (sezione «Agevolazioni»). **Compare solo se e' maggiore di zero**: niente riquadro vuoto, niente
// «0,00 €», e niente se la lettura fallisce. Un totale in grande e, sotto, una riga per lotto con il residuo, per cosa vale
// e la scadenza; con piu' persone del nucleo, le righe stanno sotto il nome di ognuna.

export const CHIAVE_CREDITO = 'pagamenti:credito'

const AMBITI: Record<AmbitoCredito, string> = {
  abbonamenti: t('Abbonamenti', 'Memberships'),
  lezioni: t('Lezioni, eventi e gare', 'Classes, events and competitions'),
  shop: t('Shop', 'Shop'),
}

function euro(cent: number): string {
  return (cent / 100).toLocaleString(locale(), { style: 'currency', currency: 'EUR' })
}

function scadenza(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return d.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome' })
}

export function useCredito(): Credito | null {
  const [credito, setCredito] = useState<Credito | null>(() => inMemoria<{ ok: true } & Credito>(CHIAVE_CREDITO) ?? null)
  useEffect(() => {
    let vivo = true
    prendi(CHIAVE_CREDITO, leggiCredito, { freschezzaMs: 60_000 }).then((r) => {
      if (vivo) setCredito(r)
    })
    return () => {
      vivo = false
    }
  }, [])
  return credito
}

function RigaLotto({ c, prima }: { c: LottoCredito; prima: boolean }) {
  const p = usePalette()
  const ambiti = c.ambiti.map((a) => AMBITI[a] ?? a).join(' · ')
  return (
    <View style={[stili.riga, !prima && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[stili.ambiti, { color: p.testo }]}>{ambiti || t('Credito', 'Credit')}</Text>
        {c.scade_il ? <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t(`Scade il ${scadenza(c.scade_il)}`, `Expires on ${scadenza(c.scade_il)}`)}</Text> : null}
      </View>
      <Text style={[stili.importo, { color: p.testo }]}>{euro(c.residuo_cent)}</Text>
    </View>
  )
}

/** Il riquadro del credito. Non disegna niente se non c'e' credito o se non si e' potuto leggere. */
export function CreditoDisponibile() {
  const p = usePalette()
  const credito = useCredito()
  if (!credito || credito.totale_cent <= 0 || !credito.crediti.length) return null

  // Con piu' persone del nucleo si raggruppa per nome, nell'ordine in cui le manda il server.
  const gruppi: { chiave: number; nome: string | null; lotti: LottoCredito[] }[] = []
  for (const c of credito.crediti) {
    let g = gruppi.find((x) => x.chiave === c.member_id)
    if (!g) gruppi.push((g = { chiave: c.member_id, nome: c.nome, lotti: [] }))
    g.lotti.push(c)
  }
  const conNomi = gruppi.length > 1

  return (
    <View style={{ gap: spazio.due }}>
      <Carta style={{ gap: spazio.tre }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
          <View style={[stili.bollo, { backgroundColor: p.incavo }]}>
            <Icona nome="regalo" size={18} colore={p.accento} />
          </View>
          <Text style={[stili.titolo, { color: p.testo, flex: 1 }]}>{t('Credito disponibile da scalare', 'Credit available to use')}</Text>
        </View>
        <Numero valore={(credito.totale_cent / 100).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unita="€" size={36} />
        <View style={{ gap: spazio.due }}>
          {gruppi.map((g) => (
            <View key={g.chiave} style={{ gap: 2 }}>
              {conNomi && g.nome ? <Text style={[stili.nome, { color: p.testoSecondario }]}>{g.nome}</Text> : null}
              <Carta piatta style={{ paddingVertical: spazio.uno, backgroundColor: p.incavo }}>
                {g.lotti.map((c, i) => (
                  <RigaLotto key={c.id} c={c} prima={i === 0} />
                ))}
              </Carta>
            </View>
          ))}
        </View>
      </Carta>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Si scala da solo quando prenoti o ti iscrivi, e torna se disdici.', 'It’s used automatically when you book or sign up, and comes back if you cancel.')}</Text>
    </View>
  )
}

const stili = StyleSheet.create({
  bollo: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  nome: { fontFamily: F.bold, fontSize: 13, letterSpacing: 0.2, paddingHorizontal: 2, paddingBottom: 4 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.due + 2, paddingHorizontal: spazio.tre },
  ambiti: { fontFamily: F.bold, fontSize: 14.5 },
  sotto: { fontFamily: F.medio, fontSize: 13 },
  importo: { fontFamily: F.extra, fontSize: 15.5, letterSpacing: -0.3 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19, paddingHorizontal: 2 },
})
