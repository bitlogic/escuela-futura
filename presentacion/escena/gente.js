// La gente de perfil: los seis agentes, la persona que decide, Sofía y la gente del aula. Ver CONTRATO.md §3.2 y §4.
//
// RELLENO (oleada 0): personas de 6×14 píxeles de color, rutas por planta, globos. El agente "gente" de la
// oleada 1 lo reemplaza por los sprites de Pixel Agents (fila "derecha" y su espejo) manteniendo estas firmas:
//   crearGente({ cargarImagen, MODELOS, plantas }) → { tick(dt, estado), dibujar(ctx, estado), focoEn(estado), agentes, sofia, aulaGente }

import { MUNDO, PUERTA, MARCAS } from './edificio.js';

export const AGENTES = [
  { id: 'coordinacion', color: '#7a9bff' }, { id: 'tutor', color: '#f0c13f' }, { id: 'advisor', color: '#44c9b3' },
  { id: 'bienestar', color: '#f07fb0' }, { id: 'admisiones', color: '#e0b84a' }, { id: 'academia', color: '#6fd987' },
];
// Dónde vive cada agente (su puesto en el plano); Tutor y Advisor trabajan en el aula y en la biblioteca.
const CASAS = { coordinacion: 'coordinacion', tutor: 'aula-bio1', advisor: 'biblioteca', bienestar: 'bienestar', admisiones: 'admisiones', academia: 'academia' };
const SOFIA_K = { sofia: [0, .25], chatgpt: [.25, .5], carrera: [.5, .85], entrevista: [.85, 1] };
export { SOFIA_K };

