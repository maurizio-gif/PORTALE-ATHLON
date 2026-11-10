import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { salvaLivelloAcqua, type LivelloAcquaDichiarato, type PersonaJunior } from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Foglio } from "../ui/Foglio";
import { Bollino, Carta, Messaggio, Pulsante } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import { DomandeLivello } from "./DomandeLivello";
import { applicaRisposta, LIVELLO_VUOTO, livelloCompleto } from "./livelloAcqua";

// Il questionario di livello per chi e' gia' registrato (10/11/2026, richiesta di Maurizio): il bambino aggiunto prima che il questionario
// esistesse, o da una strada che non lo chiedeva, non ha risposte. **Prima di vedere i turni** il genitore le scrive: al posto dei turni
// compare questa carta, con un solo comando («Compila il questionario»; uno per figlio se sono piu' d'uno nella vista «Tutti i tuoi figli»)
// che apre le tre domande. Salvate (`portale-lab-junior`, azione `livello`), la sezione rilegge il nucleo e i turni compaiono.
// Chi decide a chi si mostra e' `livelloMancante` (`livelloAcqua.ts`). In vista cliente non si compila: la carta si vede com'e' per il genitore,
// col comando spento.

function elenco(nomi: string[]): string {
  if (nomi.length < 2) return nomi[0] ?? "";
  return `${nomi.slice(0, -1).join(", ")} ${t("e", "and")} ${nomi[nomi.length - 1]}`;
}

const nomeDi = (p: PersonaJunior) => p.nome?.trim() || t("tuo figlio", "your child");

export function LivelloDaCompilare({
  persone,
  vista,
  onFatto,
}: {
  /** I bambini che devono ancora compilare (almeno uno). */
  persone: PersonaJunior[];
  vista: boolean;
  /** Le risposte sono salvate: la sezione le mette sul bambino e i suoi turni si aprono. */
  onFatto: (memberId: number, livello: LivelloAcquaDichiarato) => void;
}) {
  const p = usePalette();
  const [scelta, setScelta] = useState<PersonaJunior | null>(null);
  const [aperto, setAperto] = useState(false);
  const piu = persone.length > 1;
  const nomi = elenco(persone.map(nomeDi));

  function apri(x: PersonaJunior) {
    setScelta(x);
    setAperto(true);
  }

  return (
    <>
      <Carta>
        <View style={{ gap: spazio.tre }}>
          <View style={stili.testa}>
            <Bollino icona="goccia" tono="blu" size={44} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
                {t("Prima dei turni, il questionario di livello", "Before the slots, the level questionnaire")}
              </Text>
              <Text style={[stili.testo, { color: p.testoSecondario }]}>
                {piu
                  ? t(
                      `Prima di vedere i turni compila il questionario sul livello in acqua di ${nomi}: sono tre domande per ognuno, ci vuole meno di un minuto.`,
                      `Before you see the slots, fill in the questionnaire about ${nomi}’s level in the water: three questions each, under a minute.`,
                    )
                  : t(
                      `Prima di vedere i turni compila il questionario sul livello in acqua di ${nomi}: sono tre domande, ci vuole meno di un minuto.`,
                      `Before you see the slots, fill in the questionnaire about ${nomi}’s level in the water: three questions, under a minute.`,
                    )}
              </Text>
            </View>
          </View>
          {vista ? (
            <Messaggio tono="attenzione">
              {t("In vista cliente il questionario non si compila: lo fa il genitore dalla sua app.", "In customer view the questionnaire can’t be filled in: the parent does it from their app.")}
            </Messaggio>
          ) : null}
          <View style={{ gap: spazio.due }}>
            {persone.map((x) => (
              <Pulsante
                key={x.member_id}
                testo={piu ? t(`Compila per ${nomeDi(x)}`, `Fill in for ${nomeDi(x)}`) : t("Compila il questionario", "Fill in the questionnaire")}
                icona="avanti"
                disabilitato={vista}
                onPress={() => apri(x)}
              />
            ))}
          </View>
        </View>
      </Carta>
      {scelta ? (
        <FoglioLivello
          // Un figlio diverso riparte da risposte vuote.
          key={scelta.member_id}
          persona={scelta}
          aperto={aperto}
          onChiudi={() => setAperto(false)}
          onFatto={(l) => {
            setAperto(false);
            onFatto(scelta.member_id, l);
          }}
        />
      ) : null}
    </>
  );
}

function FoglioLivello({
  persona,
  aperto,
  onChiudi,
  onFatto,
}: {
  persona: PersonaJunior;
  aperto: boolean;
  onChiudi: () => void;
  onFatto: (livello: LivelloAcquaDichiarato) => void;
}) {
  const [risposte, setRisposte] = useState(LIVELLO_VUOTO);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const nome = nomeDi(persona);

  function chiudi() {
    if (invio) return;
    setErrore(null);
    onChiudi();
  }

  async function salva() {
    if (!livelloCompleto(risposte) || invio) return;
    setInvio(true);
    setErrore(null);
    const r = await salvaLivelloAcqua(persona.member_id, {
      ha_frequentato: risposte.ha_frequentato === "si",
      sa_nuotare: risposte.sa_nuotare === "si",
      stile_libero: risposte.stile_libero === "si",
    });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.errore);
      return;
    }
    onFatto(r.livello);
  }

  return (
    <Foglio
      aperto={aperto}
      onChiudi={chiudi}
      titolo={t("Questionario di livello", "Level questionnaire")}
      sottotitolo={t(`Il livello in acqua di ${nome}: tre domande sul nuoto.`, `${nome}’s level in the water: three questions about swimming.`)}
    >
      <DomandeLivello risposte={risposte} onCambia={(id, v) => setRisposte((x) => applicaRisposta(x, id, v))} />
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante
        testo={t("Salva le risposte", "Save the answers")}
        icona="spunta"
        onPress={salva}
        inCorso={invio}
        disabilitato={!livelloCompleto(risposte)}
      />
    </Foglio>
  );
}

const stili = StyleSheet.create({
  testa: { flexDirection: "row", alignItems: "flex-start", gap: spazio.tre },
  titolo: { fontFamily: F.extra, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
});
