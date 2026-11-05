// La página pública (pages/): la copia de la escena está al día, cada paso declara una escena válida y nada apunta afuera de pages/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { revisar, adaptar } from '../scripts/armar-pages.mjs';
import { leerEscena } from '../presentacion/escena/escena.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(AQUI, 'index.html'), 'utf8');
const desescapar = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('pages/vendor está al día con presentacion/escena y stage (si falla: node scripts/armar-pages.mjs)', async () => {
  assert.deepEqual(await revisar(), []);
});

test('la copia no deja rutas absolutas del servidor de la charla', () => {
  const fuente = "cargarImagen(`/stage/assets/personajes/char_${i}.png`); new FontFace('Silkscreen', 'url(/stage/assets/Silkscreen-Bold.ttf)')";
  assert.doesNotMatch(adaptar('presentacion/escena/gente.js', fuente), /['`(]\/stage\//);
});

test('cada data-paso-escena es una escena que la charla sabe dibujar', () => {
  const pasos = [...html.matchAll(/data-paso-escena='([^']*)'/g)].map((m) => JSON.parse(desescapar(m[1])));
  assert.ok(pasos.length >= 15, `pocos pasos: ${pasos.length}`);
  for (const p of pasos) {
    assert.ok(p.id, 'falta id');
    assert.doesNotThrow(() => leerEscena(JSON.stringify(p.escena)), `escena inválida en ${p.id}`);
    if (p.movil) assert.doesNotThrow(() => leerEscena(JSON.stringify({ ...p.escena, ...p.movil })), `movil inválido en ${p.id}`);
  }
});

test('los recursos locales que pide la página existen', async () => {
  const rutas = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith('http'));
  const css = await readFile(join(AQUI, 'estilo.css'), 'utf8');
  for (const m of css.matchAll(/url\(([^)'"]+)\)/g)) rutas.push(m[1]);
  for (const r of rutas) await access(join(AQUI, r)).catch(() => assert.fail(`no existe pages/${r}`));
});

test('los anclajes de la barra llevan a una sección', () => {
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.match(html, new RegExp(`id="${id}"`), `#${id} no existe`);
});
