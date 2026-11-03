import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, Extrapolation } from "react-native-reanimated";

import { Icona } from "../ui/Icona";
import { useRiduciMovimento } from "../ui/movimento";
import { personaggioDi } from "./personaggiBrevetti";

// I personaggi dei brevetti che si muovono (03/11/2026, richiesta di Maurizio: «anima le immaginine, la stellina, il cavalluccio, tutte»). Le immagini sono PNG
// fermi, ritagliati dai diplomi del club: non hanno pezzi separati (zampe, pinne, coda) da muovere. Il movimento e' quindi **del corpo intero**, uno diverso per ogni animale,
// con il perno al posto giusto (`transformOrigin`), piu' un effetto leggero dove sta bene:
//
//   - **Stella Marina**: dondola e pulsa come se respirasse, e ha attorno **scintille** che si accendono e si spengono. Toccandola **gira su se stessa**;
//   - **Anatroccolo**: **sculetta** (si inclina da un lato e dall'altro, con un saltino a ogni passo) e ha **un'onda** che si allarga sotto le zampe;
//   - **Cavalluccio Marino**: sale e scende piano e **dondola la coda** (perno in basso), con le **bollicine** che salgono;
//   - **Delfino**: ogni tanto **spicca un salto ad arco**, inclinando il muso, poi nuota fermo con un'onda lenta; **bollicine**;
//   - **Pinguino**: **sculetta** piu' deciso e piu' lento dell'anatroccolo (il corpo e' lungo e dritto);
//   - **Pinna Bianca**: **pattuglia** avanti e indietro, con **onde** che partono dalla pinna;
//   - **Squalo Bianco e Squalo Tigre**: **pattugliano** e **ondulano il corpo** (un'inclinazione veloce e piccola che da' l'idea della coda che spazza), con bollicine.
//
// **Toccare il personaggio lo fa saltare** (e gira la stella): una reazione, non un comando, e per questo non e' un pulsante per chi legge con lo screen reader.
// **Solo la pagina che si guarda si muove** (`attivo`), e con «riduci movimento» (`movimento.ts`) il personaggio sta fermo e senza effetti. Un brevetto da conseguire (`vivace`
// falso) e' un'ombra che solo galleggia appena: la festa e' di chi l'ha preso.
//
// Come e' fatto: una fase da 0 a 1 che gira in loop (`withRepeat`), e `moto()` che da' a ogni fase posizione, inclinazione e scala; **ogni movimento torna uguale a se' stesso a fine
// giro** (fase 1 = fase 0), o il loop scatterebbe.

type Tipo = "stella" | "papero" | "cavalluccio" | "delfino" | "pinguino" | "pinna" | "squalo" | "galleggio";
type Effetto = "scintille" | "bolle" | "onda" | null;

const PERSONAGGI: Record<string, { tipo: Tipo; durata: number; origine: string; effetto: Effetto }> = {
  "stella marina": { tipo: "stella", durata: 6000, origine: "50% 55%", effetto: "scintille" },
  anatroccolo: { tipo: "papero", durata: 1500, origine: "50% 100%", effetto: "onda" },
  "cavalluccio marino": { tipo: "cavalluccio", durata: 4200, origine: "50% 95%", effetto: "bolle" },
  delfino: { tipo: "delfino", durata: 5200, origine: "50% 60%", effetto: "bolle" },
  pinguino: { tipo: "pinguino", durata: 1900, origine: "50% 100%", effetto: null },
  "pinna bianca": { tipo: "pinna", durata: 7000, origine: "50% 85%", effetto: "onda" },
  "squalo bianco": { tipo: "squalo", durata: 6500, origine: "50% 50%", effetto: "bolle" },
  "squalo tigre": { tipo: "squalo", durata: 5200, origine: "50% 50%", effetto: "bolle" },
};

const chiaveDi = (specie: string) => specie.toLowerCase().replace(/\s+\d+$/, "").replace(/\s+/g, " ").trim();

