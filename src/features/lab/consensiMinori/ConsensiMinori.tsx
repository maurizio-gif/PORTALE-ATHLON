import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import {
  AMBITI,
  concediConsensi,
  revocaConsensi,
  statoConsensiMinori,
  type AmbitoMinore,
  type FiglioConsensi,
  type StatoConsensiMinori,
} from '@/api/consensiMinori'
import { Casella } from '@/components/Casella'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Foglio } from '../ui/Foglio'
import { Bollino, Carta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { PARAGRAFI_INFORMATIVA, TESTI_AMBITO, TITOLO_INFORMATIVA } from './informativa'

// I consensi del genitore per i dati sulla salute di un figlio da 13 a 17 anni (01/11/2026, decisione di Maurizio): una pagina sola,
// nella sezione Famiglia. Per ogni figlio quattro consensi **disgiunti** (Food, Recover, il corpo, i piani con l'AI): il genitore li
// concede tutti con «Concedi tutti» o uno alla volta, e li toglie uno alla volta. Niente parte da solo: le scelte si salvano con
// «Salva» e, se si concede qualcosa, dopo aver spuntato la presa visione dell'informativa. Il genitore vede anche i dati del figlio
// (decisione di Maurizio, 02/11/2026: «Vedi i dati» porta a `/dati-figlio/<id>`, in sola lettura), e l'informativa lo dice. Le funzioni del figlio non leggono ancora i consensi.
// Chi puo' darlo, l'eta' del figlio e la registrazione sono della funzione `portale-lab-consensi-minori` (APP-ATHLON). In vista cliente niente.

type Scelte = Record<AmbitoMinore, boolean>

const daStato = (f: FiglioConsensi): Scelte => ({
  food: f.consensi.food.attivo,
  recover: f.consensi.recover.attivo,
  corpo: f.consensi.corpo.attivo,
  piani_ai: f.consensi.piani_ai.attivo,
})

export function ConsensiMinori() {
  const p = usePalette()
  const vista = vistaCorrente()
  const router = useRouter()
  const [stato, setStato] = useState<StatoConsensiMinori | undefined>(undefined)
  const [scelte, setScelte] = useState<Record<number, Scelte>>({})
  const [letta, setLetta] = useState(false)
  const [salvo, setSalvo] = useState<number | null>(null)
  const [conferma, setConferma] = useState<{ figlio: FiglioConsensi; togli: AmbitoMinore[] } | null>(null)
  const [esito, setEsito] = useState<{ id: number; ok: boolean; testo: string } | null>(null)

  const carica = useCallback(async () => {
    if (vista) return
    const r = await statoConsensiMinori()
    setStato(r)
    if (r.ok) setScelte(Object.fromEntries(r.figli.map((f) => [f.member_id, daStato(f)])))
  }, [vista])
  useEffect(() => {
    carica()
  }, [carica])

  const intestazione = { titolo: t('Consensi per i tuoi figli', 'Consents for your children'), sopratitolo: t('Il tuo nucleo', 'Your family'), indietro: '/' as const, barra: false }

  async function applica(f: FiglioConsensi, togli: AmbitoMinore[]) {
    const voluti = scelte[f.member_id] ?? daStato(f)
    const attivi = daStato(f)
    const concedere = AMBITI.filter((a) => voluti[a] && !attivi[a])
    setSalvo(f.member_id)
    setEsito(null)
    setConferma(null)
    if (concedere.length) {
      const r = await concediConsensi(f.member_id, concedere)
      if (!r.ok) {
        setSalvo(null)
        return setEsito({ id: f.member_id, ok: false, testo: r.errore })
      }
    }
    if (togli.length) {
      const r = await revocaConsensi(f.member_id, togli)
      if (!r.ok) {
        setSalvo(null)
        await carica()
        return setEsito({ id: f.member_id, ok: false, testo: r.errore })
      }
    }
    await carica()
    setSalvo(null)
    setEsito({ id: f.member_id, ok: true, testo: t('Salvato.', 'Saved.') })
  }

  function salva(f: FiglioConsensi) {
    const voluti = scelte[f.member_id] ?? daStato(f)
    const attivi = daStato(f)
    const togli = AMBITI.filter((a) => attivi[a] && !voluti[a])
    if (togli.length) return setConferma({ figlio: f, togli })
    applica(f, [])
  }

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Vista cliente', 'Client view')}>
          {t('I consensi li dà solo il genitore, dal suo telefono.', 'Only the parent can give consent, from their phone.')}
        </Messaggio>
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...intestazione}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }
  if (!stato.ok) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{stato.errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
      </Schermata>
    )
  }
  if (!stato.figli.length) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Per ora non c’è niente da fare', 'Nothing to do for now')}>
          {t('I consensi si danno per un figlio da 13 a 17 anni che hai nel tuo nucleo. Se hai un figlio di quell’età e non lo vedi qui, chiedi alla segreteria di controllare la sua scheda.', 'Consents are given for a child aged 13 to 17 in your family. If you have a child that age and you don’t see them here, ask the front desk to check their profile.')}
        </Messaggio>
      </Schermata>
    )
  }

  return (
    <Schermata {...intestazione} sottotitolo={t('Decidi tu, un’area alla volta, quali dati sulla salute di tuo figlio può usare l’app.', 'You decide, one area at a time, which of your child’s health data the app can use.')}>
      <Sezione titolo={TITOLO_INFORMATIVA}>
        <Carta piatta style={{ gap: spazio.due }}>
          {PARAGRAFI_INFORMATIVA.map((x, i) => (
            <Text key={i} style={[stili.corpo, { color: p.testoSecondario }]}>
              {x}
            </Text>
          ))}
        </Carta>
      </Sezione>

      {stato.figli.map((f) => {
        const attivi = daStato(f)
        const voluti = scelte[f.member_id] ?? attivi
        const cambiato = AMBITI.some((a) => voluti[a] !== attivi[a])
        const daConcedere = AMBITI.some((a) => voluti[a] && !attivi[a])
        const tutti = AMBITI.every((a) => voluti[a])
        const e = esito && esito.id === f.member_id ? esito : null
        return (
          <Carta key={f.member_id} style={{ gap: spazio.tre }}>
            <View style={stili.testa}>
              <Bollino icona="persona" tono="accento" size={44} pieno />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.titolo, { color: p.testo }]}>{f.nome || t('Tuo figlio', 'Your child')}</Text>
                <Text style={[stili.piccolo, { color: p.testoTerzo }]}>
                  {t(`${AMBITI.filter((a) => attivi[a]).length} consensi su ${AMBITI.length} dati`, `${AMBITI.filter((a) => attivi[a]).length} of ${AMBITI.length} consents given`)}
                </Text>
              </View>
            </View>

            {AMBITI.map((a) => (
              <Casella
                key={a}
                riquadro
                spuntata={voluti[a]}
                onCambia={() => setScelte((s) => ({ ...s, [f.member_id]: { ...(s[f.member_id] ?? attivi), [a]: !voluti[a] } }))}
                etichetta={TESTI_AMBITO[a].titolo}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[stili.voce, { color: p.testo }]}>{TESTI_AMBITO[a].titolo}</Text>
                  <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{TESTI_AMBITO[a].descrizione}</Text>
                  {f.consensi[a].da_rinnovare ? (
                    <Text style={[stili.piccolo, { color: p.accento }]}>{t('Da rinnovare: l’informativa è cambiata.', 'To renew: the notice has changed.')}</Text>
                  ) : null}
                </View>
              </Casella>
            ))}

            {AMBITI.some((a) => attivi[a]) ? (
              <Pulsante testo={t('Vedi i dati', 'See the data')} icona="avanti" variante="secondario" onPress={() => router.push(`/dati-figlio/${f.member_id}` as never)} />
            ) : null}

            <Pulsante
              testo={tutti ? t('Togli tutti', 'Clear all') : t('Concedi tutti', 'Grant all')}
              variante="contorno"
              onPress={() => setScelte((s) => ({ ...s, [f.member_id]: { food: !tutti, recover: !tutti, corpo: !tutti, piani_ai: !tutti } }))}
              disabilitato={salvo === f.member_id}
            />

            {daConcedere ? (
              <Casella spuntata={letta} onCambia={() => setLetta((v) => !v)} etichetta={t('Ho letto l’informativa per il genitore', 'I have read the information notice for parents')}>
                <Text style={[stili.corpo, { color: p.testo, flex: 1 }]}>{t('Ho letto l’informativa per il genitore e do il consenso alle aree spuntate.', 'I have read the information notice for parents and I consent to the ticked areas.')}</Text>
              </Casella>
            ) : null}

            <Pulsante
              testo={t('Salva', 'Save')}
              icona="spunta"
              onPress={() => salva(f)}
              disabilitato={!cambiato || (daConcedere && !letta)}
              inCorso={salvo === f.member_id}
            />
            {e ? <Messaggio tono={e.ok ? 'ok' : 'errore'}>{e.testo}</Messaggio> : null}
          </Carta>
        )
      })}

      <Foglio
        aperto={!!conferma}
        onChiudi={() => setConferma(null)}
        titolo={t('Togliere il consenso?', 'Withdraw consent?')}
        sottotitolo={
          conferma
            ? t(
                `Togliendo ${conferma.togli.map((a) => TESTI_AMBITO[a].titolo).join(', ')} i dati di quell’area di ${conferma.figlio.nome || 'tuo figlio'} vengono cancellati e l’area si richiude.`,
                `Withdrawing ${conferma.togli.map((a) => TESTI_AMBITO[a].titolo).join(', ')} deletes that area’s data for ${conferma.figlio.nome || 'your child'} and closes the area.`,
              )
            : undefined
        }
      >
        <Pulsante testo={t('Sì, togli', 'Yes, withdraw')} variante="pericolo" onPress={() => conferma && applica(conferma.figlio, conferma.togli)} />
        <Pulsante testo={t('Lascia com’è', 'Keep it')} variante="contorno" onPress={() => setConferma(null)} />
      </Foglio>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 19, lineHeight: 24, letterSpacing: -0.4 },
  voce: { fontFamily: F.semi, fontSize: 15, lineHeight: 20 },
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  piccolo: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
})
