// La escuela vista desde arriba, en pixel-art (como Pixel Agents).
// Mundo lógico de 320×288 px (panel compacto) que la página muestra ×N sin suavizar.
// Los personajes son las hojas de Pixel Agents (assets/personajes/char_N.png: 7 cuadros de 16×32,
// filas abajo / arriba / derecha). Muebles y pisos se dibujan por código.
//
// Cuatro salas físicas con varios escritorios cada una:
//   Dirección + Coordinación · Secretaría + Admisiones · Aula de Biología 1 · Bienestar + Biblioteca
// Los "lugares" (los ids que usa normalizar.js: direccion, coordinacion, secretaria, admisiones,
// aula-bio1, bienestar, biblioteca) son puestos dentro de esas salas.

import { MODELOS, teñir, cargarHojas } from './personajes.js';

export const W = 320, H = 288;

const PAL = {
  fuera: '#14141f', pared: '#3b3f55', paredClara: '#4d526d', paredOsc: '#262a3b', zocalo: '#1d2030',
  madera: '#c79a63', maderaClara: '#dbb27d', maderaOsc: '#9e7544', maderaSombra: '#6e4f2c',
  papel: '#f4efe2', ink: '#1a1a2e', naranja: '#ff7a3d', azul: '#6fa3ff', verde: '#5fae6a', verdeOsc: '#3d7a48',
};

// ── Salas físicas ────────────────────────────────────────────────────────────
// Arriba: cara de pared 0..32, piso 32..116, pared fina 116..124 (con la puerta).
// Abajo: cara de pared 164..196 (con la puerta), piso 196..280, pared 280..288.
const FISICAS = {
  p1: { id: 'p1', nombre: 'Dirección y Coord.', x0: 8,   ancho: 142, arriba: true,  puertaX: 79,  piso: ['#a8694f', '#a1634a'] },
  p2: { id: 'p2', nombre: 'Secretaría y Admis.',  x0: 166, ancho: 146, arriba: true,  puertaX: 239, piso: ['#6b7fa8', '#647a9f'] },
  p3: { id: 'p3', nombre: 'Aula · Biología 1',        x0: 8,   ancho: 170, arriba: false, puertaX: 104, piso: ['#4f8f8a', '#498882'] },
  p4: { id: 'p4', nombre: 'Bienestar y Biblioteca', x0: 194, ancho: 118, arriba: false, puertaX: 253, piso: ['#a85f80', '#a05878'] },
};
const CARRIL = 144;                                   // y (pies) del pasillo (hall: 124..164)
for (const f of Object.values(FISICAS)) {
  f.y0 = f.arriba ? 32 : 196; f.y1 = f.arriba ? 116 : 280;
  f.carril = f.arriba ? 110 : 206;                    // y (pies) adentro, junto a la puerta
  f.puerta = { x: f.puertaX, y: f.arriba ? 120 : 180 };
}

// ── Lugares (puestos dentro de las salas) ────────────────────────────────────
const lugar = (fisica, cx, arriba, { visitas: vis, ...extra } = {}) => {
  const f = FISICAS[fisica];
  const sy = arriba ? 62 : 236;                       // y de los pies sentado
  const vy = arriba ? 104 : 224;
  return {
    fisica: f, cx, mesaY: sy - 4, escritorio: true,
    asiento: { x: cx, y: sy, sentado: true, lado: 30, ocupado: null },
    visitas: (vis || [[-16, 0], [16, 0], [0, 8]]).map(([dx, dy]) => ({ x: cx + dx, y: vy + dy, ocupado: null })),
    ...extra, arriba, nombre: extra.nombre || f.nombre,
  };
};
export const SALAS = {
  direccion:    lugar('p1', 44,  true,  { nombre: 'Dirección' }),
  coordinacion: lugar('p1', 114, true,  { nombre: 'Coordinación' }),
  secretaria:   lugar('p2', 200, true,  { nombre: 'Secretaría' }),
  admisiones:   lugar('p2', 276, true,  { nombre: 'Admisiones' }),
  'aula-bio1':  lugar('p3', 146, false, { nombre: 'Aula · Biología 1', visitas: [[-34, 0], [-14, -2], [-42, 14]] }),
  bienestar:    lugar('p4', 218, false, { nombre: 'Bienestar', visitas: [[-17, -2], [14, -2], [0, -8]] }),
  academia:     lugar('p4', 282, false, { nombre: 'Academia', visitas: [[-14, -4], [14, -4], [0, -10]] }),
  biblioteca:   { fisica: FISICAS.p4, arriba: false, nombre: 'Biblioteca', escritorio: false, asiento: null, visitas: [[262, 212], [302, 212], [248, 222]].map(([x, y]) => ({ x, y, ocupado: null })) },
};
{ // El aula tiene su visita central dentro de la puerta; el pasillo tiene seis puntos
  const p = { id: 'pasillo', fisica: null, nombre: 'Pasillo', asiento: null, visitas: [] };
  for (let i = 0; i < 6; i++) p.visitas.push({ x: 30 + i * 52, y: CARRIL, ocupado: null });
  SALAS.pasillo = p;
}
export const CARTELES = Object.values(FISICAS).map((f) => ({ texto: f.nombre, x: f.x0 + 4, y: f.arriba ? 117 : 281 }));

