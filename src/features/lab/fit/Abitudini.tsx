import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { linkAppNativa, telefonoDelBrowser } from '@/lib/appNativa'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { appleSaluteAttivo, appSaluteDelTelefono, nomeAppSalute } from '../dispositivi/appleSalute'
import { durata, fontiRicevute, giornoBreve } from '../dispositivi/comune'
import type { Dispositivi } from '../dispositivi/useDispositivi'
import { lunediDi, spostaGiorno } from '../schede/contatoreCalorie'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Tocco } from '../ui/Tocco'
import { Bollino, Carta, Etichetta, Pulsante, Sezione } from '../ui/kit'
import { F, usePalette, type Palette } from '../ui/tema'
import { calcolaAbitudini, GIORNI_VISTI, statoCollegamento, type Abitudine, type IdAbitudine, type StatoGiorno } from './abitudini'

// «Le tue abitudini» (31/10/2026, richiesta di Maurizio): tre abitudini — camminare, muoversi, dormire — che **si spuntano da sole** con
// i dati che arrivano da Apple Salute (iPhone) o da Health Connect (Android). Il calcolo e' in `abitudini.ts` (puro); qui c'e' solo
// quello che si vede, in base a **a che punto e' il collegamento** (`statoCollegamento`):
//   - **collegato**: i risultati (la settimana in sette quadratini, «4 giorni su 5», le settimane di fila, gli ultimi 28 giorni);
//   - **da installare** (PWA o browser): si spinge a installare l'app nativa e a collegare l'app Salute del telefono; chi l'ha gia'
//     fatto da un altro dispositivo vede i risultati (`collegato`: i dati stanno sul server, legati al suo account);
//   - **da collegare / senza dati** (app nativa): porta alla schermata dei dispositivi, dove si da' il consenso e si apre il foglio.
// Non compare nella vista cliente dello staff (sono dati sulla salute), ai minorenni e mentre non si sa ancora (niente invito prima del
// tempo). **Descrive, non giudica**: un giorno senza dati non e' un giorno saltato, oggi non e' finito, nessun confronto e nessun punto.

const ICONE: Record<IdAbitudine, NomeIcona> = { passi: 'passi', movimento: 'cronometro', sonno: 'luna' }
const apriDispositivi = () => router.push({ pathname: '/allenamento/dispositivi', params: { attiva: 'apple' } })
const apriGuida = () => router.push('/allenamento/dispositivi')

function titolo(a: Abitudine): string {
  if (a.id === 'passi') return t(`Cammina almeno ${a.soglia.toLocaleString(locale())} passi`, `Walk at least ${a.soglia.toLocaleString(locale())} steps`)
  if (a.id === 'movimento') return t(`Muoviti almeno ${a.soglia} minuti`, `Move for at least ${a.soglia} minutes`)
  return t(`Dormi almeno ${a.soglia / 60} ore`, `Sleep at least ${a.soglia / 60} hours`)
}

/** «4 giorni su 5 questa settimana», con il verbo giusto per sonno e movimento. */
function riga(a: Abitudine): string {
  const q = `${a.fatti} / ${a.obiettivo}`
  return a.id === 'sonno'
    ? t(`${q} notti questa settimana`, `${q} nights this week`)
    : t(`${q} giorni questa settimana`, `${q} days this week`)
}

function ultimo(a: Abitudine, oggi: string): string | null {
  if (!a.ultimo) return null
  const quando = a.ultimo.data === oggi ? t('oggi', 'today') : a.ultimo.data === spostaGiorno(oggi, -1) ? t('ieri', 'yesterday') : giornoBreve(a.ultimo.data)
  const v = a.ultimo.valore
  const cosa = a.id === 'passi' ? t(`${v.toLocaleString(locale())} passi`, `${v.toLocaleString(locale())} steps`) : a.id === 'movimento' ? durata(v) : durata(v)
  return `${quando}: ${cosa}`
}

function Quadratino({ stato, p, piccolo }: { stato: StatoGiorno; p: Palette; piccolo?: boolean }) {
  const lato = piccolo ? 14 : 22
  const stile =
    stato === 'fatto'
      ? { backgroundColor: p.accento }
      : stato === 'no'
        ? { backgroundColor: p.incavo, borderWidth: 1, borderColor: p.linea }
        : stato === 'in-corso'
          ? { borderWidth: 2, borderColor: p.accento, borderStyle: 'dashed' as const }
          : stato === 'senza-dato'
            ? { borderWidth: 1, borderColor: p.linea, borderStyle: 'dotted' as const }
            : { backgroundColor: p.incavo, opacity: 0.45 }
  return <View style={[{ width: lato, height: lato, borderRadius: piccolo ? 4 : 7 }, stile]} />
}

