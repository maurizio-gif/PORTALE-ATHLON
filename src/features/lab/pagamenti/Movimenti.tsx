import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'

import { esitoSaldo, movimentiPagamenti, saldaPagamenti, type CartaSaldo, type Movimento, type QuotaFutura } from '@/api/lab'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { hrefSezione } from '../home/sezioni'
import { inMemoria, prendi, scorda } from '../memoria'
import { colpetto } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { Foglio } from '../ui/Foglio'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Etichetta, LinkSezione, Messaggio, Numero, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette, type ToniTutti } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { apriPagamento } from '@/lib/pagamentoEsterno'

// I pagamenti veri del socio e della famiglia (15/10/2026), da PerfectGym:
// le quote scadute da saldare, i prossimi pagamenti e lo storico, ognuno col
// metodo e con a cosa corrisponde. Nella sezione Pagamenti della Home il riepilogo; lo storico
// completo, per mese, in /pagamenti/storico.
//
// **Le quote da pagare si pagano da qui** (22/10/2026, richiesta di Maurizio): prima c'era solo «Aggiorna il metodo di
// pagamento», ripetuto in quattro posti, e chi aveva gia' una carta valida non poteva fare niente. Ora «Da pagare» ha
// «Paga … con la carta •••• 1234» (la carta registrata sul contratto, anche quella di un genitore per il figlio) e
// «Usa un'altra carta» (la pagina della carta di Adyen, che torna qui con `?saldo=1`); il metodo sta in un riquadro suo
// della sezione (home/MetodoPagamento). Il server rilegge le quote da PerfectGym prima di addebitare (portale-lab-pagamenti,
// azioni `salda` e `saldo_esito`); dopo il pagamento si chiede com'e' andata ogni 4 secondi per due minuti.

export const CHIAVE_MOVIMENTI = 'pagamenti:movimenti'

type Dati = { storico: Movimento[]; daSaldare: Movimento[]; futuri: QuotaFutura[]; cartaSaldo: CartaSaldo | null }

export function soldi(n: number): string {
  return n.toLocaleString(locale(), { style: 'currency', currency: 'EUR' })
}

function giorno(iso: string | null, conAnno = false): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', ...(conAnno ? { year: 'numeric' } : {}), timeZone: 'Europe/Rome' })
}

function mese(iso: string | null): string {
  if (!iso) return t('Senza data', 'No date')
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  const s = d.toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const ESITI: Record<Movimento['esito'], { testo: string; tono: ToniTutti; icona: NomeIcona }> = {
  riuscito: { testo: t('Pagato', 'Paid'), tono: 'ok', icona: 'spunta' },
  rimborso: { testo: t('Rimborso', 'Refund'), tono: 'blu', icona: 'rinnovo' },
  in_corso: { testo: t('In corso', 'In progress'), tono: 'attenzione', icona: 'clessidra' },
  da_pagare: { testo: t('Da saldare', 'Outstanding'), tono: 'errore', icona: 'attenzione' },
}

export function useMovimenti() {
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<{ ok: true } & Dati>(CHIAVE_MOVIMENTI) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_MOVIMENTI, movimentiPagamenti)
    if (r.ok) setDati({ storico: r.storico, daSaldare: r.daSaldare, futuri: r.futuri, cartaSaldo: r.cartaSaldo })
    else setErrore(r.errore)
  }, [])
  /** Dopo un pagamento: si butta la memoria e si rilegge (la Home ricalcola i riquadri dalla sua lettura). */
  const rileggi = useCallback(async () => {
    scorda(CHIAVE_MOVIMENTI)
    scorda('area')
    await carica()
  }, [carica])
  useEffect(() => {
    carica()
  }, [carica])
  return { dati, errore, carica, rileggi }
}