const dentroDe = (x, y) => Object.values(FISICAS).find((f) => x >= f.x0 && x <= f.x0 + f.ancho && y >= f.y0 - 4 && y <= f.y1 + 4);

// Estudiantes del aula (sentados, de espaldas). Martina es el caso del escenario.
const ESTUDIANTES = [];
{
  const f = FISICAS.p3;
  const cols = [24, 50, 76], filas = [238, 270];
  const modelos = [[3, 0], [4, 90], [5, 200], [2, 150], [1, 40], [3, 260]];
  let k = 0;
  for (const y of filas) for (const c of cols) { const [m, h] = modelos[k]; ESTUDIANTES.push({ x: f.x0 + c, y, modelo: m, tono: h, foco: y === filas[1] && c === cols[2] }); k++; }
}
export const MARTINA = ESTUDIANTES.find((e) => e.foco);

// ── Utilidades ───────────────────────────────────────────────────────────────
const r = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
const ruido = (x, y) => { const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return n - Math.floor(n); };

function dibujarFondo(c) {
  r(c, 0, 0, W, H, PAL.pared);
  // Pasillo
  const hp = ['#c9bfa8', '#c1b79f'];
  for (let y = 124; y < 164; y += 16) for (let x = 8; x < W - 8; x += 16) {
    const h = Math.min(16, 164 - y);
    r(c, x, y, 16, h, ((x + y) / 16 | 0) % 2 ? hp[0] : hp[1]);
    if (ruido(x, y) > 0.7) r(c, x + 4 + (ruido(y, x) * 8 | 0), y + 6, 2, 1, 'rgba(0,0,0,.08)');
  }
  r(c, 8, 124, W - 16, 2, 'rgba(0,0,0,.16)');
  // casilleros contra la pared de arriba (sin tapar las puertas)
  const cols = ['#4f7fbf', '#3f9a8f'];
  for (const [a, b] of [[10, 60], [98, 220], [258, 310]]) for (let x = a, i = 0; x + 13 <= b; x += 14, i++) {
    r(c, x, 126, 13, 22, cols[i % 2]); r(c, x, 126, 13, 2, 'rgba(255,255,255,.25)'); r(c, x + 9, 135, 2, 4, '#e8e0cf'); r(c, x + 2, 131, 7, 1, 'rgba(0,0,0,.25)'); r(c, x, 148, 13, 2, 'rgba(0,0,0,.18)');
  }
  for (const f of Object.values(FISICAS)) {
    for (let y = f.y0; y < f.y1; y += 16) for (let x = f.x0; x < f.x0 + f.ancho; x += 16) {
      const w = Math.min(16, f.x0 + f.ancho - x), h = Math.min(16, f.y1 - y);
      r(c, x, y, w, h, ((x - f.x0 + y) / 16 | 0) % 2 ? f.piso[0] : f.piso[1]);
      if (ruido(x + 3, y + 7) > 0.72) { r(c, x + 5, y + 5, 2, 1, 'rgba(0,0,0,.1)'); r(c, x + 11, y + 10, 1, 1, 'rgba(255,255,255,.1)'); }
    }
    const fy = f.arriba ? 0 : 164;                    // cara de pared del fondo (2 baldosas de alto)
    r(c, f.x0, fy, f.ancho, 32, PAL.pared); r(c, f.x0, fy, f.ancho, 2, PAL.paredClara);
    r(c, f.x0, fy + 28, f.ancho, 4, PAL.zocalo); r(c, f.x0, fy + 26, f.ancho, 2, PAL.paredOsc);
    for (let x = f.x0 + 8; x < f.x0 + f.ancho; x += 24) r(c, x, fy + 6, 1, 20, 'rgba(255,255,255,.05)');
    if (f.arriba) {                                    // pared fina hacia el pasillo, con hueco de puerta
      r(c, f.x0, 116, f.ancho, 8, PAL.pared); r(c, f.x0, 116, f.ancho, 2, PAL.paredClara); r(c, f.x0, 122, f.ancho, 2, PAL.zocalo);
      r(c, f.puertaX - 16, 116, 32, 8, hp[0]); r(c, f.puertaX - 18, 116, 2, 8, PAL.maderaOsc); r(c, f.puertaX + 16, 116, 2, 8, PAL.maderaOsc);
    } else {
      r(c, f.puertaX - 16, fy, 32, 32, hp[1]); r(c, f.puertaX - 18, fy, 2, 32, PAL.maderaOsc); r(c, f.puertaX + 16, fy, 2, 32, PAL.maderaOsc); r(c, f.puertaX - 18, fy, 36, 2, PAL.maderaOsc);
      r(c, f.x0, 280, f.ancho, 2, PAL.paredClara);
    }
  }
  r(c, 8, 284, W - 16, 4, PAL.zocalo);
}

