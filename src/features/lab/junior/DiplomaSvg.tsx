import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { Image as ImmagineNativa, type StyleProp, type ViewStyle } from "react-native";
import Svg, { ClipPath, Circle, Defs, Ellipse, Image as ImmagineSvg, LinearGradient, Path, Rect, Stop, Text as TestoSvg } from "react-native-svg";

import type { DatiDiploma } from "./immagineBrevetto";
import { LOGO_SCUOLA_NUOTO, personaggioDi } from "./personaggiBrevetti";
import { scenaDiploma, type FormatoDiploma } from "./scenaDiploma";

// Il diplomino del brevetto disegnato con `react-native-svg` (09/11/2026): e' l'anteprima nel foglio «Condividi il brevetto» **e** la fonte del PNG che si condivide
// sull'app nativa (`png()`, con `toDataURL`). L'impaginazione e' quella di `scenaDiploma.ts`; qui le forme si traducono in elementi SVG. Niente passa da un server.
//
// **Il PNG si prende quando le immagini si sono caricate**: `react-native-svg` disegna un'immagine solo dopo averla letta, e un `toDataURL` troppo presto la lascia
// vuota. Per questo `png()` aspetta gli `onLoad` di tutte (logo, personaggio, foto), con un tetto di tempo: se la foto non arriva il diploma esce lo stesso, con l'iniziale.

export type DiplomaSvgRef = {
  /** Il PNG del diploma (1080 punti di larghezza) in base64 senza prefisso, o null se non si riesce a ricavarlo. */
  png: () => Promise<string | null>;
};

const attesa = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

export const DiplomaSvg = forwardRef<DiplomaSvgRef, { dati: DatiDiploma; formato: FormatoDiploma; style?: StyleProp<ViewStyle> }>(function DiplomaSvg({ dati, formato, style }, ref) {
  const svg = useRef<Svg>(null);
  const personaggio = personaggioDi(dati.chiave);
  const scena = useMemo(() => {
    const aspetto = (src: Parameters<typeof ImmagineNativa.resolveAssetSource>[0]) => {
      const r = ImmagineNativa.resolveAssetSource(src);
      return r && r.width && r.height ? r.width / r.height : null;
    };
    return scenaDiploma(dati, formato, { logo: aspetto(LOGO_SCUOLA_NUOTO) ?? 3, personaggio: personaggio ? aspetto(personaggio) ?? 1 : null });
    // Il personaggio e il logo dipendono dal brevetto: `dati.chiave` e' gia' fra i dati.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dati, formato]);

  // Le immagini attese (logo, personaggio, foto: la foto e' quella di adesso) e quelle gia' caricate: quando sono tutte, `png()` puo' partire.
  const chiavi = useMemo(() => scena.elementi.flatMap((x) => (x.k === "immagine" ? [x.chi === "foto" ? `foto:${dati.foto}` : x.chi] : [])), [scena, dati.foto]);
  const caricate = useRef(new Set<string>());
  const pronte = useRef<(() => void) | null>(null);
  const mancano = useCallback(() => chiavi.filter((k) => !caricate.current.has(k)).length, [chiavi]);
  const segna = useCallback(
    (chiave: string) => {
      caricate.current.add(chiave);
      if (!mancano()) pronte.current?.();
    },
    [mancano],
  );

  useImperativeHandle(
    ref,
    () => ({
      png: async () => {
        if (mancano()) await Promise.race([new Promise<void>((ok) => (pronte.current = ok)), attesa(8000)]);
        // Un respiro: `onLoad` dice che l'immagine e' arrivata, il disegno la mette nel prossimo fotogramma.
        await attesa(250);
        const s = svg.current;
        if (!s) return null;
        return new Promise<string | null>((ok) => {
          const timer = setTimeout(() => ok(null), 10_000);
          try {
            s.toDataURL(
              (b64: string) => {
                clearTimeout(timer);
                ok(b64 ? b64.replace(/\s/g, "") : null);
              },
              { width: scena.larghezza, height: scena.altezza },
            );
          } catch {
            clearTimeout(timer);
            ok(null);
          }
        });
      },
    }),
    [mancano, scena.larghezza, scena.altezza],
  );

  const id = `diploma-${formato}`;
  return (
    <Svg ref={svg} width="100%" height="100%" viewBox={`0 0 ${scena.larghezza} ${scena.altezza}`} preserveAspectRatio="xMidYMid meet" style={style}>
      <Defs>
        <LinearGradient id={`${id}-fondo`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EAF6FF" />
          <Stop offset="0.45" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#FFFFFF" />
        </LinearGradient>
        {scena.elementi.map((x, i) =>
          x.k === "immagine" && x.ritaglio ? (
            <ClipPath key={`c${i}`} id={`${id}-ritaglio`}>
              <Circle cx={x.ritaglio.cx} cy={x.ritaglio.cy} r={x.ritaglio.r} />
            </ClipPath>
          ) : null,
        )}
      </Defs>
      {scena.elementi.map((x, i) => {
        switch (x.k) {
          case "fondo":
            return <Rect key={i} x={0} y={0} width={x.w} height={x.h} fill={`url(#${id}-fondo)`} />;
          case "path":
            return <Path key={i} d={x.d} fill={x.fill ?? "none"} stroke={x.stroke} strokeWidth={x.sw} strokeLinecap={x.cap} strokeLinejoin={x.join} />;
          case "cerchio":
            return <Circle key={i} cx={x.cx} cy={x.cy} r={x.r} fill={x.fill ?? "none"} stroke={x.stroke} strokeWidth={x.sw} />;
          case "tondo":
            return <Circle key={i} cx={x.cx} cy={x.cy} r={x.r} fill={x.fill} />;
          case "ellisse":
            return <Ellipse key={i} cx={x.cx} cy={x.cy} rx={x.rx} ry={x.ry} fill={x.fill} />;
          case "rett":
            return <Rect key={i} x={x.x} y={x.y} width={x.w} height={x.h} rx={x.rx} fill={x.fill ?? "none"} stroke={x.stroke} strokeWidth={x.sw} />;
          case "testo":
            return (
              <TestoSvg key={i} x={x.x} y={x.y} fill={x.fill} fontFamily={x.famiglia} fontSize={x.px} textAnchor={x.ancora}>
                {x.testo}
              </TestoSvg>
            );
          case "immagine": {
            const sorgente = x.chi === "logo" ? LOGO_SCUOLA_NUOTO : x.chi === "personaggio" ? personaggio : dati.foto ? { uri: dati.foto } : null;
            if (!sorgente) return null;
            return (
              <ImmagineSvg
                key={`${x.chi}:${i}`}
                x={x.x}
                y={x.y}
                width={x.w}
                height={x.h}
                href={sorgente}
                preserveAspectRatio={x.allinea}
                clipPath={x.ritaglio ? `url(#${id}-ritaglio)` : undefined}
                onLoad={() => segna(x.chi === "foto" ? `foto:${dati.foto}` : x.chi)}
              />
            );
          }
        }
      })}
    </Svg>
  );
});
