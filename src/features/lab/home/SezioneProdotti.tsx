import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { elencoProdotti, type Prodotto, type StatoProdotto } from '@/api/prodotti'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Icona } from '../ui/Icona'
import { Bollino, Carta, LinkSezione, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { F, usePalette, velo, coloreTono, type ToniTutti } from '../ui/tema'

// La sezione Prodotti della Home: tutto quello che il socio e la famiglia hanno acquistato -
// lezioni, accessi, recuperi, sedute di personal training, badge - con i prodotti ancora
// validi in alto e, sotto, quelli gia' consumati o scaduti. Dai dati di PerfectGym, quindi
// vale quello che vede il club.
//
// Ci sono anche i prodotti a prezzo zero (i recuperi, le sedute comprese nell'abbonamento):
// sono acquisti per il gestionale e per chi li usa, e sono la maggior parte.

export const CHIAVE_PRODOTTI = 'prodotti:elenco'

/** Quanti se ne mostrano per gruppo prima di «Mostra tutti»: un recupero per lezione fa liste lunghe. */
const PRIMI = 8

const STATI: Record<StatoProdotto, { testo: string; tono: ToniTutti }> = {
  valido: { testo: 'Valido', tono: 'ok' },
  consumato: { testo: 'Consumato', tono: 'neutro' },
  scaduto: { testo: 'Scaduto', tono: 'attenzione' },
}

export function useProdotti() {
  const [dati, setDati] = useState<Prodotto[] | null>(() => inMemoria<{ ok: true; prodotti: Prodotto[] }>(CHIAVE_PRODOTTI)?.prodotti ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_PRODOTTI, elencoProdotti)
    if (r.ok) setDati(r.prodotti)
    else setErrore(r.errore)
  }, [])
  useEffect(() => {
    carica()
  }, [carica])
  return { dati, errore, carica }
}

function giorno(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' })
}

function soldi(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

/** «2 su 5» quando il prodotto e' un pacchetto; per un pezzo solo lo stato basta. */
function resto(p: Prodotto): string | null {
  const { quantita_iniziale: i, quantita_residua: r } = p
  return i != null && r != null && i > 1 ? `${r} su ${i} rimasti` : null
}

function Pillola({ stato }: { stato: StatoProdotto }) {
  const pal = usePalette()
  const s = STATI[stato]
  return (
    <View style={[stili.pillola, { backgroundColor: velo(pal, s.tono, 0.16) }]}>
      <Text style={[stili.pillolaTesto, { color: coloreTono(pal, s.tono) }]}>{s.testo}</Text>
    </View>
  )
}

function RigaProdotto({ p, prima }: { p: Prodotto; prima: boolean }) {
  const sotto = [
    p.per,
    resto(p),
    p.acquistato_il ? `acquistato il ${giorno(p.acquistato_il)}` : null,
    p.scade_il && p.stato !== 'consumato' ? `${p.stato === 'scaduto' ? 'scaduto il' : 'entro il'} ${giorno(p.scade_il)}` : null,
    p.prezzo ? soldi(p.prezzo) : null,
  ]
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(' · ')
  return (
    <Riga
      prima={prima}
      icona="pass"
      tono={p.stato === 'valido' ? 'ok' : p.stato === 'scaduto' ? 'attenzione' : 'neutro'}
      titolo={p.nome}
      sotto={sotto || undefined}
      coda={<Pillola stato={p.stato} />}
    />
  )
}

function Gruppo({ titolo, elenco }: { titolo: string; elenco: Prodotto[] }) {
  const [tutti, setTutti] = useState(false)
  if (!elenco.length) return null
  const visibili = tutti ? elenco : elenco.slice(0, PRIMI)
  return (
    <Sezione titolo={titolo} conteggio={elenco.length} destra={elenco.length > PRIMI ? <LinkSezione testo={tutti ? 'Mostra meno' : 'Mostra tutti'} onPress={() => setTutti(!tutti)} /> : undefined}>
      <Carta style={{ paddingVertical: spazio.due }}>
        {visibili.map((p, i) => (
          <RigaProdotto key={p.id} p={p} prima={i === 0} />
        ))}
      </Carta>
    </Sezione>
  )
}

/** L'ingresso allo shop (18/10/2026): gli articoli e il merchandising del club, che si ritirano in segreteria. */
function IngressoShop() {
  const pal = usePalette()
  return (
    <Carta onPress={() => router.push('/shop')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <Bollino icona="sacchetto" tono="accento" size={44} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: pal.testo, fontFamily: F.bold, fontSize: 16 }}>Shop del club</Text>
          <Text style={{ color: pal.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>Articoli e merchandising: paghi online, ritiri in segreteria.</Text>
        </View>
        <Icona nome="avanti" size={16} colore={pal.testoTerzo} />
      </View>
    </Carta>
  )
}

function ProdottiAcquistati() {
  const pal = usePalette()
  const { dati, errore, carica } = useProdotti()

  if (!dati && errore) {
    return (
      <View style={{ gap: spazio.tre }}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo="Riprova" icona="aggiorna" variante="secondario" onPress={carica} />
      </View>
    )
  }
  if (!dati) return <SchedeInArrivo quante={2} />

  if (!dati.length) {
    return (
      <Carta piatta>
        <Text style={{ color: pal.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>Non hai ancora acquistato prodotti.</Text>
        <Text style={{ color: pal.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 20, marginTop: 4 }}>
          Le lezioni singole, gli accessi, i recuperi e le sedute di personal training compaiono qui appena li acquisti.
        </Text>
      </Carta>
    )
  }

  const validi = dati.filter((p) => p.stato === 'valido')
  const altri = dati.filter((p) => p.stato !== 'valido')

  return (
    <View style={{ gap: spazio.quattro }}>
      {validi.length ? (
        <Gruppo titolo="Validi" elenco={validi} />
      ) : (
        <Carta piatta>
          <Text style={{ color: pal.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>Non hai prodotti validi in questo momento.</Text>
        </Carta>
      )}
      <Gruppo titolo="Consumati e scaduti" elenco={altri} />
      <Text style={{ color: pal.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 }}>
        Un recupero o una lezione singola si consuma quando la prenoti; se la disdici in tempo torna valido.
      </Text>
    </View>
  )
}

export function SezioneProdotti() {
  return (
    <View style={{ gap: spazio.quattro }}>
      <IngressoShop />
      <ProdottiAcquistati />
    </View>
  )
}

const stili = StyleSheet.create({
  pillola: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillolaTesto: { fontFamily: F.extra, fontSize: 11.5 },
})
