import { build } from 'esbuild'
await build({
  entryPoints: ['supabase/functions/portale-lab-classifica/index.ts'],
  bundle: true, platform: 'node', format: 'esm', outfile: 'dist/funzione.mjs', logLevel: 'info',
  external: ['node:*'],
  plugins: [{ name: 'finto-postgres', setup(b) { b.onResolve({ filter: /^npm:postgres/ }, () => ({ path: '/private/tmp/claude-501/e2e/mocks/postgres.ts' })) } }],
})