// ── Muebles (cada uno con su orden de profundidad = su borde inferior) ───────
function escritorio(c, x, y, w, pantalla) {
  r(c, x, y, w, 8, PAL.madera); r(c, x, y, w, 1, PAL.maderaClara);
  r(c, x, y + 8, w, 9, PAL.maderaOsc); r(c, x + 1, y + 17, 3, 3, PAL.maderaSombra); r(c, x + w - 4, y + 17, 3, 3, PAL.maderaSombra);
  if (pantalla !== undefined) {
    const mx = x + w - 17;
    r(c, mx, y - 10, 13, 10, '#22222e'); r(c, mx + 1, y - 9, 11, 7, pantalla ? '#8ec2ff' : '#39435f');
    if (pantalla) for (let i = 0; i < 3; i++) r(c, mx + 2, y - 8 + i * 2, 3 + ((i + (performance.now() / 220 | 0)) % 3) * 2, 1, '#fff');
    r(c, mx + 5, y - 1, 3, 2, '#22222e');
    r(c, x + 5, y + 2, 12, 3, '#d8d3c4'); r(c, x + 6, y + 3, 10, 1, '#8a8678');
  }
}
function silla(c, x, y, col = '#3d4260') { r(c, x - 6, y - 4, 12, 5, col); r(c, x - 5, y + 1, 10, 7, col); r(c, x - 1, y + 8, 2, 3, '#1d2030'); }
function estante(c, x, y, w, alto = 30) {
  r(c, x, y, w, alto, '#6b4a2a'); r(c, x + 1, y + 1, w - 2, alto - 2, '#2c1f12');
  const libros = ['#d9604c', '#e0b93c', '#4f95c9', '#5b8f6a', '#c96aa0', '#f4f0e6', '#6f6fd1'];
  const filas = Math.floor((alto - 2) / 14);
  for (let f = 0; f < filas; f++) { let cx = x + 2, i = f * 3; while (cx < x + w - 3) { const a = 2 + (i % 3); r(c, cx, y + 2 + f * 14, a, 11 - (i % 2), libros[i % libros.length]); cx += a; i++; } r(c, x + 1, y + 13 + f * 14, w - 2, 1, '#6b4a2a'); }
}
function planta(c, x, y) { r(c, x - 4, y, 8, 7, '#b5653a'); r(c, x - 4, y, 8, 1, '#d28a5a'); r(c, x - 6, y - 8, 12, 9, PAL.verde); r(c, x - 4, y - 13, 8, 7, PAL.verdeOsc); r(c, x - 1, y - 16, 3, 5, PAL.verde); r(c, x - 7, y - 4, 3, 3, PAL.verdeOsc); r(c, x + 4, y - 5, 3, 3, PAL.verdeOsc); }
function ventana(c, x, y, w = 28) { r(c, x, y, w, 18, '#e8f2ff'); r(c, x + 1, y + 1, w - 2, 16, '#9fd0ff'); r(c, x + w / 2 - 1, y, 2, 18, '#e8f2ff'); r(c, x, y + 8, w, 2, '#e8f2ff'); r(c, x + 3, y + 3, 5, 2, '#fff'); r(c, x - 1, y + 18, w + 2, 2, PAL.maderaOsc); }
function pizarron(c, x, y, w, h = 20, trazos = true) {
  r(c, x, y, w, h, '#8a6a3e'); r(c, x + 1, y + 1, w - 2, h - 2, '#1f4d3a');
  if (trazos) { r(c, x + 4, y + 4, w * 0.45 | 0, 1, '#e8f0e8'); r(c, x + 4, y + 8, w * 0.6 | 0, 1, '#e8f0e8'); r(c, x + 4, y + 12, w * 0.3 | 0, 1, '#f4e9a6'); }
  r(c, x + 3, y + h - 3, 8, 1, '#e8e0cf');
}
function mostrador(c, x, y, w) { r(c, x, y, w, 6, PAL.maderaClara); r(c, x, y + 6, w, 14, PAL.maderaOsc); r(c, x, y + 6, w, 2, PAL.madera); r(c, x + w - 18, y - 6, 12, 7, PAL.papel); r(c, x + w - 16, y - 4, 8, 1, '#999'); r(c, x + 4, y - 4, 7, 4, '#d9604c'); }
function mesaLectura(c, x, y) { r(c, x, y, 48, 5, PAL.maderaClara); r(c, x, y + 5, 48, 11, PAL.madera); r(c, x, y + 14, 48, 2, PAL.maderaOsc); r(c, x + 5, y + 1, 9, 4, '#d9604c'); r(c, x + 19, y, 10, 5, '#4f95c9'); r(c, x + 34, y + 1, 9, 4, PAL.papel); }
function pupitre(c, x, y) { r(c, x, y, 22, 6, PAL.maderaClara); r(c, x, y + 6, 22, 6, PAL.madera); r(c, x + 1, y + 12, 2, 4, PAL.maderaSombra); r(c, x + 19, y + 12, 2, 4, PAL.maderaSombra); }
function globo(c, x, y) { r(c, x - 1, y + 10, 2, 7, '#555'); r(c, x - 5, y + 16, 10, 2, '#555'); r(c, x - 7, y, 14, 11, '#4f95c9'); r(c, x - 5, y + 2, 5, 3, PAL.verde); r(c, x + 1, y + 6, 4, 3, PAL.verde); }
function cruz(c, x, y) { r(c, x, y, 12, 12, '#f4efe2'); r(c, x + 5, y + 2, 2, 8, '#d9604c'); r(c, x + 2, y + 5, 8, 2, '#d9604c'); }
function cuadro(c, x, y) { r(c, x, y, 24, 18, '#6b4a2a'); r(c, x + 2, y + 2, 20, 14, '#e7d9b4'); r(c, x + 4, y + 11, 8, 4, '#7a9e6a'); r(c, x + 12, y + 8, 7, 7, '#c99a5b'); }
function reloj(c, x, y) { r(c, x, y, 12, 12, '#f4efe2'); r(c, x + 1, y + 1, 10, 10, '#fff'); r(c, x + 6, y + 3, 1, 4, '#222'); r(c, x + 6, y + 6, 3, 1, '#222'); }
function sofa(c, x, y) { r(c, x, y, 36, 10, '#c96aa0'); r(c, x + 2, y + 10, 32, 9, '#d886b6'); r(c, x, y + 4, 4, 15, '#a8527f'); r(c, x + 32, y + 4, 4, 15, '#a8527f'); r(c, x + 17, y + 10, 1, 9, '#b86a96'); }

