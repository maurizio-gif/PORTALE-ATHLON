import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// Condividere il PNG del diplomino **dall'app nativa** (09/11/2026): il PNG (base64, da `DiplomaSvg.png()`) diventa un file nella cache del telefono e si apre il foglio di
// condivisione del sistema (Salva immagine, Instagram, WhatsApp, Messaggi…): lo stesso giro del PDF del libretto (`esportaLibretto.ts`). Non solleva mai.
// Un PNG che pesa troppo poco e' un'immagine vuota: il disegno non ha preso le immagini, e non si condivide (la schermata dice che non e' riuscito).

/** Sotto questa lunghezza (in caratteri di base64, circa 30 kB) un diploma di 1080 punti con il suo disegno non puo' stare: e' un'immagine vuota. */
export const PNG_MINIMO = 40_000;

export type EsitoPng = "condiviso" | "errore";

function byteDa64(b64: string): Uint8Array {
  const binario = atob(b64.replace(/\s/g, ""));
  const byte = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) byte[i] = binario.charCodeAt(i);
  return byte;
}

export async function condividiPngNativo(base64: string | null, nomeFile: string): Promise<EsitoPng> {
  if (!base64 || base64.length < PNG_MINIMO) return "errore";
  try {
    if (!(await Sharing.isAvailableAsync())) return "errore";
    const file = new File(Paths.cache, nomeFile);
    file.create({ overwrite: true });
    file.write(byteDa64(base64));
    try {
      await Sharing.shareAsync(file.uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: nomeFile });
    } finally {
      try {
        file.delete();
      } catch {
        // Un file in piu' nella cache non e' un guaio: la ripulisce il sistema.
      }
    }
    return "condiviso";
  } catch {
    return "errore";
  }
}
