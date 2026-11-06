// La página pública (pages/): estática y editorial. Todo lo que pide existe, los anclajes llevan a algo y no carga JavaScript.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(AQUI, 'index.html'), 'utf8');
const css = await readFile(join(AQUI, 'estilo.css'), 'utf8');

test('los recursos locales que pide la página existen', async () => {
  const rutas = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  for (const m of css.matchAll(/url\(([^)'"]+)\)/g)) rutas.push(m[1]);
  assert.ok(rutas.length > 10);
  for (const r of rutas) await access(join(AQUI, r)).catch(() => assert.fail(`no existe pages/${r}`));
});

test('los anclajes llevan a una sección', () => {
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.match(html, new RegExp(`id="${id}"`), `#${id} no existe`);
});

test('es una página para leer: sin scripts ni animaciones', () => {
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(css, /@keyframes|animation:/);
});

test('cada imagen tiene texto alternativo y medidas', () => {
  for (const [img] of html.matchAll(/<img[^>]*>/g)) {
    assert.match(img, /alt="[^"]+"/, img);
    assert.match(img, /width="\d+" height="\d+"/, img);
  }
});
