import { useState } from 'react'

import { scriviAlClub } from '@/api/moduli'
import { t } from '@/lib/lingua'

import { CampoTesto } from '../../ui/Campi'
import { Messaggio, Pulsante, SchedeInArrivo } from '../../ui/kit'
import { Cornice, DaDoveParti, Fatto, Pillole, type Opzione } from './Cornice'
import { inVista, useIdentita } from './identita'

// «Scrivi al club»: il modulo a cui portano i link «scrivi a desk@» delle schede
// dell'Help Desk. E' lo stesso «Scrivici» del sito, e arriva allo stesso posto:
// ma qui chi scrive e' gia' riconosciuto, quindi niente email da digitare e niente
// nome da chiedere, e il messaggio e' tutto quello che serve.
//
// Le chiavi degli argomenti sono quelle di `TOPIC_LABELS` in `sito-help-desk`:
// da li' il desk legge l'etichetta intera.

const ARGOMENTI: Opzione[] = [
  { id: 'abbonamento', testo: t('Abbonamento e pagamenti', 'Membership and payments') },
  { id: 'prenotazioni', testo: t('Prenotazioni e disdette', 'Bookings and cancellations') },
  { id: 'sospensione', testo: t('Sospensione o disdetta', 'Freeze or cancellation') },
  { id: 'certificato', testo: t('Certificato medico', 'Medical certificate') },
  { id: 'corsi', testo: t('Corsi, orari e cambio turno', 'Courses, times and group changes') },
  { id: 'scuola-nuoto', testo: t('Scuola nuoto bambini', 'Scuola Nuoto Bambini (kids’ swimming)') },
  { id: 'struttura', testo: t('Struttura e accessi', 'Facilities and access') },
  { id: 'altro', testo: t('Altro', 'Other') },
]

/** L'argomento che un link porta: «disdetta» e' il mestiere di `sospensione`. */
function argomentoDa(valore: string): string | null {
  if (valore === 'disdetta') return 'sospensione'
  return ARGOMENTI.some((a) => a.id === valore) ? valore : null
}

const MINIMO = 10

export function ScriviAlClub({ emailAccesso, argomentoIniziale = '' }: { emailAccesso?: string | null; argomentoIniziale?: string }) {
  const identita = useIdentita(emailAccesso)
  const [argomento, setArgomento] = useState<string | null>(argomentoDa(argomentoIniziale))
  const [messaggio, setMessaggio] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [fatto, setFatto] = useState(false)

  async function invia() {
    if (!identita || inCorso) return
    setErrore(null)
    if (messaggio.trim().length < MINIMO) return setErrore(t('Scrivici due righe: serve a chi ti risponde.', 'Write us a couple of lines: it helps whoever answers you.'))
    setInCorso(true)
    const esito = await scriviAlClub({
      email: identita.email,
      nome: identita.nome,
      cognome: identita.cognome,
      numero: identita.numero,
      messaggio: messaggio.trim(),
      argomento: argomento ?? 'altro',
    })
    setInCorso(false)
    if (esito.ok) return setFatto(true)
    setErrore(esito.errore)
  }

  if (fatto) {
    return (
      <Cornice sopratitolo={t('Il club', 'The club')} titolo={t('Scrivi al club', 'Write to the club')}>
        <Fatto titolo={t('Messaggio inviato', 'Message sent')}>{t(`Il desk lo legge e ti risponde via email a ${identita?.email ?? 'il tuo indirizzo'}.`, `The front desk will read it and reply by email to ${identita?.email ?? 'your address'}.`)}</Fatto>
      </Cornice>
    )
  }

  return (
    <Cornice sopratitolo={t('Il club', 'The club')} titolo={t('Scrivi al club', 'Write to the club')} sottotitolo={t('Racconta cosa ti serve: il desk ti risponde via email.', 'Tell us what you need: the front desk will reply by email.')}>
      {!identita ? (
        <SchedeInArrivo quante={1} />
      ) : (
        <>
          <Pillole etichetta={t('Di cosa si tratta', 'What it’s about')} opzioni={ARGOMENTI} valore={argomento} onScegli={setArgomento} />
          <CampoTesto
            etichetta={t('Il tuo messaggio', 'Your message')}
            value={messaggio}
            onChangeText={setMessaggio}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            numberOfLines={6}
            maxLength={4000}
            style={{ minHeight: 140, textAlignVertical: 'top' }}
            placeholder={t('Cosa è successo, di quale lezione o abbonamento parli, da quando', 'What happened, which class or membership, since when')}
          />
          <DaDoveParti email={identita.email} />
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Invia il messaggio', 'Send message')} icona="invia" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
        </>
      )}
    </Cornice>
  )
}
