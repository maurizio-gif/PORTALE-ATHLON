import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Opzione, PersonaShop, Scelte, TabellaOpzione, ValoreScelta } from '@/api/shop'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio } from '../ui/kit'
import { F, usePalette, velo } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { nomePersona } from './scelte'

// Il questionario prima del carrello (06/11/2026): per il Kit Agonismo, chi e' l'atleta e le due taglie. Le domande, gli aiuti e le tabelle arrivano dal
// server **gia' nella lingua della richiesta**: qui si disegnano e basta, e si rimanda il valore `v`.
//
// - `persona`: una scelta fra chi del nucleo puo' essere l'atleta (titolare e figli). **Di partenza non c'e' nessuna selezione**, anche se la persona e' una sola:
//   per un articolo che costa 79 euro e porta un nome sopra, il nome lo conferma chi compra.
// - `scelta`: pastiglie, raggruppate per `gruppo` se i valori ce l'hanno (per esempio le taglie dei bambini e quelle degli adulti). Sono tutte obbligatorie.
// - `tabella`: un link che apre la guida alle taglie in un foglio. Scorre in orizzontale **dentro il foglio** se non sta: la pagina non scorre mai di lato.
//
// Le pastiglie e le righe sono alte almeno 44 punti (un dito).

export function Questionario({ opzioni, persone, risposte, onCambia }: { opzioni: Opzione[]; persone: PersonaShop[]; risposte: Scelte; onCambia: (id: string, v: ValoreScelta) => void }) {
  return (
    <View style={{ gap: spazio.quattro }}>
      {opzioni.map((o) => (
        <Domanda key={o.id} o={o} persone={persone} risposta={risposte[o.id]} onCambia={(v) => onCambia(o.id, v)} />
      ))}
    </View>
  )
}

function Domanda({ o, persone, risposta, onCambia }: { o: Opzione; persone: PersonaShop[]; risposta: ValoreScelta | undefined; onCambia: (v: ValoreScelta) => void }) {
  const p = usePalette()
  const [guida, setGuida] = useState(false)
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
        {o.etichetta}
      </Text>
      {o.aiuto ? <Text style={[stili.aiuto, { color: p.testoSecondario }]}>{o.aiuto}</Text> : null}
      {o.tabella ? (
        <>
          <Tocco
            onPress={() => setGuida(true)}
            etichetta={o.tabella.titolo || t('Guida alle taglie', 'Size guide')}
            style={stili.guida}
            sollevaInHover={false}
            hitSlop={6}
          >
            <Icona nome="info" size={16} colore={p.accento} />
            <Text style={[stili.guidaTesto, { color: p.accento }]}>{o.tabella.titolo || t('Guida alle taglie', 'Size guide')}</Text>
          </Tocco>
          <Foglio aperto={guida} titolo={o.tabella.titolo || t('Guida alle taglie', 'Size guide')} sottotitolo={o.tabella.nota ?? undefined} onChiudi={() => setGuida(false)}>
            <Tabella tabella={o.tabella} />
          </Foglio>
        </>
      ) : null}
      {o.tipo === 'persona' ? <ScelteDiPersona persone={persone} scelta={typeof risposta === 'object' ? risposta.member_id : null} onScegli={(id) => onCambia({ member_id: id })} /> : <ScelteDiValori o={o} scelta={typeof risposta === 'string' ? risposta : null} onScegli={onCambia} />}
    </View>
  )
}

function ScelteDiPersona({ persone, scelta, onScegli }: { persone: PersonaShop[]; scelta: number | null; onScegli: (memberId: number) => void }) {
  const p = usePalette()
  if (!persone.length) {
    return <Messaggio tono="attenzione">{t('Non troviamo nessuno nel tuo nucleo a cui intestare questo articolo.', 'We can’t find anyone in your household to order this item for.')}</Messaggio>
  }
  return (
    <View style={{ gap: spazio.due }} accessibilityRole="radiogroup">
      {persone.map((x) => {
        const on = x.member_id === scelta
        const nome = nomePersona(x) || t('Senza nome', 'No name')
        return (
          <Tocco
            key={x.member_id}
            vibra="scelta"
            ruolo="radio"
            stato={{ checked: on }}
            etichetta={x.anno ? `${nome}, ${x.anno}` : nome}
            onPress={() => onScegli(x.member_id)}
            style={[stili.riga, { backgroundColor: on ? velo(p, 'accento', p.scuro ? 0.18 : 0.1) : p.incavo, borderColor: on ? p.accento : 'transparent' }]}
          >
            <View style={[stili.radio, { borderColor: on ? p.accento : p.testoTerzo }]}>{on ? <View style={[stili.radioPieno, { backgroundColor: p.accento }]} /> : null}</View>
            <Text style={{ flex: 1, color: p.testo, fontFamily: on ? F.extra : F.bold, fontSize: 15 }}>{nome}</Text>
            {x.anno ? <Text style={[stili.aiuto, { color: p.testoSecondario }]}>{x.anno}</Text> : null}
          </Tocco>
        )
      })}
    </View>
  )
}

