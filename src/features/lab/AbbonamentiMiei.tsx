import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'

import { contrattiAbbonamento, documentoAbbonamento, type AddebitoContratto, type ContrattoElenco } from '@/api/abbonamento'
import { euro } from '@/lib/eventi'
import { spazio } from '@/theme'

import { SchermataInArrivo } from './ui/Attesa'
import { Carta, Etichetta, Messaggio, Pulsante, Sezione } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, usePalette } from './ui/tema'
import { Tocco } from './ui/Tocco'

// Il dettaglio dei tuoi abbonamenti (16/10/2026): quello in vigore e quelli
// passati, con la data di sottoscrizione, l'inizio, la fine, gli addebiti
// (pagati, da pagare, annullati) e i pagamenti ricevuti. Dal gestionale del
// club, per te e per la tua famiglia.

/** «17 ott 2026», per le date del gestionale («2026-10-17»). */
function data(iso: string | null): string {
  if (!iso) return '—'
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, g)))
}

function giornoDopo(iso: string): string {
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, g + 1)).toISOString().slice(0, 10)
}

const TIPO_ADDEBITO: Record<string, string> = {
  Membership: 'Quota',
  Prorata: 'Pro-rata',
  AdminFee: 'Quota di attivazione',
  JoiningFee: 'Quota di attivazione',
  Freeze: 'Sospensione',
}

function nomeAddebito(a: AddebitoContratto): string {
  if (a.tipo === 'Manual') return a.descrizione?.trim() || 'Addebito'
  return TIPO_ADDEBITO[a.tipo] ?? a.tipo
}

function statoContratto(c: ContrattoElenco): { testo: string; tono: 'ok' | 'attenzione' | 'neutro' } {
  if (c.in_vigore && !c.si_rinnova && c.data_fine) return { testo: `Termina il ${data(c.data_fine)}`, tono: 'attenzione' }
  if (c.stato === 'NotStarted') return { testo: 'Non ancora iniziato', tono: 'attenzione' }
  if (c.stato === 'Freezed') return { testo: 'Sospeso', tono: 'attenzione' }
  if (c.in_vigore) return { testo: 'In corso', tono: 'ok' }
  return { testo: 'Terminato', tono: 'neutro' }
}

function Riga({ nome, valore, colore }: { nome: string; valore: string; colore?: string }) {
  const p = usePalette()
  return (
    <View style={stili.riga}>
      <Text style={[stili.nome, { color: p.testoSecondario }]}>{nome}</Text>
      <Text style={[stili.valore, { color: colore ?? p.testo }]}>{valore}</Text>
    </View>
  )
}

