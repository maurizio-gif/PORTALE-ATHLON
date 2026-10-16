import { useState } from 'react'

import { scriviAlClub } from '@/api/moduli'

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
  { id: 'abbonamento', testo: 'Abbonamento e pagamenti' },
  { id: 'prenotazioni', testo: 'Prenotazioni e disdette' },
  { id: 'sospensione', testo: 'Sospensione o disdetta' },
  { id: 'certificato', testo: 'Certificato medico' },
  { id: 'corsi', testo: 'Corsi, orari e cambio turno' },
  { id: 'scuola-nuoto', testo: 'Scuola nuoto bambini' },
  { id: 'struttura', testo: 'Struttura e accessi' },
  { id: 'altro', testo: 'Altro' },
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
    if (messaggio.trim().length < MINIMO) return setErrore('Scrivici due righe: serve a chi ti risponde.')
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
      <Cornice sopratitolo="Il club" titolo="Scrivi al club">
        <Fatto titolo="Messaggio inviato">{`Il desk lo legge e ti risponde via email a ${identita?.email ?? 'il tuo indirizzo'}.`}</Fatto>
      </Cornice>
    )
  }

  return (
    <Cornice sopratitolo="Il club" titolo="Scrivi al club" sottotitolo="Racconta cosa ti serve: il desk ti risponde via email.">
      {!identita ? (
        <SchedeInArrivo quante={1} />
      ) : (
        <>
          <Pillole etichetta="Di cosa si tratta" opzioni={ARGOMENTI} valore={argomento} onScegli={setArgomento} />
          <CampoTesto
            etichetta="Il tuo messaggio"
            value={messaggio}
            onChangeText={setMessaggio}
            multiline
            numberOfLines={6}
            maxLength={4000}
            style={{ minHeight: 140, textAlignVertical: 'top' }}
            placeholder="Cosa è successo, di quale lezione o abbonamento parli, da quando"
          />
          <DaDoveParti email={identita.email} />
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo="Invia il messaggio" icona="invia" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
        </>
      )}
    </Cornice>
  )
}
