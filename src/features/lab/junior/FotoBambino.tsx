import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fotoBambino, impostaFotoBambino, type PersonaJunior } from "@/api/junior";
import { fotocameraDisponibile, preparaFotoProfilo, scegliFotoProfilo, type OrigineFoto } from "@/lib/fotoProfilo";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Messaggio, Pulsante } from "../ui/kit";
import { F, usePalette, velo } from "../ui/tema";

// La foto del bambino per il libretto e per il diploma (02/11/2026, richiesta di Maurizio: «nel libretto spingi sempre l'utente ad inserire la foto, cosi' che nella
// copertina sia presente la foto del bambino»). Un solo posto per leggerla e per cambiarla, usato dalla pagina dei brevetti (`Brevetti`: il viaggio e il PDF) e dal diploma (`FoglioDiploma`): e' la foto
// del profilo del bambino su PerfectGym (`portale-lab-junior`, azioni `foto` e `foto_imposta`), e **chi non l'ha viene invitato a metterla ogni volta** che apre il libretto.
// L'invito si vede anche se la funzione non risponde ancora (la scelta della foto allora dice che non e' ancora attiva): solo in vista cliente non si offre.

// La foto appena scelta, per bambino: PerfectGym ha le sue misure fra qualche minuto, e nel frattempo la pagina del brevetto, il viaggio e il diploma (che leggono la foto
// ognuno per conto suo) devono mostrare la stessa, quella nuova, e non il link del server che e' ancora quello di prima.
const scelte = new Map<number, string>();

export function useFotoBambino(aperto: boolean, persona: PersonaJunior, vista: boolean) {
  const [foto, setFoto] = useState<string | null>(() => scelte.get(persona.member_id) ?? null);
  const [modificabile, setModificabile] = useState(!vista);
  const [letta, setLetta] = useState(false);
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  // La foto si legge quando il foglio si apre: il link dura un'ora, quindi a ogni apertura se ne prende uno nuovo.
  useEffect(() => {
    if (!aperto) return;
    let vivo = true;
    setLetta(false);
    setErrore(null);
    fotoBambino(persona.member_id).then((r) => {
      if (!vivo) return;
      if (r.ok) {
        setFoto((prima) => scelte.get(persona.member_id) ?? r.foto ?? prima);
        setModificabile(r.modificabile && !vista);
      } else setModificabile(!vista);
      setLetta(true);
    });
    return () => {
      vivo = false;
    };
  }, [aperto, persona.member_id, vista]);

  const scegli = useCallback(
    async (da: OrigineFoto) => {
      setErrore(null);
      const grezzo = await scegliFotoProfilo(da);
      if (!grezzo) return;
      setLavoro(true);
      const pronta = await preparaFotoProfilo(grezzo);
      if (!pronta.ok) {
        setLavoro(false);
        return setErrore(pronta.errore);
      }
      const r = await impostaFotoBambino(persona.member_id, pronta.foto.dati);
      setLavoro(false);
      if (!r.ok) return setErrore(r.errore);
      // La foto appena scelta si usa subito: PerfectGym ha le sue misure fra qualche minuto.
      scelte.set(persona.member_id, pronta.foto.anteprima);
      setFoto(pronta.foto.anteprima);
    },
    [persona.member_id],
  );

  return { foto, modificabile, letta, lavoro, errore, scegli };
}

export type StatoFoto = ReturnType<typeof useFotoBambino>;

/**
 * L'invito a mettere la foto (o, se c'e', la foto con «Cambia»). **Senza foto e' un riquadro che si nota** (l'arancio del club, la fotocamera): e' lo scopo, perche'
 * la foto va nella copertina del libretto e nel diploma. `dove` dice dove comparira'.
 */
export function InvitoFoto({ nome, stato, dove }: { nome: string; stato: StatoFoto; dove: string }) {
  const p = usePalette();
  const { foto, modificabile, lavoro, errore, scegli } = stato;
  if (!foto && !modificabile) return null;
  return (
    <View
      style={[
        stili.riquadro,
        foto ? { backgroundColor: p.incavo, borderColor: "transparent" } : { backgroundColor: velo(p, "accento", p.scuro ? 0.16 : 0.08), borderColor: p.accento },
      ]}
    >
      <View style={stili.testa}>
        {foto ? (
          <Image source={{ uri: foto }} style={stili.anteprima} contentFit="cover" accessibilityLabel={t(`La foto di ${nome}`, `${nome}’s photo`)} />
        ) : (
          <View style={[stili.bollino, { backgroundColor: p.accento }]}>
            <Icona nome="fotocamera" size={22} colore="#fff" />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{foto ? t(`La foto di ${nome}`, `${nome}’s photo`) : t(`Metti la foto di ${nome}`, `Add ${nome}’s photo`)}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {foto
              ? dove
              : t(
                  `${dove} Diventa anche la foto del profilo di ${nome} al club.`,
                  `${dove} It also becomes ${nome}’s profile photo at the club.`,
                )}
          </Text>
        </View>
      </View>
      {modificabile ? (
        <View style={stili.comandi}>
          <Pulsante
            testo={foto ? t("Cambia la foto", "Change the photo") : t("Scegli la foto", "Choose the photo")}
            icona="galleria"
            variante={foto ? "secondario" : "primario"}
            piccolo
            pieno={false}
            inCorso={lavoro}
            onPress={() => scegli("galleria")}
          />
          {fotocameraDisponibile() ? (
            <Pulsante testo={t("Scatta ora", "Take a photo")} icona="fotocamera" variante="secondario" piccolo pieno={false} disabilitato={lavoro} onPress={() => scegli("fotocamera")} />
          ) : null}
        </View>
      ) : null}
      {errore ? <Messaggio>{errore}</Messaggio> : null}
    </View>
  );
}

const stili = StyleSheet.create({
  riquadro: { borderRadius: 18, borderWidth: 1.5, padding: spazio.tre, gap: spazio.tre },
  testa: { flexDirection: "row", alignItems: "center", gap: spazio.tre },
  bollino: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  anteprima: { width: 48, height: 48, borderRadius: 24 },
  titolo: { fontFamily: F.extra, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  comandi: { flexDirection: "row", flexWrap: "wrap", gap: spazio.due },
});
