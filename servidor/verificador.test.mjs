// Tests del verificador de datos: texto contra texto, sin modelo. Correr: node --test servidor/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datosDe, fuenteDe, verificar, dudosos, conFuente } from './verificador.mjs';

const MARTINA = JSON.stringify({ hoy: '2026-11-05', curso: 'Biología 1', estudiantes: [{ id: 'e01', estudiante: 'Martina R.',
  resumen: { presentes: 9, clases: 26, porcentaje: 35, ultimas_5_semanas: { presentes: 2, clases: 10 }, desde_cambio: { desde: '2026-08-18', presentes: 5, clases: 22 } },
  nota: 'Hasta el 17/8 asistió a todas las clases. Desde el 18/8 faltó a la mayoría.',
  consultas: [{ tema: 'Genética mendeliana: cruzamientos', consultas: 14, ejercicios_resueltos: 3, ejercicios_totales: 10 }],
  notas: [{ evaluacion: 'Parcial 1', fecha: '2026-09-22', nota: 5.5 }],
  cuotas_impagas: [{ mes: '2026-08', vencio: '2026-08-10' }, { mes: '2026-09', vencio: '2026-09-10' }, { mes: '2026-10', vencio: '2026-10-10' }] }] });

test('datosDe: fechas, pares "N de M", números; ignora listas, menciones y nombres con número', () => {
  const d = datosDe('@Coordinación 1. Martina R.: 14 consultas, 3 de 10 resueltos, 5,5 en el Parcial 1; no rinde el 10/11. Biología 1.');
  assert.deepEqual(d.map((x) => [x.texto, x.clave, x.tipo]), [['14', '14', 'numero'], ['3 de 10', '3|10', 'par'], ['5,5', '5.5', 'numero'], ['10/11', '10/11', 'fecha']]);
  assert.deepEqual(datosDe('ids e01 y e03, hora 10:30').map((x) => x.texto), ['10', '30']);   // los ids pegados a letras no son datos
});

test('datosDe marca como derivado lo que es cálculo: "8 días", "los otros 23", "en 3 cuotas"', () => {
  const d = datosDe('la deuda arranca 8 días antes; los otros 23 vienen bien; propongo plan de pagos en 3 cuotas; 3 cuotas impagas; plan de 3 cuotas');
  assert.deepEqual(d.map((x) => [x.texto, x.derivado]), [['8', true], ['23', true], ['3', true], ['3', false], ['3', true]]);
});

test('fuenteDe: números, fechas ISO como d/m, fechas dentro de textos, largos de listas y pares con un total', () => {
  const f = fuenteDe(MARTINA);
  for (const c of ['14', '3', '10', '5.5', '35', '18/8', '17/8', '10/8', '22/9', '5/11', '3', '1']) assert.ok(f.claves.has(c), c);
  assert.ok(f.pares.has('3|10') && f.pares.has('2|10') && f.pares.has('5|22') && f.pares.has('9|26'));
  assert.ok(!f.pares.has('3|14'), 'consultas no es un total: 3 de 14 no es un par de la fuente');
  const t = fuenteDe('Anotada en el Tablero: plan de pagos (Martina R.), 3 cuotas desde el 10/8.');
  assert.ok(t.claves.has('3') && t.claves.has('10/8'));
});

test('verificar: verificado contra lo propio, citado de lo ajeno, no comprobado el par inventado, sin fuente lo demás', () => {
  const v = verificar('Martina R.: 14 consultas en cruzamientos, 3 de 10 resueltos, 5 de 22 clases desde el 18/8; 3 de 14 cruzamientos; 7 entregas; no rinde el 10/11.',
    { propias: [fuenteDe(MARTINA)], ajenas: [{ texto: 'Antes del parcial del 10/11, identificá quién está en riesgo.' }] });
  const por = Object.fromEntries(v.datos.map((d) => [d.texto, d.estado]));
  assert.equal(por['14'], 'verificado'); assert.equal(por['3 de 10'], 'verificado'); assert.equal(por['5 de 22'], 'verificado'); assert.equal(por['18/8'], 'verificado');
  assert.equal(por['3 de 14'], 'no_comprobado'); assert.equal(por['7'], 'sin_fuente'); assert.equal(por['10/11'], 'citado');
  assert.deepEqual(v.resumen, { verificados: 4, citados: 1, derivados: 0, noComprobados: 1, sinFuente: 1 });
  assert.deepEqual(dudosos(v), ['3 de 14', '7']); assert.equal(conFuente(v), 5);
});

test('verificar hereda el estado de lo citado: lo verificado por otro sigue verificado, la duda se propaga', () => {
  const advisor = verificar('Martina R.: 3 cuotas impagas desde el 10/8.', { propias: [fuenteDe(MARTINA)] });
  const tutor = verificar('Martina: 3 de 14 cruzamientos.', { propias: [fuenteDe(MARTINA)] });
  const coord = verificar('1. Martina R., riesgo alto: 3 cuotas desde el 10/8 (Advisor); 3 de 14 cruzamientos (Tutor).', { propias: [], ajenas: [{ texto: 'x', datos: advisor.datos }, { texto: 'y', datos: tutor.datos }] });
  const por = Object.fromEntries(coord.datos.map((d) => [d.texto, d.estado]));
  assert.equal(por['10/8'], 'verificado'); assert.equal(por['3'], 'verificado'); assert.equal(por['3 de 14'], 'no_comprobado');
});

test('sin fuentes, todo queda sin fuente; sin números, no hay datos', () => {
  assert.equal(verificar('Martina: 2 de 10 clases.').resumen.sinFuente, 1);
  assert.deepEqual(verificar('Dale. Reparto y vuelvo con una propuesta.').datos, []);
});
