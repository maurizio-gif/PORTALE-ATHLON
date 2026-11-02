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
  // La doppia conferma (02/11/2026, richiesta di Maurizio): il primo passo spiega e sconsiglia, il secondo chiede «sei sicuro?» e solo allora parte la richiesta.
  const [passo, setPasso] = useState<1 | 2>(1);
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
    chiudi();
  }

  function apri(g: GruppoJunior) {
    setPasso(1);
    setErrore(null);
    setScelto(g);
  }
  function chiudi() {
    setScelto(null);
    setPasso(1);
    setErrore(null);
  }

  return (
    <Sezione titolo={t("Cambio orario", "Change schedule")} conteggio={turni.length}>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          `Se ${nome} vuole cambiare orario, puoi chiedere un altro turno dello stesso tipo con un posto libero. La segreteria controlla la richiesta e ti scrive l’esito per email.`,
          `If ${nome} wants a different time, you can ask for another slot of the same kind with a free spot. The front desk reviews the request and emails you the outcome.`,
        )}
      </Text>
      {chiesti.length ? (
        <Messaggio tono="ok" titolo={t("Richiesta inviata", "Request sent")}>
          {t(
            "La segreteria la controlla e ti scrive l’esito per email. Fino ad allora il turno resta quello di adesso.",
            "The front desk will review it and email you the outcome. Until then the slot stays the same.",
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
                onPress={!vista && !fatto ? () => apri(g) : undefined}
              />
            );
          })}
        </Carta>
      ) : (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t("Adesso non ci sono altri turni dello stesso tipo con un posto libero.", "There are no other slots of the same kind with a free spot right now.")}
        </Text>
      )}

      <Foglio
        aperto={!!scelto}
        titolo={passo === 1 ? t("Chiedi il cambio di turno", "Request a slot change") : t("Ne sei sicuro?", "Are you sure?")}
        sottotitolo={scelto ? titoloGruppo(scelto) : undefined}
        onChiudi={() => (invio ? undefined : chiudi())}
      >
        {passo === 1 ? (
          <View style={{ gap: spazio.tre }}>
            <Messaggio tono="attenzione" titolo={t("Cambiare turno è sconsigliato", "Changing slot is discouraged")}>
              {t(
                `Cambiare turno, e ancora di più farlo spesso, fa perdere a ${nome} la continuità con l’istruttore e con il gruppo, e rende meno efficace la didattica. Chiedilo solo se è davvero necessario.`,
                `Changing slot, and even more so doing it often, makes ${nome} lose continuity with the instructor and the group, and makes the teaching less effective. Only ask if it’s truly necessary.`,
              )}
            </Messaggio>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                `La richiesta non è automatica: la segreteria la controlla e la approva o la rifiuta. Se è approvata, il cambio vale dalla prima lezione utile dopo la data che ti comunichiamo; fino ad allora ${nome} resta nel turno di adesso. L’esito arriva per email.`,
                `The request isn’t automatic: the front desk reviews it and approves or declines it. If approved, the change applies from the first useful lesson after the date we give you; until then ${nome} stays in the current slot. The outcome arrives by email.`,
              )}
            </Text>
            <Pulsante testo={t("Manda la richiesta", "Send the request")} icona="avanti" onPress={() => setPasso(2)} />
            <Pulsante testo={t("Annulla", "Cancel")} variante="secondario" onPress={chiudi} />
          </View>
        ) : (
          <View style={{ gap: spazio.tre }}>
            <Messaggio tono="attenzione" titolo={t("Un ultimo controllo", "One last check")}>
              {t(
                "Se i cambi di turno diventano frequenti, le richieste successive potrebbero non essere accettate. Vuoi mandare questa richiesta?",
                "If slot changes become frequent, later requests may not be accepted. Do you want to send this request?",
              )}
            </Messaggio>
            {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
            <Pulsante testo={t("Sì, ho bisogno del cambio", "Yes, I need the change")} icona="ok" onPress={manda} inCorso={invio} />
            <Pulsante testo={t("No, resto nel turno di adesso", "No, keep the current slot")} variante="secondario" onPress={chiudi} disabilitato={invio} />
          </View>
        )}
      </Foglio>
    </Sezione>
  );
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
});
