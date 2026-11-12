# Il certificato approvato da vedere e scaricare: cosa serve in APP-ATHLON (12/11/2026)

L'app (PORTALE-ATHLON) mostra «Vedi e scarica» sulla riga del certificato **solo quando il server dice che il file c'è**.
Finché le tre modifiche qui sotto non sono in APP-ATHLON e pubblicate, nell'app non cambia niente: il campo manca e il
pulsante non compare. Sono scritte qui perché la sessione che ha fatto l'app non aveva accesso ad APP-ATHLON.

Dati di partenza (letti dal database il 12/11/2026): `public.certificati_caricamenti` ha 367 righe `approvato`, 56
`rifiutato`, 1 `in_verifica`; ogni riga ha `file_percorso` (nel bucket privato `certificati-medici`), `file_nome`,
`file_tipo` (`image/jpeg`, `image/png`, `application/pdf`, deciso dai primi byte), `verificato_il`, `inizio` e `fine`
(le date scritte dalla segreteria approvando).

## 1. `portale_area_per_email`: il campo `file` in `certificati[]`

Per ogni persona, accanto a `scadenza`, `caricamento` e `proroga`:

```sql
'file', (
  select jsonb_build_object('tipo', cc.file_tipo, 'verificato_il', cc.verificato_il)
    from public.certificati_caricamenti cc
   where cc.member_id = <member_id della riga>
     and cc.stato = 'approvato'
     -- Solo il file del certificato IN VIGORE: se dopo c'e' stato un certificato consegnato su carta,
     -- con un'altra scadenza, il file vecchio non si offre come se fosse quello.
     and cc.fine = <scadenza della riga>
   order by cc.verificato_il desc nulls last
   limit 1
)
```

`null` quando non c'è (certificato consegnato su carta, o nessuna approvazione con quella scadenza). L'app lo legge come
`CertificatoArea.file` (`src/api/lab.ts`) e mostra il pulsante solo se c'è **e** c'è la scadenza.

## 2. `portale-lab-certificati`: l'azione `apri`

`{ azione: 'apri', member_id }` → `{ ok: true, url, url_scarica, nome, tipo }`

- **Chi**: lo stesso controllo di `carica` (il `member_id` deve essere nel nucleo di `metodo_nucleo_da_email`), prima di
  leggere qualsiasi cosa.
- **Quale file**: la stessa riga del punto 1 (approvato, `fine` = scadenza in vigore). Nessuna riga → 404 «Non c'è un
  certificato da mostrare.».
- **Il link**: firmato da Storage, breve (5 minuti bastano: si chiede al tocco).

```ts
const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${riga.file_percorso}`, {
  method: 'POST',
  headers: { ...autorizza(), 'Content-Type': 'application/json' },
  body: JSON.stringify({ expiresIn: 300 }),
})
const { signedURL } = await r.json()           // «/object/sign/certificati-medici/...?token=...»
const url = `${SUPABASE_URL}/storage/v1${signedURL}`
const url_scarica = `${url}&download=${encodeURIComponent(riga.file_nome)}`
return rispostaJson(req, 200, { ok: true, url, url_scarica, nome: riga.file_nome, tipo: riga.file_tipo })
```

- **Vista cliente**: `apri` è una lettura. Va aggiunta a `LETTURE` in `_shared/sessione-portale.ts`
  (`'portale-lab-certificati': ['apri']`), altrimenti lo staff in vista cliente tocca il pulsante e riceve «sola lettura».
- **Audit**: una riga `certificato.aperto` in `audit_log` (email, member_id), come per il caricamento; non deve mai far
  fallire la risposta.
- L'intestazione del file oggi dice «la funzione ha una sola azione»: va aggiornata.

L'app manda `nome` scelto da sé («Certificato medico Mario Rossi.pdf») nel `download=` se `url_scarica` manca; se c'è, usa
quello del server.

## 3. Il CRM: «Scarica» accanto a «Vedi»

Richiesta di Maurizio (12/11/2026): quando il certificato arriva sul CRM («Da controllare»), oltre a visualizzarlo si deve
poterlo **scaricare**. Il CRM apre già il file con un link firmato del bucket `certificati-medici`: il pulsante «Scarica»
è lo stesso link con `&download=<nome del file>` in coda (o `createSignedUrl(percorso, durata, { download: nome })` con
supabase-js), che fa rispondere Storage con `Content-Disposition: attachment`. L'attributo `download` di un `<a>` da solo
non basta: il file sta su un altro dominio e il browser lo ignora. Il nome del file utile alla segreteria:
`Certificato <Cognome> <Nome> <aaaa-mm-gg>.<ext>`.
