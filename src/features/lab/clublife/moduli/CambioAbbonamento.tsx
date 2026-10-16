import { useState } from 'react'
import { Text, View } from 'react-native'

import { richiediCambioAbbonamento } from '@/api/moduli'
import { CampoData } from '@/components/CampoData'

import { CampoTesto } from '../../ui/Campi'
import { Messaggio, Pulsante, SchedeInArrivo } from '../../ui/kit'
import { F, usePalette } from '../../ui/tema'
import { useClubLife } from '../dati'
import { Cornice, DaDoveParti, Fatto, Pillole } from './Cornice'
import { inVista, useIdentita } from './identita'

// La richiesta di cambio abbonamento: la scheda `adulti/cambio-abbonamento` la
// ha come modulo, e qui e' lo stesso, gia' con l'email di chi scrive. La riceve
// `sito-cambio-abbonamento`, che legge il contratto in corso su PerfectGym e
// avvisa il desk: il conteggio del valore residuo arriva poi via email.
//
// Le formule non sono scritte qui: le manda il sito (`formuleCambio`), dal
// listino. Se il feed non le ha — il sito non e' ancora aggiornato — si scrive a
// mano quale abbonamento interessa, invece di fermare il modulo.

const oggi = () => new Date().toISOString().slice(0, 10)
const traUnAnno = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function CambioAbbonamento({ emailAccesso }: { emailAccesso?: string | null }) {
  const p = usePalette()
  const identita = useIdentita(emailAccesso)
  const { dati } = useClubLife()
  const formule = dati?.formuleCambio ?? []
  const [decorrenza, setDecorrenza] = useState('')
  const [formula, setFormula] = useState<string | null>(null)
  const [aMano, setAMano] = useState('')
  const [extra, setExtra] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [fatto, setFatto] = useState(false)

  async function invia() {
    if (!identita || inCorso) return
    setErrore(null)
    const abbonamento = formule.length ? (formula ?? '') : aMano.trim()
    if (!decorrenza) return setErrore('Indica da quando far partire il nuovo abbonamento.')
    if (!abbonamento) return setErrore('Scegli l’abbonamento che ti interessa.')
    setInCorso(true)
    const esito = await richiediCambioAbbonamento({ email: identita.email, decorrenza, abbonamento, richiesteExtra: extra.trim() })
    setInCorso(false)
    if (esito.ok) return setFatto(true)
    setErrore(esito.errore)
  }

  if (fatto) {
    return (
      <Cornice sopratitolo="Abbonamenti" titolo="Cambio abbonamento">
        <Fatto titolo="Abbiamo inviato la tua richiesta">
          {`Riceverai il conteggio del valore residuo del tuo attuale abbonamento via email a ${identita?.email ?? 'il tuo indirizzo'}, da usare a deconto del nuovo. Poi, se ti interessa, potrai confermare il cambio.`}
        </Fatto>
      </Cornice>
    )
  }

  return (
    <Cornice sopratitolo="Abbonamenti" titolo="Cambio abbonamento" sottotitolo="Valido solo per i contratti degli adulti.">
      {!identita ? (
        <SchedeInArrivo quante={1} />
      ) : (
        <>
          {/* `CampoData` ha `flex: 1` (nasce dentro una riga): in una colonna senza altezza si schiaccia e la sua etichetta finisce sul campo dopo. */}
          <View style={{ flexDirection: 'row' }}>
            <CampoData etichetta="Da quando vuoi far decorrere il nuovo abbonamento?" value={decorrenza} onChange={setDecorrenza} min={oggi()} max={traUnAnno()} annoIniziale={new Date().getFullYear()} sfondo={p.incavo} />
          </View>
          {formule.length ? (
            <Pillole etichetta="A quale abbonamento sei interessato?" opzioni={formule.map((f) => ({ id: f, testo: f }))} valore={formula} onScegli={setFormula} />
          ) : (
            <CampoTesto etichetta="A quale abbonamento sei interessato?" value={aMano} onChangeText={setAMano} placeholder="Ad esempio: Premium Annuale" />
          )}
          <CampoTesto
            etichetta="Richieste extra (facoltativo)"
            value={extra}
            onChangeText={setExtra}
            multiline
            numberOfLines={3}
            maxLength={4000}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
          <DaDoveParti email={identita.email} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
            Il nostro Help Desk ti invierà via email il conteggio del valore residuo del tuo attuale abbonamento, da utilizzare a deconto del valore del nuovo.
          </Text>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo="Invia la richiesta" icona="invia" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
        </>
      )}
    </Cornice>
  )
}
