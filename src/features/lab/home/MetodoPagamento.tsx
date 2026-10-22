import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import type { Area, ContrattoArea } from '@/api/lab'
import { meseAnno, metodoDaPerfectGym } from '@/lib/metodoPagamento'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Carta, Etichetta, Pulsante, Riga, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { nome } from './certificato'

// Il metodo di pagamento, nella sezione Pagamenti della Home (22/10/2026, richiesta di Maurizio): un riquadro suo, sopra
// lo stato dei pagamenti, che dice se il metodo c'e' e qual e' («Carta •••• 2365 · scade 04/2029»), per quali
// abbonamenti, e da dove si cambia. Prima c'era solo «Aggiorna il metodo di pagamento», ripetuto anche accanto a una
// quota da pagare: chi aveva gia' una carta valida non capiva se mancava qualcosa. Si legge dall'area (il metodo che
// PerfectGym ha su ogni contratto), quindi nessuna chiamata in piu'. Un pagamento da fare e' un'altra cosa, e sta sotto.

type AreaTrovata = Extract<Area, { trovato: true }>

type Stato = 'ok' | 'manca' | 'scaduta'

type Gruppo = { chiave: string; titolo: string; dettaglio: string | null; stato: Stato; contratti: { piano: string; per: string | null }[] }

function piano(p: string | null): string {
  return String(p ?? '').replace(/^[\s!*#.-]+/, '').replace(/\s+/g, ' ').trim() || t('Abbonamento', 'Membership')
}

/** Il metodo di un contratto, in parole, e se va bene. */
function descrivi(c: ContrattoArea): Omit<Gruppo, 'contratti'> {
  const m = metodoDaPerfectGym(c.metodo)
  const tipo = (m?.tipo ?? '').toLowerCase()
  const finale = (m?.finale ?? '').replace(/\D/g, '').slice(-4)
  const cifre = finale ? ` •••• ${finale}` : ''
  if (!m || tipo === 'cash') return { chiave: 'manca', titolo: t('Nessun metodo registrato', 'No payment method on file'), dettaglio: null, stato: 'manca' }
  if (tipo === 'creditcard') {
    const quando = meseAnno(m.scadenza)
    return {
      chiave: `carta${finale}`,
      titolo: t(`Carta${cifre}`, `Card${cifre}`),
      dettaglio: quando ? (m.scaduta ? t(`scaduta ${quando}`, `expired ${quando}`) : t(`scade ${quando}`, `expires ${quando}`)) : null,
      stato: m.scaduta ? 'scaduta' : 'ok',
    }
  }
  if (tipo === 'directdebit') return { chiave: `conto${finale}`, titolo: t(`Addebito sul conto${cifre}`, `Direct debit${cifre}`), dettaglio: t('mandato SEPA', 'SEPA mandate'), stato: 'ok' }
  if (tipo === 'moneytransfer') return { chiave: 'bonifico', titolo: t('Bonifico', 'Bank transfer'), dettaglio: null, stato: 'ok' }
  return { chiave: tipo, titolo: m.tipo, dettaglio: null, stato: 'ok' }
}

/** I contratti con qualcosa da addebitare, raggruppati per metodo: lo stesso metodo su due abbonamenti e' una riga sola. */
export function metodiDelNucleo(area: AreaTrovata): Gruppo[] {
  const gruppi: Gruppo[] = []
  for (const c of area.contratti) {
    if (!((c.canone ?? 0) > 0) || c.stato === 'Freezed') continue
    const d = descrivi(c)
    const persona = area.persone.find((x) => x.member_id === c.member_id)
    const per = persona && !persona.titolare ? persona.nome || nome(persona) : null
    let g = gruppi.find((x) => x.chiave === d.chiave)
    if (!g) gruppi.push((g = { ...d, contratti: [] }))
    g.contratti.push({ piano: piano(c.piano), per })
  }
  // Prima quello che va sistemato.
  const peso: Record<Stato, number> = { manca: 0, scaduta: 1, ok: 2 }
  return gruppi.sort((a, b) => peso[a.stato] - peso[b.stato])
}

export function MetodoPagamento({ area }: { area: AreaTrovata }) {
  const p = usePalette()
  const gruppi = metodiDelNucleo(area)
  const daSistemare = gruppi.some((g) => g.stato !== 'ok')
  return (
    <Sezione titolo={t('Metodo di pagamento', 'Payment method')}>
      <Carta style={{ paddingVertical: spazio.uno, gap: spazio.uno }}>
        {gruppi.length ? (
          gruppi.map((g, i) => (
            <Riga
              key={g.chiave}
              prima={i === 0}
              icona={g.stato === 'ok' ? 'carta' : 'attenzione'}
              tono={g.stato === 'ok' ? 'ok' : g.stato === 'scaduta' ? 'errore' : 'attenzione'}
              titolo={g.titolo}
              sotto={
                <View style={{ gap: 1 }}>
                  {g.dettaglio ? <Text style={[stili.dettaglio, { color: g.stato === 'scaduta' ? p.errore : p.testoSecondario }]}>{g.dettaglio}</Text> : null}
                  <Text style={[stili.dettaglio, { color: p.testoSecondario }]}>
                    {g.contratti.map((c) => (c.per ? `${c.piano} · ${c.per}` : c.piano)).join('\n')}
                  </Text>
                </View>
              }
              coda={<Etichetta testo={g.stato === 'ok' ? t('Registrato', 'On file') : g.stato === 'scaduta' ? t('Scaduta', 'Expired') : t('Manca', 'Missing')} tono={g.stato === 'ok' ? 'ok' : g.stato === 'scaduta' ? 'errore' : 'attenzione'} />}
            />
          ))
        ) : (
          <Text style={[stili.vuoto, { color: p.testoSecondario }]}>{t('Nessun abbonamento con quote da addebitare.', 'No memberships with charges to collect.')}</Text>
        )}
        <View style={stili.azione}>
          <Pulsante
            testo={daSistemare ? t('Aggiungi il metodo di pagamento', 'Add a payment method') : t('Cambia metodo', 'Change method')}
            icona={daSistemare ? 'carta' : undefined}
            variante={daSistemare ? 'primario' : 'secondario'}
            piccolo={!daSistemare}
            onPress={() => router.push('/metodo-pagamento')}
          />
        </View>
      </Carta>
    </Sezione>
  )
}

const stili = StyleSheet.create({
  dettaglio: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  vuoto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20, paddingHorizontal: spazio.tre, paddingVertical: spazio.tre },
  azione: { paddingHorizontal: spazio.tre, paddingTop: spazio.uno, paddingBottom: spazio.due },
})
