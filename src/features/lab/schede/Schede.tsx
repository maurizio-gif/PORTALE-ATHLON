import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useWindowDimensions } from '@/lib/finestra'

import { elencoMisure, elencoSchede, type Misura, type QuotaPiani, type RigaSchedaLab, type SedutaBreve, type StatoTest } from '@/api/lab'
import { LARGO } from '@/components/Pagina'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { relaxAperto, useDispositivi } from '../dispositivi/useDispositivi'
import { CartaAbitudini } from '../fit/Abitudini'
import { CartaCorpo } from '../fit/Corpo'
import { CartaDispositivi } from '../fit/CartaDispositivi'
import { CartaMese } from '../fit/Mese'
import { CartaSettimana } from '../fit/Settimana'
import { CartaPunteggio } from '../fit/Punteggio'
import { AreaFood } from '../fit/Food'
import { AreaRelax } from '../fit/Relax'
import { CartaDatiDaCompilare } from '../fit/DatiDaCompilare'
import { InvitoSaluteAllApertura } from '../fit/InvitoSalute'
import { useDatiCorpo } from '../fit/useDatiCorpo'
import { useFit } from '../fit/useFit'
import { CHIAVE_MISURE } from '../dati/Misure'
import { inMemoria, prendi } from '../memoria'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Entra, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { ricordaAbitudine } from './abitudineMemoria'
import { Anteprima, AvvisoAnteprima, useSezioniChiuse } from '../riservate/Riservate'
import { AreaTrain } from './AreaTrain'
import { CHIAVE_ELENCO_PIANI } from './comune'

// Athlon Health System (19/10/2026, era Workout, poi Fit): sotto il titolo la
// ruota Train, Food, Relax (fit/Ruota.tsx), l'Athlon Health Score (fit/Punteggio.tsx: il punteggio da 0 a 100 sui tre
// pilastri, 20/10/2026); poi il tuo corpo (fit/Corpo.tsx, **compresso**: titolo e una riga, le cifre toccando), i dispositivi e le abitudini
// (l'introduzione e il Balance non ci sono piu' qui, 01/11/2026); sotto, le aree da scegliere (tre per i maggiorenni, due per gli altri).
//   - Train: **verticale sul piano di allenamento** dall'11/11/2026 (`AreaTrain.tsx`, con `statoTrain.ts`): i tre modi di avere un piano
//     (allenamento assistito, caricato, dal personal trainer), il test dei massimali a valle del questionario, il piano in cima a regime,
//     e sotto «Altro in Train» (consigli sulle lezioni, calorie, allenamenti all'esterno, movimento dai dispositivi);
//   - Food: la porta del diario dei pasti (fit/Food.tsx);
//   - Relax (che nelle parole che si leggono e' **«Recover»** dal 29/10/2026; il codice e `?area=relax` restano): il recupero, col sonno che il
//     socio scrive ogni mattina e quello che arriva dai suoi dispositivi tramite Apple Salute (fit/Relax.tsx). **L'area c'e' per tutti i
//     maggiorenni** (20/10/2026): il sonno a mano non ha bisogno di un dispositivo; i dispositivi sono un modo in piu'.
// **I dati del corpo da compilare** (29/10/2026, richiesta di Maurizio): altezza, peso e sesso. **Non bloccano la sezione** (prima la chiudevano:
// si e' scelto il blocco morbido, perche' tutto l'uso della sezione non puo' dipendere dal consenso a dati sulla salute e il resto non li usa).
// Finche' mancano, subito sotto il titolo c'e' la carta «Da compilare» (`fit/DatiDaCompilare.tsx`), e le calorie restano chiuse (lo dice
// la carta). `useDatiCorpo` rilegge a ogni ritorno sulla schermata: inseriti i dati, la carta sparisce e il contenuto si rifa' coi dati freschi.
// **L'invito a collegare l'app Salute** compare all'apertura, una volta sola per dispositivo (`fit/InvitoSalute.tsx`); se la persona lo salta,
// resta in evidenza la carta «Da attivare» (`fit/CartaDispositivi.tsx`).
// L'area scelta sta nell'indirizzo (`?area=food`, `?area=relax`), cosi' tornando indietro dal
// diario o dai dispositivi si ritrova la sua area. L'indirizzo resta /allenamento: e' quello dei link gia' dati.

type Dati = { schede: RigaSchedaLab[]; ultimi: SedutaBreve[]; ai: QuotaPiani; test: StatoTest }

export const CHIAVE_SCHEDE = CHIAVE_ELENCO_PIANI

