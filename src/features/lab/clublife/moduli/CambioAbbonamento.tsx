import { useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import { statoAbbonamento, type PianoAbbonamento } from '@/api/abbonamento'
import { richiediCambioAbbonamento } from '@/api/moduli'
import { CampoData } from '@/components/CampoData'
import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'

import { CampoTesto } from '../../ui/Campi'
import { Messaggio, Pulsante, SchedeInArrivo } from '../../ui/kit'
import { F, usePalette } from '../../ui/tema'
import { FORMULE, FORMULE_IT } from '../../abbonamento/Listino'
import { Cornice, DaDoveParti, Fatto, Pillole } from './Cornice'
import { inVista, useIdentita } from './identita'

// La richiesta di cambio abbonamento: la scheda `adulti/cambio-abbonamento` la
// ha come modulo, e qui e' lo stesso, gia' con l'email di chi scrive. La riceve
// `sito-cambio-abbonamento`, che legge il contratto in corso su PerfectGym e
// avvisa il desk: il conteggio del valore residuo arriva poi via email.
//
// Gli abbonamenti verso cui si puo' passare sono quelli del listino adulti
// dell'app (`portale-abbonamento`, la stessa sezione Abbonamenti della Home),
// letti da li': mai un elenco ricopiato. Solo le due formule annuali — in
// un'unica soluzione e a rate —: il Mensile Flex non e' una destinazione del
// cambio. Se il listino non risponde si scrive a mano quale abbonamento
// interessa, invece di fermare il modulo.

/** Le formule verso cui si puo' cambiare: tutte tranne il mensile senza vincoli. */
const FORMULE_DI_CAMBIO = new Set(['annuale-unico', 'annuale-rate'])

function nomeFormula(x: PianoAbbonamento): string {
  const prezzo = `${euro(x.importo)} ${x.periodo.includes('anno') ? t('all’anno', 'per year') : t('al mese', 'per month')}`
  return `${x.abbonamento} · ${FORMULE[x.formula]?.titolo ?? x.etichetta} · ${prezzo}`
}

/** Lo stesso nome in italiano: e' quello che arriva al desk, qualunque sia la lingua dell'app. */
function nomeFormulaIt(x: PianoAbbonamento): string {
  const prezzo = `${euro(x.importo)} ${x.periodo.includes('anno') ? 'all’anno' : 'al mese'}`
  return `${x.abbonamento} · ${FORMULE_IT[x.formula]?.titolo ?? x.etichetta} · ${prezzo}`
}

const oggi = () => new Date().toISOString().slice(0, 10)
const traUnAnno = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function CambioAbbonamento({ emailAccesso }: { emailAccesso?: string | null }) {
  const p = usePalette()
  const identita = useIdentita(emailAccesso)
  const [piani, setPiani] = useState<PianoAbbonamento[] | null>(null)
  const [listinoNonRisponde, setListinoNonRisponde] = useState(false)
  const [decorrenza, setDecorrenza] = useState('')
  const [formula, setFormula] = useState<string | null>(null)
  const [aMano, setAMano] = useState('')
  const [extra, setExtra] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [fatto, setFatto] = useState(false)

  useEffect(() => {
    let vivo = true
    statoAbbonamento().then((r) => {
      if (!vivo) return
      if (r.ok) setPiani(r.stato.piani.filter((x) => FORMULE_DI_CAMBIO.has(x.formula)))
      else setListinoNonRisponde(true)
    })
    return () => {
      vivo = false
    }
  }, [])

  // Nell'ordine del listino (Smart, Premium), e per ciascuno prima l'unica soluzione e poi le rate.
  const formule = useMemo(() => {
    const ordine = (f: string) => (f === 'annuale-unico' ? 0 : 1)
    return [...(piani ?? [])]
      .map((x, i) => ({ x, i }))
      .sort((a, b) => (a.x.abbonamento === b.x.abbonamento ? ordine(a.x.formula) - ordine(b.x.formula) : a.i - b.i))
      .map(({ x }) => ({ id: String(x.piano_id), testo: nomeFormula(x), it: nomeFormulaIt(x) }))
  }, [piani])

  async function invia() {
    if (!identita || inCorso) return
    setErrore(null)
    const abbonamento = formule.length ? (formule.find((f) => f.id === formula)?.it ?? '') : aMano.trim()
    if (!decorrenza) return setErrore(t('Indica da quando far partire il nuovo abbonamento.', 'Choose when the new membership should start.'))
    if (!abbonamento) return setErrore(t('Scegli l’abbonamento che ti interessa.', 'Choose the membership you’re interested in.'))
    setInCorso(true)
    const esito = await richiediCambioAbbonamento({ email: identita.email, decorrenza, abbonamento, richiesteExtra: extra.trim() })
    setInCorso(false)
    if (esito.ok) return setFatto(true)
    setErrore(esito.errore)
  }

  if (fatto) {
    return (
      <Cornice sopratitolo={t('Abbonamenti', 'Memberships')} titolo={t('Cambio abbonamento', 'Change membership')}>
        <Fatto titolo={t('Abbiamo inviato la tua richiesta', 'We’ve sent your request')}>
          {t(`Riceverai il conteggio del valore residuo del tuo attuale abbonamento via email a ${identita?.email ?? 'il tuo indirizzo'}, da usare a deconto del nuovo. Poi, se ti interessa, potrai confermare il cambio.`, `We’ll email ${identita?.email ?? 'you'} the remaining value of your current membership, to be credited against the new one. Then, if you’re still interested, you can confirm the change.`)}
        </Fatto>
      </Cornice>
    )
  }

  return (
    <Cornice sopratitolo={t('Abbonamenti', 'Memberships')} titolo={t('Cambio abbonamento', 'Change membership')} sottotitolo={t('Valido solo per i contratti degli adulti.', 'For adult contracts only.')}>
      {!identita || (!piani && !listinoNonRisponde) ? (
        <SchedeInArrivo quante={1} />
      ) : (
        <>
          {/* `CampoData` ha `flex: 1` (nasce dentro una riga): in una colonna senza altezza si schiaccia e la sua etichetta finisce sul campo dopo. */}
          <View style={{ flexDirection: 'row' }}>
            <CampoData etichetta={t('Da quando vuoi far decorrere il nuovo abbonamento?', 'When should the new membership start?')} value={decorrenza} onChange={setDecorrenza} min={oggi()} max={traUnAnno()} annoIniziale={new Date().getFullYear()} sfondo={p.incavo} />
          </View>
          {formule.length ? (
            <Pillole etichetta={t('A quale abbonamento sei interessato?', 'Which membership are you interested in?')} opzioni={formule} valore={formula} onScegli={setFormula} />
          ) : (
            <CampoTesto etichetta={t('A quale abbonamento sei interessato?', 'Which membership are you interested in?')} value={aMano} onChangeText={setAMano} placeholder={t('Ad esempio: Premium Annuale', 'For example: Premium Annuale')} />
          )}
          <CampoTesto
            etichetta={t('Richieste extra (facoltativo)', 'Other requests (optional)')}
            value={extra}
            onChangeText={setExtra}
            multiline
            numberOfLines={3}
            maxLength={4000}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
          <DaDoveParti email={identita.email} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
            {t('Il nostro Help Desk ti invierà via email il conteggio del valore residuo del tuo attuale abbonamento, da utilizzare a deconto del valore del nuovo.', 'Our Help Desk will email you the remaining value of your current membership, to be credited against the price of the new one.')}
          </Text>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Invia la richiesta', 'Send request')} icona="invia" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
        </>
      )}
    </Cornice>
  )
}
