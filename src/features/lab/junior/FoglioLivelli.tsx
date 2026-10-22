import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  livelliJunior,
  type EsitoLivelli,
  type PersonaJunior,
} from "@/api/junior";
import { locale, t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Foglio } from "../ui/Foglio";
import { Messaggio } from "../ui/kit";
import { F, usePalette } from "../ui/tema";

// La storia dei livelli della Scuola Nuoto Bambini (22/10/2026, richiesta di Maurizio): una timeline dal piu' recente. PerfectGym non
// da' le date dei passaggi, quindi le scrive il nostro database da quando ha cominciato a guardare: sono date in cui abbiamo
// visto il livello, e la prima riga dice «livello al primo rilevamento». Lo dice anche una nota in fondo.

function giorno(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

export function FoglioLivelli({
  persona,
  aperto,
  onChiudi,
}: {
  persona: PersonaJunior | undefined;
  aperto: boolean;
  onChiudi: () => void;
}) {
  const p = usePalette();
  const [esito, setEsito] = useState<EsitoLivelli | undefined>();
  const id = persona?.member_id;

  useEffect(() => {
    if (!aperto || id == null) return;
    let vivo = true;
    setEsito(undefined);
    livelliJunior(id).then((e) => vivo && setEsito(e));
    return () => {
      vivo = false;
    };
  }, [aperto, id]);

  const nome = persona?.nome ?? "";
  return (
    <Foglio
      aperto={aperto}
      titolo={t("La storia dei livelli", "Level history")}
      sottotitolo={
        nome
          ? t(`Scuola Nuoto Bambini · ${nome}`, `Swim School for Kids · ${nome}`)
          : undefined
      }
      onChiudi={onChiudi}
    >
      {!aperto ? null : !esito ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t("Un momento…", "One moment…")}
        </Text>
      ) : !esito.ok ? (
        <Messaggio>{esito.errore}</Messaggio>
      ) : esito.passaggi.length === 0 ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t("Non c’è ancora nessun livello registrato.", "There’s no level recorded yet.")}
        </Text>
      ) : (
        <View style={{ gap: 0 }}>
          {esito.passaggi.map((x, i) => (
            <View key={`${x.rilevato_il}-${i}`} style={stili.riga}>
              <View style={stili.binario}>
                <View
                  style={[
                    stili.punto,
                    {
                      backgroundColor: i === 0 ? p.accento : p.incavo,
                      borderColor: p.accento,
                    },
                  ]}
                />
                {i < esito.passaggi.length - 1 ? (
                  <View style={[stili.linea, { backgroundColor: p.incavo }]} />
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 2, paddingBottom: spazio.tre }}>
                <Text style={[stili.livello, { color: p.testo }]}>
                  {x.livello}
                </Text>
                <Text style={[stili.dettaglio, { color: p.testoSecondario }]}>
                  {x.primo_rilevamento
                    ? t(`Livello al primo rilevamento · ${giorno(x.rilevato_il)}`, `Level at first check · ${giorno(x.rilevato_il)}`)
                    : x.precedente
                      ? t(`Da ${x.precedente} · ${giorno(x.rilevato_il)}`, `From ${x.precedente} · ${giorno(x.rilevato_il)}`)
                      : giorno(x.rilevato_il)}
                </Text>
              </View>
            </View>
          ))}
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              "Le date sono quelle in cui abbiamo visto cambiare il livello, a partire dal 22 ottobre 2026: il passaggio può essere avvenuto qualche giorno prima. Per i passaggi precedenti non abbiamo una data.",
              "Dates are when we saw the level change, starting on October 22, 2026: the move may have happened a few days earlier. We don’t have dates for earlier changes.",
            )}
          </Text>
        </View>
      )}
    </Foglio>
  );
}

const stili = StyleSheet.create({
  riga: { flexDirection: "row", gap: spazio.tre },
  binario: { width: 16, alignItems: "center" },
  punto: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginTop: 3 },
  linea: { flex: 1, width: 2, marginTop: 2 },
  livello: { fontFamily: F.semi, fontSize: 16 },
  dettaglio: { fontFamily: F.normale, fontSize: 13.5, lineHeight: 19 },
  nota: { fontFamily: F.normale, fontSize: 13, lineHeight: 19, marginTop: spazio.due },
});
