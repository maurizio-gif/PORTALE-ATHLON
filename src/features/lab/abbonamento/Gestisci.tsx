import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

import {
  annullaSospensione,
  anteprimaDisdetta,
  anteprimaSospensione,
  disdici,
  MOTIVI_DISDETTA,
  sospendi,
  type AnteprimaDisdetta,
  type AnteprimaSospensione,
  type ContrattoGestione,
  type Formula,
  type MeseSospendibile,
  type MetodoPagamento,
  pagaAnnuale,
  rangoAbbonamento,
  richiediUpgrade,
  type MotivoDisdetta,
  type OpzioneSospensione,
} from '@/api/gestioneAbbonamento'
import { statoAbbonamento, statoCambioAbbonamento, type PianoAbbonamento } from '@/api/abbonamento'
import { CampoData } from '@/components/CampoData'
import { euro } from '@/lib/eventi'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { useSessione } from '../useSessione'
import { vistaCorrente } from '../vista'
import { Richiamo } from '../profilo/Richiamo'
import { CampoTesto, Scelte } from '../ui/Campi'
import { SchedaScelta } from './Passi'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Etichetta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco, colpetto } from '../ui/Tocco'

// «Gestisci abbonamento» (30/10/2026, richiesta di Maurizio): dal dettaglio di un abbonamento a pagamento
// si sospende un mese e si disdice; sul Guest Pass c'e' solo «Attiva abbonamento». Tutto quello che e' un
// numero o una data lo calcola la funzione `portale-gestione-abbonamento` (termini, prezzi, rate rimaste,
// fine contratto, nuova scadenza): qui si mostra e si raccolgono le conferme. Ogni scrittura passa da una
// schermata di riepilogo con i consensi, e dopo la scrittura la schermata si aggiorna dalla risposta.
// Dentro la finestra del cambio (30-10 giorni prima della fine dell'impegno) il pulsante e' «Cambia abbonamento» (la procedura senza disdetta
// non c'e' ancora: il comando e' spento e lo dice); fuori e' «Upgrade», solo verso un abbonamento di valore piu' alto, e la richiesta va alla
// segreteria con il modulo del sito.

// ---------------------------------------------------------------------------

function dataLunga(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, g)))
}

function meseAnno(iso: string): string {
  const [a, m] = iso.slice(0, 10).split('-').map(Number)
  const s = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, 1)))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function giornoDopo(iso: string): string {
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, g + 1)).toISOString().slice(0, 10)
}

const FORMULA: Record<Formula, () => string> = {
  'annuale-unico': () => t('Annuale, soluzione unica', 'Annual, single payment'),
  'annuale-rate': () => t('Annuale, a rate', 'Annual, instalments'),
  mensile: () => t('Mensile', 'Monthly'),
  altro: () => '',
}

function etichettaPiano(c: ContrattoGestione): string {
  const f = c.formula === 'annuale-rate' && pagaAnnuale(c) ? t('Annuale, si paga ogni anno', 'Annual, paid every year') : FORMULA[c.formula]()
  return f ? `${c.piano} · ${f}` : c.piano
}

function metodoTesto(m: MetodoPagamento | null): string | null {
  if (!m) return null
  if (m.tipo === 'carta') return m.finale ? t(`Carta •••• ${m.finale}`, `Card •••• ${m.finale}`) : t('Carta', 'Card')
  if (m.tipo === 'conto') return m.finale ? t(`Conto •••• ${m.finale}`, `Account •••• ${m.finale}`) : t('Addebito su conto', 'Direct debit')
  return null
}

function Riga({ nome, valore, forte = false }: { nome: string; valore: string; forte?: boolean }) {
  const p = usePalette()
  return (
    <View style={stili.riga}>
      <Text style={[stili.nome, { color: p.testoSecondario }]}>{nome}</Text>
      <Text style={[stili.valore, { color: forte ? p.accento : p.testo }]}>{valore}</Text>
    </View>
  )
}

function Passo({ n, di }: { n: number; di: number }) {
  const p = usePalette()
  return <Text style={[stili.passo, { color: p.accento }]}>{t(`Passo ${n} di ${di}`, `Step ${n} of ${di}`).toUpperCase()}</Text>
}

function Titolo({ children }: { children: string }) {
  const p = usePalette()
  return <Text style={[stili.titolo, { color: p.testo }]}>{children}</Text>
}

function Nota({ children }: { children: string }) {
  const p = usePalette()
  return <Text style={[stili.nota, { color: p.testoSecondario }]}>{children}</Text>
}

/** Un consenso esplicito: il pulsante che lo richiede resta spento finche' non e' spuntato. */
function Consenso({ spuntato, onCambia, testo }: { spuntato: boolean; onCambia: () => void; testo: string }) {
  const p = usePalette()
  return (
    <Tocco onPress={onCambia} vibra="scelta" ruolo="checkbox" stato={{ checked: spuntato }} etichetta={testo} scala={0.99}>
      <View style={[stili.consenso, { backgroundColor: p.incavo }]}>
        <View style={[stili.casella, { borderColor: spuntato ? p.accento : p.testoTerzo, backgroundColor: spuntato ? p.accento : 'transparent' }]}>{spuntato ? <Icona nome="spunta" size={15} colore="#fff" /> : null}</View>
        <Text style={[stili.consensoTesto, { color: p.testo }]}>{testo}</Text>
      </View>
    </Tocco>
  )
}

// ---------------------------------------------------------------------------

type PassoFoglio = 'menu' | 's1' | 's2' | 's3' | 'sEsito' | 'd1' | 'd2' | 'd3' | 'dEsito' | 'u1' | 'uEsito' | 'c1' | 'cEsito'

/**
 * Il foglio di un abbonamento: il riepilogo con le azioni, e i due percorsi (sospendere, disdire) a passi.
 * `onCambiato` si chiama dopo una scrittura riuscita: chi lo usa rilegge l'elenco.
 */
