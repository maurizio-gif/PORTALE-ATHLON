import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { impostaProgressione, type SchedaLab } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { giornoBreve } from '../dispositivi/comune'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Bollino, Carta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { etichettaSettimana, frase, fraseSettimana, haPercentuali, SETTIMANE_MAX, SETTIMANE_MIN, SETTIMANE_PREDEFINITE, vociDelCiclo, type Progressione, type SettimanaCiclo } from './progressione'

// La progressione a cicli di un piano proprio (31/10/2026, richiesta di Maurizio: «piani pluri-settimanali con scarico»). Sta in cima al piano: se il ciclo c'e', dice
// in che settimana si e' e cosa cambia; se non c'e' e il piano e' del socio, lo propone. **Il piano non cambia**: i numeri della settimana li ricava l'app
// (`progressione.ts`) e li mostra in questa schermata e nella seduta; l'editor lavora sempre sul piano di base. Si attiva, si cambia, si fa ripartire e si toglie da
// qui, senza passare dall'editor. Nella vista cliente dello staff si legge e basta (la funzione rifiuterebbe).

/** Il ciclo si puo' gestire solo da un piano proprio di sala, e non nella vista cliente. */
export const gestibile = (s: Pick<SchedaLab, 'tipo' | 'ambiente'>, vista: boolean): boolean => !vista && s.tipo === 'socio' && s.ambiente !== 'vasca'

export function CartaProgressione({ scheda, settimana, vista, onCambiata }: { scheda: SchedaLab; settimana: SettimanaCiclo | null; vista: boolean; onCambiata: (p: Progressione | null) => void }) {
  const p = usePalette()
  const [foglio, setFoglio] = useState(false)
  const puo = gestibile(scheda, vista)
  const conPercentuali = haPercentuali(scheda)

  if (!settimana && !puo) return null
  return (
    <>
      {settimana ? (
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.testa}>
            <Bollino icona="rinnovo" tono={settimana.scarico ? 'blu' : 'accento'} size={44} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">{etichettaSettimana(settimana)}</Text>
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                {t(`Dal ${giornoBreve(settimana.dal)} al ${giornoBreve(settimana.al)} · ciclo ${settimana.ciclo}`, `${giornoBreve(settimana.dal)} to ${giornoBreve(settimana.al)} · cycle ${settimana.ciclo}`)}
              </Text>
            </View>
          </View>
          <View style={stili.tacche} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {vociDelCiclo(settimana.di).map((v) => (
              <View key={v.numero} style={[stili.tacca, { backgroundColor: v.numero === settimana.numero ? (v.tipo === 'scarico' ? p.blu : p.accento) : v.numero < settimana.numero ? p.testoTerzo : p.linea, opacity: v.numero < settimana.numero ? 0.55 : 1 }]} />
            ))}
          </View>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{fraseSettimana(settimana, conPercentuali)}</Text>
          {puo ? <Pulsante testo={t('Cambia o togli il ciclo', 'Change or remove the cycle')} variante="secondario" piccolo onPress={() => setFoglio(true)} /> : null}
        </Carta>
      ) : (
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.testa}>
            <Bollino icona="rinnovo" tono="neutro" size={44} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[stili.titolo, { color: p.testo }]}>{t('Fai progredire il piano', 'Make the plan progress')}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t('Un ciclo di qualche settimana: i carichi in percentuale salgono un po’ ogni settimana e l’ultima è di scarico, per recuperare. Poi si ricomincia. Il piano resta quello che hai scritto.', 'A cycle of a few weeks: percentage loads go up a little each week and the last one is a deload, to recover. Then you start again. The plan stays as you wrote it.')}
              </Text>
            </View>
          </View>
          <Pulsante testo={t('Prova un ciclo', 'Try a cycle')} variante="secondario" piccolo onPress={() => setFoglio(true)} />
        </Carta>
      )}
      {foglio ? <FoglioCiclo aperto scheda={scheda} attuale={scheda.progressione ?? null} conPercentuali={conPercentuali} onChiudi={() => setFoglio(false)} onCambiata={onCambiata} /> : null}
    </>
  )
}

