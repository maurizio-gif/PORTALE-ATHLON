import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'

import { chiediCodiceEmail, confermaEmail, leggiLinkEmail, type StatoLink } from '@/api/emailAggiorna'
import { emailValida } from '@/api/richieste'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Pagina } from '@/components/Pagina'
import { Forte, Testo } from '@/components/Testo'
import { InCaricamento } from '@/features/link/Stati'
import { t } from '@/lib/lingua'

// La pagina dell'SMS «la casella email e' piena» (06/11/2026, richiesta di Maurizio): una pagina sola, due passi, nessun secondo SMS.
//
//   1. l'indirizzo che ha il problema (mascherato) e un campo per scriverne un altro;
//   2. il codice che arriva **sul nuovo indirizzo** (la prova che e' suo e che la casella funziona), e il cambio e' fatto.
//
// Il link dell'SMS dimostra il cellulare, il codice dimostra la casella: senza il secondo, un refuso che sembra giusto manderebbe il codice di
// accesso all'app a uno sconosciuto. Il resto e' del server (`email-aggiorna`): controllo dell'indirizzo, doppioni, scrittura su PerfectGym. Se
// PerfectGym non accetta il cambio da qui la richiesta resta alla segreteria e la persona lo sa (`fine: 'segreteria'`), non resta con un errore.
// Il link si legge senza consumarlo: si consuma solo confermando il codice.

type Fase = 'carica' | 'guasto' | 'chiuso' | 'email' | 'codice' | 'fine'

