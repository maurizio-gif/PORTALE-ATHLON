import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import type { Area } from '@/api/lab'
import { spazio } from '@/theme'

import { Carta, Entra, Pulsante, Riga, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { personeDaAvvisare } from './AvvisoCertificato'
import { nome, richiedeAzione, statoCertificato, urgenzaCertificato } from './certificato'
import { personeConAbbonamento, regolaritaContratto, type ChiaveMotivo } from './regolarita'
import type { SezioneHome } from './sezioni'

// «Da fare», in cima alla Home, solo se serve: un pagamento in sospeso, un
// metodo di pagamento mancante o una carta scaduta, un certificato scaduto,
// mancante, da consegnare o in scadenza, per te o per un familiare. Si ricava da `portale_la_mia_area`, gia' letta: nessuna chiamata
// in piu'. Toccando una riga si apre la sezione che ne parla. Il certificato scaduto o mancante di chi ha un abbonamento
// non e' qui: ha il suo avviso, piu' in evidenza, sotto la testata (AvvisoCertificato, 20/10/2026). Il certificato di chi
// non ha un abbonamento in vigore (in corso, non ancora iniziato o sospeso) non e' da nessuna delle due parti (20/10/2026).

type AreaTrovata = Extract<Area, { trovato: true }>

function soldi(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

type Voce = { chiave: string; icona: 'attenzione' | 'certificato'; tono: 'errore' | 'attenzione'; titolo: string; sotto: string; /** Di chi si parla: in neretto sopra la riga di dettaglio. */ chi?: string; sezione: SezioneHome; urgenza: number }

/** Le cose da fare, dalla piu' urgente. */
export function vociDaFare(area: AreaTrovata): Voce[] {
  const voci: Voce[] = []
  const conDebito = area.persone.filter((x) => x.debito)
  if (conDebito.length) {
    const chi = conDebito.map((x) => (x.titolare ? 'Tu' : x.nome || 'Un familiare'))
    const totale = conDebito.reduce((t, x) => t + (x.debito?.importo ?? 0), 0)
    voci.push({
      chiave: 'debito',
      icona: 'attenzione',
      tono: 'errore',
      titolo: 'Pagamento in sospeso',
      sotto: `${soldi(totale)} da saldare${conDebito.length === 1 && conDebito[0].titolare ? '' : ` · ${chi.join(', ')}`}`,
      sezione: 'pagamenti',
      urgenza: 9,
    })
  }
  // Il metodo di pagamento: manca, o la carta e' scaduta. Una voce per tipo, con chi riguarda.
  const METODO: { chiave: Extract<ChiaveMotivo, 'metodo' | 'carta'>; titolo: string; sotto: string }[] = [
    { chiave: 'metodo', titolo: 'Manca il metodo di pagamento', sotto: 'Aggiungi una carta o un conto corrente per gli addebiti.' },
    { chiave: 'carta', titolo: 'Carta scaduta', sotto: 'Sostituiscila per gli addebiti.' },
  ]
  for (const t of METODO) {
    const chi = new Set<string>()
    for (const k of area.contratti) {
      const persona = area.persone.find((x) => x.member_id === k.member_id)
      if (regolaritaContratto(k, persona).motivi.some((m) => m.chiave === t.chiave)) chi.add(!persona || persona.titolare ? 'Tu' : nome(persona))
    }
    if (!chi.size) continue
    voci.push({ chiave: `metodo-${t.chiave}`, icona: 'attenzione', tono: 'attenzione', titolo: t.titolo, chi: [...chi].join(', '), sotto: t.sotto, sezione: 'abbonamenti', urgenza: 6 })
  }
  // Il certificato si chiede solo a chi ha un abbonamento in vigore (richiesta di Maurizio, 20/10/2026): in corso, non
  // ancora iniziato o sospeso, cioe' un contratto dell'area che sia un abbonamento. Un ex socio, una prova, un
  // familiare senza corso non ne leggono niente. Chi ha un abbonamento e il certificato scaduto o mancante ha il suo
  // avviso in cima alla Home (AvvisoCertificato): qui non si ripete. Restano «in scadenza» e «da consegnare entro i 6 anni».
  const abbonate = personeConAbbonamento(area)
  const avvisate = new Set(personeDaAvvisare(area).map((a) => a.persona.member_id))
  for (const persona of area.persone) {
    if (!abbonate.has(persona.member_id) || avvisate.has(persona.member_id)) continue
    const s = statoCertificato(area.certificati.find((c) => c.member_id === persona.member_id), persona.data_nascita)
    if (!richiedeAzione(s)) continue
    voci.push({
      chiave: `cert-${persona.member_id}`,
      icona: 'certificato',
      tono: s.tono === 'errore' ? 'errore' : 'attenzione',
      titolo: `Certificato ${s.testo.toLowerCase()}`,
      chi: persona.titolare ? 'Tu' : nome(persona),
      sotto: s.dettaglio,
      sezione: 'certificato',
      urgenza: urgenzaCertificato(s),
    })
  }
  return voci.sort((a, b) => b.urgenza - a.urgenza)
}

export function DaFare({ area, onSezione }: { area: AreaTrovata; onSezione: (s: SezioneHome) => void }) {
  const p = usePalette()
  const voci = vociDaFare(area)
  if (!voci.length) return null
  const inSospeso = voci.some((v) => v.chiave === 'debito')
  const senzaMetodo = voci.some((v) => v.chiave.startsWith('metodo-'))
  return (
    <Entra indice={1}>
      <Sezione titolo="Da fare" conteggio={voci.length}>
        <Carta style={[{ paddingVertical: spazio.due }, inSospeso && { borderWidth: 1.5, borderColor: p.errore }]}>
          {voci.map((v, i) => (
            <Riga
              key={v.chiave}
              prima={i === 0}
              icona={v.icona}
              tono={v.tono}
              titolo={v.titolo}
              sotto={
                v.chi ? (
                  <View style={{ gap: 1 }}>
                    <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 13.5 }}>{v.chi}</Text>
                    <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>{v.sotto}</Text>
                  </View>
                ) : (
                  v.sotto
                )
              }
              onPress={() => onSezione(v.sezione)}
            />
          ))}
          {inSospeso || senzaMetodo ? (
            <View style={stili.azioni}>
              {inSospeso ? (
                <View style={{ flexGrow: 1, flexBasis: 160 }}>
                  <Pulsante testo="Vedi i pagamenti" icona="carta" onPress={() => onSezione('pagamenti')} />
                </View>
              ) : null}
              <View style={{ flexGrow: 1, flexBasis: 160 }}>
                <Pulsante testo="Aggiorna il metodo" variante={inSospeso ? 'secondario' : 'primario'} onPress={() => router.push('/metodo-pagamento')} />
              </View>
            </View>
          ) : null}
        </Carta>
      </Sezione>
    </Entra>
  )
}

const stili = StyleSheet.create({
  azioni: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due, paddingHorizontal: spazio.tre, paddingTop: spazio.tre, paddingBottom: spazio.uno },
})