function Riga({ a, oggi, aperto }: { a: Abitudine; oggi: string; aperto: boolean }) {
  const p = usePalette()
  const lunedi = lunediDi(oggi)
  const perData = new Map(a.giorni.map((g) => [g.data, g.stato]))
  const settimana = Array.from({ length: 7 }, (_, i) => spostaGiorno(lunedi, i)).map((d) => perData.get(d) ?? ('futuro' as StatoGiorno))
  const u = ultimo(a, oggi)
  return (
    <View style={{ gap: spazio.due }}>
      <View style={stili.riga}>
        <Bollino icona={ICONE[a.id]} tono={a.inRitmo ? 'ok' : 'accento'} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.nome, { color: p.testo }]}>{titolo(a)}</Text>
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>
            {a.conDati ? riga(a) : t('Non è ancora arrivato niente', 'Nothing has come in yet')}
            {a.inRitmo ? ` · ${t('nel ritmo', 'on track')}` : !a.raggiungibile && a.conDati ? ` · ${t('questa settimana è andata così', 'that’s this week’s count')}` : ''}
          </Text>
        </View>
        {a.serie >= 2 ? <Etichetta testo={t(`${a.serie} settimane di fila`, `${a.serie} weeks in a row`)} tono="ok" /> : null}
      </View>
      <View style={stili.settimana} accessibilityLabel={riga(a)}>
        {settimana.map((s, i) => (
          <Quadratino key={i} stato={s} p={p} />
        ))}
      </View>
      {u ? <Text style={[stili.piccola, { color: p.testoTerzo }]}>{u}</Text> : null}
      {aperto ? (
        <View style={stili.griglia}>
          {a.giorni.map((g) => (
            <Quadratino key={g.data} stato={g.stato} p={p} piccolo />
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function CartaAbitudini({ disp }: { disp: Dispositivi }) {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  const noto = disp.stato?.ok ? disp.stato : null
  const oggi = oggiRoma()
  const abitudini = useMemo(() => (disp.dati ? calcolaAbitudini(disp.dati, oggi) : []), [disp.dati, oggi])
  // Vista cliente dello staff (dati sulla salute), minorenni e fino a quando non si sa chi e': niente.
  if (disp.vista || !noto || !noto.maggiorenne) return null

  const stato = statoCollegamento({
    piattaforma: Platform.OS === 'web' ? 'web' : Platform.OS === 'android' ? 'android' : 'ios',
    appSalute: appSaluteDelTelefono(),
    attivo: appleSaluteAttivo(),
    dati: disp.dati,
  })
  if (stato === 'niente') return null

  const nome = nomeAppSalute()
  const telefono = telefonoDelBrowser()
  const link = linkAppNativa(telefono)
  const fonti = fontiRicevute(disp.dati)

  return (
    <Sezione titolo={t('Le tue abitudini', 'Your habits')}>
      <Carta style={{ gap: spazio.tre }}>
        {stato === 'collegato' ? (
          <>
            <View style={{ gap: spazio.quattro - 4 }}>
              {abitudini.map((a) => (
                <Riga key={a.id} a={a} oggi={oggi} aperto={aperto} />
              ))}
            </View>
            <Tocco onPress={() => setAperto((v) => !v)} ruolo="button" etichetta={aperto ? t('Nascondi gli ultimi giorni', 'Hide the last days') : t(`Vedi gli ultimi ${GIORNI_VISTI} giorni`, `See the last ${GIORNI_VISTI} days`)} scala={1}>
              <View style={stili.apri}>
                <Text style={[stili.piccola, { color: p.testoSecondario, flex: 1 }]}>{aperto ? t('Nascondi gli ultimi giorni', 'Hide the last days') : t(`Vedi gli ultimi ${GIORNI_VISTI} giorni`, `See the last ${GIORNI_VISTI} days`)}</Text>
                <Icona nome={aperto ? 'su' : 'giu'} size={18} colore={p.testoTerzo} />
              </View>
            </Tocco>
            <Text style={[stili.piccola, { color: p.testoTerzo }]}>
              {fonti.length ? t(`Si spuntano da sole con i dati di ${fonti.join(', ')}. `, `They tick themselves off with data from ${fonti.join(', ')}. `) : t('Si spuntano da sole con i dati del tuo telefono. ', 'They tick themselves off with data from your phone. ')}
              {t('Un giorno senza dati non conta come saltato, e oggi non è ancora finito.', 'A day without data doesn’t count as missed, and today isn’t over yet.')}
            </Text>
          </>
        ) : (
          <>
            <View style={stili.riga}>
              <Bollino icona="cuore" tono="accento" size={46} pieno />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.titolo, { color: p.testo }]}>
                  {stato === 'da-installare' ? t('Abitudini che si spuntano da sole', 'Habits that tick themselves off') : stato === 'senza-dati' ? t(`${nome}: non arriva ancora niente`, `${nome}: nothing coming in yet`) : t(`Collega ${nome} e le abitudini partono`, `Connect ${nome} and your habits start`)}
                </Text>
                {stato === 'senza-dati' ? <Etichetta testo={t('Attivo, senza dati', 'On, no data')} tono="attenzione" /> : null}
              </View>
            </View>
            <View style={{ gap: spazio.due }}>
              {([['passi', t('Camminare', 'Walking')], ['movimento', t('Muoverti', 'Moving')], ['sonno', t('Dormire', 'Sleeping')]] as [IdAbitudine, string][]).map(([id, testo]) => (
                <View key={id} style={stili.voce}>
                  <Icona nome={ICONE[id]} size={18} colore={p.accento} />
                  <Text style={[stili.nota, { color: p.testo }]}>{testo}</Text>
                </View>
              ))}
            </View>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {stato === 'da-installare'
                ? telefono === 'ios'
                  ? t(
                      'Passi, allenamenti e sonno arrivano da Apple Salute, ma si leggono solo dall’app Athlon Club per iPhone, non dal browser. Installala, accedi con lo stesso account e collega Apple Salute: poi le abitudini si spuntano da sole e le ritrovi anche qui.',
                      'Steps, workouts and sleep come from Apple Health, but they can only be read by the Athlon Club iPhone app, not by the browser. Install it, sign in with the same account and connect Apple Health: then your habits tick themselves off and you’ll see them here too.',
                    )
                  : telefono === 'android'
                    ? t(
                        'Passi, allenamenti e sonno arrivano da Health Connect, ma si leggono solo dall’app Athlon Club per Android, non dal browser. Installala, accedi con lo stesso account e collega Health Connect: poi le abitudini si spuntano da sole e le ritrovi anche qui.',
                        'Steps, workouts and sleep come from Health Connect, but they can only be read by the Athlon Club Android app, not by the browser. Install it, sign in with the same account and connect Health Connect: then your habits tick themselves off and you’ll see them here too.',
                      )
                    : t(
                        'Passi, allenamenti e sonno arrivano da Apple Salute (iPhone) o da Health Connect (Android), ma si leggono solo dall’app Athlon Club sul telefono. Installala, accedi con lo stesso account e collega l’app Salute: poi le abitudini si spuntano da sole e le ritrovi anche qui.',
                        'Steps, workouts and sleep come from Apple Health (iPhone) or Health Connect (Android), but they can only be read by the Athlon Club app on your phone. Install it, sign in with the same account and connect the Health app: then your habits tick themselves off and you’ll see them here too.',
                      )
                : stato === 'senza-dati'
                  ? t('È attivo, ma non è arrivato ancora niente: di solito manca la condivisione nell’app del tuo dispositivo, o un permesso è stato tolto.', 'It’s on, but nothing has come in yet: usually sharing is off in your device’s app, or a permission was removed.')
                  : t('Camminare, muoversi e dormire si leggono da soli dal telefono: scegli tu cosa condividere e puoi toglierlo quando vuoi.', 'Walking, moving and sleeping are read from your phone by themselves: you choose what to share and can turn it off whenever you like.')}
            </Text>
            {stato === 'da-installare' ? (
              link ? (
                <Pulsante testo={t('Scarica l’app Athlon Club', 'Get the Athlon Club app')} icona="scarica" onPress={() => Linking.openURL(link)} />
              ) : (
                <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Cerca «Athlon Club» nello store del tuo telefono.', 'Look for “Athlon Club” in your phone’s store.')}</Text>
              )
            ) : stato === 'da-collegare' ? (
              <Pulsante testo={t(`Collega ${nome}`, `Connect ${nome}`)} icona="cuore" onPress={apriDispositivi} />
            ) : (
              <Pulsante testo={t('Controlla il collegamento', 'Check the connection')} variante="secondario" onPress={apriGuida} />
            )}
            {stato === 'da-installare' ? <Pulsante testo={t('Come si collega', 'How to connect')} variante="fantasma" piccolo onPress={apriGuida} /> : null}
          </>
        )}
      </Carta>
    </Sezione>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  titolo: { fontFamily: F.extra, fontSize: 17 },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  settimana: { flexDirection: 'row', gap: 6, paddingLeft: 40 + spazio.tre },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingLeft: 40 + spazio.tre },
  apri: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  voce: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
})
