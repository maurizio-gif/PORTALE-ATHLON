import { useState } from 'react'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Etichetta, Messaggio, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { appSaluteDelTelefono } from './appleSalute'
import { MARCHI, type Categoria, type Marchio, type Piattaforma } from './marchi'

// «Come collegare il tuo dispositivo» (29/10/2026, richiesta di Maurizio): i dispositivi non si collegano piu' uno per uno (Oura, Polar...)
// ma passano tutti da Apple Salute (iPhone) o Health Connect (Android). La guida dice la procedura, cosa si puo' condividere e quali
// marchi si collegano, con la pagina ufficiale del produttore per le istruzioni. **Non promette cosa arrivera' dal singolo dispositivo**:
// dipende dal modello e da cosa il produttore scrive; il segno vero e' la carta «Ricevi da…», che mostra quello che e' arrivato davvero.
// L'elenco dei marchi e' in `marchi.ts` (verificato su pagine ufficiali, con la data). I nomi sono dei rispettivi proprietari: si citano
// solo per dire che si collegano, senza loghi e senza nessun rapporto con il club.

const PASSI: Record<Piattaforma, () => { titolo: string; testo: string }[]> = {
  apple: () => [
    { titolo: t('Apri l’app del tuo dispositivo', 'Open your device’s app'), testo: t('Per esempio Garmin Connect, Oura, Polar Flow o Google Health (l’ex Fitbit): quella che usi per vedere sonno e allenamenti.', 'For example Garmin Connect, Oura, Polar Flow or Google Health (the former Fitbit): the one you use to see your sleep and workouts.') },
    { titolo: t('Attiva la condivisione con Apple Salute', 'Turn on sharing with Apple Health'), testo: t('Nelle impostazioni dell’app cerca «Apple Salute» (o «Salute») e scegli cosa condividere: sonno, passi, battito e allenamenti.', 'In the app’s settings look for “Apple Health” (or “Health”) and choose what to share: sleep, steps, heart rate and workouts.') },
    { titolo: t('Torna qui e aggiorna', 'Come back here and refresh'), testo: t('Premi «Aggiorna ora»: nella carta vedi da chi stai ricevendo i dati. Se non arriva niente, controlla in Impostazioni › Salute › Accesso ai dati e dispositivi › Athlon Club.', 'Tap “Refresh now”: the card shows who you’re receiving data from. If nothing comes in, check Settings › Health › Data Access & Devices › Athlon Club.') },
  ],
  google: () => [
    { titolo: t('Apri l’app del tuo dispositivo', 'Open your device’s app'), testo: t('Quella che usi per vedere sonno e allenamenti: Garmin Connect, Oura, Polar Flow, Google Health, Samsung Health…', 'The one you use to see your sleep and workouts: Garmin Connect, Oura, Polar Flow, Google Health, Samsung Health…') },
    { titolo: t('Attiva la condivisione con Health Connect', 'Turn on sharing with Health Connect'), testo: t('Nelle impostazioni dell’app cerca «Health Connect» e scegli cosa condividere: sonno, passi, battito e allenamenti.', 'In the app’s settings look for “Health Connect” and choose what to share: sleep, steps, heart rate and workouts.') },
    { titolo: t('L’app del club legge da Health Connect', 'The club app reads from Health Connect'), testo: t('Apri l’app Athlon Club per Android (aggiornata all’ultima versione), tocca «Attiva Health Connect» e dai il permesso: i dati compaiono qui. Dal browser o dalla PWA non si può: serve l’app.', 'Open the Athlon Club app for Android (updated to the latest version), tap “Turn on Health Connect” and give permission: the data shows up here. It can’t be done from the browser or the PWA: you need the app.') },
  ],
}

const COSE: { icona: NomeIcona; testo: string }[] = [
  { icona: 'foglia', testo: t('Sonno, con le fasi', 'Sleep, with stages') },
  { icona: 'passi', testo: t('Passi', 'Steps') },
  { icona: 'fiamma', testo: t('Calorie di movimento', 'Active calories') },
  { icona: 'cuore', testo: t('Battito a riposo e HRV', 'Resting heart rate and HRV') },
  { icona: 'cronometro', testo: t('Allenamenti, con il battito', 'Workouts, with heart rate') },
]

