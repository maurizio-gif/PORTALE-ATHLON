import { useEvent, useEventListener } from "expo";
import { Image } from "expo-image";
import { useIsFocused } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Tocco } from "../ui/Tocco";
import { usePalette } from "../ui/tema";
import type { ChiaveAttivita } from "./attivita";

// Le foto e il video di ogni attivita', quelli della sua pagina sul sito (02/11/2026, richiesta di Maurizio: «mettici qualche foto presa
// dalla rispettiva pagina del sito, anzi mettici proprio il video se c'e'»). Sono gli stessi file del sito (`data/junior.ts` di
// athlon-roma), serviti da www.athlonroma.it: l'app non ne tiene copia, quindi se sul sito cambiano si cambiano qui gli indirizzi.
//
// **Dove c'e' il video, c'e' solo il video** (richiesta di Maurizio, stesso giorno: «metti solo il video al posto della foto in evidenza,
// senza galleria sotto»): Scuola Nuoto Bambini e Baby Nuoto. Parte da solo, muto e in loop come sulla pagina del sito (la carta
// si apre a un tocco, quindi non pesa su chi non la apre); un tasto in basso accende l'audio. Con «riduci movimento» resta fermo, col
// tasto per avviarlo. Si ferma quando si lascia la schermata. Se il video non si carica resta la foto (il poster). Le altre attivita'
// (Pallanuoto, Propaganda, Agonistico) non hanno video: foto in evidenza e striscia di foto della pagina.
//
// **Il video della Scuola Nuoto Bambini non e' online** (02/11/2026): il file indicato nei dati del sito
// (`2024/11/SCUOLA-NUOTO-BAMBINI-2.mp4`) risponde 403 anche dal sito e non e' nel repository ne' nel backup. L'indirizzo e' messo lo stesso:
// finche' il file non torna al suo posto si vede la foto; quando torna (nella `public/` del sito, a quel percorso) parte da solo.
// Propaganda e Agonistico condividono la pagina del Nuoto Agonistico.

const SITO = "https://www.athlonroma.it/wp-content/uploads";

type Media = { video?: string; poster: string; foto: { uri: string; didascalia: string }[] };

// Tutto in funzioni e non in costanti di modulo: `t()` si decide alla prima domanda (vedi `lib/lingua.ts`), non al caricamento.
const VASCA_GRANDE = (n: string) => ({ uri: `${SITO}/2026/10/vasca-grande-${n}.webp`, didascalia: t("Vasca grande", "Big pool") });

const agonistico = (): Media => ({
  poster: `${SITO}/2024/08/scuola-nuoto-bambini-1280.jpg`,
  foto: ["11", "07", "02", "04", "13"].map(VASCA_GRANDE),
});

const media = (): Record<ChiaveAttivita, Media> => ({
  baby: {
    video: `${SITO}/2025/06/Baby-Nuoto-60.mp4`,
    poster: `${SITO}/2025/06/baby-nuoto-38s.jpg`,
    foto: [],
  },
  snb: {
    video: `${SITO}/2024/11/SCUOLA-NUOTO-BAMBINI-2.mp4`,
    poster: `${SITO}/2024/08/P1120412-1280.jpg`,
    foto: [],
  },
  pallanuoto: {
    poster: `${SITO}/2024/08/1140547-hero-1280.jpg`,
    foto: ["11", "07", "02", "04", "13"].map(VASCA_GRANDE),
  },
  agonistico: agonistico(),
  propaganda: agonistico(),
});

/** Il video in evidenza: parte muto e in loop, con il poster sotto finche' non e' pronto. Un errore lo segnala a chi lo mostra (resta la foto). */
function VideoInEvidenza({ uri, poster, onErrore }: { uri: string; poster: string; onErrore: () => void }) {
  const p = usePalette();
  const fermo = useReducedMotion();
  const inPrimoPiano = useIsFocused();
  const [pronto, setPronto] = useState(false);
  const player = useVideoPlayer(uri, (v) => {
    v.loop = true;
    v.muted = true;
    if (!fermo) v.play();
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const { muted } = useEvent(player, "mutedChange", { muted: player.muted });
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay") {
      setPronto(true);
      if (!fermo && inPrimoPiano && !player.playing) player.play();
    }
    if (status === "error") onErrore();
  });
  // Sul web il play() della preparazione puo' arrivare prima del <video>: si riparte; fuori dalla schermata si ferma.
  useEffect(() => {
    if (!inPrimoPiano) player.pause();
    else if (!fermo) player.play();
  }, [player, fermo, inPrimoPiano]);
  // Se «pronto» non arriva (sul web puo' precedere l'ascolto) il video si mostra lo stesso, salvo che sia in errore.
  useEffect(() => {
    const tmr = setTimeout(() => {
      if (player.status !== "error") setPronto(true);
    }, 1500);
    return () => clearTimeout(tmr);
  }, [player]);
  return (
    <>
      <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%", opacity: pronto ? 1 : 0 }]}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        playsInline
      />
      {pronto ? (
        <View style={stili.comandi}>
          {!isPlaying ? (
            <Tocco etichetta={t("Avvia il video", "Play the video")} onPress={() => player.play()} style={stili.comando}>
              <Icona nome="riproduci" size={18} colore="#fff" />
            </Tocco>
          ) : null}
          <Tocco
            etichetta={muted ? t("Attiva l’audio", "Turn sound on") : t("Silenzia", "Mute")}
            onPress={() => {
              player.muted = !muted;
            }}
            style={[stili.comando, { backgroundColor: muted ? "rgba(0,0,0,0.55)" : p.accento }]}
          >
            <Icona nome={muted ? "muto" : "volume"} size={18} colore="#fff" />
          </Tocco>
        </View>
      ) : null}
    </>
  );
}

export function MediaAttivita({ chiave }: { chiave: ChiaveAttivita }) {
  const p = usePalette();
  const m = media()[chiave];
  // Il video non si e' caricato (il file non c'e' o la rete): resta la foto.
  const [fallito, setFallito] = useState(false);
  return (
    <View style={{ gap: spazio.due }}>
      <View style={[stili.cornice, { backgroundColor: p.incavo }]}>
        {m.video && !fallito ? (
          <VideoInEvidenza uri={m.video} poster={m.poster} onErrore={() => setFallito(true)} />
        ) : (
          <Image source={{ uri: m.poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        )}
      </View>
      {m.foto.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }}>
          {m.foto.map((f, i) => (
            <View key={i} style={[stili.foto, { backgroundColor: p.incavo }]}>
              <Image source={{ uri: f.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityLabel={f.didascalia} />
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const stili = StyleSheet.create({
  cornice: { width: "100%", aspectRatio: 16 / 9, borderRadius: 16, overflow: "hidden" },
  comandi: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", gap: 8 },
  comando: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  foto: { width: 132, height: 92, borderRadius: 12, overflow: "hidden" },
});
