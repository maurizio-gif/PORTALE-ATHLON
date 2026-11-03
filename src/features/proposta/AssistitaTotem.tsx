import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'

import type { ImportiContratto } from '@/api/abbonamento'
import { anteprimaProposta, esitoProposta, sbloccaAssistita, type AnteprimaProposta, type ErroreProposta, type PropostaCreata } from '@/api/proposta'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Testo } from '@/components/Testo'
import { uscitaTotem } from '@/features/lab/totem/uscita'
import { Carta, Messaggio } from '@/features/lab/ui/kit'
import { F, usePalette } from '@/features/lab/ui/tema'
import { colpetto } from '@/features/lab/ui/Tocco'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { FaseContratto } from './FaseContratto'
import { FaseEsito, FasePagamento } from './FasePagamento'

// La modalita assistita sul totem (02/11/2026): la persona firma e paga **su questo schermo**, con un operatore accanto.
//
//   operatore -> contratto e firma -> pagamento -> esito
//
// L'operatore (segreteria o front office) digita il **suo codice** (sei cifre assegnate dal sistema, che vede in cima al CRM): la funzione risponde sempre la stessa cosa per un numero sbagliato,
// per un operatore senza la sezione e per uno che non c'e' piu' (non dice quale), e scrive nel registro chi ha assistito quale proposta. Lo
// sblocco vale finche' vive la proposta. L'identita' di chi compra l'ha gia' data il suo login con il codice via email: la proposta nasce verificata
// e non si chiede la data di nascita. Il giorno d'inizio e' quello scelto prima, e qui si **conferma** (il server lo pretende per firmare).
//
// Chi assiste dichiara anche di aver controllato il documento di identita': e' un campo del contratto (`documento_verificato`), non una formalita'.
// **Il token resta in memoria di questa schermata**, mai in uno storage.

type Fase =
  | { f: 'operatore' }
  | { f: 'preparo' }
  | { f: 'contratto'; anteprima: AnteprimaProposta }
  | { f: 'pagamento'; errore?: string | null }
  | { f: 'esito' }
  | { f: 'fermo'; errore: ErroreProposta }

