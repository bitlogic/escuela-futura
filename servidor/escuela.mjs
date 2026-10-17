#!/usr/bin/env node
// Levanta Escuela Futura: los seis agentes sobre la API de Anthropic, el bus de menciones y la vista.
//
//   node servidor/escuela.mjs            # http://localhost:8080/stage/ (abre el navegador)
//   node servidor/escuela.mjs --puerto 9000 --sin-navegador
//
// Variables (en .env o en el entorno): ANTHROPIC_API_KEY (obligatoria), ESCUELA_MODEL (claude-opus-5-5),
// ESCUELA_EFFORT (medium), ESCUELA_PUERTO (8080), ESCUELA_DIRECTOR (Alfredo: el nombre de quien decide),
// ESCUELA_SIN_FALLBACK=1 para no reintentar en otro modelo.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import Anthropic from '@anthropic-ai/sdk';
import { cargarPack } from './personas.mjs';
import { crearResolutor } from './menciones.mjs';
import { crearBus } from './bus.mjs';
import { crearCorredor } from './agente.mjs';
import { crearHttp } from './http.mjs';
import { TOOLS, ejecutar } from '../mcp-escuela/herramientas.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

// .env sin dependencias: KEY=valor por línea; no pisa lo que ya está en el entorno.
const envFile = join(RAIZ, '.env');
if (existsSync(envFile)) for (const l of readFileSync(envFile, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valor = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const PUERTO = Number(valor('--puerto', process.env.ESCUELA_PUERTO || 8080));
const MODELO = process.env.ESCUELA_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.ESCUELA_EFFORT || 'medium';
// La persona que decide: su nombre se configura (ESCUELA_DIRECTOR); @Dirección la menciona igual.
const PERSONA = { id: 'persona:direccion', nombre: process.env.ESCUELA_DIRECTOR || 'Alfredo', alias: ['direccion', 'director', 'directora'] };

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Falta ANTHROPIC_API_KEY. Ponela en .env (ANTHROPIC_API_KEY=sk-ant-…) o en el entorno.');
  process.exit(1);
}

// Cada línea lleva la hora y los segundos desde el primer mensaje de la corrida (para medir el guion).
let inicioCorrida = null;
const log = (...a) => {
  if (a[0] === 'reinicio') inicioCorrida = null; else if (inicioCorrida == null && a[0] === 'msg') inicioCorrida = Date.now();
  const desde = inicioCorrida == null ? '' : `+${((Date.now() - inicioCorrida) / 1000).toFixed(1)}s`;
  console.log(new Date().toLocaleTimeString('es-AR', { hour12: false }), desde.padStart(7), ...a);
};
const pack = cargarPack();
const resolver = crearResolutor({ agentes: pack.agentes, persona: PERSONA });
const cliente = new Anthropic({ maxRetries: 4, timeout: 90_000 });
const corredor = crearCorredor({ cliente, modelo: MODELO, effort: EFFORT, instrucciones: pack.instrucciones.replaceAll('{{DIRECTOR}}', PERSONA.nombre), agentes: pack.agentes, herramientas: TOOLS, ejecutar, fallbacks: !process.env.ESCUELA_SIN_FALLBACK, log });
const bus = crearBus({ agentes: pack.agentes, persona: PERSONA, resolver, correrTurno: corredor.correrTurno, log });
const reiniciar = () => { corredor.reiniciar(); bus.reiniciar(); };
const http = crearHttp({ bus, reiniciar, info: { modelo: MODELO, persona: PERSONA.nombre }, log });

const puerto = await http.escuchar(PUERTO);
const url = `http://localhost:${puerto}/stage/`;
console.log(`Escuela Futura → ${url}   (${pack.agentes.length} agentes · ${MODELO} · effort ${EFFORT} · Ctrl+C para cortar)`);
if (!flag('--sin-navegador')) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  setTimeout(() => spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).on('error', () => {}).unref(), 400);
}
