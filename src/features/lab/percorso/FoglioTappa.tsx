import { useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import type { Catalogo, GiornoSettimana, PianoSala, SlotRicorrente, Tappa } from '@/api/percorso'
import { spazio } from '@/theme'

import { Scelte } from '../ui/Campi'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Etichetta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { GIORNI, GIORNO_BREVE, minutiDaOra, NOME_GIORNO, oraDaMinuti } from './comune'
import { spessoCompleta } from './affollamento'
import { ORARI_SALA, problemiDellaTappa, ricalcolaAncorate, TETTI } from './controllo'

// Aggiungere o cambiare una tappa del percorso, a mano (20/10/2026). Tre tappe possibili: una **lezione** (si
// sceglie fra quelle del palinsesto che ricorrono quel giorno), la **sala** (un giorno di uno dei tuoi piani di
// allenamento, a un'ora e per un tempo) e il **cardio** (una macchina, per un tempo, prima o dopo un'altra
// tappa o a un'ora precisa).
//
// **Niente si salva da qui**: il foglio consegna la tappa all'editor, e l'editor la controlla con le stesse
// regole che applichera' la funzione (`controllo.ts`). Se la tappa non regge, il foglio lo dice e non si chiude:
// sovrapposizioni, orario della sala, tetti del giorno.

type Tipo = Tappa['tipo']

/** Il segnaposto con cui si controlla la tappa nuova dentro le altre (le ancore usano gli `ordine` veri). */
const ORDINE_NUOVA = 9999

function Stepper({ valore, onCambia, min, max, passo, formato }: { valore: number; onCambia: (v: number) => void; min: number; max: number; passo: number; formato: (v: number) => string }) {
  const p = usePalette()
  const giu = valore - passo >= min
  const su = valore + passo <= max
  return (
    <View style={stili.stepper}>
      <Tocco onPress={() => giu && onCambia(valore - passo)} spento={!giu} etichetta="Meno" style={[stili.passo, { backgroundColor: p.incavo, opacity: giu ? 1 : 0.4 }]}>
        <Icona nome="meno" size={18} colore={p.testo} />
      </Tocco>
      <Text style={[stili.stepperValore, { color: p.testo }]}>{formato(valore)}</Text>
      <Tocco onPress={() => su && onCambia(valore + passo)} spento={!su} etichetta="Più" style={[stili.passo, { backgroundColor: p.incavo, opacity: su ? 1 : 0.4 }]}>
        <Icona nome="piu" size={18} colore={p.testo} />
      </Tocco>
    </View>
  )
}

function Giorni({ scelto, onScegli }: { scelto: GiornoSettimana; onScegli: (g: GiornoSettimana) => void }) {
  return <Scelte valori={GIORNI.map((g) => ({ valore: g as number, testo: GIORNO_BREVE[g] }))} scelto={scelto} onScegli={(g) => onScegli(g as GiornoSettimana)} />
}

function Campo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.campo, { color: p.testoSecondario }]}>{titolo.toUpperCase()}</Text>
      {children}
    </View>
  )
}

