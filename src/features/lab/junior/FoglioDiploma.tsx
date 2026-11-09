import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";

import type { PersonaJunior } from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { condividiImmagine } from "../fit/condividiMese";
import type { FormatoImmagine } from "../fit/immagineSettimana";
import { Foglio } from "../ui/Foglio";
import { Messaggio, Pulsante } from "../ui/kit";
import { F, usePalette, velo } from "../ui/tema";
import { Tocco } from "../ui/Tocco";
import { condividiPngNativo } from "../svg/condividiPngNativo";
import { DiplomaSvg, type DiplomaSvgRef } from "./DiplomaSvg";
import { InvitoFoto, useFotoBambino } from "./FotoBambino";
import { diplomaDisponibile, immagineDiploma, testoDiploma, type DatiDiploma } from "./immagineBrevetto";

// «Condividi il brevetto» (02/11/2026, richiesta di Maurizio): il genitore vede il diplomino del brevetto del figlio, sceglie il formato (post o storia), mette la
// foto del bambino se manca (diventa la foto del suo profilo al club) e lo condivide sui social o lo scarica. **L'immagine nasce sul dispositivo** e non passa da
// nessun server; l'unica cosa che parte e' la foto, e solo se il genitore la sceglie. **Sull'app nativa** (09/11/2026, segnalazione di Maurizio: «qui non si genera il
// diploma da app») il disegno e' un SVG (`DiplomaSvg`) e il PNG si ricava da li' (`toDataURL`): anteprima e formati come sul web, e «Condividi il brevetto» apre il foglio
// di condivisione del telefono con l'immagine. Se l'immagine non si riesce a preparare si condivide il testo, com'era. In vista cliente non si cambia la foto.

const FORMATI: { id: FormatoImmagine; testo: () => string; rapporto: number }[] = [
  { id: "feed", testo: () => t("Post", "Post"), rapporto: 1080 / 1350 },
  { id: "storia", testo: () => t("Storia", "Story"), rapporto: 1080 / 1920 },
];