/** Una riga di pagamento: la data, a cosa corrisponde, per chi e come, l'importo. */
function RigaMovimento({ m, prima, onPress }: { m: Movimento; prima: boolean; onPress?: () => void }) {
  const p = usePalette()
  const e = ESITI[m.esito]
  const sotto = [m.per ? t(`per ${m.per}`, `for ${m.per}`) : null, m.voci[0]?.dettaglio, m.metodo].filter(Boolean).join(' · ')
  return (
    <Riga
      prima={prima}
      icona={e.icona}
      tono={e.tono}
      titolo={m.voci.length > 1 ? `${m.titolo} + ${m.voci.length - 1} ${m.voci.length === 2 ? t('altro', 'other') : t('altri', 'others')}` : m.titolo}
      sotto={sotto || e.testo}
      onPress={onPress}
      coda={
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={[stili.importo, { color: m.esito === 'rimborso' ? p.blu : p.testo }]}>{`${m.esito === 'rimborso' ? '+' : ''}${soldi(m.importo)}`}</Text>
          <Text style={[stili.data, { color: p.testoTerzo }]}>{giorno(m.esito === 'da_pagare' ? m.scadenza : m.data)}</Text>
        </View>
      }
    />
  )
}

function RigaFutura({ q, prima, onPress }: { q: QuotaFutura; prima: boolean; onPress: () => void }) {
  const p = usePalette()
  const sotto = [q.per ? t(`per ${q.per}`, `for ${q.per}`) : null, q.dettaglio, q.metodo].filter(Boolean).join(' · ')
  return (
    <Riga
      prima={prima}
      testa={
        <View style={[stili.calendario, { backgroundColor: p.incavo }]}>
          <Text style={[stili.calMese, { color: p.accento }]}>{new Date(`${q.scadenza}T12:00:00`).toLocaleDateString(locale(), { month: 'short' }).toUpperCase()}</Text>
          <Text style={[stili.calGiorno, { color: p.testo }]}>{Number(q.scadenza.slice(8, 10))}</Text>
        </View>
      }
      titolo={q.titolo}
      sotto={sotto}
      onPress={onPress}
      coda={<Text style={[stili.importo, { color: p.testo }]}>{soldi(q.importo)}</Text>}
    />
  )
}

type Scelto = { tipo: 'movimento'; m: Movimento } | { tipo: 'futuro'; q: QuotaFutura } | null

