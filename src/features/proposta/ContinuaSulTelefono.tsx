import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import {
  creaPropostaDaSessione,
  rinnovaQrProposta,
  statoProposta,
  type ErroreProposta,
  type ModalitaProposta,
  type PropostaCreata,
} from '@/api/proposta'
import { anteprimaAbbonamento, type PersonaDati } from '@/api/abbonamento'
import { CodiceQr } from '@/components/CodiceQr'
import { CorreggiDati } from '@/features/lab/abbonamento/CorreggiDati'
import { uscitaTotem } from '@/features/lab/totem/uscita'
import { Icona } from '@/features/lab/ui/Icona'
import { Carta, Messaggio, Pulsante, Sezione } from '@/features/lab/ui/kit'
import { F, usePalette } from '@/features/lab/ui/tema'
import { colpetto, Tocco } from '@/features/lab/ui/Tocco'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { AssistitaTotem } from './AssistitaTotem'

// «Continua sul telefono» (totem, 02/11/2026). Sul totem la persona e' dentro con il suo login (il codice via email) e ha scelto cosa
// comprare con le schermate di sempre. Quando arriva alla firma sceglie come finire, e **qui nasce la proposta** (`proposta_crea`):
//
//   - QR        il codice e' sul totem, la persona lo inquadra col telefono e firma e paga li' (data di nascita, giorno, contratto, firma,
//               pagamento). Il totem aspetta e lo dice quando e' finita. Il QR dura pochi minuti e si rinnova da solo, finche' nessuno l'ha aperto;
//   - email     lo stesso link arriva all'indirizzo del suo account. Sul totem non compare: il link non deve restare su uno schermo pubblico;
//   - assistita continua qui, sul totem, con un operatore accanto che digita il suo user number (`AssistitaTotem`).
//
// Quello che conta lo decide il server: l'idoneita', i dati del contratto, il giorno, gli importi. Qui si scelgono tre strade e si mostra
// quella presa. **Il token resta nella memoria di questa schermata**: niente storage, niente indirizzo, niente log (il totem e' di tutti).

/** Quanto prima della scadenza il QR si rinnova da solo (mai a link aperto: vedi `rinnovaQrProposta`). */
const RINNOVO_ANTICIPO_MS = 45_000
const PAUSA_STATO_MS = 3000

type Vista =
  | { v: 'scelta' }
  | { v: 'creo'; modalita: ModalitaProposta }
  | { v: 'errore'; errore: ErroreProposta }
  | { v: 'dati'; modalita: ModalitaProposta }
  | { v: 'qr'; proposta: PropostaCreata }
  | { v: 'email'; proposta: PropostaCreata }
  | { v: 'assistita'; proposta: PropostaCreata }

export type DatiProposta = {
  membro: number
  pianoId: number
  inizio: string | null
  /** «Premium · Mensile Flex»: per riconoscere cosa si sta comprando. */
  nomePiano: string
  /** L'indirizzo dell'account, per dire dove e' arrivata l'email. */
  email: string | null
}

