import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { CampoTesto, Scelte } from '../ui/Campi'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import {
  ALLEGATI_MAX,
  ALLEGATO_BYTE_MAX,
  FORMATI_ALLEGATI,
  TESTO_AVVISO,
  TESTO_MAX,
  TIPI_FEEDBACK,
  pesoLeggibile,
  postiLiberi,
  testoInviabile,
  type Allegato,
} from './comune'
import type { StatoFeedback } from './useFeedback'

// Il foglio del feedback (20/10/2026): sale dal pulsante «Feedback» in alto a destra. Dice cosa ci aiuta (come sta andando,
// un suggerimento, un problema), lascia scegliere di che si tratta (facoltativo), un campo di testo e, se serve, fino a tre
// allegati. Niente parte prima di «Invia il messaggio».
//
// **Dice cosa arriva insieme al testo**: la schermata in cui si era e il dispositivo. Sono dati del tester, e li si legge
// meglio sapendolo. Il messaggio lo leggono le persone del club che seguono i tester (CRM, sezione Tester): non c'e' una
// risposta nell'app, e il foglio non la promette.

function RigaAllegato({ a, onTogli }: { a: Allegato; onTogli: () => void }) {
  const p = usePalette()
  return (
    <View style={[stili.allegato, { backgroundColor: p.incavo }]}>
      {a.anteprima ? (
        <Image source={{ uri: a.anteprima }} style={stili.miniatura} contentFit="cover" accessibilityLabel="" />
      ) : (
        <View style={[stili.miniatura, { alignItems: 'center', justifyContent: 'center', backgroundColor: p.carta }]}>
          <Icona nome="documento" size={20} colore={p.accento} />
        </View>
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.forte, { color: p.testo }]} numberOfLines={1}>
          {a.nome}
        </Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {a.tipo === 'application/pdf' ? 'PDF' : a.tipo === 'image/png' ? 'PNG' : a.tipo === 'image/webp' ? 'WebP' : 'JPG'} · {pesoLeggibile(a.byte)}
        </Text>
      </View>
      <Tocco onPress={onTogli} etichetta={`Togli l’allegato ${a.nome}`} style={[stili.togli, { backgroundColor: p.carta }]}>
        <Icona nome="cestino" size={17} colore={p.testoSecondario} />
      </Tocco>
    </View>
  )
}

export function FoglioFeedback({ aperto, f, schermata, onChiudi }: { aperto: boolean; f: StatoFeedback; schermata: string; onChiudi: () => void }) {
  const p = usePalette()
  const posti = postiLiberi(f.allegati.length)
  const chiudi = () => {
    onChiudi()
    // Dopo il grazie il foglio torna com'era; il testo non inviato invece resta, per chi ha chiuso per sbaglio.
    if (f.fatto) setTimeout(f.ricomincia, 250)
  }

  return (
    <Foglio
      aperto={aperto}
      titolo={f.fatto ? 'Grazie!' : 'Come sta andando?'}
      sottotitolo={f.fatto ? undefined : 'Sei fra i tester dell’app: il tuo parere ci aiuta a migliorarla.'}
      onChiudi={chiudi}
    >
      {f.fatto ? (
        <>
          <Messaggio tono="ok" titolo="Il tuo messaggio ci è arrivato">
            Lo leggeremo con attenzione. Se ti viene in mente altro, il pulsante «Feedback» è sempre lì.
          </Messaggio>
          <Pulsante testo="Chiudi" onPress={chiudi} />
        </>
      ) : (
        <>
          <View style={[stili.guida, { backgroundColor: p.incavo }]}>
            <Text style={[stili.forte, { color: p.testo }]}>Dicci tutto quello che ci aiuta a migliorare:</Text>
            {['come ti sembra l’app, cosa ti piace e cosa no;', 'un’idea o un suggerimento;', 'un problema che hai avuto: cosa stavi facendo e cosa è successo.'].map((riga) => (
              <View key={riga} style={stili.voce}>
                <View style={[stili.punto, { backgroundColor: p.accento }]} />
                <Text style={[stili.testo, { color: p.testoSecondario, flex: 1 }]}>{riga}</Text>
              </View>
            ))}
          </View>

          <View style={{ gap: spazio.due }}>
            <Text style={[stili.etichetta, { color: p.testoSecondario }]}>DI COSA SI TRATTA? (FACOLTATIVO)</Text>
            <Scelte valori={TIPI_FEEDBACK.map((t) => ({ valore: t.valore, testo: t.testo }))} scelto={f.tipo} onScegli={(v) => f.setTipo(f.tipo === v ? null : v)} />
          </View>

          <View style={{ gap: spazio.due }}>
            <CampoTesto
              etichetta="Il tuo messaggio"
              value={f.testo}
              onChangeText={f.setTesto}
              placeholder="Scrivi qui…"
              multiline
              maxLength={TESTO_MAX}
              textAlignVertical="top"
              style={{ minHeight: 132, paddingTop: 14, paddingBottom: 14 }}
            />
            {f.testo.length >= TESTO_AVVISO ? (
              <Text style={[stili.nota, { color: p.testoTerzo, textAlign: 'right' }]}>
                {f.testo.length} / {TESTO_MAX}
              </Text>
            ) : null}
          </View>

          {f.allegati.length ? (
            <View style={{ gap: spazio.due }}>
              {f.allegati.map((a, i) => (
                <RigaAllegato key={`${a.nome}-${i}`} a={a} onTogli={() => f.togli(i)} />
              ))}
            </View>
          ) : null}
          <Pulsante
            testo={f.inLettura ? 'Preparo il file…' : f.allegati.length ? 'Aggiungi un altro allegato' : 'Aggiungi uno screenshot o un PDF'}
            variante="contorno"
            icona="galleria"
            inCorso={f.inLettura}
            disabilitato={posti === 0}
            onPress={f.aggiungi}
          />
          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            Facoltativi: fino a {ALLEGATI_MAX} file ({FORMATI_ALLEGATI}), {ALLEGATO_BYTE_MAX / 1024 / 1024} MB ciascuno. Uno screenshot aiuta molto quando c’è un problema. Se mostra il
            diario alimentare, il sonno o le misure del corpo, coprili prima: sono dati che il club non vede.
          </Text>

          {f.errore ? <Messaggio tono="errore">{f.errore}</Messaggio> : null}

          <Pulsante testo="Invia il messaggio" icona="invia" inCorso={f.inCorso} disabilitato={!testoInviabile(f.testo) || f.inLettura} onPress={() => f.invia(schermata)} />
          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            Insieme al messaggio ci arrivano la schermata in cui sei e il dispositivo che usi, per capire meglio un problema. Lo leggono solo le persone del club
            che seguono i tester.
          </Text>
        </>
      )}
    </Foglio>
  )
}

const stili = StyleSheet.create({
  guida: { borderRadius: 18, padding: spazio.tre, gap: 8 },
  forte: { fontFamily: F.semi, fontSize: 14.5, lineHeight: 20 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  nota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  etichetta: { fontSize: 11, fontFamily: F.extra, letterSpacing: 1.3 },
  voce: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  punto: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  allegato: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre - 4, borderRadius: 16, padding: spazio.due + 2 },
  miniatura: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden' },
  togli: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
})