function muebles(e) {
  const L = []; const add = (orden, fn) => L.push({ orden, fn });
  const S = SALAS;
  const mesa = (id, pantalla, silCol, tipo) => {
    const s = S[id]; const x = s.cx - 24;
    add(s.mesaY + 20, (c) => (tipo === 'mostrador' ? mostrador(c, s.cx - 30, s.mesaY + 4, 60) : escritorio(c, x, s.mesaY, 48, pantalla)));
    add(s.mesaY - 1, (c) => silla(c, s.cx, s.mesaY - 5, silCol));
  };
  // Dirección + Coordinación
  add(0, (c) => { ventana(c, 14, 6, 24); cuadro(c, 44, 8); pizarron(c, 82, 6, 60, 22); });
  mesa('direccion', e.persona, '#8a2f1a'); mesa('coordinacion', e.coordinacion, '#5b7fe0');
  add(58, (c) => estante(c, 10, 33, 24, 24)); add(112, (c) => planta(c, 144, 112));
  // Secretaría + Admisiones
  add(0, (c) => { ventana(c, 172, 6, 24); reloj(c, 204, 8); ventana(c, 222, 6, 24); r(c, 270, 6, 30, 20, PAL.papel); r(c, 274, 10, 22, 1, '#999'); r(c, 274, 14, 16, 1, '#999'); r(c, 274, 18, 19, 1, '#999'); });
  mesa('secretaria', e.advisor, '#2b9a8a'); mesa('admisiones', undefined, '#a8861f', 'mostrador');
  add(58, (c) => estante(c, 172, 33, 24, 24)); add(112, (c) => planta(c, 306, 112));
  // Aula
  add(164, (c) => { pizarron(c, 14, 170, 70, 20); ventana(c, 128, 172, 26); reloj(c, 160, 174); });
  ESTUDIANTES.forEach((st) => add(st.y - 8, (c) => pupitre(c, st.x - 11, st.y - 30)));
  mesa('aula-bio1', e.tutor, '#d6a82b'); add(280, (c) => planta(c, 168, 274));
  // Bienestar + Biblioteca
  add(164, (c) => { cruz(c, 200, 172); ventana(c, 214, 170, 20); estante(c, 272, 164, 18, 30); estante(c, 292, 164, 18, 30); });
  mesa('bienestar', e.bienestar, '#a8527f'); mesa('academia', e.academia, '#3f9a52'); add(262, (c) => globo(c, 200, 262)); add(278, (c) => planta(c, 304, 274));
  return L;
}

