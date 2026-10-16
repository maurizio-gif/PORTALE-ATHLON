import { router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { spazio } from '@/theme'

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
export function PulsanteEsci({ email, testo = 'Esci', conferma = true }: { email?: string | null; testo?: string; conferma?: boolean }) {
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
      <Pulsante testo={inVista ? 'Esci dalla vista cliente' : testo} icona="esci" variante="pericolo" onPress={conferma && !inVista ? () => setAperto(true) : esci} inCorso={!conferma && inCorso} />
      <Foglio aperto={aperto} titolo="Vuoi uscire?" onChiudi={() => setAperto(false)}>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 15, lineHeight: 22 }}>
          {email ? (
            <>
              Esci da <Text style={{ color: p.testo, fontFamily: F.bold }}>{email}</Text>. Per rientrare ti mandiamo un nuovo codice via email.
            </>
          ) : (
            'Per rientrare ti mandiamo un nuovo codice via email.'
          )}
        </Text>
        <View style={{ gap: spazio.due }}>
          <Pulsante testo="Esci" icona="esci" variante="pericolo" onPress={esci} inCorso={inCorso} />
          <Pulsante testo="Annulla" variante="secondario" onPress={() => setAperto(false)} disabilitato={inCorso} />
        </View>
      </Foglio>
    </>
  )
}
