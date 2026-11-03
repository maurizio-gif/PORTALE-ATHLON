import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { contrattiAbbonamento, type ContrattoElenco } from "@/api/abbonamento";
import { laMiaArea, type EsitoArea } from "@/api/lab";
import type { PersonaJunior } from "@/api/junior";
import { ETA_MINIMA_ABBONAMENTO, etaDa } from "@/lib/eta";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { CHIAVE_CONTRATTI } from "../AbbonamentiMiei";
import { haAbbonamentoPrincipale, haProva } from "../home/regolarita";
import { inMemoria, prendi } from "../memoria";
import { Avatar, Carta, Pulsante } from "../ui/kit";
import { F, usePalette } from "../ui/tema";

// «Abbonamento adulti» per un figlio da 13 a 17 anni (03/11/2026, richiesta di Maurizio): oltre ai corsi Junior (nuoto agonistico…), nella
// scheda del ragazzo c'e' l'invito a **attivare l'abbonamento adulti a suo nome**. Compare, sia che sia iscritto a un corso sia che no,
// quando ha dai 13 ai 17 anni, **non ha un abbonamento adulti in vigore** (lo dice la `categoria` del contratto, fornita dal server: un
// corso Junior non lo e') e non ha una prova (Guest Pass) in corso, che ha gia' il suo «Attiva abbonamento». Il pulsante apre la scelta
// dell'abbonamento gia' su di lui (`/abbonamento?membro=<id>`): firma il genitore, e chi puo' comprare lo decide il server.
// Non compare in vista cliente (e' di sola lettura). Si legge dalla memoria della Home (area e contratti) e si aggiorna in silenzio.

export function InvitoAbbonamentoAdulti({ persona, vista }: { persona: PersonaJunior; vista: boolean }) {
  const p = usePalette();
  const [area, setArea] = useState<EsitoArea | undefined>(() => inMemoria<EsitoArea>("area"));
  const [elenco, setElenco] = useState<ContrattoElenco[] | null>(
    () => inMemoria<{ ok: true; contratti: ContrattoElenco[] }>(CHIAVE_CONTRATTI)?.contratti ?? null,
  );
  useEffect(() => {
    let vivo = true;
    prendi("area", laMiaArea).then((r) => vivo && setArea(r));
    prendi(CHIAVE_CONTRATTI, contrattiAbbonamento).then((r) => vivo && r.ok && setElenco(r.contratti));
    return () => {
      vivo = false;
    };
  }, [persona.member_id]);

  const eta = etaDa(persona.data_nascita);
  if (vista || eta === null || eta < ETA_MINIMA_ABBONAMENTO || eta >= 18) return null;
  // Senza i dati della Home non si sa se ha gia' un abbonamento: meglio non mostrare niente che un invito sbagliato.
  const dati = area?.ok && area.area.trovato ? area.area : null;
  if (!dati) return null;
  if (haAbbonamentoPrincipale(dati, persona.member_id, elenco) || haProva(dati, persona.member_id)) return null;

  const nome = persona.nome?.trim() || t("tuo figlio", "your child");
  return (
    <Carta>
      <View style={{ gap: spazio.tre }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spazio.tre }}>
          <Avatar nome={persona.nome} cognome={persona.cognome} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 }}>
              {t("Abbonamento adulti", "Adult membership")}
            </Text>
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>
              {t(
                `${nome} ha ${eta} anni: oltre ai corsi può avere un abbonamento adulti (sala, corsi, nuoto libero). Firma tu, da genitore.`,
                `${nome} is ${eta}: besides the courses they can have an adult membership (gym floor, classes, free swim). You sign as their parent.`,
              )}
            </Text>
          </View>
        </View>
        <Pulsante
          testo={t(`Attiva l’abbonamento adulti per ${nome}`, `Activate the adult membership for ${nome}`)}
          icona="avanti"
          onPress={() => router.navigate({ pathname: "/abbonamento", params: { membro: String(persona.member_id) } })}
        />
      </View>
    </Carta>
  );
}