/** Oggi, a Roma, come `AAAA-MM-GG`: il giorno che conta per il club, qualunque sia il fuso del dispositivo. */
function oggiRoma(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function AssistitaTotem({ proposta, inizio, nomePiano, onIndietro }: { proposta: PropostaCreata; inizio: string | null; nomePiano: string; onIndietro: () => void }) {
  const token = proposta.token
  const [fase, setFase] = useState<Fase>({ f: 'operatore' })
  const [operatore, setOperatore] = useState<string | null>(null)
  const [firmato, setFirmato] = useState<{ numero: string; importi: ImportiContratto } | null>(null)

  /** Dove e' arrivata la proposta (dopo un «gia' firmata»): si paga, o si guarda l'esito. */
  const riprendi = useCallback(async () => {
    if (!token) return
    const r = await esitoProposta(token)
    if (!r.ok) return setFase({ f: 'fermo', errore: r })
    if (!r.esito.firmata) return setFase({ f: 'operatore' })
    const e = r.esito
    if (e.stato === 'completato' || e.pagamento?.ok || e.pagamento?.in_corso) return setFase({ f: 'esito' })
    setFase({ f: 'pagamento', errore: e.pagamento?.errore ?? e.errore ?? null })
  }, [token])

  /** Gli errori che cambiano schermata, uguali in ogni fase. Vero se li ha gestiti. */
  function globale(e: ErroreProposta): boolean {
    switch (e.motivo) {
      case 'non_attivo':
      case 'annullata':
      case 'proposta_scaduta':
      case 'token_scaduto':
      case 'dati_mancanti':
      case 'non_verificata':
        setFase({ f: 'fermo', errore: e })
        return true
      case 'operatore_richiesto':
        setFase({ f: 'operatore' })
        return true
      case 'gia_firmata':
        void riprendi()
        return true
      default:
        return false
    }
  }

  if (!token) {
    return (
      <View style={{ gap: spazio.quattro }}>
        <Messaggio tono="errore" titolo={t('Non riusciamo a continuare', 'We can’t continue')}>
          {t('La proposta non è partita. Torna indietro e riprova.', 'The offer didn’t start. Go back and try again.')}
        </Messaggio>
        <Bottone testo={t('Indietro', 'Back')} variante="contorno" onPress={onIndietro} />
      </View>
    )
  }

  if (fase.f === 'operatore' || fase.f === 'preparo') {
    return (
      <Operatore
        token={token}
        nomePiano={nomePiano}
        inCorso={fase.f === 'preparo'}
        onSbloccato={async (nome) => {
          setOperatore(nome)
          setFase({ f: 'preparo' })
          // Conferma il giorno scelto prima: il server compone il contratto per quel giorno e segna la conferma.
          const r = await anteprimaProposta(token, inizio ?? oggiRoma())
          if (!r.ok) {
            colpetto('errore')
            if (!globale(r)) setFase({ f: 'fermo', errore: r })
            return
          }
          setFase({ f: 'contratto', anteprima: r.anteprima })
        }}
        onIndietro={onIndietro}
      />
    )
  }

  if (fase.f === 'fermo') {
    return (
      <View style={{ gap: spazio.quattro }}>
        <Messaggio tono="attenzione" titolo={t('Non possiamo andare avanti', 'We can’t go on')}>
          {fase.errore.errore}
        </Messaggio>
        <Bottone testo={t('Ho finito, esco', 'I’m done, sign out')} onPress={() => void uscitaTotem()} />
        <Bottone testo={t('Indietro', 'Back')} variante="contorno" onPress={onIndietro} />
      </View>
    )
  }

  return (
    <View style={{ gap: spazio.quattro }}>
      {operatore ? <Avviso tono="ok">{t(`Assiste ${operatore}`, `Assisted by ${operatore}`)}</Avviso> : null}
      {fase.f === 'contratto' ? (
        <FaseContratto
          token={token}
          anteprima={fase.anteprima}
          assistita
          onFirmato={(numero, importi) => {
            setFirmato({ numero, importi })
            setFase({ f: 'pagamento' })
          }}
          onIndietro={() => setFase({ f: 'operatore' })}
          onErrore={globale}
        />
      ) : null}
      {fase.f === 'pagamento' ? (
        <FasePagamento token={token} firmato={firmato} errore={fase.errore ?? null} onPagato={() => setFase({ f: 'esito' })} onErrore={globale} />
      ) : null}
      {fase.f === 'esito' ? <FaseEsito token={token} numero={firmato?.numero ?? null} onRiprova={() => setFase({ f: 'pagamento' })} onErrore={globale} onFine={() => void uscitaTotem()} /> : null}
    </View>
  )
}

function Operatore({
  token,
  nomePiano,
  inCorso,
  onSbloccato,
  onIndietro,
}: {
  token: string
  nomePiano: string
  inCorso: boolean
  onSbloccato: (operatore: string | null) => void | Promise<void>
  onIndietro: () => void
}) {
  const p = usePalette()
  const [codice, setCodice] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function sblocca() {
    const c = codice.trim()
    if (!c) return
    setErrore(null)
    setInvio(true)
    const r = await sbloccaAssistita(token, c)
    setInvio(false)
    if (!r.ok) {
      colpetto('errore')
      setCodice('')
      return setErrore(r.errore)
    }
    colpetto('ok')
    // Il numero non resta a schermo.
    setCodice('')
    await onSbloccato(r.operatore)
  }

  return (
    <View style={{ gap: spazio.quattro }}>
      <Carta piatta>
        <Text style={{ fontFamily: F.medio, fontSize: 13, lineHeight: 18, color: p.testoSecondario }}>{t('Abbonamento', 'Membership')}</Text>
        <Text style={{ fontFamily: F.extra, fontSize: 20, lineHeight: 26, color: p.testo }}>{nomePiano}</Text>
      </Carta>
      <Testo variante="attenuato">
        {t(
          'Firmi e paghi qui, con una persona dello staff accanto. Chi ti assiste digita il suo codice operatore.',
          'You sign and pay here, with a staff member next to you. Whoever is helping you types their operator code.',
        )}
      </Testo>
      <Campo
        etichetta={t('Codice operatore', 'Operator code')}
        value={codice}
        onChangeText={(v) => setCodice(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        inputMode="numeric"
        secureTextEntry
        autoComplete="off"
        autoCorrect={false}
        onSubmitEditing={sblocca}
        errore={!!errore}
        editable={!invio && !inCorso}
      />
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo={t('Continua', 'Continue')} onPress={sblocca} inCorso={invio || inCorso} disabilitato={!codice.trim()} />
      <Bottone testo={t('Indietro', 'Back')} variante="contorno" onPress={onIndietro} disabilitato={invio || inCorso} />
    </View>
  )
}