export async function crearGente({ cargarImagen, MODELOS, plantas }) {
  void cargarImagen; void MODELOS;                             // los sprites llegan en la oleada 1
  const puesto = (id) => { for (const p of plantas) for (const q of p.puestos) if (q.id === id) return { ...q, planta: p }; return null; };
  const pies = (p) => (p.planta === 'baja' ? MUNDO.PB : MUNDO.PA);
  const hall = plantas.find((p) => p.id === 'hall');
  const agentes = AGENTES.map((a, i) => { const q = puesto(CASAS[a.id]); return { ...a, casa: q, x: q ? q.x + 10 : 300, y: q ? pies(q.planta) : MUNDO.PB, planta: q ? q.planta.planta : 'baja', dir: 1, fase: 'sentado', t: 2 + i * 1.3, habla: 0, paso: 0, dest: null }; });
  const persona = { x: (puesto('direccion') || { x: 150 }).x - 2, y: MUNDO.PA, color: '#eeeeee' };
  const sofia = { x: PUERTA.x + 8, y: MUNDO.PB, k: 0, dir: 1, paso: 0, visible: false, color: '#ff4fd8', xSalida: 0 };
  const aulaP = plantas.find((p) => p.id === 'p3') || plantas[0];
  const aulaGente = []; for (let f = 0; f < 3; f++) for (let i = 0; i < 6; i++) aulaGente.push({ x: aulaP.x + 24 + i * 24 + f * 3, y: MUNDO.PB - f * 2, sem: (i * 7 + f * 3) % 10, color: ['#8ab', '#c9a', '#9c8', '#bb9', '#a9c', '#9bc'][i] });

  const destinos = (a) => plantas.filter((p) => p.fisica && p.planta === a.planta && p.id !== (a.casa ? a.casa.planta.id : null)).flatMap((p) => p.puestos.map((q) => ({ x: q.x - 14, planta: p })));
  const ir = (a, tx, v) => { a.dir = tx > a.x ? 1 : -1; if (Math.abs(tx - a.x) <= v) { a.x = tx; return true; } a.x += a.dir * v; a.paso += v * .5; return false; };

  function tick(dt, estado) {
    const quieto = !!estado.quieto, pausa = (estado.pausaLectura || 0) > 0;
    for (const a of agentes) {
      a.t -= dt; a.habla = Math.max(0, a.habla - dt);
      if (a.fase === 'sentado') { if (quieto || pausa) continue; if (a.t <= 0) { const d = destinos(a); if (!d.length) { a.t = 3; continue; } a.dest = d[Math.floor(Math.random() * d.length)]; a.fase = 'va'; } }
      else if (a.fase === 'va') { if (ir(a, a.dest.x, 26 * dt)) { a.fase = 'visita'; a.t = 2 + Math.random() * 3; a.habla = 1.5; } }
      else if (a.fase === 'visita') { if (a.t <= 0 || quieto) { a.fase = 'vuelve'; } }
      else if (a.fase === 'vuelve') { if (ir(a, a.casa ? a.casa.x + 10 : 300, 26 * dt)) { a.fase = 'sentado'; a.t = 3 + Math.random() * 5; a.habla = 1.2; } }
    }
    // Sofía: entra por la puerta hasta la marca de 2022, recorre el hall según sofiaK, se para en la puerta, o sale por el patio.
    sofia.visible = !!estado.sofia;
    if (estado.sofia === 'entra' || estado.sofia === 'camina') { const tx = MARCAS[0] + (MARCAS[2] - MARCAS[0]) * (estado.sofiaK || 0); sofia.y = MUNDO.PB; if (!ir(sofia, tx, 22 * dt)) sofia.dir = tx > sofia.x ? 1 : -1; }
    else if (estado.sofia === 'puerta') { sofia.y = MUNDO.PB; ir(sofia, MARCAS[2] + 6, 22 * dt); }
    else if (estado.sofia === 'sale') { sofia.y = MUNDO.PB + 6; if (sofia.x < PUERTA.x) sofia.x = PUERTA.x + 4; ir(sofia, 640, 20 * dt); }
  }
  function persona6(c, x, y, color, paso, dir) {
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = '#2a2436'; c.fillRect(x + 1, y - 14, 4, 2); c.fillStyle = '#f1c9a5'; c.fillRect(x + 1, y - 12, 4, 3);
    c.fillStyle = color; c.fillRect(x, y - 9, 6, 6);
    const f = Math.floor(paso) % 2; c.fillStyle = '#1a1626'; c.fillRect(x + (f ? 0 : 1), y - 3, 2, 3); c.fillRect(x + (f ? 4 : 3), y - 3, 2, 3);
    c.fillStyle = '#2a2436'; c.fillRect(x + (dir > 0 ? 6 : -1), y - 8, 1, 3);
  }
  function dibujar(c, estado) {
    if (!estado.vacia) for (const g of aulaGente) { c.fillStyle = '#1a1626'; c.fillRect(g.x, g.y - 12, 6, 8); c.fillStyle = '#f1c9a5'; c.fillRect(g.x + 1, g.y - 15, 4, 3); if ((estado.manos || 0) > g.sem / 10) { c.fillStyle = '#f1c9a5'; c.fillRect(g.x + 6, g.y - 20, 2, 9); } }
    persona6(c, persona.x, persona.y, persona.color, 0, 1);
    for (const a of agentes) { persona6(c, a.x, a.y, a.color, a.fase === 'va' || a.fase === 'vuelve' ? a.paso : 0, a.dir); if (a.habla > 0 && (a.fase === 'visita' || a.fase === 'sentado')) { c.fillStyle = '#fff'; c.fillRect(a.x - 2, a.y - 21, 10, 5); c.fillStyle = a.color; for (const d of [0, 3, 6]) c.fillRect(a.x + d, a.y - 19, 1, 1); } }
    if (sofia.visible) persona6(c, sofia.x, sofia.y, sofia.color, sofia.paso, sofia.dir);
  }
  /** Dónde poner el halo del foco en "agente" (coordenadas del mundo), o null. */
  function focoEn(estado) {
    const a = agentes[0], q = a.casa; if (!estado.foco || !q) return null;
    const y1 = MUNDO.PA;
    return { rol: { x: a.x + 3, y: y1 - 8 }, skills: { x: q.planta.x + 20, y: MUNDO.TECHO_ALTA + 28 }, herramientas: { x: q.x, y: y1 - 14 }, memoria: { x: q.x - 8, y: y1 - 12 }, autonomia: { x: a.x + 3, y: y1 - 8 } }[estado.foco] || null;
  }
  return { tick, dibujar, focoEn, agentes, sofia, aulaGente, persona };
}
