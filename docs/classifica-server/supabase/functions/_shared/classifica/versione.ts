// La versione dell'informativa della classifica mensile (29/10/2026): la stessa costante sta nell'app
// (src/features/lab/classifica/informativa.ts del portale, `VERSIONE_INFORMATIVA_CLASSIFICA`). Sta qui, in un file a
// parte, perche' la leggono la funzione e la prova. Cambiando il testo si cambia la versione nell'app e qui: il
// consenso decade, la persona esce dalla classifica finche' non riaccetta (la vista `athlon_classifica_dentro`).
// La funzione riallinea la versione nella tabella `athlon_classifica_config` a ogni avvio: il giro notturno legge da li'.
//
// 2026-10-29: prima versione.

export const VERSIONE_INFORMATIVA_CLASSIFICA = '2026-10-29'