export function ContinuaSulTelefono({ dati, onIndietro }: { dati: DatiProposta; onIndietro: () => void }) {
  const p = usePalette()
  const [vista, setVista] = useState<Vista>({ v: 'scelta' })
  // Quante volte di fila i dati mancanti sono tornati: dopo tre la maschera non basta (un dato che da qui non si corregge) e si dice, invece di girare in tondo.
  const giriDati = useRef(0)

  const crea = useCallback(
    async (modalita: ModalitaProposta) => {
      colpetto('scelta')
      setVista({ v: 'creo', modalita })
      const r = await creaPropostaDaSessione({ member_id: dati.membro, piano_id: dati.pianoId, data_inizio: dati.inizio, modalita })
      if (!r.ok) {
        colpetto('errore')
        // Mancano dati sulla scheda: si correggono qui, sul totem, e si riprende (non si manda la persona altrove).
        if (r.motivo === 'dati_mancanti' && giriDati.current < 3) {
          giriDati.current += 1
          return setVista({ v: 'dati', modalita })
        }
        return setVista({ v: 'errore', errore: r })
      }
      giriDati.current = 0
      setVista({ v: modalita, proposta: r.proposta } as Vista)
    },
    [dati.membro, dati.pianoId, dati.inizio],
  )

  if (vista.v === 'creo') {
    return (
      <Carta piatta>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>
          {vista.modalita === 'email' ? t('Ti mando l’email…', 'Sending the email…') : t('Prepariamo la proposta…', 'Preparing the offer…')}
        </Text>
      </Carta>
    )
  }

  if (vista.v === 'dati') {
    return (
      <CompletaDati
        membro={dati.membro}
        pianoId={dati.pianoId}
        inizio={dati.inizio}
        onCompleti={() => void crea(vista.modalita)}
        onIndietro={() => setVista({ v: 'scelta' })}
      />
    )
  }

  if (vista.v === 'errore') {
    return <ErrorePreparazione errore={vista.errore} onRiprova={() => setVista({ v: 'scelta' })} onIndietro={onIndietro} />
  }

  if (vista.v === 'qr') {
    return <QrTotem proposta={vista.proposta} nomePiano={dati.nomePiano} onAltraStrada={() => setVista({ v: 'scelta' })} onRicrea={() => crea('qr')} />
  }

  if (vista.v === 'email') {
    return <EmailInviata email={dati.email} onAltraStrada={() => setVista({ v: 'scelta' })} />
  }

  if (vista.v === 'assistita') {
    return <AssistitaTotem proposta={vista.proposta} inizio={dati.inizio} nomePiano={dati.nomePiano} onIndietro={() => setVista({ v: 'scelta' })} />
  }

  return (
    <View style={{ gap: spazio.quattro }}>
      <Carta piatta>
        <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{t('Stai per comprare', 'You’re about to buy')}</Text>
        <Text style={[stili.piano, { color: p.testo }]}>{dati.nomePiano}</Text>
      </Carta>

      <Sezione titolo={t('Come vuoi firmare e pagare?', 'How would you like to sign and pay?')}>
        <View style={{ gap: spazio.tre }}>
          <Strada
            icona="telefono"
            titolo={t('Dal tuo telefono (QR)', 'On your phone (QR code)')}
            testo={t('Inquadri il codice e firmi e paghi dal telefono. Ti serve la tua data di nascita.', 'Scan the code and sign and pay from your phone. You’ll need your date of birth.')}
            onPress={() => crea('qr')}
          />
          <Strada
            icona="email"
            titolo={t('Ricevi il link per email', 'Get the link by email')}
            testo={t('Ti mandiamo il link: lo apri quando vuoi, anche a casa, e finisci da lì.', 'We’ll email you the link: open it whenever you like, even at home, and finish from there.')}
            onPress={() => crea('email')}
          />
          <Strada
            icona="persona"
            titolo={t('Continua qui con un operatore', 'Carry on here with a staff member')}
            testo={t('Firmi e paghi su questo schermo, con una persona dello staff accanto.', 'You sign and pay on this screen, with a staff member next to you.')}
            onPress={() => crea('assistita')}
          />
        </View>
      </Sezione>

      <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo pieno={false} onPress={onIndietro} />
    </View>
  )
}

function Strada({ icona, titolo, testo, onPress }: { icona: 'telefono' | 'email' | 'persona'; titolo: string; testo: string; onPress: () => void }) {
  const p = usePalette()
  return (
    <Tocco vibra="scelta" etichetta={titolo} onPress={onPress} style={[stili.strada, { backgroundColor: p.carta, borderColor: p.linea }]}>
      <View style={[stili.iconaStrada, { backgroundColor: p.accento }]}>
        <Icona nome={icona} size={26} colore="#fff" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[stili.titoloStrada, { color: p.testo }]}>{titolo}</Text>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>{testo}</Text>
      </View>
    </Tocco>
  )
}