export function FoglioTappa({
  giorno: giornoIniziale,
  iniziale,
  altre,
  catalogo,
  errore,
  nonComprese,
  onNonComprese,
  onChiudi,
  onConferma,
}: {
  giorno: GiornoSettimana
  /** La tappa che si cambia; null se si aggiunge. */
  iniziale: Tappa | null
  /** Tutte le altre tappe del percorso (senza quella che si cambia). */
  altre: Tappa[]
  catalogo: Catalogo | null
  errore: string | null
  nonComprese: boolean
  onNonComprese: (v: boolean) => void
  onChiudi: () => void
  onConferma: (t: Tappa) => void
}) {
  const p = usePalette()
  const [tipo, setTipo] = useState<Tipo>(iniziale?.tipo ?? 'lezione')
  const [giorno, setGiorno] = useState<GiornoSettimana>(iniziale?.giorno ?? giornoIniziale)

  // Sala.
  const [pianoId, setPianoId] = useState<string | null>(iniziale?.sala?.scheda_id ?? null)
  const [posizione, setPosizione] = useState<number | null>(iniziale?.sala?.giorno_posizione ?? null)
  const [minutiSala, setMinutiSala] = useState(iniziale?.tipo === 'sala' ? iniziale.minuti : 60)
  const [oraSala, setOraSala] = useState(iniziale?.tipo === 'sala' ? (minutiDaOra(iniziale.ora) ?? 18 * 60) : 18 * 60)

  // Cardio.
  const [macchina, setMacchina] = useState<string | null>(iniziale?.cardio?.esercizio_id ?? null)
  const [minutiCardio, setMinutiCardio] = useState(iniziale?.tipo === 'cardio' ? iniziale.minuti : 30)
  const [oraCardio, setOraCardio] = useState(iniziale?.tipo === 'cardio' ? (minutiDaOra(iniziale.ora) ?? 18 * 60) : 18 * 60)
  const quandoIniziale = iniziale?.tipo === 'cardio' && iniziale.ancora != null && iniziale.posizione ? `${iniziale.posizione}:${iniziale.ancora}` : 'ora'
  const [quando, setQuando] = useState(quandoIniziale)

  const [apre, chiude] = ORARI_SALA[giorno]
  const piani = catalogo?.piani ?? []
  const piano: PianoSala | undefined = piani.find((x) => x.id === pianoId)

  /** La tappa nuova, quando c'e' abbastanza per costruirla. Sala e cardio con l'ora gia' dentro l'orario della sala. */
  const costruita = useMemo((): Tappa | null => {
    const base = { giorno, ordine: ORDINE_NUOVA, ancora: null, posizione: null, perche: null } as const
    if (tipo === 'sala') {
      const g = piano?.giorni.find((x) => x.posizione === posizione)
      if (!piano || !g) return null
      return {
        ...base,
        tipo: 'sala',
        minuti: minutiSala,
        ora: oraDaMinuti(oraSala),
        sala: { scheda_id: piano.id, giorno_posizione: g.posizione, scheda_titolo: piano.titolo, giorno_nome: g.nome, giorno_id: g.giorno_id, disponibile: true, esercizi: g.esercizi, muscoli_primari: g.primari, muscoli_secondari: g.secondari },
      }
    }
    if (tipo === 'cardio') {
      const m = catalogo?.cardio.find((x) => x.id === macchina)
      if (!m) return null
      const [pos, anc] = quando === 'ora' ? [null, null] : quando.split(':')
      const agganciata = pos && anc ? { ancora: Number(anc), posizione: pos as 'prima' | 'dopo' } : { ancora: null, posizione: null }
      const nuova: Tappa = { ...base, ...agganciata, tipo: 'cardio', minuti: minutiCardio, ora: oraDaMinuti(oraCardio), cardio: { esercizio_id: m.id, nome: m.nome } }
      // Agganciato, l'orario lo dice l'altra tappa: lo rifa' il server, e qui si rifa' uguale.
      return ricalcolaAncorate([...altre, nuova]).find((x) => x.ordine === ORDINE_NUOVA) ?? nuova
    }
    return null
  }, [tipo, giorno, piano, posizione, minutiSala, oraSala, catalogo?.cardio, macchina, minutiCardio, oraCardio, quando, altre])

  const problemi = costruita ? problemiDellaTappa(costruita, altre) : []

  // Le tappe del giorno a cui il cardio si puo' agganciare: lezioni e sala, non altro cardio.
  const agganciabili = altre.filter((t) => t.giorno === giorno && t.tipo !== 'cardio')

  const titolo = iniziale ? 'Cambia la tappa' : 'Aggiungi una tappa'

  return (
    <Foglio aperto titolo={titolo} sottotitolo={iniziale ? undefined : `${NOME_GIORNO[giornoIniziale]}: scegli cosa fare.`} onChiudi={onChiudi}>
      <View style={{ gap: spazio.quattro - 4 }}>
        {iniziale ? null : (
          <Scelte
            valori={[
              { valore: 'lezione', testo: 'Lezione' },
              { valore: 'sala', testo: 'In sala' },
              { valore: 'cardio', testo: 'Cardio' },
            ]}
            scelto={tipo}
            onScegli={(v) => setTipo(v as Tipo)}
          />
        )}

        {errore ? <Messaggio tono="attenzione">{errore}</Messaggio> : null}
        {!catalogo && !errore ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
            <ActivityIndicator color={p.accento} />
            <Text style={[stili.nota, { color: p.testo }]}>Leggo il palinsesto…</Text>
          </View>
        ) : null}

        {tipo === 'lezione' && catalogo ? (
          <Lezioni
            catalogo={catalogo}
            giorno={giorno}
            setGiorno={setGiorno}
            altre={altre}
            nonComprese={nonComprese}
            onNonComprese={onNonComprese}
            onScegli={(s) =>
              onConferma({
                giorno: s.giorno,
                ordine: ORDINE_NUOVA,
                tipo: 'lezione',
                minuti: s.minuti,
                ora: s.ora,
                ancora: null,
                posizione: null,
                perche: null,
                lezione: { class_type_id: s.class_type_id, nome: s.nome, categoria: s.categoria, scheda: s.scheda, compresa: s.compresa },
              })
            }
          />
        ) : null}

        {tipo === 'sala' && catalogo ? (
          <>
            <Campo titolo="Giorno">
              <Giorni scelto={giorno} onScegli={(g) => { setGiorno(g); setOraSala((o) => Math.max(ORARI_SALA[g][0], Math.min(o, ORARI_SALA[g][1] - minutiSala))) }} />
            </Campo>
            <Campo titolo="Il piano di allenamento">
              {piani.length ? (
                <View style={{ gap: spazio.due }}>
                  {piani.map((x) => {
                    const attivo = x.id === pianoId
                    return (
                      <View key={x.id} style={{ gap: spazio.due }}>
                        <Tocco
                          vibra="scelta"
                          stato={{ selected: attivo }}
                          onPress={() => {
                            setPianoId(x.id)
                            setPosizione(x.giorni[0]?.posizione ?? null)
                          }}
                          etichetta={x.titolo}
                          style={[stili.voce, { backgroundColor: attivo ? p.accento : p.carta, borderColor: attivo ? p.accento : p.linea }]}
                        >
                          <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: F.extra, fontSize: 15 }}>{x.titolo}</Text>
                          <Text style={{ color: attivo ? 'rgba(255,255,255,0.85)' : p.testoSecondario, fontFamily: F.medio, fontSize: 12.5 }}>{x.del_club ? 'Consigliato dal club' : 'Tuo'}</Text>
                        </Tocco>
                        {attivo ? (
                          <Scelte
                            valori={x.giorni.map((g) => ({ valore: g.posizione, testo: `${g.nome ?? `Giorno ${g.posizione}`} · ${g.esercizi} es.` }))}
                            scelto={posizione}
                            onScegli={setPosizione}
                          />
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              ) : (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Non hai ancora un piano di allenamento: creane uno dalla pagina Train, e torna qui.</Text>
              )}
            </Campo>
            <Campo titolo="A che ora">
              <Stepper valore={oraSala} onCambia={setOraSala} min={apre} max={Math.max(apre, chiude - minutiSala)} passo={15} formato={oraDaMinuti} />
            </Campo>
            <Campo titolo="Per quanto">
              <Stepper valore={minutiSala} onCambia={(m) => { setMinutiSala(m); setOraSala((o) => Math.min(o, chiude - m)) }} min={TETTI.minutiSala[0]} max={TETTI.minutiSala[1]} passo={5} formato={(m) => `${m} min`} />
            </Campo>
          </>
        ) : null}

        {tipo === 'cardio' && catalogo ? (
          <>
            <Campo titolo="Giorno">
              <Giorni scelto={giorno} onScegli={(g) => { setGiorno(g); setQuando('ora'); setOraCardio((o) => Math.max(ORARI_SALA[g][0], Math.min(o, ORARI_SALA[g][1] - minutiCardio))) }} />
            </Campo>
            <Campo titolo="La macchina">
              {catalogo.cardio.length ? (
                <Scelte valori={catalogo.cardio.map((c) => ({ valore: c.id, testo: c.nome }))} scelto={macchina} onScegli={setMacchina} />
              ) : (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Non ci sono macchine cardio nella libreria.</Text>
              )}
            </Campo>
            <Campo titolo="Per quanto">
              <Stepper valore={minutiCardio} onCambia={(m) => { setMinutiCardio(m); setOraCardio((o) => Math.min(o, chiude - m)) }} min={TETTI.minutiCardio[0]} max={TETTI.minutiCardio[1]} passo={5} formato={(m) => `${m} min`} />
            </Campo>
            <Campo titolo="Quando">
              <Scelte
                valori={[
                  ...agganciabili.flatMap((t) => [
                    { valore: `prima:${t.ordine}`, testo: `Prima di ${t.tipo === 'lezione' ? (t.lezione?.nome ?? 'lezione') : 'la sala'} (${t.ora})` },
                    { valore: `dopo:${t.ordine}`, testo: `Dopo ${t.tipo === 'lezione' ? (t.lezione?.nome ?? 'la lezione') : 'la sala'}` },
                  ]),
                  { valore: 'ora', testo: 'A un’ora precisa' },
                ]}
                scelto={quando}
                onScegli={setQuando}
              />
              {quando === 'ora' ? (
                <Stepper valore={oraCardio} onCambia={setOraCardio} min={apre} max={Math.max(apre, chiude - minutiCardio)} passo={15} formato={oraDaMinuti} />
              ) : costruita?.ora ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{`Si fa alle ${costruita.ora}, con dieci minuti di pausa dall’altra tappa.`}</Text>
              ) : null}
            </Campo>
          </>
        ) : null}

        {tipo !== 'lezione' ? (
          <View style={{ gap: spazio.due }}>
            {problemi.map((x) => (
              <Messaggio key={x} tono="attenzione">
                {x}
              </Messaggio>
            ))}
            <Pulsante
              testo={iniziale ? 'Salva la tappa' : 'Aggiungi al percorso'}
              icona="spunta"
              onPress={() => costruita && onConferma(costruita)}
              disabilitato={!costruita || problemi.length > 0}
            />
          </View>
        ) : null}
      </View>
    </Foglio>
  )
}

function Lezioni({
  catalogo,
  giorno,
  setGiorno,
  altre,
  nonComprese,
  onNonComprese,
  onScegli,
}: {
  catalogo: Catalogo
  giorno: GiornoSettimana
  setGiorno: (g: GiornoSettimana) => void
  altre: Tappa[]
  nonComprese: boolean
  onNonComprese: (v: boolean) => void
  onScegli: (s: SlotRicorrente) => void
}) {
  const p = usePalette()
  const delGiorno = catalogo.slot.filter((s) => s.giorno === giorno).sort((a, b) => (minutiDaOra(a.ora) ?? 0) - (minutiDaOra(b.ora) ?? 0))
  const conOpzione = catalogo.idoneita.categorie != null
  return (
    <View style={{ gap: spazio.tre }}>
      <Campo titolo="Giorno">
        <Giorni scelto={giorno} onScegli={setGiorno} />
      </Campo>
      {conOpzione ? (
        <Scelte
          valori={[
            { valore: 'no', testo: 'Solo comprese' },
            { valore: 'si', testo: 'Anche non comprese' },
          ]}
          scelto={nonComprese ? 'si' : 'no'}
          onScegli={(v) => onNonComprese(v === 'si')}
        />
      ) : null}
      <Campo titolo={`Lezioni di ${NOME_GIORNO[giorno].toLowerCase()}`}>
        {delGiorno.length ? (
          <View style={{ gap: spazio.due }}>
            {delGiorno.map((s) => {
              const prova: Tappa = { giorno: s.giorno, ordine: ORDINE_NUOVA, tipo: 'lezione', minuti: s.minuti, ora: s.ora, ancora: null, posizione: null, perche: null, lezione: { class_type_id: s.class_type_id, nome: s.nome, categoria: s.categoria, scheda: s.scheda, compresa: s.compresa } }
              const guai = problemiDellaTappa(prova, altre)
              const gia = altre.some((t) => t.tipo === 'lezione' && t.lezione?.class_type_id === s.class_type_id && t.giorno === s.giorno && t.ora === s.ora)
              const spenta = guai.length > 0 || gia
              return (
                <Tocco
                  key={s.id}
                  onPress={() => onScegli(s)}
                  spento={spenta}
                  etichetta={`${s.ora} ${s.nome}`}
                  style={[stili.voce, { backgroundColor: p.carta, borderColor: p.linea, opacity: spenta ? 0.5 : 1 }]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spazio.due }}>
                    <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 15, flex: 1 }}>{`${s.ora} · ${s.nome}`}</Text>
                    {s.compresa === false ? <Etichetta testo="Da acquistare" tono="attenzione" /> : null}
                  </View>
                  <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12.5 }}>
                    {`${s.categoria} · ${s.minuti} min`}
                    {gia ? ' · è già nel percorso' : guai.length ? ` · si sovrappone a un’altra tappa` : ''}
                    {spessoCompleta(s.affollamento) ? ' · spesso al completo' : ''}
                  </Text>
                </Tocco>
              )
            })}
          </View>
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>Quel giorno non ci sono lezioni che ricorrono ogni settimana{nonComprese ? '' : ' fra quelle comprese nel tuo abbonamento'}.</Text>
        )}
      </Campo>
    </View>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  campo: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  passo: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepperValore: { fontFamily: F.extra, fontSize: 22, minWidth: 96, textAlign: 'center', fontVariant: ['tabular-nums'] },
  voce: { borderRadius: 18, padding: spazio.tre, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
})
