import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Misura } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { altezzaAl, bmi, dataCorta, fasciaBmi, numero } from '../dati/calcoli'
import { spostaGiorno } from '../schede/contatoreCalorie'
import { Icona } from '../ui/Icona'
import { Pulsante } from '../ui/kit'
import { coloreTono, F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

// Il tuo corpo (richiesta del club, 19/10/2026): i dati del corpo stanno in alto
// nell'Athlon Health System, sopra le tre aree, perche' non sono del solo
// allenamento. Sono il punto di partenza (servono a stimare le calorie consumate)
// e la verifica (dicono se l'equilibrio di Train, Food e Relax funziona). Oggi
// peso, BMI, circonferenze e massa grassa e magra; le misure di composizione
// corporea che arriveranno (una bilancia BIA, per esempio) si aggiungono qui.
// Il dettaglio resta la schermata «Il tuo corpo» (/allenamento/misure).
// **Su Fit si presenta compressa** (24/10/2026, richiesta di Maurizio, come il Balance): il titolo e una riga che dice
// cosa si trova di la' (le misure, si aggiornano, si guarda come cambiano); le cifre compaiono toccando, e aperta ha il
// tasto per la schermata. Senza consenso non c'e' niente da aprire: la carta intera porta all'informativa.
// Dal 20/10/2026 le misure si usano solo con un consenso proprio (dati sulla salute): senza, la carta lo dice e porta
// alla pagina del consenso (dati/ConsensoCorpo.tsx).

/** Quanto indietro si guarda per dire come e' cambiato il peso. */
const FINESTRA = 90

function Cifra({ etichetta, valore, sotto, colore }: { etichetta: string; valore: string; sotto?: string | null; colore?: string }) {
  const p = usePalette()
  return (
    <View style={[stili.cifra, { backgroundColor: p.incavo }]}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{etichetta}</Text>
      <Text style={[stili.valore, { color: colore ?? p.testo }]} numberOfLines={1}>
        {valore}
      </Text>
      {sotto ? (
        <Text style={[stili.sotto, { color: p.testoSecondario }]} numberOfLines={1}>
          {sotto}
        </Text>
      ) : null}
    </View>
  )
}

export function CartaCorpo({ misure, senzaConsenso = false }: { misure: Misura[] | null; /** Le misure sono dati sulla salute: senza consenso la funzione non le da' e la carta invita a darlo. */ senzaConsenso?: boolean }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  const ordinate = [...(misure ?? [])].sort((a, b) => a.data.localeCompare(b.data))
  const conPeso = ordinate.filter((m) => m.peso_kg != null)
  const ultima = conPeso.at(-1)
  const b = ultima ? bmi(ultima.peso_kg, altezzaAl(ordinate, ordinate.indexOf(ultima))) : null
  const fascia = b != null ? fasciaBmi(b) : null
  const dal = ultima ? spostaGiorno(ultima.data, -FINESTRA) : null
  const prima = ultima && dal ? conPeso.find((m) => m.data >= dal && m.data < ultima.data) : undefined
  const delta = ultima && prima ? ultima.peso_kg! - prima.peso_kg! : null
  const grassa = [...ordinate].reverse().find((m) => m.massa_grassa_pct != null)
  const vita = [...ordinate].reverse().find((m) => m.vita_cm != null)

  const testa = (
    <View style={stili.testa}>
      <LinearGradient colors={['#5C8DFF', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.icona}>
        <Icona nome="persona" size={22} colore="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[stili.titolo, { color: p.testo }]}>{t('Il tuo corpo', 'Your body')}</Text>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>{t('Qui trovi le tue misure: aggiornale e consulta come cambiano nel tempo.', 'Your measurements live here: update them and see how they change over time.')}</Text>
      </View>
      {/* Senza consenso la freccia porta via (all'informativa); altrimenti apre e chiude, come nel Balance. */}
      <View style={senzaConsenso ? undefined : { transform: [{ rotate: aperta ? '-90deg' : '90deg' }] }}>
        <Icona nome="avanti" size={18} colore={p.testoTerzo} />
      </View>
    </View>
  )

  if (senzaConsenso) {
    return (
      <Tocco onPress={() => router.push('/allenamento/misure')} etichetta={t('Il tuo corpo: leggi l’informativa e attiva le misure', 'Your body: read the privacy notice and turn on measurements')} scala={0.985}>
        <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}>
          {testa}
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {t(
              'Peso, altezza, circonferenze e composizione sono dati sulla salute: per segnarli e usarli per le stime delle calorie serve il tuo consenso. Tocca per leggere l’informativa e attivare «Il tuo corpo».',
              'Weight, height, measurements and body composition are health data: to log them and use them for calorie estimates we need your consent. Tap to read the privacy notice and turn on “Your body”.',
            )}
          </Text>
        </View>
      </Tocco>
    )
  }

  return (
    <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}>
      <Tocco
        onPress={() => setAperta((a) => !a)}
        etichetta={aperta ? t('Il tuo corpo: nascondi le misure', 'Your body: hide your measurements') : t('Il tuo corpo: mostra peso, BMI e composizione corporea', 'Your body: show weight, BMI and body composition')}
        scala={0.985}
      >
        {testa}
      </Tocco>

      {aperta ? (
        ultima ? (
          <>
            <View style={stili.cifre}>
              <Cifra
                etichetta={t('PESO', 'WEIGHT')}
                valore={`${numero(ultima.peso_kg!)} kg`}
                sotto={delta != null && prima ? (Math.abs(delta) < 0.1 ? t(`stabile dal ${dataCorta(prima.data)}`, `steady since ${dataCorta(prima.data)}`) : t(`${delta < 0 ? '−' : '+'}${numero(Math.abs(delta))} kg dal ${dataCorta(prima.data)}`, `${delta < 0 ? '−' : '+'}${numero(Math.abs(delta))} kg since ${dataCorta(prima.data)}`)) : null}
              />
              {b != null && fascia ? <Cifra etichetta="BMI" valore={numero(b)} sotto={fascia.nome} colore={coloreTono(p, fascia.tono)} /> : null}
              {grassa ? (
                <Cifra etichetta={t('MASSA GRASSA', 'BODY FAT')} valore={`${numero(grassa.massa_grassa_pct!)}%`} sotto={grassa.massa_magra_kg != null ? t(`magra ${numero(grassa.massa_magra_kg)} kg`, `lean ${numero(grassa.massa_magra_kg)} kg`) : null} />
              ) : vita ? (
                <Cifra etichetta={t('VITA', 'WAIST')} valore={`${numero(vita.vita_cm!)} cm`} />
              ) : null}
            </View>
            <Text style={[stili.piccola, { color: p.testoTerzo }]}>
              {t(
                `Ultima misura ${dataCorta(ultima.data)} · ${ordinate.length} ${ordinate.length === 1 ? 'misurazione' : 'misurazioni'}. Servono anche a stimare le calorie che consumi.`,
                `Last measured ${dataCorta(ultima.data)} · ${ordinate.length} ${ordinate.length === 1 ? 'measurement' : 'measurements'}. They also help estimate the calories you burn.`,
              )}
            </Text>
            <Pulsante testo={t('Apri il dettaglio', 'Open details')} icona="avanti" variante="secondario" piccolo onPress={() => router.push('/allenamento/misure')} />
          </>
        ) : (
          <>
            <Text style={[stili.testo, { color: p.testoSecondario }]}>
              {t(
                'Peso, altezza, circonferenze e composizione corporea: segnali e guarda come cambiano. Servono anche a stimare le calorie che consumi, nel Balance e nel contatore.',
                'Weight, height, measurements and body composition: log them and see how they change. They also help estimate the calories you burn, in Balance and in the counter.',
              )}
            </Text>
            <Pulsante testo={t('Aggiungi le tue misure', 'Add your measurements')} icona="piu" variante="secondario" piccolo onPress={() => router.push('/allenamento/misure')} />
          </>
        )
      ) : null}
    </View>
  )
}

const stili = StyleSheet.create({
  carta: { borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: spazio.tre + 2, gap: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  testo: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  cifre: { flexDirection: 'row', gap: spazio.due },
  cifra: { flex: 1, borderRadius: 16, paddingVertical: spazio.due + 2, paddingHorizontal: spazio.due + 2, gap: 2 },
  etichetta: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 0.8 },
  valore: { fontFamily: F.extra, fontSize: 21, letterSpacing: -0.5 },
  sotto: { fontFamily: F.semi, fontSize: 11.5 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
})
