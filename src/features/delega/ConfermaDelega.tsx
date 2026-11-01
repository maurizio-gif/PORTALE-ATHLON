import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'

import { confermaDelega, leggiConfermaDelega, type AnteprimaConferma } from '@/api/delega'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { entraConToken, leggiEToglieToken } from '@/features/lab/accessoDalCrm'
import { InCaricamento } from '@/features/link/Stati'
import { t } from '@/lib/lingua'

// Il link nell'email della delega (31/10/2026): l'ultimo passo. **La pagina non conferma da sola**: si apre, dice cosa si sta per
// confermare (chi da' la delega) e chiede un tocco su «Conferma». I programmi che controllano i link delle email non toccano i bottoni,
// e una persona che apre il link per curiosita' non abbina nessuno senza volerlo. Il tocco manda `conferma` a `delega-invito`: e' li' che
// la persona viene abbinata (scheda esistente o nuova, titolare e figli) e che il link della delega si consuma.

export function ConfermaDelega({ token }: { token: string }) {
  const [anteprima, setAnteprima] = useState<AnteprimaConferma | undefined>(undefined)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [fatto, setFatto] = useState<string | null>(null)
  const [dentro, setDentro] = useState(false)
  // L'email porta anche un accesso all'app (`#th=…` nel link). Si legge e si toglie dall'indirizzo subito, ma si usa solo dopo «Conferma».
  const accesso = useRef<string | null>(null)

  useEffect(() => {
    accesso.current = leggiEToglieToken()
  }, [])

  useEffect(() => {
    let vivo = true
    leggiConfermaDelega(token).then((r) => {
      if (vivo) setAnteprima(r)
    })
    return () => {
      vivo = false
    }
  }, [token])

  async function conferma() {
    setErrore(null)
    setAttesa(true)
    const r = await confermaDelega(token)
    if (!r.ok) {
      setAttesa(false)
      return setErrore(r.errore)
    }
    // Confermata: ora si entra nell'app con l'accesso dell'email, se c'e' e vale ancora (un'ora). Se no, resta la pagina di accesso.
    setDentro(accesso.current ? await entraConToken(accesso.current) : false)
    accesso.current = null
    setAttesa(false)
    setFatto(r.nome || anteprima?.delegato || '')
  }

  if (anteprima === undefined) return <InCaricamento testo={t('Un attimo…', 'Just a moment…')} />

  if (fatto !== null) {
    return (
      <Pagina
        titolo={fatto ? t(`Fatto, ${fatto}`, `Done, ${fatto}`) : t('Fatto', 'Done')}
        sottotitolo={t('Ora puoi vedere e gestire i figli di chi ti ha invitato.', 'You can now see and manage the children of the person who invited you.')}
        indietro={false}
      >
        <Testo>
          {dentro
            ? t(
                'Sei già dentro l’app. Trovi i bambini nella sezione Famiglia della Home e puoi prenotare, disdire e pagare per loro.',
                'You’re already signed in to the app. You’ll find the children in the Family section of the Home screen and you can book, cancel and pay for them.',
              )
            : t(
            'Entra nell’app con questa stessa email: nell’email di conferma trovi il codice di accesso (tocca «Ho già un codice» e scrivilo); se è scaduto, ne chiedi uno nuovo dalla stessa pagina. Trovi i bambini nella sezione Famiglia della Home e puoi prenotare, disdire e pagare per loro.',
            'Sign in to the app with this same email: you’ll find the access code in the confirmation email (tap “I already have a code” and enter it); if it has expired, you can request a new one on the same page. You’ll find the children in the Family section of the Home screen and you can book, cancel and pay for them.',
          )}
        </Testo>
        <Testo variante="attenuato">{t('Se i bambini non compaiono subito, riprova fra qualche minuto: il club aggiorna i dati ogni poco.', 'If the children don’t show up right away, try again in a few minutes: the club updates its data regularly.')}</Testo>
        <Bottone testo={t('Entra nell’app', 'Open the app')} onPress={() => router.replace('/')} />
      </Pagina>
    )
  }

  if (!anteprima.valido) {
    return (
      <Pagina titolo={t('Questo link non è più valido', 'This link is no longer valid')} indietro={false}>
        <Testo>{t('Il link nell’email vale 24 ore e si usa una volta sola. Se non hai ancora confermato, apri di nuovo il link dell’invito e rifai il modulo, oppure chiedi a chi ti ha invitato di mandartene uno nuovo.', 'The link in the email is valid for 24 hours and works once. If you haven’t confirmed yet, open the invitation link again and redo the form, or ask the person who invited you to send a new one.')}</Testo>
        <Bottone testo={t('Vai all’app', 'Go to the app')} variante="contorno" onPress={() => router.replace('/')} />
      </Pagina>
    )
  }

  const chi = anteprima.nome
  return (
    <Pagina
      titolo={chi ? t(`Conferma l’accesso ai figli di ${chi}`, `Confirm access to ${chi}’s children`) : t('Conferma l’accesso ai figli', 'Confirm access to the children')}
      sottotitolo={t(
        `${anteprima.delegato ? `${anteprima.delegato}, toccando` : 'Toccando'} «Conferma» ti colleghiamo a ${chi ?? 'chi ti ha invitato'} e ai suoi bambini: potrai vedere e gestire per loro lezioni, prenotazioni, pagamenti e certificato.`,
        `${anteprima.delegato ? `${anteprima.delegato}, by tapping` : 'By tapping'} “Confirm” we link you to ${chi ?? 'the person who invited you'} and their children: you’ll be able to see and manage their classes, bookings, payments and certificate.`,
      )}
      indietro={false}
    >
      <Testo variante="attenuato">{t('Se non sei stato tu a chiederlo, chiudi questa pagina: senza la conferma non succede niente.', 'If you didn’t ask for this, just close this page: nothing happens without your confirmation.')}</Testo>
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo={t('Conferma', 'Confirm')} onPress={conferma} inCorso={attesa} />
    </Pagina>
  )
}
