// La gente de perfil: los seis agentes, la persona que decide, Sofía y la gente del aula. Ver CONTRATO.md §3.2 y §4.
//
// Sprites de Pixel Agents (/stage/assets/personajes/char_N.png: 7 cuadros de 16×32, filas abajo / arriba / derecha).
// De perfil se usa la fila "derecha" y su espejo para la izquierda: cuadros 0..2 caminando, 3..4 sentado
// trabajando, 5..6 de pie trabajando (leyendo); el 1 es de pie quieto. La fila "arriba" (de espaldas) es para
// la gente del aula y para Sofía en la puerta.
//
// Las dependencias se inyectan (CONTRATO.md, ajustes de la oleada 0) para que el módulo se importe en Node sin DOM:
//   crearGente({ cargarImagen, MODELOS, plantas, teñir? }) → { tick(dt, estado), dibujar(ctx, estado), focoEn(estado), agentes, sofia, aulaGente, persona }
// Si una hoja no carga, ese personaje se dibuja como una silueta de color (el relleno de la oleada 0) y la escena sigue.

import * as ED from './edificio.js';

const { MUNDO, PUERTA, MARCAS, ESCALERA } = ED;

export const AGENTES = [
  { id: 'coordinacion', color: '#7a9bff' }, { id: 'tutor', color: '#f0c13f' }, { id: 'advisor', color: '#44c9b3' },
  { id: 'bienestar', color: '#f07fb0' }, { id: 'admisiones', color: '#e0b84a' }, { id: 'academia', color: '#6fd987' },
];
// Dónde vive cada agente (su puesto en el plano); Tutor trabaja en el aula y Advisor en la biblioteca.
const CASAS = { coordinacion: 'coordinacion', tutor: 'aula-bio1', advisor: 'biblioteca', bienestar: 'bienestar', admisiones: 'admisiones', academia: 'academia' };
const SOFIA_K = { sofia: [0, .25], chatgpt: [.25, .5], carrera: [.5, .85], entrevista: [.85, 1] };
export { SOFIA_K };
// El paseo por la calle (4/11): Sofía viene caminando por la vereda desde la izquierda hasta la puerta, proporcional a sofiaK (no al tiempo).
export const CALLE = { desde: 20, hasta: PUERTA.x + PUERTA.w / 2, y: MUNDO.SUELO + 34 };

const FILA = { abajo: 0, arriba: 1, perfil: 2 };
const VEL = 28, VEL_ESCALERA = 18, VEL_SOFIA = 22;        // px lógicos por segundo
const VEL_SOFIA_CALLE = 12;
// El saludo (gracias): los agentes salen por la puerta de a uno, se reparten por la vereda, saludan con el brazo y dicen "¡Gracias!".
const SALUDO_CADA = 1.1, SALUDO_PUESTOS = [-14, 14, -42, 42, -70, 70];   // segundos entre uno y otro; dónde se para cada uno respecto de la puerta
const SALUDO_TEXTO = '¡GRACIAS!';                               // por la vereda (láminas 4 a 7) va más despacio: camina casi toda la lámina en vez de llegar y quedarse parada
const ASIENTO_DX = -15;                                   // sin q.asiento de edificio.js: el que trabaja se sienta a la izquierda del escritorio, mirando a la derecha
const VISITA_DX = { der: [18, 30, -24], izq: [-22, -34, 30], biblioteca: [12, -34] };   // dónde se para el que visita, según de qué lado está el dueño
const FONDO = 30;                                         // cuánto "entra" el personaje en la escalera (sube hacia el fondo) antes de reaparecer en la otra planta
const PIEL = '#f1c9a5', PIEL_OSC = '#8a5a3c';
// Tonos de la gente del aula: las mismas combinaciones hoja/tono que los ESTUDIANTES de oficina.js (ver §4).
const TONOS_AULA = [[3, 0], [4, 90], [5, 200], [2, 150], [1, 40], [3, 260]];
const SOFIA_TONO = 230;                                   // la hoja 2 teñida: distinta de Advisor (sin teñir) y de Academia (120 y pelo violeta)
const azar = (a, b) => a + Math.random() * (b - a);

