import { LinearGradient } from 'expo-linear-gradient'
import { Redirect, router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Entra, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { Bolla, Cerchi, Emoji, Grappolo } from './Emoji'
import { COLORE_MACRO, TEMI, temaPer, type Blocco, type Tema } from './temi'
import { Visual } from './Visual'

// Una lettura di «Capire il cibo» (01/11/2026): l'apertura a colori con la frase da portarsi via, poi i blocchi di
// `temi.ts` (testo, punti, un disegno che spiega, un «mito o realta'» da toccare), le fonti, e la lettura dopo.
// Consigli di base, non un piano: in fondo a ogni lettura un disclaimer semplice lo dice (richiesta di Maurizio, 01/11/2026).
// Le illustrazioni sono emoji (Emoji.tsx), le stesse della tessera in Food.

const INDIETRO = '/allenamento?area=food' as const

export function Cultura({ id }: { id: string | undefined }) {
  const tema = temaPer(id)
  if (!tema) return <Redirect href={INDIETRO} />
  return <Lettura key={tema.id} tema={tema} />
}

function Lettura({ tema }: { tema: Tema }) {
  const p = usePalette()
  const i = TEMI.findIndex((x) => x.id === tema.id)
  const prossimo = TEMI[(i + 1) % TEMI.length]
  return (
    <Schermata sopratitolo={`Food · ${t('Cultura', 'Culture')}`} titolo={tema.titolo} sottotitolo={tema.sottotitolo} indietro={INDIETRO} barra={false}>
      <Entra indice={0}>
        <LinearGradient colors={tema.colori} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={stili.apertura}>
          <Cerchi />
          <View style={stili.testaApertura}>
            <View style={stili.minuti}>
              <Icona nome="orologio" size={13} colore="#fff" />
              <Text style={stili.testoMinuti}>{t(`${tema.minuti} min di lettura`, `${tema.minuti} min read`)}</Text>
            </View>
            <Grappolo emoji={tema.emoji} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={stili.etichettaApertura}>{t('IN UNA RIGA', 'IN ONE LINE')}</Text>
            <Text style={stili.testoApertura}>{tema.unaRiga}</Text>
          </View>
        </LinearGradient>
      </Entra>

      {tema.blocchi.map((b, k) => (
        <Entra key={k} indice={k + 1}>
          <BloccoLettura blocco={b} tema={tema} anima={k < 3} />
        </Entra>
      ))}

      <Entra indice={tema.blocchi.length + 1}>
        <View style={{ gap: spazio.due + 2, paddingHorizontal: 4 }}>
          <View style={stili.disclaimer}>
            <Icona nome="info" size={16} colore={p.testoSecondario} style={{ marginTop: 2 }} />
            <Text style={[stili.testoDisclaimer, { color: p.testoSecondario }]}>
              {t('Questi sono consigli di base e non sostituiscono il piano di un nutrizionista.', 'These are basic tips and do not replace a nutritionist’s plan.')}
            </Text>
          </View>
          <Text style={[stili.fonti, { color: p.testoTerzo }]}>
            {t('Fonti', 'Sources')}: {tema.fonti}
          </Text>
        </View>
      </Entra>

      <Entra indice={tema.blocchi.length + 2}>
        <Tocco onPress={() => router.replace({ pathname: '/allenamento/cultura', params: { tema: prossimo.id } })} etichetta={t(`Prossima lettura: ${prossimo.titolo}`, `Next reading: ${prossimo.titolo}`)} scala={0.98}>
          <LinearGradient colors={prossimo.colori} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={stili.prossima}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={stili.etichettaProssima}>{t('PROSSIMA LETTURA', 'NEXT READING')}</Text>
              <Text style={stili.titoloProssima}>{prossimo.titolo}</Text>
            </View>
            <View style={stili.frecciaProssima}>
              <Icona nome="avanti" size={18} colore="#fff" />
            </View>
          </LinearGradient>
        </Tocco>
      </Entra>
    </Schermata>
  )
}

function BloccoLettura({ blocco, tema, anima }: { blocco: Blocco; tema: Tema; anima: boolean }) {
  const p = usePalette()
  switch (blocco.tipo) {
    case 'testo':
      return (
        <Carta style={{ gap: spazio.due + 2 }}>
          {blocco.titolo ? <Text style={[stili.titoletto, { color: p.testo }]}>{blocco.titolo}</Text> : null}
          <Text style={[stili.corpo, { color: p.testoSecondario }]}>{blocco.testo}</Text>
        </Carta>
      )
    case 'punti':
      return (
        <Carta style={{ gap: spazio.tre }}>
          {blocco.titolo ? <Text style={[stili.titoletto, { color: p.testo }]}>{blocco.titolo}</Text> : null}
          <View style={{ gap: spazio.tre }}>
            {blocco.voci.map((v) => (
              <View key={v.titolo} style={stili.punto}>
                {v.emoji ? <Bolla emoji={v.emoji} colore={v.macro ? COLORE_MACRO[v.macro] : tema.accento} /> : <View style={[stili.pallino, { backgroundColor: tema.accento }]} />}
                <Text style={[stili.corpo, { color: p.testoSecondario, flex: 1 }]}>
                  <Text style={{ fontFamily: F.bold, color: p.testo }}>{v.titolo}. </Text>
                  {v.testo}
                </Text>
              </View>
            ))}
          </View>
        </Carta>
      )
    case 'visual':
      return (
        <Carta style={{ gap: spazio.tre }}>
          {blocco.titolo ? <Text style={[stili.titoletto, { color: p.testo }]}>{blocco.titolo}</Text> : null}
          <Visual nome={blocco.visual} accento={tema.accento} anima={anima} />
          {blocco.didascalia ? <Text style={[stili.didascalia, { color: p.testoSecondario }]}>{blocco.didascalia}</Text> : null}
        </Carta>
      )
    case 'mito':
      return <Mito mito={blocco.mito} realta={blocco.realta} />
  }
}

/** «Mito o realta'?»: la carta scura col mito, e toccandola si legge com'e' davvero. */
function Mito({ mito, realta }: { mito: string; realta: string }) {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  return (
    <Tocco onPress={() => setAperto((a) => !a)} etichetta={t('Mito o realtà? Tocca per scoprirlo', 'Myth or reality? Tap to find out')} stato={{ expanded: aperto }} scala={0.985}>
      <View style={[stili.mito, { backgroundColor: p.carbone }]}>
        <View style={stili.testaMito}>
          <Tag testo={t('Mito o realtà?', 'Myth or reality?')} colore="#FF8A2B" />
          <Emoji e={aperto ? '✅' : '🤔'} size={30} />
        </View>
        <Text style={[stili.testoMito, aperto && { opacity: 0.5, textDecorationLine: 'line-through', fontSize: 16, lineHeight: 22 }]}>«{mito}»</Text>
        {aperto ? (
          <Animated.View entering={FadeIn.duration(280)} style={{ gap: 8 }}>
            <Tag testo={t('La realtà', 'The reality')} colore={ORTO[0]} />
            <Text style={stili.testoRealta}>{realta}</Text>
          </Animated.View>
        ) : (
          <View style={stili.invito}>
            <Icona nome="giu" size={14} colore="rgba(255,255,255,0.7)" />
            <Text style={stili.testoInvito}>{t('Tocca per scoprirlo', 'Tap to find out')}</Text>
          </View>
        )}
      </View>
    </Tocco>
  )
}

const stili = StyleSheet.create({
  apertura: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.quattro, overflow: 'hidden', justifyContent: 'space-between' },
  testaApertura: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  minuti: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  testoMinuti: { color: '#fff', fontFamily: F.bold, fontSize: 12.5 },
  etichettaApertura: { color: 'rgba(255,255,255,0.8)', fontFamily: F.extra, fontSize: 11, letterSpacing: 1.6 },
  testoApertura: { color: '#fff', fontFamily: F.extra, fontSize: 21, lineHeight: 27, letterSpacing: -0.5 },
  titoletto: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 },
  corpo: { fontFamily: F.medio, fontSize: 15.5, lineHeight: 24 },
  didascalia: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 20 },
  punto: { flexDirection: 'row', gap: spazio.tre - 2 },
  pallino: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  testaMito: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mito: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre - 2 },
  testoMito: { color: '#fff', fontFamily: F.extra, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  testoRealta: { color: '#fff', fontFamily: F.semi, fontSize: 16, lineHeight: 24 },
  invito: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  testoInvito: { color: 'rgba(255,255,255,0.7)', fontFamily: F.semi, fontSize: 13 },
  disclaimer: { flexDirection: 'row', gap: spazio.due },
  testoDisclaimer: { flex: 1, fontFamily: F.semi, fontSize: 14, lineHeight: 20 },
  fonti: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  prossima: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderRadius: 24, padding: spazio.tre + 4 },
  etichettaProssima: { color: 'rgba(255,255,255,0.8)', fontFamily: F.extra, fontSize: 11, letterSpacing: 1.6 },
  titoloProssima: { color: '#fff', fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4 },
  frecciaProssima: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
})
