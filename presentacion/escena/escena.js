// La escena: orquesta el mundo detrás de las láminas. Lee data-escena y data-placa de cada lámina, interpola el
// estado (CONTRATO.md §3.2), mueve la cámara y la gente, dibuja el mundo en pixel-art y lo compone con la luz,
// y hace el giro hacia la demo. Se detiene mientras la demo está en pantalla o la pestaña no se ve.

import { crearCamara, PLANOS } from './camara.js';
import { crearEdificio, MUNDO, MARCAS, MARCAS_Y } from './edificio.js';
import { crearGente, SOFIA_K } from './gente.js';
import { crearLuz } from './luz.js';
import { crearGiro } from './giro.js';
import { crearSonido } from './sonido.js';

export const PLACAS = ['izq', 'der', 'abajo', 'plena', 'ninguna'];   // plena: placa entera sobre la escena, que queda como textura
/** Las claves que puede traer data-escena (además del plano). */
export const CLAVES = ['plano', 'camx', 'camy', 'zoom', 'hora', 'fachada', 'luzInterior', 'sofia', 'manos', 'vacia', 'quieto', 'foco', 'oficina', 'esfera', 'giro'];
export const SOFIAS = ['entra', 'camina', 'puerta', 'sale'];
export { SENALES };
export const FOCOS = ['rol', 'skills', 'herramientas', 'memoria', 'autonomia'];
const PLACA_COLOR = { oscura: '#0B0920', clara: '#F3F0FF' };
const SEGUNDOS_LECTURA = 5;
// Las señales que suenan al entrar a una lámina (solo yendo hacia adelante, nunca al abrir en ella): el timbre y el motivo
// al revés cuando Sofía entra, las luces con la tesis, el motivo al derecho con la esfera en 2026 y en el cierre.
const SENALES = {
  sofia: (s) => { s.timbre(); return setTimeout(() => s.motivo(false), 1200); },   // devuelve el timer: se cancela si se cambia de lámina antes
  tesis: (s) => s.luces(),
  recibe: (s) => s.motivo(true),
  cierre: (s) => s.motivo(true),
};

/** Parsea un data-escena; devuelve el objeto o lanza con el motivo (lo usan la app y los tests). */
export function leerEscena(texto) {
  if (!texto) return null;
  const e = JSON.parse(texto);
  if (!PLANOS[e.plano]) throw new Error(`plano desconocido: ${e.plano}`);
  for (const k of Object.keys(e)) if (!CLAVES.includes(k)) throw new Error(`clave desconocida en data-escena: ${k}`);
  if (e.sofia && !SOFIAS.includes(e.sofia)) throw new Error(`sofia desconocida: ${e.sofia}`);
  if (e.foco && e.foco !== 'pasos' && !FOCOS.includes(e.foco)) throw new Error(`foco desconocido: ${e.foco}`);
  if (e.oficina && !['coordinacion', 'direccion'].includes(e.oficina)) throw new Error(`oficina desconocida: ${e.oficina}`);
  return e;
}
/** Parsea un data-placa ("izq", "der clara", "abajo propia") → { pos, clara, propia }. */
export function leerPlaca(texto) {
  const partes = (texto || 'izq').trim().split(/\s+/);
  const pos = partes[0];
  if (!PLACAS.includes(pos)) throw new Error(`placa desconocida: ${pos}`);
  for (const p of partes.slice(1)) if (!['clara', 'propia', 'fija'].includes(p)) throw new Error(`modificador de placa desconocido: ${p}`);
  return { pos, clara: partes.includes('clara'), propia: partes.includes('propia'), fija: partes.includes('fija') };   // fija: no mide el texto, queda la placa del CSS
}

