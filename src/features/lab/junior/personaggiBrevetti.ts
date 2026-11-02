import { Asset } from "expo-asset";
import type { ImageSourcePropType } from "react-native";

// I personaggi dei brevetti (02/11/2026, richiesta di Maurizio): ogni brevetto della Scuola Nuoto ha il suo animale sui diplomi del club (il PDF «diplomi brevetti
// nuovi»): Stella Marina, Anatroccolo, Cavalluccio Marino, Delfino, Pinguino, Pinna Bianca, Squalo Bianco, Squalo Tigre. Le immagini stanno in
// `assets/images/brevetti/`, **ritagliate dal PDF** (Delfino, Pinna Bianca, Squalo Bianco e Squalo Tigre avevano gia' lo sfondo trasparente; gli altri quattro sono tolti
// dallo sfondo dei diplomi, quindi con i bordi meno puliti: **se il club ha gli originali con lo sfondo trasparente vanno messi al loro posto**, stesso nome del file).
// Il personaggio si riconosce dal nome del livello di PerfectGym, senza il numero («Anatroccolo 1» -> Anatroccolo). Un brevetto senza personaggio (un nome che qui
// non c'e') si disegna senza.

const PERSONAGGI: { chiave: string; immagine: ImageSourcePropType }[] = [
  { chiave: "stella marina", immagine: require("../../../../assets/images/brevetti/stella-marina.png") },
  { chiave: "anatroccolo", immagine: require("../../../../assets/images/brevetti/anatroccolo.png") },
  { chiave: "cavalluccio marino", immagine: require("../../../../assets/images/brevetti/cavalluccio-marino.png") },
  { chiave: "delfino", immagine: require("../../../../assets/images/brevetti/delfino.png") },
  { chiave: "pinguino", immagine: require("../../../../assets/images/brevetti/pinguino.png") },
  { chiave: "pinna bianca", immagine: require("../../../../assets/images/brevetti/pinna-bianca.png") },
  { chiave: "squalo bianco", immagine: require("../../../../assets/images/brevetti/squalo-bianco.png") },
  { chiave: "squalo tigre", immagine: require("../../../../assets/images/brevetti/squalo-tigre.png") },
];

export const LOGO_SCUOLA_NUOTO: ImageSourcePropType = require("../../../../assets/images/brevetti/athlon-scuola-nuoto.png");

/** L'immagine del personaggio di un brevetto («Anatroccolo», o «Anatroccolo 1»), o null. */
export function personaggioDi(specie: string): ImageSourcePropType | null {
  const chiave = specie.toLowerCase().replace(/\s+\d+$/, "").replace(/\s+/g, " ").trim();
  return PERSONAGGI.find((x) => x.chiave === chiave)?.immagine ?? null;
}

/** L'indirizzo con cui il canvas del browser carica un'immagine dell'app. */
export function indirizzoImmagine(img: ImageSourcePropType): string | null {
  // `require` di un'immagine e' un numero (l'id dell'asset: `Asset` lo porta a un indirizzo) o, sul web, gia' un oggetto con l'`uri` servito dall'app.
  if (typeof img === "number") return Asset.fromModule(img).uri;
  if (img && typeof img === "object" && !Array.isArray(img) && typeof (img as { uri?: unknown }).uri === "string") return (img as { uri: string }).uri;
  return null;
}
