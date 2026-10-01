/**
 * Bundles scripts/test_logic.ts with esbuild (already installed as part of Vite) and runs it in
 * Node. Usage: npm run test:logic
 */
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = join(mkdtempSync(join(tmpdir(), 'fs-tests-')), 'test_logic.mjs')
await build({
  entryPoints: ['scripts/test_logic.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: out,
  logLevel: 'error',
  loader: { '.json': 'json' },
})
await import(pathToFileURL(out).href)
