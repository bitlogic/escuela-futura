#!/usr/bin/env node
// Servidor MCP (stdio) con las herramientas de Escuela Futura, para usarlas desde Claude Code:
//   claude mcp add --scope user escuela-futura -- node <ruta>/mcp-escuela/server.mjs
// Sin dependencias: implementa lo mínimo del protocolo (initialize, tools/list, tools/call).
// Las herramientas viven en herramientas.mjs; el servidor de la demo las corre en proceso.

import { createInterface } from 'node:readline';
import { TOOLS, ejecutar } from './herramientas.mjs';

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return fail(null, -32700, 'JSON inválido'); }
  const { id, method, params } = msg;
  if (id === undefined) return; // notificación (p. ej. notifications/initialized)
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: params?.protocolVersion || '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'escuela-futura', version: '0.2.0' },
        instructions: 'Herramientas de Escuela Futura (datos sintéticos). Cada agente usa solo las de su rol.',
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      if (!TOOLS.some((t) => t.name === params?.name)) return fail(id, -32602, `Herramienta desconocida: ${params?.name}`);
      try {
        return reply(id, { content: [{ type: 'text', text: ejecutar(params.name, params.arguments || {}) }] });
      } catch (e) {
        return reply(id, { content: [{ type: 'text', text: e.message }], isError: true });
      }
    }
    default:
      return fail(id, -32601, `Método no soportado: ${method}`);
  }
});