const lerp = (a, b, k) => a + (b - a) * k;
const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export async function crearEscena({ canvas, placa, capaDemo, iframeDemo = null, lienzo: lienzoLaminas = null, deps, opciones = {}, alFallar = null }) {
  const { SALAS, TEMAS, MODELOS, cargarImagen } = deps;
  const op = { hd: true, sinEscena: false, mudo: false, simple: false, ...opciones };
  const camara = crearCamara();
  const edificio = crearEdificio({ SALAS, TEMAS });
  const gente = await crearGente({ cargarImagen, MODELOS, plantas: edificio.plantas });
  const luz = crearLuz(canvas); luz.hd = op.hd;
  const giro = crearGiro({ canvasEscena: canvas, capaDemo, iframeDemo, simple: op.simple || !op.hd });
  const sonido = crearSonido(); if (op.mudo) sonido.silenciar(true);

  const mundo = lienzo(MUNDO.W, MUNDO.H), fachada = lienzo(MUNDO.W, MUNDO.H), lejana = lienzo(MUNDO.W, MUNDO.H), cercana = lienzo(MUNDO.W, MUNDO.H);
  edificio.capaLejana(lejana.getContext('2d')); edificio.capaCercana(cercana.getContext('2d'));
  const mc = mundo.getContext('2d'), fc = fachada.getContext('2d');
  // Lo estático se dibuja una vez; el interior y la fachada, solo cuando cambia la hora o la luz (cuantizadas): por cuadro queda un drawImage y la gente.
  const fondo = lienzo(MUNDO.W, MUNDO.H), interior = lienzo(MUNDO.W, MUNDO.H); let fondoListo = false, claveInterior = '', claveFachada = '';
  const claveDe = (estado) => `${Math.round(estado.hora * 100)}|${estado.luzInterior > .3 ? 1 : 0}|${Math.round(estado.luzInterior * 20)}`;
  function dibujarMundo(estado) {
    if (!fondoListo) { edificio.dibujarFondo(fondo.getContext('2d'), estado); fondoListo = true; }
    const clave = claveDe(estado);
    if (clave !== claveInterior) { const ic = interior.getContext('2d'); ic.clearRect(0, 0, MUNDO.W, MUNDO.H); edificio.dibujarInterior(ic, estado); claveInterior = clave; }
    if (estado.fachada > .01 && clave !== claveFachada) { edificio.dibujarFachada(fc, estado); claveFachada = clave; }
    mc.clearRect(0, 0, MUNDO.W, MUNDO.H); mc.drawImage(fondo, 0, 0); mc.drawImage(interior, 0, 0); gente.dibujar(mc, estado);
  }

  // El estado que no lleva la cámara: lo que la escena interpola o fija por lámina.
  const cur = { luzInterior: 1, sofiaK: 0, manos: 0, pausaLectura: 0 };
  const obj = { luzInterior: 1, sofiaK: 0, manos: 0 };
  const fijo = { plano: null, sofia: null, vacia: false, quieto: false, foco: null, oficina: 'coordinacion', esfera: false, placa: 'ninguna', placaClara: false, paso: 0, giro: false };
  let activa = false, lamina = null, demoVisible = false, parada = false, ultimo = 0, rafId = 0, fin = null, indiceAnterior = -1, senalDiferida = 0, vigia = null, observador = null;

  // ---------- Qué pide cada lámina ----------
  function objetivoDe(l, paso) {
    const e = l.escena, pl = leerPlaca(l.placa);
    const pasos = Math.max(1, l.pasos || 0);
    const sofiaK = e.sofia ? (() => { const [a, b] = SOFIA_K[l.id] || [0, 1]; return l.pasos ? a + (b - a) * (paso / pasos) : (e.sofia === 'entra' ? a + (b - a) * .9 : b); })() : cur.sofiaK;
    const manos = e.manos === 'pasos' ? ([0, 1, .15][paso] ?? 1) : (e.manos ?? 0);
    const foco = e.foco === 'pasos' ? ([null, ...FOCOS][paso] ?? null) : (e.foco ?? null);
    return { e, pl, sofiaK, manos, foco, luzInterior: e.luzInterior ?? 1 };
  }
  const MARGEN_PLACA = 48, RAMPA_PLACA = 80, TOPE_PLACA = .72;
  // Dónde termina el texto de la lámina (coordenadas del lienzo de 1920×1080): los textos sin fondo propio, con sus pasos incluidos.
  function medirTexto(section) {
    const sr = section.getBoundingClientRect(); const s = sr.width / 1920; if (!s) return null;
    // Se saltean los textos con fondo propio (tarjetas) y los que están pineados (la línea de tiempo al pie, las marcas de agua): no piden placa.
    const conFondo = (el) => { for (let e = el; e && e !== section; e = e.parentElement) { const st = getComputedStyle(e); if (st.position === 'absolute' || (st.backgroundColor && st.backgroundColor !== 'rgba(0, 0, 0, 0)' && st.backgroundColor !== 'transparent') || (st.backgroundImage && st.backgroundImage !== 'none')) return true; } return false; };
    let right = 0, left = 1920, top = 1080, hay = false;
    for (const el of section.querySelectorAll('h1, h2, h3, p, li')) {
      if (!el.textContent.trim() || el.closest('[data-marca-agua]') || conFondo(el)) continue;
      // el texto real, no la caja (en una columna flex un <p> ocupa todo el ancho aunque diga dos palabras)
      const rango = document.createRange(); rango.selectNodeContents(el); const r = rango.getBoundingClientRect(); if (!r.width) continue;
      hay = true; right = Math.max(right, (r.right - sr.left) / s); left = Math.min(left, (r.left - sr.left) / s); top = Math.min(top, (r.top - sr.top) / s);
    }
    return hay ? { right, left, top, s, ox: sr.left, oy: sr.top } : null;
  }
  let placaActual = null;
  function aplicarPlaca(l, pl) {
    placaActual = { l, pl };
    let pos = pl.pos;
    const m = !pl.fija && (pos === 'izq' || pos === 'der' || pos === 'abajo') ? medirTexto(l.section) : null;
    if (m) {
      const frac = pos === 'izq' ? (m.right + MARGEN_PLACA) / 1920 : pos === 'der' ? 1 - (m.left - MARGEN_PLACA) / 1920 : 1 - (m.top - MARGEN_PLACA) / 1080;
      if (frac > TOPE_PLACA) pos = 'plena';
    }
    placa.className = 'pos-' + pos + (pl.clara ? ' clara' : '') + (pos === 'ninguna' ? '' : ' visible');
    placa.style.background = pl.propia ? (l.section.style.background || PLACA_COLOR.oscura) : (pl.clara ? PLACA_COLOR.clara : PLACA_COLOR.oscura);
    let mascara = '';
    if (m && pos !== 'plena') {
      const rampa = RAMPA_PLACA * m.s;
      if (pos === 'izq') { const borde = m.ox + (m.right + MARGEN_PLACA) * m.s; mascara = `linear-gradient(90deg, #000 0, #000 ${borde}px, transparent ${borde + rampa}px)`; }
      else if (pos === 'der') { const borde = innerWidth - (m.ox + (m.left - MARGEN_PLACA) * m.s); mascara = `linear-gradient(270deg, #000 0, #000 ${borde}px, transparent ${borde + rampa}px)`; }
      else if (pos === 'abajo') { const borde = innerHeight - (m.oy + (m.top - MARGEN_PLACA) * m.s); mascara = `linear-gradient(0deg, #000 0, #000 ${borde}px, transparent ${borde + rampa}px)`; }
    }
    placa.style.webkitMaskImage = mascara; placa.style.maskImage = mascara;
  }
  function ir(l, paso = 0, { instantaneo = false, indice = -1 } = {}) {
    const adelante = indice > indiceAnterior; indiceAnterior = indice; clearTimeout(senalDiferida);
    lamina = l; fijo.paso = paso;
    if (!l || !l.escena || op.sinEscena) { apagar(); return false; }
    const { e, pl, sofiaK, manos, foco, luzInterior } = objetivoDe(l, paso);
    const cambioPlano = fijo.plano !== e.plano || fijo.oficina !== (e.oficina || fijo.oficina);
    Object.assign(fijo, { plano: e.plano, sofia: e.sofia || null, vacia: !!e.vacia, quieto: !!e.quieto, foco, oficina: e.oficina || 'coordinacion', esfera: !!e.esfera, placa: pl.pos, placaClara: pl.clara, giro: !!e.giro });
    Object.assign(obj, { luzInterior, sofiaK, manos });
    camara.ir({ plano: e.plano, camx: e.camx, camy: e.camy, zoom: e.zoom, hora: e.hora, fachada: e.fachada, oficina: e.oficina, sofiaK: e.sofia ? sofiaK : undefined, placa: pl.pos });
    aplicarPlaca(l, pl);
    cur.pausaLectura = 1;
    if (instantaneo) { camara.saltar(); Object.assign(cur, obj); cur.pausaLectura = 0; }
    else if (adelante && SENALES[l.id]) senalDiferida = SENALES[l.id](sonido) || 0;
    else if (cambioPlano) sonido.tic();
    if (!activa) { activa = true; canvas.classList.add('visible'); document.body.classList.add('con-escena'); arrancar(); }
    return true;
  }
  function pasoA(n) { if (!activa || !lamina) return; fijo.paso = n; const { sofiaK, manos, foco } = objetivoDe(lamina, n); Object.assign(obj, { sofiaK, manos }); fijo.foco = foco; const e = lamina.escena; if (e.sofia) camara.ir({ plano: e.plano, camx: e.camx, camy: e.camy, zoom: e.zoom, hora: e.hora, fachada: e.fachada, oficina: e.oficina, sofiaK, placa: fijo.placa }); }
  function apagar() { activa = false; canvas.classList.remove('visible'); placa.className = ''; document.body.classList.remove('con-escena'); if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } clearTimeout(senalDiferida); if (vigia && vigia.cerrar) vigia.cerrar(); if (observador) observador.disconnect(); }

  // ---------- La demo ----------
  let entroConGiro = false;   // la demo entró con el giro: sale con el giro, aunque la lámina ya sea otra (PageDown a "decision")
  async function demo(si) {
    if (si === demoVisible) return;
    demoVisible = si;
    const enGiro = (on) => { placa.classList.toggle('en-giro', on); if (lienzoLaminas) lienzoLaminas.classList.toggle('en-giro', on); };
    if (si) { entroConGiro = activa && fijo.giro; if (entroConGiro) { enGiro(true); sonido.giro(); await new Promise((r) => setTimeout(r, 200)); await giro.aCenital(); } else capaDemo.classList.add('visible'); }
    else { const conGiro = entroConGiro && activa; entroConGiro = false; arrancar(); if (conGiro) { sonido.giro(); await giro.aPerfil(); enGiro(false); } else capaDemo.classList.remove('visible'); }
  }

  // ---------- El bucle ----------
  function medir() { const dpr = Math.min(1.5, devicePixelRatio || 1); const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } }
  addEventListener('resize', () => { medir(); if (activa && placaActual) aplicarPlaca(placaActual.l, placaActual.pl); }); medir();
  document.addEventListener('visibilitychange', () => { parada = document.hidden; if (!parada) arrancar(); });
  function arrancar() { if (!rafId) { ultimo = performance.now(); rafId = requestAnimationFrame(cuadro); } }
  function estadoActual(cam) {
    const e = { ...cam, ...cur, ...fijo, hd: luz.hd };
    if (fijo.esfera && fijo.plano === 'hall') { const [x, y, s] = camara.aPantalla(MARCAS[0], MARCAS_Y); e.esfera = { on: true, x, y, r: 10 * s }; } else e.esfera = { on: false };
    return e;
  }
  function cuadro(ahora) {
    rafId = 0;
    if (!activa || parada || (demoVisible && !giro.enCurso)) return;   // con la demo en pantalla no se dibuja ni se re-pide; demo(false) rearma. Durante el giro sí: la cámara viaja mientras el perfil se acuesta o se levanta
    try { paso(ahora); } catch (e) { apagar(); if (alFallar) alFallar(e); else console.error('[escena] error en el cuadro; la escena se apaga', e); return; }
    rafId = requestAnimationFrame(cuadro);
  }
  function paso(ahora) {
    const dt = Math.min(.1, (ahora - ultimo) / 1000); ultimo = ahora;
    const cam = camara.tick(dt);
    const k = 1 - Math.pow(0.05, dt), kr = 1 - Math.pow(0.03, dt);
    cur.luzInterior = lerp(cur.luzInterior, obj.luzInterior, kr); cur.sofiaK = lerp(cur.sofiaK, obj.sofiaK, k); cur.manos = lerp(cur.manos, obj.manos, kr);
    cur.pausaLectura = Math.max(0, cur.pausaLectura - dt / SEGUNDOS_LECTURA);
    const estado = estadoActual(cam);
    gente.tick(dt, estado);
    // El canvas de la escena cubre la ventana entera; la composición es de 1920×1080 escalada.
    const esc = Math.min(canvas.width / 1920, canvas.height / 1080), vista = { esc, ox: (canvas.width - 1920 * esc) / 2, oy: (canvas.height - 1080 * esc) / 2 };
    dibujarMundo(estado);
    const aP = (wx, wy) => { const [x, y, s] = camara.aPantalla(wx, wy); return [x, y, s]; };
    const aPC = (wx, wy, f) => camara.aPantallaCapa(wx, wy, f);
    luz.render({ mundo, fachada, capas: { lejana, cercana }, estado, aPantalla: aP, aPantallaCapa: aPC, ventanas: edificio.ventanas(estado), lamparas: edificio.lamparas(estado), foco: gente.focoEn(estado), sofiaEn: gente.sofia && gente.sofia.visible ? { x: gente.sofia.x + 3, y: gente.sofia.y - 8 } : null, proyector: typeof edificio.proyector === 'function' ? edificio.proyector(estado) : null, farolas: typeof edificio.farolas === 'function' ? edificio.farolas() : [], cielo: edificio.cielo, vista });
    luz.medirFps(dt);
    if (fin) fin(estado);
  }

  // La campana suena cuando la vista abre el panel de decisión (#mundo.decidiendo en el iframe, mismo origen): así respeta el
  // ritmo del chat, que retiene los mensajes. Sin iframe (el banco), se escucha /api/eventos.
  function vigilarPanel() {
    const mirar = () => {
      try {
        const doc = iframeDemo.contentDocument; const mundoEl = doc && doc.getElementById('mundo'); if (!mundoEl) return;
        if (observador) observador.disconnect();
        let abierto = mundoEl.classList.contains('decidiendo');
        observador = new MutationObserver(() => { const ahora = mundoEl.classList.contains('decidiendo'); if (ahora && !abierto) sonido.campana(); abierto = ahora; });
        observador.observe(mundoEl, { attributes: true, attributeFilter: ['class'] });
      } catch {}
    };
    iframeDemo.addEventListener('load', () => setTimeout(mirar, 500)); setTimeout(mirar, 1500);
  }
  if (iframeDemo) vigilarPanel(); else if (typeof sonido.vigilarPropuesta === 'function') vigia = sonido.vigilarPropuesta();

  function tecla(k) {
    if (k === 'm') { const activo = !sonido.silenciar(sonido.activo); return { hecho: true, aviso: activo ? 'Sonido prendido' : 'Sonido apagado' }; }
    return { hecho: false };
  }
  return {
    ir, paso: pasoA, demo, tecla,
    gesto() { sonido.habilitar(); },
    apagar,
    pausar(si) { parada = si; if (!si) arrancar(); },
    estado() { return activa ? { activa, plano: fijo.plano, ...fijo, ...cur, ...camara.actual(), hd: luz.hd, fps: luz.fps } : { activa: false }; },
    get activa() { return activa; },
    alFin(f) { fin = f; },             // para el banco: un callback por cuadro con el estado
    fijar(cambios = {}) { for (const [k, v] of Object.entries(cambios)) { if (k in obj) { obj[k] = v; cur[k] = v; } else if (k in fijo) fijo[k] = v; } },   // para el banco: pisa el estado interpolado o fijo (sofiaK, manos, foco…)
    camara, edificio, gente, luz, giro, sonido,
  };
}
