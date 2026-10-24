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
// **Senza misure non e' una carta da aprire ma un invito** (24/10/2026, richiesta di Maurizio): la riga sotto il titolo
// diventa la call to action («inserisci qui i tuoi dati per avere il consumo calorico delle lezioni e dei tuoi
// allenamenti»), la carta intera e' un tocco verso le misure e c'e' il pulsante per farlo. E' il dato che manca a chi
// ha lezioni registrate dalla reception e non ha mai scritto altro: senza peso, altezza, eta' e sesso le calorie non si stimano.
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

  // Senza misure la carta e' un invito, non un accordion: nessuna cifra da mostrare, una cosa da fare.
  const invito = !ultima
  const INVITO_TESTO = t(
    'Inserisci qui i tuoi dati per avere il consumo calorico delle lezioni e dei tuoi allenamenti.',
    'Enter your details here to get the calories burned in your classes and workouts.',
  )

  const testa = (
    <View style={stili.testa}>
      <LinearGradient colors={['#5C8DFF', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.icona}>
        <Icona nome="persona" size={22} colore="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[stili.titolo, { color: p.testo }]}>{t('Il tuo corpo', 'Your body')}</Text>
        <Text style={[stili.testo, { color: invito ? p.testo : p.testoSecondario, fontFamily: invito ? F.semi : F.medio }]}>
          {invito ? INVITO_TESTO : t('Qui trovi le tue misure: aggiornale e consulta come cambiano nel tempo.', 'Your measurements live here: update them and see how they change over time.')}
        </Text>
      </View>
      {/* Senza misure (o senza consenso) la freccia porta via; altrimenti apre e chiude, come nel Balance. */}
      <View style={invito ? undefined : { transform: [{ rotate: aperta ? '-90deg' : '90deg' }] }}>
        <Icona nome="avanti" size={18} colore={p.testoTerzo} />
      </View>
    </View>
  )

  const apriMisure = () => router.push('/allenamento/misure')
  if (senzaConsenso || invito) {
    return (
      <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}>
        <Tocco
          onPress={apriMisure}
          etichetta={senzaConsenso ? t('Il tuo corpo: inserisci i tuoi dati, prima leggi l’informativa', 'Your body: enter your details, first read the privacy notice') : t('Il tuo corpo: inserisci i tuoi dati per avere il consumo calorico di lezioni e allenamenti', 'Your body: enter your details to get the calories burned in classes and workouts')}
          scala={0.985}
        >
          {testa}
        </Tocco>
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>
          {senzaConsenso
            ? t(
                'Peso, altezza, circonferenze e composizione sono dati sulla salute: per segnarli e usarli per le stime delle calorie serve il tuo consenso. Ti mostriamo l’informativa e li attivi con un tocco.',
                'Weight, height, measurements and body composition are health data: to log them and use them for calorie estimates we need your consent. We show you the privacy notice and you turn them on with one tap.',
              )
            : t('Servono peso, altezza, età e sesso: restano tuoi e li puoi aggiornare quando vuoi.', 'You need weight, height, age and sex: they stay yours and you can update them any time.')}
        </Text>
        <Pulsante testo={t('Inserisci i tuoi dati', 'Enter your details')} icona="avanti" piccolo onPress={apriMisure} />
      </View>
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

      {aperta && ultima ? (
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