export function Schede() {
  const { width: larghezza } = useWindowDimensions()
  const dati = useDatiCorpo()
  const largo = larghezza >= LARGO
  const daCompilare = dati.stato === 'mancano' ? dati : null
  // Quando i dati vengono inseriti (da «Il tuo corpo», sopra questa schermata) il contenuto si rifa' da zero: `useFit` e le misure sono
  // quelli di prima dei dati, e le schermate sotto la pila non si rifanno da capo. Si rifa' solo in quel passaggio, non alla prima lettura.
  const [versione, setVersione] = useState(0)
  const mancavano = useRef(false)
  useEffect(() => {
    if (dati.stato === 'mancano') mancavano.current = true
    else if (mancavano.current && dati.stato === 'completi') {
      mancavano.current = false
      setVersione((v) => v + 1)
    }
  }, [dati.stato])
  return (
    <Schermata titolo="Athlon Health System" sottotitolo={t('Allenamento, alimentazione e recupero.', 'Training, nutrition and recovery.')}>
      {/* Riservato a chi ha un abbonamento principale attivo (05/11/2026, features/lab/riservate): chi non ce l'ha vede la schermata com'e', in
          anteprima, con questa carta in cima; ogni tocco sulle carte apre il modal. Le schede Train, Food e Recover restano libere. */}
      <AvvisoAnteprima sezione="salute" />
      {daCompilare ? (
        <Anteprima sezione="salute">
          <Entra indice={0}>
            <CartaDatiDaCompilare mancano={daCompilare.mancano} senzaConsenso={daCompilare.senzaConsenso} />
          </Entra>
        </Anteprima>
      ) : null}
      <ContenutoHub key={versione} largo={largo} corpoInCima={!!daCompilare} />
    </Schermata>
  )
}

/**
 * Tutto quello che sta sotto il titolo (e sotto la carta dei dati, se manca). **E' un componente a parte** perche' ha i suoi dati
 * (`useFit`, `useDispositivi`, le misure) e `Schede` lo rifa' da zero quando la persona inserisce i dati del corpo, cosi' li legge freschi.
 */
