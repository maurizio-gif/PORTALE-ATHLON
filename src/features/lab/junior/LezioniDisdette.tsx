import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { leggiLezioniDisdette, ripristinaLezione, type LezioneDisdetta } from "@/api/lab";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { giornoOra } from "../percorso/TappaCarta";
import { Etichetta, Messaggio, Pulsante, Sezione } from "../ui/kit";
import { Foglio } from "../ui/Foglio";
import { F, usePalette } from "../ui/tema";

// «Lezioni che hai disdetto» (12/11/2026, richiesta di Maurizio), nella voce «Recuperi» della Scuola Nuoto Bambini. Una lezione disdetta dall'app
// ha generato un recupero; chi ci ripensa (o ha disdetto per sbaglio) la ripristina fino all'orario di inizio. La disdetta resta chiusa
// un'ora prima, il ripristino arriva fino all'inizio. Il recupero generato si annulla, e se era gia' prenotato su un'altra lezione si annulla
// anche quella prenotazione (la conferma lo dice). Dopo l'inizio, o con il recupero gia' usato, non c'e' il comando: lo fa la segreteria.
// Non compare in vista cliente (e' una scrittura) e con una quota scaduta il server rifiuta come per la disdetta.

export function LezioniDisdette({
  memberId,
  /** Cambia quando cambiano i conteggi (disdetta, ripristino, recupero prenotato): rilegge la lista. */
  versione,
  onCambiato,
}: {
  memberId: number;
  versione: string;
  onCambiato: () => Promise<void>;
}) {
  const p = usePalette();
  const [lista, setLista] = useState<LezioneDisdetta[]>([]);
  const [scelta, setScelta] = useState<LezioneDisdetta | null>(null);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const r = await leggiLezioniDisdette(memberId);
    if (r.ok) setLista(r.disdette);
  }, [memberId]);
  useEffect(() => {
    carica();
  }, [carica, versione]);

  async function conferma() {
    if (!scelta) return;
    setInvio(true);
    setErrore(null);
    const r = await ripristinaLezione(scelta.class_id, memberId);
    setInvio(false);
    if (!r.ok) {
      setErrore(r.errore);
      return;
    }
    setFatto(
      t(
        `La lezione di ${giornoOra(scelta.inizio)} è ripristinata. Il recupero è stato annullato.`,
        `The class on ${giornoOra(scelta.inizio)} is restored. The make-up credit has been cancelled.`,
      ),
    );
    setScelta(null);
    await carica();
    await onCambiato();
  }

  if (lista.length === 0 && !fatto) return null;
  return (
    <Sezione titolo={t("Lezioni che hai disdetto", "Classes you cancelled")}>
      {fatto ? (
        <Messaggio tono="ok" titolo={t("Fatto", "Done")}>
          {fatto}
        </Messaggio>
      ) : null}
      {lista.length > 0 ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t(
            "Se puoi venire, ripristina la lezione fino all’orario di inizio. Il recupero che ti era stato assegnato viene annullato.",
            "If you can make it, restore the class until its start time. The make-up credit you were given is cancelled.",
          )}
        </Text>
      ) : null}
      <View style={{ gap: spazio.due }}>
        {lista.map((l) => (
          <View key={l.class_id} style={[stili.riga, { backgroundColor: p.incavo }]}>
            <View style={stili.testa}>
              <Text style={[stili.quando, { color: p.testo }]}>{giornoOra(l.inizio)}</Text>
              <Etichetta
                testo={
                  l.recupero_stato === "prenotato"
                    ? t("Recupero prenotato", "Make-up booked")
                    : t("Recupero da usare", "Make-up to use")
                }
                tono={l.recupero_stato === "prenotato" ? "blu" : "attenzione"}
              />
            </View>
            <Pulsante
              testo={t("Ripristina lezione", "Restore class")}
              icona="rinnovo"
              variante="contorno"
              piccolo
              onPress={() => {
                setErrore(null);
                setFatto(null);
                setScelta(l);
              }}
            />
          </View>
        ))}
      </View>
      <Foglio
        aperto={!!scelta}
        titolo={t("Ripristinare la lezione?", "Restore the class?")}
        sottotitolo={scelta ? giornoOra(scelta.inizio) : undefined}
        onChiudi={() => (invio ? undefined : setScelta(null))}
      >
        <View style={{ gap: spazio.tre }}>
          <Text style={[stili.testo, { color: p.testo }]}>
            {t(
              "La lezione torna fra le tue prossime lezioni. Il recupero che ti era stato assegnato viene annullato.",
              "The class goes back among your upcoming classes. The make-up credit you were given is cancelled.",
            )}
          </Text>
          {scelta?.recupero_stato === "prenotato" ? (
            <Messaggio tono="attenzione" titolo={t("Hai già prenotato il recupero", "You have already booked the make-up")}>
              {t(
                `Hai prenotato un recupero${scelta.prenotazione_inizio ? ` per ${giornoOra(scelta.prenotazione_inizio)}` : ""}. Ripristinando la lezione anche quella prenotazione viene annullata.`,
                `You booked a make-up class${scelta.prenotazione_inizio ? ` for ${giornoOra(scelta.prenotazione_inizio)}` : ""}. Restoring this class also cancels that booking.`,
              )}
            </Messaggio>
          ) : null}
          {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
          <Pulsante testo={t("Sì, ripristina", "Yes, restore")} inCorso={invio} onPress={conferma} />
          <Pulsante testo={t("Annulla", "Cancel")} variante="fantasma" piccolo disabilitato={invio} onPress={() => setScelta(null)} />
        </View>
      </Foglio>
    </Sezione>
  );
}

const stili = StyleSheet.create({
  nota: { fontSize: 13, lineHeight: 19, fontFamily: F.medio, paddingHorizontal: 2 },
  testo: { fontSize: 15, lineHeight: 22, fontFamily: F.medio },
  riga: { borderRadius: 16, padding: spazio.tre, gap: spazio.due },
  testa: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spazio.due },
  quando: { fontSize: 15, fontFamily: F.semi, flex: 1 },
});