export function AggiornaEmail({ token }: { token: string }) {
  const [fase, setFase] = useState<Fase>('carica')
  const [link, setLink] = useState<StatoLink | null>(null)
  const [email, setEmail] = useState('')
  const [dove, setDove] = useState('')
  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [fine, setFine] = useState<{ esito: 'fatto' | 'segreteria'; nuova: string; prova: boolean } | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const inVolo = useRef(false)

  function apri() {
    setFase('carica')
    leggiLinkEmail(token).then((r) => {
      setLink(r)
      setFase(r.esito === 'aperto' ? 'email' : r.esito === 'guasto' ? 'guasto' : 'chiuso')
    })
  }

  useEffect(() => {
    apri()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function mandaCodice(rimanda = false) {
    if (inVolo.current) return
    setErrore(null)
    setAvviso(null)
    if (!emailValida(email)) return setErrore(t('Scrivi un indirizzo email valido.', 'Enter a valid email address.'))
    inVolo.current = true
    setAttesa(true)
    const r = await chiediCodiceEmail(token, email)
    inVolo.current = false
    setAttesa(false)
    if (!r.ok) {
      if (r.scaduto) {
        setLink({ esito: 'chiuso', perche: 'scaduto' })
        return setFase('chiuso')
      }
      return setErrore(r.errore)
    }
    setDove(r.a)
    setCodice('')
    if (rimanda) setAvviso(t('Ti abbiamo mandato un altro codice.', 'We’ve sent you another code.'))
    setFase('codice')
  }

  async function conferma() {
    if (inVolo.current) return
    setErrore(null)
    setAvviso(null)
    if (codice.replace(/\D/g, '').length !== 6) return setErrore(t('Il codice ha sei cifre.', 'The code has six digits.'))
    inVolo.current = true
    setAttesa(true)
    const r = await confermaEmail(token, codice)
    inVolo.current = false
    setAttesa(false)
    if (!r.ok) {
      if (r.scaduto) {
        setLink({ esito: 'chiuso', perche: 'scaduto' })
        return setFase('chiuso')
      }
      setCodice('')
      return setErrore(r.errore)
    }
    setFine({ esito: r.esito, nuova: r.nuova, prova: r.prova })
    setFase('fine')
  }

  if (fase === 'carica') return <InCaricamento testo={t('Stiamo aprendo il tuo link…', 'We’re opening your link…')} />

  if (fase === 'guasto') {
    return (
      <Pagina titolo={t('Non riusciamo ad aprire il link', 'We can’t open the link')} indietro={false}>
        <Testo>{link?.esito === 'guasto' ? link.errore : t('Riprova fra qualche minuto.', 'Please try again in a few minutes.')}</Testo>
        <Bottone testo={t('Riprova', 'Try again')} onPress={apri} />
      </Pagina>
    )
  }

  if (fase === 'chiuso') {
    const perche = link?.esito === 'chiuso' ? link.perche : 'sconosciuto'
    const nuova = link?.esito === 'chiuso' ? link.nuova : undefined
    if (perche === 'completato') {
      return (
        <Pagina titolo={t('L’indirizzo è già aggiornato', 'Your address is already updated')} indietro={false}>
          <Testo>
            {nuova
              ? t(`Da adesso entri nell’app con ${nuova}: ti arriva un codice per email, senza password.`, `From now on you sign in to the app with ${nuova}: you get a code by email, no password needed.`)
              : t('Da adesso entri nell’app con il nuovo indirizzo: ti arriva un codice per email, senza password.', 'From now on you sign in to the app with your new address: you get a code by email, no password needed.')}
          </Testo>
          <Bottone testo={t('Apri l’app', 'Open the app')} onPress={() => router.replace('/')} />
        </Pagina>
      )
    }
    if (perche === 'segreteria') {
      return (
        <Pagina titolo={t('Abbiamo la tua richiesta', 'We have your request')} indietro={false}>
          <Testo>
            {t(
              `Il nuovo indirizzo${nuova ? ` (${nuova})` : ''} è confermato e il cambio sul tuo profilo lo completa la segreteria. Ti scriviamo a quell’indirizzo appena è fatto.`,
              `Your new address${nuova ? ` (${nuova})` : ''} is confirmed and the front desk will complete the change on your profile. We’ll email you there as soon as it’s done.`,
            )}
          </Testo>
        </Pagina>
      )
    }
    return (
      <Pagina titolo={t('Questo link non è più valido', 'This link is no longer valid')} indietro={false}>
        <Testo>
          {t(
            'Il link vale qualche giorno e si usa una volta sola. Se hai ancora bisogno di cambiare il tuo indirizzo email, scrivici a desk@athlonroma.it e ti aiutiamo.',
            'The link is valid for a few days and works once. If you still need to change your email address, write to us at desk@athlonroma.it and we’ll help.',
          )}
        </Testo>
        <Bottone testo={t('Vai all’app', 'Go to the app')} variante="contorno" onPress={() => router.replace('/')} />
      </Pagina>
    )
  }

  if (fase === 'fine' && fine) {
    if (fine.esito === 'segreteria') {
      return (
        <Pagina titolo={t('Richiesta ricevuta', 'Request received')} indietro={false}>
          <Testo>
            {t(
              `Il nuovo indirizzo (${fine.nuova}) è confermato. Il cambio sul tuo profilo lo completa la segreteria: ti scriviamo a quell’indirizzo appena è fatto, e da quel momento entri nell’app.`,
              `Your new address (${fine.nuova}) is confirmed. The front desk will complete the change on your profile: we’ll email you there as soon as it’s done, and from then on you can sign in to the app.`,
            )}
          </Testo>
        </Pagina>
      )
    }
    return (
      <Pagina titolo={t('Fatto!', 'Done!')} sottotitolo={t(`Da adesso entri nell’app con ${fine.nuova}.`, `From now on you sign in to the app with ${fine.nuova}.`)} indietro={false}>
        {fine.prova ? <Avviso tono="attenzione">{t('Questa è una prova: nessun profilo è stato modificato.', 'This is a test: no profile was changed.')}</Avviso> : null}
        <Testo>
          {t(
            'Quando apri l’app scrivi questo indirizzo: ti arriva un codice per email, senza password.',
            'When you open the app, enter this address: you get a code by email, no password needed.',
          )}
        </Testo>
        <Bottone testo={t('Apri l’app', 'Open the app')} onPress={() => router.replace('/')} />
      </Pagina>
    )
  }

  if (fase === 'codice') {
    return (
      <Pagina titolo={t('Controlla la tua email', 'Check your email')} sottotitolo={t(`Abbiamo mandato un codice a ${dove}. Scrivilo qui sotto.`, `We’ve sent a code to ${dove}. Enter it below.`)} indietro={false}>
        {avviso ? <Avviso tono="ok">{avviso}</Avviso> : null}
        <Campo
          etichetta={t('Codice', 'Code')}
          value={codice}
          onChangeText={(v) => setCodice(v.replace(/\D/g, '').slice(0, 6))}
          onSubmitEditing={conferma}
          errore={!!errore}
          inputMode="numeric"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          placeholder="000000"
        />
        {errore ? <Avviso>{errore}</Avviso> : null}
        <Bottone testo={t('Conferma', 'Confirm')} onPress={conferma} inCorso={attesa} disabilitato={codice.length !== 6} />
        <Testo variante="piccolo">{t('Non lo trovi? Guarda nella posta indesiderata: può metterci un paio di minuti.', 'Can’t find it? Check your spam folder: it can take a couple of minutes.')}</Testo>
        <Bottone testo={t('Manda un altro codice', 'Send another code')} variante="contorno" onPress={() => mandaCodice(true)} disabilitato={attesa} />
        <Bottone
          testo={t('Ho sbagliato indirizzo', 'I used the wrong address')}
          variante="contorno"
          onPress={() => {
            setErrore(null)
            setAvviso(null)
            setFase('email')
          }}
          disabilitato={attesa}
        />
      </Pagina>
    )
  }

  const attuale = link?.esito === 'aperto' ? link.attuale : ''
  return (
    <Pagina
      titolo={t('Aggiorna la tua email', 'Update your email')}
      sottotitolo={t('La casella dell’indirizzo che abbiamo per te è piena.', 'The mailbox for the address we have for you is full.')}
      indietro={false}
    >
      <Testo>
        {t('L’indirizzo attuale è ', 'Your current address is ')}
        <Forte>{attuale}</Forte>
        {t(
          ': non possiamo scriverti e non ti arriva il codice per entrare nell’app. Scrivine uno valido: ti mandiamo un codice per confermarlo, e da quel momento entri nell’app con quello.',
          ': we can’t write to you and the code to sign in to the app can’t reach you. Enter a valid one: we’ll send you a code to confirm it, and from then on you sign in to the app with it.',
        )}
      </Testo>
      <Campo
        etichetta={t('Nuovo indirizzo email', 'New email address')}
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => mandaCodice()}
        errore={!!errore}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        placeholder={t('nome@esempio.it', 'name@example.com')}
      />
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo={t('Continua', 'Continue')} onPress={() => mandaCodice()} inCorso={attesa} disabilitato={!email.trim()} />
    </Pagina>
  )
}
