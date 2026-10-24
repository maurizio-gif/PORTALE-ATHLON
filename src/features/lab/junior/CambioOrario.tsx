import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  chiediCambioOrario,
  type GruppoJunior,
  type PersonaJunior,
} from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Foglio } from "../ui/Foglio";
import { Bollino, Carta, Etichetta, Messaggio, Pulsante, Riga, Sezione } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import { annoDi, annateGruppo, calendarioGruppo, statoPosti, titoloGruppo } from "./comune";

// Il cambio orario (22/10/2026, richiesta di Maurizio): un bambino iscritto a un gruppo non si iscrive ad altri corsi, ma puo'
// chiedere un altro turno **dello stesso tipo** (chi e' in un monosettimanale vede i monosettimanali, chi e' in un bisettimanale i
// bisettimanali: la categoria di PerfectGym) del suo anno di nascita. Si vedono solo i turni con un posto libero.
//
// **Da qui non si cambia niente da soli**: la richiesta arriva alla segreteria (Dashboard del CRM + email al desk), che la approva
// (con la data da cui vale, dalla prima lezione utile) o la rifiuta (con i motivi) e scrive l'esito al genitore. Nello stesso tipo non c'e' una nuova quota (vedi «Come funziona»). In vista cliente si guarda e basta.

/** I turni che un bambino iscritto puo' chiedere: stessa categoria del suo gruppo, il suo anno, un posto libero, non quello che ha. */
export function turniPerCambio(persona: PersonaJunior, gruppi: GruppoJunior[]): GruppoJunior[] {
  const mie = new Set(persona.gruppi.map((g) => String(g.group_id)));
  const categorie = new Set(
    gruppi.filter((g) => mie.has(g.id) && g.categoria).map((g) => g.categoria as string),
  );
  const anno = annoDi(persona);
  if (!categorie.size || anno == null) return [];
  return gruppi.filter(
    (g) => !mie.has(g.id) && !!g.categoria && categorie.has(g.categoria) && g.anni.includes(anno) && (g.liberi ?? 0) > 0,
  );
}

export function CambioOrario({
  persona,
  gruppi,
  vista,
}: {
  persona: PersonaJunior;
  gruppi: GruppoJunior[];
  vista: boolean;
}) {
  const p = usePalette();
  const turni = useMemo(() => turniPerCambio(persona, gruppi), [persona, gruppi]);
  const [scelto, setScelto] = useState<GruppoJunior | null>(null);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [chiesti, setChiesti] = useState<string[]>([]);
  const nome = persona.nome ?? t("tuo figlio", "your child");

  async function manda() {
    if (!scelto) return;
    setInvio(true);
    setErrore(null);
    const r = await chiediCambioOrario({ memberId: persona.member_id, groupId: scelto.id });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.errore);
      return;
    }
    setChiesti((x) => [...x, scelto.id]);
    setScelto(null);
  }

  return (
    <Sezione titolo={t("Cambio orario", "Change schedule")} conteggio={turni.length}>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          `Se ${nome} vuole cambiare orario puoi chiedere un altro turno dello stesso tipo, con un posto libero. La richiesta non è automatica: la segreteria la controlla e poi la approva o la rifiuta, e ti scrive l’esito per email. Nello stesso tipo di corso non c’è una nuova quota.`,
          `If ${nome} wants a different time you can ask for another slot of the same kind, with a free spot. The request isn’t automatic: the front desk reviews it, then approves or declines it and emails you the outcome. Within the same kind of course there’s no new fee.`,
        )}
      </Text>
      {chiesti.length ? (
        <Messaggio tono="ok" titolo={t("Richiesta inviata", "Request sent")}>
          {t(
            "La segreteria la controlla e poi la approva o la rifiuta: ti scriviamo l’esito per email. Fino ad allora il turno resta quello di adesso.",
            "The front desk will review it and approve or decline it: we’ll email you the outcome. Until then the slot stays the same.",
          )}
        </Messaggio>
      ) : null}
      {turni.length ? (
        <Carta>
          {turni.map((g, i) => {
            const s = statoPosti(g);
            const fatto = chiesti.includes(g.id);
            return (
              <Riga
                key={g.id}
                prima={i === 0}
                testa={<Bollino icona="goccia" tono="blu" size={40} />}
                titolo={titoloGruppo(g)}
                sotto={(calendarioGruppo(g) ? calendarioGruppo(g) + "\n" : "") + annateGruppo(g)}
                coda={<Etichetta testo={fatto ? t("Richiesto", "Requested") : s.testo} tono={fatto ? "ok" : s.tono} />}
                onPress={!vista && !fatto ? () => setScelto(g) : undefined}
              />
            );
          })}
        </Carta>
      ) : (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t(
            "Adesso non ci sono altri turni dello stesso tipo con un posto libero. Se ti serve un orario diverso scrivi alla segreteria.",
            "There are no other slots of the same kind with a free spot right now. If you need a different time, write to the front desk.",
          )}
        </Text>
      )}

      <Foglio
        aperto={!!scelto}
        titolo={t("Chiedi il cambio orario", "Request a schedule change")}
        sottotitolo={scelto ? titoloGruppo(scelto) : undefined}
        onChiudi={() => (invio ? undefined : setScelto(null))}
      >
        <View style={{ gap: spazio.tre }}>
          <Messaggio tono="attenzione" titolo={t("Prima di mandare la richiesta", "Before you send the request")}>
            {t(
              `La richiesta non è automatica: viene controllata dalla segreteria e poi approvata o rifiutata, e solo dopo l’approvazione ${nome} cambia turno. Se viene approvata, il cambio vale dalla prima lezione utile dopo la data che ti comunichiamo. Fino ad allora ${nome} resta nel turno di adesso. Riceverai l’esito per email.`,
              `The request isn’t automatic: the front desk reviews it and then approves or declines it, and ${nome} only changes slot once it’s approved. If approved, the change applies from the first useful lesson after the date we tell you. Until then ${nome} stays in the current slot. You’ll get the outcome by email.`,
            )}
          </Messaggio>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              "Per garantire la continuità didattica, ti raccomandiamo di chiedere il cambio solo se strettamente necessario.",
              "To protect continuity in lessons, we recommend requesting a change only if strictly necessary.",
            )}
          </Text>
          {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
          <Pulsante testo={t("Ho capito, manda la richiesta", "I understand, send the request")} icona="ok" onPress={manda} inCorso={invio} />
          <Pulsante testo={t("Annulla", "Cancel")} variante="secondario" onPress={() => setScelto(null)} disabilitato={invio} />
        </View>
      </Foglio>
    </Sezione>
  );
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
});
