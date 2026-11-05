#!/usr/bin/env node
// Arma public/ para un despliegue estático (Vercel): la charla en la raíz y la vista en /stage/,
// con el mismo esquema de rutas que sirve ./charla. Sin servidor de la escuela, la vista cae sola
// a la corrida grabada (plan B). No copia tests, servidores, docs ni las fuentes licenciadas.
//
//   node scripts/armar-estatico.mjs    # → public/

import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'public');

// Fuera del despliegue: tests, servidores y scripts de Node, notas internas y fuentes con licencia.
const LICENCIADAS = /^(Plain-.*\.otf|AppleGaramond-.*\.ttf)$/;
const fuera = (f) => {
  const n = basename(f);
  return /\.test\.(m?js)$/.test(n) || /\.mjs$/.test(n) || /\.md$/.test(n) || LICENCIADAS.test(n) || /\.mp3$/.test(n) || n === '.DS_Store';   // la música tiene derechos: solo en esta máquina
};

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(SALIDA, { recursive: true });
const copiar = (desde, hacia) => cpSync(desde, hacia, { recursive: true, filter: (f) => !fuera(f) });
copiar(join(RAIZ, 'presentacion'), SALIDA);
copiar(join(RAIZ, 'stage'), join(SALIDA, 'stage'));

for (const f of ['index.html', 'deck.json', 'stage/index.html', 'stage/corridas/index.json']) {
  if (!existsSync(join(SALIDA, f))) { console.error(`Falta ${f} en public/`); process.exit(1); }
}
console.log(`Listo: ${relative(process.cwd(), SALIDA) || '.'}/ (charla en /, vista en /stage/)`);
