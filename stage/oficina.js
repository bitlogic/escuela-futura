// La escuela vista desde arriba, en pixel-art (como Pixel Agents).
// Mundo lógico de 400×288 px (panel apaisado) que la página muestra ×N sin suavizar.
// Los personajes son las hojas de Pixel Agents (assets/personajes/char_N.png: 7 cuadros de 16×32,
// filas abajo / arriba / derecha). Muebles y pisos se dibujan por código.
//
// Cuatro salas físicas con varios escritorios cada una:
//   Dirección + Coordinación · Secretaría + Admisiones · Aula de Biología 1 · Bienestar + Biblioteca
// Los "lugares" (los ids que usa herramientas.js: direccion, coordinacion, secretaria, admisiones,
// aula-bio1, bienestar, biblioteca) son puestos dentro de esas salas. El escritorio de Dirección
// queda vacío: la persona que decide es quien mira la pantalla.

import { MODELOS, teñir, cargarHojas } from './personajes.js';

export const W = 400, H = 288;

// Paleta del marco (paredes, zócalos) por tema. Pisos, muebles y sprites no cambian: en el claro
// las paredes pasan a un crema cálido y los personajes siguen destacando sobre los pisos de color.
export const TEMAS = {
  oscuro: {
    pared: '#3b3f55', paredClara: '#4d526d', paredOsc: '#262a3b', zocalo: '#1d2030', junta: 'rgba(255,255,255,.05)',
    madera: '#c79a63', maderaClara: '#dbb27d', maderaOsc: '#9e7544', maderaSombra: '#6e4f2c',
    papel: '#f4efe2', ink: '#1a1a2e', naranja: '#ff7a3d', azul: '#6fa3ff', verde: '#5fae6a', verdeOsc: '#3d7a48',
  },
  claro: {
    pared: '#d9cfbb', paredClara: '#ebe3d2', paredOsc: '#bfb39b', zocalo: '#8f8268', junta: 'rgba(0,0,0,.06)',
    madera: '#c79a63', maderaClara: '#dbb27d', maderaOsc: '#9e7544', maderaSombra: '#6e4f2c',
    papel: '#f4efe2', ink: '#1a1a2e', naranja: '#ff7a3d', azul: '#6fa3ff', verde: '#5fae6a', verdeOsc: '#3d7a48',
  },
};
const PAL = { ...TEMAS.oscuro };   // la paleta activa; of.tema() la rellena con la del tema elegido

// ── Salas físicas ────────────────────────────────────────────────────────────
// Arriba: cara de pared 0..32, piso 32..116, pared fina 116..124 (con la puerta).
// Abajo: cara de pared 164..196 (con la puerta), piso 196..280, pared 280..288.
const FISICAS = {
  p1: { id: 'p1', nombre: 'Dirección y Coord.', x0: 8,   ancho: 174, arriba: true,  puertaX: 95,  piso: ['#a8694f', '#a1634a'] },
  p2: { id: 'p2', nombre: 'Secretaría y Admis.',  x0: 198, ancho: 194, arriba: true,  puertaX: 295, piso: ['#6b7fa8', '#647a9f'] },
  p3: { id: 'p3', nombre: 'Aula · Biología 1',        x0: 8,   ancho: 206, arriba: false, puertaX: 120, piso: ['#4f8f8a', '#498882'] },
  p4: { id: 'p4', nombre: 'Bienestar y Biblioteca', x0: 230, ancho: 162, arriba: false, puertaX: 311, piso: ['#a85f80', '#a05878'] },
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
  direccion:    lugar('p1', 50,  true,  { nombre: 'Dirección', visitas: [[-18, 2], [18, 2], [0, 10], [36, 4]] }),   // el escritorio vacío de quien decide: los agentes vienen a presentar
  coordinacion: lugar('p1', 140, true,  { nombre: 'Coordinación' }),
  secretaria:   lugar('p2', 240, true,  { nombre: 'Secretaría' }),
  admisiones:   lugar('p2', 350, true,  { nombre: 'Admisiones' }),
  'aula-bio1':  lugar('p3', 176, false, { nombre: 'Aula · Biología 1', visitas: [[-34, 0], [-14, -2], [-42, 14]] }),
  bienestar:    lugar('p4', 258, false, { nombre: 'Bienestar', visitas: [[-17, -2], [14, -2], [0, -8]] }),
  academia:     lugar('p4', 352, false, { nombre: 'Academia', visitas: [[-14, -4], [14, -4], [0, -10]] }),
  biblioteca:   { fisica: FISICAS.p4, arriba: false, nombre: 'Biblioteca', escritorio: false, asiento: null, visitas: [[296, 212], [322, 212], [309, 222]].map(([x, y]) => ({ x, y, ocupado: null })) },
};
{ // El aula tiene su visita central dentro de la puerta; el pasillo tiene siete puntos
  const p = { id: 'pasillo', fisica: null, nombre: 'Pasillo', asiento: null, visitas: [] };
  for (let i = 0; i < 7; i++) p.visitas.push({ x: 30 + i * 56, y: CARRIL, ocupado: null });
  SALAS.pasillo = p;
}
// Los carteles de abajo van sobre el borde inferior del piso (a 281 se cortaban con el borde del plano).
export const CARTELES = Object.values(FISICAS).map((f) => ({ texto: f.nombre, x: f.x0 + 4, y: f.arriba ? 117 : 267 }));

