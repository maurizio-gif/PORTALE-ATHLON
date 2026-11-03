import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Pulsante } from "../ui/kit";
import { useRiduciMovimento } from "../ui/movimento";
import { F, FUOCO, usePalette } from "../ui/tema";
import { Tocco } from "../ui/Tocco";
import { Dettagli } from "./Dettagli";
import { giornoBrevetto, LIVELLI, NOMI_CICLO, nomeLivello, type LivelloBrevetto } from "./datiBrevetti";
import { PersonaggioAnimato } from "./PersonaggioAnimato";

// Il viaggio dei brevetti (03/11/2026, richiesta di Maurizio: «invece di fare un'anteprima PDF del libretto, fai un'animazione grafica che ti permette comunque di
// sfogliare le varie pagine»). Sostituisce il libretto da sfogliare (`LibrettoSfoglia`, che erano le pagine del PDF una accanto all'altra): qui la progressione e'
// la cosa che si vede, e si muove.
//
//   - **Il mare**: una scena azzurra con i raggi di luce che ondeggiano e le bolle che salgono. E' di un colore solo in ogni tema, come il libretto stampato era di
//     carta chiara in ogni tema: i personaggi sono ritagli dei diplomi e stanno bene su questo fondo (guardati su chiaro e su scuro).
//   - **Il percorso** in alto: i dodici brevetti come tappe su un binario. All'apertura il binario si riempie, il bambino (la foto, o l'iniziale) *corre* dal primo
//     brevetto a quello di adesso e le tappe si accendono una a una al suo passaggio; arrivato, rimbalza e dal brevetto di adesso partono i coriandoli. Un anello
//     bianco segue la pagina che si sta guardando, **in continuo**, mentre si scorre (e toccare una tappa porta a quella pagina).
//   - **Le pagine**: una carta per brevetto, da scorrere col dito (o con le frecce). La pagina al centro e' piena, le vicine si rimpiccioliscono e si inclinano un
//     poco. Ognuna ha il suo personaggio che galleggia, le prove (che si **spuntano una dopo l'altra** mentre la pagina arriva al centro, e si ritirano se si
//     riparte), e **«Condividi questo brevetto»** se e' conseguito; quelli da conseguire hanno il personaggio in ombra e il lucchetto. Il brevetto di adesso ha
//     il bordo arancio e il bagliore che respira.
//   - **Sotto la scena**: «Cosa si impara» del brevetto che si sta guardando (il programma del libretto del club).
//
// **Le prove del prossimo brevetto avanzano da sole** (03/11/2026, richiesta di Maurizio): il direttore tecnico le spunta dal CRM **una per volta**, e l'app mostra quelle gia'
// fatte sulla pagina del brevetto che viene dopo («3 su 6») e allunga il binario oltre il bambino, in proporzione, verso la tappa successiva. Con tutte le prove il database fa passare il
// bambino di livello da solo e la corsa arriva fino a li'. Le note del direttore non arrivano qui.
//
// **Tutto quello che e' solo vita** (raggi, bolle, galleggiamento, bagliore, coriandoli, la corsa del bambino) sta fermo con «riduci movimento» (`movimento.ts`): la
// scena si vede finita, subito. Quello che porta un dato (le spunte che seguono lo scorrimento, l'anello) e' mosso dal dito, non dal tempo, e resta. **Il
// bambino non e' un dato in piu'**: arriva dove dice il livello di PerfectGym, e le prove si segnano superate per ogni livello fino a quello di adesso (PerfectGym non
// sa quali singole prove sono state superate). **La data sulla pagina e' quella in cui abbiamo visto cambiare il livello**, ed e' scritta solo dove la sappiamo.

const CARTA = "#FFFFFF";
const INCHIOSTRO = "#231F20";
const ARANCIO = "#FF5500";
const LILLA = "#EDE6F0";
const GRIGIO = "#5A6380";
const VERDE = "#16803C";
const N = LIVELLI.length;
const NODO = 22;
const GETTONE = 40;
const GAP = 12;

type Stato = "fatto" | "corrente" | "prossimo" | "da";

const bianco = (a: number) => `rgba(255,255,255,${a})`;

// ---------------------------------------------------------------------------------------------------------------------
// La scena: raggi e bolle.

