import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { LIVELLI } from "./datiBrevetti";
import { htmlLibretto, nomeFileLibretto, type DatiLibretto } from "./documentoLibretto";
import { indirizzoImmagine, LOGO_SCUOLA_NUOTO, personaggioDi } from "./personaggiBrevetti";

// Stampare o salvare in PDF il libretto dei brevetti (02/11/2026), come il piano di nuoto (`schede/esportaVasca.ts`): **sul web** la pagina si stampa da un riquadro
// nascosto e la finestra di stampa del browser stampa o, scegliendo «Salva come PDF», salva; **sull'app nativa** `expo-print` crea il PDF e si apre il foglio di
// condivisione del telefono. Niente passa da un server. Le immagini (logo, personaggi, foto) vanno in indirizzi completi, e la stampa parte quando si sono caricate.

export type EsitoLibretto = "stampa" | "condiviso" | "errore";

const web = () => Platform.OS === "web" && typeof document !== "undefined";

/** Un indirizzo relativo dell'app diventa completo (dentro il riquadro nascosto non c'e' un indirizzo di base). */
function assoluto(u: string | null): string | null {
  if (!u) return null;
  if (!web()) return u;
  try {
    return new URL(u, window.location.href).href;
  } catch {
    return u;
  }
}

/** I dati del libretto con le immagini risolte. */
export function datiLibretto(nome: string, codice: string, foto: string | null, data: string): DatiLibretto {
  const personaggi: Record<string, string | null> = {};
  for (const l of LIVELLI) {
    const i = personaggioDi(l.specie);
    personaggi[l.specie] = assoluto(i ? indirizzoImmagine(i) : null);
  }
  return { nome, codice, foto, logo: assoluto(indirizzoImmagine(LOGO_SCUOLA_NUOTO)), personaggi, data };
}

/** Aspetta che le immagini del documento siano pronte (o abbiano fallito: il libretto si stampa lo stesso). */
function immaginiPronte(doc: Document): Promise<void> {
  const tutte = Array.from(doc.images).map((img) => (img.complete ? Promise.resolve() : new Promise<void>((ok) => { img.onload = () => ok(); img.onerror = () => ok(); })));
  return Promise.race([Promise.all(tutte).then(() => undefined), new Promise<void>((ok) => setTimeout(ok, 8000))]);
}

export async function stampaLibretto(d: DatiLibretto): Promise<EsitoLibretto> {
  const html = htmlLibretto(d);
  try {
    if (!web()) {
      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) return "errore";
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: nomeFileLibretto(d.nome) });
      return "condiviso";
    }
    const telaio = document.createElement("iframe");
    telaio.setAttribute("aria-hidden", "true");
    telaio.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    telaio.srcdoc = html;
    const titoloPrima = document.title;
    const pulisci = () => {
      document.title = titoloPrima;
      telaio.remove();
    };
    await new Promise<void>((ok, no) => {
      telaio.onload = () => ok();
      telaio.onerror = () => no(new Error("iframe"));
      document.body.appendChild(telaio);
    });
    const finestra = telaio.contentWindow;
    if (!finestra || !telaio.contentDocument) {
      pulisci();
      return "errore";
    }
    await immaginiPronte(telaio.contentDocument);
    // Il browser propone come nome del PDF il titolo della pagina: per il tempo della stampa e' quello del libretto.
    document.title = nomeFileLibretto(d.nome);
    finestra.addEventListener("afterprint", pulisci);
    finestra.focus();
    finestra.print();
    setTimeout(pulisci, 60_000);
    return "stampa";
  } catch {
    return "errore";
  }
}