function FoglioCiclo({ aperto, scheda, attuale, conPercentuali, onChiudi, onCambiata }: { aperto: boolean; scheda: SchedaLab; attuale: Progressione | null; conPercentuali: boolean; onChiudi: () => void; onCambiata: (p: Progressione | null) => void }) {
  const p = usePalette()
  const [durata, setDurata] = useState(attuale?.settimane ?? SETTIMANE_PREDEFINITE)
  const [invio, setInvio] = useState<'salva' | 'riparti' | 'togli' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function invia(settimane: number | null, riparti: boolean, come: 'salva' | 'riparti' | 'togli') {
    setInvio(come)
    setErrore(null)
    const r = await impostaProgressione(scheda.id, settimane, riparti)
    setInvio(null)
    if (!r.ok) return setErrore(r.errore)
    onCambiata(r.progressione)
    onChiudi()
  }

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo={t('Ciclo a settimane', 'Weekly cycle')} sottotitolo={t('Le prime settimane il carico sale un po’, l’ultima è di scarico. Poi il ciclo ricomincia da solo.', 'In the first weeks the load goes up a little, the last one is a deload. Then the cycle starts again on its own.')}>
      <View style={stili.stepper}>
        <Tocco onPress={() => setDurata((d) => Math.max(SETTIMANE_MIN, d - 1))} etichetta={t('Una settimana in meno', 'One week fewer')} spento={durata <= SETTIMANE_MIN} style={[stili.tondo, { backgroundColor: p.incavo, opacity: durata <= SETTIMANE_MIN ? 0.4 : 1 }]}>
          <Icona nome="meno" size={18} colore={p.testo} />
        </Tocco>
        <Text style={[stili.durata, { color: p.testo }]} accessibilityLiveRegion="polite">{t(`${durata} settimane`, `${durata} weeks`)}</Text>
        <Tocco onPress={() => setDurata((d) => Math.min(SETTIMANE_MAX, d + 1))} etichetta={t('Una settimana in più', 'One week more')} spento={durata >= SETTIMANE_MAX} style={[stili.tondo, { backgroundColor: p.incavo, opacity: durata >= SETTIMANE_MAX ? 0.4 : 1 }]}>
          <Icona nome="piu" size={18} colore={p.testo} />
        </Tocco>
      </View>

      <View style={{ gap: spazio.due }}>
        {vociDelCiclo(durata).map((v) => (
          <View key={v.numero} style={stili.voce}>
            <View style={[stili.numero, { backgroundColor: v.tipo === 'scarico' ? p.blu : v.tipo === 'carico' ? p.accento : p.incavo }]}>
              <Text style={[stili.numeroTesto, { color: v.tipo === 'base' ? p.testo : '#fff' }]}>{v.numero}</Text>
            </View>
            <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{frase(v)}</Text>
          </View>
        ))}
      </View>

      {!conPercentuali ? <Messaggio tono="attenzione">{t('Questo piano non ha carichi in percentuale: nelle settimane di carico non cambia niente, in quella di scarico si fanno meno serie.', 'This plan has no percentage loads: nothing changes in the loading weeks, in the deload week you do fewer sets.')}</Messaggio> : null}
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>
        {t('Sono indicazioni prudenti e non sostituiscono un istruttore: se senti dolore o fai troppa fatica, riduci o chiedi in sala. Il piano di base resta com’è e lo cambi quando vuoi.', 'These are cautious guidelines and don’t replace an instructor: if you feel pain or it’s too hard, ease off or ask on the floor. The base plan stays as it is and you can change it any time.')}
      </Text>

      {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
      {attuale ? (
        <>
          <Pulsante
            testo={durata !== attuale.settimane ? t(`Passa a ${durata} settimane, da oggi`, `Switch to ${durata} weeks, from today`) : t('Riparti da oggi', 'Restart from today')}
            inCorso={invio === (durata !== attuale.settimane ? 'salva' : 'riparti')}
            disabilitato={invio !== null}
            onPress={() => void invia(durata, true, durata !== attuale.settimane ? 'salva' : 'riparti')}
          />
          <Pulsante testo={t('Togli il ciclo', 'Remove the cycle')} variante="pericolo" inCorso={invio === 'togli'} disabilitato={invio !== null} onPress={() => void invia(null, false, 'togli')} />
        </>
      ) : (
        <Pulsante testo={t('Comincia oggi', 'Start today')} inCorso={invio === 'salva'} disabilitato={invio !== null} onPress={() => void invia(durata, false, 'salva')} />
      )}
    </Foglio>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  titolo: { fontFamily: F.extra, fontSize: 17 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  tacche: { flexDirection: 'row', gap: 4 },
  tacca: { flex: 1, height: 5, borderRadius: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spazio.quattro },
  tondo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  durata: { minWidth: 130, textAlign: 'center', fontFamily: F.extra, fontSize: 22 },
  voce: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  numero: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numeroTesto: { fontFamily: F.extra, fontSize: 13 },
})
