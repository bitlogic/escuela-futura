// Copia en pages/vendor/ lo que la página pública (pages/) toma de la charla: la escena de perfil (presentacion/escena/),
// los módulos de la escuela que usa (stage/oficina.js, personajes.js, luz.js), los personajes y las fuentes y fotos del deck.
// Así pages/ es un sitio estático autocontenido: GitHub Pages lo publica tal cual (.github/workflows/pages.yml) y se puede
// abrir con cualquier servidor estático. Las rutas absolutas a /stage/assets/ se reescriben relativas al módulo.
//
//   node scripts/armar-pages.mjs            escribe pages/vendor/
//   node scripts/armar-pages.mjs --revisar  sale con 1 si la copia quedó vieja (lo usa el test)
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'pages', 'vendor');

export const MODULOS = [
  'presentacion/escena/camara.js',
  'presentacion/escena/edificio.js',
  'presentacion/escena/escena.js',
  'presentacion/escena/gente.js',
  'presentacion/escena/giro.js',
  'presentacion/escena/luz.js',
  'presentacion/escena/portada.js',
  'stage/luz.js',
  'stage/oficina.js',
  'stage/personajes.js',
];
export const BINARIOS = [
  ...[0, 1, 2, 3, 4, 5].map((i) => `stage/assets/personajes/char_${i}.png`),
  'stage/assets/personajes/CREDITOS.md',
  'stage/assets/Silkscreen-Bold.ttf',
  'presentacion/assets/outfit.woff2',
  'presentacion/assets/jetbrains-mono.woff2',
  'presentacion/assets/alfredo.jpg',
  'presentacion/assets/greyla.jpg',
];

/** Reescribe las rutas absolutas del servidor de la charla (/stage/assets/…) como URL relativas al módulo copiado. */
export function adaptar(ruta, texto) {
  if (!ruta.startsWith('presentacion/escena/')) return texto;
  return texto
    .replace(/cargarImagen\(`\/stage\/assets\/([^`]*)`\)/g, 'cargarImagen(new URL(`../../stage/assets/$1`, import.meta.url).href)')
    .replace("'url(/stage/assets/Silkscreen-Bold.ttf)'", "`url(${new URL('../../stage/assets/Silkscreen-Bold.ttf', import.meta.url).href})`");
}

export async function esperado() {
  const archivos = new Map();
  for (const r of MODULOS) archivos.set(r, Buffer.from(adaptar(r, await readFile(join(RAIZ, r), 'utf8'))));
  for (const r of BINARIOS) archivos.set(r, await readFile(join(RAIZ, r)));
  return archivos;
}

async function listar(dir, base = '') {
  let out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const r = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out = out.concat(await listar(join(dir, e.name), r)); else out.push(r);
  }
  return out;
}

export async function revisar() {
  const faltan = [];
  for (const [r, buf] of await esperado()) {
    const actual = await readFile(join(DESTINO, r)).catch(() => null);
    if (!actual || !actual.equals(buf)) faltan.push(r);
  }
  return faltan;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--revisar')) {
    const viejos = await revisar();
    if (viejos.length) { console.error('pages/vendor quedó viejo:', viejos.join(', '), '\nCorré node scripts/armar-pages.mjs'); process.exit(1); }
    console.log('pages/vendor al día');
  } else {
    const archivos = await esperado();
    for (const [r, buf] of archivos) { await mkdir(dirname(join(DESTINO, r)), { recursive: true }); await writeFile(join(DESTINO, r), buf); }
    const sobran = (await listar(DESTINO)).filter((r) => !archivos.has(r));
    if (sobran.length) console.warn('En pages/vendor hay archivos que no vienen de la charla:', sobran.join(', '));
    console.log(`pages/vendor: ${archivos.size} archivos`);
  }
}
