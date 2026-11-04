import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { salvaTestMassimale, testMassimali, type CoperturaTest, type EsercizioTest } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { dimentica } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Numero, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { kg as formatoKg, giornoTest, stimaMassimale } from './comune'
import { MediaEsercizio } from './MediaEsercizio'

// Il test dei massimali (16/10/2026): pochi esercizi per la parte superiore,
// il core e la parte inferiore. A carico si scrive il peso e quante
// ripetizioni pulite si sono fatte (fra 4 e 10, al massimo 12), e il
// massimale si stima in modo indiretto; a corpo libero le ripetizioni
// massime; a tempo (il plank, 04/11/2026) i secondi di tenuta. Da quel momento, nelle schede, le percentuali diventano chili.
// **Quanti ne servono** (04/11/2026): per i chili basta un esercizio per gruppo (3); per controllare che i conti tornino, due per la parte superiore e
// due per l'inferiore, piu' il plank (5). Il server dice a che punto si e' (`copertura`) e quando due test non tornano fra loro.

const GRUPPI: { chiave: EsercizioTest['test_gruppo']; titolo: string }[] = [
  { chiave: 'superiore', titolo: t('Parte superiore del corpo', 'Upper body') },
  { chiave: 'core', titolo: 'Core' },
  { chiave: 'inferiore', titolo: t('Parte inferiore del corpo', 'Lower body') },
]

function risultato(e: EsercizioTest): string | null {
  if (!e.ultimo) return null
  return e.test === 'carico'
    ? t(`Massimale ${formatoKg(e.ultimo.massimale)} kg (${e.ultimo.ripetizioni} × ${formatoKg(e.ultimo.kg ?? 0)} kg)`, `1RM ${formatoKg(e.ultimo.massimale)} kg (${e.ultimo.ripetizioni} × ${formatoKg(e.ultimo.kg ?? 0)} kg)`)
    : e.test === 'secondi'
      ? t(`${e.ultimo.ripetizioni} secondi`, `${e.ultimo.ripetizioni} seconds`)
      : t(`${e.ultimo.ripetizioni} ripetizioni`, `${e.ultimo.ripetizioni} reps`)
}

/** Cosa dire sotto un gruppo del test, secondo quanto ne ha fatto la persona e se i test tornano fra loro (04/11/2026). */
function notaGruppo(chiave: EsercizioTest['test_gruppo'], c: CoperturaTest | null): { testo: string; tono: 'ok' | 'attenzione' | 'neutro' } | null {
  const g = c?.gruppi[chiave]
  if (!g) return null
  if (chiave === 'core') {
    return g.stato === 'assente' ? { testo: t('Ne basta uno', 'One is enough'), tono: 'neutro' } : { testo: t('✓ Fatto', '✓ Done'), tono: 'ok' }
  }
  switch (g.stato) {
    case 'assente':
      return { testo: t('Uno basta per calcolare i chili, due per controllarli', 'One is enough to work out your weights, two to check them'), tono: 'neutro' }
    case 'singola':
      return { testo: t('Bastano per i chili: fanne un altro per controllare', 'Enough for your weights: do another to check'), tono: 'neutro' }
    case 'verificata':
      return { testo: t('✓ Controllato: i test tornano fra loro', '✓ Checked: your tests match'), tono: 'ok' }
    case 'discordante':
      return { testo: t('I test non tornano fra loro: per i chili usiamo il più prudente. Rifanne uno', 'Your tests don’t match: we use the more cautious one for your weights. Retake one'), tono: 'attenzione' }
  }
}

