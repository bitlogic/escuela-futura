#!/usr/bin/env node
// Servidor MCP (stdio) con las herramientas de Escuela Futura.
// Sin dependencias: implementa lo mínimo del protocolo (initialize, tools/list, tools/call).
// Lee los datos sintéticos de ../data/escuela-futura.json en cada llamada, así se pueden
// editar los datos sin reiniciar a los agentes.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const DATA = process.env.ESCUELA_FUTURA_DATA || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'escuela-futura.json');
const load = () => JSON.parse(readFileSync(DATA, 'utf8'));

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function findStudent(db, q) {
  const n = norm(q);
  const e = db.estudiantes.find((x) => norm(x.id) === n) || db.estudiantes.find((x) => norm(x.nombre) === n) ||
    db.estudiantes.find((x) => norm(x.nombre).startsWith(n)) || db.estudiantes.find((x) => norm(x.nombre).includes(n));
  if (!e) throw new Error(`No encontré a "${q}". Usá buscar_estudiantes para ver ids y nombres.`);
  return e;
}
const studentArg = { estudiante: { type: 'string', description: 'Id (e01) o nombre del estudiante' } };

const TOOLS = [
  {
    name: 'buscar_estudiantes',
    description: 'Lista los estudiantes de un curso (id, nombre, año). Para Coordinación.',
    inputSchema: { type: 'object', properties: { curso: { type: 'string', description: 'Id o nombre del curso, ej. bio1 o Biología 1' } } },
    run: (db, a) => {
      const c = a.curso ? db.cursos.find((x) => norm(x.id) === norm(a.curso) || norm(x.nombre) === norm(a.curso)) : db.cursos[0];
      if (!c) throw new Error(`No existe el curso "${a.curso}".`);
      return { curso: c.nombre, proxima_evaluacion: c.proxima_evaluacion, hoy: db.hoy,
        estudiantes: db.estudiantes.filter((e) => e.curso === c.id).map(({ id, nombre, anio }) => ({ id, nombre, anio })) };
    },
  },
  {
    name: 'ver_programa',
    description: 'Temas de la materia y qué evalúa la próxima evaluación. Para el Tutor.',
    inputSchema: { type: 'object', properties: { curso: { type: 'string' } } },
    run: (db, a) => { const c = db.cursos.find((x) => !a.curso || norm(x.id) === norm(a.curso) || norm(x.nombre) === norm(a.curso)) || db.cursos[0]; return { curso: c.nombre, programa: c.programa, proxima_evaluacion: c.proxima_evaluacion }; },
  },
  {
    name: 'ver_asistencia',
    description: 'Asistencia por semana, resumen y cambios recientes de un estudiante. Para Bienestar.',
    inputSchema: { type: 'object', properties: studentArg, required: ['estudiante'] },
    run: (db, a) => { const e = findStudent(db, a.estudiante); return { estudiante: e.nombre, ...e.asistencia, nota: e.asistencia_nota || null }; },
  },
  {
    name: 'ver_actividad_campus',
    description: 'Ingresos al campus virtual y entregas pendientes de un estudiante. Para Bienestar.',
    inputSchema: { type: 'object', properties: studentArg, required: ['estudiante'] },
    run: (db, a) => { const e = findStudent(db, a.estudiante); return { estudiante: e.nombre, hoy: db.hoy, ...e.campus }; },
  },
  {
    name: 'ver_alertas_previas',
    description: 'Alertas o intervenciones anteriores de un estudiante. Para Bienestar.',
    inputSchema: { type: 'object', properties: studentArg, required: ['estudiante'] },
    run: (db, a) => { const e = findStudent(db, a.estudiante); return { estudiante: e.nombre, alertas_previas: e.alertas_previas }; },
  },
  {
    name: 'ver_uso_tutor',
    description: 'Consultas al tutor virtual por tema y ejercicios resueltos de un estudiante. Para el Tutor.',
    inputSchema: { type: 'object', properties: studentArg, required: ['estudiante'] },
    run: (db, a) => { const e = findStudent(db, a.estudiante); return { estudiante: e.nombre, ...e.tutor }; },
  },
  {
    name: 'ver_notas',
    description: 'Notas de trabajos prácticos y parciales de un estudiante. Para el Tutor.',
    inputSchema: { type: 'object', properties: studentArg, required: ['estudiante'] },
    run: (db, a) => { const e = findStudent(db, a.estudiante); return { estudiante: e.nombre, notas: e.notas }; },
  },
  {
    name: 'ver_situacion_administrativa',
    description: 'Inscripciones, cuotas impagas, becas, bloqueos y trámites abiertos de un estudiante. Para Advisor.',
    inputSchema: { type: 'object', properties: studentArg, required: ['estudiante'] },
    run: (db, a) => { const e = findStudent(db, a.estudiante); return { estudiante: e.nombre, hoy: db.hoy, ...e.administrativo }; },
  },
  {
    name: 'ver_ingresantes',
    description: 'Cómo ingresó un estudiante: curso de ingreso, expectativa declarada, pedido de ayuda económica. Para Admisiones.',
    inputSchema: { type: 'object', properties: studentArg, required: ['estudiante'] },
    run: (db, a) => { const e = findStudent(db, a.estudiante); return { estudiante: e.nombre, ...e.ingreso }; },
  },
  {
    name: 'ver_aspirantes',
    description: 'Aspirantes en curso para la próxima cohorte. Para Admisiones.',
    inputSchema: { type: 'object', properties: {} },
    run: (db) => ({ aspirantes: db.aspirantes }),
  },
  {
    name: 'ver_oferta_academica',
    description: 'Programas vigentes de la escuela: nivel, duración, modalidad, cupo e inscriptos. Para Academia.',
    inputSchema: { type: 'object', properties: {} },
    run: (db) => ({ hoy: db.hoy, oferta: db.oferta }),
  },
  {
    name: 'ver_demanda_formativa',
    description: 'Temas que piden aspirantes, estudiantes, docentes y empresas, con la señal que los sostiene. Para Academia.',
    inputSchema: { type: 'object', properties: {} },
    run: (db) => ({ hoy: db.hoy, demanda: db.demanda }),
  },
];

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
        serverInfo: { name: 'escuela-futura', version: '0.1.0' },
        instructions: 'Herramientas de Escuela Futura (datos sintéticos). Cada agente usa solo las de su rol.',
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return fail(id, -32602, `Herramienta desconocida: ${params?.name}`);
      try {
        const out = tool.run(load(), params.arguments || {});
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        return reply(id, { content: [{ type: 'text', text: e.message }], isError: true });
      }
    }
    default:
      return fail(id, -32601, `Método no soportado: ${method}`);
  }
});