// ── Personajes ───────────────────────────────────────────────────────────────
const FILA = { abajo: 0, arriba: 1, der: 2, izq: 2 };
function dibujarSprite(c, hoja, cuadro, dir, x, y) {
  const sx = cuadro * 16, sy = FILA[dir] * 32;
  const dx = Math.round(x) - 8, dy = Math.round(y) - 32;
  if (dir === 'izq') { c.save(); c.translate(dx + 16, dy); c.scale(-1, 1); c.drawImage(hoja, sx, sy, 16, 32, 0, 0, 16, 32); c.restore(); }
  else c.drawImage(hoja, sx, sy, 16, 32, dx, dy, 16, 32);
}

function globoEstado(c, p, t) {
  // Burbujas de estado, como en Pixel Agents: "…" mientras trabaja, "!" cuando espera una decisión
  const bx = Math.round(p.x) - 6, by = Math.round(p.y) - 32 - (p.sentado && !p.moviendo ? -3 : 0) - 14;
  if (p.esperando) { const l = (t / 380 | 0) % 2; r(c, bx - 1, by - l - 1, 14, 14, PAL.ink); r(c, bx, by - l, 12, 12, PAL.naranja); r(c, bx + 5, by - l + 2, 2, 5, '#fff'); r(c, bx + 5, by - l + 8, 2, 2, '#fff'); r(c, bx + 4, by - l + 13, 4, 2, PAL.ink); }
  else if (p.trabajando && !p.textoVisible) { r(c, bx - 1, by - 1, 14, 12, PAL.ink); r(c, bx, by, 12, 10, '#fff'); const k = (t / 260 | 0) % 3; for (let i = 0; i < 3; i++) r(c, bx + 2 + i * 3, by + 4 - (i === k ? 1 : 0), 2, 2, i === k ? '#e08a1e' : '#9a9aa8'); r(c, bx + 4, by + 10, 4, 2, PAL.ink); }
}

