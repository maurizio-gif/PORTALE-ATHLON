import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useId } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg'

import { t } from '@/lib/lingua'

import { F, FUOCO, NOTTE } from '../ui/tema'

// Il badge di accesso al club (22/10/2026, richiesta di Maurizio): la carta che la persona ha nel wallet del
// telefono e con cui passa al tornello. **Questo e' solo il disegno**: i dati li dà chi lo usa, e il badge non
// sa niente di abbonamenti, pagamenti o certificati (se si entra lo decide il database a ogni passaggio).
//
// E' una carta «carbone», **scura uguale nei due temi** come le altre schede scure dell'app. Il formato e' quello di
// una carta (1,586 : 1), cosi' sullo schermo somiglia a quello che la persona avra' nel wallet. Sopra ci sono il
// marchio, il nome e il numero socio e il segno dei pagamenti senza contatto; **niente foto**: nell'app la foto sta in
// due posti soli (Profilo e Home), e un posto in piu' si chiede al club.

const PITTOGRAMMA = require('@/../assets/images/pittogramma.png')

/** Un arco che si apre a destra, come il segno del «senza contatto»: centro (cx, cy), raggio r, mezza apertura in gradi. */
function arco(cx: number, cy: number, r: number, gradi = 38): string {
  const a = (gradi * Math.PI) / 180
  const x = (cx + r * Math.cos(a)).toFixed(2)
  const su = (cy - r * Math.sin(a)).toFixed(2)
  const giu = (cy + r * Math.sin(a)).toFixed(2)
  return `M ${x} ${su} A ${r} ${r} 0 0 1 ${x} ${giu}`
}

/** «MARCO» e «marco» diventano «Marco»: su PerfectGym molti nomi sono scritti tutti in maiuscolo. Un nome gia' scritto bene resta com'e'. */
export function nomeLeggibile(s: string | null | undefined): string {
  const x = (s ?? '').trim()
  if (!x) return ''
  if (x !== x.toUpperCase()) return x
  let fuori = ''
  let maiuscola = true
  for (const c of x.toLowerCase()) {
    fuori += maiuscola ? c.toUpperCase() : c
    maiuscola = c === ' ' || c === '-' || c === "'" || c === '’'
  }
  return fuori
}

/** Il segno del «senza contatto»: quattro archi, e' quello che si riconosce sul lettore. */
export function SegnoSenzaContatto({ size = 28, colore = FUOCO[0] }: { size?: number; colore?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[5, 10, 15, 20].map((r) => (
        <Path key={r} d={arco(3, 14, r)} stroke={colore} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.45 + r * 0.0275} />
      ))}
    </Svg>
  )
}

export function BadgeAccesso({ nome, cognome, numero }: { nome: string | null; cognome: string | null; numero: string | null }) {
  // Un identificativo per il gradiente: due badge nella stessa pagina non devono pescare l'uno dall'altro.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const intero = [nomeLeggibile(nome), nomeLeggibile(cognome)].filter(Boolean).join(' ')
  const etichetta = t(
    `Badge di accesso al club${intero ? ` di ${intero}` : ''}${numero ? `, socio numero ${numero}` : ''}`,
    `Club access badge${intero ? ` for ${intero}` : ''}${numero ? `, member number ${numero}` : ''}`,
  )

  return (
    <View style={stili.guscio} accessible accessibilityRole="image" accessibilityLabel={etichetta}>
      <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {/* L'alone arancio in alto a destra e gli anelli in basso: solo atmosfera, a bassa voce. */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 160 101" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
        <Defs>
          <RadialGradient id={id} cx="138" cy="-6" r="82" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={FUOCO[1]} stopOpacity="0.62" />
            <Stop offset="1" stopColor={FUOCO[1]} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="160" height="101" fill={`url(#${id})`} />
        {[34, 58, 82, 106].map((r) => (
          <Circle key={r} cx="160" cy="101" r={r} stroke="rgba(255,255,255,0.055)" strokeWidth="0.6" fill="none" />
        ))}
      </Svg>

      <View style={stili.contenuto}>
        <View style={stili.alto}>
          <View style={stili.marchio}>
            <Image source={PITTOGRAMMA} style={stili.pittogramma} contentFit="contain" />
            <Text style={stili.nomeClub}>ATHLON CLUB</Text>
          </View>
          <View style={stili.tag}>
            <Text style={stili.tagTesto}>{t('ACCESSO', 'ACCESS')}</Text>
          </View>
        </View>

        <View style={stili.basso}>
          <View style={stili.dati}>
            <Text style={stili.etichetta}>{t('SOCIO', 'MEMBER')}</Text>
            <Text style={stili.nome} numberOfLines={2}>
              {intero || t('Il tuo nome', 'Your name')}
            </Text>
            {numero ? <Text style={stili.numero}>{t(`n. ${numero}`, `No. ${numero}`)}</Text> : null}
          </View>
          <View style={stili.bollino}>
            <SegnoSenzaContatto />
          </View>
        </View>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  guscio: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'flex-start',
    aspectRatio: 1.586,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#17181B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    boxShadow: '0 22px 44px rgba(255, 87, 1, 0.16), 0 10px 26px rgba(0, 0, 0, 0.38)',
  },
  contenuto: { flex: 1, padding: 22, justifyContent: 'space-between' },
  alto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  marchio: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pittogramma: { width: 26, height: 26 },
  nomeClub: { fontFamily: F.extra, fontSize: 13, letterSpacing: 2.4, color: 'rgba(255,255,255,0.92)' },
  tag: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagTesto: { fontFamily: F.bold, fontSize: 10, letterSpacing: 1.8, color: 'rgba(255,255,255,0.78)' },
  basso: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  dati: { flex: 1, gap: 3 },
  etichetta: { fontFamily: F.bold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.55)' },
  nome: { fontFamily: F.extra, fontSize: 25, lineHeight: 29, letterSpacing: -0.6, color: '#FFFFFF' },
  numero: { fontFamily: F.semi, fontSize: 14, letterSpacing: 0.4, color: FUOCO[0] },
  bollino: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
})