function FoglioTest({ e, onChiudi, onSalvato }: { e: EsercizioTest | null; onChiudi: () => void; onSalvato: () => void }) {
  const p = usePalette()
  const [peso, setPeso] = useState('')
  const [rip, setRip] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [fatto, setFatto] = useState<number | null>(null)
  // Dopo il salvataggio: i test di questo distretto non tornano fra loro (04/11/2026).
  const [discordante, setDiscordante] = useState(false)

  useEffect(() => {
    setPeso(e?.ultimo?.kg ? String(e.ultimo.kg).replace('.', t(',', '.')) : '')
    setRip('')
    setErrore(null)
    setFatto(null)
    setDiscordante(false)
  }, [e])

  if (!e) return <Foglio aperto={false} titolo="" onChiudi={onChiudi}>{null}</Foglio>
  const carico = e.test === 'carico'
  // Il plank: si misura in secondi di tenuta, non in ripetizioni.
  const tempo = e.test === 'secondi'
  const kg = Number(peso.replace(',', '.'))
  const r = Number(rip)
  const anteprima = carico && kg > 0 && r >= 1 && r <= 12 ? stimaMassimale(kg, r) : null

  async function salva() {
    if (!e) return
    setErrore(null)
    setInCorso(true)
    const esito = await salvaTestMassimale(e.id, carico ? kg : null, r)
    setInCorso(false)
    if (!esito.ok) {
      colpetto('errore')
      return setErrore(esito.errore)
    }
    colpetto('ok')
    setFatto(esito.massimale)
    setDiscordante(!!esito.copertura?.discordanti.some((d) => d === e.test_gruppo))
    onSalvato()
  }

  return (
    <Foglio aperto={!!e} titolo={e.nome} sottotitolo={carico ? t('Test a carico: peso e ripetizioni', 'Weighted test: weight and reps') : tempo ? t('Test a tempo: secondi di tenuta', 'Timed test: seconds held') : t('Test a corpo libero: ripetizioni massime', 'Bodyweight test: max reps')} onChiudi={onChiudi}>
      <View style={{ gap: spazio.tre }}>
        <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.media} />
        <View style={[stili.istruzioni, { backgroundColor: p.incavo }]}>
          {(carico
            ? [
                t('Riscaldati con due serie leggere: una da 10 e una da 6 ripetizioni.', 'Warm up with two light sets: one of 10 reps and one of 6.'),
                t(
                  'Poi scegli un peso con cui riesci a fare fra 4 e 10 ripetizioni pulite, e fanne quante puoi finché la tecnica regge.',
                  'Then choose a weight you can lift for 4 to 10 clean reps, and do as many as you can while your form holds.',
                ),
                t('Scrivi il peso e le ripetizioni: calcoliamo il tuo massimale.', 'Enter the weight and reps: we’ll work out your 1RM.'),
              ]
            : tempo
              ? [
                  t('Mettiti sugli avambracci, con il corpo in linea dalla testa ai talloni e l’addome attivo.', 'Get onto your forearms, body in line from head to heels, abs engaged.'),
                  t('Tieni la posizione finché la tecnica regge: fermati appena i fianchi scendono o salgono.', 'Hold the position while your form holds: stop as soon as your hips sag or rise.'),
                  t('Scrivi per quanti secondi l’hai tenuta.', 'Enter how many seconds you held it.'),
                ]
              : [
                  t('Fai più ripetizioni che puoi, in modo controllato e senza lunghe pause.', 'Do as many reps as you can, under control and without long pauses.'),
                  t('Fermati quando la tecnica non regge più, e scrivi quante ne hai fatte.', 'Stop when your form breaks down, and enter how many you did.'),
                ]
          ).map((riga, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
              <Text style={[stili.passo, { color: p.accento }]}>{i + 1}</Text>
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{riga}</Text>
            </View>
          ))}
        </View>

        {fatto != null ? (
          <Carta style={{ alignItems: 'center', gap: spazio.due }}>
            <Icona nome="ok" size={30} colore={p.ok} />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{carico ? t('Il tuo massimale stimato', 'Your estimated 1RM') : tempo ? t('La tua tenuta massima', 'Your max hold') : t('Le tue ripetizioni massime', 'Your max reps')}</Text>
            <Numero valore={carico ? formatoKg(fatto) : String(fatto)} unita={carico ? 'kg' : tempo ? t('secondi', 'seconds') : t('ripetizioni', 'reps')} size={40} colore={p.accento} />
            {discordante ? (
              <Messaggio tono="attenzione">
                {t(
                  'I tuoi test di questo gruppo non tornano fra loro: per i chili usiamo il più prudente. Rifai quello che ti sembra sbagliato.',
                  'Your tests in this group don’t match each other: we use the more cautious one for your weights. Retake the one that seems off.',
                )}
              </Messaggio>
            ) : null}
            <Pulsante testo={t('Fatto', 'Done')} variante="secondario" onPress={onChiudi} />
          </Carta>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spazio.due }}>
              {carico ? (
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('PESO (KG)', 'WEIGHT (KG)')}</Text>
                  <TextInput
                    value={peso}
                    onChangeText={(v) => setPeso(v.replace(/[^\d.,]/g, '').slice(0, 6))}
                    keyboardType="decimal-pad"
                    placeholder={t('es. 40', 'e.g. 40')}
                    placeholderTextColor={p.testoTerzo}
                    style={[stili.input, { color: p.testo, backgroundColor: p.incavo }]}
                    accessibilityLabel={t('Peso usato, in chili', 'Weight used, in kilos')}
                  />
                </View>
              ) : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{tempo ? t('SECONDI', 'SECONDS') : t('RIPETIZIONI', 'REPS')}</Text>
                <TextInput
                  value={rip}
                  onChangeText={(v) => setRip(v.replace(/[^\d]/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  placeholder={carico ? t('da 4 a 10', '4 to 10') : tempo ? t('es. 45', 'e.g. 45') : t('es. 20', 'e.g. 20')}
                  placeholderTextColor={p.testoTerzo}
                  style={[stili.input, { color: p.testo, backgroundColor: p.incavo }]}
                  accessibilityLabel={tempo ? t('Secondi di tenuta', 'Seconds held') : t('Ripetizioni fatte', 'Reps done')}
                />
              </View>
            </View>
            {carico && r > 12 ? (
              <Messaggio tono="attenzione">
                {t('Oltre 12 ripetizioni la stima non è affidabile: aumenta il peso, recupera due minuti e rifai la serie.', 'Beyond 12 reps the estimate isn’t reliable: increase the weight, rest two minutes and redo the set.')}
              </Messaggio>
            ) : anteprima ? (
              <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
                {t('Massimale stimato: ', 'Estimated 1RM: ')}<Text style={{ fontFamily: F.extra, color: p.testo }}>{formatoKg(anteprima)} kg</Text>
              </Text>
            ) : null}
            {errore ? <Messaggio>{errore}</Messaggio> : null}
            <Pulsante testo={t('Salva il risultato', 'Save the result')} icona="spunta" onPress={salva} inCorso={inCorso} disabilitato={!r || (carico && (!kg || r > 12))} />
          </>
        )}
      </View>
    </Foglio>
  )
}