/** Rota el tono de una hoja (copia de personajes.js, para no depender de su export desde Node). desdeY deja la cabeza como está. */
export function teñirLocal(img, grados, desdeY = 0) {
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, cv.width, cv.height); const a = grados * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
  for (let i = 0; i < d.data.length; i += 4) {
    if ((((i / 4) / cv.width) | 0) % 32 < desdeY) continue;
    const R = d.data[i], G = d.data[i + 1], B = d.data[i + 2];
    d.data[i] = Math.max(0, Math.min(255, R * (.213 + cs * .787 - sn * .213) + G * (.715 - cs * .715 - sn * .715) + B * (.072 - cs * .072 + sn * .928)));
    d.data[i + 1] = Math.max(0, Math.min(255, R * (.213 - cs * .213 + sn * .143) + G * (.715 + cs * .285 + sn * .14) + B * (.072 - cs * .072 - sn * .283)));
    d.data[i + 2] = Math.max(0, Math.min(255, R * (.213 - cs * .213 - sn * .787) + G * (.715 - cs * .715 + sn * .715) + B * (.072 + cs * .928 + sn * .072)));
  }
  c.putImageData(d, 0, 0); return cv;
}
/** El pelo violeta de Academia (como peloVioleta de personajes.js, que no se exporta). */
export function peloVioleta(cv, hastaY = 13) {
  const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height);
  for (let i = 0; i < d.data.length; i += 4) {
    if ((((i / 4) / cv.width) | 0) % 32 >= hastaY || d.data[i + 3] === 0) continue;
    const R = d.data[i], G = d.data[i + 1], B = d.data[i + 2];
    if (R > 90 || G > 90 || B > 90) continue;
    const v = (R + G + B) / 3;
    d.data[i] = Math.min(255, v * 1.9 + 24); d.data[i + 1] = Math.min(255, v * 0.55 + 6); d.data[i + 2] = Math.min(255, v * 2.7 + 40);
  }
  c.putImageData(d, 0, 0); return cv;
}

