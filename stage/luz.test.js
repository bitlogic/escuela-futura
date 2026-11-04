// La luz cenital de la demo (stage/luz.js): se importa sin DOM y da una lámpara por sala física.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lamparasDe, INTENSIDAD, COLORES_CENITAL } from './luz.js';
import { SALAS } from './oficina.js';

test('lamparasDe da una lámpara por sala física del plano, dentro de su sala, y las intensidades existen por tema', () => {
  const l = lamparasDe(SALAS);
  const fisicas = new Set(Object.values(SALAS).filter((s) => s.fisica).map((s) => s.fisica.id));
  assert.equal(l.length, fisicas.size);
  for (const lam of l) { assert.ok(Number.isFinite(lam.x) && Number.isFinite(lam.y) && lam.rx > 0 && lam.ry > 0 && lam.clip, JSON.stringify(lam)); }
  for (const tema of ['oscuro', 'claro']) assert.ok(INTENSIDAD[tema], tema);
  assert.ok(COLORES_CENITAL.lampara.length === 3);
});
