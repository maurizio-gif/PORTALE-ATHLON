import { useEffect, useState } from 'react'
import { Platform, View } from 'react-native'

import { ascoltaRichiestaCodiceFiscale, type RichiestaCodiceFiscale } from '@/lib/richiestaCodiceFiscale'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { scorda } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Messaggio, Pulsante } from '../ui/kit'
import { CorreggiDati } from './CorreggiDati'

// Il foglio che chiede il codice fiscale del figlio quando si prenota nella sezione Junior (13/11/2026). Si apre da solo quando il server dice che
// manca (`lib/richiestaCodiceFiscale.ts`), con la stessa scheda «Correggi i dati» dell'abbonamento: il codice si controlla qui (sedici caratteri,
// carattere di controllo, coerenza con nome, cognome e data di nascita) e dal server (`salva_dati`). Nome, cognome e data non si cambiano da qui:
// se il codice non coincide con la data sulla scheda l'errore lo dice e la correzione e' del club. Salvato il codice si torna a prenotare da sé.
// Si monta nel layout del portale, e in piu' dentro la chat dell'assistente mentre e' aperta (14/11/2026, `dentro`): su iOS un `Modal` non si apre sopra un
// altro `Modal` gia' aperto, e la chat (dove `PrenotaDaChat` prenota) lo e': il genitore leggeva «scrivilo» senza un campo dove scriverlo. Finche' quello
// dentro la chat e' montato la richiesta va a lui (`lib/richiestaCodiceFiscale`). Su Android nativo il foglio non e' un `Modal` ma un livello nella
// finestra dell'app, che la tastiera alza (`ui/Foglio`, `livello`): da Android 16 la finestra di un `Modal` non si ridimensiona piu' e la tastiera
// copriva il campo.
export function FoglioCodiceFiscale({ dentro = false }: { /** Montato dentro un'altra finestra aperta (la chat dell'assistente): niente `Modal`. */ dentro?: boolean }) {
  const [richiesta, setRichiesta] = useState<RichiestaCodiceFiscale | null>(null)
  const [salvato, setSalvato] = useState(false)

  useEffect(
    () =>
      ascoltaRichiestaCodiceFiscale(
        (r) => {
          setSalvato(false)
          setRichiesta(r)
        },
        { dentro },
      ),
    [dentro],
  )

  const chiudi = () => setRichiesta(null)
  const nome = richiesta?.persona.nome?.trim() || t('tuo figlio', 'your child')
  // Aperto dal genitore dalla carta «I dati di …» della sezione Junior (14/11/2026): niente «serve per prenotare», e il codice gia' scritto si corregge.
  const modifica = richiesta?.motivo === 'modifica'

  return (
    <Foglio
      aperto={richiesta !== null}
      titolo={t(`Il codice fiscale di ${nome}`, `${nome}’s tax code`)}
      sottotitolo={
        modifica
          ? t('Serve per prenotare le lezioni e per i contratti.', 'We need it to book classes and for contracts.')
          : t('Serve per prenotare: lo chiediamo una volta sola.', 'We need it to book: we only ask once.')
      }
      onChiudi={chiudi}
      livello={dentro || Platform.OS === 'android'}
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
          onSalvato={() => {
            // La memoria della Home (`area`) ha ancora il codice di prima: la sezione Famiglia e la carta della sezione Junior lo rileggono.
            scorda('area')
            setSalvato(true)
            richiesta.onSalvato?.()
          }}
        />
      ) : null}
      {richiesta && salvato ? (
        <View style={{ gap: spazio.tre }}>
          <Messaggio tono="ok">
            {modifica ? t('Codice fiscale salvato.', 'Tax code saved.') : t('Codice fiscale salvato. Ora puoi prenotare.', 'Tax code saved. You can book now.')}
          </Messaggio>
          <Pulsante testo={t('Fatto', 'Done')} onPress={chiudi} />
        </View>
      ) : null}
    </Foglio>
  )
}
