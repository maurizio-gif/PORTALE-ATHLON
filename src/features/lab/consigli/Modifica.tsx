import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { modificaConsigli, type RispostaConsigli } from '@/api/percorso'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Bollino, Carta, Entra, Messaggio, Pulsante, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { sedutePersonalTesto, volteTesto } from './comune'

// «Modifica i consigli» (05/11/2026, richiesta di Maurizio): dopo la risposta il socio li sistema **senza rigenerarli**. Modificare
// vuol dire scegliere fra quello che i consigli gia' contengono, non scrivere: togliere una lezione che non gli interessa (e
// rimetterla), metterne al suo posto una delle sue alternative (quella di prima diventa un'alternativa), cambiare quante volte a
// settimana, togliere una seduta in sala o in vasca o il personal. Si salva con «Salva le modifiche»: la funzione
// (`consigli_modifica`) controlla che le lezioni siano fra i consigli o le loro alternative, le ripassa con le regole di sempre e le
// salva; **non c'e' AI e non conta nella quota del mese**. Il «perche'» di un'alternativa scelta non c'e' (era scritto per un'altra
// lezione).

type Lezione = { id: number; nome: string; categoria: string; minuti: number }
type RigaModifica = Lezione & { volte: number; alternative: Lezione[] }

const lezione = (x: { id: number; nome: string; categoria: string; minuti: number }): Lezione => ({ id: x.id, nome: x.nome, categoria: x.categoria, minuti: x.minuti })

