import { forwardRef, useMemo } from "react";
import { Image as ImmagineNativa, type StyleProp, type ViewStyle } from "react-native";

import { ScenaSvg, type ScenaSvgRef } from "../svg/ScenaSvg";
import type { EventoLocandina } from "./locandina";
import { scenaLocandina } from "./scenaLocandina";

// La locandina di un evento disegnata con `react-native-svg` (09/11/2026): l'anteprima nel riquadro «Storia Instagram» e la fonte del PNG che si condivide sull'app
// nativa (`png()`). L'impaginazione e' quella di `scenaLocandina.ts`. **Il logo e' una risorsa dell'app** (la stessa del sito, `assets/images/club/`), cosi' non dipende dalla
// rete; la foto dell'evento arriva dal suo indirizzo: se non si carica in tempo la locandina esce sul fondo scuro, senza foto.

export type LocandinaSvgRef = ScenaSvgRef;

const LOGO = require("../../../../assets/images/club/logo-oriz-full.png");

export const LocandinaSvg = forwardRef<LocandinaSvgRef, { e: EventoLocandina; giorno: string; frase: string; style?: StyleProp<ViewStyle> }>(function LocandinaSvg({ e, giorno, frase, style }, ref) {
  const scena = useMemo(() => {
    const r = ImmagineNativa.resolveAssetSource(LOGO);
    return scenaLocandina({ titolo: e.titolo, etichetta: e.etichetta, giorno, ora: e.ora, frase }, r && r.width && r.height ? r.width / r.height : 5.2);
  }, [e.titolo, e.etichetta, e.ora, giorno, frase]);
  const sorgenti = useMemo(() => ({ logo: LOGO, foto: e.immagine ? { uri: e.immagine } : null }), [e.immagine]);
  return <ScenaSvg ref={ref} scena={scena} sorgenti={sorgenti} id="locandina" style={style} />;
});