export function FoglioDiploma({
  aperto,
  onChiudi,
  persona,
  dati,
  vista,
}: {
  aperto: boolean;
  onChiudi: () => void;
  persona: PersonaJunior;
  /** I dati del diploma senza la foto: la mette il foglio, che sa dov'e'. */
  dati: Omit<DatiDiploma, "foto">;
  vista: boolean;
}) {
  const p = usePalette();
  const nome = persona.nome ?? t("il bambino", "your child");
  const [formato, setFormato] = useState<FormatoImmagine>("feed");
  const statoFoto = useFotoBambino(aperto, persona, vista);
  const { foto, letta: fotoLetta } = statoFoto;
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [lavoro, setLavoro] = useState<"" | "condividi" | "scarica">("");
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const web = diplomaDisponibile();
  // Sull'app nativa il diploma e' un disegno SVG: l'anteprima e' lui, e da lui si ricava il PNG.
  const nativo = Platform.OS !== "web";
  const svg = useRef<DiplomaSvgRef>(null);
  const chiave = useRef(0);

  useEffect(() => {
    if (!aperto) return;
    setEsito(null);
    setErrore(null);
  }, [aperto]);

  // L'anteprima si ridisegna quando cambia il formato o la foto (e quando i dati sono altri).
  const dati_json = JSON.stringify(dati);
  useEffect(() => {
    if (!aperto || !web || !fotoLetta) return;
    const giro = ++chiave.current;
    let url: string | null = null;
    immagineDiploma({ ...dati, foto }, formato).then((blob) => {
      if (giro !== chiave.current || !blob) return;
      url = URL.createObjectURL(blob);
      setAnteprima(url);
    });
    return () => {
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 5000);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto, web, fotoLetta, foto, formato, dati_json]);

  const diploma: DatiDiploma = { ...dati, foto };
  const fai = async (soloScarica: boolean) => {
    setLavoro(soloScarica ? "scarica" : "condividi");
    setEsito(null);
    setErrore(null);
    const nomeFile = `athlon-brevetto-${(dati.codice || dati.brevetto).toLowerCase().replace(/[^a-z0-9]+/g, "-")}${formato === "storia" ? "-storia" : ""}.png`;
    if (nativo) {
      const png = await svg.current?.png();
      const r = await condividiPngNativo(png ?? null, nomeFile);
      if (r === "condiviso") setEsito(t("Fatto!", "Done!"));
      else {
        // L'immagine non e' venuta: si condivide almeno il testo, e la schermata lo dice.
        setErrore(t("Non siamo riusciti a preparare l’immagine: abbiamo condiviso il testo.", "We couldn’t prepare the image, so we shared the text instead."));
        await Share.share({ message: testoDiploma(diploma) }).catch(() => undefined);
      }
      setLavoro("");
      return;
    }
    const r = await condividiImmagine(() => immagineDiploma(diploma, formato), nomeFile, testoDiploma(diploma), soloScarica);
    setLavoro("");
    if (r === "errore") setErrore(t("Non siamo riusciti a preparare l’immagine. Riprova.", "We couldn’t prepare the image. Please try again."));
    else if (r === "scaricato") setEsito(t("Immagine scaricata: la trovi fra i file del dispositivo.", "Image downloaded: you’ll find it in your device’s files."));
    else if (r === "condiviso") setEsito(t("Fatto!", "Done!"));
  };

  const rapporto = FORMATI.find((x) => x.id === formato)!.rapporto;
  return (
    <Foglio
      aperto={aperto}
      titolo={t("Condividi il brevetto", "Share the badge")}
      sottotitolo={t(`Il brevetto di ${nome}, da mettere in un post o in una storia.`, `${nome}’s badge, ready for a post or a story.`)}
      onChiudi={onChiudi}
    >
      <View style={{ gap: spazio.tre }}>
        {web || nativo ? (
          <>
            <View style={stili.formati}>
              {FORMATI.map((f) => {
                const on = f.id === formato;
                return (
                  <Tocco
                    key={f.id}
                    vibra="scelta"
                    stato={{ selected: on }}
                    etichetta={f.testo()}
                    onPress={() => setFormato(f.id)}
                    style={[
                      stili.formato,
                      { backgroundColor: on ? velo(p, "accento", p.scuro ? 0.16 : 0.1) : p.carta, borderColor: on ? p.accento : p.linea },
                    ]}
                  >
                    <Text style={{ color: p.testo, fontFamily: on ? F.extra : F.bold, fontSize: 14 }}>{f.testo()}</Text>
                  </Tocco>
                );
              })}
            </View>
            <View style={[stili.anteprima, { aspectRatio: rapporto, backgroundColor: p.incavo, maxHeight: 460 }]}>
              {nativo && fotoLetta ? (
                <DiplomaSvg ref={svg} dati={diploma} formato={formato} />
              ) : anteprima ? (
                <Image source={{ uri: anteprima }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={t("Anteprima del diploma", "Diploma preview")} />
              ) : (
                <Text style={[stili.nota, { color: p.testoSecondario, textAlign: "center", margin: "auto" }]}>{t("Un momento…", "One moment…")}</Text>
              )}
            </View>
          </>
        ) : null}

        <InvitoFoto nome={nome} stato={statoFoto} dove={t("Compare nel diploma.", "It appears in the diploma.")} />

        {errore ? <Messaggio>{errore}</Messaggio> : null}
        {esito ? <Messaggio tono="ok">{esito}</Messaggio> : null}

        <Pulsante
          testo={Platform.OS === "web" ? t("Condividi", "Share") : t("Condividi il brevetto", "Share the badge")}
          icona="condividi"
          inCorso={lavoro === "condividi"}
          disabilitato={!!lavoro && lavoro !== "condividi"}
          onPress={() => fai(false)}
        />
        {web ? (
          <Pulsante testo={t("Scarica l’immagine", "Download the image")} icona="scarica" variante="secondario" inCorso={lavoro === "scarica"} disabilitato={!!lavoro && lavoro !== "scarica"} onPress={() => fai(true)} />
        ) : null}
        <Text style={[stili.nota, { color: p.testoTerzo }]}>
          {t(
            "L’immagine nasce sul tuo dispositivo e la pubblichi tu: se non vuoi che compaia la foto, lasciala senza.",
            "The image is made on your device and you decide whether to post it: if you don’t want the photo to appear, leave it out.",
          )}
        </Text>
      </View>
    </Foglio>
  );
}

const stili = StyleSheet.create({
  formati: { flexDirection: "row", gap: spazio.due },
  formato: { minHeight: 40, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  anteprima: { width: "100%", alignSelf: "center", borderRadius: 16, overflow: "hidden" },
  titolo: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  fotoComandi: { flexDirection: "row", flexWrap: "wrap", gap: spazio.due },
});