export function ModificaConsigli({ risposta, onAnnulla, onSalvata }: { risposta: RispostaConsigli; onAnnulla: () => void; onSalvata: (r: RispostaConsigli) => void }) {
  const p = usePalette()
  const [righe, setRighe] = useState<RigaModifica[]>(() =>
    risposta.consigli.map((c) => ({ ...lezione(c.tipo), volte: c.volte, alternative: c.alternative.map((a) => lezione(a.tipo)) })),
  )
  const [tolte, setTolte] = useState<RigaModifica[]>([])
  const [sedute, setSedute] = useState(() => new Set(risposta.sedute.map((s) => s.ambiente)))
  const [personal, setPersonal] = useState(!!risposta.personal)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const cambiaRiga = (id: number, f: (r: RigaModifica) => RigaModifica) => setRighe((rr) => rr.map((r) => (r.id === id ? f(r) : r)))
  const togli = (r: RigaModifica) => {
    setRighe((rr) => rr.filter((x) => x.id !== r.id))
    setTolte((tt) => [...tt, r])
  }
  const rimetti = (r: RigaModifica) => {
    setTolte((tt) => tt.filter((x) => x.id !== r.id))
    setRighe((rr) => [...rr, r])
  }
  // L'alternativa prende il posto della lezione, che diventa la prima delle sue alternative (come fa la funzione).
  const alPosto = (r: RigaModifica, a: Lezione) => cambiaRiga(r.id, () => ({ ...a, volte: r.volte, alternative: [lezione(r), ...r.alternative.filter((x) => x.id !== a.id)] }))
  const usate = new Set([...righe, ...tolte].map((r) => r.id))
  const resta = righe.length > 0 || sedute.size > 0

  async function salva() {
    if (!resta || inCorso) return
    setErrore(null)
    setInCorso(true)
    const r = await modificaConsigli({ consigli: righe.map((x) => ({ tipo: x.id, volte: x.volte })), sedute: [...sedute], personal })
    setInCorso(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    onSalvata(r.risposta)
  }

  return (
    <>
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>{t('Sistemali come vuoi tu', 'Arrange them your way')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t(
            'Togli quello che non ti interessa, scegli un’alternativa al posto di una lezione o cambia quante volte a settimana. Le modifiche restano salvate e non contano come una rigenerazione.',
            'Remove what doesn’t interest you, pick an alternative instead of a class, or change how many times a week. Your changes are saved and don’t count as a regeneration.',
          )}
        </Text>
      </Carta>

      {righe.length ? (
        <Sezione titolo={t('Le lezioni', 'Classes')}>
          <View style={{ gap: spazio.quattro }}>
            {righe.map((r, i) => (
              <Entra key={r.id} indice={i}>
                <Carta style={{ gap: spazio.tre }}>
                  <View style={stili.testa}>
                    <Bollino icona={/acqua|nuoto/i.test(r.categoria) ? 'goccia' : 'calendario'} tono={/acqua|nuoto/i.test(r.categoria) ? 'blu' : 'accento'} size={40} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[stili.titolo, { color: p.testo }]}>{r.nome}</Text>
                      <Text style={[stili.nota, { color: p.testoSecondario }]}>{[r.categoria !== r.nome ? r.categoria : null, `${r.minuti} min`, volteTesto(r.volte)].filter(Boolean).join(' · ')}</Text>
                    </View>
                  </View>
                  <Text style={[stili.domanda, { color: p.testo }]}>{t('Quante volte a settimana', 'How many times a week')}</Text>
                  <View style={stili.pillole}>
                    {[1, 2, 3].map((n) => (
                      <Tocco
                        key={n}
                        vibra="scelta"
                        ruolo="radio"
                        stato={{ selected: r.volte === n, checked: r.volte === n }}
                        onPress={() => cambiaRiga(r.id, (x) => ({ ...x, volte: n }))}
                        etichetta={volteTesto(n)}
                        style={[stili.pillola, r.volte === n ? { borderColor: p.accento, backgroundColor: p.accento } : { borderColor: p.linea, backgroundColor: p.carta }]}
                      >
                        <Text style={[stili.pilloleTesto, { color: r.volte === n ? '#fff' : p.testo }]}>{n === 1 ? t('1 volta', 'Once') : n === 2 ? t('2 volte', 'Twice') : t('3 volte', '3 times')}</Text>
                      </Tocco>
                    ))}
                  </View>
                  {r.alternative.filter((a) => !usate.has(a.id)).length ? (
                    <>
                      <Text style={[stili.domanda, { color: p.testo }]}>{t('Al suo posto', 'Instead of it')}</Text>
                      <View style={stili.pillole}>
                        {r.alternative
                          .filter((a) => !usate.has(a.id))
                          .map((a) => (
                            <Tocco key={a.id} vibra="scelta" onPress={() => alPosto(r, a)} etichetta={t(`Metti ${a.nome} al posto di ${r.nome}`, `Put ${a.nome} instead of ${r.nome}`)} style={[stili.pillola, { borderColor: p.linea, backgroundColor: p.carta }]}>
                              <Text style={[stili.pilloleTesto, { color: p.testo }]}>{a.nome}</Text>
                            </Tocco>
                          ))}
                      </View>
                    </>
                  ) : null}
                  <Pulsante testo={t('Togli questa lezione', 'Remove this class')} icona="cestino" variante="contorno" piccolo onPress={() => togli(r)} />
                </Carta>
              </Entra>
            ))}
          </View>
        </Sezione>
      ) : null}

      {tolte.length ? (
        <Sezione titolo={t('Tolte', 'Removed')}>
          <View style={{ gap: spazio.due }}>
            {tolte.map((r) => (
              <RigaTogli key={r.id} testo={r.nome} tolta onPress={() => rimetti(r)} />
            ))}
          </View>
        </Sezione>
      ) : null}

      {risposta.sedute.length || risposta.personal ? (
        <Sezione titolo={t('Sala, vasca e personal', 'Gym floor, pool and personal trainer')}>
          <View style={{ gap: spazio.due }}>
            {risposta.sedute.map((s) => (
              <RigaTogli
                key={s.ambiente}
                testo={s.cosa ?? (s.ambiente === 'vasca' ? 'Nuoto Libero' : t('Una seduta in sala', 'A gym floor session'))}
                tolta={!sedute.has(s.ambiente)}
                onPress={() =>
                  setSedute((x) => {
                    const n = new Set(x)
                    if (n.has(s.ambiente)) n.delete(s.ambiente)
                    else n.add(s.ambiente)
                    return n
                  })
                }
              />
            ))}
            {risposta.personal ? (
              <RigaTogli testo={`${t('Personal trainer', 'Personal trainer')} · ${sedutePersonalTesto(risposta.personal.sedute_mese)}`} tolta={!personal} onPress={() => setPersonal((x) => !x)} />
            ) : null}
          </View>
        </Sezione>
      ) : null}

      {!resta ? <Messaggio tono="attenzione">{t('Tieni almeno un consiglio: per ripartire da capo, rifai il questionario.', 'Keep at least one tip: to start again, fill in the questionnaire again.')}</Messaggio> : null}
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <View style={{ gap: spazio.due }}>
        <Pulsante testo={t('Salva le modifiche', 'Save changes')} icona="spunta" onPress={salva} inCorso={inCorso} disabilitato={!resta} />
        <Pulsante testo={t('Annulla', 'Cancel')} variante="fantasma" onPress={onAnnulla} disabilitato={inCorso} />
      </View>
    </>
  )
}

/** Una cosa che si toglie e si rimette con un tocco: il nome, e a destra «Togli» o «Rimetti». */
function RigaTogli({ testo, tolta, onPress }: { testo: string; tolta: boolean; onPress: () => void }) {
  const p = usePalette()
  return (
    <Tocco vibra="scelta" onPress={onPress} etichetta={`${testo}: ${tolta ? t('rimetti', 'put back') : t('togli', 'remove')}`} style={[stili.riga, { backgroundColor: p.carta, borderColor: p.linea }]}>
      <Text style={[stili.rigaTesto, { color: tolta ? p.testoTerzo : p.testo, textDecorationLine: tolta ? 'line-through' : 'none' }]} numberOfLines={2}>
        {testo}
      </Text>
      <Text style={[stili.rigaAzione, { color: tolta ? p.accento : p.testoSecondario }]}>{tolta ? t('Rimetti', 'Put back') : t('Togli', 'Remove')}</Text>
    </Tocco>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  domanda: { fontFamily: F.bold, fontSize: 14.5 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  pillole: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  pillola: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 14 },
  pilloleTesto: { fontFamily: F.bold, fontSize: 14 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: spazio.tre, paddingHorizontal: spazio.tre + 2 },
  rigaTesto: { flex: 1, fontFamily: F.bold, fontSize: 15 },
  rigaAzione: { fontFamily: F.extra, fontSize: 14 },
})