function Raggi({ fermo }: { fermo: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (fermo) {
      v.value = 0;
      return;
    }
    v.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [fermo, v]);
  const a = useAnimatedStyle(() => ({ opacity: 0.7 + 0.3 * v.value, transform: [{ rotate: "14deg" }, { translateX: 18 * v.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, a]}>
      {[
        { l: "6%", w: 64 },
        { l: "34%", w: 110 },
        { l: "66%", w: 52 },
      ].map((r, k) => (
        <LinearGradient key={k} colors={[bianco(0.2), bianco(0)]} style={{ position: "absolute", top: -60, bottom: -60, left: r.l as `${number}%`, width: r.w }} />
      ))}
    </Animated.View>
  );
}

const BOLLE: { x: number; d: number; durata: number; ritardo: number }[] = [
  { x: 6, d: 9, durata: 9000, ritardo: 0 },
  { x: 19, d: 6, durata: 7000, ritardo: 2500 },
  { x: 33, d: 12, durata: 11000, ritardo: 5000 },
  { x: 47, d: 7, durata: 8000, ritardo: 1200 },
  { x: 61, d: 10, durata: 10000, ritardo: 3800 },
  { x: 75, d: 6, durata: 7500, ritardo: 600 },
  { x: 88, d: 13, durata: 12000, ritardo: 6400 },
  { x: 26, d: 5, durata: 6500, ritardo: 4200 },
];

function Bolla({ b, h, fermo }: { b: (typeof BOLLE)[number]; h: number; fermo: boolean }) {
  const v = useSharedValue(0.5);
  useEffect(() => {
    if (fermo) {
      v.value = 0.5;
      return;
    }
    v.value = 0;
    v.value = withDelay(b.ritardo, withRepeat(withTiming(1, { duration: b.durata, easing: Easing.linear }), -1, false));
  }, [fermo, b.ritardo, b.durata, v]);
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.12, 0.85, 1], [0, 0.6, 0.45, 0], Extrapolation.CLAMP),
    transform: [{ translateY: h - v.value * (h + 40) }, { translateX: Math.sin(v.value * 12) * 7 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: `${b.x}%`, top: 0, width: b.d, height: b.d, borderRadius: b.d / 2, borderWidth: 1.5, borderColor: bianco(0.75), backgroundColor: bianco(0.12) }, s]}
    />
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// I coriandoli: una volta, quando il bambino arriva al brevetto di adesso.

type DatiPezzo = { a: number; d: number; rot: number; c: string; w: number; h: number };
const COLORI = ["#FFC83D", "#4CC3FF", "#FF8FB1", "#FF6A1F", "#7ED957", "#FFFFFF"];
const PEZZI: DatiPezzo[] = Array.from({ length: 18 }, (_, i) => ({
  a: (i / 18) * Math.PI * 2 + (i % 2 ? 0.18 : -0.1),
  d: 70 + ((i * 37) % 70),
  rot: (i * 53) % 360,
  c: COLORI[i % COLORI.length],
  w: 6 + (i % 3) * 2,
  h: 10 + (i % 2) * 4,
}));

function Pezzo({ p, tempo }: { p: DatiPezzo; tempo: SharedValue<number> }) {
  const s = useAnimatedStyle(() => {
    const e = 1 - Math.pow(1 - tempo.value, 3);
    return {
      opacity: interpolate(tempo.value, [0, 0.08, 0.7, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: Math.cos(p.a) * p.d * e },
        { translateY: Math.sin(p.a) * p.d * e * 0.85 - 26 * e + 110 * tempo.value * tempo.value },
        { rotate: `${p.rot + tempo.value * 420}deg` },
      ],
    };
  });
  return <Animated.View style={[{ position: "absolute", left: -p.w / 2, top: -p.h / 2, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.c }, s]} />;
}

