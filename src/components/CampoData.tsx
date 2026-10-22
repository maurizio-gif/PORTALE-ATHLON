import { useEffect, useId, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { spazio, tinta, useColori } from '@/theme'
import { locale, t, tv } from '@/lib/lingua'

// Una data (di nascita) in formato italiano: si scrive gg/mm/aaaa, con le
// barre messe da sole, oppure si sceglie dal calendario. Il calendario apre
// sugli anni (per una data di nascita e' la via piu' corta), poi il mese,
// poi il giorno. Il valore resta quello di PerfectGym: «AAAA-MM-GG», oppure
// '' finche' la data non e' completa e valida.

const MESI = tv(
  ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
)
const SETTIMANA = tv(['L', 'M', 'M', 'G', 'V', 'S', 'D'], ['M', 'T', 'W', 'T', 'F', 'S', 'S'])
const ANNI_PER_PAGINA = 20

const due = (n: number) => String(n).padStart(2, '0')
const iso = (a: number, m: number, g: number) => `${a}-${due(m + 1)}-${due(g)}`
const giorniDel = (a: number, m: number) => new Date(Date.UTC(a, m + 1, 0)).getUTCDate()
const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

type StatoTocco = { pressed: boolean; hovered?: boolean }

/** «1982-03-15» -> «15/03/1982». */
export function dataItaliana(v: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** «15/03/1982» -> «1982-03-15», se la data esiste e sta fra min e max. */
function daTesto(t: string, min: string, max: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t)
  if (!m) return ''
  const [g, me, a] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])]
  if (me < 0 || me > 11 || g < 1 || g > giorniDel(a, me)) return ''
  const v = iso(a, me, g)
  return v < min || v > max ? '' : v
}

/** Le cifre scritte, con le barre al loro posto: «1503» -> «15/03». */
function maschera(t: string): string {
  const c = t.replace(/\D/g, '').slice(0, 8)
  return [c.slice(0, 2), c.slice(2, 4), c.slice(4, 8)].filter(Boolean).join('/')
}

