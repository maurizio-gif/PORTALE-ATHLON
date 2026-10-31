import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { salvaAbitudine, togliAbitudine, type DatiAbitudini, type SceltaAbitudine, type TipoAbitudine } from '@/api/dispositivi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { appSaluteDelTelefono } from '../dispositivi/appleSalute'
import { useDispositivi } from '../dispositivi/useDispositivi'
import { Icona } from '../ui/Icona'
import { Bollino, Carta, Etichetta, Messaggio, Pulsante, Scheletro, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { valoriDelTipo } from './abitudini'
import { CATALOGO, dentroILimiti, puntoDiPartenza, sceltePredefinite, SFIDA_GIORNI, sfidaValida, TIPI } from './catalogoAbitudini'
import { descrizioneAbitudine, formatoValore, giorniOnotti, ICONE_ABITUDINI, nomeAbitudine, soloApple, titoloAbitudine } from './testiAbitudini'
import { useAbitudiniScelte } from './useAbitudiniScelte'

// «Scegli le tue abitudini» (31/10/2026, richiesta di Maurizio: abitudini personalizzabili e sfida di 30 giorni). Si scelgono fino a cinque abitudini fra
// dodici, ognuna con la sua soglia e i giorni a settimana in cui va raggiunta; le piu' «allenabili» (passi, minuti di movimento, ore in piedi, meditazione,
// luce, plank, squat, piegamenti, mobilità; l'acqua no) si possono trasformare in una **sfida a obiettivo crescente**: la soglia sale ogni giorno da dove si parte a dove si
// vuole arrivare, in 30 giorni, a partire da un punto di partenza suggerito dai valori recenti (si cambia). **Niente si salva da solo**: si salva con
// «Salva le abitudini». Si descrive, non si giudica: nessun punto, nessun confronto con altri. Le scelte stanno sul server, sotto il consenso dei dispositivi.

type Bozza = { tipo: TipoAbitudine; soglia: number; giorni: number; sfida: { giorni: number; da: number; a: number } | null }

const daScelta = (s: SceltaAbitudine): Bozza => ({ tipo: s.tipo, soglia: s.soglia, giorni: s.giorni, sfida: s.sfida ? { giorni: s.sfida.giorni, da: s.sfida.da, a: s.sfida.a } : null })
const uguali = (a: Bozza, b: Bozza) => a.tipo === b.tipo && a.soglia === b.soglia && a.giorni === b.giorni && JSON.stringify(a.sfida) === JSON.stringify(b.sfida)

function Stepper({ etichetta, valore, onMeno, onPiu, menoOff, piuOff }: { etichetta: string; valore: string; onMeno: () => void; onPiu: () => void; menoOff?: boolean; piuOff?: boolean }) {
  const p = usePalette()
  return (
    <View style={stili.stepper}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{etichetta}</Text>
      <Tocco onPress={onMeno} spento={menoOff} etichetta={t('Diminuisci', 'Decrease')} style={[stili.tondo, { backgroundColor: p.incavo, opacity: menoOff ? 0.4 : 1 }]}>
        <Icona nome="meno" size={16} colore={p.testo} />
      </Tocco>
      <Text style={[stili.valore, { color: p.testo }]} numberOfLines={1}>
        {valore}
      </Text>
      <Tocco onPress={onPiu} spento={piuOff} etichetta={t('Aumenta', 'Increase')} style={[stili.tondo, { backgroundColor: p.incavo, opacity: piuOff ? 0.4 : 1 }]}>
        <Icona nome="piu" size={16} colore={p.testo} />
      </Tocco>
    </View>
  )
}

function Scheda({ b, recenti, sfidaInCorso, onCambia, onTogli }: { b: Bozza; recenti: number[]; sfidaInCorso: boolean; onCambia: (x: Bozza) => void; onTogli: () => void }) {
  const p = usePalette()
  const cat = CATALOGO[b.tipo]
  const passo = cat.passo
  const set = (parziale: Partial<Bozza>) => onCambia({ ...b, ...parziale })
  const sfida = b.sfida
  const cambiaSfida = (x: { giorni: number; da: number; a: number }) => set({ sfida: x, soglia: x.a })
  const attiva = () => {
    const s = puntoDiPartenza(b.tipo, recenti)
    if (s) cambiaSfida(s)
  }
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <Bollino icona={ICONE_ABITUDINI[b.tipo]} tono="accento" size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.nome, { color: p.testo }]}>{sfida ? nomeAbitudine(b.tipo) : titoloAbitudine(b.tipo, b.soglia)}</Text>
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{sfida ? t(`Sfida: da ${formatoValore(b.tipo, sfida.da)} a ${formatoValore(b.tipo, sfida.a)} in ${sfida.giorni} giorni`, `Challenge: from ${formatoValore(b.tipo, sfida.da)} to ${formatoValore(b.tipo, sfida.a)} in ${sfida.giorni} days`) : descrizioneAbitudine(b.tipo)}</Text>
        </View>
        <Tocco onPress={onTogli} etichetta={t(`Togli ${nomeAbitudine(b.tipo)}`, `Remove ${nomeAbitudine(b.tipo)}`)} style={[stili.tondo, { backgroundColor: p.incavo }]}>
          <Icona nome="cestino" size={16} colore={p.testoSecondario} />
        </Tocco>
      </View>

      {!sfida ? (
        <Stepper
          etichetta={b.tipo === 'coricamento' ? t('Entro le', 'By') : t('Obiettivo del giorno', 'Daily goal')}
          valore={formatoValore(b.tipo, b.soglia)}
          onMeno={() => set({ soglia: dentroILimiti(b.tipo, b.soglia - passo) })}
          onPiu={() => set({ soglia: dentroILimiti(b.tipo, b.soglia + passo) })}
          menoOff={b.soglia <= cat.min}
          piuOff={b.soglia >= cat.max}
        />
      ) : (
        <>
          <Stepper
            etichetta={t('Si parte da', 'Start at')}
            valore={formatoValore(b.tipo, sfida.da)}
            onMeno={() => cambiaSfida({ ...sfida, da: dentroILimiti(b.tipo, sfida.da - passo) })}
            onPiu={() => sfida.da + passo < sfida.a && cambiaSfida({ ...sfida, da: dentroILimiti(b.tipo, sfida.da + passo) })}
            menoOff={sfida.da <= cat.min}
            piuOff={sfida.da + passo >= sfida.a}
          />
          <Stepper
            etichetta={t('Si arriva a', 'Build up to')}
            valore={formatoValore(b.tipo, sfida.a)}
            onMeno={() => sfida.a - passo > sfida.da && cambiaSfida({ ...sfida, a: dentroILimiti(b.tipo, sfida.a - passo) })}
            onPiu={() => cambiaSfida({ ...sfida, a: dentroILimiti(b.tipo, sfida.a + passo) })}
            menoOff={sfida.a - passo <= sfida.da}
            piuOff={sfida.a >= cat.max}
          />
          <Stepper
            etichetta={t('Durata', 'Length')}
            valore={t(`${sfida.giorni} giorni`, `${sfida.giorni} days`)}
            onMeno={() => cambiaSfida({ ...sfida, giorni: Math.max(7, sfida.giorni - 7) })}
            onPiu={() => cambiaSfida({ ...sfida, giorni: Math.min(90, sfida.giorni + 7) })}
            menoOff={sfida.giorni <= 7}
            piuOff={sfida.giorni >= 90}
          />
        </>
      )}

      <Stepper
        etichetta={t('Quanti giorni a settimana', 'Days per week')}
        valore={giorniOnotti(b.tipo, b.giorni)}
        onMeno={() => set({ giorni: Math.max(1, b.giorni - 1) })}
        onPiu={() => set({ giorni: Math.min(7, b.giorni + 1) })}
        menoOff={b.giorni <= 1}
        piuOff={b.giorni >= 7}
      />

      {cat.sfida ? (
        <View style={{ gap: spazio.due }}>
          {sfida ? (
            <>
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                {t('La soglia sale ogni giorno, un po’ alla volta. Un giorno mancato non azzera niente: il giorno dopo ha il suo obiettivo.', 'The goal rises a little every day. A missed day resets nothing: the next day has its own goal.')}
                {sfidaInCorso ? ' ' + t('Se cambi questi numeri la sfida riparte da oggi.', 'If you change these numbers the challenge restarts today.') : ''}
              </Text>
              <Pulsante testo={t('Togli la sfida', 'Remove the challenge')} variante="fantasma" piccolo onPress={() => set({ sfida: null })} />
            </>
          ) : (
            <Pulsante testo={t(`Trasforma in una sfida di ${SFIDA_GIORNI} giorni`, `Turn into a ${SFIDA_GIORNI}-day challenge`)} variante="contorno" piccolo icona="bandiera" onPress={attiva} />
          )}
        </View>
      ) : null}
    </Carta>
  )
}

