import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { contrattiAbbonamento, documentoAbbonamento, type AddebitoContratto, type ContrattoElenco } from '@/api/abbonamento'
import { statoGestione, type ContrattoGestione } from '@/api/gestioneAbbonamento'
import type { Area } from '@/api/lab'
import { euro } from '@/lib/eventi'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { regolaritaContratto, type Regolarita } from './home/regolarita'
import type { SezioneHome } from './home/sezioni'
import { useApriPdf } from './apriPdf'
import { CartaProva, PulsanteGestisci } from './abbonamento/Gestisci'
import { inMemoria, prendi, scorda } from './memoria'
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
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, g)))
}

function giornoDopo(iso: string): string {
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, g + 1)).toISOString().slice(0, 10)
}

const TIPO_ADDEBITO: Record<string, string> = {
  Membership: t('Quota', 'Fee'),
  Prorata: t('Pro-rata', 'Pro rata'),
  AdminFee: t('Quota di attivazione', 'Joining fee'),
  JoiningFee: t('Quota di attivazione', 'Joining fee'),
  Freeze: t('Sospensione', 'Freeze'),
}

function nomeAddebito(a: AddebitoContratto): string {
  if (a.tipo === 'Manual') return a.descrizione?.trim() || t('Addebito', 'Charge')
  return TIPO_ADDEBITO[a.tipo] ?? a.tipo
}

function statoContratto(c: ContrattoElenco): { testo: string; tono: 'ok' | 'attenzione' | 'neutro' } {
  if (c.in_vigore && !c.si_rinnova && c.data_fine) return { testo: t(`Termina il ${data(c.data_fine)}`, `Ends on ${data(c.data_fine)}`), tono: 'attenzione' }
  if (c.stato === 'NotStarted') return { testo: t('Non ancora iniziato', 'Not started'), tono: 'attenzione' }
  if (c.stato === 'Freezed') return { testo: t('Sospeso', 'Frozen'), tono: 'attenzione' }
  if (c.in_vigore) return { testo: t('In corso', 'Current'), tono: 'ok' }
  return { testo: t('Terminato', 'Ended'), tono: 'neutro' }
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
    <Messaggio tono={regolarita.tono ?? 'attenzione'} titolo={t('Da sistemare', 'Needs attention')}>
      <View style={{ gap: spazio.due }}>
        {regolarita.motivi.map((m) => (
          <Text key={m.chiave} style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>
            {m.dettaglio}
          </Text>
        ))}
        <View style={{ gap: spazio.due, paddingTop: 2 }}>
          {debito ? <Pulsante testo={t('Vedi i pagamenti', 'See payments')} icona="carta" piccolo variante={metodo ? 'contorno' : 'primario'} onPress={() => onSezione('pagamenti')} /> : null}
          {metodo ? <Pulsante testo={t('Sistema il metodo', 'Fix the payment method')} icona="carta" piccolo onPress={() => router.push('/metodo-pagamento')} /> : null}
        </View>
      </View>
    </Messaggio>
  )
}

