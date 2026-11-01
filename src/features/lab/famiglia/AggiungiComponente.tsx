import { router } from 'expo-router'
import { useState } from 'react'

import type { NucleoJunior } from '@/api/junior'
import { t } from '@/lib/lingua'

import { FoglioComponente } from '../junior/FoglioComponente'
import { Foglio } from '../ui/Foglio'
import { Carta, Pulsante, Riga } from '../ui/kit'
import { vistaCorrente } from '../vista'

// «Aggiungi un componente» (31/10/2026, richiesta di Maurizio): lo stesso pulsante nella sezione Famiglia della Home e in Junior.
// Due strade, e il titolare sceglie quale:
//   - **un figlio** (`FoglioComponente`, quello di prima: dati per intero, dichiarazione di genitore o tutore, controllo
//     che non sia gia' registrato al club);
//   - **un altro adulto**: gli si da' la delega sui figli (`/delega`: un link da mandare, come l'invito di un amico).
// Mai in vista cliente: chi guarda l'app di un socio non aggiunge persone al suo nucleo ne' gli da' accessi.

export function AggiungiComponente({
  onAggiunto,
  onApri,
}: {
  /** Un figlio aggiunto: il nome e, se la funzione lo manda, il nucleo aggiornato. */
  onAggiunto: (nome: string, nucleo: NucleoJunior | null) => void
  /** Il pulsante e' stato toccato (chi mostra un messaggio d'esito di prima lo toglie). */
  onApri?: () => void
}) {
  const [scelta, setScelta] = useState(false)
  const [figlio, setFiglio] = useState(false)
  if (vistaCorrente()) return null

  return (
    <>
      <Pulsante
        testo={t('Aggiungi un componente', 'Add a family member')}
        icona="aggiungi"
        variante="secondario"
        onPress={() => {
          onApri?.()
          setScelta(true)
        }}
      />

      <Foglio
        aperto={scelta}
        onChiudi={() => setScelta(false)}
        titolo={t('Chi vuoi aggiungere?', 'Who do you want to add?')}
        sottotitolo={t('Un figlio entra nel tuo nucleo. Un altro adulto può vedere e gestire i tuoi figli con te.', 'A child joins your family. Another adult can see and manage your children with you.')}
      >
        <Carta>
          <Riga
            prima
            icona="persona"
            tono="accento"
            titolo={t('Un figlio', 'A child')}
            sotto={t('Lo aggiungi con i suoi dati. Controlliamo che non sia già registrato al club.', 'You add them with their details. We check they’re not already registered at the club.')}
            onPress={() => {
              setScelta(false)
              setFiglio(true)
            }}
          />
          <Riga
            icona="famiglia"
            tono="accento"
            titolo={t('Un altro adulto', 'Another adult')}
            sotto={t('Gli dai accesso ai tuoi figli, come una delega: gli mandi un link e si registra.', 'You give them access to your children, like a delegation: you send a link and they sign up.')}
            onPress={() => {
              setScelta(false)
              router.navigate('/delega')
            }}
          />
        </Carta>
      </Foglio>

      <FoglioComponente
        aperto={figlio}
        onChiudi={() => setFiglio(false)}
        onAggiunto={(nome, nucleo) => {
          setFiglio(false)
          onAggiunto(nome, nucleo)
        }}
      />
    </>
  )
}