export async function crearGente({ cargarImagen, MODELOS, plantas, teñir: teñirDep }) {
  const teñir = teñirDep || teñirLocal;
  const r = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };

  // ---------- Las hojas ----------
  const hojas = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => cargarImagen(`/stage/assets/personajes/char_${i}.png`).catch(() => null)));
  const conTono = (hoja, tono, desdeY) => { try { return hoja && tono ? teñir(hoja, tono, desdeY) : hoja; } catch { return hoja; } };
  hojas[6] = hojas[2] ? (() => { try { return peloVioleta(teñir(hojas[2], 120, 21)); } catch { return hojas[2]; } })() : null;   // Academia, como cargarHojas()
  const hojaDe = (id) => hojas[MODELOS[id] ?? 2] || null;
  const hojaSofia = conTono(hojas[2], SOFIA_TONO, 19);
  const hojasAula = TONOS_AULA.map(([m, t]) => conTono(hojas[m], t, 0));

  // ---------- El mundo ----------
  const pies = (planta) => (planta === 'baja' ? MUNDO.PB : MUNDO.PA);
  const techo = (planta) => (planta === 'baja' ? MUNDO.TECHO_BAJA : MUNDO.TECHO_ALTA);
  const puestos = [];
  for (const p of plantas) for (const q of p.puestos) puestos.push({ ...q, sala: p, planta: p.planta });
  const puesto = (id) => puestos.find((q) => q.id === id) || null;
  const hallAlto = plantas.find((p) => p.id === 'hall-alto');
  const aulaP = plantas.find((p) => p.id === 'p3') || plantas[0];
  // La escalera sube hacia el fondo (edificio.js la dibuja en perspectiva): el pie está en el hall de planta baja y se sale
  // por el descanso de planta alta. Si edificio.js exporta ESCALERA.pie / ESCALERA.cima, se usan.
  const PIE = ESCALERA.pie || { x: ESCALERA.x + ESCALERA.w / 2, y: MUNDO.PB };
  const CIMA = ESCALERA.cima || { x: hallAlto ? hallAlto.x + hallAlto.w / 2 - 1 : ESCALERA.x + ESCALERA.w / 2, y: MUNDO.PA };
  // Las cosas del agente de Coordinación para los focos: el estante, la pantalla y el cuaderno que edificio.js deja en el
  // puesto (rectángulos {x, y, w, h}); si no están, van en estas posiciones y gente.js dibuja el estante y el cuaderno.
  const qCoord = puesto('coordinacion');
  const centro = (m) => ({ x: m.x + (m.w || 0) / 2, y: m.y + (m.h || 0) / 2 });
  const MUEBLES = !qCoord ? null : qCoord.estante && qCoord.pantalla ? {
    estante: centro(qCoord.estante), pantalla: centro(qCoord.pantalla),
    cuaderno: qCoord.cuaderno ? { x: qCoord.cuaderno.x + (qCoord.cuaderno.w ? qCoord.cuaderno.w / 2 : 13), y: qCoord.cuaderno.h ? qCoord.cuaderno.y + qCoord.cuaderno.h / 2 : (qCoord.mesa ? qCoord.mesa.y : qCoord.cuaderno.y) - 1 } : centro(qCoord.pantalla),
  } : { estante: { x: qCoord.x - 30, y: MUNDO.TECHO_ALTA + 30 }, pantalla: { x: qCoord.x + 1, y: MUNDO.PA - 14 }, cuaderno: { x: qCoord.x + 10, y: MUNDO.PA - 12 }, propios: true };

  // ---------- Los personajes ----------
  // Dónde se sienta el dueño de un puesto: en q.asiento (la silla de edificio.js, a la derecha, mirando la pantalla) o, sin eso,
  // a la izquierda del escritorio mirando a la derecha. En la biblioteca, de pie frente al estante.
  const asiento = (q) => (!q.escritorio ? { x: q.x - 18, dir: 1 } : q.asiento != null ? { x: q.asiento, dir: -1 } : { x: q.x + ASIENTO_DX, dir: 1 });
  const agentes = AGENTES.map((a, i) => {
    const q = puesto(CASAS[a.id]);
    const s = q ? asiento(q) : { x: 300, dir: 1 };
    return { ...a, hoja: hojaDe(a.id), casa: q, x: s.x, y: q ? pies(q.planta) : MUNDO.PB, dir: s.dir, dirCasa: s.dir, fase: 'sentado', t: 3 + i * 1.7, habla: 0, responde: 0, paso: 0, ruta: [], dest: null, mision: null, papel: false, fondo: 0, vista: 0 };
  });
  const qDir = puesto('direccion');
  const sDir = qDir ? asiento(qDir) : { x: 150, dir: 1 };
  const persona = { x: sDir.x, y: MUNDO.PA, dir: sDir.dir, hoja: hojaDe('persona'), color: '#eeeeee' };
  const sofia = { x: PUERTA.x + PUERTA.w / 2, y: MUNDO.PB, k: 0, dir: 1, paso: 0, visible: false, color: '#ff4fd8', hoja: hojaSofia, estado: null, salio: false, moviendo: false };
  const xCalle = (k) => CALLE.desde + (CALLE.hasta - CALLE.desde) * Math.max(0, Math.min(1, k || 0));
  // El aula: tres filas de siete, sentados de espaldas; las filas de atrás un poco más arriba y corridas. Si edificio.js deja
  // los pupitres en la planta (p3.pupitres: [{ x, y }]), la gente se sienta ahí y no se dibujan pupitres propios.
  const aulaGente = [];
  const pupitresPropios = !aulaP.pupitres;
  {
    const sitios = aulaP.pupitres || null;
    const orden = [13, 4, 18, 9, 0, 15, 6, 11, 2, 19, 7, 16, 3, 12, 20, 8, 1, 14, 5, 17, 10];   // quién levanta la mano primero (repartido por el aula)
    for (let f = 2; f >= 0; f--) for (let i = 0; i < 7; i++) {
      const n = f * 7 + i;
      const s = sitios && sitios[n] ? sitios[n] : { x: aulaP.x + 10 + i * 16 + (f === 1 ? 8 : 0), y: MUNDO.PB - f * 5 };   // las filas de atrás, un poco más arriba y a tresbolillo
      aulaGente.push({ x: s.x, y: s.y, fila: f, sem: orden.indexOf(n) / 23, hoja: hojasAula[(n * 5 + f) % hojasAula.length], color: ['#8ab', '#c9a', '#9c8', '#bb9', '#a9c', '#9bc'][n % 6], brazo: 0 });
    }
  }

  // ---------- Rutas ----------
  const ocupados = new Map();                            // puesto visitado → id del agente
  const dentro = (q, x) => x - 8 >= q.sala.x + 2 && x + 8 <= q.sala.x + q.sala.w - 2;
  const spotVisita = (q, a) => {
    const lados = !q.escritorio ? VISITA_DX.biblioteca : asiento(q).dir < 0 ? VISITA_DX.izq : VISITA_DX.der;   // del otro lado del escritorio que el dueño
    for (const dx of lados) { const x = q.x + dx; if (!dentro(q, x)) continue; const o = ocupados.get(q.id); if (!o || o === a.id) return { x, dir: dx > 0 ? -1 : 1 }; }
    return null;
  };
  const plantaDe = (y) => (y <= (MUNDO.PA + MUNDO.PB) / 2 ? 'alta' : 'baja');
  const enEscalera = (a) => Math.abs(a.y - MUNDO.PA) > 1 && Math.abs(a.y - MUNDO.PB) > 1;
  /** Los puntos para ir de donde está el agente a (x, planta): por su planta y, si cambia de planta, por la escalera: entra de
   *  espaldas hacia el fondo (se desvanece) y reaparece de frente en la otra planta. */
  function rutaHacia(a, x, planta) {
    const pts = [], desde = plantaDe(a.y);
    if (desde !== planta) {
      const [de, hasta] = desde === 'baja' ? [PIE, CIMA] : [CIMA, PIE];
      pts.push({ x: de.x, y: de.y }, { x: de.x, y: de.y - FONDO, fondo: true }, { x: hasta.x, y: hasta.y - FONDO, salto: true }, { x: hasta.x, y: hasta.y, fondo: true });
    }
    pts.push({ x, y: pies(planta) });
    return pts.filter((p, i) => p.salto || Math.hypot(p.x - (i ? pts[i - 1].x : a.x), p.y - (i ? pts[i - 1].y : a.y)) > .5);
  }
  /** Avanza por la ruta; devuelve true al llegar. En la escalera va más despacio y "hacia el fondo" (a.fondo 0..1, a.vista ±1). */
  function avanzar(a, dt, vel = VEL) {
    let resto = vel * dt;
    while (resto > 0 && a.ruta.length) {
      const o = a.ruta[0];
      if (o.salto) { a.x = o.x; a.y = o.y; a.ruta.shift(); continue; }
      const dx = o.x - a.x, dy = o.y - a.y, d = Math.hypot(dx, dy);
      const v = o.fondo ? VEL_ESCALERA / vel : 1;
      if (o.fondo) a.vista = dy < 0 ? -1 : 1; else { a.vista = 0; if (Math.abs(dx) > .01) a.dir = dx > 0 ? 1 : -1; }
      const tramo = resto * v;
      if (d <= tramo) { a.x = o.x; a.y = o.y; a.ruta.shift(); resto -= d / v; a.paso += d; }
      else { a.x += (dx / d) * tramo; a.y += (dy / d) * tramo; a.paso += tramo; resto = 0; }
    }
    const piso = plantaDe(a.y) === 'baja' ? MUNDO.PB : MUNDO.PA;
    a.fondo = Math.max(0, Math.min(1, (piso - a.y) / FONDO));
    if (!a.ruta.length) { a.vista = 0; a.fondo = 0; }
    return a.ruta.length === 0;
  }
  const liberar = (a) => { if (a.dest && ocupados.get(a.dest.puesto.id) === a.id) ocupados.delete(a.dest.puesto.id); };
  function salirA(a, q, { mision = false } = {}) {
    const s = spotVisita(q, a); if (!s) return false;
    liberar(a); ocupados.set(q.id, a.id);
    a.dest = { puesto: q, x: s.x, dir: s.dir, mision }; a.ruta = rutaHacia(a, s.x, q.planta); a.fase = 'va'; return true;
  }
  function volver(a) { liberar(a); a.dest = null; a.ruta = rutaHacia(a, a.casa ? asiento(a.casa).x : 300, a.casa ? a.casa.planta : 'baja'); a.fase = 'vuelve'; }
  const candidatos = (a) => puestos.filter((q) => q.id !== (a.casa && a.casa.id) && !ocupados.has(q.id));
  /** La misión del agente de Coordinación según la lámina: a Secretaría con foco "autonomia"; a Dirección con el papel en "decision". */
  function misionDe(estado) {
    if (estado.foco === 'autonomia') return { puesto: 'secretaria', papel: false };
    if (estado.plano === 'oficina' && estado.oficina === 'direccion') return { puesto: 'direccion', papel: true };
    return null;
  }

  let reloj = 0;
  function tick(dt, estado) {
    reloj += dt;
    const quieto = !!estado.quieto, pausa = (estado.pausaLectura || 0) > 0;
    saludar(dt, estado);
    const focoCoord = !!estado.foco && estado.foco !== 'autonomia';       // con el foco en rol/skills/herramientas/memoria, Coordinación se queda en su puesto
    const enFoco = !!estado.foco;                                          // y mientras dura el foco ("agente"), los demás se quedan en su puesto: la atención va a Coordinación
    for (const a of agentes) {
      if (a.fase === 'saluda') continue;
      a.t -= dt; a.habla = Math.max(0, a.habla - dt);
      if (a.responde > 0) { a.responde -= dt; if (a.responde <= 0) a.habla = 1.5; }
      const esCoord = a.id === 'coordinacion';
      const mision = esCoord ? misionDe(estado) : null;
      a.papel = !!(mision && mision.papel && a.fase !== 'sentado');
      if (esCoord && mision && !enEscalera(a)) {
        const q = puesto(mision.puesto);
        if (q && !(a.dest && a.dest.puesto.id === q.id && a.dest.mision)) salirA(a, q, { mision: true });
      }
      if (a.fase === 'sentado') {
        if (quieto || pausa || (esCoord && focoCoord) || (!esCoord && enFoco)) { a.t = Math.max(a.t, 1); continue; }
        if (a.t <= 0) { const d = candidatos(a); if (!d.length || !salirA(a, d[Math.floor(Math.random() * d.length)])) a.t = 3; }
      } else if (a.fase === 'va') {
        if ((quieto || (esCoord && focoCoord && !mision) || (!esCoord && enFoco)) && !a.dest.mision && !enEscalera(a)) { volver(a); continue; }
        if (avanzar(a, dt)) {
          a.fase = 'visita'; a.dir = a.dest.dir; a.t = a.dest.mision ? Infinity : azar(2.5, 5); a.habla = 1.5; a.paso = 0;
          const dueño = agentes.find((b) => b.casa && b.casa.id === a.dest.puesto.id && b.fase === 'sentado');
          if (dueño) dueño.responde = 1.9;
        }
      } else if (a.fase === 'visita') {
        if (a.t <= 0 || ((quieto || (!esCoord && enFoco)) && !a.dest.mision) || (a.dest.mision && !mision)) volver(a);
      } else if (a.fase === 'vuelve') {
        if (avanzar(a, dt)) { a.fase = 'sentado'; a.dir = a.dirCasa; a.t = azar(4, 12); a.paso = 0; }
      }
    }
    // Sofía: entra por la puerta hasta la marca de 2022, recorre el hall según sofiaK (no con el tiempo), se para de espaldas al final
    // del hall, o sale por el patio hacia la derecha, una sola vez. Afuera (4/11): viene por la calle desde la izquierda hasta la
    // puerta según sofiaK ('calle') y se queda frente a la puerta, de espaldas a la cámara ('frente').
    const est = estado.sofia || null;
    const afuera = (e) => e === 'calle' || e === 'frente';
    if (est !== sofia.estado) {
      if (est !== 'sale') sofia.salio = false;   // si se vuelve atrás y se avanza de nuevo, Sofía sale otra vez
      if (est === 'entra') { sofia.x = PUERTA.x + PUERTA.w / 2; sofia.y = MUNDO.PB; sofia.dir = 1; sofia.salio = false; }
      else if (est === 'sale') { if (sofia.salio) { /* ya se fue: no vuelve a aparecer */ } else { sofia.x = PUERTA.x + PUERTA.w / 2; sofia.y = CALLE.y; sofia.dir = 1; } }
      else if (est === 'camina' && sofia.estado !== 'entra') { sofia.x = MARCAS[0] + (MARCAS[2] - MARCAS[0]) * (estado.sofiaK || 0); sofia.y = MUNDO.PB; }
      else if (est === 'puerta' && sofia.estado !== 'camina') { sofia.x = MARCAS[2] + 4; sofia.y = MUNDO.PB; }
      else if (est === 'calle' && !afuera(sofia.estado)) { sofia.x = CALLE.desde - 60; sofia.y = CALLE.y; sofia.dir = 1; }   // entra caminando desde fuera de cuadro
      else if (est === 'frente' && !afuera(sofia.estado)) { sofia.x = xCalle(1); sofia.y = CALLE.y; }
      sofia.estado = est;
    }
    sofia.visible = !!est && !(est === 'sale' && sofia.salio);
    sofia.moviendo = false;
    const irSofia = (tx) => { const dx = tx - sofia.x; if (Math.abs(dx) < .5) { sofia.x = tx; return; } sofia.dir = dx > 0 ? 1 : -1; const d = Math.min(Math.abs(dx), (est === 'calle' || est === 'frente' ? VEL_SOFIA_CALLE : VEL_SOFIA) * dt); sofia.x += sofia.dir * d; sofia.paso += d; sofia.moviendo = true; };
    if (est === 'entra') { sofia.y = MUNDO.PB; irSofia(MARCAS[0]); if (!sofia.moviendo) sofia.dir = 1; }
    else if (est === 'camina') { sofia.y = MUNDO.PB; irSofia(MARCAS[0] + (MARCAS[2] - MARCAS[0]) * (estado.sofiaK || 0)); if (!sofia.moviendo) sofia.dir = 1; }
    else if (est === 'puerta') { sofia.y = MUNDO.PB; irSofia(MARCAS[2] + 4); }
    else if (est === 'calle') { sofia.y = CALLE.y; irSofia(xCalle(estado.sofiaK)); if (!sofia.moviendo) sofia.dir = 1; }
    else if (est === 'frente') { sofia.y = CALLE.y; irSofia(xCalle(1)); }
    else if (est === 'sale' && !sofia.salio && !pausa) { irSofia(MUNDO.W + 20); if (sofia.x >= MUNDO.W + 10) sofia.salio = true; }   // mientras la sala lee el título (pausaLectura), Sofía espera en la puerta; después cruza
    // Las manos del aula suben una por una según la fracción pedida.
    const manos = estado.manos || 0;
    for (const g of aulaGente) { const obj = Math.max(0, Math.min(1, (manos - g.sem) / .06)); g.brazo += (obj - g.brazo) * Math.min(1, dt * 8); }
  }

  // ---------- El saludo (gracias) ----------
  // Con estado.saludo y el paso 1 ya en pantalla, cada agente espera su turno adentro, aparece en la puerta de calle, camina a su
  // lugar en la vereda, se da vuelta hacia la sala, saluda con el brazo y dice "¡Gracias!" en un globo; cada uno lo dice dos veces.
  // Después Coordinación dice la línea de CHARLA (los demás la miran), vuelven adentro por la puerta de a uno y, a medida que
  // entran, se prenden las luces (luzPedida). Si la lámina cambia (o se vuelve atrás), todos vuelven a su puesto.
  const puertaX = PUERTA.x + PUERTA.w / 2;
  const CHARLA = [['coordinacion', 'BUENO... VOLVAMOS A TRABAJAR.']];   // una sola línea (4/11): con eso alcanza; los demás la miran y entran
  const GRACIAS_VECES = 2;
  let globoHasta = 0;   // los globos van de a uno (una cola): dos vecinos hablando a la vez se tapaban
  const saludoG = { etapa: null, charlaI: 0, charlaT: 0, habla: null, entrados: 0 };   // etapa: 'saludo' | 'charla' | 'vuelven' | 'adentro'
  function saludar(dt, estado) {
    const activo = !!estado.saludo && (estado.paso || 0) >= 1;
    if (!activo) {
      for (const a of agentes) if (a.fase === 'saluda') sentar(a);
      Object.assign(saludoG, { etapa: null, charlaI: 0, charlaT: 0, habla: null, entrados: 0 });
      return;
    }
    if (!saludoG.etapa) saludoG.etapa = 'saludo';
    agentes.forEach((a, i) => {
      if (a.fase !== 'saluda' && saludoG.etapa === 'saludo') { liberar(a); a.dest = null; a.ruta = []; a.vista = 0; a.fondo = 0; a.habla = 0; a.fase = 'saluda'; a.saludo = { etapa: 'espera', t: .3 + i * SALUDO_CADA, destino: puertaX + SALUDO_PUESTOS[i % SALUDO_PUESTOS.length], habla: 0, ola: 0, dichos: 0, texto: SALUDO_TEXTO }; a.alfa = 0; }
      if (a.fase !== 'saluda') return;
      const s = a.saludo; s.t -= dt;
      if (s.etapa === 'espera') { if (s.t <= 0) { s.etapa = 'sale'; a.x = puertaX; a.y = CALLE.y; a.dir = s.destino < puertaX ? -1 : 1; a.paso = 0; } return; }
      if (s.etapa === 'sale') {
        a.alfa = Math.min(1, a.alfa + dt * 3);
        const dx = s.destino - a.x, d = Math.min(Math.abs(dx), VEL * dt); a.x += Math.sign(dx) * d; a.paso += d;
        if (Math.abs(s.destino - a.x) < .5) { a.x = s.destino; s.etapa = 'parado'; s.pendiente = true; s.ola = 3.5; s.t = Infinity; }
        return;
      }
      if (s.etapa === 'vuelve') {
        const dx = puertaX - a.x, d = Math.min(Math.abs(dx), VEL * dt); a.x += Math.sign(dx) * d; a.paso += d; a.dir = dx < 0 ? -1 : 1;
        if (Math.abs(dx) < 10) a.alfa = Math.max(0, a.alfa - dt * 3);   // se va fundiendo al entrar
        if (Math.abs(puertaX - a.x) < .5 && a.alfa <= 0) { sentar(a); saludoG.entrados++; if (saludoG.entrados >= agentes.length) saludoG.etapa = 'adentro'; }
        return;
      }
      // parado: en la vereda, mirando a la sala
      const hablaba = s.habla > 0;
      s.habla = Math.max(0, s.habla - dt); s.ola = Math.max(0, s.ola - dt);
      if (hablaba && s.habla <= 0 && saludoG.etapa === 'saludo' && s.dichos < GRACIAS_VECES) s.t = azar(2, 6);   // la segunda vez, después de una pausa
      if (s.t <= 0 && saludoG.etapa === 'saludo') { s.pendiente = true; s.t = Infinity; }
    });
    if (saludoG.etapa === 'saludo') {
      if (reloj >= globoHasta) {
        const a = agentes.find((b) => b.saludo && b.saludo.etapa === 'parado' && b.saludo.pendiente);
        if (a) { a.saludo.pendiente = false; a.saludo.texto = SALUDO_TEXTO; a.saludo.habla = 1.8; a.saludo.ola = Math.max(a.saludo.ola, 1.8); a.saludo.dichos++; globoHasta = reloj + 2.1; }
        else if (agentes.every((b) => b.saludo && b.saludo.etapa === 'parado' && b.saludo.dichos >= GRACIAS_VECES)) { saludoG.etapa = 'charla'; saludoG.charlaI = 0; saludoG.charlaT = 2; }
      }
    } else if (saludoG.etapa === 'charla') {
      saludoG.charlaT -= dt;
      if (reloj >= globoHasta && saludoG.charlaT <= 0) {
        if (saludoG.charlaI >= CHARLA.length) { saludoG.etapa = 'vuelven'; saludoG.habla = null; agentes.forEach((a, i) => { a.saludo.t = .6 + i * .9; }); }
        else {
          const [id, texto] = CHARLA[saludoG.charlaI++]; const a = agentes.find((b) => b.id === id); if (!a) return;
          const dur = 1.6 + texto.length * .07; a.saludo.texto = texto; a.saludo.habla = dur; saludoG.habla = a; globoHasta = reloj + dur + .4; saludoG.charlaT = .4;
        }
      }
    } else if (saludoG.etapa === 'vuelven') {
      for (const a of agentes) if (a.saludo && a.saludo.etapa === 'parado' && a.saludo.t <= 0) { a.saludo.etapa = 'vuelve'; a.saludo.habla = 0; a.saludo.ola = 0; a.paso = 0; }
    }
  }
  function sentar(a) { a.saludo = null; a.fase = 'sentado'; a.dir = a.dirCasa; a.x = a.casa ? asiento(a.casa).x : 300; a.y = a.casa ? pies(a.casa.planta) : MUNDO.PB; a.ruta = []; a.dest = null; a.t = azar(4, 12); a.alfa = 1; }
  /** Para luz.js: dónde están los que saludan en la vereda (halo y nitidez), o []. */
  function saludando() { return agentes.filter((a) => a.fase === 'saluda' && a.saludo && a.saludo.etapa !== 'espera' && a.alfa > 0).map((a) => ({ x: a.x, y: a.y - 10 })); }
  /** Para escena.js: cuánta luz interior pide el final del saludo (se prenden de a una a medida que entran), o null si no manda. */
  function luzPedida() { if (saludoG.etapa !== 'vuelven' && saludoG.etapa !== 'adentro') return null; return .06 + .52 * saludoG.entrados / agentes.length; }

  // ---------- Dibujo ----------
  function sprite(c, hoja, cuadro, fila, dir, x, y) {
    const sx = cuadro * 16, sy = fila * 32, dx = Math.round(x) - 8, dy = Math.round(y) - 32;
    if (dir < 0 && fila === FILA.perfil) { c.save(); c.translate(dx + 16, dy); c.scale(-1, 1); c.drawImage(hoja, sx, sy, 16, 32, 0, 0, 16, 32); c.restore(); }
    else c.drawImage(hoja, sx, sy, 16, 32, dx, dy, 16, 32);
  }
  /** Silueta de color cuando no hay hoja (el relleno de la oleada 0). */
  function silueta(c, x, y, color, paso, dir) {
    x = Math.round(x) - 3; y = Math.round(y);
    r(c, x + 1, y - 14, 4, 2, '#2a2436'); r(c, x + 1, y - 12, 4, 3, PIEL); r(c, x, y - 9, 6, 6, color);
    const f = Math.floor(paso / 4) % 2; r(c, x + (f ? 0 : 1), y - 3, 2, 3, '#1a1626'); r(c, x + (f ? 4 : 3), y - 3, 2, 3, '#1a1626');
    r(c, x + (dir > 0 ? 6 : -1), y - 8, 1, 3, '#2a2436');
  }
  const cuadroCaminar = (paso) => [0, 1, 2, 1][Math.floor(paso / 4) % 4];
  function personaje(c, p, { cuadro, fila = FILA.perfil, y = p.y, alfa = 1 }) {
    if (alfa <= 0) return;
    if (alfa < 1) { c.save(); c.globalAlpha = alfa; }
    if (p.hoja) sprite(c, p.hoja, cuadro, fila, p.dir, p.x, y); else silueta(c, p.x, y, p.color, cuadro === 1 ? 0 : p.paso || 0, p.dir);
    if (alfa < 1) c.restore();
  }
  function globo(c, x, y, color) {
    const bx = Math.round(x) - 6, by = Math.round(y) - 46;
    r(c, bx - 1, by - 1, 14, 12, '#1a1a2e'); r(c, bx, by, 12, 10, '#fff');
    const k = (reloj * 4 | 0) % 3; for (let i = 0; i < 3; i++) r(c, bx + 2 + i * 3, by + 4 - (i === k ? 1 : 0), 2, 2, i === k ? color : '#9a9aa8');
    r(c, bx + 4, by + 10, 4, 2, '#1a1a2e');
  }
  /** Un globo con texto en píxeles (el "¡Gracias!" del saludo), centrado sobre el personaje. */
  function globoTexto(c, x, y, t, color) {
    const w = ED.anchoCartel(t) + 6, h = 11, bx = Math.round(x) - (w >> 1), by = Math.round(y) - 48;
    r(c, bx - 1, by - 1, w + 2, h + 2, '#1a1a2e'); r(c, bx, by, w, h, '#fff'); r(c, bx, by, w, 1, color);
    ED.textoPixel(c, bx + 3, by + 2, t, '#1a1a2e'); r(c, Math.round(x) - 2, by + h, 4, 2, '#1a1a2e'); r(c, Math.round(x) - 1, by + h, 2, 1, '#fff');
  }
  /** El brazo que saluda: arriba y a medio bajar, alternando. */
  function brazoSaludo(c, a) { const alto = (reloj * 4 | 0) % 2 ? 9 : 6, x = Math.round(a.x) + 7, y0 = Math.round(a.y) - 19; r(c, x - 1, y0 - alto - 1, 4, alto + 2, PIEL_OSC); r(c, x, y0 - alto, 2, alto + 1, PIEL); r(c, x - 1, y0 - alto - 2, 4, 2, PIEL); }
  function sombra(c, x, y) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(Math.round(x) - 6, Math.round(y) - 1, 12, 2); }
  function papel(c, a) { const x = Math.round(a.x) + (a.dir > 0 ? 6 : -10), y = Math.round(a.y) - 17; r(c, x, y, 4, 5, '#f4efe2'); r(c, x + 1, y + 1, 2, 1, '#9a9aa8'); r(c, x + 1, y + 3, 2, 1, '#9a9aa8'); }
  /** El estante de Coordinación y el cuaderno sobre su escritorio (solo si edificio.js no los dibuja). */
  function cosasDeCoordinacion(c) {
    if (!MUEBLES || !MUEBLES.propios) return;
    const e = MUEBLES.estante; r(c, e.x - 8, e.y + 2, 16, 2, '#9e7544'); r(c, e.x - 8, e.y - 5, 16, 1, '#9e7544');
    [['#c9513f', 2], ['#3e6be8', 3], ['#e0b84a', 2], ['#5fae6a', 3], ['#f4efe2', 2]].reduce((x, [col, w]) => { r(c, x, e.y - 4, w, 6, col); return x + w + 1; }, e.x - 7);
    const n = MUEBLES.cuaderno; r(c, n.x - 3, n.y, 6, 2, '#2a2436'); r(c, n.x - 2, n.y - 1, 5, 2, '#f4efe2');
  }
  function pupitre(c, g) { if (!pupitresPropios) return; const x = Math.round(g.x), y = Math.round(g.y); r(c, x - 9, y - 10, 18, 2, '#9e7544'); r(c, x - 8, y - 8, 1, 8, '#6e4f2c'); r(c, x + 7, y - 8, 1, 8, '#6e4f2c'); }
  function estudiante(c, g) {
    const y = g.y + 3;
    if (g.hoja) sprite(c, g.hoja, 3, FILA.arriba, 1, g.x, y); else { r(c, g.x - 3, y - 12, 6, 8, '#1a1626'); r(c, g.x - 2, y - 15, 4, 3, PIEL); }
    if (g.brazo > .05) { const h = Math.round(g.brazo * 8), x = Math.round(g.x) + 6, y0 = Math.round(g.y) - 19; r(c, x - 1, y0 - h - 1, 4, h + 2, PIEL_OSC); r(c, x, y0 - h, 2, h + 1, PIEL); if (g.brazo > .9) r(c, x - 1, y0 - h - 2, 4, 2, PIEL); }
  }

  function dibujar(c, estado) {
    cosasDeCoordinacion(c);
    if (!estado.vacia) for (const g of aulaGente) { pupitre(c, g); estudiante(c, g); }   // de atrás hacia adelante: cada pupitre tapa al de la fila de atrás
    personaje(c, persona, { cuadro: 3 + ((reloj / .9 | 0) % 2), y: persona.y + 3 });
    for (const a of agentes) {
      if (a.fase === 'saluda') {
        const s = a.saludo; if (!s || s.etapa === 'espera') continue;
        if (s.etapa === 'sale' || s.etapa === 'vuelve') { if (a.alfa > .3) sombra(c, a.x, a.y); personaje(c, a, { cuadro: cuadroCaminar(a.paso), alfa: a.alfa }); continue; }
        const h = saludoG.habla;
        if (saludoG.etapa === 'charla' && h && h !== a && h.saludo && h.saludo.habla > 0) personaje(c, { ...a, dir: h.x < a.x ? -1 : 1 }, { cuadro: 1 });   // mira al que habla
        else personaje(c, a, { cuadro: 1, fila: FILA.abajo });
        if (s.ola > 0) brazoSaludo(c, a);   // el globo va en dibujarEncima: la pared de frente taparía lo que queda sobre la cabeza
        continue;
      }
      const camina = a.fase === 'va' || a.fase === 'vuelve';
      if (camina && a.vista) personaje(c, a, { cuadro: cuadroCaminar(a.paso), fila: a.vista < 0 ? FILA.arriba : FILA.abajo, alfa: 1 - a.fondo });   // en la escalera: hacia el fondo o saliendo de él
      else if (camina) { sombra(c, a.x, a.y); personaje(c, a, { cuadro: cuadroCaminar(a.paso) }); }
      else if (a.fase === 'sentado' && a.casa && a.casa.escritorio) personaje(c, a, { cuadro: 3 + ((reloj / .35 | 0) % 2), y: a.y + 3 });
      else if (a.fase === 'sentado') personaje(c, a, { cuadro: 5 + ((reloj / .9 | 0) % 2) });        // Advisor en la biblioteca: de pie, leyendo
      else personaje(c, a, { cuadro: 1 });
      if (a.papel) papel(c, a);
      if (a.habla > 0 && !camina) globo(c, a.x, a.y - (a.fase === 'sentado' && a.casa && a.casa.escritorio ? -3 : 0), a.color);
    }
    if (sofia.visible) {
      if ((sofia.estado === 'puerta' || sofia.estado === 'frente') && !sofia.moviendo) personaje(c, sofia, { cuadro: 1, fila: FILA.arriba });
      else { if (sofia.moviendo) sombra(c, sofia.x, sofia.y); personaje(c, sofia, { cuadro: sofia.moviendo ? cuadroCaminar(sofia.paso) : 1 }); }
    }
  }
  /** Lo que va por encima de la pared de frente: los globos de "¡Gracias!" de los que saludan en la vereda (la cabeza queda al ras del zócalo y el globo, sobre la pared). */
  function dibujarEncima(c, estado) {
    if (!estado.saludo) return;
    for (const a of agentes) if (a.fase === 'saluda' && a.saludo && a.saludo.etapa === 'parado' && a.saludo.habla > 0) globoTexto(c, a.x, a.y, a.saludo.texto || SALUDO_TEXTO, a.color);
  }
  /** Dónde poner el halo del foco en "agente" (coordenadas del mundo), o null. El halo lo dibuja luz.js. */
  function focoEn(estado) {
    const a = agentes[0]; if (!estado.foco || !a.casa || !MUEBLES) return null;
    const sobre = { x: a.x, y: a.y - 14 };
    return { rol: sobre, autonomia: sobre, skills: { x: MUEBLES.estante.x, y: MUEBLES.estante.y }, herramientas: { x: MUEBLES.pantalla.x, y: MUEBLES.pantalla.y }, memoria: { x: MUEBLES.cuaderno.x, y: MUEBLES.cuaderno.y } }[estado.foco] || null;
  }
  return { tick, dibujar, dibujarEncima, focoEn, saludando, luzPedida, agentes, sofia, aulaGente, persona, hojas };
}
