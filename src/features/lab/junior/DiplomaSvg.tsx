import { forwardRef, useMemo } from "react";
import { Image as ImmagineNativa, type StyleProp, type ViewStyle } from "react-native";

import { ScenaSvg, type ScenaSvgRef } from "../svg/ScenaSvg";
import type { DatiDiploma } from "./immagineBrevetto";
import { LOGO_SCUOLA_NUOTO, personaggioDi } from "./personaggiBrevetti";
import { scenaDiploma, type FormatoDiploma } from "./scenaDiploma";

// Il diplomino del brevetto disegnato con `react-native-svg` (09/11/2026): e' l'anteprima nel foglio «Condividi il brevetto» e la fonte del PNG che si condivide sull'app
// nativa (`png()`). L'impaginazione e' quella di `scenaDiploma.ts`, il disegno e il PNG quelli di `svg/ScenaSvg.tsx`. Niente passa da un server.

export type DiplomaSvgRef = ScenaSvgRef;

const aspetto = (src: Parameters<typeof ImmagineNativa.resolveAssetSource>[0]): number | null => {
  const r = ImmagineNativa.resolveAssetSource(src);
  return r && r.width && r.height ? r.width / r.height : null;
};

export const DiplomaSvg = forwardRef<DiplomaSvgRef, { dati: DatiDiploma; formato: FormatoDiploma; style?: StyleProp<ViewStyle> }>(function DiplomaSvg({ dati, formato, style }, ref) {
  const personaggio = personaggioDi(dati.chiave);
  const scena = useMemo(
    () => scenaDiploma(dati, formato, { logo: aspetto(LOGO_SCUOLA_NUOTO) ?? 3, personaggio: personaggio ? aspetto(personaggio) ?? 1 : null }),
    // Il personaggio dipende dal brevetto: `dati.chiave` e' gia' fra i dati.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dati, formato],
  );
  const sorgenti = useMemo(() => ({ logo: LOGO_SCUOLA_NUOTO, personaggio, foto: dati.foto ? { uri: dati.foto } : null }), [personaggio, dati.foto]);
  return <ScenaSvg ref={ref} scena={scena} sorgenti={sorgenti} id={`diploma-${formato}`} style={style} />;
});
