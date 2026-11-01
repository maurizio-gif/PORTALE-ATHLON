import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'

import { confermaDelega, leggiConfermaDelega, type AnteprimaConferma, type CampoDelega } from '@/api/delega'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { CampoData } from '@/components/CampoData'
import { CampoTelefono } from '@/components/CampoTelefono'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { entraConToken, leggiEToglieToken } from '@/features/lab/accessoDalCrm'
import { InCaricamento } from '@/features/link/Stati'
import { t } from '@/lib/lingua'
import { useColori } from '@/theme'

import { maggiorenne, mancantiConferma, type DatiConferma } from './regole'

// Il link nell'email della delega (31/10/2026): l'ultimo passo. **La pagina non conferma da sola**: si apre, dice cosa si sta per
// confermare (chi da' la delega) e chiede un tocco su «Conferma». I programmi che controllano i link delle email non toccano i bottoni,
// e una persona che apre il link per curiosita' non abbina nessuno senza volerlo. Il tocco manda `conferma` a `delega-invito`: e' li' che
// la persona viene abbinata (scheda esistente o nuova, titolare e figli) e che il link della delega si consuma.
//
// **I dati si chiedono qui, a casella verificata, e solo se servono** (01/11/2026, dal test di Sara: il primo passo li chiedeva anche a chi era
// gia' socio): la funzione dice quali (`campi`) dalla scheda che c'e' su PerfectGym. Un socio con la scheda completa tocca «Conferma» e basta;
// con la scheda incompleta si chiede quello che manca (di solito la data di nascita); chi non e' al club scrive nome, cognome, data di nascita
// e cellulare. La funzione ricontrolla alla conferma e, se mancano dati, risponde `serve` senza scrivere niente: la pagina li mostra.

export function ConfermaDelega({ token }: { token: string }) {
  const [anteprima, setAnteprima] = useState<AnteprimaConferma | undefined>(undefined)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [fatto, setFatto] = useState<string | null>(null)
  const [dentro, setDentro] = useState(false)
  const c = useColori()
  const [d, setD] = useState<DatiConferma>({ nome: '', cognome: '', nascita: '', telefono: '' })
  // I dati che la funzione dice di mancare alla conferma (se diversi da quelli letti all'apertura), altrimenti quelli dell'anteprima.
  const [serve, setServe] = useState<CampoDelega[] | null>(null)
  const chiesti: CampoDelega[] = serve ?? anteprima?.campi ?? []
  const cambia = (k: keyof DatiConferma) => (v: string) => setD((x) => ({ ...x, [k]: v }))
  const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
  const minorenne = chiesti.includes('nascita') && !!d.nascita && !maggiorenne(d.nascita, oggi)
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
    if (mancantiConferma(chiesti, d).length) return setErrore(t('Compila i dati qui sotto.', 'Fill in the details below.'))
    if (minorenne) return setErrore(t('Per avere accesso ai figli di un altro serve essere maggiorenni.', 'You must be an adult to get access to someone else’s children.'))
    setAttesa(true)
    // Solo i dati chiesti: gli altri non servono e non si mandano.
    const dati: DatiConferma = {}
    for (const k of chiesti) dati[k] = k === 'nome' || k === 'cognome' ? (d[k] ?? '').trim() : d[k]
    const r = await confermaDelega(token, dati)
    if (!r.ok) {
      setAttesa(false)
      if (r.serve) setServe(r.serve)
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
      {chiesti.length ? (
        <Testo>{t('Per completare ci servono ancora questi dati:', 'To finish we still need these details:')}</Testo>
      ) : null}
      {chiesti.includes('nome') ? <Campo etichetta={t('Nome', 'First name')} value={d.nome ?? ''} onChangeText={cambia('nome')} autoCapitalize="words" autoComplete="given-name" /> : null}
      {chiesti.includes('cognome') ? <Campo etichetta={t('Cognome', 'Last name')} value={d.cognome ?? ''} onChangeText={cambia('cognome')} autoCapitalize="words" autoComplete="family-name" /> : null}
      {chiesti.includes('telefono') ? <CampoTelefono etichetta={t('Cellulare', 'Mobile')} value={d.telefono ?? ''} onChange={cambia('telefono')} sfondo={c.sfondo} /> : null}
      {chiesti.includes('nascita') ? <CampoData etichetta={t('Data di nascita', 'Date of birth')} value={d.nascita ?? ''} onChange={cambia('nascita')} max={oggi} errore={minorenne} sfondo={c.sfondo} /> : null}
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo={t('Conferma', 'Confirm')} onPress={conferma} inCorso={attesa} />
    </Pagina>
  )
}