function SchedaContratto({ c, conPersona, regolarita, onSezione, gestione, onCambiato }: { c: ContrattoElenco; conPersona: boolean; regolarita: Regolarita | null; onSezione: (s: SezioneHome) => void; gestione?: ContrattoGestione; onCambiato: () => void }) {
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
      return r.ok ? { ...r, nome: t(`contratto-${numero}.pdf`, `contract-${numero}.pdf`) } : r
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
            {irregolare ? <Etichetta testo={t('Irregolare', 'Irregular')} tono={regolarita?.tono ?? 'attenzione'} /> : null}
            {c.categoria !== 'principale' ? <Etichetta testo={c.categoria === 'junior' ? t('Corso per bambini', 'Kids’ course') : t('Abbonamento aggiuntivo', 'Add-on membership')} tono="neutro" /> : null}
            {rinnovoAutomatico ? <Etichetta testo={t('Rinnovo automatico attivo', 'Auto-renewal on')} tono="ok" /> : null}
          </View>
        ) : null}
        {irregolare && regolarita ? <DaSistemare regolarita={regolarita} onSezione={onSezione} /> : null}

        <View style={{ gap: 6 }}>
          <Riga nome={t('Sottoscritto il', 'Signed on')} valore={data(c.data_firma)} />
          <Riga nome={t('Inizio', 'Start')} valore={data(c.data_inizio)} />
          <Riga nome={t('Fine', 'End')} valore={c.data_fine ? data(c.data_fine) : t('Si rinnova ogni mese', 'Renews every month')} />
          {c.in_vigore && c.si_rinnova && c.data_fine ? <Riga nome={t('Si rinnova il', 'Renews on')} valore={data(giornoDopo(c.data_fine))} /> : null}
          {c.data_disdetta ? <Riga nome={t('Disdetto il', 'Canceled on')} valore={data(c.data_disdetta)} /> : null}
          {c.canone ? <Riga nome={t('Quota', 'Fee')} valore={euro(c.canone)} /> : null}
        </View>

        <View style={[stili.totali, { backgroundColor: p.incavo }]}>
          <View style={{ flex: 1 }}>
            <Text style={[stili.nome, { color: p.testoSecondario }]}>{t('Addebitato', 'Charged')}</Text>
            <Text style={[stili.totale, { color: p.testo }]}>{euro(c.totali.addebitato)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[stili.nome, { color: p.testoSecondario }]}>{t('Pagato', 'Paid')}</Text>
            <Text style={[stili.totale, { color: p.ok }]}>{euro(c.totali.pagato)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[stili.nome, { color: p.testoSecondario }]}>{t('Da pagare', 'Due')}</Text>
            <Text style={[stili.totale, { color: c.totali.da_pagare > 0 ? p.accento : p.testo }]}>{euro(c.totali.da_pagare)}</Text>
          </View>
        </View>

        {daPagare.length ? (
          <>
            <Tocco ruolo="button" etichetta={aperta ? t('Nascondi le quote da pagare', 'Hide due payments') : t('Mostra le quote da pagare', 'Show due payments')} onPress={() => setAperta((v) => !v)} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
              <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 14 }}>{aperta ? t('Nascondi il dettaglio', 'Hide details') : t(`Quote da pagare (${daPagare.length})  ›`, `Due payments (${daPagare.length})  ›`)}</Text>
            </Tocco>
            {aperta ? (
              <View style={{ gap: 8 }}>
                {daPagare.map((a, i) => (
                  <View key={i} style={stili.riga}>
                    <View style={{ flex: 1 }}>
                      <Text style={[stili.valore, { color: p.testo, textAlign: 'left' }]}>{nomeAddebito(a)}</Text>
                      <Text style={[stili.nome, { color: p.testoSecondario }]}>{t(`Scade il ${data(a.scadenza)}`, `Due on ${data(a.scadenza)}`)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[stili.valore, { color: p.testo }]}>{euro(a.da_pagare)}</Text>
                      <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 12 }}>{t('Da pagare', 'Due')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={[stili.nome, { color: p.testoSecondario }]}>{t('Niente da pagare su questo contratto.', 'Nothing to pay on this contract.')}</Text>
        )}

        {c.firmato?.pdf ? (
          <>
            <Pulsante testo={t('Il contratto firmato (PDF)', 'Signed contract (PDF)')} icona="documento" variante="contorno" piccolo onPress={scarica} inCorso={scarico} />
            {avviso}
          </>
        ) : null}
        {gestione?.gestibile && c.in_vigore ? <PulsanteGestisci contratto={gestione} onCambiato={onCambiato} /> : null}
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

  // «Gestisci abbonamento» (30/10/2026): cosa si puo' fare su ogni contratto lo dice la funzione. Se non risponde
  // (o non e' ancora pubblicata) l'elenco e' quello di sempre, senza comandi.
  const [gestione, setGestione] = useState<ContrattoGestione[]>([])
  const caricaGestione = useCallback(async () => {
    const r = await statoGestione()
    if (r.ok) setGestione(r.contratti)
  }, [])
  useEffect(() => {
    caricaGestione()
  }, [caricaGestione])
  // Dopo una sospensione o una disdetta le letture in memoria sono vecchie: si buttano e si rileggono.
  const cambiato = useCallback(async () => {
    scorda(CHIAVE_CONTRATTI)
    scorda('area')
    await Promise.all([carica(), caricaGestione()])
  }, [carica, caricaGestione])
  const inProva = gestione.filter((g) => g.guest_pass && g.stato !== 'Ended')

  const vigore = (elenco ?? []).filter((c) => c.in_vigore)
  const piuPersone = new Set(vigore.map((c) => c.member_id)).size > 1
  // La regolarita' viene dai dati della Home (l'area): il metodo e il debito sono li'.
  const regolarita = (c: ContrattoElenco): Regolarita | null => {
    const k = area.contratti.find((x) => x.contract_id === c.contract_id)
    return k ? regolaritaContratto(k, area.persone.find((x) => x.member_id === k.member_id)) : null
  }
  return (
    <View style={{ gap: spazio.quattro }}>
      <Pulsante testo={t('Scegli un abbonamento', 'Choose a membership')} icona="avanti" onPress={() => router.navigate('/abbonamento')} />
      {errore && !elenco ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
        </>
      ) : null}
      {!elenco && !errore ? <SchedeInArrivo quante={1} /> : null}
      {inProva.length ? (
        <Sezione titolo={t('In prova', 'On trial')} conteggio={inProva.length}>
          <View style={{ gap: spazio.tre }}>
            {inProva.map((g) => (
              <CartaProva key={g.contract_id} contratto={g} />
            ))}
          </View>
        </Sezione>
      ) : null}
      {elenco && !vigore.length && !inProva.length ? (
        <Carta piatta>
          <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>{t('Non troviamo abbonamenti in corso su questa scheda.', 'We can’t find any current memberships on this profile.')}</Text>
        </Carta>
      ) : null}
      {vigore.length ? (
        <Sezione titolo={t('In vigore', 'Active')} conteggio={vigore.length}>
          <View style={{ gap: spazio.tre }}>
            {vigore.map((c) => (
              <SchedaContratto key={c.contract_id} c={c} conPersona={piuPersone} regolarita={regolarita(c)} onSezione={onSezione} gestione={gestione.find((g) => g.contract_id === c.contract_id)} onCambiato={cambiato} />
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
