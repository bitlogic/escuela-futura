// Las herramientas de Escuela Futura sobre los datos sintéticos de ../data/escuela-futura.json.
// Las usa el servidor MCP (server.mjs, por stdio) y el servidor de la demo (servidor/), que las
// corre en proceso. Se relee el archivo en cada llamada, así se pueden editar los datos sin reiniciar.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = process.env.ESCUELA_FUTURA_DATA || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'escuela-futura.json');
export const load = () => JSON.parse(readFileSync(DATA, 'utf8'));

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function findStudent(db, q) {
  const n = norm(q);
  const e = db.estudiantes.find((x) => norm(x.id) === n) || db.estudiantes.find((x) => norm(x.nombre) === n) ||
    db.estudiantes.find((x) => norm(x.nombre).startsWith(n)) || db.estudiantes.find((x) => norm(x.nombre).includes(n));
  if (!e) throw new Error(`No encontré a "${q}". Usá buscar_estudiantes para ver ids y nombres.`);
  return e;
}
function findCourse(db, q) {
  const c = db.cursos.find((x) => norm(x.id) === norm(q) || norm(x.nombre) === norm(q));
  if (!c) throw new Error(`No existe el curso "${q}".`);
  return c;
}
// Las consultas por estudiante aceptan uno (`estudiante`), varios (`estudiantes`) o un curso entero
// (`curso`): una llamada para los 24, no 24 llamadas. Con `estudiante` devuelven el objeto solo;
// con lista o curso, `{ hoy, curso?, estudiantes: [...] }` con id y nombre en cada ítem.
const studentArg = {
  estudiante: { type: 'string', description: 'Un estudiante: id (e01) o nombre' },
  estudiantes: { type: 'array', items: { type: 'string' }, description: 'Varios estudiantes: ids o nombres' },
  curso: { type: 'string', description: 'Todos los estudiantes de un curso, ej. bio1 o Biología 1' },
};
const porEstudiante = (name, description, campo) => ({
  name, description: `${description} Para uno, varios o un curso entero.`,
  inputSchema: { type: 'object', properties: studentArg },
  run: (db, a) => {
    const uno = (e) => ({ estudiante: e.nombre, ...campo(db, e) });
    if (a.estudiante && !a.estudiantes && !a.curso) return uno(findStudent(db, a.estudiante));
    let lista, curso;
    if (a.estudiantes) lista = (Array.isArray(a.estudiantes) ? a.estudiantes : String(a.estudiantes).split(',')).map((q) => findStudent(db, q));
    else if (a.curso) { curso = findCourse(db, a.curso); lista = db.estudiantes.filter((e) => e.curso === curso.id); }
    else throw new Error('Indicá `estudiante`, `estudiantes` (lista) o `curso`.');
    return { hoy: db.hoy, ...(curso ? { curso: curso.nombre } : {}), estudiantes: lista.map((e) => ({ id: e.id, ...uno(e) })) };
  },
});

export const TOOLS = [
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
  porEstudiante('ver_asistencia', 'Asistencia por semana, resumen y cambios recientes. Para Bienestar.', (_db, e) => ({ ...e.asistencia, nota: e.asistencia_nota || null })),
  porEstudiante('ver_actividad_campus', 'Ingresos al campus virtual y entregas pendientes. Para Bienestar.', (db, e) => ({ hoy: db.hoy, ...e.campus })),
  porEstudiante('ver_alertas_previas', 'Alertas o intervenciones anteriores. Para Bienestar.', (_db, e) => ({ alertas_previas: e.alertas_previas })),
  porEstudiante('ver_uso_tutor', 'Consultas al tutor virtual por tema y ejercicios resueltos. Para el Tutor.', (_db, e) => ({ ...e.tutor })),
  porEstudiante('ver_notas', 'Notas de trabajos prácticos y parciales. Para el Tutor.', (_db, e) => ({ notas: e.notas })),
  porEstudiante('ver_situacion_administrativa', 'Inscripciones, cuotas impagas, becas, bloqueos y trámites abiertos. Para Advisor.', (db, e) => ({ hoy: db.hoy, ...e.administrativo })),
  porEstudiante('ver_ingresantes', 'Cómo ingresó cada estudiante: curso de ingreso, expectativa declarada, pedido de ayuda económica. Para Admisiones.', (_db, e) => ({ ...e.ingreso })),
  {
    name: 'ver_aspirantes',
    description: 'Aspirantes en curso para la próxima cohorte. Para Admisiones.',
    inputSchema: { type: 'object', properties: {} },
    run: (db) => ({ hoy: db.hoy, inscripcion_2027: db.inscripcion_2027 || null, aspirantes: db.aspirantes }),
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
    run: (db) => ({ hoy: db.hoy, demanda: db.demanda, detalle: db.demanda_detalle || null }),
  },
];

/** Corre una herramienta por nombre y devuelve el texto del resultado (o lanza si no existe). */
export function ejecutar(nombre, args = {}) {
  const tool = TOOLS.find((t) => t.name === nombre);
  if (!tool) throw new Error(`Herramienta desconocida: ${nombre}`);
  return JSON.stringify(tool.run(load(), args), null, 2);
}
