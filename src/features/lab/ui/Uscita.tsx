import { router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { spazio } from '@/theme'
import { t, tv } from '@/lib/lingua'

import { esciDalLaboratorio } from '../memoria'
import { esciDallaVista, vistaCorrente } from '../vista'
import { Foglio } from './Foglio'
import { Pulsante } from './kit'
import { F, usePalette } from './tema'
import { colpetto } from './Tocco'

/**
 * Il logout: il pulsante e, prima di uscire, la conferma in un foglio. Dopo si
 * torna all'ingresso del laboratorio (/lab), da qualunque schermata.
 */
export function PulsanteEsci({ email, testo = t('Esci', 'Log out'), conferma = true }: { email?: string | null; testo?: string; conferma?: boolean }) {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  const [inCorso, setInCorso] = useState(false)

  // In vista cliente (vista.ts) «esci» non e' uscire dall'account di qualcuno
  // - non ci si e' entrati - ma chiudere la vista: si resta dentro col proprio
  // accesso, e la pagina riparte da capo senza i dati del cliente.
  const inVista = vistaCorrente() !== null

  async function esci() {
    if (inVista) {
      esciDallaVista()
      return
    }
    setInCorso(true)
    await esciDalLaboratorio()
    setInCorso(false)
    setAperto(false)
    colpetto('ok')
    router.replace('/')
  }

  return (
    <>
      <Pulsante testo={inVista ? t('Esci dalla vista cliente', 'Leave client view') : testo} icona="esci" variante="pericolo" onPress={conferma && !inVista ? () => setAperto(true) : esci} inCorso={!conferma && inCorso} />
      <Foglio aperto={aperto} titolo={t('Vuoi uscire?', 'Log out?')} onChiudi={() => setAperto(false)}>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 15, lineHeight: 22 }}>
          {email ? (
            tv(
              <>
                Esci da <Text style={{ color: p.testo, fontFamily: F.bold }}>{email}</Text>. Per rientrare ti mandiamo un nuovo codice via email.
              </>,
              <>
                You’re logging out of <Text style={{ color: p.testo, fontFamily: F.bold }}>{email}</Text>. To log back in we’ll email you a new code.
              </>,
            )
          ) : (
            t('Per rientrare ti mandiamo un nuovo codice via email.', 'To log back in we’ll email you a new code.')
          )}
        </Text>
        <View style={{ gap: spazio.due }}>
          <Pulsante testo={t('Esci', 'Log out')} icona="esci" variante="pericolo" onPress={esci} inCorso={inCorso} />
          <Pulsante testo={t('Annulla', 'Cancel')} variante="secondario" onPress={() => setAperto(false)} disabilitato={inCorso} />
        </View>
      </Foglio>
    </>
  )
}
