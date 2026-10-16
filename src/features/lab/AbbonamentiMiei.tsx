import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { contrattiAbbonamento, documentoAbbonamento, type AddebitoContratto, type ContrattoElenco } from '@/api/abbonamento'
import type { Area } from '@/api/lab'
import { euro } from '@/lib/eventi'
import { spazio } from '@/theme'

import { regolaritaContratto, type Regolarita } from './home/regolarita'
import type { SezioneHome } from './home/sezioni'
import { useApriPdf } from './apriPdf'
import { inMemoria, prendi } from './memoria'
import { Carta, Etichetta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from './ui/kit'
import { F, usePalette } from './ui/tema'
import { Tocco } from './ui/Tocco'

// Il dettaglio dei tuoi abbonamenti (16/10/2026, nella Home dal 17/10): quelli in
// vigore (in corso, sospesi, o che devono ancora iniziare), con la data di
// sottoscrizione, l'inizio, la fine, i totali e le sole quote ancora da pagare. Dal
// gestionale del club, per te e per la tua famiglia. Gli abbonamenti terminati non si
// mostrano (17/10/2026).

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

/** Cosa non va in un abbonamento, e da dove si sistema: i pagamenti o il metodo. */
function DaSistemare({ regolarita, onSezione }: { regolarita: Regolarita; onSezione: (s: SezioneHome) => void }) {
  const p = usePalette()
  const debito = regolarita.motivi.some((m) => m.chiave === 'debito')
  const metodo = regolarita.motivi.some((m) => m.chiave === 'metodo' || m.chiave === 'carta')
  return (
    <Messaggio tono={regolarita.tono ?? 'attenzione'} titolo="Da sistemare">
      <View style={{ gap: spazio.due }}>
        {regolarita.motivi.map((m) => (
          <Text key={m.chiave} style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>
            {m.dettaglio}
          </Text>
        ))}
        <View style={{ gap: spazio.due, paddingTop: 2 }}>
          {debito ? <Pulsante testo="Vedi i pagamenti" icona="carta" piccolo variante={metodo ? 'contorno' : 'primario'} onPress={() => onSezione('pagamenti')} /> : null}
          {metodo ? <Pulsante testo="Sistema il metodo" icona="carta" piccolo onPress={() => router.push('/metodo-pagamento')} /> : null}
        </View>
      </View>
    </Messaggio>
  )
}

function SchedaContratto({ c, conPersona, regolarita, onSezione }: { c: ContrattoElenco; conPersona: boolean; regolarita: Regolarita | null; onSezione: (s: SezioneHome) => void }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  const [scarico, setScarico] = useState(false)
  const { apri: apriPdf, avviso } = useApriPdf()
  const s = statoContratto(c)
  // Il flag `automaticRenew` di PerfectGym, letto dal server come `si_rinnova`:
  // si accende solo per un contratto in vigore, e sparisce con la disdetta.
  const rinnovoAutomatico = c.in_vigore && c.si_rinnova
  const irregolare = Boolean(regolarita?.motivi.length)

  async function scarica() {
    if (!c.firmato) return
    const numero = c.firmato.numero
    setScarico(true)
    await apriPdf(async () => {
      const r = await documentoAbbonamento(numero)
      return r.ok ? { ...r, nome: `contratto-${numero}.pdf` } : r
    })
    setScarico(false)
  }

  // Del dettaglio si mostra solo cio' che c'e' ancora da pagare: gli addebiti pagati o annullati e i
  // pagamenti ricevuti non servono a chi sta guardando il contratto (17/10/2026).
  const daPagare = c.addebiti.filter((a) => a.stato === 'da_pagare')

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
        {irregolare || c.categoria !== 'principale' || rinnovoAutomatico ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spazio.due }}>
            {irregolare ? <Etichetta testo="Irregolare" tono={regolarita?.tono ?? 'attenzione'} /> : null}
            {c.categoria !== 'principale' ? <Etichetta testo={c.categoria === 'junior' ? 'Corso per bambini' : 'Abbonamento aggiuntivo'} tono="neutro" /> : null}
            {rinnovoAutomatico ? <Etichetta testo="Rinnovo automatico attivo" tono="ok" /> : null}
          </View>
        ) : null}
        {irregolare && regolarita ? <DaSistemare regolarita={regolarita} onSezione={onSezione} /> : null}

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

        {daPagare.length ? (
          <>
            <Tocco ruolo="button" etichetta={aperta ? 'Nascondi le quote da pagare' : 'Mostra le quote da pagare'} onPress={() => setAperta((v) => !v)} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
              <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 14 }}>{aperta ? 'Nascondi il dettaglio' : `Quote da pagare (${daPagare.length})  ›`}</Text>
            </Tocco>
            {aperta ? (
              <View style={{ gap: 8 }}>
                {daPagare.map((a, i) => (
                  <View key={i} style={stili.riga}>
                    <View style={{ flex: 1 }}>
                      <Text style={[stili.valore, { color: p.testo, textAlign: 'left' }]}>{nomeAddebito(a)}</Text>
                      <Text style={[stili.nome, { color: p.testoSecondario }]}>{`Scade il ${data(a.scadenza)}`}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[stili.valore, { color: p.testo }]}>{euro(a.da_pagare)}</Text>
                      <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 12 }}>Da pagare</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={[stili.nome, { color: p.testoSecondario }]}>Niente da pagare su questo contratto.</Text>
        )}

        {c.firmato?.pdf ? (
          <>
            <Pulsante testo="Il contratto firmato (PDF)" icona="documento" variante="contorno" piccolo onPress={scarica} inCorso={scarico} />
            {avviso}
          </>
        ) : null}
      </View>
    </Carta>
  )
}