export function CampoData({
  etichetta,
  value,
  onChange,
  min = '1920-01-01',
  max = new Date().toISOString().slice(0, 10),
  annoIniziale = new Date().getFullYear() - 30,
  errore = false,
  sfondo,
}: {
  etichetta: string
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  /** L'anno da cui parte il calendario quando la data non c'e'. */
  annoIniziale?: number
  errore?: boolean
  sfondo?: string
}) {
  const c = useColori()
  const id = useId()
  const [testo, setTesto] = useState(dataItaliana(value))
  const [aperto, setAperto] = useState(false)

  // Se la data cambia da fuori (il calendario, i dati ricaricati), il testo la segue.
  useEffect(() => {
    if (value && daTesto(testo, min, max) !== value) setTesto(dataItaliana(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const sbagliata = testo.length === 10 && !daTesto(testo, min, max)
  return (
    <View style={stili.campo}>
      <Text nativeID={id} style={[stili.etichetta, { color: c.testo }]}>
        {etichetta}
      </Text>
      <View style={[stili.riga, { borderColor: errore || sbagliata ? c.errore : c.bordo, backgroundColor: sfondo ?? c.superficie }]}>
        <TextInput
          accessibilityLabelledBy={id}
          accessibilityLabel={`${etichetta}, ${t('giorno mese anno', 'day month year')}`}
          value={testo}
          onChangeText={(t) => {
            const m = maschera(t)
            setTesto(m)
            onChange(daTesto(m, min, max))
          }}
          placeholder={t('gg/mm/aaaa', 'dd/mm/yyyy')}
          placeholderTextColor={c.testoSecondario}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="birthdate-full"
          maxLength={10}
          style={[stili.input, { color: c.testo }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Apri il calendario', 'Open the calendar')}
          onPress={() => setAperto(true)}
          style={({ pressed, hovered }: StatoTocco) => [stili.bottoneCalendario, { backgroundColor: pressed || hovered ? tinta(c.accento, 0.18) : 'transparent' }]}
        >
          <IconaCalendario colore={c.accento} />
        </Pressable>
      </View>
      {sbagliata ? <Text style={{ color: c.errore, fontSize: 13 }}>{t('Questa data non va: controlla giorno, mese e anno.', 'This date isn’t valid: check the day, month and year.')}</Text> : null}
      <Calendario
        aperto={aperto}
        valore={value}
        min={min}
        max={max}
        annoIniziale={annoIniziale}
        titolo={etichetta}
        onChiudi={() => setAperto(false)}
        onScegli={(v) => {
          setTesto(dataItaliana(v))
          onChange(v)
          setAperto(false)
        }}
      />
    </View>
  )
}

function IconaCalendario({ colore }: { colore: string }) {
  return (
    <View style={{ width: 20, height: 20, justifyContent: 'flex-end' }}>
      <View style={{ position: 'absolute', top: 0, left: 4, width: 2.5, height: 5, borderRadius: 1, backgroundColor: colore }} />
      <View style={{ position: 'absolute', top: 0, right: 4, width: 2.5, height: 5, borderRadius: 1, backgroundColor: colore }} />
      <View style={{ height: 17, borderRadius: 4, borderWidth: 2, borderColor: colore, overflow: 'hidden' }}>
        <View style={{ height: 4, backgroundColor: colore }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 2, paddingTop: 2 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: 3, height: 2, backgroundColor: colore, opacity: i === 4 ? 1 : 0.55 }} />
          ))}
        </View>
      </View>
    </View>
  )
}

type Vista = 'anni' | 'mesi' | 'giorni'

function Calendario({
  aperto,
  valore,
  min,
  max,
  annoIniziale,
  titolo,
  onChiudi,
  onScegli,
}: {
  aperto: boolean
  valore: string
  min: string
  max: string
  annoIniziale: number
  titolo: string
  onChiudi: () => void
  onScegli: (v: string) => void
}) {
  const c = useColori()
  const annoMin = Number(min.slice(0, 4))
  const annoMax = Number(max.slice(0, 4))
  const [anno, setAnno] = useState(annoIniziale)
  const [mese, setMese] = useState(0)
  const [vista, setVista] = useState<Vista>('anni')
  const [pagina, setPagina] = useState(annoIniziale)

  // A ogni apertura: sulla data scelta, se c'e', altrimenti sugli anni.
  useEffect(() => {
    if (!aperto) return
    const m = /^(\d{4})-(\d{2})/.exec(valore)
    const a = m ? Number(m[1]) : Math.min(Math.max(annoIniziale, annoMin), annoMax)
    setAnno(a)
    setMese(m ? Number(m[2]) - 1 : 0)
    setPagina(a)
    setVista(m ? 'giorni' : 'anni')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto])

  const inizioPagina = pagina - (((pagina % ANNI_PER_PAGINA) + ANNI_PER_PAGINA) % ANNI_PER_PAGINA)
  const primoAnno = Math.max(annoMin, inizioPagina)
  const ultimoAnno = Math.min(annoMax, inizioPagina + ANNI_PER_PAGINA - 1)
  const anni = Array.from({ length: Math.max(0, ultimoAnno - primoAnno + 1) }, (_, i) => primoAnno + i)

  const intestazione = valore
    ? maiuscola(new Date(valore + 'T12:00:00Z').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))
    : t('Scegli la data', 'Choose the date')

  function sposta(verso: 1 | -1) {
    if (vista === 'anni') return setPagina((p) => Math.min(annoMax, Math.max(annoMin, p + verso * ANNI_PER_PAGINA)))
    if (vista === 'mesi') return setAnno((a) => Math.min(annoMax, Math.max(annoMin, a + verso)))
    const m = mese + verso
    if (m < 0) {
      setAnno(anno - 1)
      setMese(11)
    } else if (m > 11) {
      setAnno(anno + 1)
      setMese(0)
    } else setMese(m)
  }
  const puoIndietro = vista === 'anni' ? primoAnno > annoMin : vista === 'mesi' ? anno > annoMin : iso(anno, mese, 1) > min
  const puoAvanti = vista === 'anni' ? ultimoAnno < annoMax : vista === 'mesi' ? anno < annoMax : iso(anno, mese, giorniDel(anno, mese)) < max

  // Le caselle del mese, da lunedi'.
  const vuote = (new Date(Date.UTC(anno, mese, 1)).getUTCDay() + 6) % 7
  const caselle: (number | null)[] = [...Array(vuote).fill(null), ...Array.from({ length: giorniDel(anno, mese) }, (_, i) => i + 1)]
  while (caselle.length % 7) caselle.push(null)
  const oggi = new Date().toISOString().slice(0, 10)

  return (
    <Modal visible={aperto} transparent animationType="fade" onRequestClose={onChiudi}>
      <Pressable accessibilityLabel={t('Chiudi il calendario', 'Close the calendar')} onPress={onChiudi} style={stili.velo}>
        {/* Il tocco sulla scheda non chiude: solo fuori. */}
        <Pressable onPress={() => {}} style={[stili.scheda, { backgroundColor: c.sfondo, borderColor: c.bordo }]} accessibilityViewIsModal>
          <View style={[stili.testa, { backgroundColor: c.accento }]}>
            <Text style={[stili.testaPiccolo, { color: 'rgba(255,255,255,0.85)' }]}>{titolo.toUpperCase()}</Text>
            <Text style={[stili.testaGrande, { color: c.suAccento }]}>{intestazione}</Text>
          </View>

          <View style={stili.barra}>
            <View style={{ flexDirection: 'row', gap: spazio.uno + 2 }}>
              {vista === 'giorni' ? <Linguetta testo={maiuscola(MESI[mese])} onPress={() => setVista('mesi')} /> : null}
              <Linguetta
                testo={vista === 'anni' ? `${primoAnno} – ${ultimoAnno}` : String(anno)}
                attiva={vista === 'anni'}
                onPress={() => {
                  setPagina(anno)
                  setVista(vista === 'anni' ? 'mesi' : 'anni')
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spazio.uno + 2 }}>
              <Freccia verso="‹" spenta={!puoIndietro} onPress={() => sposta(-1)} etichetta={t('Precedente', 'Previous')} />
              <Freccia verso="›" spenta={!puoAvanti} onPress={() => sposta(1)} etichetta={t('Successivo', 'Next')} />
            </View>
          </View>

          {vista === 'anni' ? (
            <View style={stili.griglia}>
              {anni.map((a) => (
                <Tasto
                  key={a}
                  testo={String(a)}
                  scelta={a === anno}
                  onPress={() => {
                    setAnno(a)
                    setVista('mesi')
                  }}
                />
              ))}
            </View>
          ) : vista === 'mesi' ? (
            <View style={stili.griglia}>
              {MESI.map((m, i) => (
                <Tasto
                  key={m}
                  testo={maiuscola(m.slice(0, 3))}
                  scelta={i === mese}
                  spenta={iso(anno, i, giorniDel(anno, i)) < min || iso(anno, i, 1) > max}
                  onPress={() => {
                    setMese(i)
                    setVista('giorni')
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={{ paddingHorizontal: spazio.tre }}>
              <View style={{ flexDirection: 'row' }}>
                {SETTIMANA.map((g, i) => (
                  <Text key={i} style={[stili.giornoSettimana, { color: i > 4 ? c.accento : c.testoSecondario }]}>
                    {g}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {caselle.map((g, i) => {
                  if (!g) return <View key={i} style={stili.giorno} />
                  const v = iso(anno, mese, g)
                  const scelto = v === valore
                  const spento = v < min || v > max
                  return (
                    <Pressable
                      key={i}
                      accessibilityRole="button"
                      accessibilityLabel={`${g} ${MESI[mese]} ${anno}`}
                      accessibilityState={{ selected: scelto, disabled: spento }}
                      disabled={spento}
                      onPress={() => onScegli(v)}
                      style={stili.giorno}
                    >
                      {({ pressed, hovered }: StatoTocco) => (
                        <View
                          style={[
                            stili.tondo,
                            {
                              backgroundColor: scelto ? c.accento : pressed || hovered ? tinta(c.accento, 0.16) : 'transparent',
                              borderColor: v === oggi && !scelto ? c.accento : 'transparent',
                            },
                          ]}
                        >
                          <Text style={{ color: scelto ? c.suAccento : spento ? tinta(c.testoSecondario, 0.4) : c.testo, fontWeight: scelto ? '800' : '500', fontSize: 15 }}>
                            {g}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}

          <View style={stili.piede}>
            <Text style={{ color: c.testoSecondario, fontSize: 13, flex: 1 }}>
              {vista === 'anni' ? t('Scegli l’anno', 'Choose the year') : vista === 'mesi' ? t('Scegli il mese', 'Choose the month') : t('Scegli il giorno', 'Choose the day')}
            </Text>
            <Pressable accessibilityRole="button" onPress={onChiudi} style={stili.annulla}>
              <Text style={{ color: c.accento, fontWeight: '700', fontSize: 15 }}>{t('Annulla', 'Cancel')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function Linguetta({ testo, onPress, attiva = false }: { testo: string; onPress: () => void; attiva?: boolean }) {
  const c = useColori()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed, hovered }: StatoTocco) => [stili.linguetta, { backgroundColor: attiva || pressed || hovered ? tinta(c.accento, 0.16) : c.superficie }]}
    >
      <Text style={{ color: c.testo, fontWeight: '700', fontSize: 15 }}>{testo}</Text>
      <Text style={{ color: c.accento, fontSize: 11 }}>▾</Text>
    </Pressable>
  )
}

function Freccia({ verso, onPress, spenta, etichetta }: { verso: string; onPress: () => void; spenta: boolean; etichetta: string }) {
  const c = useColori()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      disabled={spenta}
      onPress={onPress}
      style={({ pressed, hovered }: StatoTocco) => [stili.freccia, { backgroundColor: pressed || hovered ? tinta(c.accento, 0.16) : c.superficie, opacity: spenta ? 0.35 : 1 }]}
    >
      <Text style={{ color: c.testo, fontSize: 22, lineHeight: 24, fontWeight: '600' }}>{verso}</Text>
    </Pressable>
  )
}

function Tasto({ testo, scelta, onPress, spenta = false }: { testo: string; scelta: boolean; onPress: () => void; spenta?: boolean }) {
  const c = useColori()
  return (
    <View style={{ width: '25%', padding: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: scelta, disabled: spenta }}
        disabled={spenta}
        onPress={onPress}
        style={({ pressed, hovered }: StatoTocco) => [
          stili.tasto,
          { backgroundColor: scelta ? c.accento : pressed || hovered ? tinta(c.accento, 0.16) : c.superficie, opacity: spenta ? 0.35 : 1 },
        ]}
      >
        <Text style={{ color: scelta ? c.suAccento : c.testo, fontWeight: scelta ? '800' : '600', fontSize: 15 }}>{testo}</Text>
      </Pressable>
    </View>
  )
}

const stili = StyleSheet.create({
  campo: { gap: spazio.due, flex: 1 },
  etichetta: { fontSize: 15, fontWeight: '600' },
  riga: { minHeight: 50, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingLeft: spazio.tre, paddingRight: spazio.uno },
  input: { flex: 1, minHeight: 48, fontSize: 16, letterSpacing: 0.5 },
  bottoneCalendario: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  velo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spazio.tre, backgroundColor: 'rgba(0,0,0,0.55)' },
  scheda: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, overflow: 'hidden', paddingBottom: spazio.due },
  testa: { paddingHorizontal: spazio.quattro, paddingTop: spazio.tre + 2, paddingBottom: spazio.tre, gap: 2 },
  testaPiccolo: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  testaGrande: { fontSize: 21, fontWeight: '800' },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spazio.tre, paddingVertical: spazio.tre },
  linguetta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18 },
  freccia: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spazio.tre - 4 },
  tasto: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  giornoSettimana: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, fontWeight: '700', paddingBottom: spazio.due },
  giorno: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  tondo: { width: '86%', aspectRatio: 1, maxWidth: 42, borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  piede: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spazio.quattro, paddingTop: spazio.due },
  annulla: { paddingVertical: spazio.due, paddingHorizontal: spazio.due },
})
