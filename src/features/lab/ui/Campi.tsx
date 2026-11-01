import { useEffect, useId, useRef, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { Icona, type NomeIcona } from './Icona'
import { Messaggio, Pulsante } from './kit'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// I campi del laboratorio: l'etichetta piccola in maiuscoletto, il campo
// grigio tondo con l'icona, il bordo arancio quando ci si scrive. E il codice
// in caselle (otto cifre per l'accesso, sei per il cambio d'email).

export function CampoTesto({
  etichetta,
  icona,
  errore = false,
  style,
  ...props
}: TextInputProps & { etichetta: string; icona?: NomeIcona; errore?: boolean }) {
  const p = usePalette()
  const id = useId()
  const [fuoco, setFuoco] = useState(false)
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]} nativeID={id}>
        {etichetta.toUpperCase()}
      </Text>
      <View style={[stili.campo, { backgroundColor: p.incavo, borderColor: errore ? p.errore : fuoco ? p.accento : 'transparent' }]}>
        {icona ? <Icona nome={icona} size={19} colore={fuoco ? p.accento : p.testoTerzo} /> : null}
        <TextInput
          accessibilityLabelledBy={id}
          accessibilityLabel={etichetta}
          placeholderTextColor={p.testoTerzo}
          {...props}
          onFocus={(e) => {
            setFuoco(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFuoco(false)
            props.onBlur?.(e)
          }}
          style={[stili.input, { color: p.testo }, style]}
        />
      </View>
    </View>
  )
}

/**
 * Le pillole fra cui si sceglie una cosa sola: l'obiettivo, i giorni, i minuti. Le usano l'agente delle schede
 * (`Agente.tsx`) e il questionario del Percorso Athlon.
 */
