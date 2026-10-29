// Un finto `postgres.js` che parla con PGlite (un Postgres vero): stesse query della funzione, stessa semantica del tag.
export default function postgres(_url: string, _opts: unknown) {
  const db = (globalThis as any).__db
  const esegui = (strings: any, values: any[]) => {
    let text = strings[0]
    const params: unknown[] = []
    values.forEach((v, i) => {
      if (v && typeof v === 'object' && '__lista' in v) text += '(' + v.__lista.map((x: unknown) => { params.push(x); return `$${params.length}` }).join(', ') + ')'
      else { params.push(v === undefined ? null : v); text += `$${params.length}` }
      text += strings[i + 1]
    })
    ;(globalThis as any).__query?.(text)
    return db.query(text, params).then((r: any) => r.rows)
  }
  const sql: any = (strings: any, ...values: any[]) => (Array.isArray(strings) && 'raw' in strings ? esegui(strings, values) : { __lista: strings })
  sql.begin = async (cb: any) => cb(sql)
  return sql
}
