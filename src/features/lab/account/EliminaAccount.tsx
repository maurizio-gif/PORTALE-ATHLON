import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { eliminaAccount, PAROLA_CONFERMA, statoAccount, type StatoAccount } from '@/api/account'
import { Casella } from '@/components/Casella'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { esciDalLaboratorio } from '../memoria'
import { CampoTesto } from '../ui/Campi'
import { Carta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'
import { vistaCorrente } from '../vista'

// «Elimina account» (02/11/2026, richiesta di Maurizio; Apple 5.1.1(v) e Google Play la chiedono): dal Profilo. **E' un'anonimizzazione**: si cancellano i
// dati che l'app ha raccolto (salute, diario, dispositivi, piani, conversazioni) e si chiude l'accesso; **contratti, pagamenti e scheda del club restano**
// (sono registri del club) e chi torna con la stessa email ritrova la stessa scheda, quindi non e' una persona nuova. La schermata lo dice **prima**, dice
// che l'abbonamento **non si disdice**, e chiede due cose: capirlo (una casella) e scrivere ELIMINA. Quello che si cancella lo decide la funzione
// `portale-lab-account` (APP-ATHLON). In vista cliente niente: lo staff non elimina l'account di un socio.

export function EliminaAccount() {
  const p = usePalette()
  const vista = vistaCorrente()
  const [stato, setStato] = useState<StatoAccount | undefined>(undefined)
  const [capito, setCapito] = useState(false)
  const [parola, setParola] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    if (vista) return
    setStato(await statoAccount())
  }, [vista])
  useEffect(() => {
    carica()
  }, [carica])

  const intestazione = { titolo: t('Elimina account', 'Delete account'), sopratitolo: t('Il tuo profilo', 'Your profile'), indietro: '/profilo' as const, barra: false }
  const pronto = capito && parola.trim().toUpperCase() === PAROLA_CONFERMA

  async function conferma() {
    setInCorso(true)
    setErrore(null)
    const r = await eliminaAccount(parola)
    if (!r.ok) {
      setInCorso(false)
      return setErrore(r.errore)
    }
    colpetto('ok')
    // L'accesso e' chiuso: si esce dall'app come per «Esci», cosi' non resta niente di suo sul dispositivo.
    await esciDalLaboratorio()
    router.replace('/')
  }

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Vista cliente', 'Client view')}>
          {t('L’account lo elimina solo la persona, dal suo telefono.', 'Only the account holder can delete it, from their phone.')}
        </Messaggio>
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...intestazione}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }
  if (!stato.ok) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{stato.errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
      </Schermata>
    )
  }

  const testo = [stili.corpo, { color: p.testoSecondario }]
  const forte = { color: p.testo, fontFamily: F.bold }
  return (
    <Schermata {...intestazione} sottotitolo={t('Chiude il tuo accesso e cancella i dati che hai scritto nell’app.', 'Closes your login and deletes the data you entered in the app.')}>
      <Sezione titolo={t('Cosa si cancella', 'What gets deleted')}>
        <Carta piatta style={{ gap: spazio.due }}>
          <Text style={testo}>
            {t(
              'Il tuo accesso all’app e tutto quello che l’app ha raccolto: diario alimentare, dati di sonno e dei dispositivi, misure del corpo, i piani e gli allenamenti che hai registrato, le conversazioni con l’assistente, le notifiche e i consensi (restano chiusi, come prova che li hai dati e ritirati).',
              'Your app login and everything the app collected: food diary, sleep and device data, body measurements, the plans and workouts you logged, conversations with the assistant, notifications and consents (kept closed, as proof you gave and withdrew them).',
            )}
          </Text>
        </Carta>
      </Sezione>

      <Sezione titolo={t('Cosa resta, e perché', 'What stays, and why')}>
        <Carta piatta style={{ gap: spazio.due }}>
          <Text style={testo}>
            {t(
              'Contratti, pagamenti, ricevute, ordini, presenze, certificati e la tua scheda del club restano memorizzati: il club deve conservarli per obblighi contabili e fiscali. Non sono più collegati al tuo accesso all’app.',
              'Contracts, payments, receipts, orders, attendance, certificates and your club profile stay on record: the club has to keep them for accounting and tax obligations. They are no longer tied to your app login.',
            )}
          </Text>
          <Text style={testo}>
            {t(
              'Se un giorno torni, entri con la stessa email e ritrovi la stessa scheda: non risulti una persona nuova, e quindi non puoi attivare di nuovo la settimana di prova.',
              'If you come back one day, you sign in with the same email and find the same profile: you don’t count as a new person, so you can’t activate the trial week again.',
            )}
          </Text>
        </Carta>
      </Sezione>

      {stato.contrattiAttivi > 0 ? (
        <Messaggio tono="attenzione" titolo={t('Hai un abbonamento attivo', 'You have an active membership')}>
          {t(
            'Eliminare l’account NON disdice l’abbonamento: continuerà finché non lo disdici. Se vuoi farlo, disdicilo prima da «Gestisci abbonamento», oppure scrivi alla segreteria.',
            'Deleting the account does NOT cancel the membership: it continues until you cancel it. If you want to, cancel it first from “Manage membership”, or write to the front desk.',
          )}
        </Messaggio>
      ) : null}

      <Carta style={{ gap: spazio.tre }}>
        <Text style={[stili.corpo, { color: p.testo }]}>
          {t('Stai per eliminare l’account di ', 'You are about to delete the account of ')}
          <Text style={forte}>{stato.email}</Text>
          {t('. Non si può annullare.', '. This can’t be undone.')}
        </Text>
        <Casella
          riquadro
          spuntata={capito}
          onCambia={() => setCapito((v) => !v)}
          etichetta={t('Ho capito cosa si cancella e cosa resta', 'I understand what gets deleted and what stays')}
        >
          <Text style={[stili.corpo, { color: p.testo, flex: 1 }]}>
            {t(
              stato.contrattiAttivi > 0 ? 'Ho capito cosa si cancella e cosa resta, e che l’abbonamento non viene disdetto.' : 'Ho capito cosa si cancella e cosa resta.',
              stato.contrattiAttivi > 0 ? 'I understand what gets deleted and what stays, and that my membership isn’t cancelled.' : 'I understand what gets deleted and what stays.',
            )}
          </Text>
        </Casella>
        <CampoTesto
          etichetta={t(`Per confermare scrivi ${PAROLA_CONFERMA}`, `To confirm, type ${PAROLA_CONFERMA}`)}
          value={parola}
          onChangeText={setParola}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={PAROLA_CONFERMA}
        />
        <Pulsante testo={t('Elimina il mio account', 'Delete my account')} icona="cestino" variante="pericolo" onPress={conferma} disabilitato={!pronto} inCorso={inCorso} />
        <Pulsante testo={t('Annulla', 'Cancel')} variante="contorno" onPress={() => router.back()} disabilitato={inCorso} />
        {errore ? <Messaggio>{errore}</Messaggio> : null}
      </Carta>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
})