export function Scelte<T extends string | number>({ valori, scelto, onScegli }: { valori: { valore: T; testo: string }[]; scelto: T | null; onScegli: (v: T) => void }) {
  const p = usePalette()
  return (
    <View style={stili.scelte}>
      {valori.map((v) => {
        const attivo = v.valore === scelto
        return (
          <Tocco
            key={String(v.valore)}
            vibra="scelta"
            stato={{ selected: attivo }}
            onPress={() => onScegli(v.valore)}
            etichetta={v.testo}
            style={[stili.scelta, { backgroundColor: attivo ? p.accento : p.carta, borderColor: attivo ? p.accento : p.linea }]}
          >
            <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14.5 }}>{v.testo}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

/** Come `Scelte`, ma se ne possono scegliere piu' d'una: ogni tocco accende o spegne la pillola. */
export function SceltePiu<T extends string | number>({ valori, scelti, onCambia }: { valori: { valore: T; testo: string }[]; scelti: T[]; onCambia: (v: T[]) => void }) {
  const p = usePalette()
  return (
    <View style={stili.scelte}>
      {valori.map((v) => {
        const attivo = scelti.includes(v.valore)
        return (
          <Tocco
            key={String(v.valore)}
            vibra="scelta"
            stato={{ selected: attivo }}
            onPress={() => onCambia(attivo ? scelti.filter((x) => x !== v.valore) : [...scelti, v.valore])}
            etichetta={v.testo}
            style={[stili.scelta, { backgroundColor: attivo ? p.accento : p.carta, borderColor: attivo ? p.accento : p.linea }]}
          >
            <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14.5 }}>{v.testo}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

/** Le cifre del codice di accesso: Supabase Auth ne genera otto (verificato sulle email partite, 15/10/2026). */
export const CIFRE = 8

/**
 * Il codice dentro quello che arriva dal campo o dagli appunti.
 *
 * Digitando arriva una cifra alla volta, ma chi incolla porta quello che ha
 * copiato, e dall'email si copia spesso la riga intera («Il tuo codice è
 * 12345678, vale 1 ora»). Quindi: se le cifre sono quelle del codice, quelle
 * (anche scritte «1234 5678»); se sono di piu', un gruppo di `cifre` cifre
 * staccato dal resto, e solo se non c'e' si tengono le prime. Prima si
 * toglievano tutte le non-cifre e il «1 ora» finiva dentro il codice.
 */
export function estraiCodice(testo: string, cifre: number = CIFRE): string {
  const solo = testo.replace(/\D/g, '')
  if (solo.length <= cifre) return solo
  const gruppo = testo.match(new RegExp(`(?:^|\\D)(\\d{${cifre}})(?!\\d)`))
  return gruppo ? gruppo[1] : solo.slice(0, 10)
}

/**
 * Il codice in caselle; sotto c'e' un campo vero, trasparente, che riceve le cifre (e l'autocompletamento).
 * Incollare passa da `IncollaCodice`: il campo trasparente non e' un posto affidabile per l'«Incolla» di iOS.
 */
export function CampoCodice({
  value,
  onChange,
  onInvio,
  errore,
  cifre = CIFRE,
}: {
  value: string
  onChange: (v: string) => void
  onInvio: () => void
  errore: boolean
  cifre?: number
}) {
  const p = usePalette()
  const campo = useRef<TextInput>(null)
  const [fuoco, setFuoco] = useState(true)
  const caselle = Math.max(cifre, value.length)
  return (
    <Pressable onPress={() => campo.current?.focus()} style={{ gap: spazio.due }} accessible={false}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('CODICE', 'CODE')}</Text>
      <View style={stili.caselle}>
        {Array.from({ length: caselle }, (_, i) => {
          const cifra = value[i] ?? ''
          const qui = fuoco && i === Math.min(value.length, caselle - 1)
          return (
            <View
              key={i}
              style={[
                stili.casella,
                {
                  backgroundColor: cifra ? p.carta : p.incavo,
                  borderColor: errore ? p.errore : qui ? p.accento : cifra ? p.linea : 'transparent',
                  boxShadow: qui ? '0 0 0 4px rgba(255,87,1,0.15)' : undefined,
                },
              ]}
            >
              <Text style={[stili.cifra, { color: p.testo }]}>{cifra}</Text>
            </View>
          )
        })}
        <TextInput
          ref={campo}
          autoFocus
          accessibilityLabel={t(`Codice di ${cifre} cifre`, `${cifre}-digit code`)}
          value={value}
          onChangeText={(v) => onChange(estraiCodice(v, cifre))}
          onSubmitEditing={onInvio}
          onFocus={() => setFuoco(true)}
          onBlur={() => setFuoco(false)}
          inputMode="numeric"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          caretHidden
          style={stili.invisibile}
        />
      </View>
    </Pressable>
  )
}

/** Aperta dalla schermata Home (iPhone: `navigator.standalone`, il resto: display-mode). */
function appInstallata(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches) || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/**
 * «Incolla il codice», solo sul web (nell'app la tastiera propone il codice da sola).
 *
 * Il tasto legge gli appunti, ma su iPhone la lettura la nega la bolla «Incolla»
 * che non compare o si chiude prima del tocco, e dentro certi contenitori (la
 * pagina aperta da un'altra app, l'app installata) viene rifiutata del tutto.
 * Tenere premuto sulle caselle non e' un ripiego affidabile: il campo sotto e'
 * trasparente, e li' il menu «Incolla» di iOS non e' comparso (17/10/2026).
 * Quindi, se la lettura non riesce, compare un campo normale e visibile: su un
 * campo cosi' il menu «Incolla» del telefono c'e' sempre. Quello che ci si
 * incolla passa dallo stesso estrattore delle caselle, quindi anche una riga
 * intera dell'email («Il tuo codice e' 12345678») va bene.
 *
 * Il campo prende il posto del tasto (02/11/2026, «non e' fluido»: nell'app
 * installata si toccava il tasto, che falliva sempre, e solo allora compariva
 * il campo sotto, da cercare e toccare). Nell'app installata la lettura e'
 * rifiutata in partenza, quindi il tasto non c'e' proprio: il campo e' li' dal
 * primo momento, dove c'era il tasto. Ogni incolla, da qualunque parte arrivi
 * (campo, caselle, tastiera fisica), passa dall'ascolto di `paste` sulla pagina.
 */
export function IncollaCodice({ cifre = CIFRE, onCodice, disabilitato = false }: { cifre?: number; onCodice: (codice: string) => void; disabilitato?: boolean }) {
  const p = usePalette()
  const installata = appInstallata()
  const [aMano, setAMano] = useState(installata)
  const [testo, setTesto] = useState('')
  const [avviso, setAvviso] = useState<string | null>(null)

  // Un incolla con dentro il codice vale ovunque cada: lo si prende qui e non si lascia
  // che il campo lo scriva (altrimenti il codice partirebbe due volte).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || disabilitato) return
    const alIncolla = (e: ClipboardEvent) => {
      const codice = estraiCodice(e.clipboardData?.getData('text') ?? '', cifre)
      if (codice.length !== cifre) return
      e.preventDefault()
      setTesto('')
      setAvviso(null)
      onCodice(codice)
    }
    document.addEventListener('paste', alIncolla)
    return () => document.removeEventListener('paste', alIncolla)
  }, [cifre, onCodice, disabilitato])

  if (Platform.OS !== 'web') return null

  async function incolla() {
    setAvviso(null)
    // Senza l'API degli appunti non c'e' niente da provare: subito il campo.
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return setAMano(true)
    try {
      const codice = estraiCodice(await navigator.clipboard.readText(), cifre)
      if (codice.length !== cifre) return setAvviso(t(`Negli appunti non c’è un codice di ${cifre} cifre: copialo dall’email e riprova.`, `There’s no ${cifre}-digit code on your clipboard: copy it from the email and try again.`))
      onCodice(codice)
    } catch {
      setAMano(true)
    }
  }

  function cambiaTesto(v: string) {
    const codice = estraiCodice(v, cifre)
    if (codice.length === cifre) {
      // Si svuota: incollando di nuovo lo stesso codice (uno sbagliato) il testo cambierebbe lo stesso.
      setTesto('')
      setAvviso(null)
      return onCodice(codice)
    }
    setTesto(v)
    setAvviso(v.replace(/\D/g, '').length >= cifre ? t(`Qui non c’è un codice di ${cifre} cifre: copialo dall’email e riprova.`, `This isn’t a ${cifre}-digit code: copy it from the email and try again.`) : null)
  }

  return (
    <View style={{ gap: spazio.due + 2 }}>
      {aMano ? (
        <CampoTesto
          etichetta={t('Incolla il codice', 'Paste the code')}
          icona="copia"
          value={testo}
          onChangeText={cambiaTesto}
          placeholder={t('Tieni premuto qui e scegli «Incolla»', 'Press and hold here and choose “Paste”')}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          // Nell'app installata il campo e' li' da subito, accanto alle caselle che hanno gia' il fuoco: non si ruba.
          autoFocus={!installata}
          editable={!disabilitato}
          errore={!!avviso}
        />
      ) : (
        <Pulsante testo={t('Incolla il codice', 'Paste the code')} icona="documento" variante="secondario" piccolo onPress={incolla} disabilitato={disabilitato} />
      )}
      {avviso ? <Messaggio>{avviso}</Messaggio> : null}
    </View>
  )
}

const stili = StyleSheet.create({
  scelte: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  scelta: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth },
  etichetta: { fontSize: 11, fontFamily: F.extra, letterSpacing: 1.3 },
  nota: { fontSize: 13.5, lineHeight: 20, fontFamily: F.medio },
  campo: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2, minHeight: 58, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: spazio.tre },
  input: { flex: 1, fontSize: 17, minHeight: 52, fontFamily: F.semi, outlineStyle: 'none', minWidth: 0 } as object,
  caselle: { flexDirection: 'row', gap: 6, position: 'relative' },
  casella: { flex: 1, maxWidth: 58, aspectRatio: 0.82, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cifra: { fontSize: 26, fontFamily: F.extra, fontVariant: ['tabular-nums'] },
  // 16px e non meno: Safari su iPhone ingrandisce la pagina quando tocchi un campo
  // con un corpo piu' piccolo, anche se e' invisibile (era 1px, 15/10/2026).
  // Senza contorno: sul telefono il fuoco sul campo trasparente disegnava un rettangolo azzurro attorno alle caselle.
  invisibile: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.011, color: 'transparent', fontSize: 16, outlineStyle: 'none' } as object,
})
