#!/usr/bin/env node
// Escribe stage/agentes-detalle.json: la ficha de cada agente (rol, prompt, herramientas) tal como la sirve
// GET /api/agentes, para que la página agente.html funcione sin servidor (grabación, hosting estático).
// Correr después de tocar pack/: node scripts/exportar-pack.mjs. Un test avisa si quedó vieja.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarPack } from '../servidor/personas.mjs';
import { fichasDeAgentes } from '../servidor/http.mjs';
import { TOOLS } from '../mcp-escuela/herramientas.mjs';
import { HERRAMIENTAS_TABLERO } from '../servidor/tablero.mjs';
import { HERRAMIENTA_LUGAR } from '../stage/herramientas.js';

export function fichasActuales() { return fichasDeAgentes(cargarPack(), [...TOOLS, ...HERRAMIENTAS_TABLERO], HERRAMIENTA_LUGAR); }
const salida = join(dirname(fileURLToPath(import.meta.url)), '..', 'stage', 'agentes-detalle.json');
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(salida, JSON.stringify(fichasActuales(), null, 1) + '\n');
  console.log('escrito', salida);
}
