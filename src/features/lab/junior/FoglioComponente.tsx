import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { aggiungiComponente, type NucleoJunior } from "@/api/junior";
import { CampoData } from "@/components/CampoData";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { CampoTesto } from "../ui/Campi";
import { Foglio } from "../ui/Foglio";
import { Messaggio, Pulsante } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import { Tocco } from "../ui/Tocco";
import { DomandeLivello } from "./DomandeLivello";
import { applicaRisposta, chiedeLivello, livelloCompleto, LIVELLO_VUOTO, oggi } from "./livelloAcqua";

// Aggiungere un componente al nucleo (21/10/2026, richiesta di Maurizio): un figlio, con nome, cognome e data di nascita,
// tutti obbligatori, e la dichiarazione di esserne il genitore o il tutore. **Il codice fiscale non si chiede** (05/11/2026,
// Maurizio): lo pretende il contratto quando il bambino si iscrive a un corso, e lo si scrive li', in «Correggi i dati».
// L'app controlla la minore eta'; il resto lo rifa' la funzione `portale-lab-junior`, che guarda anche che la persona non ci
// sia gia', nel nucleo o al club, e crea la scheda su PerfectGym agganciata al titolare. Niente parte prima di «Aggiungi».

const VUOTO = { nome: "", cognome: "", nascita: "" };

// Il livello in acqua (05/11/2026, richiesta di Maurizio): le tre domande del modulo del sito, tutte obbligatorie, perche' la
// segreteria e il Direttore Tecnico sappiano da dove parte il bambino. Si chiedono da tre anni in su (nati prima dei tre anni di
// calendario, cioe' fuori dalle annate del Baby Nuoto, dove si entra in acqua col genitore e le domande non hanno senso). Le
// risposte le salva `portale-lab-junior` e il CRM le mostra nella scheda del bambino. Le domande, la regola dell'eta' e il blocco
// per chi e' gia' registrato stanno in `livelloAcqua.ts` e `DomandeLivello.tsx` (10/11/2026).

function anni(nascita: string): number {
  const [a, m, g] = nascita.split("-").map(Number);
  const [oa, om, og] = oggi().split("-").map(Number);
  return oa - a - (om < m || (om === m && og < g) ? 1 : 0);
}

export function FoglioComponente({
  aperto,
  onChiudi,
  onAggiunto,
}: {
  aperto: boolean;
  onChiudi: () => void;
  onAggiunto: (nome: string, nucleo: NucleoJunior | null) => void;
}) {
  const p = usePalette();
  const [d, setD] = useState(VUOTO);
  const [tutore, setTutore] = useState(false);
  const [livello, setLivello] = useState(LIVELLO_VUOTO);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const erroreEta =
    /^\d{4}-\d{2}-\d{2}$/.test(d.nascita) && anni(d.nascita) >= 18
      ? t("Risulta maggiorenne: chi ha 18 anni entra nell’app con la sua email.", "This person is an adult: anyone 18 or over signs in to the app with their own email.")
      : null;
  const conLivello = chiedeLivello(d.nascita);
  const pronto =
    (!conLivello || livelloCompleto(livello)) &&
    !!d.nome.trim() &&
    !!d.cognome.trim() &&
    !!d.nascita &&
    !erroreEta &&
    tutore;

  function chiudi() {
    if (invio) return;
    setErrore(null);
    onChiudi();
  }

  async function aggiungi() {
    if (!pronto || invio) return;
    setInvio(true);
    setErrore(null);
    const r = await aggiungiComponente({
      ...d,
      tutore,
      ...(conLivello
        ? {
            ha_frequentato: livello.ha_frequentato === "si",
            sa_nuotare: livello.sa_nuotare === "si",
            stile_libero: livello.stile_libero === "si",
          }
        : {}),
    });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.errore);
      return;
    }
    setD(VUOTO);
    setTutore(false);
    setLivello(LIVELLO_VUOTO);
    onAggiunto(r.nome, r.nucleo);
  }

  return (
    <Foglio
      tastiera
      aperto={aperto}
      onChiudi={chiudi}
      titolo={t("Aggiungi un componente", "Add a family member")}
      sottotitolo={t("Un figlio che non è ancora nel tuo nucleo familiare. Nome e cognome per intero, come sul documento.", "A child who isn’t in your family members yet. First and last name in full, as on their ID.")}
    >
      <CampoTesto
        etichetta={t("Nome", "First name")}
        icona="persona"
        value={d.nome}
        onChangeText={(v) => setD((x) => ({ ...x, nome: v }))}
        autoCapitalize="words"
        autoComplete="off"
      />
      <CampoTesto
        etichetta={t("Cognome", "Last name")}
        icona="persona"
        value={d.cognome}
        onChangeText={(v) => setD((x) => ({ ...x, cognome: v }))}
        autoCapitalize="words"
        autoComplete="off"
      />
      {/* CampoData ha `flex: 1`: in una colonna che scorre si schiaccerebbe sul campo dopo. */}
      <View>
        <CampoData
          etichetta={t("Data di nascita", "Date of birth")}
          value={d.nascita}
          onChange={(v) => setD((x) => ({ ...x, nascita: v }))}
          max={oggi()}
          annoIniziale={new Date().getFullYear() - 8}
          errore={!!erroreEta}
          sfondo={p.incavo}
        />
      </View>
      {erroreEta ? <Messaggio tono="attenzione">{erroreEta}</Messaggio> : null}

      {conLivello ? (
        <DomandeLivello
          titolo={t("Il suo livello in acqua", "Their level in the water")}
          risposte={livello}
          onCambia={(id, v) => setLivello((x) => applicaRisposta(x, id, v))}
        />
      ) : null}

      <Tocco
        onPress={() => setTutore((v) => !v)}
        stato={{ selected: tutore }}
        ruolo="checkbox"
        etichetta={t("Dichiaro di esserne il genitore o il tutore legale", "I declare that I am their parent or legal guardian")}
        style={stili.casellaRiga}
      >
        <View
          style={[
            stili.casella,
            {
              borderColor: tutore ? p.accento : p.testoTerzo,
              backgroundColor: tutore ? p.accento : "transparent",
            },
          ]}
        >
          {tutore ? <Text style={stili.spunta}>✓</Text> : null}
        </View>
        <Text style={[stili.dichiarazione, { color: p.testo }]}>
          {t("Dichiaro di esserne il genitore o il tutore legale.", "I declare that I am their parent or legal guardian.")}
        </Text>
      </Tocco>

      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t("Prima di aggiungerlo controlliamo che non sia già registrato al club. Se lo è, per collegarlo al tuo nucleo passa in segreteria.", "Before adding them we check they’re not already registered at the club. If they are, come to the front desk to link them to your family.")}
      </Text>

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante
        testo={t("Aggiungi al nucleo", "Add to family")}
        icona="aggiungi"
        onPress={aggiungi}
        inCorso={invio}
        disabilitato={!pronto}
      />
    </Foglio>
  );
}

const stili = StyleSheet.create({
  casellaRiga: {
    flexDirection: "row",
    alignItems: "center",
    gap: spazio.due + 2,
    minHeight: 44,
  },
  casella: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  spunta: { color: "#fff", fontSize: 14, fontFamily: F.extra, lineHeight: 16 },
  dichiarazione: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: F.semi },
  nota: { fontSize: 13, lineHeight: 19, fontFamily: F.medio },
});