function ContenutoHub({ largo, corpoInCima }: { largo: boolean; /** La carta «Da compilare» e' gia' sopra, al posto di «I tuoi dati»: non si invita due volte a fare la stessa cosa. */ corpoInCima: boolean }) {
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<Dati>(CHIAVE_SCHEDE) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [misure, setMisure] = useState<Misura[] | null>(() => inMemoria<{ misure: Misura[] }>(CHIAVE_MISURE)?.misure ?? null)
  // La funzione dice che manca il consenso alle misure del corpo (null): la carta invita a darlo.
  const [senzaConsenso, setSenzaConsenso] = useState(() => inMemoria<{ consenso?: unknown }>(CHIAVE_MISURE)?.consenso === null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_SCHEDE, elencoSchede)
    // L'abitudine (quanto viene al club e quando) serve al «consigliato» dei questionari: si tiene in memoria, mai sul disco.
    if (r.ok) ricordaAbitudine(r.abitudine)
    if (r.ok) setDati({ schede: r.schede, ultimi: r.ultimi, ai: r.ai, test: r.test })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
    prendi(CHIAVE_MISURE, elencoMisure).then((r) => {
      if (!r.ok) return
      setMisure(r.misure)
      setSenzaConsenso(r.consenso === null)
    })
  }, [carica])

  const fit = useFit()
  const disp = useDispositivi()
  const conRelax = relaxAperto(disp.stato)
  const { area: parametro } = useLocalSearchParams<{ area?: string }>()
  // Relax solo dove e' aperto; mentre non si sa ancora (stato non arrivato) l'indirizzo vale.
  const area: Area = parametro === 'food' ? 'food' : parametro === 'relax' && (conRelax || (!disp.stato && !disp.vista)) ? 'relax' : 'train'
  const scegli = (a: Area) => router.setParams({ area: a })
  // Su schermo largo (15/10/2026), come Prenotazioni: le card in fila e le schede su piu' colonne (`largo`, dal genitore).

  // «Le tue abitudini» (31/10/2026): camminare, muoversi e dormire, che si spuntano da sole con Apple Salute o Health Connect. Dove non
  // sono collegati (PWA, browser) la carta spinge a installare l'app e a collegarli; dove lo sono mostra i risultati. **Dal 01/11/2026 sta
  // subito sotto «I tuoi dispositivi»** (richiesta di Maurizio): prima era sotto il punteggio, sopra la descrizione.
  const abitudini = (
    <Entra indice={1}>
      <CartaAbitudini disp={disp} />
    </Entra>
  )

  const chiuse = useSezioniChiuse()

  return (
    <>
      <Anteprima sezione="salute" style={{ gap: spazio.quattro + 4 }}>
        <Entra indice={0}>
          <CartaPunteggio fit={fit} disp={disp} />
        </Entra>
        {/* «Il tuo mese in Athlon» (30/10/2026): compare solo quando c'e' un mese da mostrare, e subito sotto il punteggio. */}
        <CartaSettimana />
        <CartaMese />
        {/* Dopo il punteggio, nell'ordine: «Il tuo corpo» compresso, i dispositivi e le abitudini. **La carta introduttiva («Il benessere e' un equilibrio»)
            non c'e' piu'** (01/11/2026, richiesta di Maurizio: ripeteva quello che dice l'Athlon Health Score): la sua sostanza sta nei tre pilastri della
            schermata del punteggio (`fit/Punteggio.tsx`). Il Balance sta nell'area Food. Su schermo largo: a sinistra corpo e dispositivi, a destra le abitudini. */}
        {largo ? (
          <View style={stili.fila3}>
            <View style={{ flex: 1, gap: spazio.tre }}>
              {corpoInCima ? null : (
                <Entra indice={1}>
                  <CartaCorpo misure={misure} senzaConsenso={senzaConsenso} />
                </Entra>
              )}
              <Entra indice={1}>
                <CartaDispositivi disp={disp} />
              </Entra>
            </View>
            <View style={{ flex: 1 }}>{abitudini}</View>
          </View>
        ) : (
          <View style={{ gap: spazio.quattro + 4 }}>
            {corpoInCima ? null : (
              <Entra indice={1}>
                <CartaCorpo misure={misure} senzaConsenso={senzaConsenso} />
              </Entra>
            )}
            <Entra indice={1}>
              <CartaDispositivi disp={disp} />
            </Entra>
            {abitudini}
          </View>
        )}
      </Anteprima>

      <Entra indice={2}>
        <Interruttore area={area} onScegli={scegli} relax={conRelax} />
      </Entra>

      <Anteprima sezione="salute" style={{ gap: spazio.quattro + 4 }}>
        {area === 'food' ? (
          <AreaFood dati={fit} />
        ) : area === 'relax' ? (
          <AreaRelax disp={disp} />
        ) : !dati ? (
          errore ? (
            <>
              <Messaggio>{errore}</Messaggio>
              <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} />
            </>
          ) : (
            <SchedeInArrivo />
          )
        ) : (
          <AreaTrain dati={dati} largo={largo} disp={disp} />
        )}
      </Anteprima>
      {/* L'invito a collegare l'app Salute all'apertura: non in anteprima, dove collegarla non si puo'. */}
      {chiuse ? null : <InvitoSaluteAllApertura disp={disp} />}
    </>
  )
}

type Area = 'train' | 'food' | 'relax'

/** Le aree di Fit, come le schede di una pillola: Train e Food, e Relax dove i dispositivi sono aperti. */
function Interruttore({ area, onScegli, relax }: { area: Area; onScegli: (a: Area) => void; relax: boolean }) {
  const p = usePalette()
  const voci: { id: Area; nome: string; icona: NomeIcona }[] = [
    { id: 'train', nome: 'Train', icona: 'peso' },
    { id: 'food', nome: 'Food', icona: 'piatto' },
    ...(relax ? [{ id: 'relax' as const, nome: 'Recover', icona: 'foglia' as const }] : []),
  ]
  return (
    <View style={[stili.interruttore, { backgroundColor: p.incavo }]} accessibilityRole="tablist">
      {voci.map((v) => {
        const qui = v.id === area
        return (
          <Tocco
            key={v.id}
            ruolo="tab"
            stato={{ selected: qui }}
            vibra="scelta"
            etichetta={v.nome}
            onPress={() => !qui && onScegli(v.id)}
            style={[stili.voce, qui && { backgroundColor: p.carta, boxShadow: p.ombra }]}
          >
            <Icona nome={v.icona} size={18} colore={qui ? p.testo : p.testoSecondario} />
            <Text style={{ color: qui ? p.testo : p.testoSecondario, fontFamily: F.extra, fontSize: 15 }}>{v.nome}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  interruttore: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 4 },
  voce: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, minHeight: 44 },
  fila3: { flexDirection: 'row', gap: spazio.tre, alignItems: 'stretch' },
})
