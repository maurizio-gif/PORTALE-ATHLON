import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { PersonaJunior } from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Bollino, Carta } from "../ui/kit";
import { Tocco } from "../ui/Tocco";
import { F, usePalette } from "../ui/tema";
import { Brevetti } from "./Brevetti";
import { leggiBrevetto, nomeSpecie } from "./datiBrevetti";

// I brevetti di un bambino non iscritto, in fondo alla pagina (04/11/2026, richiesta di Maurizio): «la sezione brevetti la devi mettere comunque
// collapsed ed espandibile e sempre in basso sotto le attività sportive alle quali si può iscrivere». Una carta chiusa, fatta come quelle delle attività
// (stesso gesto: si tocca e si apre), con il brevetto di adesso in una riga; aperta, mostra la voce «Brevetti» di sempre (`Brevetti`: carta, viaggio, PDF,
// diploma, foto). **Si legge solo quando la si apre**: chiusa non chiama niente (il livello è già nella persona). Per chi è iscritto non cambia: lì
// «Brevetti» è una voce del menu (`MenuIscritto`).

export function BrevettiChiusi({ persona, vista }: { persona: PersonaJunior; vista: boolean }) {
  const p = usePalette();
  const [aperta, setAperta] = useState(false);
  const attuale = persona.livello ? leggiBrevetto(persona.livello) : null;
  const sigla = attuale ? attuale.codice || attuale.livello : null;
  const riga = attuale
    ? [nomeSpecie(attuale.specie), sigla ? t(`Livello ${sigla}`, `Level ${sigla}`) : null].filter(Boolean).join(" · ")
    : null;

  return (
    <View style={{ gap: spazio.tre }}>
      <Carta>
        <Tocco
          vibra="scelta"
          stato={{ expanded: aperta }}
          etichetta={t("Brevetti", "Badges")}
          onPress={() => setAperta((v) => !v)}
          style={stili.testa}
        >
          <Bollino icona="trofeo" tono="accento" size={44} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={[stili.nome, { color: p.testo }]}>{t("Brevetti", "Badges")}</Text>
            {riga ? (
              <Text style={[stili.riga, { color: p.testoSecondario }]} numberOfLines={2}>
                {t(`Brevetto di adesso: ${riga}`, `Current badge: ${riga}`)}
              </Text>
            ) : null}
          </View>
          <Icona nome={aperta ? "su" : "giu"} size={16} colore={p.testoSecondario} />
        </Tocco>
      </Carta>
      {aperta ? <Brevetti key={persona.member_id} persona={persona} vista={vista} /> : null}
    </View>
  );
}

const stili = StyleSheet.create({
  testa: { flexDirection: "row", alignItems: "center", gap: spazio.tre, minHeight: 72, padding: spazio.tre },
  nome: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  riga: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
});
