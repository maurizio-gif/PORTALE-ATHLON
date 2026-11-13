import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { ascoltaRichiestaCodiceFiscale, type RichiestaCodiceFiscale } from '@/lib/richiestaCodiceFiscale'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Foglio } from '../ui/Foglio'
import { Messaggio, Pulsante } from '../ui/kit'
import { CorreggiDati } from './CorreggiDati'

// Il foglio che chiede il codice fiscale del figlio quando si prenota nella sezione Junior (13/11/2026). Si apre da solo quando il server dice che
// manca (`lib/richiestaCodiceFiscale.ts`), con la stessa scheda «Correggi i dati» dell'abbonamento: il codice si controlla qui (sedici caratteri,
// carattere di controllo, coerenza con nome, cognome e data di nascita) e dal server (`salva_dati`). Nome, cognome e data non si cambiano da qui:
// se il codice non coincide con la data sulla scheda l'errore lo dice e la correzione e' del club. Salvato il codice si torna a prenotare da sé.
// Si monta una volta sola, nel layout del portale.
export function FoglioCodiceFiscale() {
  const [richiesta, setRichiesta] = useState<RichiestaCodiceFiscale | null>(null)
  const [salvato, setSalvato] = useState(false)

  useEffect(
    () =>
      ascoltaRichiestaCodiceFiscale((r) => {
        setSalvato(false)
        setRichiesta(r)
      }),
    [],
  )

  const chiudi = () => setRichiesta(null)
  const nome = richiesta?.persona.nome?.trim() || t('tuo figlio', 'your child')

  return (
    <Foglio
      aperto={richiesta !== null}
      titolo={t(`Il codice fiscale di ${nome}`, `${nome}’s tax code`)}
      sottotitolo={t('Serve per prenotare: lo chiediamo una volta sola.', 'We need it to book: we only ask once.')}
      onChiudi={chiudi}
    >
      {richiesta && !salvato ? (
        <CorreggiDati
          key={richiesta.persona.member_id}
          persona={richiesta.persona}
          titolo={t('Codice fiscale', 'Tax code')}
          apertoDa
          mancanti={richiesta.mancanti}
          scopo="prenotazione"
          senzaRecapiti
          onSalvato={() => setSalvato(true)}
        />
      ) : null}
      {richiesta && salvato ? (
        <View style={{ gap: spazio.tre }}>
          <Messaggio tono="ok">{t('Codice fiscale salvato. Ora puoi prenotare.', 'Tax code saved. You can book now.')}</Messaggio>
          <Pulsante testo={t('Fatto', 'Done')} onPress={chiudi} />
        </View>
      ) : null}
    </Foglio>
  )
}
