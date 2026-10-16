import { useIsFocused } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CLUB_LIFE_URL } from '@/config'
import { spazio } from '@/theme'

import { ALTEZZA_BARRA, margineBarra } from '../ui/BarraSchede'
import { Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { ascoltaClubLifeDaCapo } from './daCapo'

// Club Life: la pagina del sito (athlonroma.it/club-life), incorporata a tutto
// schermo fra la barra di stato e la barra delle schede. Non e' una copia: le
// news, gli eventi, i servizi e l'Help Desk si aggiornano dal sito, e qui
// compaiono da soli.
//
// - **Il fondo e' scuro** in ogni tema: la pagina comincia con una foto scura, e
//   la striscia sotto la barra di stato (dove sull'iPhone installato c'e' il
//   notch, e dentro un iframe la safe area non arriva) deve sembrarne il
//   proseguimento, non uno stacco grigio.
// - **L'iframe finisce sopra la barra**, non sotto: la pagina ha il suo
//   pulsante della chat fisso in basso a destra, e dietro la barra non si
//   toccherebbe.
// - **Nell'app installata non c'e' un indietro**, e dentro l'iframe si naviga
//   (una news, una scheda): toccare di nuovo «Club Life» nella barra riparte
//   dall'inizio (daCapo.ts).
// - **L'iframe vive solo mentre la schermata e' quella in vista.** La barra
//   porta a una voce con `router.navigate`, che impila una schermata nuova a ogni
//   cambio: senza questo, le visite a Club Life lasciavano dietro di se' una
//   pagina del sito intera (con la sua chat, i suoi video) viva ma nascosta, una
//   per ogni passaggio. Tornando si ricarica: la posizione non si ricorda, ma e'
//   lo stesso che succedeva con un'istanza nuova.

const FONDO = '#0B0B0C'
/** Dopo quanto, senza che la pagina sia arrivata, si smette di far girare la rotellina e si dice come uscirne. */
const ATTESA_MS = 15_000

export function ClubLife() {
  const ins = useSafeAreaInsets()
  const p = usePalette()
  const inVista = useIsFocused()
  const [arrivata, setArrivata] = useState(false)
  const [lenta, setLenta] = useState(false)
  // Cambiare la chiave rimonta l'iframe: e' il modo di ricaricarlo da fuori.
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    setArrivata(false)
    setLenta(false)
    const t = setTimeout(() => setLenta(true), ATTESA_MS)
    return () => clearTimeout(t)
  }, [giro, inVista])

  useEffect(() => ascoltaClubLifeDaCapo(() => setGiro((g) => g + 1)), [])

  return (
    <View style={[stili.fondo, { paddingTop: ins.top, paddingBottom: ALTEZZA_BARRA + margineBarra(ins.bottom) }]}>
      <View style={stili.cornice}>
        {inVista ? (
          <iframe
            key={giro}
            src={CLUB_LIFE_URL}
            title="Club Life"
            // La pagina copia i codici promozionali e apre i video a tutto schermo.
            allow="clipboard-write; fullscreen"
            onLoad={() => setArrivata(true)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, display: 'block', backgroundColor: FONDO }}
          />
        ) : null}
        {arrivata || !inVista ? null : (
          <View style={stili.attesa} pointerEvents={lenta ? 'auto' : 'none'}>
            {lenta ? (
              // Su una scheda del tema e non sul fondo scuro della pagina: i pulsanti
              // del kit hanno il testo del tema, e su nero il contorno sparirebbe.
              <View style={[stili.avviso, { backgroundColor: p.carta, borderColor: p.linea }]}>
                <Text style={[stili.testo, { color: p.testo }]}>Club Life sta tardando ad arrivare. Controlla la connessione, oppure aprilo nel browser.</Text>
                <View style={stili.pulsanti}>
                  <Pulsante testo="Riprova" icona="aggiorna" onPress={() => setGiro((g) => g + 1)} pieno={false} />
                  <Pulsante testo="Apri nel browser" icona="apriFuori" variante="contorno" onPress={() => window.open(CLUB_LIFE_URL, '_blank')} pieno={false} />
                </View>
              </View>
            ) : (
              <ActivityIndicator color="#FF5701" />
            )}
          </View>
        )}
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: FONDO },
  cornice: { flex: 1 },
  attesa: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spazio.quattro, backgroundColor: FONDO },
  avviso: { gap: spazio.tre, padding: spazio.quattro, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', maxWidth: 420 },
  testo: { fontFamily: F.medio, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  pulsanti: { flexDirection: 'row', gap: spazio.due, flexWrap: 'wrap', justifyContent: 'center' },
})