function ScelteDiValori({ o, scelta, onScegli }: { o: Opzione; scelta: string | null; onScegli: (v: string) => void }) {
  const p = usePalette()
  const valori = o.valori ?? []
  // I gruppi nell'ordine in cui compaiono; i valori senza gruppo stanno sotto un gruppo senza titolo.
  const gruppi: { nome: string | null; valori: typeof valori }[] = []
  for (const v of valori) {
    const nome = v.gruppo ?? null
    const g = gruppi.find((x) => x.nome === nome)
    if (g) g.valori.push(v)
    else gruppi.push({ nome, valori: [v] })
  }
  return (
    <View style={{ gap: spazio.tre }} accessibilityRole="radiogroup">
      {gruppi.map((g) => (
        <View key={g.nome ?? ''} style={{ gap: spazio.due }}>
          {g.nome ? <Text style={[stili.gruppo, { color: p.testoSecondario }]}>{g.nome}</Text> : null}
          <View style={stili.pastiglie}>
            {g.valori.map((v) => {
              const on = v.v === scelta
              return (
                <Tocco
                  key={v.v}
                  vibra="scelta"
                  ruolo="radio"
                  stato={{ checked: on }}
                  etichetta={g.nome ? `${g.nome}: ${v.v_testo}` : v.v_testo}
                  onPress={() => onScegli(v.v)}
                  style={[stili.pastiglia, { backgroundColor: on ? velo(p, 'accento', p.scuro ? 0.18 : 0.1) : p.incavo, borderColor: on ? p.accento : 'transparent' }]}
                >
                  <Text style={{ color: on ? p.accento : p.testo, fontFamily: on ? F.extra : F.bold, fontSize: 15 }}>{v.v_testo}</Text>
                </Tocco>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

const LARGHEZZA_PRIMA = 108
const LARGHEZZA_COLONNA = 84

/** La guida alle taglie: una tabella che, se non sta nella larghezza del foglio, scorre di lato dentro il foglio. */
function Tabella({ tabella }: { tabella: TabellaOpzione }) {
  const p = usePalette()
  const cella = (i: number, testo: string, intestazione: boolean) => (
    <View key={i} style={[stili.cella, { width: i === 0 ? LARGHEZZA_PRIMA : LARGHEZZA_COLONNA }]}>
      <Text style={{ color: p.testo, fontFamily: intestazione || i === 0 ? F.extra : F.medio, fontSize: 14, lineHeight: 19 }}>{testo}</Text>
    </View>
  )
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={[stili.tabella, { borderColor: p.linea }]} accessibilityLabel={tabella.titolo}>
      <View>
        <View style={[stili.rigaTabella, { backgroundColor: p.incavo }]}>{tabella.colonne.map((c, i) => cella(i, c, true))}</View>
        {tabella.righe.map((r, k) => (
          <View key={k} style={[stili.rigaTabella, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
            {r.map((c, i) => cella(i, c, false))}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const stili = StyleSheet.create({
  titolo: { fontFamily: F.extra, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  aiuto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  guida: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 44 },
  guidaTesto: { fontFamily: F.bold, fontSize: 14.5 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, minHeight: 56, borderRadius: 14, borderWidth: 1.5, paddingVertical: spazio.due, paddingHorizontal: spazio.tre },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioPieno: { width: 10, height: 10, borderRadius: 5 },
  gruppo: { fontFamily: F.extra, fontSize: 11.5, lineHeight: 15, letterSpacing: 0.9, textTransform: 'uppercase' },
  pastiglie: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  pastiglia: { minHeight: 46, minWidth: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: spazio.tre },
  tabella: { borderWidth: 1, borderRadius: 14 },
  rigaTabella: { flexDirection: 'row' },
  cella: { paddingVertical: spazio.due + 2, paddingHorizontal: spazio.tre },
})