/** Il dettaglio di un pagamento: quanto, quando, come, per chi, a cosa corrisponde. */
function FoglioDettaglio({ scelto, onChiudi }: { scelto: Scelto; onChiudi: () => void }) {
  const p = usePalette()
  if (!scelto) return <Foglio aperto={false} titolo="" onChiudi={onChiudi}>{null}</Foglio>
  const futuro = scelto.tipo === 'futuro'
  const titolo = futuro ? scelto.q.titolo : scelto.m.titolo
  const righe: [string, string][] = futuro
    ? [
        [t('Scadenza', 'Due date'), giorno(scelto.q.scadenza, true)],
        [t('Che cosa', 'What'), scelto.q.dettaglio ?? t('Quota', 'Fee')],
        ...(scelto.q.per ? ([[t('Per', 'For'), scelto.q.per]] as [string, string][]) : []),
        [t('Metodo', 'Method'), scelto.q.metodo ?? t('Non registrato', 'Not on file')],
        ...(scelto.q.carta_scade ? ([[t('Carta valida fino a', 'Card valid until'), `${scelto.q.carta_scade.slice(5, 7)}/${scelto.q.carta_scade.slice(0, 4)}`]] as [string, string][]) : []),
        ...(scelto.q.totale !== scelto.q.importo ? ([[t('Già pagato', 'Already paid'), soldi(scelto.q.totale - scelto.q.importo)]] as [string, string][]) : []),
      ]
    : [
        [scelto.m.esito === 'da_pagare' ? t('Scadenza', 'Due date') : t('Data', 'Date'), giorno(scelto.m.esito === 'da_pagare' ? scelto.m.scadenza : scelto.m.data, true)],
        [t('Stato', 'Status'), ESITI[scelto.m.esito].testo],
        ...(scelto.m.per ? ([[t('Per', 'For'), scelto.m.per]] as [string, string][]) : []),
        [t('Metodo', 'Method'), scelto.m.metodo ?? '—'],
      ]
  const importo = futuro ? scelto.q.importo : scelto.m.importo
  return (
    <Foglio aperto titolo={titolo} sottotitolo={futuro ? t('Prossimo pagamento', 'Next payment') : ESITI[scelto.m.esito].testo} onChiudi={onChiudi}>
      <View style={{ gap: spazio.tre }}>
        <View style={{ alignItems: 'center', paddingVertical: spazio.due }}>
          <Numero valore={importo.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unita="€" size={44} colore={!futuro && scelto.m.esito === 'da_pagare' ? p.errore : p.testo} />
        </View>
        <Carta piatta style={{ paddingVertical: spazio.uno, backgroundColor: p.incavo }}>
          {righe.map(([k, v], i) => (
            <View key={k} style={[stili.dettaglio, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
              <Text style={[stili.chiave, { color: p.testoSecondario }]}>{k}</Text>
              <Text style={[stili.valore, { color: p.testo }]}>{v}</Text>
            </View>
          ))}
        </Carta>
        {!futuro && scelto.m.voci.length ? (
          <View style={{ gap: spazio.due }}>
            <Text style={[stili.titoletto, { color: p.testo }]}>{t('A cosa corrisponde', 'What it covers')}</Text>
            {scelto.m.voci.map((v, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: spazio.due, alignItems: 'baseline' }}>
                <Text style={[stili.valore, { color: p.testo, flex: 1, textAlign: 'left' }]}>{[v.cosa, v.dettaglio].filter(Boolean).join(' · ')}</Text>
                {v.importo != null && scelto.m.voci.length > 1 ? <Text style={[stili.chiave, { color: p.testoSecondario }]}>{soldi(v.importo)}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
        {!futuro && scelto.m.nota ? <Messaggio tono="attenzione">{scelto.m.nota}</Messaggio> : null}
        {!futuro && scelto.m.esito === 'da_pagare' ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('La paghi da «Da pagare», nella sezione Pagamenti.', 'You can pay it from “Due now”, in the Payments section.')}</Text>
        ) : null}
        {futuro && !scelto.q.metodo ? (
          <Pulsante
            testo={t('Aggiungi un metodo di pagamento', 'Add a payment method')}
            icona="carta"
            onPress={() => {
              onChiudi()
              router.push('/metodo-pagamento')
            }}
          />
        ) : null}
      </View>
    </Foglio>
  )
}

const oggiRoma = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())

type Fase = 'pronto' | 'invio-carta' | 'invio-altra' | 'verifica' | 'pagato' | 'attesa-lunga'

/**
 * Le quote scadute e non pagate, in rosso, e il modo di pagarle adesso. Non si dice «non è andato a buon fine»: una
 * quota che scade oggi non e' ancora stata addebitata, e il nostro dato non dice se un addebito e' fallito. Si dice che
 * risulta da pagare, e si paga.
 */
export function DaPagare({ elenco, carta, onApri, onAggiorna, verificaSubito }: { elenco: Movimento[]; carta: CartaSaldo | null; /** Senza, le righe non si aprono (nella chat dell'assistente non c'e' il foglio del dettaglio). */ onApri?: (m: Movimento) => void; onAggiorna: () => void; verificaSubito: boolean }) {
  const p = usePalette()
  const totale = Math.round(elenco.reduce((t, m) => t + m.importo, 0) * 100) / 100
  const vista = vistaCorrente() !== null
  const [fase, setFase] = useState<Fase>(verificaSubito ? 'verifica' : 'pronto')
  const [errore, setErrore] = useState<string | null>(null)
  const giri = useRef(0)
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  // Com'e' andata: ogni 4 secondi per due minuti, rileggendo le quote da PerfectGym (dal server).
  useEffect(() => {
    if (fase !== 'verifica') return
    giri.current = 0
    let timer: ReturnType<typeof setTimeout>
    const giro = async () => {
      const r = await esitoSaldo()
      if (!vivo.current) return
      giri.current += 1
      if (r.ok && r.stato === 'pagato') {
        colpetto('ok')
        setFase('pagato')
        // Il mirror arriva qualche secondo dopo PerfectGym: la lista si rilegge fra un po'.
        timer = setTimeout(onAggiorna, 6000)
        return
      }
      if (r.ok && r.stato === 'fallito') {
        colpetto('errore')
        setErrore(r.motivo ?? t('Il pagamento non è andato a buon fine.', 'The payment didn’t go through.'))
        setFase('pronto')
        return
      }
      if (r.ok && r.stato === 'nessuno') {
        setFase('pronto')
        return
      }
      if (giri.current >= 30) {
        setFase('attesa-lunga')
        return
      }
      timer = setTimeout(giro, 4000)
    }
    timer = setTimeout(giro, verificaSubito && giri.current === 0 ? 500 : 3000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase])

  async function paga(conCarta: boolean) {
    setErrore(null)
    setFase(conCarta ? 'invio-carta' : 'invio-altra')
    const r = await saldaPagamenti(totale, conCarta)
    if (!vivo.current) return
    if (!r.ok) {
      colpetto('errore')
      setErrore(r.errore)
      setFase('pronto')
      if (r.importoCambiato != null) onAggiorna()
      return
    }
    if (r.stato === 'pagato') {
      setFase('pagato')
      onAggiorna()
      return
    }
    if (r.stato === 'redirect') {
      // Si esce dall'app per la pagina della carta, e si torna qui con `?saldo=1`.
      if (Platform.OS === 'web') window.location.assign(r.url)
      else {
        // Il browser integrato si chiude quando la persona torna: solo allora si rilegge l'esito.
        await apriPagamento(r.url)
        if (vivo.current) setFase('verifica')
      }
      return
    }
    setFase('verifica')
  }

  const oggi = oggiRoma()
  const tutteOggi = elenco.every((m) => (m.scadenza ?? '').slice(0, 10) === oggi)
  const uno = elenco.length === 1
  const spiegazione = tutteOggi
    ? uno
      ? t('Scade oggi e non risulta ancora pagata.', 'It’s due today and isn’t paid yet.')
      : t('Scadono oggi e non risultano ancora pagate.', 'They’re due today and aren’t paid yet.')
    : uno
      ? t('È scaduta e non risulta ancora pagata.', 'It’s past due and isn’t paid yet.')
      : t('Sono scadute e non risultano ancora pagate.', 'They’re past due and aren’t paid yet.')
  const occupato = fase === 'invio-carta' || fase === 'invio-altra' || fase === 'verifica'
  const cifre = carta?.finale ? ` •••• ${carta.finale}` : ''

  return (
    <Carta style={{ gap: spazio.due, borderWidth: 1.5, borderColor: fase === 'pagato' ? p.ok : p.errore }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
        <Icona nome={fase === 'pagato' ? 'spunta' : 'attenzione'} size={20} colore={fase === 'pagato' ? p.ok : p.errore} />
        <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>{fase === 'pagato' ? t(`Pagato: ${soldi(totale)}`, `Paid: ${soldi(totale)}`) : t(`Da pagare: ${soldi(totale)}`, `Due now: ${soldi(totale)}`)}</Text>
      </View>
      {fase !== 'pagato' ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {spiegazione} {vista ? '' : t('Puoi pagare adesso, con la carta.', 'You can pay now, by card.')}
        </Text>
      ) : null}
      <View>
        {elenco.map((m, i) => (
          <RigaMovimento key={m.id} m={m} prima={i === 0} onPress={onApri ? () => onApri(m) : undefined} />
        ))}
      </View>

      {fase === 'pagato' ? (
        <Messaggio tono="ok">{t('Pagamento ricevuto, grazie. Fra qualche minuto lo trovi fra i pagamenti effettuati.', 'Payment received, thank you. In a few minutes you’ll see it among the payments made.')}</Messaggio>
      ) : fase === 'verifica' ? (
        <Messaggio tono="attenzione" icona="clessidra">{t('Verifichiamo il pagamento… non chiudere la pagina.', 'Checking the payment… don’t close the page.')}</Messaggio>
      ) : fase === 'attesa-lunga' ? (
        <Messaggio tono="attenzione">{t('Non vediamo ancora il pagamento. Se è andato a buon fine compare qui fra qualche minuto; se sei tornato indietro senza pagare, non è stato addebitato niente.', 'We can’t see the payment yet. If it went through it’ll show up here in a few minutes; if you went back without paying, nothing was charged.')}</Messaggio>
      ) : null}
      {errore ? <Messaggio>{errore}</Messaggio> : null}

      {!vista && fase !== 'pagato' && fase !== 'verifica' ? (
        <View style={{ gap: spazio.due }}>
          {carta ? (
            <Pulsante
              testo={t(`Paga ${soldi(totale)} con la carta${cifre}`, `Pay ${soldi(totale)} with card${cifre}`)}
              icona="carta"
              inCorso={fase === 'invio-carta'}
              disabilitato={occupato}
              onPress={() => paga(true)}
            />
          ) : null}
          <Pulsante
            testo={carta ? t('Usa un’altra carta', 'Use another card') : t(`Paga ${soldi(totale)} con la carta`, `Pay ${soldi(totale)} by card`)}
            icona={carta ? undefined : 'carta'}
            variante={carta ? 'secondario' : 'primario'}
            inCorso={fase === 'invio-altra'}
            disabilitato={occupato}
            onPress={() => paga(false)}
          />
        </View>
      ) : null}
    </Carta>
  )
}

/** Il riepilogo nella sezione Pagamenti: da saldare, i prossimi tre, gli ultimi quattro. */
export function RiepilogoPagamenti({ onPagato }: { onPagato?: () => void } = {}) {
  const p = usePalette()
  const { dati, errore, carica, rileggi } = useMovimenti()
  const [scelto, setScelto] = useState<Scelto>(null)
  // Il ritorno dalla pagina della carta (`?saldo=1`): si verifica subito, e il parametro si toglie.
  const { saldo } = useLocalSearchParams<{ saldo?: string }>()
  const [ritorno] = useState(saldo === '1')
  useEffect(() => {
    if (saldo) router.setParams({ saldo: undefined })
  }, [saldo])
  const aggiorna = useCallback(() => {
    rileggi()
    onPagato?.()
  }, [rileggi, onPagato])

  if (!dati) {
    return errore ? (
      <View style={{ gap: spazio.due }}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
      </View>
    ) : (
      <SchedeInArrivo quante={2} />
    )
  }

  const prossimo = dati.futuri[0]
  return (
    <View style={{ gap: spazio.quattro }}>
      {dati.daSaldare.length ? (
        <DaPagare elenco={dati.daSaldare} carta={dati.cartaSaldo} onApri={(m) => setScelto({ tipo: 'movimento', m })} onAggiorna={aggiorna} verificaSubito={ritorno} />
      ) : null}

      <Sezione titolo={t('Prossimi pagamenti', 'Upcoming payments')} destra={dati.futuri.length > 3 ? <LinkSezione testo={t('Tutti', 'All')} onPress={() => router.push({ pathname: '/pagamenti/storico', params: { vista: 'futuri' } })} /> : undefined}>
        {prossimo ? (
          <Carta style={{ paddingVertical: spazio.uno }}>
            {dati.futuri.slice(0, 3).map((q, i) => (
              <RigaFutura key={q.id} q={q} prima={i === 0} onPress={() => setScelto({ tipo: 'futuro', q })} />
            ))}
          </Carta>
        ) : (
          <Carta style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
            <Icona nome="calendario" size={22} colore={p.testoTerzo} />
            <Text style={[stili.nota, { color: p.testoSecondario, flex: 1 }]}>{t('Nessun pagamento in programma.', 'No payments scheduled.')}</Text>
          </Carta>
        )}
      </Sezione>

      <Sezione titolo={t('Pagamenti effettuati', 'Payments made')} destra={dati.storico.length ? <LinkSezione testo={t('Storico completo', 'Full history')} onPress={() => router.push('/pagamenti/storico')} /> : undefined}>
        {dati.storico.length ? (
          <Carta style={{ paddingVertical: spazio.uno }}>
            {dati.storico.slice(0, 4).map((m, i) => (
              <RigaMovimento key={m.id} m={m} prima={i === 0} onPress={() => setScelto({ tipo: 'movimento', m })} />
            ))}
          </Carta>
        ) : (
          <Carta style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
            <Icona nome="ricevuta" size={22} colore={p.testoTerzo} />
            <Text style={[stili.nota, { color: p.testoSecondario, flex: 1 }]}>{t('Non ci sono ancora pagamenti registrati.', 'No payments recorded yet.')}</Text>
          </Carta>
        )}
      </Sezione>

      <FoglioDettaglio scelto={scelto} onChiudi={() => setScelto(null)} />
    </View>
  )
}

/** Lo storico completo, per mese: gli effettuati o i futuri. */
export function StoricoPagamenti({ vistaIniziale }: { vistaIniziale: 'effettuati' | 'futuri' }) {
  const p = usePalette()
  const { dati, errore, carica, rileggi } = useMovimenti()
  const [vista, setVista] = useState(vistaIniziale)
  const [scelto, setScelto] = useState<Scelto>(null)

  const intestazione = (
    <View style={[stili.schede, { backgroundColor: p.incavo }]}>
      {(['effettuati', 'futuri'] as const).map((v) => {
        const attivo = v === vista
        return (
          <Tocco
            key={v}
            vibra="scelta"
            stato={{ selected: attivo }}
            onPress={() => setVista(v)}
            etichetta={v === 'effettuati' ? t('Pagamenti effettuati', 'Payments made') : t('Pagamenti futuri', 'Upcoming payments')}
            style={[stili.scheda, attivo && { backgroundColor: p.carta, boxShadow: p.ombra }]}
          >
            <Text style={{ color: attivo ? p.testo : p.testoSecondario, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{v === 'effettuati' ? t('Effettuati', 'Made') : t('Futuri', 'Upcoming')}</Text>
          </Tocco>
        )
      })}
    </View>
  )

  if (!dati) {
    return (
      <Schermata sopratitolo={t('Pagamenti', 'Payments')} titolo={t('I tuoi pagamenti', 'Your payments')} indietro={hrefSezione('pagamenti')} barra={false}>
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }

  // Per mese, col totale del mese.
  const gruppi: { mese: string; totale: number; voci: (Movimento | QuotaFutura)[] }[] = []
  const elenco: (Movimento | QuotaFutura)[] = vista === 'effettuati' ? dati.storico : dati.futuri
  for (const x of elenco) {
    const chiave = mese('scadenza' in x && vista === 'futuri' ? x.scadenza : (x as Movimento).data)
    let g = gruppi.find((y) => y.mese === chiave)
    if (!g) gruppi.push((g = { mese: chiave, totale: 0, voci: [] }))
    g.voci.push(x)
    g.totale += (x as Movimento).esito === 'rimborso' ? -x.importo : x.importo
  }

  return (
    <Schermata sopratitolo={t('Pagamenti', 'Payments')} titolo={t('I tuoi pagamenti', 'Your payments')} sottotitolo={t('Tuoi e della tua famiglia, da PerfectGym.', 'Yours and your family’s, from PerfectGym.')} indietro={hrefSezione('pagamenti')} barra={false}>
      {intestazione}
      {dati.daSaldare.length && vista === 'effettuati' ? (
        <DaPagare elenco={dati.daSaldare} carta={dati.cartaSaldo} onApri={(m) => setScelto({ tipo: 'movimento', m })} onAggiorna={rileggi} verificaSubito={false} />
      ) : null}
      {gruppi.length ? (
        gruppi.map((g) => (
          <View key={g.mese} style={{ gap: spazio.due }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 2 }}>
              <Text style={[stili.mese, { color: p.testo, flex: 1 }]}>{g.mese}</Text>
              <Etichetta testo={soldi(g.totale)} tono="neutro" />
            </View>
            <Carta style={{ paddingVertical: spazio.uno }}>
              {g.voci.map((x, i) =>
                vista === 'futuri' ? (
                  <RigaFutura key={x.id} q={x as QuotaFutura} prima={i === 0} onPress={() => setScelto({ tipo: 'futuro', q: x as QuotaFutura })} />
                ) : (
                  <RigaMovimento key={x.id} m={x as Movimento} prima={i === 0} onPress={() => setScelto({ tipo: 'movimento', m: x as Movimento })} />
                ),
              )}
            </Carta>
          </View>
        ))
      ) : (
        <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
          <Icona nome={vista === 'futuri' ? 'calendario' : 'ricevuta'} size={30} colore={p.testoTerzo} />
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
            {vista === 'futuri' ? t('Nessun pagamento in programma.', 'No payments scheduled.') : t('Non ci sono ancora pagamenti registrati.', 'No payments recorded yet.')}
          </Text>
        </Carta>
      )}
      <FoglioDettaglio scelto={scelto} onChiudi={() => setScelto(null)} />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  importo: { fontFamily: F.extra, fontSize: 15.5, letterSpacing: -0.3 },
  data: { fontFamily: F.semi, fontSize: 12 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  titoletto: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  calendario: { width: 44, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  calMese: { fontFamily: F.extra, fontSize: 10, letterSpacing: 0.8 },
  calGiorno: { fontFamily: F.extra, fontSize: 18, lineHeight: 21 },
  dettaglio: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.due + 2, paddingHorizontal: spazio.tre },
  chiave: { fontFamily: F.semi, fontSize: 13.5 },
  valore: { flex: 1, fontFamily: F.bold, fontSize: 14.5, textAlign: 'right' },
  schede: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  scheda: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  mese: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.4 },
})
