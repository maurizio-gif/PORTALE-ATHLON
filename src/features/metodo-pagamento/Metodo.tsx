import { StyleSheet, Text, View } from 'react-native'

import { Avviso } from '@/components/Avviso'
import { dataBreve, meseAnno, type ContrattoNucleo, type EsitoContratto, type MetodoAttuale } from '@/lib/metodoPagamento'
import { spazio, stileTono, useColori, type Tono } from '@/theme'

// I pezzi che l'elenco e il ritorno dalla carta disegnano uguali: chi e'
// l'abbonamento, che metodo ha, com'e' andato il salvataggio. Ripresi dalla
// pagina del CRM (`app/metodo-pagamento/nucleo/[codice]/Metodo.tsx`).
//
// Delle carte e dei conti si mostrano solo le ultime cifre che PerfectGym
// rende pubbliche, e la scadenza della carta: abbastanza per riconoscerli,
// niente che serva a usarli.

function Etichetta({ tono, children }: { tono: Tono; children: React.ReactNode }) {
  const c = useColori()
  return (
    <View style={[stili.etichetta, stileTono(c, tono)]}>
      <Text style={[stili.testoEtichetta, { color: c.testo }]}>{children}</Text>
    </View>
  )
}

export function MetodoAttualeBadge({ metodo }: { metodo: MetodoAttuale | null }) {
  const tipo = (metodo?.tipo ?? '').toLowerCase()
  if (!metodo || tipo === 'cash') return <Etichetta tono="attenzione">Nessun metodo salvato</Etichetta>
  if (tipo === 'creditcard') {
    const quando = meseAnno(metodo.scadenza)
    const cifre = metodo.finale ? ` •••• ${metodo.finale}` : ''
    if (metodo.scaduta) {
      return (
        <Etichetta tono="errore">
          <Text style={{ fontWeight: '700' }}>Carta{cifre} scaduta</Text>
          {quando ? ` (${quando})` : ''}
        </Etichetta>
      )
    }
    return (
      <Etichetta tono="ok">
        Carta{cifre}
        {quando ? ` · scade ${quando}` : ''}
      </Etichetta>
    )
  }
  if (tipo === 'directdebit') return <Etichetta tono="ok">Conto corrente{metodo.finale ? ` •••• ${metodo.finale}` : ''}</Etichetta>
  return <Etichetta tono="attenzione">Altro metodo ({metodo.tipo})</Etichetta>
}

export function chi(c: Pick<ContrattoNucleo, 'nome' | 'cognome'>): string {
  return [c.nome, c.cognome].filter(Boolean).join(' ') || 'Abbonamento'
}

export function statoLeggibile(c: Pick<ContrattoNucleo, 'stato' | 'data_inizio'>): string {
  if (c.stato === 'Freezed') return 'Sospeso'
  if (c.stato === 'NotStarted') {
    const d = dataBreve(c.data_inizio)
    return d ? `Parte il ${d}` : 'Non ancora partito'
  }
  return 'Attivo'
}

/** Sottoscrizione, inizio e — se c'e' — fine, nell'ordine in cui accadono. */
export function dateContratto(c: Pick<ContrattoNucleo, 'data_firma' | 'data_inizio' | 'data_fine'>): string {
  return [
    dataBreve(c.data_firma) && `Sottoscritto il ${dataBreve(c.data_firma)}`,
    dataBreve(c.data_inizio) && `inizio ${dataBreve(c.data_inizio)}`,
    dataBreve(c.data_fine) && `fine ${dataBreve(c.data_fine)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function ElencoEsiti({ contratti, risultati }: { contratti: ContrattoNucleo[]; risultati: EsitoContratto[] }) {
  const c = useColori()
  const perId = new Map(contratti.map((x) => [x.contract_id, x]))
  return (
    <View style={stili.esiti}>
      {risultati.map((r) => {
        const x = perId.get(r.contract_id)
        return (
          <Avviso key={r.contract_id} tono={r.ok ? 'ok' : 'errore'}>
            <Text style={[stili.testoEsito, { color: c.testo }]}>
              <Text style={{ fontWeight: '700' }}>
                {r.ok ? '✓' : '✕'} {x ? chi(x) : `Abbonamento ${r.contract_id}`}
              </Text>
              {x?.piano ? ` · ${x.piano}` : ''}
              {'\n'}
              {r.ok ? 'Salvato.' : r.errore || 'Non salvato.'}
            </Text>
          </Avviso>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  etichetta: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: spazio.due + 2, paddingVertical: 2 },
  testoEtichetta: { fontSize: 13, lineHeight: 19 },
  esiti: { gap: spazio.due },
  testoEsito: { fontSize: 14, lineHeight: 21 },
})