export async function crearOficina(canvas) {
  const c = canvas.getContext('2d');
  const hojas = await cargarHojas();                    // 0..5 de Pixel Agents + 6 = Academia
  // El lienzo se dibuja a S píxeles por píxel lógico (S entero, según el tamaño real en pantalla) para que el pixel-art se vea parejo al achicarlo.
  const fondo = document.createElement('canvas'); let S = 0;
  const armar = (s) => {
    S = s; canvas.width = W * S; canvas.height = H * S; fondo.width = W * S; fondo.height = H * S;
    const fc = fondo.getContext('2d'); fc.imageSmoothingEnabled = false; fc.setTransform(S, 0, 0, S, 0, 0); dibujarFondo(fc);
    c.imageSmoothingEnabled = false; c.setTransform(S, 0, 0, S, 0, 0);
  };
  armar(3);
  const hojasTeñidas = ESTUDIANTES.map((e) => (e.tono ? teñir(hojas[e.modelo], e.tono) : hojas[e.modelo]));

  const personajes = new Map();
  const of = { personajes, hojas, instantaneo: false, velocidad: 1, SALAS, W, H, resolucion: (s) => { if (s !== S) armar(s); } };
  const VEL = 58; // px lógicos por segundo

  of.agregar = (id, { nombre, casa, persona = false }) => {
    const p = { id, nombre, casa, persona, hoja: hojas[persona ? MODELOS.persona : (MODELOS[id] ?? 2)], x: 0, y: 0, dir: 'abajo', sala: null, spot: null, ruta: [], sentado: false, moviendo: false, trabajando: false, esperando: false, textoVisible: false };
    personajes.set(id, p); of.ir(p, casa, true); return p;
  };
  of.quitarTodos = () => { personajes.clear(); for (const s of Object.values(SALAS)) { for (const v of s.visitas) v.ocupado = null; if (s.asiento) s.asiento.ocupado = null; } };

  const elegirSpot = (p, salaId) => { const s = SALAS[salaId] || SALAS.pasillo; if (s.asiento && salaId === p.casa) return s.asiento; return s.visitas.find((v) => !v.ocupado || v.ocupado === p.id) || s.visitas[s.visitas.length - 1]; };
  const liberar = (p) => { if (p.spot && p.spot.ocupado === p.id) p.spot.ocupado = null; };

  function ruta(p, destino, lugarDest) {
    const pts = [];
    const origen = dentroDe(p.x, p.y), sala = lugarDest.fisica;       // sala física de origen y de destino
    const mismaSala = origen && sala && origen.id === sala.id;
    const sp = p.spot;
    if (sp && sp.sentado && Math.abs(p.x - sp.x) < 2 && origen) pts.push({ x: sp.x + sp.lado, y: p.y });   // se levanta de costado
    const xs = pts.length ? pts[0].x : p.x;
    if (mismaSala) {
      pts.push({ x: xs, y: origen.carril });
    } else {
      if (origen) pts.push({ x: xs, y: origen.carril }, { x: origen.puertaX, y: origen.carril }, { x: origen.puertaX, y: CARRIL });
      else pts.push({ x: p.x, y: CARRIL });
      if (sala) pts.push({ x: sala.puertaX, y: CARRIL }, { x: sala.puertaX, y: sala.carril });
    }
    if (sala) {
      if (destino.sentado) pts.push({ x: destino.x + destino.lado, y: sala.carril }, { x: destino.x + destino.lado, y: destino.y }, { x: destino.x, y: destino.y });
      else pts.push({ x: destino.x, y: sala.carril }, { x: destino.x, y: destino.y });
    } else pts.push({ x: destino.x, y: CARRIL });
    return pts.filter((q, i) => Math.hypot(q.x - (i ? pts[i - 1].x : p.x), q.y - (i ? pts[i - 1].y : p.y)) > 0.5);
  }

  of.ir = (p, salaId, instantaneo = false) => {
    if (!SALAS[salaId]) salaId = 'pasillo';
    if (p.sala === salaId && p.spot && !instantaneo) return;
    const lugarDest = SALAS[salaId], destino = elegirSpot(p, salaId);
    const nueva = ruta(p, destino, lugarDest);
    liberar(p); destino.ocupado = p.id; p.spot = destino; p.sala = salaId;
    if (instantaneo || of.instantaneo || (p.x === 0 && p.y === 0)) { p.x = destino.x; p.y = destino.y; p.ruta = []; p.moviendo = false; p.sentado = !!destino.sentado; p.dir = 'abajo'; return; }
    p.ruta = nueva; p.sentado = false; p.moviendo = nueva.length > 0;
  };

  let ultimo = 0;
  of.cuadro = (ts) => {
    const dt = ultimo ? Math.min(0.1, (ts - ultimo) / 1000) : 0; ultimo = ts;
    for (const p of personajes.values()) {
      if (!p.ruta.length) continue;
      let resto = VEL * Math.min(of.velocidad, 2.5) * dt;
      while (resto > 0 && p.ruta.length) {
        const o = p.ruta[0], dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
        if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'der' : 'izq'; else if (dy !== 0) p.dir = dy > 0 ? 'abajo' : 'arriba';
        if (d <= resto) { p.x = o.x; p.y = o.y; p.ruta.shift(); resto -= d; } else { p.x += (dx / d) * resto; p.y += (dy / d) * resto; resto = 0; }
      }
      p.moviendo = p.ruta.length > 0;
      if (!p.moviendo) { p.x = p.spot.x; p.y = p.spot.y; p.sentado = !!p.spot.sentado; p.dir = 'abajo'; }
    }
    // pantallas encendidas: solo si el dueño está trabajando en su escritorio
    const estado = { persona: true };
    for (const id of ['advisor', 'bienestar', 'coordinacion', 'tutor', 'academia']) { const p = personajes.get(id); estado[id] = !!(p && p.trabajando && p.sentado && !p.moviendo); }
    c.clearRect(0, 0, W, H); c.drawImage(fondo, 0, 0, W, H);
    const cosas = muebles(estado);
    ESTUDIANTES.forEach((st, i) => cosas.push({ orden: st.y, fn: (cc) => {
      dibujarSprite(cc, hojasTeñidas[i], 0, 'arriba', st.x, st.y + 2);
      if (st.foco) { const b = Math.sin(ts / 260) > 0 ? 0 : 1; r(cc, st.x - 4, st.y - 42 + b, 9, 3, PAL.naranja); r(cc, st.x - 2, st.y - 39 + b, 5, 2, PAL.naranja); r(cc, st.x, st.y - 37 + b, 1, 2, PAL.naranja); }
    } }));
    for (const p of personajes.values()) {
      const sentadoAhora = p.sentado && !p.moviendo;
      cosas.push({ orden: sentadoAhora ? p.spot.y + 1 : p.y, fn: (cc) => {
        let cuadro, y = p.y;
        if (p.moviendo) cuadro = [0, 1, 2, 1][(ts / 120 | 0) % 4];
        else if (sentadoAhora) { cuadro = p.trabajando ? 3 + ((ts / 200 | 0) % 2) : 3; y += 3; }
        else if (p.trabajando && p.sala !== p.casa) cuadro = 5 + ((ts / 450 | 0) % 2);
        else cuadro = 1;
        if (!sentadoAhora) { cc.fillStyle = 'rgba(0,0,0,.28)'; cc.fillRect(Math.round(p.x) - 6, Math.round(p.y) - 1, 12, 3); }
        dibujarSprite(cc, p.hoja, cuadro, p.dir, p.x, y);
        globoEstado(cc, p, ts);
      } });
    }
    cosas.sort((a, b) => a.orden - b.orden);
    for (const k of cosas) k.fn(c);
  };
  return of;
}
