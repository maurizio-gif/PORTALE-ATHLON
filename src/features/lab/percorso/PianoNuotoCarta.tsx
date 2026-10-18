import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { PianoNuotoBozza, Tappa } from '@/api/percorso'
import { spazio } from '@/theme'

import { recupero } from '../schede/comune'
import { inMetri, metriDelGiorno, parteDa } from '../schede/nuoto'
import { Icona } from '../ui/Icona'
import { Carta, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { GIORNO_BREVE } from './comune'

// Il piano di nuoto che il tutor ha scritto insieme al percorso (20/10/2026), da rivedere nell'editor: le sedute con i loro
// metri e, aprendole, i blocchi («4 × 100 m · medio · recupero 20″»). **Si conferma con il percorso**: finche' non lo si
// conferma non e' di nessuno. E si puo' togliere: il percorso resta, i turni di Nuoto Libero restano senza piano.
//
// Qui non si modifica niente: i blocchi si cambiano dopo, dal piano (che a quel punto e' un piano del socio come gli altri).
// Si mostra quale turno apre quale seduta, perche' e' la cosa che il socio puo' cambiare da qui spostando i turni.

export function PianoNuotoCarta({ piano, tappe, onTogli, disabilitato = false }: { piano: PianoNuotoBozza; tappe: Tappa[]; onTogli: () => void; disabilitato?: boolean }) {
  const p = usePalette()
  const [aperta, setAperta] = useState<number | null>(null)
  const [conferma, setConferma] = useState(false)
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
        <Icona nome="goccia" size={20} colore={p.blu} />
        <Text style={[stili.testa, { color: p.testo, flex: 1 }]}>Il tuo piano di nuoto</Text>
      </View>
      <View style={{ gap: 3 }}>
        <Text style={[stili.titolo, { color: p.testo }]}>{piano.titolo}</Text>
        {piano.descrizione ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{piano.descrizione}</Text> : null}
      </View>

      <View style={{ gap: spazio.due }}>
        {piano.giorni.map((g, i) => {
          const aprono = tappe.filter((t) => t.piano?.giorno_posizione === i + 1)
          const metri = metriDelGiorno(g)
          const espansa = aperta === i
          return (
            <View key={`${g.nome}-${i}`} style={[stili.seduta, { backgroundColor: p.incavo }]}>
              <Tocco onPress={() => setAperta(espansa ? null : i)} etichetta={`${g.nome}: ${espansa ? 'chiudi' : 'guarda i blocchi'}`} scala={0.99}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[stili.sedutaNome, { color: p.testo }]}>{`${g.nome}${metri > 0 ? ` · ${inMetri(metri)}` : ''}`}</Text>
                    <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                      {aprono.length
                        ? `La apri ${aprono
                            .sort((a, b) => a.giorno - b.giorno || (a.ora ?? '').localeCompare(b.ora ?? ''))
                            .map((t) => `${GIORNO_BREVE[t.giorno]}${t.ora ? ` ${t.ora}` : ''}`)
                            .join(', ')}`
                        : 'Nessun turno la apre, per ora'}
                    </Text>
                  </View>
                  <Icona nome={espansa ? 'su' : 'giu'} size={16} colore={p.testoSecondario} />
                </View>
              </Tocco>
              {espansa ? (
                <View style={{ gap: spazio.due, paddingTop: spazio.due }}>
                  {g.esercizi.map((e, k) => {
                    const { parte, resto } = parteDa(e.note)
                    return (
                      <View key={k} style={{ gap: 1 }}>
                        {parte ? <Text style={[stili.parte, { color: p.accento }]}>{parte.toUpperCase()}</Text> : null}
                        <Text style={[stili.blocco, { color: p.testo }]}>{e.nome}</Text>
                        <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                          {`${e.serie} × ${e.ripetizioni}${e.carico ? ` · ${e.carico}` : ''} · recupero ${recupero(e.recupero_serie)}`}
                        </Text>
                        {resto ? <Text style={[stili.piccola, { color: p.testoTerzo }]}>{resto}</Text> : null}
                      </View>
                    )
                  })}
                </View>
              ) : null}
            </View>
          )
        })}
      </View>

      <Text style={[stili.piccola, { color: p.testoTerzo }]}>
        Si conferma insieme al percorso e poi è un piano tuo, che puoi cambiare. Si legge a bordo vasca e non si registra: non ci sono chili da segnare. I turni di Nuoto Libero lo aprono uno dopo l’altro, seduta per seduta.
      </Text>

      {conferma ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.nota, { color: p.testo }]}>Il percorso resta e i turni di Nuoto Libero restano senza piano. Lo vuoi togliere?</Text>
          <View style={stili.azioni}>
            <Pulsante testo="Sì, toglilo" variante="pericolo" piccolo onPress={onTogli} disabilitato={disabilitato} />
            <Pulsante testo="No" variante="secondario" piccolo onPress={() => setConferma(false)} />
          </View>
        </View>
      ) : (
        <Pulsante testo="Togli il piano di nuoto" variante="fantasma" piccolo onPress={() => setConferma(true)} disabilitato={disabilitato} />
      )}
    </Carta>
  )
}

const stili = StyleSheet.create({
  testa: { fontFamily: F.extra, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  piccola: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  seduta: { borderRadius: 16, padding: spazio.tre },
  sedutaNome: { fontFamily: F.extra, fontSize: 15.5, letterSpacing: -0.2 },
  parte: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1 },
  blocco: { fontFamily: F.bold, fontSize: 14 },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