export function SchermataAbitudini() {
  const p = usePalette()
  const disp = useDispositivi()
  const consenso = !!(disp.stato?.ok && disp.stato.consenso)
  const sc = useAbitudiniScelte(!disp.vista && consenso)
  const salvate = sc.config?.scelte ?? []
  const partenza = useMemo<Bozza[]>(() => (salvate.length ? salvate.map(daScelta) : sceltePredefinite().map(daScelta)), [salvate])
  const [bozza, setBozza] = useState<Bozza[] | null>(null)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // La bozza nasce una volta, dalle scelte salvate (o dalle tre di partenza) e non si rifa' sotto le mani di chi sta scegliendo.
  useEffect(() => {
    if (bozza === null && sc.disponibile && sc.config) setBozza(partenza)
  }, [bozza, sc.disponibile, sc.config, partenza])

  const recenti = (tipo: TipoAbitudine): number[] => {
    if (!disp.dati) return []
    const m = valoriDelTipo(tipo, disp.dati, sc.config?.registri ?? [])
    return [...m].sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v)
  }

  const modificato = bozza !== null && (bozza.length !== partenza.length || bozza.some((b) => { const x = partenza.find((y) => y.tipo === b.tipo); return !x || !uguali(b, x) }))
  const telefono = appSaluteDelTelefono()

  async function salva() {
    if (!bozza || !sc.config) return
    setInvio(true)
    setErrore(null)
    let ultimo: DatiAbitudini | null = null
    // Prima si tolgono (altrimenti, al tetto delle cinque, scambiarne una non passerebbe), poi si aggiunge e si cambia.
    for (const s of salvate) {
      if (bozza.some((b) => b.tipo === s.tipo)) continue
      const r = await togliAbitudine(s.tipo)
      if (!r.ok) {
        setInvio(false)
        return setErrore(r.errore)
      }
      ultimo = r
    }
    for (const b of bozza) {
      const s = salvate.find((x) => x.tipo === b.tipo)
      if (s && uguali(b, daScelta(s))) continue
      if (b.sfida && !sfidaValida(b.tipo, b.sfida)) {
        setInvio(false)
        return setErrore(t('La sfida non è valida: l’obiettivo deve essere più alto del punto di partenza.', 'The challenge isn’t valid: the goal must be higher than the starting point.'))
      }
      const r = await salvaAbitudine({ tipo: b.tipo, soglia: b.soglia, giorni: b.giorni, sfida: b.sfida })
      if (!r.ok) {
        if (ultimo) sc.imposta(ultimo)
        setInvio(false)
        return setErrore(r.errore)
      }
      ultimo = r
    }
    if (ultimo) sc.imposta(ultimo)
    setInvio(false)
    router.replace('/allenamento')
  }

  const disponibili = TIPI.filter((x) => !bozza?.some((b) => b.tipo === x))
  const piene = !!bozza && bozza.length >= sc.massime

  return (
    <Schermata sopratitolo="Athlon Health System" titolo={t('Le tue abitudini', 'Your habits')} sottotitolo={t('Scegli cosa seguire, quanto e quanti giorni a settimana. Niente punti e niente confronti: solo il tuo ritmo.', 'Choose what to follow, how much and how many days a week. No points, no comparisons: just your own rhythm.')} indietro="/allenamento" barra={false}>
      {disp.vista ? (
        <Messaggio tono="attenzione">{t('Le abitudini le sceglie il socio.', 'Habits are chosen by the member.')}</Messaggio>
      ) : !disp.stato ? (
        <Scheletro altezza={260} tondo={20} />
      ) : !consenso ? (
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.nome, { color: p.testo }]}>{t('Prima il consenso ai dispositivi', 'First, consent for devices')}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Le abitudini usano i dati di salute dei dispositivi (passi, sonno, allenamenti) e le tue scelte stanno sotto lo stesso consenso: puoi revocarlo quando vuoi e si cancella tutto.', 'Habits use your devices’ health data (steps, sleep, workouts) and your choices sit under the same consent: you can withdraw it any time and everything is deleted.')}</Text>
          <Pulsante testo={t('Vai ai dispositivi', 'Go to devices')} onPress={() => router.push('/allenamento/dispositivi')} />
        </Carta>
      ) : !sc.caricato ? (
        <Scheletro altezza={260} tondo={20} />
      ) : !sc.disponibile ? (
        <Messaggio tono="attenzione">{t('Scegliere le abitudini non è ancora attivo: riprova fra qualche giorno. Intanto restano camminare, muoversi e dormire.', 'Choosing habits isn’t available yet: try again in a few days. Meanwhile walking, moving and sleeping stay as they are.')}</Messaggio>
      ) : bozza === null ? (
        <Scheletro altezza={260} tondo={20} />
      ) : (
        <>
          <Sezione titolo={t('Quelle che segui', 'The ones you follow')} conteggio={bozza.length}>
            {bozza.length === 0 ? <Messaggio tono="attenzione">{t('Aggiungi almeno un’abitudine.', 'Add at least one habit.')}</Messaggio> : null}
            {bozza.map((b) => (
              <Scheda
                key={b.tipo}
                b={b}
                recenti={recenti(b.tipo)}
                sfidaInCorso={!!salvate.find((s) => s.tipo === b.tipo)?.sfida}
                onCambia={(x) => setBozza((l) => (l ? l.map((y) => (y.tipo === x.tipo ? x : y)) : l))}
                onTogli={() => setBozza((l) => (l ? l.filter((y) => y.tipo !== b.tipo) : l))}
              />
            ))}
          </Sezione>

          <Sezione titolo={t('Aggiungine un’altra', 'Add another')}>
            {piene ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Puoi seguirne al massimo ${sc.massime}: toglierne una per aggiungerne un’altra. Poche, e tenute a lungo, sono meglio di tante.`, `You can follow at most ${sc.massime}: remove one to add another. A few, kept up, beat many.`)}</Text> : null}
            {disponibili.map((tipo) => (
              <Carta key={tipo} onPress={piene ? undefined : () => setBozza((l) => (l ? [...l, { tipo, soglia: CATALOGO[tipo].predefinita.soglia, giorni: CATALOGO[tipo].predefinita.giorni, sfida: null }] : l))} piatta style={{ opacity: piene ? 0.5 : 1 }}>
                <View style={stili.testa}>
                  <Bollino icona={ICONE_ABITUDINI[tipo]} tono="neutro" size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[stili.nome, { color: p.testo }]}>{nomeAbitudine(tipo)}</Text>
                    <Text style={[stili.piccola, { color: p.testoSecondario }]}>{descrizioneAbitudine(tipo)}</Text>
                    {soloApple(tipo) && telefono === 'google' ? <Etichetta testo={t('Non disponibile con Health Connect', 'Not available with Health Connect')} tono="attenzione" /> : null}
                  </View>
                  {piene ? null : <Icona nome="piu" size={18} colore={p.accento} />}
                </View>
              </Carta>
            ))}
          </Sezione>

          {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
          <Pulsante testo={t('Salva le abitudini', 'Save habits')} disabilitato={!modificato || bozza.length === 0} inCorso={invio} onPress={salva} />
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>
            {t('Le soglie di partenza sono indicative: scegli quelle che fanno per te. Se hai dubbi o un problema di salute, chiedi al tuo medico o al tecnico del club. Le abitudini non entrano nel punteggio.', 'Starting goals are only a guide: pick the ones that suit you. If you have doubts or a health condition, ask your doctor or the club’s coach. Habits don’t count towards your score.')}
          </Text>
        </>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  etichetta: { flex: 1, fontFamily: F.medio, fontSize: 13 },
  valore: { minWidth: 96, textAlign: 'center', fontFamily: F.bold, fontSize: 15 },
  tondo: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
})
