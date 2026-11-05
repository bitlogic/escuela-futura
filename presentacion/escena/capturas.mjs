// Capturas de la charla con escena: las 22 láminas a 1920×1080 (y el giro a mitad de camino), para revisar y para la crítica.
// Levanta el servidor de la charla solo (sin escuela) en el puerto 8091, saca las capturas y lo cierra.
//
//   node presentacion/escena/capturas.mjs                 # evaluaciones/escena/<fecha>/
//   node presentacion/escena/capturas.mjs --plano         # también sin HD-2D (?plano=1)
//   node presentacion/escena/capturas.mjs --solo cover,tesis --puerto 8095 --salida /tmp/caps
//   node presentacion/escena/capturas.mjs --banco "plano=hall&sofia=camina&sofiaK=.5"   # una captura del banco con ese estado

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, '..', '..');
const args = process.argv.slice(2);
const flag = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const puerto = Number(flag('--puerto', 8091));
const fecha = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const salida = flag('--salida', join(RAIZ, 'evaluaciones', 'escena', fecha));
const conPlano = !!flag('--plano', false);
const solo = flag('--solo') ? String(flag('--solo')).split(',') : null;
const banco = flag('--banco');
mkdirSync(salida, { recursive: true });

const { chromium } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'playwright', 'index.mjs')).href);
const servidor = spawn(process.execPath, [join(RAIZ, 'presentacion', 'servidor.mjs'), '--sin-escuela', '--sin-navegador', '--puerto', String(puerto)], { cwd: RAIZ, stdio: 'ignore' });
const base = `http://localhost:${puerto}`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/deck.json')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
const errores = [];
// Sin escuela, /api/eventos contesta 502 y la vista embebida cae a la grabación: ese error es esperado y no se cuenta.
pagina.on('pageerror', (e) => errores.push(String(e))); pagina.on('console', (m) => { if (m.type() === 'error' && !/502/.test(m.text())) errores.push(m.text()); });
const espera = (ms) => pagina.waitForTimeout(ms);

try {
  if (banco) {
    await pagina.goto(`${base}/escena/banco.html?${banco}&panel=0`, { waitUntil: 'networkidle' }); await espera(2500);
    await pagina.screenshot({ path: join(salida, 'banco.png') });
  } else {
    const deck = JSON.parse(readFileSync(join(RAIZ, 'presentacion', 'deck.json'), 'utf8'));
    const ids = solo || deck.order;
    for (const modo of conPlano ? ['hd', 'plano'] : ['hd']) {
      for (const id of ids) {
        const n = deck.order.indexOf(id) + 1;
        await pagina.goto(`${base}/?lamina=${id}&auto=0${modo === 'plano' ? '&plano=1' : ''}`, { waitUntil: 'networkidle' }); await espera(3000);
        await pagina.screenshot({ path: join(salida, `${String(n).padStart(2, '0')}-${id}${modo === 'plano' ? '-plano' : ''}.png`) });
        // los pasos de la lámina, si tiene
        const pasos = await pagina.evaluate(() => document.querySelectorAll('.lienzo section.actual [data-paso]').length ? Math.max(...[...document.querySelectorAll('.lienzo section.actual [data-paso]')].map((e) => Number(e.dataset.paso) || 0)) : 0);
        for (let p = 1; p <= pasos; p++) { await pagina.keyboard.press('ArrowRight'); await espera(1200); await pagina.screenshot({ path: join(salida, `${String(n).padStart(2, '0')}-${id}-paso${p}${modo === 'plano' ? '-plano' : ''}.png`) }); }
      }
    }
    // el giro, a mitad de camino y al final
    if (!solo || solo.includes('vivo')) {
      await pagina.goto(`${base}/?lamina=escuela&auto=0`, { waitUntil: 'networkidle' }); await espera(2500);
      // "escuela" tiene pasos: se pasan primero, y el PageDown siguiente es el que entra a "vivo" con el giro
      const pasosEscuela = await pagina.evaluate(() => Math.max(0, ...[...document.querySelectorAll('.lienzo section.actual [data-paso]')].map((e) => Number(e.dataset.paso) || 0)));
      for (let p = 0; p < pasosEscuela; p++) { await pagina.keyboard.press('PageDown'); await espera(400); }
      await pagina.keyboard.press('PageDown'); await espera(450); await pagina.screenshot({ path: join(salida, 'giro-mitad.png') });
      await espera(1500); await pagina.screenshot({ path: join(salida, 'giro-fin.png') });
      await pagina.keyboard.press('PageDown'); await espera(1600); await pagina.screenshot({ path: join(salida, 'giro-vuelta.png') });
    }
  }
} finally {
  await navegador.close(); servidor.kill();
}
console.log(`capturas en ${salida}`);
if (errores.length) { console.log('errores de consola:'); for (const e of errores) console.log(' ', e); process.exitCode = 1; } else console.log('sin errores de consola');
