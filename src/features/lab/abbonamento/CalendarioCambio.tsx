import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { dataLunga } from '../RiepilogoCosti'
import { Carta, Messaggio } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

// La data del cambio abbonamento (02/11/2026, richiesta di Maurizio: «nel cambio devi mettere una data nei prossimi 30 giorni, quindi apri un
// calendario con i prossimi 30 giorni al massimo»). Un calendario a settimane (da lunedi') dove si toccano solo i giorni fra `min` e `max`, che
// arrivano dal server (`cambio_stato`): da domani, per 30 giorni al massimo. **La data e' quando parte il nuovo abbonamento; il vecchio finisce
// il giorno prima**, e lo dice sotto il calendario. Se il vecchio finisce prima della sua scadenza naturale (`fineNaturale`) la schermata lo scrive.

const DAY = 86_400_000

function utc(iso: string): number {
  const [a, m, g] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, g)
}
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Le celle del calendario: dal lunedi' della settimana di `min` alla domenica di quella di `max`. */
function celle(min: string, max: string): string[] {
  const da = utc(min)
  const a = utc(max)
  const lunedi = da - ((new Date(da).getUTCDay() + 6) % 7) * DAY
  const domenica = a + ((7 - new Date(a).getUTCDay()) % 7) * DAY
  const out: string[] = []
  for (let g = lunedi; g <= domenica; g += DAY) out.push(iso(g))
  return out
}

function nomeMese(giorno: string): string {
  return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(utc(giorno)))
}

/** «dic» sotto l'1 di un mese: il calendario scorre da un mese al successivo senza intestazione. */
function meseBreve(giorno: string): string {
  return new Intl.DateTimeFormat(locale(), { month: 'short', timeZone: 'UTC' }).format(new Date(utc(giorno))).replace('.', '')
}

function sigleSettimana(): string[] {
  // Un lunedi' qualunque (5/1/2026) e i sei giorni dopo, nella lingua dell'app.
  const f = new Intl.DateTimeFormat(locale(), { weekday: 'narrow', timeZone: 'UTC' })
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2026, 0, 5 + i))))
}

export function CalendarioCambio({
  min,
  max,
  scelta,
  onScegli,
  piano,
  fineNaturale,
}: {
  min: string
  max: string
  scelta: string | null
  onScegli: (giorno: string) => void
  piano: string
  /** L'ultimo giorno del vecchio abbonamento, se si lascia arrivare alla sua scadenza. */
  fineNaturale: string
}) {
  const p = usePalette()
  const giorni = useMemo(() => celle(min, max), [min, max])
  const settimane = useMemo(() => {
    const s: string[][] = []
    for (let i = 0; i < giorni.length; i += 7) s.push(giorni.slice(i, i + 7))
    return s
  }, [giorni])
  const fineVecchio = scelta ? iso(utc(scelta) - DAY) : null
  const prima = !!fineVecchio && fineVecchio < fineNaturale
  // Il mese si scrive sopra la riga in cui cambia (e sopra la prima).
  const meseDellaRiga = (riga: string[]) => nomeMese(riga.find((g) => g >= min && g <= max) ?? riga[0])

  return (
    <View style={{ gap: spazio.tre }}>
      <Carta piatta>
        <View style={{ gap: spazio.due }}>
          <View style={stili.settimana}>
            {sigleSettimana().map((s, i) => (
              <Text key={i} style={[stili.sigla, { color: p.testoSecondario }]}>
                {s}
              </Text>
            ))}
          </View>
          {settimane.map((riga, r) => {
            const mese = meseDellaRiga(riga)
            const mostraMese = r === 0 || mese !== meseDellaRiga(settimane[r - 1])
            return (
              <View key={riga[0]} style={{ gap: 6 }}>
                {mostraMese ? <Text style={[stili.mese, { color: p.testo }]}>{mese}</Text> : null}
                <View style={stili.settimana}>
                  {riga.map((g) => {
                    const dentro = g >= min && g <= max
                    const attivo = g === scelta
                    const giorno = Number(g.slice(8))
                    return (
                      <View key={g} style={stili.cella}>
                        <Tocco
                          vibra="scelta"
                          spento={!dentro}
                          stato={{ selected: attivo, disabled: !dentro }}
                          etichetta={dentro ? t(`Parte il ${dataLunga(g)}`, `Starts ${dataLunga(g)}`) : dataLunga(g)}
                          onPress={dentro ? () => onScegli(g) : undefined}
                          scala={0.92}
                          style={[
                            stili.giorno,
                            attivo
                              ? { backgroundColor: p.accento, borderColor: p.accento }
                              : dentro
                                ? { backgroundColor: p.carta, borderColor: p.linea }
                                : { backgroundColor: 'transparent', borderColor: 'transparent' },
                          ]}
                        >
                          <Text
                            style={{
                              color: attivo ? '#fff' : dentro ? p.testo : p.testoTerzo,
                              fontFamily: attivo ? F.extra : dentro ? F.bold : F.medio,
                              fontSize: 15,
                              opacity: dentro ? 1 : 0.4,
                            }}
                          >
                            {giorno}
                          </Text>
                          {giorno === 1 ? (
                            <Text style={{ color: attivo ? '#fff' : p.testoSecondario, fontFamily: F.bold, fontSize: 9, lineHeight: 10, textTransform: 'uppercase', opacity: dentro ? 1 : 0.4 }}>
                              {meseBreve(g)}
                            </Text>
                          ) : null}
                        </Tocco>
                      </View>
                    )
                  })}
                </View>
              </View>
            )
          })}
        </View>
      </Carta>

      {scelta && fineVecchio ? (
        <Carta piatta>
          <View style={{ gap: spazio.due }}>
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{t('Il nuovo abbonamento parte il', 'The new membership starts on')}</Text>
            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 }}>{dataLunga(scelta)}</Text>
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>
              {t(
                `Il tuo abbonamento attuale (${piano}) finisce il giorno prima, il ${dataLunga(fineVecchio)}: nessuna pausa in mezzo. La quota di attivazione è in omaggio.`,
                `Your current membership (${piano}) ends the day before, on ${dataLunga(fineVecchio)}: no gap in between. The joining fee is waived.`,
              )}
            </Text>
          </View>
        </Carta>
      ) : null}

      {prima ? (
        <Messaggio tono="attenzione">
          {iso(utc(fineNaturale) + DAY) <= max
            ? t(
                `Il tuo abbonamento attuale arriverebbe fino al ${dataLunga(fineNaturale)}: scegliendo questa data finisce prima. Se preferisci non perdere nessun giorno, scegli il ${dataLunga(iso(utc(fineNaturale) + DAY))}.`,
                `Your current membership would run until ${dataLunga(fineNaturale)}: choosing this date ends it earlier. If you’d rather not lose any days, choose ${dataLunga(iso(utc(fineNaturale) + DAY))}.`,
              )
            : t(
                `Il tuo abbonamento attuale arriverebbe fino al ${dataLunga(fineNaturale)}: scegliendo questa data finisce prima.`,
                `Your current membership would run until ${dataLunga(fineNaturale)}: choosing this date ends it earlier.`,
              )}
        </Messaggio>
      ) : null}
    </View>
  )
}

const stili = StyleSheet.create({
  settimana: { flexDirection: 'row' },
  sigla: { flex: 1, textAlign: 'center', fontFamily: F.bold, fontSize: 12, textTransform: 'uppercase' },
  mese: { fontFamily: F.extra, fontSize: 14, textTransform: 'capitalize', marginTop: 4 },
  cella: { flex: 1, alignItems: 'center' },
  giorno: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
})