// ---------------------------------------------------------------------------
// I dati che mancano sulla scheda (03/11/2026, dal totem: «redirect sulla parte da aggiornare, cosi' la vedo e la aggiorno»)
//
// La proposta si compone coi dati che PerfectGym ha gia' (codice fiscale, indirizzo, telefono): se ne manca uno il server risponde `dati_mancanti`. Prima
// la schermata mandava a «completali dal Profilo»; ora mostra qui la stessa maschera dell'acquisto di sempre (`CorreggiDati`, aperta, col suo elenco di
// quello che serve) e, salvato, riprende da sola con la strada scelta. L'elenco e le persone da correggere le dice `anteprima`, la stessa del flusso normale.

/** Oggi, a Roma, come `AAAA-MM-GG`. */
function oggiRoma(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function CompletaDati({ membro, pianoId, inizio, onCompleti, onIndietro }: { membro: number; pianoId: number; inizio: string | null; onCompleti: () => void; onIndietro: () => void }) {
  const p = usePalette()
  const [persone, setPersone] = useState<PersonaDati[] | null>(null)
  const [mancanti, setMancanti] = useState<string[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    let vivo = true
    setErrore(null)
    setPersone(null)
    anteprimaAbbonamento({ member_id: membro, piano_id: pianoId, data_inizio: inizio ?? oggiRoma() }).then((r) => {
      if (!vivo) return
      // Il contratto si compone: i dati ci sono (li ha completati qualcuno nel frattempo). Si riprende.
      if (r.ok) return onCompleti()
      if (r.persone_dati?.length) {
        setPersone(r.persone_dati)
        setMancanti(r.mancanti ?? [])
      } else {
        setErrore(r.errore)
      }
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membro, pianoId, inizio, giro])

  if (errore) {
    return (
      <View style={{ gap: spazio.quattro }}>
        <Messaggio tono="attenzione" titolo={t('Non riusciamo a leggere i tuoi dati', 'We can’t read your details')}>
          {errore}
        </Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} onPress={() => setGiro((g) => g + 1)} />
        <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo pieno={false} onPress={onIndietro} />
      </View>
    )
  }
  if (!persone) {
    return (
      <Carta piatta>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>{t('Controlliamo i tuoi dati…', 'Checking your details…')}</Text>
      </Carta>
    )
  }
  return (
    <View style={{ gap: spazio.quattro }}>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>
        {t('Per il contratto servono dei dati che mancano sulla tua scheda. Completali qui: poi si va avanti da solo.', 'The contract needs some details that are missing from your profile. Fill them in here: then it carries on by itself.')}
      </Text>
      {persone.map((d) => (
        <CorreggiDati
          key={`${d.member_id}-${d.codice_fiscale}-${d.paese}-${d.telefono}-${d.indirizzo?.via}-${d.indirizzo?.cap}`}
          persona={d}
          titolo={d.ruolo === 'genitore' ? t('Dati del genitore che firma', 'Details of the signing parent') : t('I tuoi dati', 'Your details')}
          apertoDa
          mancanti={mancanti}
          // Dopo il salvataggio si rilegge: se manca ancora qualcosa (un'altra persona, un altro dato) la maschera riparte da quello.
          onSalvato={() => setGiro((g) => g + 1)}
        />
      ))}
      <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo pieno={false} onPress={onIndietro} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Quando la proposta non nasce

function ErrorePreparazione({ errore, onRiprova, onIndietro }: { errore: ErroreProposta; onRiprova: () => void; onIndietro: () => void }) {
  const mancanti = errore.motivo === 'dati_mancanti'
  return (
    <View style={{ gap: spazio.quattro }}>
      <Messaggio tono="attenzione" titolo={mancanti ? t('Mancano dei dati sulla tua scheda', 'Some details are missing from your profile') : t('Non riusciamo a continuare', 'We can’t continue')}>
        {errore.errore}
        {mancanti
          ? ` ${t('Completali dal Profilo, oppure chiedi in segreteria: poi riprendi da qui.', 'Complete them in your Profile, or ask the front desk: then pick up from here.')}`
          : errore.motivo === 'non_attivo' || errore.motivo === 'rete'
            ? ''
            : ` ${t('Se serve, chiedi in segreteria.', 'If you need to, ask the front desk.')}`}
      </Messaggio>
      {mancanti && errore.mancanti?.length ? <Text style={stili.nota}>{errore.mancanti.join(', ')}</Text> : null}
      <Pulsante testo={t('Scegli di nuovo', 'Choose again')} onPress={onRiprova} />
      <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo pieno={false} onPress={onIndietro} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// L'email

function EmailInviata({ email, onAltraStrada }: { email: string | null; onAltraStrada: () => void }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.quattro }}>
      <Messaggio tono="ok" titolo={t('Email inviata', 'Email sent')} icona="ok">
        {email
          ? t(`Ti abbiamo scritto a ${email}. Apri il link, scrivi la tua data di nascita e finisci da lì: contratto, firma e pagamento.`, `We’ve emailed ${email}. Open the link, enter your date of birth and finish from there: contract, signature and payment.`)
          : t('Ti abbiamo mandato l’email. Apri il link, scrivi la tua data di nascita e finisci da lì: contratto, firma e pagamento.', 'We’ve sent you the email. Open the link, enter your date of birth and finish from there: contract, signature and payment.')}
      </Messaggio>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t('Il link vale tre giorni. Se non arriva, guarda anche nella posta indesiderata, oppure scegli un’altra strada.', 'The link is valid for three days. If it doesn’t arrive, check your spam folder too, or choose another way.')}
      </Text>
      <Pulsante testo={t('Ho finito, esco', 'I’m done, sign out')} onPress={() => void uscitaTotem()} />
      <Pulsante testo={t('Scegli un’altra strada', 'Choose another way')} variante="fantasma" piccolo pieno={false} onPress={onAltraStrada} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Il QR

function QrTotem({ proposta, nomePiano, onAltraStrada, onRicrea }: { proposta: PropostaCreata; nomePiano: string; onAltraStrada: () => void; onRicrea: () => void }) {
  const p = usePalette()
  // Il token vive solo qui, in memoria. Il rinnovo lo cambia: lo stato lo legge sempre con quello di adesso.
  const token = useRef<string | null>(proposta.token)
  const [url, setUrl] = useState<string | null>(proposta.url)
  const [scadeIl, setScadeIl] = useState<number>(Date.parse(proposta.token_scade_il))
  const [fatto, setFatto] = useState<'firmata' | 'pagata' | null>(null)
  const [aperto, setAperto] = useState(false)
  const [scaduto, setScaduto] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const ferma = useRef(false)

  useEffect(() => {
    ferma.current = false
    let timer: ReturnType<typeof setTimeout>

    async function giro() {
      if (ferma.current || !token.current) return
      const s = await statoProposta(token.current)
      if (ferma.current) return
      if (s.ok) {
        setErrore(null)
        if (s.stato.pagata) return setFatto('pagata')
        if (s.stato.firmata) setFatto('firmata')
        setAperto(s.stato.linkAperto)
        // Rinnovo: poco prima della scadenza, e solo se nessuno ha aperto il link (cambiare il token lascerebbe un link morto a chi lo ha aperto).
        const scade = s.stato.tokenScadeIl ? Date.parse(s.stato.tokenScadeIl) : null
        if (!s.stato.linkAperto && !s.stato.firmata && scade && scade - Date.now() <= RINNOVO_ANTICIPO_MS) {
          const n = await rinnovaQrProposta(token.current)
          if (ferma.current) return
          if (n.ok) {
            token.current = n.token
            setScadeIl(Date.parse(n.token_scade_il))
            // L'indirizzo ha lo stesso aspetto di prima, con il token nuovo.
            setUrl((vecchio) => (vecchio ? vecchio.replace(/\/r\/[^/?#]+/, `/r/${n.token}`) : vecchio))
          } else if (n.motivo === 'token_scaduto') {
            return setScaduto(true)
          }
        }
      } else if (s.motivo === 'annullata' || s.motivo === 'proposta_scaduta') {
        return setScaduto(true)
      } else {
        setErrore(s.errore)
      }
      timer = setTimeout(giro, PAUSA_STATO_MS)
    }
    timer = setTimeout(giro, PAUSA_STATO_MS)
    return () => {
      ferma.current = true
      clearTimeout(timer)
    }
  }, [])

  // Una proposta ripresa puo' avere il link gia' segnato come aperto: se il QR scade senza che nessuno lo usi, se ne chiede uno nuovo.
  const [adesso, setAdesso] = useState(() => Date.now())
  useEffect(() => {
    const i = setInterval(() => setAdesso(Date.now()), 5000)
    return () => clearInterval(i)
  }, [])
  const morto = scaduto || (!aperto && !fatto && adesso > scadeIl + 5000)

  if (fatto) {
    return (
      <View style={{ gap: spazio.quattro }}>
        <Messaggio tono="ok" titolo={fatto === 'pagata' ? t('Tutto fatto', 'All done') : t('Contratto firmato', 'Contract signed')} icona="ok">
          {fatto === 'pagata'
            ? t('Il contratto è firmato e il pagamento è arrivato. Il tuo abbonamento è attivo.', 'The contract is signed and the payment has arrived. Your membership is active.')
            : t('Il contratto è firmato. Per finire scegli come pagare dal tuo telefono: qui non devi fare altro.', 'The contract is signed. To finish, choose how to pay on your phone: there’s nothing more to do here.')}
        </Messaggio>
        <Pulsante testo={t('Ho finito, esco', 'I’m done, sign out')} onPress={() => void uscitaTotem()} />
      </View>
    )
  }

  return (
    <View style={{ gap: spazio.quattro }}>
      <Carta piatta>
        <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{t('Abbonamento', 'Membership')}</Text>
        <Text style={[stili.piano, { color: p.testo }]}>{nomePiano}</Text>
      </Carta>

      {morto ? (
        <View style={{ gap: spazio.tre }}>
          <Messaggio tono="attenzione" titolo={t('Il codice è scaduto', 'The code has expired')}>
            {t('Per sicurezza il codice dura pochi minuti. Ne prepariamo uno nuovo.', 'For safety the code only lasts a few minutes. We’ll prepare a new one.')}
          </Messaggio>
          <Pulsante testo={t('Nuovo codice', 'New code')} onPress={onRicrea} />
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: spazio.tre }}>
          {url ? <CodiceQr testo={url} size={300} etichetta={t('Codice QR per continuare dal telefono', 'QR code to continue on your phone')} /> : null}
          <Text style={[stili.titoloStrada, { color: p.testo, textAlign: 'center' }]}>
            {aperto ? t('Continua dal tuo telefono', 'Carry on from your phone') : t('Inquadra il codice con il telefono', 'Scan the code with your phone')}
          </Text>
          <Text style={[stili.testo, { color: p.testoSecondario, textAlign: 'center' }]}>
            {aperto
              ? t('Hai aperto la proposta. Scrivi la data di nascita, leggi il contratto, firma e paga: qui aspettiamo.', 'You’ve opened the offer. Enter your date of birth, read the contract, sign and pay: we’ll wait here.')
              : t('Apri la fotocamera e inquadralo: ti si apre la proposta. Ti chiederà la tua data di nascita.', 'Open your camera and point it at the code: the offer opens. It will ask for your date of birth.')}
          </Text>
        </View>
      )}

      {errore ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{errore}</Text> : null}

      <Pulsante testo={t('Ho finito, esco', 'I’m done, sign out')} variante="secondario" onPress={() => void uscitaTotem()} />
      <Pulsante testo={t('Scegli un’altra strada', 'Choose another way')} variante="fantasma" piccolo pieno={false} onPress={onAltraStrada} />
    </View>
  )
}

const stili = StyleSheet.create({
  piano: { fontFamily: F.extra, fontSize: 20, lineHeight: 26 },
  piccolo: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  testo: { fontFamily: F.normale, fontSize: 14, lineHeight: 20 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  strada: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 88, padding: 14, borderRadius: 18, borderWidth: 1.5 },
  iconaStrada: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  titoloStrada: { fontFamily: F.extra, fontSize: 17, lineHeight: 23 },
})
