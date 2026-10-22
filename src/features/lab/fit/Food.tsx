import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { PASTI } from '@/api/alimentazione'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { oggiRoma, somma } from '../alimentazione/conti'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { F, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import type { DatiFit } from './useFit'

// L'area Food di Fit (19/10/2026): la porta del diario. Prima del consenso
// racconta cosa c'e' dentro e porta all'informativa (Vetrina.tsx, nel diario);
// dopo, il riassunto di oggi e i comandi per scrivere un pasto o fotografarlo.
// Il diario vero resta nella sua schermata (/allenamento/alimentazione).

const apriDiario = () => router.push('/allenamento/alimentazione')
const apriFoto = () => router.push({ pathname: '/allenamento/alimentazione', params: { foto: '1' } })

const COSE: { icona: NomeIcona; testo: string }[] = [
  { icona: 'piatto', testo: t('Il diario dei pasti, da un catalogo di alimenti con le porzioni di casa.', 'The meal diary, from a food catalog with everyday portions.') },
  { icona: 'fotocamera', testo: t('La foto del piatto: riconosce gli alimenti e stima i grammi, e tu confermi.', 'The photo of your plate: it recognizes the foods and estimates the grams, and you confirm.') },
  { icona: 'foglia', testo: t('Consigli scelti per te, dal tuo allenamento e da nove domande.', 'Tips picked for you, based on your training and nine questions.') },
]

export function AreaFood({ dati }: { dati: DatiFit }) {
  const p = usePalette()
  const f = dati.food

  if (dati.vista) {
    return (
      <Messaggio tono="attenzione" titolo={t('Non visibile nella vista cliente', 'Not visible in client view')}>
        {t('Food contiene dati sulla salute: lo vede solo il socio, dalla sua app.', 'Food contains health data: only the member can see it, from their own app.')}
      </Messaggio>
    )
  }
  if (!f) return dati.foodErrore ? <Messaggio>{dati.foodErrore}</Messaggio> : <SchedeInArrivo quante={1} />
  if (!f.maggiorenne) {
    return (
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.titoletto, { color: p.testo }]}>{t('Food è per i maggiorenni', 'Food is for adults only')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Se nella tua scheda del club manca la data di nascita, chiedi al desk di aggiungerla.', 'If your date of birth is missing from your club profile, ask the front desk to add it.')}</Text>
      </Carta>
    )
  }

  if (!f.consenso) {
    return (
      <Entra indice={0}>
        <Tocco onPress={apriDiario} etichetta={t('Scopri Food', 'Discover Food')} scala={0.985}>
          <LinearGradient colors={ORTO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.vetrina}>
            <Text style={stili.vetrinaTitolo}>{t('Mangiare bene, per allenarti meglio', 'Eat well, train better')}</Text>
            <View style={{ gap: spazio.due }}>
              {COSE.map((c) => (
                <View key={c.icona} style={stili.riga}>
                  <View style={stili.bollo}>
                    <Icona nome={c.icona} size={16} colore="#fff" />
                  </View>
                  <Text style={[stili.vetrinaTesto, { flex: 1 }]}>{c.testo}</Text>
                </View>
              ))}
            </View>
            <Text style={stili.vetrinaPiccola}>{t('Prima di cominciare si legge e si accetta l’informativa: quello che scrivi lo vedi solo tu.', 'Before you start, you read and accept the privacy notice: only you see what you write.')}</Text>
            <View style={stili.vetrinaPulsante}>
              <Text style={stili.vetrinaPulsanteTesto}>{t('Scopri Food', 'Discover Food')}</Text>
              <Icona nome="avanti" size={16} colore={ORTO[2]} />
            </View>
          </LinearGradient>
        </Tocco>
      </Entra>
    )
  }

  if (!f.profilo) {
    return (
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.titoletto, { color: p.testo }]}>{t('Manca un minuto', 'Just a minute more')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Nove domande sulle tue abitudini: servono a scegliere i consigli per te.', 'Nine questions about your habits: they help us pick tips for you.')}</Text>
        <Pulsante testo={t('Rispondi', 'Answer')} icona="avanti" onPress={apriDiario} />
      </Carta>
    )
  }

  const nascosti = f.profilo.nascondi_numeri
  const oggi = oggiRoma()
  const diOggi = (dati.diario ?? []).filter((v) => v.data === oggi)
  const tot = somma(diOggi)
  const scritti = PASTI.filter((x) => diOggi.some((v) => v.pasto === x.id)).map((x) => x.nome.toLowerCase())
  return (
    <View style={{ gap: spazio.tre }}>
      <Entra indice={0}>
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.riga}>
            <LinearGradient colors={ORTO} style={stili.icona}>
              <Icona nome="piatto" size={24} colore="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[stili.titoletto, { color: p.testo }]}>{t('Oggi', 'Today')}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {!dati.diario
                  ? t('Leggiamo il diario…', 'Loading your diary…')
                  : !diOggi.length
                    ? t('Ancora niente nel diario.', 'Nothing in the diary yet.')
                    : nascosti
                      ? t(`Hai scritto ${scritti.join(', ')}.`, `You logged ${scritti.join(', ')}.`)
                      : `${Math.round(tot.kcal).toLocaleString(locale())} kcal · ${scritti.join(', ')}`}
              </Text>
            </View>
          </View>
          <View style={stili.azioni}>
            <View style={{ flex: 1 }}>
              <Pulsante testo={t('Il diario', 'Diary')} icona="piatto" onPress={apriDiario} />
            </View>
            <View style={{ flex: 1 }}>
              <Pulsante testo={t('Fotografa', 'Take a photo')} icona="fotocamera" variante="secondario" onPress={apriFoto} />
            </View>
          </View>
        </Carta>
      </Entra>
      <Text style={[stili.piccola, { color: p.testoTerzo, paddingHorizontal: 2 }]}>
        {t('Nel diario trovi anche i nutrienti del giorno, i consigli per te e le impostazioni: il questionario, i numeri nascosti e la revoca del consenso.', 'In the diary you’ll also find the day’s nutrients, your tips and the settings: the questionnaire, hidden numbers and withdrawing consent.')}
      </Text>
    </View>
  )
}

const stili = StyleSheet.create({
  titoletto: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  azioni: { flexDirection: 'row', gap: spazio.due },
  vetrina: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre },
  vetrinaTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  vetrinaTesto: { color: 'rgba(255,255,255,0.92)', fontFamily: F.semi, fontSize: 14, lineHeight: 19 },
  vetrinaPiccola: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  bollo: { width: 32, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  vetrinaPulsante: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 999, minHeight: 48 },
  vetrinaPulsanteTesto: { color: ORTO[2], fontFamily: F.extra, fontSize: 15 },
})
