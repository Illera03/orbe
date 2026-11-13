// Falla si el JS inicial de dist/index.html (scripts + modulepreload) supera 500 KB con gzip.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import process from 'node:process'

const LIMITE = 500 * 1024
const html = readFileSync('dist/index.html', 'utf8')
const rutas = new Set()
for (const [, src] of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)) rutas.add(src)
for (const [etiqueta] of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*>/g)) {
  rutas.add(etiqueta.match(/href="([^"]+)"/)[1])
}
if (rutas.size === 0) {
  console.error('No se encontró ningún script en dist/index.html')
  process.exit(1)
}

let total = 0
for (const ruta of rutas) {
  const tam = gzipSync(readFileSync('dist/' + ruta.replace(/^\/orbe\//, ''))).length
  console.log(`${(tam / 1024).toFixed(1).padStart(8)} KB  ${ruta}`)
  total += tam
}
console.log(`${(total / 1024).toFixed(1).padStart(8)} KB  total (límite ${LIMITE / 1024} KB)`)
if (total > LIMITE) process.exit(1)
