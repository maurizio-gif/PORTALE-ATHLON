import type { ImageSource } from 'expo-image'

// Le foto del club delle attivita' (10/11/2026, richiesta di Maurizio): file nostri, tenuti in `assets/images/attivita/`, WebP 1280 px come
// `invita/amici-in-sala.webp`, non file del sito come le foto della sezione Junior. Stanno qui, in un posto solo, perche' le usano piu' schermate:
// se si sostituisce un file si tiene lo stesso nome, lo stesso formato e la stessa larghezza, e cambia ovunque.

/**
 * Una persona che nuota a stile libero nella vasca del club. La usano la scheda «Scuola Nuoto Adulti» dell'elenco «Cosa comprende» del Guest Pass
 * (`features/guest-pass/ProvaTuttoIlClub.tsx`) e la copertina delle lezioni della Scuola Nuoto Adulti nel Calendario (`features/lab/Calendario.tsx`).
 */
export const FOTO_SCUOLA_NUOTO_ADULTI: ImageSource = require('@/../assets/images/attivita/scuola-nuoto-adulti.webp')
