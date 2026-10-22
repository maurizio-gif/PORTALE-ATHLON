import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { aggiungiComponente, type NucleoJunior } from "@/api/junior";
import { CampoData } from "@/components/CampoData";
import { problemaCodiceFiscale } from "@/lib/codiceFiscale";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { CampoTesto } from "../ui/Campi";
import { Foglio } from "../ui/Foglio";
import { Messaggio, Pulsante } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import { Tocco } from "../ui/Tocco";

// Aggiungere un componente al nucleo (21/10/2026, richiesta di Maurizio): un figlio, con nome, cognome, data di nascita e
// codice fiscale, tutti obbligatori, e la dichiarazione di esserne il genitore o il tutore. L'app controlla quello che puo'
// (il codice fiscale valido e coerente, la minore eta': `problemaCodiceFiscale`, lo stesso controllo del Guest Pass); il resto
// lo rifa' la funzione `portale-lab-junior`, che guarda anche che la persona non ci sia gia', nel nucleo o al club, e crea la
// scheda su PerfectGym agganciata al titolare. Niente parte prima di «Aggiungi».

const VUOTO = { nome: "", cognome: "", nascita: "", codice_fiscale: "" };

function oggi(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

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
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const erroreCf = problemaCodiceFiscale(d);
  const erroreEta =
    /^\d{4}-\d{2}-\d{2}$/.test(d.nascita) && anni(d.nascita) >= 18
      ? t("Risulta maggiorenne: chi ha 18 anni entra nell’app con la sua email.", "This person is an adult: anyone 18 or over signs in to the app with their own email.")
      : null;
  const pronto =
    !!d.nome.trim() &&
    !!d.cognome.trim() &&
    !!d.nascita &&
    d.codice_fiscale.replace(/\s/g, "").length === 16 &&
    !erroreCf &&
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
      codice_fiscale: d.codice_fiscale.replace(/\s/g, "").toUpperCase(),
      tutore,
    });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.errore);
      return;
    }
    setD(VUOTO);
    setTutore(false);
    onAggiunto(r.nome, r.nucleo);
  }

  return (
    <Foglio
      aperto={aperto}
      onChiudi={chiudi}
      titolo={t("Aggiungi un componente", "Add a family member")}
      sottotitolo={t("Un figlio che non è ancora nel tuo nucleo familiare. Tutti i dati per intero, come sul documento.", "A child who isn’t in your family members yet. Enter all details in full, as on their ID.")}
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
      <CampoTesto
        etichetta={t("Codice fiscale", "Italian tax code")}
        icona="documento"
        value={d.codice_fiscale}
        onChangeText={(v) =>
          setD((x) => ({ ...x, codice_fiscale: v.toUpperCase() }))
        }
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={16}
        placeholder="RSSMRA18C15H501B"
        errore={!!erroreCf}
      />
      {erroreEta ? <Messaggio tono="attenzione">{erroreEta}</Messaggio> : null}
      {erroreCf ? <Messaggio tono="attenzione">{erroreCf}</Messaggio> : null}

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