const dentroDe = (x, y) => Object.values(FISICAS).find((f) => x >= f.x0 && x <= f.x0 + f.ancho && y >= f.y0 - 4 && y <= f.y1 + 4);

// Estudiantes del aula (sentados, de espaldas). Martina es el caso del escenario.
const ESTUDIANTES = [];
{
  const f = FISICAS.p3;
  const cols = [26, 56, 86], filas = [238, 270];
  const modelos = [[3, 0], [4, 90], [5, 200], [2, 150], [1, 40], [3, 260]];
  let k = 0;
  for (const y of filas) for (const c of cols) { const [m, h] = modelos[k]; ESTUDIANTES.push({ x: f.x0 + c, y, modelo: m, tono: h, foco: y === filas[1] && c === cols[2] }); k++; }
}
export const MARTINA = ESTUDIANTES.find((e) => e.foco);
// Dónde va el cartel "Pendiente de tu revisión": centrado en la pared del fondo del despacho de Dirección y Coordinación.
export const DECISION = { x: FISICAS.p1.x0 + FISICAS.p1.ancho / 2, y: 7 };

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
  // casilleros parados contra la pared fina de arriba (sin tapar las puertas): tapa, frente con rendijas, manija y sombra en el piso
  const cols = [['#4f7fbf', '#6d9ad6', '#3a5f94'], ['#3f9a8f', '#62b7ab', '#2e736a']];
  for (const [a, b] of [[12, 74], [118, 182], [204, 274], [318, 388]]) for (let x = a, i = 0; x + 12 <= b; x += 13, i++) {
    const [cuerpo, claro, osc] = cols[i % 2];
    r(c, x, 123, 12, 3, claro);                                   // tapa (se ve desde arriba)
    r(c, x, 126, 12, 20, cuerpo); r(c, x + 11, 126, 1, 20, osc);  // frente y canto
    r(c, x + 2, 129, 7, 1, osc); r(c, x + 2, 131, 7, 1, osc);     // rendijas de ventilación
    r(c, x + 8, 136, 2, 3, '#f1ead8'); r(c, x + 1, 143, 10, 1, osc);
    r(c, x, 146, 12, 1, osc); r(c, x - 1, 147, 14, 2, 'rgba(0,0,0,.2)');   // base y sombra
  }
  // banco, dispensador de agua y tacho a lo largo del pasillo (lejos de las puertas)
  r(c, 230, 150, 36, 4, PAL.maderaClara); r(c, 230, 154, 36, 6, PAL.madera); r(c, 231, 160, 3, 3, PAL.maderaSombra); r(c, 262, 160, 3, 3, PAL.maderaSombra);
  r(c, 184, 134, 8, 14, '#d8dde6'); r(c, 185, 127, 6, 8, '#9fd0ff'); r(c, 185, 148, 6, 2, '#6a7080'); r(c, 187, 140, 2, 1, '#4f95c9');   // en el hueco entre las dos salas de arriba
  r(c, 195, 139, 7, 9, '#5a6070'); r(c, 194, 138, 9, 2, '#7a8090');
  for (const f of Object.values(FISICAS)) {
    for (let y = f.y0; y < f.y1; y += 16) for (let x = f.x0; x < f.x0 + f.ancho; x += 16) {
      const w = Math.min(16, f.x0 + f.ancho - x), h = Math.min(16, f.y1 - y);
      r(c, x, y, w, h, ((x - f.x0 + y) / 16 | 0) % 2 ? f.piso[0] : f.piso[1]);
      if (ruido(x + 3, y + 7) > 0.72) { r(c, x + 5, y + 5, 2, 1, 'rgba(0,0,0,.1)'); r(c, x + 11, y + 10, 1, 1, 'rgba(255,255,255,.1)'); }
    }
    const fy = f.arriba ? 0 : 164;                    // cara de pared del fondo (2 baldosas de alto)
    r(c, f.x0, fy, f.ancho, 32, PAL.pared); r(c, f.x0, fy, f.ancho, 2, PAL.paredClara);
    r(c, f.x0, fy + 28, f.ancho, 4, PAL.zocalo); r(c, f.x0, fy + 26, f.ancho, 2, PAL.paredOsc);
    for (let x = f.x0 + 8; x < f.x0 + f.ancho; x += 24) r(c, x, fy + 6, 1, 20, PAL.junta);
    if (f.arriba) {                                    // pared fina hacia el pasillo, con hueco de puerta
      r(c, f.x0, 116, f.ancho, 8, PAL.pared); r(c, f.x0, 116, f.ancho, 2, PAL.paredClara); r(c, f.x0, 122, f.ancho, 2, PAL.zocalo);
      r(c, f.puertaX - 16, 116, 32, 8, hp[0]); r(c, f.puertaX - 16, 116, 32, 1, 'rgba(0,0,0,.22)');
      r(c, f.puertaX - 19, 113, 3, 13, PAL.maderaOsc); r(c, f.puertaX + 16, 113, 3, 13, PAL.maderaOsc);   // jambas
      r(c, f.puertaX - 19, 113, 3, 1, PAL.madera); r(c, f.puertaX + 16, 113, 3, 1, PAL.madera);
      r(c, f.puertaX - 14, 125, 28, 3, 'rgba(0,0,0,.14)');                                               // felpudo del lado del pasillo
    } else {
      r(c, f.puertaX - 16, fy, 32, 32, hp[1]); r(c, f.puertaX - 16, fy, 32, 6, 'rgba(0,0,0,.22)');       // hueco con fondo en penumbra
      r(c, f.puertaX - 19, fy - 2, 3, 35, PAL.maderaOsc); r(c, f.puertaX + 16, fy - 2, 3, 35, PAL.maderaOsc); r(c, f.puertaX - 19, fy - 2, 38, 3, PAL.maderaOsc); r(c, f.puertaX - 18, fy - 1, 36, 1, PAL.madera);
      r(c, f.puertaX - 14, fy - 6, 28, 3, 'rgba(0,0,0,.14)');                                            // felpudo del lado del pasillo
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
function pizarron(c, x, y, w, h = 24, trazos = true) {
  r(c, x, y, w, h, '#8a6a3e'); r(c, x, y, w, 1, '#a88552'); r(c, x, y + h - 1, w, 1, '#5e4526');
  r(c, x + 2, y + 2, w - 4, h - 4, '#1f4d3a'); r(c, x + 2, y + 2, w - 4, 1, '#163a2b');
  const tiza = '#e8f0e8', ama = '#f4e9a6';
  if (trazos) {   // "palabras" de tiza de ancho fijo, un título subrayado y un dibujo de célula a la derecha
    const linea = (ly, col, partes) => { let cx = x + 5; for (const a of partes) { if (cx + a > x + w - 30) break; r(c, cx, ly, a, 1, col); cx += a + 3; } };
    linea(y + 5, tiza, [9, 5, 7]); r(c, x + 5, y + 7, 21, 1, ama);
    linea(y + 10, tiza, [4, 8, 6, 5, 7]); linea(y + 13, tiza, [7, 4, 9, 6]); linea(y + 16, ama, [5, 6, 4, 8]);
    const dx = x + w - 20, dy = y + 5;
    r(c, dx, dy + 2, 14, 10, tiza); r(c, dx + 1, dy + 3, 12, 8, '#1f4d3a'); r(c, dx + 5, dy + 5, 4, 4, tiza); r(c, dx + 6, dy + 6, 2, 2, '#1f4d3a'); r(c, dx + 2, dy + 8, 2, 1, ama); r(c, dx + 10, dy + 4, 2, 1, ama);
  }
  r(c, x + 1, y + h - 1, w - 2, 2, '#a88552'); r(c, x + 1, y + h + 1, w - 2, 1, '#5e4526');   // repisa
  r(c, x + 5, y + h - 2, 6, 1, '#f1ead8'); r(c, x + 13, y + h - 2, 4, 1, ama); r(c, x + w - 14, y + h - 2, 8, 2, '#3b3f55');   // tizas y borrador
}
function corcho(c, x, y, w, h = 22) {   // cartelera con papeles clavados
  r(c, x, y, w, h, '#6b4a2a'); r(c, x + 2, y + 2, w - 4, h - 4, '#c9a06a');
  const papeles = [[4, 4, 12, 9, PAL.papel], [19, 5, 10, 8, '#f4e9a6'], [32, 3, 11, 10, PAL.papel], [46, 6, 9, 7, '#bfe3f0'], [58, 4, 12, 9, PAL.papel]];
  for (const [px, py, pw, ph, col] of papeles) { if (px + pw > w - 3) break; r(c, x + px, y + py, pw, ph, col); r(c, x + px + 2, y + py + 3, pw - 4, 1, '#999'); r(c, x + px + 2, y + py + 5, pw - 6, 1, '#999'); r(c, x + px + pw / 2 - 1 | 0, y + py - 1, 2, 2, '#d9604c'); }
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
  add(0, (c) => { ventana(c, 14, 6, 24); cuadro(c, 48, 8); corcho(c, 96, 4, 76, 22); });
  mesa('direccion', e.direccion, '#8a2f1a'); mesa('coordinacion', e.coordinacion, '#5b7fe0');
  add(58, (c) => estante(c, 10, 33, 24, 24)); add(112, (c) => planta(c, 176, 112));
  // Secretaría + Admisiones
  add(0, (c) => { ventana(c, 204, 6, 24); reloj(c, 236, 8); ventana(c, 254, 6, 24); r(c, 320, 6, 30, 20, PAL.papel); r(c, 324, 10, 22, 1, '#999'); r(c, 324, 14, 16, 1, '#999'); r(c, 324, 18, 19, 1, '#999'); ventana(c, 362, 6, 24); });
  mesa('secretaria', e.advisor, '#2b9a8a'); mesa('admisiones', undefined, '#a8861f', 'mostrador');
  add(58, (c) => estante(c, 204, 33, 24, 24)); add(112, (c) => planta(c, 386, 112));
  // Aula
  add(164, (c) => { pizarron(c, 12, 166, 92, 24); ventana(c, 150, 170, 26); reloj(c, 190, 172); });
  ESTUDIANTES.forEach((st) => add(st.y - 8, (c) => pupitre(c, st.x - 11, st.y - 30)));
  mesa('aula-bio1', e.tutor, '#d6a82b'); add(280, (c) => planta(c, 206, 274));
  // Bienestar + Biblioteca
  add(164, (c) => { cruz(c, 238, 172); ventana(c, 254, 170, 24); estante(c, 334, 164, 18, 30); estante(c, 353, 164, 18, 30); estante(c, 372, 164, 18, 30); });   // la puerta queda en 295..327: nada encima
  mesa('bienestar', e.bienestar, '#a8527f'); mesa('academia', e.academia, '#3f9a52'); add(262, (c) => globo(c, 236, 262)); add(278, (c) => planta(c, 384, 274));
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
  // esperandoDecision: hay una propuesta sin responder; se enciende la pantalla del escritorio de Dirección.
  const of = { personajes, hojas, instantaneo: false, velocidad: 1, esperandoDecision: false, SALAS, W, H, resolucion: (s) => { if (s !== S) armar(s); } };
  of.tema = (nombre) => { Object.assign(PAL, TEMAS[nombre] || TEMAS.oscuro); if (S) armar(S); };   // repinta el fondo cacheado; los muebles se redibujan solos
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
    // pantallas encendidas: solo si el dueño está trabajando en su escritorio; la de Dirección, mientras hay una decisión pendiente
    const estado = { direccion: of.esperandoDecision };
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
