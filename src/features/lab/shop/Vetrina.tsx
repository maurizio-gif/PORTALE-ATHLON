import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import type { ArticoloShop } from '@/api/shop'
import { euro } from '@/lib/eventi'
import { spazio } from '@/theme'

import { Carta, LinkSezione, Messaggio, Pulsante, SchedeInArrivo, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { BottoneCarrello } from './BottoneCarrello'
import { SegnapostoFoto } from './SegnapostoFoto'
import { useVetrina } from './useVetrina'

// Lo shop (18/10/2026): gli articoli e il merchandising del club con foto e prezzi. Il catalogo e' quello di
// PerfectGym, curato dalla segreteria (foto, descrizione, ordine): qui si sfoglia, e si compra dal carrello.
// Si paga online (Adyen, attraverso PerfectGym) e si ritira in segreteria.
// Non ha una voce nella barra delle schede (19/10/2026, richiesta del club: si entra solo dalla carta «Shop» della Home):
// e' una schermata di dettaglio, senza barra e con la freccia che torna alla Home. Articolo, carrello e ordini tornano qui.

const GAP = 12

function Scheda({ a, colonne }: { a: ArticoloShop; colonne: number }) {
  const p = usePalette()
  return (
    <View style={{ width: `${100 / colonne}%`, padding: GAP / 2 }}>
      <Carta onPress={() => router.push({ pathname: '/shop/[id]', params: { id: String(a.product_id) } })} style={stili.scheda}>
        <View style={[stili.foto, { backgroundColor: p.incavo }]}>
          {a.foto[0] ? (
            <Image source={{ uri: a.foto[0] }} style={[StyleSheet.absoluteFill, a.esaurito && { opacity: 0.45 }]} contentFit="cover" transition={200} accessibilityLabel={a.nome} />
          ) : (
            <SegnapostoFoto size={40} />
          )}
          {a.esaurito ? (
            <View style={stili.esaurito}>
              <Tag testo="Esaurito" colore={p.testo} fondo={p.carta} />
            </View>
          ) : null}
        </View>
        <View style={stili.testi}>
          <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
            {a.nome}
          </Text>
          <Text style={[stili.prezzo, { color: p.testo }]}>{euro(a.prezzo)}</Text>
        </View>
      </Carta>
    </View>
  )
}

export function Vetrina() {
  const p = usePalette()
  const { dati, errore, carica } = useVetrina()
  const { width } = useWindowDimensions()
  const [categoria, setCategoria] = useState<number | null>(null)
  const colonne = width < 520 ? 2 : width < 900 ? 3 : 4
  // Chi guarda per conto di un cliente (vista cliente dello staff) sfoglia ma non compra: il server rifiuta ogni ordine.
  const inVista = vistaCorrente() !== null
  const articoli = dati ? dati.articoli.filter((a) => categoria == null || a.categoria_id === categoria) : []

  return (
    <Schermata
      sopratitolo="Athlon Club"
      titolo="Shop"
      sottotitolo="Articoli e merchandising del club. Paghi online, ritiri in segreteria."
      indietro="/"
      barra={false}
      destra={inVista ? undefined : <BottoneCarrello />}
    >
      {inVista ? <Messaggio tono="attenzione">Vista cliente: lo shop si guarda soltanto, non si compra.</Messaggio> : null}

      {errore && !dati ? (
        <View style={{ gap: spazio.tre }}>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" variante="secondario" onPress={() => carica(true)} />
        </View>
      ) : !dati ? (
        <SchedeInArrivo quante={4} />
      ) : !dati.articoli.length ? (
        <Carta piatta>
          <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>Lo shop si sta preparando.</Text>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 20, marginTop: 4 }}>Torna a trovarci fra poco: qui troverai gli articoli del club.</Text>
        </Carta>
      ) : (
        <>
          {dati.categorie.length > 1 ? (
            <View style={stili.categorie} accessibilityRole="tablist">
              {[{ id: null as number | null, nome: 'Tutto' }, ...dati.categorie].map((c) => {
                const qui = categoria === c.id
                return (
                  <Tocco
                    key={String(c.id)}
                    ruolo="tab"
                    etichetta={c.nome}
                    stato={{ selected: qui }}
                    vibra="scelta"
                    onPress={() => setCategoria(c.id)}
                    style={[stili.categoria, { backgroundColor: qui ? p.carbone : p.carta, borderColor: qui ? p.carbone : p.linea }]}
                  >
                    <Text style={{ color: qui ? '#fff' : p.testo, fontFamily: F.bold, fontSize: 14 }}>{c.nome}</Text>
                  </Tocco>
                )
              })}
            </View>
          ) : null}
          <View style={[stili.griglia, { marginHorizontal: -GAP / 2 }]}>
            {articoli.map((a) => (
              <Scheda key={a.product_id} a={a} colonne={colonne} />
            ))}
          </View>
          <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 }}>
            Il ritiro è in segreteria, negli orari di apertura del club: non facciamo spedizioni.
          </Text>
        </>
      )}

      {inVista ? null : (
        <View style={{ alignItems: 'flex-start' }}>
          <LinkSezione testo="I miei ordini" onPress={() => router.push('/shop/ordini')} />
        </View>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  scheda: { padding: 0, overflow: 'hidden' },
  foto: { width: '100%', aspectRatio: 1 },
  esaurito: { position: 'absolute', left: 10, bottom: 10 },
  testi: { padding: spazio.tre - 2, gap: 4 },
  nome: { fontFamily: F.bold, fontSize: 14.5, lineHeight: 19, minHeight: 38 },
  prezzo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  categorie: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  categoria: { minHeight: 42, paddingHorizontal: spazio.tre + 2, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