/** Scoppia ogni volta che `scatto` cresce; a 0 non c'e' niente. */
function Coriandoli({ scatto }: { scatto: number }) {
  const tempo = useSharedValue(1);
  useEffect(() => {
    if (!scatto) return;
    tempo.value = 0;
    tempo.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) });
  }, [scatto, tempo]);
  return (
    <View pointerEvents="none" style={stili.coriandoli}>
      {PEZZI.map((p, i) => (
        <Pezzo key={i} p={p} tempo={tempo} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Il percorso: il binario con le dodici tappe, il bambino che corre e l'anello che segue la pagina.

function NodoRail({
  i,
  posizione,
  pitch,
  x0,
  cy,
  av,
  onVai,
}: {
  i: number;
  posizione: number;
  pitch: number;
  x0: number;
  cy: number;
  av: SharedValue<number>;
  onVai: (i: number) => void;
}) {
  // La tappa si accende (e fa un saltino) quando il bambino ci passa sopra: `k` e' quanto manca, in tappe, fra lui e questa.
  const acceso = useAnimatedStyle(() => {
    const k = av.value * posizione - i;
    return {
      opacity: interpolate(k, [-0.12, 0.04], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(k, [-0.12, 0, 0.45], [0.55, 1.35, 1], Extrapolation.CLAMP) }],
    };
  });
  const l = LIVELLI[i];
  return (
    <Tocco
      etichetta={`${nomeLivello(l)} (${l.codice})`}
      onPress={() => onVai(i)}
      vibra="scelta"
      sollevaInHover={false}
      hitSlop={{ top: 14, bottom: 14, left: 2, right: 2 }}
      style={{ position: "absolute", left: x0 + i * pitch - NODO / 2, top: cy - NODO / 2, width: NODO, height: NODO }}
    >
      <View style={[stili.nodo, i === posizione + 1 && stili.nodoProssimo]} />
      <Animated.View style={[stili.nodoAcceso, acceso]}>
        <Icona nome="spunta" size={13} colore="#fff" />
      </Animated.View>
    </Tocco>
  );
}

function Percorso({
  larghezza,
  posizione,
  scrollX,
  stride,
  av,
  rimbalzo,
  foto,
  iniziale,
  frazione,
  onVai,
}: {
  larghezza: number;
  posizione: number;
  /** Quanta strada ha fatto verso il brevetto successivo (le prove spuntate su quelle del livello): 0..1. */
  frazione: number;
  scrollX: SharedValue<number>;
  stride: number;
  av: SharedValue<number>;
  rimbalzo: SharedValue<number>;
  foto: string | null;
  iniziale: string;
  onVai: (i: number) => void;
}) {
  const PAD = 20;
  const pitch = (larghezza - 2 * PAD - NODO) / (N - 1);
  const x0 = PAD + NODO / 2;
  const cy = 28;
  // Il binario arriva al bambino e poi va avanti di un pezzo verso la tappa dopo: tante prove spuntate, tanta strada in piu'.
  const riempi = useAnimatedStyle(() => ({ width: Math.max(0, av.value * (posizione + frazione) * pitch) }));
  const gettone = useAnimatedStyle(() => ({ transform: [{ translateX: av.value * posizione * pitch }, { scale: rimbalzo.value }] }));
  const anello = useAnimatedStyle(() => ({ transform: [{ translateX: (Math.min(Math.max(scrollX.value, 0), (N - 1) * stride) / stride) * pitch }] }));
  const cicli = (["pre", "mini", "brevetti"] as const).map((c) => {
    const idx = LIVELLI.map((l, i) => (l.ciclo === c ? i : -1)).filter((i) => i >= 0);
    return { c, centro: x0 + ((idx[0] + idx[idx.length - 1]) / 2) * pitch, primo: idx[0] };
  });
  return (
    <View style={{ height: 88 }}>
      <View style={{ position: "absolute", left: x0, top: cy - 2, width: (N - 1) * pitch, height: 4, borderRadius: 2, backgroundColor: bianco(0.28) }} />
      <Animated.View style={[{ position: "absolute", left: x0, top: cy - 2, height: 4, borderRadius: 2, overflow: "hidden" }, riempi]}>
        <LinearGradient colors={["#FFC83D", "#FF5701"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {LIVELLI.map((l, i) => (
        <NodoRail key={l.codice} i={i} posizione={posizione} pitch={pitch} x0={x0} cy={cy} av={av} onVai={onVai} />
      ))}
      {cicli.map(({ c, centro, primo }) => (
        <View key={c}>
          {primo > 0 ? <View style={{ position: "absolute", left: x0 + (primo - 0.5) * pitch, top: cy + 22, width: 1, height: 34, backgroundColor: bianco(0.3) }} /> : null}
          <Text style={[stili.cicloNome, { left: centro - 60, top: cy + 34 }]} numberOfLines={1}>
            {NOMI_CICLO[c]().titolo}
          </Text>
        </View>
      ))}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x0 - 25, top: cy - 25, width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, borderColor: "#fff" }, anello]} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x0 - GETTONE / 2, top: cy - GETTONE / 2, width: GETTONE, height: GETTONE }, gettone]}>
        <View style={stili.gettone}>
          {foto ? (
            <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Text style={{ color: ARANCIO, fontFamily: F.extra, fontSize: 18 }}>{iniziale.toUpperCase()}</Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Una pagina del viaggio.

function RigaProva({
  testo,
  k,
  n,
  fatto,
  i,
  stride,
  scrollX,
  av,
  corrente,
}: {
  testo: string;
  k: number;
  n: number;
  fatto: boolean;
  i: number;
  stride: number;
  scrollX: SharedValue<number>;
  av: SharedValue<number>;
  corrente: boolean;
}) {
  // La spunta segue lo scorrimento: compare quando la pagina arriva al centro, una prova dopo l'altra, e si ritira se si riparte. Quella del brevetto di adesso aspetta che il
  // bambino arrivi.
  const spunta = useAnimatedStyle(() => {
    let centrata = 1 - Math.min(Math.abs((scrollX.value - i * stride) / stride), 1);
    if (corrente) centrata = Math.min(centrata, interpolate(av.value, [0.92, 1], [0, 1], Extrapolation.CLAMP));
    const inizio = 0.45 + 0.4 * (k / Math.max(n, 1));
    const q = interpolate(centrata, [inizio, inizio + 0.18], [0, 1], Extrapolation.CLAMP);
    return { opacity: q, transform: [{ scale: interpolate(q, [0, 0.6, 1], [0.3, 1.25, 1]) }] };
  });
  return (
    <View style={stili.riga}>
      <View style={[stili.cerchio, fatto ? { backgroundColor: "#E4F6EA", borderColor: VERDE } : { borderColor: "#9A93B0" }]}>
        {fatto ? (
          <Animated.View style={spunta}>
            <Icona nome="spunta" size={13} colore={VERDE} />
          </Animated.View>
        ) : null}
      </View>
      <Text style={[stili.corpo, { flex: 1, minWidth: 0 }]}>{testo}</Text>
    </View>
  );
}

function ChipStato({ stato, fatte, totale }: { stato: Stato; fatte: number; totale: number }) {
  if (stato === "corrente")
    return (
      <LinearGradient colors={[FUOCO[0], FUOCO[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.chip}>
        <Icona nome="trofeo" size={13} colore="#fff" />
        <Text style={[stili.chipTesto, { color: "#fff" }]}>{t("Il tuo brevetto di adesso", "Your current badge")}</Text>
      </LinearGradient>
    );
  if (stato === "fatto")
    return (
      <View style={[stili.chip, { backgroundColor: "#DDF4E4" }]}>
        <Icona nome="spunta" size={13} colore={VERDE} />
        <Text style={[stili.chipTesto, { color: VERDE }]}>{t("Brevetto conseguito", "Badge earned")}</Text>
      </View>
    );
  if (stato === "prossimo")
    return (
      <View style={[stili.chip, { backgroundColor: "#FFEBD9" }]}>
        <Icona nome="bandiera" size={13} colore={ARANCIO} />
        <Text style={[stili.chipTesto, { color: ARANCIO }]}>
          {fatte > 0 ? t(`In corso · ${fatte} su ${totale}`, `In progress · ${fatte} of ${totale}`) : t("In corso", "In progress")}
        </Text>
      </View>
    );
  return (
    <View style={[stili.chip, { backgroundColor: LILLA }]}>
      <Icona nome="lucchetto" size={12} colore={GRIGIO} />
      <Text style={[stili.chipTesto, { color: GRIGIO }]}>{t("Da conseguire", "To be earned")}</Text>
    </View>
  );
}

/** Il bagliore dietro il personaggio: fermo, o per il brevetto di adesso che respira. */
function Alone({ stato, attivo }: { stato: Stato; attivo: boolean }) {
  const fermo = useRiduciMovimento();
  const v = useSharedValue(0);
  const respira = stato === "corrente" && attivo && !fermo;
  useEffect(() => {
    if (!respira) {
      v.value = withTiming(0, { duration: 300 });
      return;
    }
    v.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [respira, v]);
  const s = useAnimatedStyle(() => ({ opacity: 0.85 + 0.15 * v.value, transform: [{ scale: 1 + 0.1 * v.value }] }));
  const colore = stato === "corrente" ? "#FFD2AE" : stato === "fatto" ? "#FFEBD9" : LILLA;
  return <Animated.View style={[stili.alone, { backgroundColor: colore }, s]} />;
}

const SPENTO = { opacity: 0.26, filter: "grayscale(1)" } as ViewStyle;

// **Sul web lo scorrimento aggancia alla pagina con CSS**: `snapToInterval` e' dell'app nativa, e React Native Web non lo traduce (la rotella e il trackpad si fermavano fra due pagine).
// Il browser fa lo scroll-snap da solo: il contenitore e' `mandatory` sull'asse x, ogni pagina si aggancia al centro e `always` impedisce a un colpo forte di saltarne piu' d'una.
const WEB = Platform.OS === "web";
const AGGANCIO_PAGINA = (WEB ? { scrollSnapAlign: "center", scrollSnapStop: "always" } : null) as ViewStyle | null;
const AGGANCIO_SCENA = (WEB ? { scrollSnapType: "x mandatory" } : null) as ViewStyle | null;

function PaginaBrevetto({
  l,
  i,
  stato,
  data,
  nome,
  cardW,
  stride,
  scrollX,
  av,
  attivo,
  scatto,
  superate,
  onCondividi,
}: {
  l: LivelloBrevetto;
  i: number;
  stato: Stato;
  /** Solo per il brevetto successivo a quello di adesso: i numeri d'ordine delle prove che il direttore tecnico ha gia' spuntato. */
  superate: number[];
  data: string | null;
  nome: string;
  cardW: number;
  stride: number;
  scrollX: SharedValue<number>;
  av: SharedValue<number>;
  attivo: boolean;
  scatto: number;
  onCondividi: (l: LivelloBrevetto) => void;
}) {
  const fatto = stato === "fatto" || stato === "corrente";
  const prove = l.prove();
  const fatteDelProssimo = stato === "prossimo" ? prove.filter((_, k) => superate.includes(k + 1)).length : 0;
  // La pagina al centro e' piena; le vicine si rimpiccioliscono, scendono, si inclinano un poco e si abbassano di luce.
  const vicina = useAnimatedStyle(() => {
    const s = Math.max(-1.5, Math.min(1.5, (scrollX.value - i * stride) / stride));
    const d = Math.abs(s);
    return {
      opacity: interpolate(d, [0, 1, 1.5], [1, 0.62, 0.4], Extrapolation.CLAMP),
      transform: [
        { perspective: 900 },
        { translateY: interpolate(d, [0, 1], [0, 16], Extrapolation.CLAMP) },
        { scale: interpolate(d, [0, 1], [1, 0.9], Extrapolation.CLAMP) },
        { rotateY: `${-Math.max(-1, Math.min(1, s)) * 10}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ width: cardW }, AGGANCIO_PAGINA, vicina]}>
      <View style={[stili.carta, stato === "corrente" && { borderWidth: 3, borderColor: ARANCIO }]}>
        <View style={stili.testa}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: GRIGIO, fontFamily: F.bold, fontSize: 12 }} numberOfLines={2}>
              {NOMI_CICLO[l.ciclo]().titolo}
              {l.ausili ? ` · ${t("con ausili didattici", "with learning aids")}` : ""}
            </Text>
          </View>
          <View style={stili.sigla}>
            <Text style={{ color: "#fff", fontFamily: F.extra, fontSize: 18 }}>{l.codice}</Text>
          </View>
        </View>

        <View style={stili.palco}>
          <Alone stato={stato} attivo={attivo} />
          <PersonaggioAnimato specie={l.specie} larghezza={150} altezza={126} attivo={attivo} vivace={fatto} ritardo={(i * 170) % 900} etichetta={nomeLivello(l)} style={!fatto ? SPENTO : undefined} />
          {!fatto ? (
            <View style={stili.lucchetto}>
              <Icona nome="lucchetto" size={20} colore={GRIGIO} />
            </View>
          ) : null}
          {stato === "corrente" ? <Coriandoli scatto={scatto} /> : null}
        </View>

        <Text style={stili.nome} accessibilityRole="header">
          {nomeLivello(l)}
        </Text>
        <ChipStato stato={stato} fatte={fatteDelProssimo} totale={prove.length} />
        {fatto && data ? (
          <View style={stili.dataRiga}>
            <Icona nome="calendario" size={14} colore={GRIGIO} />
            <Text style={{ color: GRIGIO, fontFamily: F.bold, fontSize: 12.5 }}>{t(`Aggiornato il ${giornoBrevetto(data)}`, `Updated on ${giornoBrevetto(data)}`)}</Text>
          </View>
        ) : null}

        <Text style={stili.sezione}>
          {fatto ? t("Prove superate", "Tests passed") : fatteDelProssimo > 0 ? t(`Le prove · ${fatteDelProssimo} su ${prove.length}`, `The tests · ${fatteDelProssimo} of ${prove.length}`) : t("Le prove", "The tests")}
        </Text>
        <View style={{ gap: 7 }}>
          {prove.map((x, k) => (
            <RigaProva key={k} testo={x} k={k} n={prove.length} fatto={fatto || (stato === "prossimo" && superate.includes(k + 1))} i={i} stride={stride} scrollX={scrollX} av={av} corrente={stato === "corrente"} />
          ))}
        </View>

        <View style={{ flexGrow: 1, minHeight: 6 }} />
        {fatto ? (
          // Dentro un contenitore: `Pulsante` ha `flexGrow: 1` e, nella colonna della carta, si allungherebbe in verticale.
          <View>
            <Pulsante testo={t("Condividi questo brevetto", "Share this badge")} icona="condividi" piccolo onPress={() => onCondividi(l)} />
          </View>
        ) : (
          <Text style={{ color: GRIGIO, fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: "center" }}>
            {t(`Quando ${nome || "il bambino"} lo conseguirà potrai condividerlo da qui.`, `When ${nome || "your child"} earns it you’ll be able to share it from here.`)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

export function ViaggioBrevetti({
  nome,
  posizione,
  date,
  foto,
  proveSuperate = [],
  onCondividi,
}: {
  /** Il nome di battesimo del bambino («Sara»), per i titoli. */
  nome: string;
  /** Le prove del brevetto successivo che il direttore tecnico ha gia' spuntato (numeri d'ordine, dal primo): vuoto se non ce n'e' o se non si sa. */
  proveSuperate?: number[];
  /** Dove e' arrivato: l'indice del livello di adesso in `LIVELLI`. */
  posizione: number;
  /** Sigla -> data (ISO) in cui abbiamo visto arrivare quel brevetto, dove la sappiamo (`dateDeiPassaggi`). */
  date: Record<string, string>;
  foto: string | null;
  onCondividi: (l: LivelloBrevetto) => void;
}) {
  const p = usePalette();
  const fermo = useRiduciMovimento();
  const [dim, setDim] = useState({ l: 0, a: 0 });
  const W = dim.l;
  const cardW = Math.min(Math.max(W - 72, 220), 380);
  const stride = cardW + GAP;
  const padL = (W - cardW) / 2;
  const scrollX = useSharedValue(0);
  const av = useSharedValue(fermo ? 1 : 0);
  const rimbalzo = useSharedValue(1);
  const rif = useRef<Animated.ScrollView>(null);
  const [focus, setFocus] = useState(posizione);
  const [scatto, setScatto] = useState(0);
  const iniziale = (nome.trim()[0] ?? "") || "·";
  // Quanta strada verso il brevetto successivo: le prove spuntate sul totale di quel livello. All'ultimo livello non c'e' un successivo.
  const successivo = LIVELLI[posizione + 1];
  const totaleSuccessivo = successivo ? successivo.prove().length : 0;
  const frazione = totaleSuccessivo > 0 ? Math.min(proveSuperate.length, totaleSuccessivo) / totaleSuccessivo : 0;

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });
  // La pagina che si guarda e' quella piu' vicina al centro: serve a JS per il testo sotto, le frecce e il galleggiamento.
  useAnimatedReaction(
    () => (stride > 0 ? Math.round(scrollX.value / stride) : 0),
    (i, prima) => {
      if (i !== prima) scheduleOnRN(setFocus, Math.max(0, Math.min(N - 1, i)));
    },
    [stride],
  );

  // Al primo disegno (e se cambia la misura) la scena parte dal brevetto di adesso.
  useEffect(() => {
    if (!W) return;
    scrollX.value = posizione * stride;
    setFocus(posizione);
    const id = setTimeout(() => rif.current?.scrollTo({ x: posizione * stride, animated: false }), 0);
    return () => clearTimeout(id);
  }, [W, stride, posizione, scrollX]);

  const arrivo = useCallback(() => {
    setScatto((n) => n + 1);
    rimbalzo.value = withSequence(withTiming(1.3, { duration: 150 }), withSpring(1, { damping: 8 }));
  }, [rimbalzo]);

  // La corsa: il bambino parte dal primo brevetto e arriva a quello di adesso, accendendo le tappe. Con «riduci movimento» e' gia' arrivato.
  const corsa = useCallback(() => {
    if (fermo) {
      av.value = 1;
      return;
    }
    av.value = 0;
    av.value = withDelay(
      350,
      withTiming(1, { duration: 500 + posizione * 110, easing: Easing.inOut(Easing.cubic) }, (fatto) => {
        if (fatto) scheduleOnRN(arrivo);
      }),
    );
  }, [fermo, posizione, av, arrivo]);
  useEffect(() => {
    if (W > 0) corsa();
    // Parte quando la scena ha una misura, e se cambia il brevetto di adesso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W > 0, posizione]);

  const vai = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(N - 1, i));
      rif.current?.scrollTo({ x: n * stride, animated: true });
    },
    [stride],
  );

  const lontano = focus !== posizione;
  const l = LIVELLI[Math.min(focus, N - 1)];
  const stato = (i: number): Stato => (i < posizione ? "fatto" : i === posizione ? "corrente" : i === posizione + 1 ? "prossimo" : "da");

  return (
    <View style={{ gap: spazio.tre }}>
      <View style={stili.scena} onLayout={(e) => setDim({ l: Math.round(e.nativeEvent.layout.width), a: Math.round(e.nativeEvent.layout.height) })}>
        <LinearGradient colors={["#0B2F63", "#134F95", "#1B73B8", "#2E94CF"]} locations={[0, 0.35, 0.72, 1]} style={StyleSheet.absoluteFill} />
        {W > 0 ? (
          <>
            <Raggi fermo={fermo} />
            {BOLLE.map((b, k) => (
              <Bolla key={k} b={b} h={dim.a} fermo={fermo} />
            ))}

            <View style={stili.titolo}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={stili.titoloTesto} accessibilityRole="header" numberOfLines={2}>
                  {nome ? t(`Il viaggio di ${nome}`, `${nome}’s journey`) : t("Il viaggio dei brevetti", "The badge journey")}
                </Text>
                <Text style={{ color: bianco(0.85), fontFamily: F.semi, fontSize: 13 }}>
                  {t(`${posizione + 1} brevetti conseguiti su ${N}`, `${posizione + 1} of ${N} badges earned`)}
                </Text>
              </View>
              <Tocco
                etichetta={lontano ? t("Vai al tuo brevetto", "Go to your badge") : t("Rivedi il viaggio", "Replay the journey")}
                onPress={() => {
                  if (lontano) vai(posizione);
                  else corsa();
                }}
                style={stili.chipScena}
              >
                <Icona nome={lontano ? "trofeo" : "aggiorna"} size={13} colore="#fff" />
                <Text style={{ color: "#fff", fontFamily: F.bold, fontSize: 12 }}>{lontano ? t("Il tuo brevetto", "Your badge") : t("Rivedi", "Replay")}</Text>
              </Tocco>
            </View>

            <Percorso larghezza={W} posizione={posizione} scrollX={scrollX} stride={stride} av={av} rimbalzo={rimbalzo} foto={foto} iniziale={iniziale} frazione={frazione} onVai={vai} />

            <Animated.ScrollView
              ref={rif}
              horizontal
              onScroll={onScroll}
              scrollEventThrottle={16}
              snapToInterval={stride}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: padL, gap: GAP, paddingTop: 6, paddingBottom: 10 }}
              contentOffset={{ x: posizione * stride, y: 0 }}
              style={[{ flexGrow: 0 }, AGGANCIO_SCENA]}
            >
              {LIVELLI.map((x, i) => (
                <PaginaBrevetto
                  key={x.codice}
                  l={x}
                  i={i}
                  stato={stato(i)}
                  data={date[x.codice] ?? null}
                  nome={nome}
                  cardW={cardW}
                  stride={stride}
                  scrollX={scrollX}
                  av={av}
                  attivo={focus === i}
                  scatto={scatto}
                  superate={i === posizione + 1 ? proveSuperate : []}
                  onCondividi={onCondividi}
                />
              ))}
            </Animated.ScrollView>

            <View style={stili.nav}>
              <Tocco etichetta={t("Brevetto precedente", "Previous badge")} onPress={() => vai(focus - 1)} spento={focus === 0} style={[stili.freccia, { opacity: focus === 0 ? 0.35 : 1 }]}>
                <Icona nome="indietro" size={18} colore="#fff" />
              </Tocco>
              <Text style={stili.navTesto} accessibilityLiveRegion="polite" numberOfLines={1}>
                {`${nomeLivello(l)} · ${focus + 1} / ${N}`}
              </Text>
              <Tocco etichetta={t("Brevetto successivo", "Next badge")} onPress={() => vai(focus + 1)} spento={focus === N - 1} style={[stili.freccia, { opacity: focus === N - 1 ? 0.35 : 1 }]}>
                <Icona nome="avanti" size={18} colore="#fff" />
              </Tocco>
            </View>
          </>
        ) : (
          <View style={{ minHeight: 420 }} />
        )}
      </View>

      <Dettagli titolo={t(`Cosa si impara: ${nomeLivello(l)}`, `What you learn: ${nomeLivello(l)}`)}>
        {l.programma().map((x, k) => (
          <View key={k} style={{ flexDirection: "row", gap: spazio.due, alignItems: "flex-start" }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: p.accento }} />
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19, flex: 1, minWidth: 0 }}>{x}</Text>
          </View>
        ))}
      </Dettagli>
    </View>
  );
}

const stili = StyleSheet.create({
  scena: { borderRadius: 28, overflow: "hidden", width: "100%", paddingBottom: spazio.tre },
  titolo: { flexDirection: "row", alignItems: "flex-start", gap: spazio.due, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  titoloTesto: { color: "#fff", fontFamily: F.extra, fontSize: 20, letterSpacing: -0.3 },
  chipScena: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, backgroundColor: bianco(0.2) },
  cicloNome: { position: "absolute", width: 120, textAlign: "center", color: bianco(0.8), fontFamily: F.bold, fontSize: 11 },
  nodo: { ...StyleSheet.absoluteFill, borderRadius: NODO / 2, borderWidth: 2, borderColor: bianco(0.55), backgroundColor: bianco(0.14) },
  nodoProssimo: { borderStyle: "dashed", borderColor: bianco(0.95) },
  nodoAcceso: { ...StyleSheet.absoluteFill, borderRadius: NODO / 2, backgroundColor: "#FF6A1F", borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  gettone: {
    width: GETTONE,
    height: GETTONE,
    borderRadius: GETTONE / 2,
    borderWidth: 3,
    borderColor: ARANCIO,
    backgroundColor: "#fff",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
  },
  carta: { flex: 1, backgroundColor: CARTA, borderRadius: 26, padding: 18, paddingTop: 16, gap: 8, boxShadow: "0 14px 30px rgba(5,25,60,0.35)" },
  testa: { flexDirection: "row", alignItems: "center", gap: spazio.due },
  sigla: { backgroundColor: ARANCIO, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  palco: { height: 146, alignItems: "center", justifyContent: "center" },
  alone: { position: "absolute", width: 150, height: 150, borderRadius: 75 },
  lucchetto: { position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 8px rgba(35,31,32,0.18)" },
  coriandoli: { position: "absolute", left: "50%", top: 70, width: 0, height: 0 },
  nome: { color: INCHIOSTRO, fontFamily: F.extra, fontSize: 24, letterSpacing: -0.5, textAlign: "center", marginTop: 2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  chipTesto: { fontFamily: F.extra, fontSize: 12 },
  dataRiga: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  sezione: { color: "#2B3350", fontFamily: F.extra, fontSize: 14, marginTop: 4 },
  riga: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  cerchio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 0 },
  corpo: { color: INCHIOSTRO, fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spazio.due, paddingHorizontal: 20 },
  freccia: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: bianco(0.2) },
  navTesto: { flex: 1, textAlign: "center", color: "#fff", fontFamily: F.bold, fontSize: 14 },
});
