// Lee el pack (pack/instructions.md + pack/agents/*.persona.md): la fuente de verdad de los agentes.
// Cada persona es un frontmatter YAML mínimo (escalares y listas de un nivel) más el prompt.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACK = join(dirname(fileURLToPath(import.meta.url)), '..', 'pack');

export function parsePersona(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('persona sin frontmatter');
  const meta = {};
  let lista = null;
  for (const line of m[1].split('\n')) {
    const item = line.match(/^\s+-\s*(.+)$/);
    if (item && lista) { meta[lista].push(item[1].replace(/^"(.*)"$/, '$1').trim()); continue; }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2] === '') { lista = kv[1]; meta[lista] = []; } else { lista = null; meta[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1'); }
  }
  return { meta, body: m[2].trim() };
}

/** @returns {{instrucciones: string, agentes: Array<{id, nombre, descripcion, prompt, herramientas: string[]}>}} */
export function cargarPack(dir = PACK) {
  const instrucciones = readFileSync(join(dir, 'instructions.md'), 'utf8').trim();
  const agentes = readdirSync(join(dir, 'agents')).filter((f) => f.endsWith('.persona.md')).sort().map((f) => {
    const { meta, body } = parsePersona(readFileSync(join(dir, 'agents', f), 'utf8'));
    if (!meta.name || !meta.display_name) throw new Error(`${f}: falta name o display_name`);
    return { id: meta.name, nombre: meta.display_name, descripcion: meta.description || '', prompt: body, herramientas: meta.tools || [] };
  });
  return { instrucciones, agentes };
}
