#!/usr/bin/env node
// Arma dist/escuela-futura.team.json a partir del Persona Pack (pack/).
//
// El desktop de Buzz no importa Persona Packs; importa "team snapshots"
// (formato buzz-team-snapshot v1, ver desktop/src-tauri/src/managed_agents/team_snapshot.rs).
// Este script traduce el pack a ese formato para importarlo con
// Agents → Agent teams → Import. Sin dependencias.
//
// Uso: node scripts/build-team.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'pack');
const plugin = JSON.parse(readFileSync(join(PACK, '.plugin', 'plugin.json'), 'utf8'));

// Frontmatter YAML mínimo: claves de primer nivel con valores escalares.
function parsePersona(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('persona sin frontmatter');
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv && kv[2] !== '') meta[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1');
  }
  return { meta, body: m[2].trim() };
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

const members = plugin.personas.map((rel) => {
  const { meta, body } = parsePersona(readFileSync(join(PACK, rel), 'utf8'));
  let avatarDataUrl;
  if (meta.avatar) {
    const p = join(PACK, meta.avatar);
    avatarDataUrl = `data:${MIME[extname(p)] || 'image/png'};base64,${readFileSync(p).toString('base64')}`;
  }
  return {
    format: 'buzz-agent-snapshot',
    version: 1,
    definition: {
      name: meta.name,
      sourceIsBuiltin: false,
      systemPrompt: body,
      runtime: process.env.ESCUELA_RUNTIME || 'claude',
      ...(process.env.ESCUELA_MODEL ? { model: process.env.ESCUELA_MODEL } : {}),
      respondTo: 'anyone',
    },
    profile: {
      displayName: meta.display_name,
      about: meta.description,
      ...(avatarDataUrl ? { avatarDataUrl } : {}),
    },
    memory: { level: 'none' },
  };
});

const team = {
  format: 'buzz-team-snapshot',
  version: 1,
  team: {
    name: plugin.name,
    description: plugin.description,
    instructions: readFileSync(join(PACK, plugin.pack_instructions), 'utf8'),
  },
  members,
};

mkdirSync(join(ROOT, 'dist'), { recursive: true });
const out = join(ROOT, 'dist', 'escuela-futura.team.json');
writeFileSync(out, JSON.stringify(team, null, 2) + '\n');
console.log(`${members.length} agentes → ${out}`);