export const CHIAVE_CONTRATTI = 'abbonamenti:contratti'

/**
 * I contratti in vigore della persona e della famiglia: gli abbonamenti terminati
 * non si mostrano.
 * Sta dentro la sezione Abbonamenti della Home (17/10/2026); in cima il
 * comando per sceglierne uno nuovo. I dati restano in memoria: tornando alla
 * sezione si apre subito, e intanto si aggiorna.
 */
export function ElencoAbbonamenti({ area, onSezione }: { area: Extract<Area, { trovato: true }>; onSezione: (s: SezioneHome) => void }) {
  const p = usePalette()
  const [elenco, setElenco] = useState<ContrattoElenco[] | null>(() => inMemoria<{ ok: true; contratti: ContrattoElenco[] }>(CHIAVE_CONTRATTI)?.contratti ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_CONTRATTI, contrattiAbbonamento)
    if (r.ok) setElenco(r.contratti)
    else setErrore(r.errore)
  }, [])
  useEffect(() => {
    carica()
  }, [carica])

  const vigore = (elenco ?? []).filter((c) => c.in_vigore)
  const piuPersone = new Set(vigore.map((c) => c.member_id)).size > 1
  // La regolarita' viene dai dati della Home (l'area): il metodo e il debito sono li'.
  const regolarita = (c: ContrattoElenco): Regolarita | null => {
    const k = area.contratti.find((x) => x.contract_id === c.contract_id)
    return k ? regolaritaContratto(k, area.persone.find((x) => x.member_id === k.member_id)) : null
  }
  return (
    <View style={{ gap: spazio.quattro }}>
      <Pulsante testo="Scegli un abbonamento" icona="avanti" onPress={() => router.navigate('/abbonamento')} />
      {errore && !elenco ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" variante="secondario" onPress={carica} />
        </>
      ) : null}
      {!elenco && !errore ? <SchedeInArrivo quante={1} /> : null}
      {elenco && !vigore.length ? (
        <Carta piatta>
          <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>Non troviamo abbonamenti in corso su questa scheda.</Text>
        </Carta>
      ) : null}
      {vigore.length ? (
        <Sezione titolo="In vigore" conteggio={vigore.length}>
          <View style={{ gap: spazio.tre }}>
            {vigore.map((c) => (
              <SchedaContratto key={c.contract_id} c={c} conPersona={piuPersone} regolarita={regolarita(c)} onSezione={onSezione} />
            ))}
          </View>
        </Sezione>
      ) : null}
    </View>
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
