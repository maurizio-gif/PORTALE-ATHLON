import { useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'

import { altroIndirizzo } from '@/api/registrazione'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { PulsanteEsci } from '../ui/Uscita'
import { vistaCorrente } from '../vista'

// «Non troviamo la tua scheda» (13/11/2026, Maurizio): chi e' dentro ma con un indirizzo che non ha nessuna scheda viva del club vedeva una riga sola e nessuna strada.
// Quasi sempre e' una persona gia' del club con un altro indirizzo (il caso vero: si e' registrata dall'app il 3/11, prima del controllo delle somiglianze, e il doppione
// creato e' stato poi cancellato su PerfectGym; la sua scheda vera ha l'indirizzo di prima). Il server cerca con quello che il club ha gia' scritto per questo indirizzo
// (`portale-registrazione`, azione `altro_indirizzo`) e manda gli indirizzi delle schede trovate **in parte nascosti**, come «Sei gia' dei nostri».
//
//   - **Con un indirizzo**: «Ci risulta una scheda con un altro indirizzo», l'indirizzo nascosto, «Entra con quell'indirizzo» (esce) e «Scrivi a desk@athlonroma.it».
//   - **Senza** (nessuna scheda trovata, piu' di tre, la funzione non risponde o e' quella di prima): il messaggio generico, ma con la strada: esci e prova con l'altro
//     indirizzo, o scrivi al desk. Mai un vicolo cieco.
//
// **In vista cliente** (lo staff guarda un cliente senza scheda) non si chiede niente al server: il messaggio generico, e «Esci dalla vista cliente».
// Lo usano la Home (`AreaRiservata`) e il Badge.

const DESK = 'desk@athlonroma.it'

export function SchedaNonTrovata({ email }: { email: string }) {
  const p = usePalette()
  const inVista = vistaCorrente() !== null
  // `undefined`: lo stiamo chiedendo; `[]`: niente da suggerire.
  const [note, setNote] = useState<string[] | undefined>(inVista ? [] : undefined)

  useEffect(() => {
    if (inVista) return
    let vivo = true
    altroIndirizzo().then((n) => {
      if (vivo) setNote(n)
    })
    return () => {
      vivo = false
    }
  }, [inVista])

  // Il desk con l'indirizzo con cui si e' entrati gia' scritto, cosi' sa subito di quale account si parla.
  function scrivi() {
    const oggetto = t('Non trovo la mia scheda', 'I can’t find my profile')
    const corpo = t(
      `Ho provato a entrare nell’app con l’indirizzo ${email}, ma l’app non trova la mia scheda del club. Potete aiutarmi?`,
      `I tried to sign in to the app with ${email}, but the app can’t find my club profile. Can you help me?`,
    )
    Linking.openURL(`mailto:${DESK}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`).catch(() => {})
  }

  if (note === undefined) return <SchedeInArrivo quante={1} />

  const testo = [stili.testo, { color: p.testoSecondario }]
  const scriviAlDesk = <Pulsante testo={t(`Scrivi a ${DESK}`, `Write to ${DESK}`)} icona="email" variante="secondario" onPress={scrivi} />

  if (note.length) {
    return (
      <View style={{ gap: spazio.tre }}>
        <Messaggio tono="attenzione" titolo={t('Ci risulta una scheda con un altro indirizzo', 'We have a profile under another email address')}>
          <Text style={testo}>
            {note.length === 1
              ? t(`Con ${email} non c’è nessuna scheda del club. Sembra però che tu abbia già una scheda con questo indirizzo email:`, `There’s no club profile under ${email}. It looks like you already have one under this email address:`)
              : t(`Con ${email} non c’è nessuna scheda del club. Sembra però che tu abbia già una scheda con uno di questi indirizzi email:`, `There’s no club profile under ${email}. It looks like you already have one under one of these email addresses:`)}
          </Text>
          {note.map((m) => (
            <Text key={m} selectable style={[stili.indirizzo, { color: p.testo }]}>
              {m}
            </Text>
          ))}
          <Text style={testo}>
            {t('Se è il tuo, esci e accedi con quell’indirizzo: ritrovi tutto quello che hai già con il club.', 'If that’s yours, log out and sign in with that address: you’ll find everything you already have with the club.')}
          </Text>
          <Text style={testo}>
            {t(`Se non lo riconosci o non lo usi più, scrivi a ${DESK} e ti aiutiamo.`, `If you don’t recognise it or no longer use it, write to ${DESK} and we’ll help.`)}
          </Text>
        </Messaggio>
        <PulsanteEsci testo={t('Entra con quell’indirizzo', 'Sign in with that address')} conferma={false} variante="primario" />
        {scriviAlDesk}
      </View>
    )
  }

  return (
    <View style={{ gap: spazio.tre }}>
      <Messaggio tono="attenzione" titolo={t('Nessuna scheda con questo indirizzo', 'No profile with this address')}>
        <Text style={testo}>{t(`Non c’è una scheda del club con l’indirizzo ${email}.`, `There’s no club profile with the address ${email}.`)}</Text>
        <Text style={testo}>
          {t(
            'Se sei già iscritto, la tua scheda è probabilmente registrata con un altro indirizzo email: esci e prova con quello.',
            'If you’re already a member, your profile is probably registered under another email address: log out and try that one.',
          )}
        </Text>
        <Text style={testo}>{t(`Se non lo ricordi, scrivi a ${DESK} e lo ritroviamo insieme.`, `If you don’t remember it, write to ${DESK} and we’ll find it together.`)}</Text>
      </Messaggio>
      <PulsanteEsci testo={t('Esci e prova con un altro indirizzo', 'Log out and try another address')} conferma={false} variante="primario" />
      {scriviAlDesk}
    </View>
  )
}

const stili = StyleSheet.create({
  testo: { fontFamily: F.normale, fontSize: 15, lineHeight: 22 },
  indirizzo: { fontFamily: F.bold, fontSize: 17, lineHeight: 26 },
})