/** Posizione (x, y in punti a 150 di larghezza), inclinazione (r e k in gradi) e scala (z) di un movimento alla fase `p` (0..1). */
function moto(tipo: Tipo, p: number) {
  "worklet";
  const T = Math.PI * 2;
  const s = Math.sin(T * p);
  switch (tipo) {
    case "stella":
      return { x: 0, y: -5 * s, r: 14 * s, k: 0, z: 1 + 0.05 * Math.sin(T * 2 * p) };
    case "papero":
      // Un giro sono due passi: |sin| ha il periodo dimezzato, e il saltino cade a ogni passo.
      return { x: 2 * s, y: -Math.abs(s) * 6, r: 6 * s, k: 0, z: 1 };
    case "pinguino":
      return { x: 3 * s, y: -Math.abs(s) * 5, r: 9 * s, k: 0, z: 1 };
    case "cavalluccio":
      return { x: 0, y: -6 * s, r: 7 * Math.sin(T * p + 1.2), k: 0, z: 1 };
    case "delfino": {
      // Rincorsa (0..0.08), salto ad arco (0.08..0.36), assestamento (0.36..0.5) e nuoto fermo (0.5..1): in ogni punto di giunzione y e r sono continue.
      if (p < 0.08) {
        const a = p / 0.08;
        return { x: 0, y: 2 * a, r: -16 * a, k: 0, z: 1 };
      }
      if (p < 0.36) {
        const u = (p - 0.08) / 0.28;
        return { x: 0, y: -40 * 4 * u * (1 - u), r: -16 + 32 * u, k: 0, z: 1 };
      }
      if (p < 0.5) {
        const v = (p - 0.36) / 0.14;
        return { x: 0, y: 0, r: 16 * (1 - v), k: 0, z: 1 };
      }
      const q = (p - 0.5) / 0.5;
      return { x: 0, y: -3 * Math.sin(T * q), r: 3 * Math.sin(T * 2 * q), k: 0, z: 1 };
    }
    case "pinna":
      return { x: 16 * s, y: -2 * Math.sin(T * 2 * p), r: -5 * s, k: 0, z: 1 };
    case "squalo":
      return { x: 12 * s, y: -4 * Math.sin(T * 2 * p), r: 4 * Math.cos(T * p), k: 3.5 * Math.sin(T * 8 * p), z: 1 };
    default:
      return { x: 0, y: -4 * s, r: 1.5 * s, k: 0, z: 1 };
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Gli effetti: tutti dentro il riquadro del personaggio, tutti fermi se non c'e' movimento.

function Scintilla({ x, y, d, grande }: { x: number; y: number; d: number; grande: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(d, withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(v);
  }, [d, v]);
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.5, 1], [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(v.value, [0, 0.5, 1], [0.3, 1.1, 0.3], Extrapolation.CLAMP) }, { rotate: `${v.value * 90}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: `${x}%`, top: `${y}%` }, s]}>
      <Icona nome="stella" size={grande} colore="#FFC83D" />
    </Animated.View>
  );
}

const SCINTILLE = [
  { x: 4, y: 14, d: 0, grande: 16 },
  { x: 84, y: 8, d: 500, grande: 12 },
  { x: 90, y: 58, d: 900, grande: 18 },
  { x: 2, y: 66, d: 1300, grande: 12 },
  { x: 46, y: -4, d: 250, grande: 14 },
];

function Bollina({ x, durata, d, grande }: { x: number; durata: number; d: number; grande: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(d, withRepeat(withTiming(1, { duration: durata, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(v);
  }, [d, durata, v]);
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.15, 0.8, 1], [0, 0.9, 0.7, 0], Extrapolation.CLAMP),
    transform: [{ translateY: -70 * v.value }, { translateX: Math.sin(v.value * 9) * 5 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: `${x}%`, top: "62%", width: grande, height: grande, borderRadius: grande / 2, borderWidth: 1.5, borderColor: "rgba(60,170,235,0.9)", backgroundColor: "rgba(255,255,255,0.55)" }, s]}
    />
  );
}

const BOLLINE = [
  { x: 22, durata: 2600, d: 0, grande: 7 },
  { x: 44, durata: 3200, d: 900, grande: 9 },
  { x: 64, durata: 2400, d: 1700, grande: 6 },
  { x: 80, durata: 3000, d: 400, grande: 8 },
];

function Onda({ d }: { d: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(d, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(v);
  }, [d, v]);
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.1, 1], [0, 0.8, 0], Extrapolation.CLAMP),
    transform: [{ scaleX: interpolate(v.value, [0, 1], [0.3, 1]) }, { scaleY: interpolate(v.value, [0, 1], [0.5, 1]) }],
  }));
  return <Animated.View pointerEvents="none" style={[stili.onda, s]} />;
}

// ---------------------------------------------------------------------------------------------------------------------

export function PersonaggioAnimato({
  specie,
  larghezza,
  altezza,
  attivo = true,
  vivace = true,
  effetti = true,
  ritardo = 0,
  etichetta,
  style,
}: {
  /** «Anatroccolo», o «Anatroccolo 1»: il personaggio e il suo movimento si riconoscono dal nome. */
  specie: string;
  larghezza: number;
  altezza: number;
  /** Solo il personaggio che si guarda si muove. */
  attivo?: boolean;
  /** Falso per un brevetto da conseguire: l'ombra galleggia appena, senza il movimento suo e senza effetti. */
  vivace?: boolean;
  effetti?: boolean;
  /** Quanto aspettare prima di cominciare, in ms: tanti personaggi non partono nello stesso istante. */
  ritardo?: number;
  etichetta?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const fermo = useRiduciMovimento();
  const img = personaggioDi(specie);
  const def = PERSONAGGI[chiaveDi(specie)];
  const tipo: Tipo = vivace && def ? def.tipo : "galleggio";
  const durata = vivace && def ? def.durata : 2800;
  const origine = vivace && def ? def.origine : "50% 50%";
  const effetto: Effetto = vivace && effetti && def && !fermo && attivo ? def.effetto : null;
  const scala = larghezza / 150;
  const fase = useSharedValue(0);
  const salto = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(fase);
    if (fermo || !attivo) {
      fase.value = 0;
      return;
    }
    fase.value = 0;
    fase.value = withDelay(ritardo, withRepeat(withTiming(1, { duration: durata, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(fase);
  }, [fermo, attivo, durata, ritardo, tipo, fase]);

  const corpo = useAnimatedStyle(() => {
    const m = moto(tipo, fase.value);
    const j = salto.value;
    return {
      transform: [
        { translateX: m.x * scala },
        { translateY: (m.y - 26 * j) * scala },
        // La stella, toccata, fa un giro intero; gli altri un'inclinazione.
        { rotate: `${m.r + (tipo === "stella" ? 360 : 18) * j}deg` },
        { skewY: `${m.k}deg` },
        { scale: m.z * (1 + 0.08 * j) },
      ],
    };
  });

  // Il tocco e' una reazione: un salto. Non e' un comando, quindi non e' nel giro dello screen reader.
  const reagisci = () => {
    if (fermo || !vivace) return;
    salto.value = withSequence(withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 520, easing: Easing.bounce }));
  };

  return (
    <View style={[{ width: larghezza, height: altezza }, style]}>
      {effetto === "onda" ? (
        <>
          <Onda d={0} />
          <Onda d={1300} />
        </>
      ) : null}
      <Pressable accessible={false} importantForAccessibility="no" onPress={reagisci} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origine }, corpo]}>
          {img ? <Image source={img} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={etichetta} /> : null}
        </Animated.View>
      </Pressable>
      {effetto === "scintille" ? SCINTILLE.map((x, k) => <Scintilla key={k} {...x} />) : null}
      {effetto === "bolle" ? BOLLINE.map((x, k) => <Bollina key={k} {...x} />) : null}
    </View>
  );
}

const stili = StyleSheet.create({
  onda: { position: "absolute", left: "10%", right: "10%", bottom: 2, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "rgba(60,170,235,0.6)" },
});
