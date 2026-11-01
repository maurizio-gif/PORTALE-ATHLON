## Il tema: sul computer sempre chiaro, sul telefono quello del sistema

Richiesta di Maurizio (20/10/2026). **Su web, da 900 px di larghezza in su, l'app è sempre chiara**, qualunque tema abbia il sistema; sotto i 900 px e nell'app nativa **segue il sistema**
(`useSchemaColori` in `src/lib/schemaColori.ts`: è il solo posto che chiede a React Native il tema, e lo leggono `useColori` in `theme.ts` e `usePalette` in `lab/ui/tema.ts`). I 900 px sono la soglia con cui le
schermate passano alle colonne larghe (`LARGO`, che `components/Pagina.tsx` riesporta): **se cambia, cambia anche in `public/index.html`** (fondo e `theme-color` prima che parta il codice) **e in `public/offline.html`**.
Un tablet di traverso (da 900 px) conta come computer, e **ridimensionare la finestra attraverso i 900 px cambia il tema**. **L'avvio animato resta scuro** (è il suo design, e dura tre secondi), come le fasce scure della
testata e le schede «carbone», che sono scure anche nel tema chiaro. Provato in Chromium (bundle web esportato, pagina d'accesso): computer con sistema scuro e chiaro → fondo `#E4E5EA` in tutti e due i casi; 390 px con sistema scuro → fondo `#050506`, con sistema chiaro → `#E4E5EA`. **Non provato**: le altre schermate e un telefono vero.

