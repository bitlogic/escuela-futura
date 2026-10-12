#!/usr/bin/env node
// Convierte una corrida exportada por buzz-probe en la línea de tiempo que usa stage/.
//
// Uso: node scripts/normalizar-corrida.mjs docs/corridas/<archivo>.json [--canal <id>] [--desde <epoch s>] [--salida <ruta>]
//
// Opcionalmente, un archivo <archivo>.extra.json al lado del original puede agregar
// mensajes de personas que el probe no capturó (se marcan como sintéticos).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizar } from '../stage/normalizar.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const entrada = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));
if (!entrada) { console.error('Falta el archivo de entrada.'); process.exit(1); }
const salida = flag('--salida') || join(ROOT, 'stage', 'corridas', basename(entrada).replace(/\.json$/, '.eventos.json'));
const canal = flag('--canal');
const desde = flag('--desde') ? Number(flag('--desde')) * 1000 : undefined;

const eventos = JSON.parse(readFileSync(entrada, 'utf8'));
const extra = entrada.replace(/\.json$/, '.extra.json');
if (existsSync(extra)) {
  for (const e of JSON.parse(readFileSync(extra, 'utf8'))) eventos.push({ ...e, _sintetico: true });
}

const agentes = JSON.parse(readFileSync(join(ROOT, 'stage', 'agentes.json'), 'utf8')).agentes;
const linea = normalizar(eventos, { agentes, canal, desde });
mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, JSON.stringify({ origen: basename(entrada), generado: new Date().toISOString(), eventos: linea }, null, 2) + '\n');
console.log(`${linea.length} eventos → ${salida}`);
for (const ev of linea) console.log(String(Math.round(ev.t / 1000)).padStart(4), ev.tipo.padEnd(11), ev.quien.padEnd(22), (ev.a || []).join(',').padEnd(24), (ev.texto || ev.herramienta || '').replace(/\s+/g, ' ').slice(0, 70));