function SchedaContratto({ c, conPersona }: { c: ContrattoElenco; conPersona: boolean }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  const [scarico, setScarico] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const s = statoContratto(c)
  // Il flag `automaticRenew` di PerfectGym, letto dal server come `si_rinnova`:
  // si accende solo per un contratto in vigore, e sparisce con la disdetta.
  const rinnovoAutomatico = c.in_vigore && c.si_rinnova

  async function scarica() {
    if (!c.firmato) return
    setErrore(null)
    setScarico(true)
    const r = await documentoAbbonamento(c.firmato.numero)
    setScarico(false)
    if (!r.ok) return setErrore(r.errore)
    if (Platform.OS === 'web') window.open(r.url, '_blank')
    else await Linking.openURL(r.url)
  }

  const colorePagamento = (st: AddebitoContratto['stato']) => (st === 'pagato' ? p.ok : st === 'da_pagare' ? p.accento : p.testoSecondario)
  const etichettaPagamento = (st: AddebitoContratto['stato']) => (st === 'pagato' ? 'Pagato' : st === 'da_pagare' ? 'Da pagare' : 'Annullato')

  return (
    <Carta>
      <View style={{ gap: spazio.tre }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 }}>{c.piano}</Text>
            {conPersona && c.persona ? <Text style={[stili.nome, { color: p.testoSecondario }]}>{c.persona}</Text> : null}
          </View>
          <Etichetta testo={s.testo} tono={s.tono} />
        </View>
        {c.categoria !== 'principale' || rinnovoAutomatico ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spazio.due }}>
            {c.categoria !== 'principale' ? <Etichetta testo={c.categoria === 'junior' ? 'Corso per bambini' : 'Abbonamento aggiuntivo'} tono="neutro" /> : null}
            {rinnovoAutomatico ? <Etichetta testo="Rinnovo automatico attivo" tono="ok" /> : null}
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Riga nome="Sottoscritto il" valore={data(c.data_firma)} />
          <Riga nome="Inizio" valore={data(c.data_inizio)} />
          <Riga nome="Fine" valore={c.data_fine ? data(c.data_fine) : 'Si rinnova ogni mese'} />
          {c.in_vigore && c.si_rinnova && c.data_fine ? <Riga nome="Si rinnova il" valore={data(giornoDopo(c.data_fine))} /> : null}
          {c.data_disdetta ? <Riga nome="Disdetto il" valore={data(c.data_disdetta)} /> : null}
          {c.canone ? <Riga nome="Quota" valore={euro(c.canone)} /> : null}
        </View>

        <View style={[stili.totali, { backgroundColor: p.incavo }]}>
          <View style={{ flex: 1 }}>
            <Text style={[stili.nome, { color: p.testoSecondario }]}>Addebitato</Text>
            <Text style={[stili.totale, { color: p.testo }]}>{euro(c.totali.addebitato)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[stili.nome, { color: p.testoSecondario }]}>Pagato</Text>
            <Text style={[stili.totale, { color: p.ok }]}>{euro(c.totali.pagato)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[stili.nome, { color: p.testoSecondario }]}>Da pagare</Text>
            <Text style={[stili.totale, { color: c.totali.da_pagare > 0 ? p.accento : p.testo }]}>{euro(c.totali.da_pagare)}</Text>
          </View>
        </View>

        <Tocco ruolo="button" etichetta={aperta ? 'Nascondi addebiti e pagamenti' : 'Mostra addebiti e pagamenti'} onPress={() => setAperta((v) => !v)} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
          <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 14 }}>{aperta ? 'Nascondi il dettaglio' : `Addebiti e pagamenti (${c.addebiti.length})  ›`}</Text>
        </Tocco>

        {aperta ? (
          <View style={{ gap: spazio.tre }}>
            <View style={{ gap: 8 }}>
              <Text style={[stili.sezione, { color: p.testoSecondario }]}>Addebiti</Text>
              {c.addebiti.length ? (
                c.addebiti.map((a, i) => (
                  <View key={i} style={stili.riga}>
                    <View style={{ flex: 1 }}>
                      <Text style={[stili.valore, { color: p.testo, textAlign: 'left' }]}>{nomeAddebito(a)}</Text>
                      <Text style={[stili.nome, { color: p.testoSecondario }]}>{`Scade il ${data(a.scadenza)}`}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[stili.valore, { color: p.testo }]}>{euro(a.importo)}</Text>
                      <Text style={{ color: colorePagamento(a.stato), fontFamily: F.bold, fontSize: 12 }}>{etichettaPagamento(a.stato)}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[stili.nome, { color: p.testoSecondario }]}>Nessun addebito su questo contratto.</Text>
              )}
            </View>
            <View style={{ gap: 8 }}>
              <Text style={[stili.sezione, { color: p.testoSecondario }]}>Pagamenti ricevuti</Text>
              {c.pagamenti.length ? (
                c.pagamenti.map((x, i) => (
                  <View key={i} style={stili.riga}>
                    <Text style={[stili.nome, { color: p.testo }]}>{`${x.rimborso ? 'Rimborso del' : 'Pagato il'} ${data(x.data)}`}</Text>
                    <Text style={[stili.valore, { color: x.rimborso ? p.testoSecondario : p.ok }]}>{`${x.rimborso ? '−' : ''}${euro(x.importo)}`}</Text>
                  </View>
                ))
              ) : (
                <Text style={[stili.nome, { color: p.testoSecondario }]}>Ancora nessun pagamento.</Text>
              )}
            </View>
          </View>
        ) : null}

        {c.firmato?.pdf ? (
          <>
            <Pulsante testo="Il contratto firmato (PDF)" icona="documento" variante="contorno" piccolo onPress={scarica} inCorso={scarico} />
            {errore ? <Messaggio>{errore}</Messaggio> : null}
          </>
        ) : null}
      </View>
    </Carta>
  )
}

export function AbbonamentiMiei() {
  const p = usePalette()
  const [elenco, setElenco] = useState<ContrattoElenco[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  useEffect(() => {
    contrattiAbbonamento().then((r) => (r.ok ? setElenco(r.contratti) : setErrore(r.errore)))
  }, [])
  if (!elenco && !errore) return <SchermataInArrivo titolo="I tuoi abbonamenti" sopratitolo="Abbonamento" />

  const vigore = (elenco ?? []).filter((c) => c.in_vigore)
  const passati = (elenco ?? []).filter((c) => !c.in_vigore)
  const piuPersone = new Set((elenco ?? []).map((c) => c.member_id)).size > 1
  return (
    <Schermata titolo="I tuoi abbonamenti" sopratitolo="Abbonamento" sottotitolo="Quello in corso e quelli passati, con date e pagamenti." indietro="/lab/abbonamento">
      <View style={{ gap: spazio.quattro }}>
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        {elenco && !elenco.length ? (
          <Carta piatta>
            <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>Non troviamo abbonamenti su questa scheda.</Text>
            <View style={{ height: spazio.tre }} />
            <Pulsante testo="Scegli un abbonamento" onPress={() => router.navigate('/lab/abbonamento')} />
          </Carta>
        ) : null}
        {vigore.length ? (
          <Sezione titolo="In vigore" conteggio={vigore.length}>
            <View style={{ gap: spazio.tre }}>
              {vigore.map((c) => (
                <SchedaContratto key={c.contract_id} c={c} conPersona={piuPersone} />
              ))}
            </View>
          </Sezione>
        ) : null}
        {passati.length ? (
          <Sezione titolo="Passati" conteggio={passati.length}>
            <View style={{ gap: spazio.tre }}>
              {passati.map((c) => (
                <SchedaContratto key={c.contract_id} c={c} conPersona={piuPersone} />
              ))}
            </View>
          </Sezione>
        ) : null}
      </View>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spazio.tre },
  nome: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  valore: { fontFamily: F.bold, fontSize: 14, textAlign: 'right' },
  totali: { flexDirection: 'row', gap: spazio.due, padding: spazio.tre, borderRadius: 16 },
  totale: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  sezione: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
})
