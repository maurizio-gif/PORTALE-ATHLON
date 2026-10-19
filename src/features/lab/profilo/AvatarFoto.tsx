import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Icona } from '../ui/Icona'
import { Avatar } from '../ui/kit'
import { FUOCO, NOTTE } from '../ui/tema'
import { Richiamo } from './Richiamo'

// L'avatar della testata della Home (19/10/2026): la foto del profilo, se c'e', al posto delle iniziali.
//
// Chi non ha una foto vede le iniziali di sempre, un po' piu' grandi, con l'invito a metterla: un anello che pulsa
// piano (`Richiamo`, tre raffiche e poi sta fermo) e una fotocamera sull'angolo. Le iniziali stanno sotto la foto e
// non spariscono: la foto entra in dissolvenza quando e' caricata, e se il link e' scaduto o la rete e' andata resta
// l'avatar di prima, senza buchi.

/** Il raggio degli avatar del Profilo e della Home: lo stesso rapporto (`kit.Avatar`). */
const RAPPORTO = 0.36

export function AvatarFoto({
  nome,
  cognome,
  foto,
  size,
  anello,
  invito = false,
}: {
  nome: string | null
  cognome?: string | null
  /** Il link firmato della foto, o `null`. */
  foto: string | null
  size: number
  /** Il bordo chiaro intorno, come per le iniziali. */
  anello?: string
  /** La foto manca e si puo' metterla: anello che pulsa e fotocamera sull'angolo. */
  invito?: boolean
}) {
  const [rotta, setRotta] = useState(false)
  useEffect(() => setRotta(false), [foto])
  const raggio = size * RAPPORTO

  return (
    <View style={{ width: size, height: size }}>
      {invito ? <Richiamo raggio={raggio} colore={FUOCO[1]} /> : null}
      <Avatar nome={nome} cognome={cognome} size={size} anello={anello} />
      {foto && !rotta ? (
        <>
          <Image
            source={{ uri: foto }}
            onError={() => setRotta(true)}
            contentFit="cover"
            // Le facce stanno sopra il centro: ritagliando una foto non quadrata si perde prima il fondo.
            contentPosition={{ left: '50%', top: '30%' }}
            transition={250}
            // Decorativa: il comando intorno (la testata, «Il mio profilo») ha il suo nome, e con il Profilo aperto sotto la foto sta anche li'.
            alt=""
            accessibilityIgnoresInvertColors
            style={[StyleSheet.absoluteFill, { borderRadius: raggio }]}
          />
          {/* Lo stesso bordo delle iniziali, sopra la foto. */}
          {anello ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: raggio, borderWidth: 2.5, borderColor: anello }]} /> : null}
        </>
      ) : null}
      {invito ? (
        <View pointerEvents="none" style={stili.distintivo}>
          <Icona nome="fotocamera" size={12} colore="#fff" />
        </View>
      ) : null}
    </View>
  )
}

const stili = StyleSheet.create({
  // Sull'angolo in basso a destra, col bordo del colore della testata: si stacca senza un'ombra.
  distintivo: { position: 'absolute', right: -5, bottom: -5, width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: NOTTE[1], backgroundColor: FUOCO[1], alignItems: 'center', justifyContent: 'center' },
})