const CATEGORIA: Record<Categoria, () => string> = {
  orologio: () => t('Orologio', 'Watch'),
  anello: () => t('Anello', 'Ring'),
  fascia: () => t('Fascia', 'Band'),
  app: () => t('App', 'App'),
  attrezzatura: () => t('Attrezzatura', 'Equipment'),
}

function apriLink(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener,noreferrer')
  else Linking.openURL(url)
}

/** I marchi che si collegano su una piattaforma: prima quelli confermati, poi quelli da verificare, nell'ordine dell'elenco (i piu' diffusi in palestra per primi); fuori quelli che non si collegano. */
export function marchiPer(piattaforma: Piattaforma, elenco: Marchio[] = MARCHI): Marchio[] {
  const peso = (m: Marchio) => (m[piattaforma].verdetto === 'confermato' ? 0 : 1)
  return elenco.filter((m) => m[piattaforma].verdetto !== 'no').sort((a, b) => peso(a) - peso(b))
}

/** I marchi che il produttore dice che non funzionano su questa piattaforma (Galaxy Watch con l'iPhone, Apple Watch con Android): si dice, per non far perdere tempo. */
export function marchiChePerNonFunzionano(piattaforma: Piattaforma, elenco: Marchio[] = MARCHI): Marchio[] {
  return elenco.filter((m) => m[piattaforma].verdetto === 'no')
}

const SUBITO = 6