export function Test() {
  const p = usePalette()
  const [dati, setDati] = useState<{ esercizi: EsercizioTest[]; ultimo: string | null; giorni: number; copertura: CoperturaTest | null } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [aperti, setAperti] = useState<Record<string, boolean>>({ superiore: true, core: true, inferiore: true })
  const [scelto, setScelto] = useState<EsercizioTest | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await testMassimali()
    if (r.ok) setDati({ esercizi: r.esercizi, ultimo: r.ultimo, giorni: r.giorni, copertura: r.copertura })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  if (!dati) {
    return (
      <Schermata sopratitolo="Train" titolo={t('Test dei massimali', '1RM test')} indietro="/allenamento" barra={false}>
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }

  const fatti = dati.esercizi.filter((e) => e.ultimo).length
  const minimo = dati.copertura?.minimo ?? 3
  const perVerifica = dati.copertura?.per_verifica ?? 5
  return (
    <Schermata sopratitolo="Train" titolo={t('Test dei massimali', '1RM test')} indietro="/allenamento" barra={false}>
      <View style={{ gap: spazio.tre }}>
        {[
          t(
            `Per calcolare i tuoi chili bastano ${minimo} esercizi: uno per la parte superiore, uno per il core e uno per la parte inferiore. Per controllare che i conti tornino fanne ${perVerifica}: due per la parte superiore, due per la parte inferiore e il core.`,
            `To work out your weights, ${minimo} exercises are enough: one for the upper body, one for the core and one for the lower body. To check the numbers add up, do ${perVerifica}: two for the upper body, two for the lower body and the core.`,
          ),
          t(
            'Sugli esercizi a carico usa un peso con cui fai fra 4 e 10 ripetizioni pulite: da peso e ripetizioni calcoliamo il tuo massimale.',
            'For weighted exercises use a weight you can lift for 4 to 10 clean reps: from weight and reps we work out your 1RM.',
          ),
          t(
            `Dopo il test, nei piani le percentuali diventano i tuoi chili. Rifallo ogni ${Math.round(dati.giorni / 7)} settimane.`,
            `After the test, the percentages in your plans become your own weights. Retake it every ${Math.round(dati.giorni / 7)} weeks.`,
          ),
        ].map((riga, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
            <Icona nome="info" size={20} colore={p.blu} />
            <Text style={[stili.consiglio, { color: p.testo, flex: 1 }]}>{riga}</Text>
          </View>
        ))}
        <Text style={[stili.piccola, { color: p.testoSecondario }]}>
          {dati.ultimo
            ? t(`${fatti} di ${dati.esercizi.length} esercizi fatti · ultimo test ${giornoTest(dati.ultimo)}`, `${fatti} of ${dati.esercizi.length} exercises done · last test ${giornoTest(dati.ultimo)}`)
            : t(`${dati.esercizi.length} esercizi, una quindicina di minuti`, `${dati.esercizi.length} exercises, about fifteen minutes`)}
        </Text>
      </View>

      {GRUPPI.map((g, gi) => {
        const qui = dati.esercizi.filter((e) => e.test_gruppo === g.chiave)
        if (!qui.length) return null
        const aperto = aperti[g.chiave]
        const nota = notaGruppo(g.chiave, dati.copertura)
        return (
          <View key={g.chiave} style={{ gap: spazio.due }}>
            <Tocco onPress={() => setAperti((a) => ({ ...a, [g.chiave]: !aperto }))} etichetta={g.titolo} stato={{ selected: aperto }} style={stili.gruppo}>
              <Text style={[stili.gruppoTitolo, { color: p.testo }]}>{g.titolo}</Text>
              <Text style={[stili.piccola, { color: p.testoTerzo }]}>{`${qui.filter((e) => e.ultimo).length}/${qui.length}`}</Text>
              <Icona nome={aperto ? 'meno' : 'piu'} size={18} colore={p.testoSecondario} />
            </Tocco>
            {nota ? <Text style={[stili.piccola, { color: nota.tono === 'ok' ? p.ok : nota.tono === 'attenzione' ? p.attenzione : p.testoSecondario, paddingHorizontal: spazio.uno }]}>{nota.testo}</Text> : null}
            {aperto ? (
              <Carta style={{ paddingVertical: spazio.uno, paddingHorizontal: spazio.tre }}>
                {qui.map((e, i) => (
                  <Entra key={e.id} indice={gi + i}>
                    <Tocco onPress={() => setScelto(e)} etichetta={t(`Test: ${e.nome}`, `Test: ${e.nome}`)} scala={0.99} style={[stili.riga, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
                      <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.miniatura} ferma />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[stili.nome, { color: p.testo }]}>{e.nome}</Text>
                        <Text style={[stili.etichettaTest, { color: e.ultimo ? p.ok : p.attenzione }]}>{e.ultimo ? t('✓ Fatto', '✓ Done') : t('Consigliato', 'Recommended')}</Text>
                        {risultato(e) ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t(`Risultato precedente: ${risultato(e)}`, `Previous result: ${risultato(e)}`)}</Text> : null}
                      </View>
                      <Icona nome="avanti" size={16} colore={p.testoTerzo} />
                    </Tocco>
                  </Entra>
                ))}
              </Carta>
            ) : null}
          </View>
        )
      })}

      <FoglioTest
        e={scelto}
        onChiudi={() => setScelto(null)}
        onSalvato={() => {
          // Le schede ricalcolano i chili col massimale nuovo.
          dimentica()
          carica()
        }}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  consiglio: { fontFamily: F.medio, fontSize: 15, lineHeight: 22 },
  piccola: { fontFamily: F.semi, fontSize: 12.5 },
  gruppo: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, paddingVertical: spazio.uno },
  gruppoTitolo: { flex: 1, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre },
  miniatura: { width: 76, height: 76, borderRadius: 16 },
  nome: { fontFamily: F.extra, fontSize: 16, lineHeight: 20 },
  etichettaTest: { fontFamily: F.bold, fontSize: 13 },
  media: { width: '100%', aspectRatio: 16 / 9, borderRadius: 20 },
  istruzioni: { borderRadius: 18, padding: spazio.tre, gap: spazio.due },
  passo: { fontFamily: F.extra, fontSize: 15, width: 18 },
  nota: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  etichetta: { fontFamily: F.extra, fontSize: 11, letterSpacing: 0.8 },
  input: { height: 54, borderRadius: 16, paddingHorizontal: spazio.tre, fontFamily: F.extra, fontSize: 22, textAlign: 'center' },
})
