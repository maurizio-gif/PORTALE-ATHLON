import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { useCallback, useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'

import type { ImportiContratto } from '@/api/abbonamento'
import { esitoProposta, verificaProposta, type AnteprimaProposta, type ErroreProposta, type Sonda, type VistaProposta } from '@/api/proposta'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { CampoData } from '@/components/CampoData'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { Indicatore } from '@/features/lab/abbonamento/Passi'
import { uscitaTotem } from '@/features/lab/totem/uscita'
import { InCaricamento } from '@/features/link/Stati'
import { euro } from '@/lib/eventi'
import { locale, t } from '@/lib/lingua'
import { inModalitaTotem } from '@/lib/totem'
import { spazio, useColori } from '@/theme'

import { FaseContratto, FaseGiorno } from './FaseContratto'
import { FasePagamento, FaseEsito } from './FasePagamento'

// L'abbonamento da una proposta (vendita assistita, 02/11/2026): `https://app.athlonroma.it/r/<token>`, aperto dal QR del
// totem o dal link per email. Chi arriva non ha un account ne' una sessione: la credenziale e' il token, e la data di nascita
// di chi ha digitato i dati. Le fasi, una per volta:
//
//   1 verifica (data di nascita) e riepilogo   2 giorno d'inizio   3 contratto e firma   4 pagamento   ->   esito
//
// Tutto quello che conta lo decide il server (`proposte` e `portale-abbonamento`, azioni `proposta_*`): prezzi, date, contratto,
// controlli. I dati non si correggono qui: li ha digitati chi ha preparato la proposta, e se sono sbagliati se ne chiede una nuova.
//
// **Il ritorno dalla pagina di pagamento** riapre questa stessa pagina, senza niente in memoria. Per questo la prima cosa che si
// chiede e' `proposta_esito`, che vuole solo la verifica gia' scritta dal server: se il contratto c'e', si riparte dal pagamento
// o dall'esito, senza chiedere un'altra volta la data di nascita.

type Fase =
  | { f: 'avvio' }
  | { f: 'guasto' }
  | { f: 'fermo'; errore: ErroreProposta }
  | { f: 'verifica'; bloccataFino?: string | null }
  | { f: 'riepilogo' }
  | { f: 'giorno' }
  | { f: 'contratto'; anteprima: AnteprimaProposta }
  | { f: 'pagamento'; errore?: string | null }
  | { f: 'esito' }

const NOMI_PASSI = () => [t('Verifica', 'Check'), t('Giorno', 'Date'), t('Contratto', 'Contract'), t('Pagamento', 'Payment')]

const PASSO: Partial<Record<Fase['f'], number>> = { verifica: 1, riepilogo: 1, giorno: 2, contratto: 3, pagamento: 4 }

export type Iniziale = Extract<Sonda, { tipo: 'proposta' | 'proposta_ferma' }>

/** Un firmatario e un piano, in una riga: «Premium · Annuale a rate, 95 € al mese». */
function nomePiano(v: VistaProposta): string {
  const p = v.piano
  const nome = [p.titolo, p.etichetta].filter(Boolean).join(' · ')
  return nome || t('Abbonamento', 'Membership')
}

export function AbbonamentoDaProposta({ token, iniziale }: { token: string; iniziale: Iniziale }) {
  const [fase, setFase] = useState<Fase>(iniziale.tipo === 'proposta_ferma' ? daFermo(iniziale.errore) : { f: 'avvio' })
  const [vista, setVista] = useState<VistaProposta | null>(null)
  // Il carattere del portale lo carica il layout `(portale)`, e questa pagina sta fuori: i pezzi del contratto e dei costi (`features/lab`)
  // lo usano, e senza questa riga sarebbero in un carattere di ripiego. Finche' non c'e', quello di sistema: niente schermo vuoto.
  useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold })
  const [firmato, setFirmato] = useState<{ numero: string; importi: ImportiContratto } | null>(null)

  /** La prima cosa, e di nuovo ogni volta che il server dice «gia' firmata»: dov'e' arrivata la proposta. */
  const doveSiamo = useCallback(async (): Promise<Fase> => {
    const r = await esitoProposta(token)
    if (!r.ok) {
      if (r.motivo === 'non_verificata') return { f: 'verifica' }
      if (r.motivo === 'rete' || r.motivo === 'altro') return { f: 'guasto' }
      if (r.motivo === 'bloccata') return { f: 'verifica', bloccataFino: r.riprova_dopo ?? null }
      return { f: 'fermo', errore: r }
    }
    if (!r.esito.firmata) return { f: 'verifica' }
    const e = r.esito
    // Pagato, o in corso (la pagina della banca e' stata aperta): si guarda l'esito. Altrimenti si paga.
    if (e.stato === 'completato' || e.pagamento?.ok || e.pagamento?.in_corso) return { f: 'esito' }
    return { f: 'pagamento', errore: e.pagamento?.errore ?? e.errore ?? null }
  }, [token])

  /** Di nuovo da capo (dopo un «gia' firmata», o un guasto): si torna all'attesa e si guarda. */
  const riprendi = useCallback(() => {
    setFase({ f: 'avvio' })
    doveSiamo().then(setFase)
  }, [doveSiamo])

  // All'apertura la fase e' gia' `avvio`: si guarda soltanto.
  useEffect(() => {
    let vivo = true
    if (iniziale.tipo === 'proposta') doveSiamo().then((f) => vivo && setFase(f))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Gli errori che cambiano pagina, uguali in ogni fase. Vero se li ha gestiti. */
  function globale(e: ErroreProposta): boolean {
    switch (e.motivo) {
      case 'non_attivo':
      case 'annullata':
      case 'proposta_scaduta':
      case 'token_scaduto':
      case 'dati_mancanti':
        setFase({ f: 'fermo', errore: e })
        return true
      case 'non_verificata':
        setFase({ f: 'verifica' })
        return true
      case 'bloccata':
        setFase({ f: 'verifica', bloccataFino: e.riprova_dopo ?? null })
        return true
      case 'gia_firmata':
        riprendi()
        return true
      default:
        return false
    }
  }

  const passo = PASSO[fase.f]
  const titoli: Record<Fase['f'], string> = {
    avvio: t('Un attimo…', 'Just a moment…'),
    guasto: t('Non riusciamo ad aprire la pagina adesso', 'We can’t open the page right now'),
    fermo: titoloFermo(fase.f === 'fermo' ? fase.errore : null),
    verifica: t('Il tuo abbonamento', 'Your membership'),
    riepilogo: t('Il tuo abbonamento', 'Your membership'),
    giorno: t('Il tuo abbonamento', 'Your membership'),
    contratto: t('Il tuo abbonamento', 'Your membership'),
    pagamento: t('Il tuo abbonamento', 'Your membership'),
    esito: t('Il tuo abbonamento', 'Your membership'),
  }
  const sotto: Partial<Record<Fase['f'], string>> = {
    verifica: t('Per aprire la proposta scrivi la tua data di nascita.', 'To open the offer, enter your date of birth.'),
    riepilogo: t('Controlla che sia quello che hai chiesto.', 'Check it’s what you asked for.'),
    giorno: t('Scegli quando parte.', 'Choose when it starts.'),
    contratto: t('Conferma i dati, leggi il contratto e firma.', 'Confirm your details, read the contract and sign.'),
    pagamento: t('Il contratto è firmato. Ultimo passo: scegli come pagare.', 'The contract is signed. Last step: choose how to pay.'),
  }

  if (fase.f === 'avvio') return <InCaricamento />

  // `key`: a ogni fase la pagina riparte dall'alto, e il contenuto di una fase non si porta dietro lo scorrimento della precedente.
  return (
    <Pagina key={fase.f} titolo={titoli[fase.f]} sottotitolo={sotto[fase.f]} indietro={false}>
      {passo ? <Indicatore passo={passo} nomi={NOMI_PASSI()} /> : null}

      {fase.f === 'guasto' ? (
        <>
          <Testo variante="attenuato">{t('Riprova fra qualche minuto. Se continua, scrivici a desk@athlonroma.it.', 'Try again in a few minutes. If it keeps happening, write to us at desk@athlonroma.it.')}</Testo>
          <Bottone testo={t('Riprova', 'Try again')} variante="contorno" onPress={riprendi} />
        </>
      ) : null}

      {fase.f === 'fermo' ? <Fermo errore={fase.errore} /> : null}

      {fase.f === 'verifica' ? (
        <Verifica
          token={token}
          bloccataFino={fase.bloccataFino ?? null}
          onVerificata={(v) => {
            setVista(v)
            // Gia' firmata: la persona torna col link a contratto fatto. Si riparte da dove era.
            if (v.contratto_numero) riprendi()
            else setFase({ f: 'riepilogo' })
          }}
          onErrore={globale}
        />
      ) : null}

      {fase.f === 'riepilogo' && vista ? <Riepilogo v={vista} onAvanti={() => setFase({ f: 'giorno' })} /> : null}

      {fase.f === 'giorno' && vista ? (
        <FaseGiorno token={token} vista={vista} onConfermato={(_giorno, anteprima) => setFase({ f: 'contratto', anteprima })} onIndietro={() => setFase({ f: 'riepilogo' })} onErrore={globale} />
      ) : null}

      {fase.f === 'contratto' && vista ? (
        <FaseContratto
          token={token}
          anteprima={fase.anteprima}
          onFirmato={(numero, importi) => {
            setFirmato({ numero, importi })
            setFase({ f: 'pagamento' })
          }}
          onIndietro={() => setFase({ f: 'giorno' })}
          onErrore={globale}
        />
      ) : null}

      {fase.f === 'pagamento' ? (
        <FasePagamento
          token={token}
          firmato={firmato}
          errore={fase.errore ?? null}
          onPagato={() => setFase({ f: 'esito' })}
          onErrore={globale}
        />
      ) : null}

      {fase.f === 'esito' ? <FaseEsito token={token} numero={firmato?.numero ?? null} onRiprova={() => setFase({ f: 'pagamento' })} onErrore={globale} onFine={inModalitaTotem() ? () => void uscitaTotem() : undefined} /> : null}
    </Pagina>
  )
}

// ---------------------------------------------------------------------------
// Le fasi senza rete di chiamate: verifica, riepilogo, stato che non si puo' usare

function daFermo(errore: ErroreProposta): Fase {
  // Troppi tentativi sbagliati: la proposta c'e', si riprova fra poco.
  if (errore.motivo === 'bloccata') return { f: 'verifica', bloccataFino: errore.riprova_dopo ?? null }
  return { f: 'fermo', errore }
}

function titoloFermo(e: ErroreProposta | null): string {
  switch (e?.motivo) {
    case 'annullata':
      return t('Questa proposta è stata annullata', 'This offer has been cancelled')
    case 'proposta_scaduta':
      return t('Questa proposta è scaduta', 'This offer has expired')
    case 'token_scaduto':
      return t('Questo link è scaduto', 'This link has expired')
    case 'non_attivo':
      return t('Questo servizio non è ancora attivo', 'This service isn’t available yet')
    case 'dati_mancanti':
      return t('La proposta non è ancora pronta', 'The offer isn’t ready yet')
    default:
      return t('Non riusciamo ad aprire la proposta', 'We can’t open the offer')
  }
}

/** Una proposta che non si puo' usare, con le parole del server (gia' nella lingua della persona) e la strada per averne una nuova. */
function Fermo({ errore }: { errore: ErroreProposta }) {
  return (
    <>
      <Testo variante="attenuato">{errore.errore}</Testo>
      {errore.motivo === 'non_attivo' ? null : (
        <Testo variante="attenuato">
          {t(
            'Per averne una nuova basta chiederla al totem o a chi te l’ha preparata, oppure scrivere a desk@athlonroma.it.',
            'To get a new one, just ask at the kiosk or the person who prepared it, or write to desk@athlonroma.it.',
          )}
        </Testo>
      )}
      <Bottone testo={t('Vai al sito di Athlon', 'Go to the Athlon website')} variante="contorno" onPress={() => Linking.openURL('https://www.athlonroma.it/')} />
    </>
  )
}

function Verifica({ token, bloccataFino, onVerificata, onErrore }: { token: string; bloccataFino: string | null; onVerificata: (v: VistaProposta) => void; onErrore: (e: ErroreProposta) => boolean }) {
  const c = useColori()
  const [nascita, setNascita] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [rimasti, setRimasti] = useState<number | null>(null)

  const finoA = bloccataFino ? new Date(bloccataFino) : null
  const [adesso, setAdesso] = useState(() => Date.now())
  const bloccata = !!finoA && !Number.isNaN(finoA.getTime()) && finoA.getTime() > adesso
  // Passato l'orario di riprova il pulsante si riaccende da solo.
  useEffect(() => {
    if (!finoA || Number.isNaN(finoA.getTime())) return
    const resta = finoA.getTime() - Date.now()
    if (resta <= 0) return
    const timer = setTimeout(() => setAdesso(Date.now()), resta + 250)
    return () => clearTimeout(timer)
  }, [bloccataFino]) // eslint-disable-line react-hooks/exhaustive-deps

  async function verifica() {
    if (!nascita) return
    setErrore(null)
    setInvio(true)
    const r = await verificaProposta(token, nascita)
    setInvio(false)
    if (r.ok) return onVerificata(r.proposta)
    setRimasti(r.tentativi_rimasti ?? null)
    if (r.motivo === 'bloccata') {
      onErrore(r)
      return
    }
    if (!onErrore(r)) setErrore(r.errore)
  }

  return (
    <>
      <Testo variante="attenuato">
        {t(
          'È la data di nascita di chi compra e firma, come l’hai scritta al totem o come l’ha scritta chi ti ha preparato la proposta. Se compra un genitore per un figlio, è la data di nascita del genitore.',
          'It’s the date of birth of the person buying and signing, as you entered it at the kiosk or as the person who prepared the offer entered it. If a parent is buying for their child, it’s the parent’s date of birth.',
        )}
      </Testo>
      <CampoData etichetta={t('Data di nascita', 'Date of birth')} value={nascita} onChange={setNascita} annoIniziale={1985} errore={!!errore} />
      {bloccata && finoA ? (
        <Avviso tono="attenzione">
          {t(
            `Troppi tentativi sbagliati. Riprova dopo le ${finoA.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}.`,
            `Too many wrong attempts. Try again after ${finoA.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}.`,
          )}
        </Avviso>
      ) : null}
      {errore ? (
        <Avviso>
          {errore}
          {rimasti !== null ? ` ${t(`Tentativi rimasti: ${rimasti}.`, `Attempts left: ${rimasti}.`)}` : ''}
        </Avviso>
      ) : null}
      <Bottone testo={t('Apri la proposta', 'Open the offer')} onPress={verifica} inCorso={invio} disabilitato={!nascita || bloccata} />
      <Text style={[stili.nota, { color: c.testoSecondario }]}>
        {t('Dopo qualche tentativo sbagliato il link si blocca per un quarto d’ora.', 'After a few wrong attempts the link is blocked for fifteen minutes.')}
      </Text>
    </>
  )
}

function Riepilogo({ v, onAvanti }: { v: VistaProposta; onAvanti: () => void }) {
  const c = useColori()
  const p = v.piano
  const prezzo = p.importo !== undefined ? `${euro(p.importo)} ${p.periodo?.includes('anno') ? t('all’anno', 'a year') : t('al mese', 'a month')}` : null
  const scade = new Date(v.scade_il)
  const riga = (nome: string, valore: string) => (
    <View style={stili.riga}>
      <Text style={[stili.etichetta, { color: c.testoSecondario }]}>{nome}</Text>
      <Text style={[stili.valore, { color: c.testo }]}>{valore}</Text>
    </View>
  )
  return (
    <>
      <View style={[stili.scheda, { borderColor: c.bordo, backgroundColor: c.superficie }]}>
        {riga(t('Abbonamento', 'Membership'), nomePiano(v))}
        {prezzo ? riga(t('Quota', 'Fee'), prezzo) : null}
        {v.firmatario === 'genitore' && v.beneficiario
          ? riga(t('Per', 'For'), v.beneficiario.nome)
          : v.persona
            ? riga(t('Per', 'For'), v.persona.nome)
            : null}
        {v.firmatario === 'genitore' ? riga(t('Firma', 'Signs'), v.persona ? t(`Il genitore, ${v.persona.nome}`, `The parent, ${v.persona.nome}`) : t('Il genitore', 'The parent')) : null}
        {v.persona?.telefono ? riga(t('Cellulare', 'Mobile'), v.persona.telefono) : null}
        {!Number.isNaN(scade.getTime()) ? riga(t('Valida fino al', 'Valid until'), scade.toLocaleDateString(locale(), { day: 'numeric', month: 'long' })) : null}
      </View>
      <Text style={[stili.nota, { color: c.testoSecondario }]}>
        {t(
          'I dati li ha scritti chi ti ha preparato la proposta e da qui non si cambiano. Se qualcosa non è giusto, chiedi di rifarla: ci vuole un minuto.',
          'The details were entered by whoever prepared the offer and can’t be changed from here. If something isn’t right, ask for it to be redone: it takes a minute.',
        )}
      </Text>
      <Bottone testo={t('Continua', 'Continue')} onPress={onAvanti} />
    </>
  )
}

const stili = StyleSheet.create({
  scheda: { borderWidth: 1, borderRadius: 14, padding: spazio.tre, gap: spazio.due },
  riga: { flexDirection: 'row', gap: spazio.due },
  etichetta: { fontSize: 13, width: 112, lineHeight: 20 },
  valore: { fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 20 },
  nota: { fontSize: 13, lineHeight: 19 },
})