export function FoglioGestisci({ contratto: c, aperto, onChiudi, onCambiato }: { contratto: ContrattoGestione; aperto: boolean; onChiudi: () => void; onCambiato: () => void }) {
  const p = usePalette()
  const [passo, setPasso] = useState<PassoFoglio>('menu')
  const sessione = useSessione()
  const [sosp, setSosp] = useState<AnteprimaSospensione | null>(null)
  const [erroreSosp, setErroreSosp] = useState<string | null>(null)
  const [dis, setDis] = useState<AnteprimaDisdetta | null>(null)
  const [erroreDis, setErroreDis] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)

  // Sospensione
  const [mese, setMese] = useState<string | null>(null)
  const [opzione, setOpzione] = useState<number | null>(null)
  const [regole, setRegole] = useState(false)
  const [addebito, setAddebito] = useState(false)
  const [fatta, setFatta] = useState<{ dal: string; al: string; costo: number; scadenza: string | null; scadenzaLetta: boolean; ultimoAnnullo: string } | null>(null)
  const [annullata, setAnnullata] = useState<number | null | undefined>(undefined)

  // Disdetta
  const [motivo, setMotivo] = useState<MotivoDisdetta | null>(null)
  const [commento, setCommento] = useState('')
  const [capitoRate, setCapitoRate] = useState(false)
  const [capitoCondizioni, setCapitoCondizioni] = useState(false)
  const [disdetta, setDisdetta] = useState<{ fine: string | null } | null>(null)

  // Upgrade: solo verso un abbonamento di valore piu' alto; la richiesta va alla segreteria
  const [piani, setPiani] = useState<PianoAbbonamento[] | null>(null)
  const [errorePiani, setErrorePiani] = useState<string | null>(null)
  const [pianoScelto, setPianoScelto] = useState<number | null>(null)
  const [decorrenza, setDecorrenza] = useState('')
  const [noteUp, setNoteUp] = useState('')

  const caricaPiani = useCallback(async () => {
    setErrorePiani(null)
    setPiani(null)
    const r = await statoAbbonamento()
    if (r.ok) setPiani(r.stato.piani)
    else setErrorePiani(r.errore)
  }, [])

  const caricaSospensioni = useCallback(async () => {
    setErroreSosp(null)
    const r = await anteprimaSospensione(c.contract_id)
    if (r.ok) setSosp(r.dati)
    else setErroreSosp(r.errore)
    return r.ok
  }, [c.contract_id])

  const caricaDisdetta = useCallback(async () => {
    setErroreDis(null)
    setDis(null)
    const r = await anteprimaDisdetta(c.contract_id)
    if (r.ok) setDis(r.dati)
    else setErroreDis(r.errore)
  }, [c.contract_id])

  // All'apertura si riparte dal riepilogo: niente resta a meta' da una volta all'altra.
  useEffect(() => {
    if (!aperto) return
    setPasso('menu')
    setSosp(null)
    setDis(null)
    setErrore(null)
    setMese(null)
    setOpzione(null)
    setRegole(false)
    setAddebito(false)
    setFatta(null)
    setAnnullata(undefined)
    setMotivo(null)
    setCommento('')
    setCapitoRate(false)
    setCapitoCondizioni(false)
    setDisdetta(null)
    setPianoScelto(null)
    setDecorrenza('')
    setNoteUp('')
    if (c.azioni?.sospendi.disponibile) caricaSospensioni()
  }, [aperto, c.contract_id, c.azioni?.sospendi.disponibile, caricaSospensioni])

  function vai(prossimo: PassoFoglio) {
    setErrore(null)
    setPasso(prossimo)
  }

  const meseScelto: MeseSospendibile | undefined = sosp?.mesi.find((m) => m.primo === mese)
  const opzioneScelta: OpzioneSospensione | undefined = meseScelto?.opzioni.find((o) => o.freeze_type_id === opzione) ?? meseScelto?.opzioni[0]
  const costo = opzioneScelta?.costo ?? 0
  const metodo = metodoTesto(sosp?.metodo_pagamento ?? null)
  const disdetta0 = c.azioni?.disdici
  const finestra = c.azioni?.cambia.finestra
  const upgrade = c.azioni?.cambia.upgrade
  // Dentro la finestra il cambio avviene senza disdire; fuori c'e' solo l'upgrade.
  const inFinestra = finestra?.stato === 'aperta'

  function scegliMese(m: MeseSospendibile) {
    if (!m.richiedibile) return
    colpetto('scelta')
    setMese(m.primo)
    setOpzione(m.opzioni[0]?.freeze_type_id ?? null)
  }

  async function confermaSospensione() {
    if (!meseScelto || !opzioneScelta) return
    setInCorso(true)
    setErrore(null)
    const r = await sospendi(c.contract_id, meseScelto.primo, opzioneScelta.freeze_type_id, opzioneScelta.costo)
    setInCorso(false)
    if (r.ok) {
      colpetto('ok')
      setFatta({ ...r.dati, ultimoAnnullo: meseScelto.ultimo_giorno_richiesta })
      onCambiato()
      setPasso('sEsito')
      return
    }
    colpetto('errore')
    setErrore(r.errore)
    // Qualcosa e' cambiato nel frattempo (costo, disponibilita'): si rilegge e si torna alla scelta.
    if (r.cambiato) {
      setRegole(false)
      setAddebito(false)
      await caricaSospensioni()
      setMese(null)
      setPasso('s1')
    }
  }

  async function annulla(freezeId: number) {
    setInCorso(true)
    setErrore(null)
    const r = await annullaSospensione(c.contract_id, freezeId)
    if (r.ok) {
      colpetto('ok')
      setAnnullata(r.dati.credito)
      onCambiato()
      await caricaSospensioni()
    } else {
      colpetto('errore')
      setErrore(r.errore)
    }
    setInCorso(false)
  }

  async function confermaDisdetta() {
    if (!dis || !motivo) return
    setInCorso(true)
    setErrore(null)
    const r = await disdici(c.contract_id, dis.impronta, motivo, commento.trim())
    setInCorso(false)
    if (r.ok) {
      colpetto('ok')
      setDisdetta({ fine: r.dati.fine })
      onCambiato()
      setPasso('dEsito')
      return
    }
    colpetto('errore')
    setErrore(r.errore)
    // Il riepilogo non e' piu' quello: si rilegge e si torna al primo passo.
    if (r.cambiato || r.oltreTermine || r.giaDisdetto) {
      setCapitoRate(false)
      setCapitoCondizioni(false)
      await caricaDisdetta()
      setPasso('d1')
    }
  }

  // --- Riepilogo --------------------------------------------------------

  const programmate = sosp?.future ?? []

  const riepilogo = (
    <>
      <Carta piatta>
        <View style={{ gap: spazio.tre }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due }}>
            <View style={{ flex: 1, gap: 2 }}>
              {c.persona ? <Text style={[stili.nome, { color: p.testoSecondario }]}>{c.persona}</Text> : null}
              <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 }}>{etichettaPiano(c)}</Text>
            </View>
            <Etichetta testo={c.stato === 'Freezed' ? t('Sospeso', 'Frozen') : t('Attivo', 'Active')} tono={c.stato === 'Freezed' ? 'attenzione' : 'ok'} />
          </View>
          <View style={{ gap: 6 }}>
            {c.canone ? <Riga nome={t('Quota', 'Fee')} valore={c.formula === 'annuale-unico' ? euro(c.canone) : pagaAnnuale(c) ? t(`${euro(c.canone)} all’anno`, `${euro(c.canone)} per year`) : t(`${euro(c.canone)} al mese`, `${euro(c.canone)} per month`)} /> : null}
            {c.data_fine ? <Riga nome={t('Scade il', 'Ends on')} valore={dataLunga(c.data_fine)} /> : null}
            {!c.data_fine && pagaAnnuale(c) && c.prossimo_addebito ? <Riga nome={t('Prossimo addebito', 'Next charge')} valore={dataLunga(c.prossimo_addebito)} /> : null}
            <Riga nome={t('Rinnovo', 'Renewal')} valore={c.si_rinnova ? (c.data_fine ? t('Automatico', 'Automatic') : pagaAnnuale(c) ? t('Ogni anno, salvo disdetta', 'Every year unless cancelled') : t('Ogni mese, salvo disdetta', 'Every month unless cancelled')) : t('Disattivato', 'Off')} />
            {metodo ? <Riga nome={t('Pagamento', 'Payment')} valore={metodo} /> : null}
          </View>
        </View>
      </Carta>

      {programmate.map((f) => (
        <Messaggio key={f.freeze_id} tono="attenzione" icona="orologio" titolo={t('Sospensione programmata', 'Scheduled suspension')}>
          <View style={{ gap: spazio.due }}>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Dal ${dataLunga(f.dal)} al ${dataLunga(f.al)}.`, `From ${dataLunga(f.dal)} to ${dataLunga(f.al)}.`)}</Text>
            {f.annullabile ? (
              <>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Puoi annullarla fino alle 23:59 del ${dataLunga(f.ultimo_giorno_annullo)}.`, `You can cancel it until 11:59 pm on ${dataLunga(f.ultimo_giorno_annullo)}.`)}</Text>
                {f.credito ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Se la annulli, i ${euro(f.credito)} restano come credito sul tuo contratto: vengono applicati in automatico, non sono rimborsati.`, `If you cancel it, the ${euro(f.credito)} stays as credit on your contract: it’s applied automatically and isn’t refunded.`)}</Text> : null}
                <Pulsante testo={t('Annulla la sospensione', 'Cancel the suspension')} variante="contorno" piccolo pieno={false} onPress={() => annulla(f.freeze_id)} inCorso={inCorso} />
              </>
            ) : null}
          </View>
        </Messaggio>
      ))}
      {annullata !== undefined ? (
        <Messaggio tono="ok" titolo={t('Sospensione annullata', 'Suspension cancelled')}>
          {annullata ? t(`I ${euro(annullata)} restano come credito sul tuo contratto, applicato in automatico.`, `The ${euro(annullata)} stays as credit on your contract, applied automatically.`) : t('Non c’era niente da addebitare.', 'There was nothing to charge.')}
        </Messaggio>
      ) : null}
      {erroreSosp && c.azioni?.sospendi.disponibile ? <Messaggio tono="attenzione">{erroreSosp}</Messaggio> : null}
      {errore ? <Messaggio>{errore}</Messaggio> : null}

      <View style={{ flexDirection: 'row', gap: spazio.due }}>
        <Pulsante testo={t('Sospendi', 'Suspend')} icona="orologio" variante="secondario" disabilitato={!c.azioni?.sospendi.disponibile || (!sosp && !erroreSosp)} onPress={() => vai('s1')} />
        {inFinestra ? (
          <Pulsante testo={t('Cambia abbonamento', 'Change membership')} icona="rinnovo" onPress={apriCambio} inCorso={inCorso} />
        ) : (
          <Pulsante testo={t('Upgrade', 'Upgrade')} icona="rinnovo" disabilitato={!upgrade?.possibile} onPress={() => { caricaPiani(); vai('u1') }} />
        )}
      </View>
      {inFinestra && finestra?.stato === 'aperta' ? (
        <Nota>{t(`Puoi cambiare abbonamento senza disdire fino alle 23:59 del ${dataLunga(finestra.ultimo_giorno)}: il nuovo parte il ${dataLunga(finestra.nuovo_inizio)}.`, `You can change membership without cancelling until 11:59 pm on ${dataLunga(finestra.ultimo_giorno)}: the new one starts on ${dataLunga(finestra.nuovo_inizio)}.`)}</Nota>
      ) : !inFinestra && upgrade && !upgrade.possibile ? (
        <Nota>{t('Hai già l’abbonamento di valore più alto: non c’è un upgrade possibile.', 'You already have the highest-value membership: there’s no upgrade available.')}</Nota>
      ) : null}

      {disdetta0?.modo === 'gia_disdetto' ? (
        <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>{t(`Disdetto: finisce il ${dataLunga(disdetta0.fine)}.`, `Cancelled: ends on ${dataLunga(disdetta0.fine)}.`)}</Text>
      ) : (
        <Tocco
          etichetta={t('Disdici abbonamento', 'Cancel membership')}
          onPress={() => {
            caricaDisdetta()
            vai('d1')
          }}
          style={{ alignSelf: 'center', paddingVertical: spazio.due }}
        >
          <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 14, textDecorationLine: 'underline' }}>{t('Disdici abbonamento', 'Cancel membership')}</Text>
        </Tocco>
      )}
    </>
  )

  // --- Sospensione ------------------------------------------------------

  function motivoNo(m: MeseSospendibile): string {
    if (m.richiedibile) return t(`Puoi chiederlo fino alle 23:59 del ${dataLunga(m.ultimo_giorno_richiesta)}`, `You can ask until 11:59 pm on ${dataLunga(m.ultimo_giorno_richiesta)}`)
    if (m.motivo_no === 'troppo_tardi') return t(`Non più disponibile: serviva la richiesta entro le 23:59 del ${dataLunga(m.ultimo_giorno_richiesta)}`, `No longer available: the request was due by 11:59 pm on ${dataLunga(m.ultimo_giorno_richiesta)}`)
    if (m.motivo_no === 'gia_sospeso') return t('C’è già una sospensione in questo mese', 'There’s already a suspension this month')
    if (m.motivo_no === 'oltre_la_fine') return t('Dopo la fine dell’abbonamento', 'After the membership ends')
    return t('Nessuna sospensione disponibile per questo mese', 'No suspension available for this month')
  }

  const passo1Sospensione = (
    <>
      <Passo n={1} di={3} />
      <Titolo>{t('Quale mese vuoi sospendere?', 'Which month do you want to suspend?')}</Titolo>
      <Nota>{t('Si sospende un mese intero, dal 1° all’ultimo giorno.', 'You suspend a whole month, from the 1st to the last day.')}</Nota>
      {!sosp && !erroreSosp ? <Nota>{t('Un attimo…', 'One moment…')}</Nota> : null}
      {erroreSosp ? <Messaggio>{erroreSosp}</Messaggio> : null}
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {(sosp?.mesi ?? []).map((m) => {
        const scelto = mese === m.primo
        return (
          <View key={m.primo} style={{ gap: spazio.due }}>
            <Tocco
              onPress={() => scegliMese(m)}
              spento={!m.richiedibile}
              vibra={null}
              ruolo="radio"
              stato={{ selected: scelto, disabled: !m.richiedibile }}
              etichetta={`${meseAnno(m.primo)}. ${motivoNo(m)}`}
              scala={0.99}
            >
              <View style={[stili.mese, { backgroundColor: p.carta, borderColor: scelto ? p.accento : p.linea, borderWidth: scelto ? 2 : 1, opacity: m.richiedibile ? 1 : 0.55 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 16 }}>{meseAnno(m.primo)}</Text>
                  <Text style={[stili.nota, { color: m.richiedibile ? p.testoSecondario : p.testoTerzo }]}>{motivoNo(m)}</Text>
                </View>
                {scelto ? <Icona nome="ok" size={22} colore={p.accento} /> : null}
              </View>
            </Tocco>
            {scelto && m.opzioni.length > 1 ? (
              <View style={{ gap: spazio.due, paddingLeft: spazio.due }}>
                <Nota>{t('Che tipo di sospensione?', 'Which type of suspension?')}</Nota>
                <Scelte
                  valori={m.opzioni.map((o) => ({
                    valore: o.freeze_type_id,
                    testo: o.gratuita ? (o.rimaste_anno != null ? t(`Gratuita (${o.rimaste_anno} rimasta quest’anno)`, `Free (${o.rimaste_anno} left this year)`) : t('Gratuita', 'Free')) : t(`A pagamento · ${euro(o.costo)}`, `Paid · ${euro(o.costo)}`),
                  }))}
                  scelto={opzioneScelta?.freeze_type_id ?? null}
                  onScegli={setOpzione}
                />
              </View>
            ) : null}
          </View>
        )
      })}
      <Pulsante testo={t('Continua', 'Continue')} icona="avanti" disabilitato={!meseScelto || !opzioneScelta} onPress={() => vai('s2')} />
    </>
  )

  const passo2Sospensione =
    meseScelto && opzioneScelta ? (
      <>
        <Passo n={2} di={3} />
        <Titolo>{t('Cosa cambia con la sospensione', 'What changes with the suspension')}</Titolo>
        <Carta piatta>
          <View style={{ gap: 8 }}>
            <Riga nome={t('Sospeso dal', 'Suspended from')} valore={dataLunga(meseScelto.primo)} />
            <Riga nome={t('Fino al', 'Until')} valore={dataLunga(meseScelto.ultimo)} />
            <Riga nome={t('Costo della sospensione', 'Cost of the suspension')} valore={opzioneScelta.gratuita ? t('Gratuita', 'Free') : euro(opzioneScelta.costo)} forte={!opzioneScelta.gratuita} />
            {meseScelto.scadenza_stimata ? <Riga nome={t('Nuova scadenza (stima)', 'New end date (estimate)')} valore={dataLunga(meseScelto.scadenza_stimata)} /> : null}
          </View>
        </Carta>
        <Messaggio tono="attenzione" icona="info">
          {t(
            'La sospensione sposta in avanti la scadenza del contratto di un mese intero. Nel mese sospeso non puoi accedere al club né prenotare. La scadenza definitiva la conferma il gestionale quando la sospensione è registrata.',
            'The suspension moves the contract end date forward by a whole month. During the suspended month you can’t enter the club or book. The final end date is confirmed once the suspension is recorded.',
          )}
        </Messaggio>
        <Pulsante testo={t('Continua', 'Continue')} icona="avanti" onPress={() => vai('s3')} />
        <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo onPress={() => vai('s1')} />
      </>
    ) : null

  const passo3Sospensione =
    meseScelto && opzioneScelta ? (
      <>
        <Passo n={3} di={3} />
        <Titolo>{t('Conferma la sospensione', 'Confirm the suspension')}</Titolo>
        <Carta piatta>
          <View style={{ gap: 4 }}>
            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 20 }}>{meseAnno(meseScelto.primo)}</Text>
            <Text style={{ color: opzioneScelta.gratuita ? p.ok : p.accento, fontFamily: F.extra, fontSize: 26, letterSpacing: -0.6 }}>{opzioneScelta.gratuita ? t('Gratuita', 'Free') : euro(opzioneScelta.costo)}</Text>
            {!opzioneScelta.gratuita ? (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{metodo ? t(`Addebitati sul metodo di pagamento del contratto: ${metodo}`, `Charged to the contract’s payment method: ${metodo}`) : t('Addebitati sul metodo di pagamento del contratto.', 'Charged to the contract’s payment method.')}</Text>
            ) : null}
          </View>
        </Carta>
        <Consenso spuntato={regole} onCambia={() => setRegole((v) => !v)} testo={t('Ho letto le regole della sospensione e le accetto.', 'I’ve read the suspension rules and accept them.')} />
        {!opzioneScelta.gratuita ? <Consenso spuntato={addebito} onCambia={() => setAddebito((v) => !v)} testo={t(`Autorizzo l’addebito di ${euro(costo)}.`, `I authorise the charge of ${euro(costo)}.`)} /> : null}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Pulsante testo={t('Conferma e sospendi', 'Confirm and suspend')} icona="spunta" disabilitato={!regole || (!opzioneScelta.gratuita && !addebito)} inCorso={inCorso} onPress={confermaSospensione} />
        <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo onPress={() => vai('s2')} />
      </>
    ) : null

  const esitoSospensione = fatta ? (
    <>
      <Messaggio tono="ok" titolo={t('Sospensione programmata', 'Suspension scheduled')}>
        {t(`Dal ${dataLunga(fatta.dal)} al ${dataLunga(fatta.al)}.`, `From ${dataLunga(fatta.dal)} to ${dataLunga(fatta.al)}.`)}
      </Messaggio>
      <Carta piatta>
        <View style={{ gap: 8 }}>
          {fatta.scadenza ? <Riga nome={fatta.scadenzaLetta ? t('Nuova scadenza', 'New end date') : t('Nuova scadenza (stima)', 'New end date (estimate)')} valore={dataLunga(fatta.scadenza)} /> : null}
          <Riga nome={t('Puoi annullarla fino alle', 'You can cancel it until')} valore={t(`23:59 del ${dataLunga(fatta.ultimoAnnullo)}`, `11:59 pm on ${dataLunga(fatta.ultimoAnnullo)}`)} />
        </View>
      </Carta>
      {fatta.costo > 0 ? (
        <Messaggio tono="attenzione" icona="info">
          {t(`Se la annulli, i ${euro(fatta.costo)} restano come credito sul tuo contratto: vengono applicati in automatico, non sono rimborsati.`, `If you cancel it, the ${euro(fatta.costo)} stays as credit on your contract: it’s applied automatically and isn’t refunded.`)}
        </Messaggio>
      ) : null}
      <Pulsante testo={t('Torna agli abbonamenti', 'Back to memberships')} variante="secondario" onPress={onChiudi} />
    </>
  ) : null

  // --- Disdetta ---------------------------------------------------------

  const attesaDisdetta = !dis && !erroreDis

  const passo1Disdetta = (
    <>
      <Passo n={1} di={3} />
      <Titolo>{t('Cosa succede se disdici', 'What happens if you cancel')}</Titolo>
      {attesaDisdetta ? <Nota>{t('Un attimo…', 'One moment…')}</Nota> : null}
      {erroreDis ? <Messaggio>{erroreDis}</Messaggio> : null}
      {errore ? <Messaggio tono="attenzione">{errore}</Messaggio> : null}
      {dis && dis.modo === 'gia_disdetto' ? <Messaggio tono="attenzione">{t(`Questo abbonamento è già disdetto: finisce il ${dataLunga(dis.fine)}.`, `This membership is already cancelled: it ends on ${dataLunga(dis.fine)}.`)}</Messaggio> : null}
      {dis && dis.modo === 'oltre_termine' ? (
        <Messaggio tono="attenzione" titolo={t('Il termine è passato', 'The deadline has passed')}>
          {t(`Il termine per disdire era il ${dataLunga(dis.ultimo_giorno)}. Per questo abbonamento scrivi a disdetta@athlonroma.it: la segreteria ti dice come procedere.`, `The deadline to cancel was ${dataLunga(dis.ultimo_giorno)}. For this membership write to disdetta@athlonroma.it and the front desk will tell you how to proceed.`)}
        </Messaggio>
      ) : null}
      {dis && inFinestra && finestra && finestra.stato === 'aperta' && (dis.modo === 'rinnovo' || dis.modo === 'mensile' || dis.modo === 'annuale') ? (
        <Messaggio tono="ok" icona="rinnovo" titolo={t('Vuoi cambiare abbonamento invece di disdire?', 'Want to change membership instead of cancelling?')}>
          <View style={{ gap: spazio.due }}>
            <Text style={[stili.nota, { color: p.testo }]}>{t(`Stai per disdire ${etichettaPiano(c)}. Invece puoi passare a un altro abbonamento, Smart o Premium o uno degli altri in vigore, scegliendo quello che preferisci: così dai continuità ai tuoi allenamenti, senza disdetta e senza nessun buco.`, `You’re about to cancel ${etichettaPiano(c)}. Instead you can move to another membership, Smart or Premium or any other currently on sale, whichever you prefer: this keeps your training going, with no cancellation and no gap.`)}</Text>
            <Text style={[stili.nota, { color: p.testo }]}>{t(`Il tuo abbonamento attuale finisce il ${dataLunga(finestra.fine)} e il nuovo parte il ${dataLunga(finestra.nuovo_inizio)}. La quota di attivazione è in omaggio.`, `Your current membership ends on ${dataLunga(finestra.fine)} and the new one starts on ${dataLunga(finestra.nuovo_inizio)}. The joining fee is waived.`)}</Text>
            <Pulsante testo={t('Cambia abbonamento', 'Change membership')} icona="rinnovo" piccolo onPress={apriCambio} inCorso={inCorso} />
          </View>
        </Messaggio>
      ) : null}
      {dis && (dis.modo === 'rinnovo' || dis.modo === 'mensile' || dis.modo === 'annuale') ? (
        <>
          <View style={{ gap: spazio.tre }}>
            <View style={stili.tappa}>
              <Text style={[stili.tappaQuando, { color: p.accento }]}>{t('Oggi', 'Today')}</Text>
              <Text style={[stili.tappaTesto, { color: p.testo }]}>{t('Chiedi la disdetta', 'You request the cancellation')}</Text>
            </View>
            <View style={stili.tappa}>
              <Text style={[stili.tappaQuando, { color: p.testoSecondario }]}>{t('Fino alla scadenza', 'Until the end date')}</Text>
              <Text style={[stili.tappaTesto, { color: p.testo }]}>{dis.modo === 'rinnovo' ? t('L’abbonamento resta attivo, puoi usarlo e le rate restano dovute', 'The membership stays active, you can use it and the instalments remain due') : dis.modo === 'annuale' ? t('L’abbonamento resta attivo e puoi usarlo fino al giorno prima del prossimo addebito', 'The membership stays active and you can use it until the day before the next charge') : t('L’abbonamento resta attivo e puoi usarlo fino a fine mese', 'The membership stays active and you can use it until the end of the month')}</Text>
            </View>
            <View style={stili.tappa}>
              <Text style={[stili.tappaQuando, { color: p.testo }]}>{`${dataLunga(dis.fine)}*`}</Text>
              <Text style={[stili.tappaTesto, { color: p.testo }]}>{t('Fine dell’abbonamento, senza rinnovo', 'End of the membership, no renewal')}</Text>
            </View>
          </View>
          <Nota>{t('* Se dopo la disdetta inserisci delle sospensioni, anche questa data si sposta di conseguenza.', '* If you add suspensions after cancelling, this date moves accordingly.')}</Nota>
          <Carta piatta>
            <View style={{ gap: 8 }}>
              {dis.rate.quante > 0 ? <Riga nome={t('Rate ancora dovute', 'Instalments still due')} valore={String(dis.rate.quante)} /> : null}
              {dis.rate.quante > 0 ? <Riga nome={t('Totale', 'Total')} valore={euro(dis.rate.totale)} /> : null}
              {dis.ultimo_giorno ? <Riga nome={t('Ultimo giorno per disdire', 'Last day to cancel')} valore={t(`23:59 del ${dataLunga(dis.ultimo_giorno)}`, `11:59 pm on ${dataLunga(dis.ultimo_giorno)}`)} /> : null}
            </View>
          </Carta>
          <Messaggio tono="attenzione" icona="attenzione">
            {t(
              `Perdi le condizioni attuali dell’abbonamento${dis.canone ? `, compreso il prezzo di ${euro(dis.canone)}${c.formula === 'annuale-unico' ? '' : dis.modo === 'annuale' ? ' all’anno' : ' al mese'}` : ''}. Se in futuro ti iscrivi di nuovo si applica il listino di quel momento e si paga di nuovo la quota di iscrizione.`,
              `You lose the membership’s current terms${dis.canone ? `, including the price of ${euro(dis.canone)}${c.formula === 'annuale-unico' ? '' : dis.modo === 'annuale' ? ' per year' : ' per month'}` : ''}. If you sign up again later, the price list of that moment applies and you pay the joining fee again.`,
            )}
          </Messaggio>
          {c.azioni?.sospendi.disponibile ? (
            <View style={{ gap: spazio.due }}>
              <Nota>{t('Prima di andare', 'Before you go')}</Nota>
              <Pulsante testo={t('Sospendi un mese', 'Suspend a month')} icona="orologio" variante="secondario" piccolo onPress={() => vai('s1')} />
            </View>
          ) : null}
          <Pulsante testo={t('Continua con la disdetta', 'Continue with the cancellation')} icona="avanti" variante="secondario" onPress={() => vai('d2')} />
        </>
      ) : null}
      <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo onPress={() => vai('menu')} />
    </>
  )

  const MOTIVI: Record<MotivoDisdetta, string> = {
    tempo: t('Non ho tempo', 'I don’t have time'),
    trasferimento: t('Mi trasferisco', 'I’m moving'),
    non_uso: t('Non ho più motivazione', 'I’ve lost motivation'),
    altra_struttura: t('Passo a un altro club o sport', 'I’m switching to another club or sport'),
    salute: t('Problemi di salute', 'Health issues'),
    costo: t('Difficoltà economica', 'Financial difficulty'),
    attivita: t('Poche attività che mi interessano', 'Not enough activities I like'),
    altro: t('Altro', 'Other'),
  }

  const passo2Disdetta = (
    <>
      <Passo n={2} di={3} />
      <Titolo>{t('Ci dici perché?', 'Can you tell us why?')}</Titolo>
      <Nota>{t('Scegli il motivo principale: ci aiuta a migliorare.', 'Choose the main reason: it helps us improve.')}</Nota>
      <Scelte valori={MOTIVI_DISDETTA.map((m) => ({ valore: m, testo: MOTIVI[m] }))} scelto={motivo} onScegli={(m) => setMotivo(m)} />
      <CampoTesto etichetta={t('Vuoi aggiungere qualcosa?', 'Want to add anything?')} value={commento} onChangeText={setCommento} maxLength={300} multiline placeholder={t('Scrivi qui (facoltativo)', 'Write here (optional)')} />
      <Nota>{t('Non scrivere dati sulla salute.', 'Please don’t write health information.')}</Nota>
      <Pulsante testo={t('Continua', 'Continue')} icona="avanti" disabilitato={!motivo} onPress={() => vai('d3')} />
    </>
  )

  const passo3Disdetta = dis ? (
    <>
      <Passo n={3} di={3} />
      <Titolo>{t('Conferma la disdetta', 'Confirm the cancellation')}</Titolo>
      <Carta piatta>
        <View style={{ gap: 8 }}>
          <Riga nome={t('Abbonamento', 'Membership')} valore={etichettaPiano(c)} />
          <Riga nome={t('Finisce il', 'Ends on')} valore={`${dataLunga(dis.fine)}*`} />
          <Riga nome={t('Rinnovo automatico', 'Auto-renewal')} valore={t('Disattivato', 'Off')} />
        </View>
      </Carta>
      <Nota>{t('* Se dopo la disdetta inserisci delle sospensioni, anche questa data si sposta di conseguenza.', '* If you add suspensions after cancelling, this date moves accordingly.')}</Nota>
      <Messaggio tono="attenzione" icona="attenzione">
        {t(`Dopo il ${dataLunga(dis.fine)} non potrai più accedere al club né prenotare.`, `After ${dataLunga(dis.fine)} you won’t be able to enter the club or book.`)}
      </Messaggio>
      {dis.rate.quante > 0 ? (
        <Consenso spuntato={capitoRate} onCambia={() => setCapitoRate((v) => !v)} testo={t(`Ho capito che le ${dis.rate.quante} rate rimanenti restano dovute fino alla scadenza.`, `I understand that the ${dis.rate.quante} remaining instalments stay due until the end date.`)} />
      ) : null}
      <Consenso
        spuntato={capitoCondizioni}
        onCambia={() => setCapitoCondizioni((v) => !v)}
        testo={t(
          `Ho capito che perdo le condizioni attuali dell’abbonamento${dis.canone ? `, compreso il prezzo di ${euro(dis.canone)}` : ''}, e che, se mi iscrivo di nuovo, si applica il listino di quel momento con una nuova quota di iscrizione.`,
          `I understand that I lose the membership’s current terms${dis.canone ? `, including the price of ${euro(dis.canone)}` : ''}, and that, if I sign up again, the price list of that moment applies with a new joining fee.`,
        )}
      />
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo={t('Conferma la disdetta', 'Confirm the cancellation')} variante="pericolo" disabilitato={!capitoCondizioni || (dis.rate.quante > 0 && !capitoRate)} inCorso={inCorso} onPress={confermaDisdetta} />
      <Pulsante testo={t('Annulla', 'Cancel')} variante="fantasma" piccolo onPress={() => vai('menu')} />
    </>
  ) : null

  const esitoDisdetta = (
    <>
      <Messaggio tono="ok" titolo={t('Disdetta registrata', 'Cancellation recorded')}>
        {t(`Il tuo abbonamento finisce il ${dataLunga(disdetta?.fine)}*.`, `Your membership ends on ${dataLunga(disdetta?.fine)}*.`)}
      </Messaggio>
      <Nota>{t('* Se dopo la disdetta inserisci delle sospensioni, anche questa data si sposta di conseguenza.', '* If you add suspensions after cancelling, this date moves accordingly.')}</Nota>
      <Carta piatta>
        <View style={{ gap: 8 }}>
          <Riga nome={etichettaPiano(c)} valore={t('Disdetto', 'Cancelled')} />
          <Riga nome={t('Finisce il', 'Ends on')} valore={`${dataLunga(disdetta?.fine)}*`} />
        </View>
      </Carta>
      <Pulsante testo={t('Torna agli abbonamenti', 'Back to memberships')} variante="secondario" onPress={onChiudi} />
    </>
  )


  // --- Upgrade ------------------------------------------------------------

  const oggiRoma = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
  const rangoAttuale = rangoAbbonamento(c.piano, c.formula === 'annuale-unico')
  // Solo verso l'alto, e mai verso un Flex (il Flex si sceglie con il cambio, senza disdetta, nella finestra).
  // Da un annuale che si paga in un'unica soluzione (anche i vecchi annuali pagati ogni anno) non si passa a un rateizzato, ma solo a un altro
  // in soluzione unica di valore piu' alto (30/10/2026, Maurizio). Un vecchio abbonamento fuori dalla gerarchia sale solo a un annuale che costa di piu' all'anno.
  const costoAnno = (importo: number, periodo: string) => importo * (/anno|year/i.test(periodo) ? 1 : 12)
  const eUnico = c.formula === 'annuale-unico' || pagaAnnuale(c)
  const costoAttuale = c.canone ? costoAnno(c.canone, pagaAnnuale(c) || c.formula === 'annuale-unico' ? 'anno' : 'mese') : 0
  const destinazioni = (piani ?? [])
    .filter((x) => {
      if (x.formula === 'flex') return false
      if (rangoAbbonamento(x.abbonamento, x.formula === 'annuale-unico') <= rangoAttuale) return false
      if (eUnico && x.formula !== 'annuale-unico') return false
      if (rangoAttuale === 0 && costoAnno(x.importo, x.periodo) <= costoAttuale) return false
      return true
    })
    .sort((a, b) => rangoAbbonamento(b.abbonamento, b.formula === 'annuale-unico') - rangoAbbonamento(a.abbonamento, a.formula === 'annuale-unico'))
  const pianoUp = destinazioni.find((x) => x.piano_id === pianoScelto)
  const prezzoPiano = (x: PianoAbbonamento) => (/anno|year/i.test(x.periodo) ? t(`${euro(x.importo)} all’anno`, `${euro(x.importo)} a year`) : t(`${euro(x.importo)} al mese`, `${euro(x.importo)} a month`))
  const testoPiano = (x: PianoAbbonamento) => `${x.etichetta} · ${prezzoPiano(x)}`

  async function inviaUpgrade() {
    const email = sessione?.user?.email
    if (!pianoUp || !decorrenza || !email) return
    setInCorso(true)
    setErrore(null)
    const r = await richiediUpgrade({
      email,
      abbonamento: testoPiano(pianoUp),
      decorrenza,
      note: [c.persona ? `${t('Per', 'For')}: ${c.persona}` : '', `${t('Contratto', 'Contract')} ${c.contract_id} (${etichettaPiano(c)})`, t('Richiesta dall’app (Gestisci abbonamento).', 'Requested from the app (Manage membership).'), noteUp.trim()].filter(Boolean).join('\n'),
    })
    setInCorso(false)
    if (r.ok) {
      colpetto('ok')
      setPasso('uEsito')
      return
    }
    colpetto('errore')
    setErrore(r.errore)
  }

  const passoUpgrade = (
    <>
      <Titolo>{t('Upgrade dell’abbonamento', 'Upgrade your membership')}</Titolo>
      <Messaggio tono="ok" icona="info" titolo={t('Come funziona', 'How it works')}>
        {t('Con l’upgrade passi a un abbonamento di valore più alto. La segreteria calcola il credito residuo del tuo abbonamento attuale e lo scala dal nuovo: te lo scrive per email, e solo dopo la tua conferma chiude il vecchio contratto.', 'With an upgrade you move to a higher-value membership. The front desk works out the remaining credit on your current membership and deducts it from the new one: they email you the figure, and only after your confirmation do they close the old contract.')}
      </Messaggio>
      {errorePiani ? <Messaggio tono="attenzione">{errorePiani}</Messaggio> : null}
      {!piani && !errorePiani ? <Nota>{t('Un attimo…', 'One moment…')}</Nota> : null}
      {errorePiani ? <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" piccolo onPress={caricaPiani} /> : null}
      {piani && !destinazioni.length ? <Messaggio tono="attenzione">{t('Non ci sono abbonamenti di valore più alto a cui passare.', 'There are no higher-value memberships to move to.')}</Messaggio> : null}
      {destinazioni.length ? (
        <>
          <Titolo>{t('A quale abbonamento vuoi passare?', 'Which membership do you want to move to?')}</Titolo>
          <View style={{ gap: spazio.due }} accessibilityRole="radiogroup">
            {destinazioni.map((x) => (
              <SchedaScelta key={x.piano_id} attiva={pianoScelto === x.piano_id} etichetta={testoPiano(x)} titolo={x.etichetta} sotto={prezzoPiano(x)} onPress={() => setPianoScelto(x.piano_id)} />
            ))}
          </View>
          <View style={{ gap: spazio.due }}>
            <CampoData etichetta={t('Da quando vuoi far partire il nuovo abbonamento?', 'When should the new membership start?')} value={decorrenza} onChange={setDecorrenza} min={oggiRoma} max={`${Number(oggiRoma.slice(0, 4)) + 1}${oggiRoma.slice(4)}`} annoIniziale={Number(oggiRoma.slice(0, 4))} />
          </View>
          <View style={{ gap: spazio.due }}>
            <CampoTesto etichetta={t('Vuoi aggiungere qualcosa?', 'Want to add anything?')} value={noteUp} onChangeText={setNoteUp} maxLength={500} multiline placeholder={t('Scrivi qui (facoltativo)', 'Write here (optional)')} />
          </View>
          {vistaCorrente() ? <Messaggio tono="attenzione">{t('Sei in vista cliente: la richiesta non si può inviare.', 'You’re in client view: the request can’t be sent.')}</Messaggio> : null}
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Invia la richiesta', 'Send the request')} icona="avanti" disabilitato={!pianoUp || !decorrenza || !sessione?.user?.email || Boolean(vistaCorrente())} inCorso={inCorso} onPress={inviaUpgrade} />
        </>
      ) : null}
      <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo onPress={() => vai('menu')} />
    </>
  )

  const esitoUpgrade = (
    <>
      <Messaggio tono="ok" titolo={t('Richiesta inviata', 'Request sent')}>
        {t('La segreteria ti scrive per email con il conteggio del credito residuo e le istruzioni per proseguire. Non cambia niente finché non confermi per email.', 'The front desk will email you the remaining-credit figure and the next steps. Nothing changes until you confirm by email.')}
      </Messaggio>
      <Pulsante testo={t('Torna agli abbonamenti', 'Back to memberships')} variante="secondario" onPress={onChiudi} />
    </>
  )


  // --- Cambio senza disdetta (nella finestra) ------------------------------
  // Finche' la procedura che crea il nuovo contratto non c'e', il cambio arriva alla segreteria con lo stesso modulo dell'upgrade: la data di
  // partenza e' fissa (il giorno dopo la fine del vecchio) e la quota di attivazione e' in omaggio.

  // Se il server consente il cambio per questo contratto si apre la procedura vera (data fissa, firma, il vecchio si chiude da solo);
  // altrimenti resta la richiesta alla segreteria.
  async function apriCambio() {
    setInCorso(true)
    const r = await statoCambioAbbonamento(c.contract_id)
    setInCorso(false)
    if (r.ok) {
      onChiudi()
      router.push({ pathname: '/abbonamento', params: { cambio: String(c.contract_id) } })
      return
    }
    setPianoScelto(null)
    setNoteUp('')
    caricaPiani()
    vai('c1')
  }

  // Non si propone l'abbonamento che si ha gia': stesso livello (Premium o Smart) e stessa formula. Il Flex del contratto e' «mensile», quello del listino «flex».
  const livello = (nome: string) => (/premium/i.test(nome) ? 'premium' : /smart/i.test(nome) ? 'smart' : null)
  const formulaListino: Record<string, string> = { mensile: 'flex', 'annuale-unico': 'annuale-unico', 'annuale-rate': 'annuale-rate' }
  const eQuelloCheHai = (x: PianoAbbonamento) => livello(c.piano) !== null && livello(c.piano) === livello(x.abbonamento) && formulaListino[c.formula] === x.formula
  const tuttiIPiani = [...(piani ?? [])].filter((x) => !eQuelloCheHai(x)).sort((a, b) => Number(a.formula === 'flex') - Number(b.formula === 'flex') || rangoAbbonamento(b.abbonamento, b.formula === 'annuale-unico') - rangoAbbonamento(a.abbonamento, a.formula === 'annuale-unico'))
  const pianoCambio = tuttiIPiani.find((x) => x.piano_id === pianoScelto)

  async function inviaCambio() {
    const email = sessione?.user?.email
    if (!pianoCambio || !finestra || finestra.stato === 'non_calcolabile' || !email) return
    setInCorso(true)
    setErrore(null)
    const r = await richiediUpgrade({
      email,
      abbonamento: testoPiano(pianoCambio),
      decorrenza: finestra.nuovo_inizio,
      note: [
        c.persona ? `${t('Per', 'For')}: ${c.persona}` : '',
        `CAMBIO ABBONAMENTO SENZA DISDETTA, ${t('non è un upgrade', 'not an upgrade')}. ${t('Contratto', 'Contract')} ${c.contract_id} (${etichettaPiano(c)}).`,
        t(`Il vecchio finisce il ${finestra.fine}, il nuovo parte il ${finestra.nuovo_inizio}. Quota di attivazione in omaggio.`, `The old one ends on ${finestra.fine}, the new one starts on ${finestra.nuovo_inizio}. Joining fee waived.`),
        t('Richiesta dall’app (Gestisci abbonamento).', 'Requested from the app (Manage membership).'),
        noteUp.trim(),
      ].filter(Boolean).join('\n'),
    })
    setInCorso(false)
    if (r.ok) {
      colpetto('ok')
      setPasso('cEsito')
      return
    }
    colpetto('errore')
    setErrore(r.errore)
  }

  const passoCambio = finestra && finestra.stato !== 'non_calcolabile' ? (
    <>
      <Titolo>{t('Cambia abbonamento', 'Change membership')}</Titolo>
      <Messaggio tono="ok" icona="rinnovo" titolo={t('Senza disdetta, senza buchi', 'No cancellation, no gap')}>
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.nota, { color: p.testo }]}>{t(`Il tuo abbonamento attuale finisce il ${dataLunga(finestra.fine)} e il nuovo parte il ${dataLunga(finestra.nuovo_inizio)}: dai continuità ai tuoi allenamenti. La quota di attivazione è in omaggio e sei libero di scegliere l’abbonamento che preferisci.`, `Your current membership ends on ${dataLunga(finestra.fine)} and the new one starts on ${dataLunga(finestra.nuovo_inizio)}: your training carries on. The joining fee is waived and you’re free to choose the membership you prefer.`)}</Text>
          <Text style={[stili.nota, { color: p.testo }]}>{t('La richiesta arriva alla segreteria, che ti scrive per email per confermare. Non cambia niente finché non confermi.', 'The request goes to the front desk, who will email you to confirm. Nothing changes until you confirm.')}</Text>
        </View>
      </Messaggio>
      {errorePiani ? <Messaggio tono="attenzione">{errorePiani}</Messaggio> : null}
      {!piani && !errorePiani ? <Nota>{t('Un attimo…', 'One moment…')}</Nota> : null}
      {errorePiani ? <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" piccolo onPress={caricaPiani} /> : null}
      {tuttiIPiani.length ? (
        <>
          <Nota>{t('A quale abbonamento vuoi passare?', 'Which membership do you want to move to?')}</Nota>
          <Scelte valori={tuttiIPiani.map((x) => ({ valore: x.piano_id, testo: testoPiano(x) }))} scelto={pianoScelto} onScegli={(v) => setPianoScelto(v)} />
          <CampoTesto etichetta={t('Vuoi aggiungere qualcosa?', 'Want to add anything?')} value={noteUp} onChangeText={setNoteUp} maxLength={500} multiline placeholder={t('Scrivi qui (facoltativo)', 'Write here (optional)')} />
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Invia la richiesta', 'Send the request')} icona="avanti" disabilitato={!pianoCambio || !sessione?.user?.email} inCorso={inCorso} onPress={inviaCambio} />
        </>
      ) : null}
      <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo onPress={() => vai('menu')} />
    </>
  ) : null

  const esitoCambio = (
    <>
      <Messaggio tono="ok" titolo={t('Richiesta inviata', 'Request sent')}>
        {t('La segreteria ti scrive per email per confermare il cambio. Il tuo abbonamento attuale non viene disdetto e continua fino alla sua fine.', 'The front desk will email you to confirm the change. Your current membership is not cancelled and carries on until its end date.')}
      </Messaggio>
      <Pulsante testo={t('Torna agli abbonamenti', 'Back to memberships')} variante="secondario" onPress={onChiudi} />
    </>
  )

  const titolo = passo.startsWith('c') ? t('Cambia abbonamento', 'Change membership') : passo.startsWith('u') ? t('Upgrade', 'Upgrade') : passo.startsWith('s') ? t('Sospendi', 'Suspend') : passo.startsWith('d') ? t('Disdici', 'Cancel') : t('Gestisci abbonamento', 'Manage membership')

  return (
    <Foglio aperto={aperto} titolo={titolo} sottotitolo={passo === 'menu' ? undefined : etichettaPiano(c)} onChiudi={onChiudi}>
      {passo === 'menu' ? riepilogo : null}
      {passo === 's1' ? passo1Sospensione : null}
      {passo === 's2' ? passo2Sospensione : null}
      {passo === 's3' ? passo3Sospensione : null}
      {passo === 'sEsito' ? esitoSospensione : null}
      {passo === 'd1' ? passo1Disdetta : null}
      {passo === 'd2' ? passo2Disdetta : null}
      {passo === 'd3' ? passo3Disdetta : null}
      {passo === 'dEsito' ? esitoDisdetta : null}
      {passo === 'u1' ? passoUpgrade : null}
      {passo === 'uEsito' ? esitoUpgrade : null}
      {passo === 'c1' ? passoCambio : null}
      {passo === 'cEsito' ? esitoCambio : null}
    </Foglio>
  )
}

/** Il comando in fondo alla scheda di un abbonamento: apre il foglio. */
export function PulsanteGestisci({ contratto, onCambiato }: { contratto: ContrattoGestione; onCambiato: () => void }) {
  const [aperto, setAperto] = useState(false)
  return (
    <>
      <Pulsante testo={t('Gestisci abbonamento', 'Manage membership')} icona="avanti" variante="secondario" piccolo onPress={() => setAperto(true)} />
      <FoglioGestisci contratto={contratto} aperto={aperto} onChiudi={() => setAperto(false)} onCambiato={onCambiato} />
    </>
  )
}

// ---------------------------------------------------------------------------

/** La freccia in alto che rimbalza verso il pulsante: ferma con «riduci movimento». */
function FrecciaRimbalzo() {
  const p = usePalette()
  const fermo = useReducedMotion()
  const y = useSharedValue(0)
  useEffect(() => {
    if (fermo) return
    y.value = withRepeat(withSequence(withTiming(8, { duration: 520, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) })), -1, false)
    return () => {
      y.value = 0
    }
  }, [fermo, y])
  const stile = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  return (
    <Animated.View style={[{ alignSelf: 'center' }, stile]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icona nome="giu" size={34} colore={p.accento} />
    </Animated.View>
  )
}

/**
 * Il Guest Pass in corso: la prova, il giorno in cui puo' partire l'abbonamento e un solo comando, «Attiva abbonamento».
 * Niente sospendi, cambia, disdici. Il comando porta alla procedura di iscrizione dalla prova, che ha gia' la data fissa.
 */
export function CartaProva({ contratto: c }: { contratto: ContrattoGestione }) {
  const p = usePalette()
  const fine = c.guest_pass?.fine ?? c.data_fine
  const [quota, setQuota] = useState<number | null>(null)
  useEffect(() => {
    let vivo = true
    statoAbbonamento()
      .then((r) => {
        if (vivo && r.ok && r.stato.quota_attivazione > 0) setQuota(r.stato.quota_attivazione)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])
  return (
    <Carta>
      <View style={{ gap: spazio.tre }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due }}>
          <View style={{ flex: 1, gap: 2 }}>
            {c.persona ? <Text style={[stili.nome, { color: p.testoSecondario }]}>{c.persona}</Text> : null}
            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 }}>{c.piano}</Text>
          </View>
          <Etichetta testo={t('In prova', 'On trial')} tono="accento" />
        </View>
        <View style={{ gap: 6 }}>
          <Riga nome={t('Dal', 'From')} valore={dataLunga(c.data_inizio)} />
          <Riga nome={t('Fino al', 'Until')} valore={dataLunga(fine)} />
        </View>
        {fine ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`L’abbonamento può partire il ${dataLunga(giornoDopo(fine))}, il giorno dopo la fine della prova, senza interruzioni.`, `The membership can start on ${dataLunga(giornoDopo(fine))}, the day after the trial ends, with no gap.`)}</Text>
        ) : null}
        <View style={[stili.promo, { backgroundColor: p.incavo }]}>
          <Text style={{ color: p.accento, fontFamily: F.extra, fontSize: 15 }}>{t('Approfitta della promozione', 'Take advantage of the offer')}</Text>
          <Text style={[stili.nota, { color: p.testo }]}>
            {fine
              ? t(`Attiva l’abbonamento entro il ${dataLunga(fine)}, la scadenza del tuo Guest Pass, e avrai la quota di attivazione${quota ? ` di ${euro(quota)}` : ''} in omaggio.`, `Sign up by ${dataLunga(fine)}, when your Guest Pass ends, and the joining fee${quota ? ` of ${euro(quota)}` : ''} is on us.`)
              : t(`Attiva l’abbonamento entro la scadenza del tuo Guest Pass e avrai la quota di attivazione${quota ? ` di ${euro(quota)}` : ''} in omaggio.`, `Sign up before your Guest Pass ends and the joining fee${quota ? ` of ${euro(quota)}` : ''} is on us.`)}
          </Text>
        </View>
        <FrecciaRimbalzo />
        <View style={{ borderRadius: 18 }}>
          <Pulsante testo={t('Attiva abbonamento', 'Activate membership')} icona="avanti" onPress={() => router.navigate('/abbonamento')} />
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Richiamo raggio={18} colore={p.accento} finoAlFatto />
          </View>
        </View>
      </View>
    </Carta>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spazio.tre },
  nome: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  valore: { fontFamily: F.bold, fontSize: 14, textAlign: 'right', flexShrink: 1 },
  passo: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.6 },
  titolo: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5, lineHeight: 26 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  consenso: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre, borderRadius: 16, padding: spazio.tre },
  casella: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consensoTesto: { flex: 1, fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  mese: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderRadius: 18, padding: spazio.tre },
  tappa: { gap: 2 },
  tappaQuando: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
  tappaTesto: { fontFamily: F.semi, fontSize: 15, lineHeight: 21 },
  promo: { borderRadius: 16, padding: spazio.tre, gap: 4 },
})
