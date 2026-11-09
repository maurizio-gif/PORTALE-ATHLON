import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import Svg, { ClipPath, Circle, Defs, Ellipse, Image as ImmagineSvg, LinearGradient, Path, Rect, Stop, Text as TestoSvg } from "react-native-svg";

import { colore, type Scena } from "./scena";

// Una scena (`scena.ts`) disegnata con `react-native-svg` (09/11/2026): e' l'anteprima nella schermata **e** la fonte del PNG che si condivide (`png()`, con `toDataURL`).
// Serve al diplomino del brevetto e alla locandina di un evento. Niente passa da un server.
//
// **Il PNG si prende quando le immagini si sono caricate**: `react-native-svg` disegna un'immagine solo dopo averla letta, e un `toDataURL` troppo presto la lascia
// vuota. Per questo `png()` aspetta gli `onLoad` di tutte le immagini della scena, con un tetto di tempo: se una non arriva (la foto di un evento, in rete lenta) l'immagine
// esce lo stesso, senza quella. **I colori con trasparenza (`rgba(...)`) si separano** in colore e opacita' (`colore()`).

export type ScenaSvgRef = {
  /** Il PNG della scena (alla sua larghezza e altezza) in base64 senza prefisso, o null se non si riesce a ricavarlo. */
  png: () => Promise<string | null>;
};

export type Sorgenti = Record<string, ImageSourcePropType | null>;

const attesa = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

/** Cosa si aspetta di un'immagine: la sorgente, perche' una foto nuova (altro indirizzo) si deve aspettare di nuovo. */
const chiaveSorgente = (chi: string, src: ImageSourcePropType): string => {
  const uri = typeof src === "object" && src && !Array.isArray(src) ? (src as { uri?: string }).uri : undefined;
  return uri ? `${chi}:${uri}` : chi;
};

export const ScenaSvg = forwardRef<ScenaSvgRef, { scena: Scena; sorgenti: Sorgenti; id: string; style?: StyleProp<ViewStyle> }>(function ScenaSvg({ scena, sorgenti, id, style }, ref) {
  const svg = useRef<Svg>(null);

  // Le immagini attese (quelle della scena che hanno una sorgente) e quelle gia' caricate: quando sono tutte, `png()` puo' partire.
  const chiavi = useMemo(
    () =>
      scena.elementi.flatMap((x) => {
        if (x.k !== "immagine") return [];
        const src = sorgenti[x.chi];
        return src ? [chiaveSorgente(x.chi, src)] : [];
      }),
    [scena, sorgenti],
  );
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

  return (
    <Svg ref={svg} width="100%" height="100%" viewBox={`0 0 ${scena.larghezza} ${scena.altezza}`} preserveAspectRatio="xMidYMid meet" style={style}>
      <Defs>
        {scena.elementi.map((x, i) => {
          if (x.k === "sfumatura") {
            return (
              <LinearGradient key={`g${i}`} id={`${id}-g${i}`} x1="0" y1="0" x2="0" y2="1">
                {x.stops.map(([o, c, op], n) => (
                  <Stop key={n} offset={o} stopColor={colore(c).c} stopOpacity={op * colore(c).o} />
                ))}
              </LinearGradient>
            );
          }
          if (x.k === "immagine" && x.ritaglio) {
            return (
              <ClipPath key={`c${i}`} id={`${id}-c${i}`}>
                <Circle cx={x.ritaglio.cx} cy={x.ritaglio.cy} r={x.ritaglio.r} />
              </ClipPath>
            );
          }
          return null;
        })}
      </Defs>
      {scena.elementi.map((x, i) => {
        switch (x.k) {
          case "sfumatura":
            return <Rect key={i} x={x.x} y={x.y} width={x.w} height={x.h} fill={`url(#${id}-g${i})`} />;
          case "path": {
            const f = x.fill ? colore(x.fill) : null;
            const s = x.stroke ? colore(x.stroke) : null;
            return <Path key={i} d={x.d} fill={f?.c ?? "none"} fillOpacity={f?.o} stroke={s?.c} strokeOpacity={s?.o} strokeWidth={x.sw} strokeLinecap={x.cap} strokeLinejoin={x.join} />;
          }
          case "cerchio": {
            const f = x.fill ? colore(x.fill) : null;
            const s = x.stroke ? colore(x.stroke) : null;
            return <Circle key={i} cx={x.cx} cy={x.cy} r={x.r} fill={f?.c ?? "none"} fillOpacity={f?.o} stroke={s?.c} strokeOpacity={s?.o} strokeWidth={x.sw} />;
          }
          case "ellisse": {
            const f = colore(x.fill);
            return <Ellipse key={i} cx={x.cx} cy={x.cy} rx={x.rx} ry={x.ry} fill={f.c} fillOpacity={f.o} />;
          }
          case "rett": {
            const f = x.fill ? colore(x.fill) : null;
            const s = x.stroke ? colore(x.stroke) : null;
            return <Rect key={i} x={x.x} y={x.y} width={x.w} height={x.h} rx={x.rx} fill={f?.c ?? "none"} fillOpacity={f?.o} stroke={s?.c} strokeOpacity={s?.o} strokeWidth={x.sw} />;
          }
          case "testo": {
            const f = colore(x.fill);
            return (
              <TestoSvg key={i} x={x.x} y={x.y} fill={f.c} fillOpacity={f.o} fontFamily={x.famiglia} fontSize={x.px} textAnchor={x.ancora} letterSpacing={x.spaziatura}>
                {x.testo}
              </TestoSvg>
            );
          }
          case "immagine": {
            const sorgente = sorgenti[x.chi];
            if (!sorgente) return null;
            const chiave = chiaveSorgente(x.chi, sorgente);
            return (
              <ImmagineSvg
                key={`${x.chi}:${i}`}
                x={x.x}
                y={x.y}
                width={x.w}
                height={x.h}
                href={sorgente}
                preserveAspectRatio={x.allinea}
                clipPath={x.ritaglio ? `url(#${id}-c${i})` : undefined}
                onLoad={() => segna(chiave)}
              />
            );
          }
        }
      })}
    </Svg>
  );
});