export function GuidaCollegamento() {
  const p = usePalette()
  const nativa: Piattaforma = appSaluteDelTelefono() === 'apple' ? 'apple' : Platform.OS === 'android' ? 'google' : 'apple'
  const [piattaforma, setPiattaforma] = useState<Piattaforma>(nativa)
  const [tutti, setTutti] = useState(false)
  const marchi = marchiPer(piattaforma)
  const no = marchiChePerNonFunzionano(piattaforma)
  const visibili = tutti ? marchi : marchi.slice(0, SUBITO)

  return (
    <Sezione titolo={t('Come collegare il tuo dispositivo', 'How to connect your device')}>
      <View style={stili.pillole} accessibilityRole="tablist">
        {(
          [
            ['apple', t('iPhone · Apple Salute', 'iPhone · Apple Health')],
            ['google', t('Android · Health Connect', 'Android · Health Connect')],
          ] as const
        ).map(([id, nome]) => {
          const qui = piattaforma === id
          return (
            <Tocco key={id} ruolo="tab" stato={{ selected: qui }} vibra="scelta" etichetta={nome} onPress={() => setPiattaforma(id)} style={[stili.pillola, { backgroundColor: qui ? p.testo : p.carta, borderColor: qui ? p.testo : p.linea }]}>
              <Text style={{ color: qui ? p.fondo : p.testo, fontFamily: qui ? F.extra : F.semi, fontSize: 14 }}>{nome}</Text>
            </Tocco>
          )
        })}
      </View>

      {piattaforma === 'google' ? (
        <Messaggio tono="attenzione" titolo={t('Serve l’app per Android', 'You need the Android app')}>
          {t('Health Connect si legge solo dall’app Athlon Club installata sul telefono, non dal browser. Se non puoi installarla, puoi scrivere il sonno a mano.', 'Health Connect can only be read by the Athlon Club app installed on your phone, not by the browser. If you can’t install it, you can log your sleep by hand.')}
        </Messaggio>
      ) : null}

      <Carta style={{ gap: spazio.tre }}>
        {PASSI[piattaforma]().map((x, i) => (
          <View key={x.titolo} style={stili.passo}>
            <View style={[stili.numero, { backgroundColor: p.accento }]}>
              <Text style={stili.numeroTesto}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[stili.titolo, { color: p.testo }]}>{x.titolo}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{x.testo}</Text>
            </View>
          </View>
        ))}
      </Carta>

      <Carta style={{ gap: spazio.due + 2 }}>
        <Text style={[stili.titolo, { color: p.testo }]}>{t('Cosa puoi condividere', 'What you can share')}</Text>
        <View style={stili.cose}>
          {COSE.map((c) => (
            <View key={c.testo} style={[stili.cosa, { backgroundColor: p.incavo }]}>
              <Icona nome={c.icona} size={15} colore={p.accento} />
              <Text style={[stili.piccola, { color: p.testo, fontFamily: F.semi }]}>{c.testo}</Text>
            </View>
          ))}
        </View>
        <Text style={[stili.piccola, { color: p.testoSecondario }]}>
          {t('Condividi solo quello che vuoi, e puoi cambiare idea quando vuoi. Cosa arriva davvero dipende dal tuo dispositivo: lo vedi nella carta «Ricevi da…».', 'Share only what you want, and you can change your mind any time. What actually comes in depends on your device: you see it in the “You’re receiving from…” card.')}
        </Text>
      </Carta>

      {/* Senza marchi (l'elenco non e' ancora stato verificato) la carta non c'e': un titolo e una nota senza righe sembrerebbe rotto. */}
      {marchi.length ? (
      <Carta style={{ gap: spazio.tre }}>
        <Text style={[stili.titolo, { color: p.testo }]}>{t('Dispositivi e app che si collegano', 'Devices and apps that connect')}</Text>
        {visibili.map((m, i) => {
          const s = m[piattaforma]
          return (
            <View key={m.id} style={[stili.marchio, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea, paddingTop: spazio.tre }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.nome, { color: p.testo }]}>{m.nome}</Text>
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>{[CATEGORIA[m.categoria](), m.app].filter(Boolean).join(' · ')}</Text>
                {s.nota ? <Text style={[stili.piccola, { color: p.testoTerzo }]}>{s.nota}</Text> : null}
              </View>
              {s.verdetto === 'confermato' ? <Etichetta testo={t('Si collega', 'Connects')} tono="ok" icona="ok" /> : <Etichetta testo={t('Da verificare', 'To check')} tono="attenzione" />}
              {s.url ? (
                <Tocco onPress={() => apriLink(s.url!)} ruolo="link" etichetta={t(`Istruzioni di ${m.nome}`, `${m.nome} instructions`)} style={stili.istruzioni}>
                  <Icona nome="apriFuori" size={18} colore={p.accento} />
                </Tocco>
              ) : null}
            </View>
          )
        })}
        {marchi.length > SUBITO ? (
          <Tocco onPress={() => setTutti((v) => !v)} ruolo="button" etichetta={tutti ? t('Mostra meno', 'Show fewer') : t('Mostra tutti', 'Show all')} style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>{tutti ? t('Mostra meno', 'Show fewer') : t(`Mostra tutti (${marchi.length})`, `Show all (${marchi.length})`)}</Text>
          </Tocco>
        ) : null}
        {no.length ? (
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>
            {piattaforma === 'apple'
              ? t(`Non funzionano con l’iPhone: ${no.map((m) => m.nome).join(', ')}.`, `They don’t work with iPhone: ${no.map((m) => m.nome).join(', ')}.`)
              : t(`Non funzionano con Android: ${no.map((m) => m.nome).join(', ')}.`, `They don’t work with Android: ${no.map((m) => m.nome).join(', ')}.`)}
          </Text>
        ) : null}
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>
          {t(
            'Elenco indicativo, dalle pagine dei produttori: dipende dal modello e dall’app. Il simbolo apre le loro istruzioni. I marchi sono dei rispettivi proprietari e sono citati solo per dire che si collegano: non c’è nessun rapporto fra loro e il club.',
            'A guide based on the manufacturers’ own pages: it depends on the model and the app. The symbol opens their instructions. Trademarks belong to their owners and are mentioned only to say they connect: there’s no relationship between them and the club.',
          )}
        </Text>
      </Carta>
      ) : null}
    </Sezione>
  )
}

const stili = StyleSheet.create({
  pillole: { flexDirection: 'row', gap: spazio.due, flexWrap: 'wrap' },
  pillola: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: spazio.tre, borderWidth: StyleSheet.hairlineWidth },
  passo: { flexDirection: 'row', gap: spazio.tre, alignItems: 'flex-start' },
  numero: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numeroTesto: { color: '#fff', fontFamily: F.extra, fontSize: 13 },
  titolo: { fontFamily: F.extra, fontSize: 16 },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  link: { fontFamily: F.bold, fontSize: 14, paddingVertical: 4 },
  cose: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cosa: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  marchio: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  istruzioni: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
})
