import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Bollino, Carta, Messaggio, Pulsante } from '../../ui/kit'
import { Schermata } from '../../ui/Schermata'
import { F, raggio, usePalette, velo } from '../../ui/tema'
import { Tocco } from '../../ui/Tocco'
import { inVista } from './identita'

// Le parti che i moduli di Club Life si dividono: la cornice, la scelta a
// pillole, la schermata di fine e l'avviso della vista cliente.

/** La schermata di un modulo: si torna a Club Life, e la barra delle schede non c'e' (un modulo si finisce o si lascia). */
export function Cornice({ sopratitolo, titolo, sottotitolo, children }: { sopratitolo: string; titolo: string; sottotitolo?: string; children: ReactNode }) {
  return (
    <Schermata indietro="/club-life" barra={false} sopratitolo={sopratitolo} titolo={titolo} sottotitolo={sottotitolo}>
      {inVista() ? <Messaggio tono="attenzione">{t('Sei in vista cliente: i moduli non si possono inviare da qui.', 'You’re in client view: forms can’t be sent from here.')}</Messaggio> : null}
      {children}
    </Schermata>
  )
}

export type Opzione = { id: string; testo: string; sotto?: string }

/** Una scelta fra poche voci: pillole che vanno a capo, quella scelta si accende. */
export function Pillole({ opzioni, valore, onScegli, etichetta }: { opzioni: Opzione[]; valore: string | null; onScegli: (id: string) => void; etichetta: string }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{etichetta.toUpperCase()}</Text>
      <View style={stili.pillole} accessibilityRole="radiogroup" accessibilityLabel={etichetta}>
        {opzioni.map((o) => {
          const scelta = o.id === valore
          return (
            <Tocco
              key={o.id}
              onPress={() => onScegli(o.id)}
              ruolo="radio"
              etichetta={o.sotto ? `${o.testo}, ${o.sotto}` : o.testo}
              stato={{ selected: scelta }}
              vibra="scelta"
              scala={0.96}
              style={[
                stili.pillola,
                { borderColor: scelta ? p.accento : p.linea, backgroundColor: scelta ? velo(p, 'accento', 0.14) : p.carta },
              ]}
            >
              <Text style={[stili.pillolaTesto, { color: scelta ? p.accento : p.testo, fontFamily: scelta ? F.extra : F.semi }]}>{o.testo}</Text>
              {o.sotto ? <Text style={[stili.pillolaSotto, { color: p.testoSecondario }]}>{o.sotto}</Text> : null}
            </Tocco>
          )
        })}
      </View>
    </View>
  )
}

/** La fine di un modulo: cosa e' successo, e la strada per tornare a Club Life. */
export function Fatto({ titolo, children }: { titolo: string; children: ReactNode }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.tre }}>
      <Carta style={{ gap: spazio.tre }}>
        <Bollino icona="ok" tono="ok" size={48} pieno />
        <Text style={[stili.fattoTitolo, { color: p.testo }]} accessibilityRole="header">
          {titolo}
        </Text>
        {typeof children === 'string' ? <Text style={[stili.fattoTesto, { color: p.testoSecondario }]}>{children}</Text> : children}
      </Carta>
      <Pulsante testo={t('Torna a Club Life', 'Back to Club Life')} onPress={() => router.navigate('/club-life')} />
    </View>
  )
}

/** Una riga «Ti rispondiamo a …»: chi scrive vede da dove parte il modulo, senza doverlo riscrivere. */
export function DaDoveParti({ email }: { email: string }) {
  const p = usePalette()
  return (
    <View style={[stili.riga, { backgroundColor: p.incavo }]}>
      <Text style={[stili.rigaTesto, { color: p.testoSecondario }]}>
        {t('Ti scriviamo a ', 'We’ll write to ')}<Text style={{ color: p.testo, fontFamily: F.bold }}>{email || t('l’indirizzo del tuo accesso', 'the email you sign in with')}</Text>
      </Text>
    </View>
  )
}

const stili = StyleSheet.create({
  etichetta: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  pillole: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  pillola: { borderWidth: 1.5, borderRadius: raggio.piccolo, paddingHorizontal: spazio.tre - 2, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  pillolaTesto: { fontSize: 14.5, lineHeight: 20 },
  pillolaSotto: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  fattoTitolo: { fontFamily: F.extra, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  fattoTesto: { fontFamily: F.medio, fontSize: 15, lineHeight: 22 },
  riga: { borderRadius: raggio.piccolo, paddingHorizontal: spazio.tre - 2, paddingVertical: spazio.tre - 4 },
  rigaTesto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
})
