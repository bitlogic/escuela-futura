// El edificio de perfil (casa de muñecas): el mundo lógico de 640×288 px con dos plantas derivadas del plano
// de la demo (SALAS de stage/oficina.js), el hall con la escalera y la puerta de calle, la fachada, el patio y
// las capas lejana y cercana. Ver CONTRATO.md §3.1 y §4.
//
// Todo es pixel-art de 1 px lógico: solo fillRect con coordenadas enteras, sin degradados ni arcos (la luz y los
// desenfoques los pone luz.js encima, a resolución de pantalla). La paleta es TEMAS.oscuro de stage/oficina.js
// (paredes, zócalos, madera, papel) y los pisos de cada sala llevan los colores `piso` de su sala física.
// El módulo se importa en Node sin DOM: nada de document ni Image fuera de las funciones.

export const MUNDO = { W: 640, H: 288, PB: 228, PA: 148, X0: 120, X1: 520, TECHO_BAJA: 152, TECHO_ALTA: 72, AZOTEA: 64, SUELO: 230 };

// El reparto de la planta baja y la alta en x (el hall se ensancha a 100 px para que Sofía pueda recorrerlo).
const REPARTO = {
  baja: [{ fisica: 'p3', x: 120, w: 180 }, { id: 'hall', x: 300, w: 100 }, { fisica: 'p4', x: 400, w: 120 }],
  alta: [{ fisica: 'p1', x: 120, w: 180 }, { id: 'hall-alto', x: 300, w: 40 }, { fisica: 'p2', x: 340, w: 180 }],
};
export const PUERTA = { x: 302, w: 18 };                      // la puerta de calle, al principio del hall de planta baja
export const MARCAS = [328, 354, 380];                         // 2022 · 2024 · 2026 en la pared del hall (x lógico): Sofía entra por la puerta y las recorre
export const MARCAS_Y = 168;
// La escalera al final del hall, pegada a Bienestar: se dibuja frontal (sube hacia el fondo) y llega al descanso de planta alta.
// `pie` y `cima` son los puntos (pies del personaje) por donde gente.js baja y sube.
export const ESCALERA = { x: 382, w: 18, pie: { x: 391, y: 228 }, cima: { x: 329, y: 148 } };
export const PATIO = { x: 524, w: 116 };                       // el patio, a la derecha del edificio, detrás de la reja
export const MUROS = 4;                                        // espesor de los muros laterales (116..120 y 520..524)
export const SUELO_COLOR = '#262538';                          // la calle: para pintar lo que queda debajo del mundo en pantalla
export const MARGEN = 160;                                     // calle, cerros y reja se dibujan de −160 a 800 por si los lienzos son más anchos que el mundo
const PASILLO = ['#c9bfa8', '#c1b79f'];                         // el piso del pasillo de la demo (oficina.js)

const techoDe = (planta) => (planta === 'baja' ? MUNDO.TECHO_BAJA : MUNDO.TECHO_ALTA);
const piesDe = (planta) => (planta === 'baja' ? MUNDO.PB : MUNDO.PA);

/** Deriva las plantas de perfil de las salas del plano: mismo orden y mismos puestos, anchos proporcionales.
 *  Cada puesto trae además dónde van sus muebles (mesa, pantalla, silla, asiento, estante, cuaderno) para gente.js y luz.js. */
export function derivarPlantas(SALAS) {
  const lugares = Object.entries(SALAS).filter(([, s]) => s.fisica);
  const plantas = [];
  for (const [planta, tramos] of Object.entries(REPARTO)) {
    const y0 = techoDe(planta), y1 = piesDe(planta);
    for (const t of tramos) {
      if (!t.fisica) { plantas.push({ id: t.id, nombre: t.id === 'hall' ? 'Hall' : 'Descanso', x: t.x, w: t.w, planta, fisica: null, puestos: [], color: PASILLO }); continue; }
      const propios = lugares.filter(([, s]) => s.fisica.id === t.fisica);
      const f = propios[0][1].fisica;
      const puestos = propios.map(([id, s]) => {
        const escritorio = s.escritorio !== false;
        const x = Math.round(escritorio ? t.x + ((s.cx ?? s.visitas[0].x) - f.x0) / f.ancho * t.w : t.x + (s.visitas[0].x - f.x0) / f.ancho * t.w);
        const q = { id, nombre: s.nombre, x, escritorio };
        if (escritorio) {
          q.mesa = { x0: x - 14, x1: x + 12, y: y1 - 14 };                     // la tapa del escritorio (o del mostrador)
          q.pantalla = { x: x - 10, y: y1 - 24, w: 10, h: 8 };                 // el monitor, sobre la mesa, a la izquierda
          q.silla = { x: x + 9 };                                              // la silla, a la derecha; el personaje mira a la pantalla
          q.asiento = x + 8;                                                   // dónde se sienta (x del centro; gente.js lo lee como número)
          q.mostrador = id === 'admisiones';
          if (id === 'coordinacion') { q.estante = { x: x + 18, y: y0 + 12, w: 18, h: 40 }; q.cuaderno = { x: x + 12, y: y1 - 16, w: 7, h: 2 }; }   // rectángulos: lo que se dibuja
        } else q.estante = { x: x - 11, y: y0 + 10, w: 22, h: y1 - y0 - 14 };   // la biblioteca: estantes del techo al piso
        return q;
      });
      const p = { id: f.id, nombre: f.nombre, x: t.x, w: t.w, planta, fisica: f, puestos, color: f.piso };
      if (f.id === 'p3') {   // el aula: siete pupitres por fila, tres filas (las de atrás, corridas y un poco más altas)
        p.pupitres = [];
        for (let fila = 0; fila < 3; fila++) for (let i = 0; i < 7; i++) p.pupitres.push({ x: 134 + i * 17 + fila * 4, y: y1 - fila * 3, mesa: 134 + i * 17 + fila * 4 + 7, fila });
        p.pizarron = { x: 130, y: y0 + 12, w: 76, h: 26 };
      }
      plantas.push(p);
    }
  }
  return plantas;
}

const lerp = (a, b, k) => a + (b - a) * k;
const mezcla = (c1, c2, k) => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const hexA = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// Tres paletas: atardecer (naranja → violeta → azul), noche (azul profundo) y mañana (celeste).
const CIELOS = { tarde: [[24, 20, 66], [126, 62, 142], [252, 142, 82]], noche: [[6, 5, 18], [12, 10, 34], [22, 20, 56]], manana: [[64, 104, 186], [138, 184, 236], [206, 230, 250]] };

/** Cuánto está prendida una ventana de la fachada (0..1) con el luzInterior del estado: cada una tiene su umbral, así se prenden y
 *  se apagan de a una (ver ventanas()). Sin umbral, todas a la vez. */
export function ventanaPrendida(v, estado) {
  const l = Math.max(0, Math.min(1, estado.luzInterior ?? 1));
  if (v.umbral == null) return l;
  return Math.max(0, Math.min(1, (l - v.umbral) / .08));
}
/** Cielo por hora: [arriba, medio, horizonte] en rgb. 0 atardecer · .5 noche · 1 mañana. */
export function cielo(hora) {
  const h = Math.min(1, Math.max(0, Number(hora) || 0));
  const k = h < .5 ? h * 2 : (h - .5) * 2, A = h < .5 ? CIELOS.tarde : CIELOS.noche, B = h < .5 ? CIELOS.noche : CIELOS.manana;
  return [mezcla(A[0], B[0], k), mezcla(A[1], B[1], k), mezcla(A[2], B[2], k)];
}

// La tipografía del cartel: 5×7 por letra, solo las letras de "ESCUELA FUTURA".
const GLIFOS = {
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  // los de "¡GRACIAS!" (el globo con que los agentes saludan en la última lámina)
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '¡': ['..#..', '.....', '..#..', '..#..', '..#..', '..#..', '..#..'],
  // el resto del alfabeto, dígitos y signos (4/11): la charla de los agentes en la última lámina va en mayúsculas, sin tildes
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  Ñ: ['.#.#.', '#.#..', '#...#', '##..#', '#.#.#', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  ':': ['.....', '.....', '..#..', '.....', '.....', '..#..', '.....'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '¿': ['..#..', '.....', '..#..', '.#...', '#....', '#...#', '.###.'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
};
/** Un texto con esos glifos (5×7, 6 px por letra, 4 por espacio), para el cartel y los globos. */
export function textoPixel(c, x, y, t, col) {
  let cx = x;
  for (const ch of t) { if (ch === ' ') { cx += 4; continue; } const g = GLIFOS[ch]; if (g) for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j][i] === '#') { c.fillStyle = col; c.fillRect(cx + i, y + j, 1, 1); } cx += 6; }
}
/** Ancho en px de un texto con esos glifos (6 por letra, 4 por espacio). */
export function anchoCartel(texto) { let w = 0; for (const ch of texto) w += ch === ' ' ? 4 : 6; return w - 1; }

export function crearEdificio({ SALAS, TEMAS }) {
  const PAL = (TEMAS && TEMAS.oscuro) || { pared: '#3b3f55', paredClara: '#4d526d', paredOsc: '#262a3b', zocalo: '#1d2030', madera: '#c79a63', maderaClara: '#dbb27d', maderaOsc: '#9e7544', maderaSombra: '#6e4f2c', papel: '#f4efe2', ink: '#1a1a2e', naranja: '#ff7a3d', azul: '#6fa3ff', verde: '#5fae6a', verdeOsc: '#3d7a48' };
  const plantas = derivarPlantas(SALAS);
  const techo = (p) => techoDe(p.planta);
  const pies = (p) => piesDe(p.planta);
  const r = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const MURO_IZQ = MUNDO.X0 - MUROS, MURO_DER = MUNDO.X1;      // 116 y 520: los muros laterales van por fuera de las salas
  const FACHADA_X0 = MURO_IZQ, FACHADA_W = MUNDO.X1 + MUROS - MURO_IZQ;   // 116..524
  const LIBROS = ['#d9604c', '#e0b93c', '#4f95c9', '#5b8f6a', '#c96aa0', '#f4f0e6', '#6f6fd1'];
  const HIERRO = '#1c1b2e', VIDRIO_OSC = '#2a2f4a';
  const CARTEL = { texto: 'ESCUELA FUTURA', y: 150, h: 16 };
  const UMBRALES = { direccion: .9, secretaria: .8, admisiones: .68, biblioteca: .56, academia: .44, 'aula-bio1': .32, bienestar: .12, coordinacion: .02 };   // en qué orden se apagan las ventanas (de mayor a menor) cuando luzInterior baja
  const PROYECTOR = { x: 186, y: MUNDO.TECHO_BAJA + 6 };        // el proyector del aula, colgado del techo; el haz cae sobre el pizarrón
  const FAROLAS = [{ x: 150, y: 141 }, { x: 490, y: 141 }];     // las cabezas de las farolas de la capa cercana (coordenadas del mundo)
  CARTEL.w = anchoCartel(CARTEL.texto) + 8; CARTEL.x = Math.round((MUNDO.X0 + MUNDO.X1) / 2 - CARTEL.w / 2);

  // ---------- Muebles de perfil ----------
  function texto(c, x, y, t, col) { let cx = x; for (const ch of t) { if (ch === ' ') { cx += 4; continue; } const g = GLIFOS[ch]; if (g) for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j][i] === '#') r(c, cx + i, y + j, 1, 1, col); cx += 6; } }
  function escritorio(c, q, y1, encendida) {
    const { x0, x1, y } = q.mesa;
    r(c, x0 + 1, y + 3, 2, y1 - y - 5, PAL.maderaOsc); r(c, x1 - 3, y + 3, 2, y1 - y - 5, PAL.maderaOsc);           // patas
    r(c, x0, y, x1 - x0, 3, PAL.madera); r(c, x0, y, x1 - x0, 1, PAL.maderaClara); r(c, x0 + 2, y + 3, x1 - x0 - 4, 1, PAL.maderaSombra);   // tapa y canto
    r(c, x0 + 2, y + 4, 6, 4, PAL.maderaOsc); r(c, x0 + 3, y + 6, 4, 1, PAL.maderaSombra);                        // cajonera
    const p = q.pantalla;                                                                                      // monitor con pie
    r(c, p.x + 3, y - 2, 4, 2, '#22222e'); r(c, p.x + 4, y - 3, 2, 1, '#22222e');
    r(c, p.x, p.y, p.w, p.h, '#22222e'); r(c, p.x + 1, p.y + 1, p.w - 2, p.h - 2, encendida ? '#8ec2ff' : '#39435f');
    if (encendida) { r(c, p.x + 2, p.y + 2, 4, 1, '#eaf4ff'); r(c, p.x + 2, p.y + 4, 6, 1, '#eaf4ff'); r(c, p.x + 2, p.y + 6, 3, 1, '#eaf4ff'); }
    r(c, p.x + p.w + 2, y - 1, 5, 1, '#d8d3c4');                                                              // teclado
    if (q.cuaderno) { const n = q.cuaderno; r(c, n.x, n.y, n.w, n.h, PAL.papel); r(c, n.x, n.y, 1, n.h, PAL.naranja); }   // el cuaderno de Coordinación (memoria), en su rectángulo
  }
  function mostrador(c, q, y1) {
    const { x0, x1, y } = q.mesa;
    r(c, x0 - 2, y - 2, x1 - x0 + 4, 3, PAL.maderaClara); r(c, x0 - 2, y - 2, x1 - x0 + 4, 1, PAL.papel);        // la tapa del mostrador
    r(c, x0, y + 1, x1 - x0, y1 - y - 3, PAL.maderaOsc); r(c, x0, y + 1, x1 - x0, 2, PAL.madera);               // el frente
    for (let x = x0 + 4; x < x1 - 3; x += 7) r(c, x, y + 5, 3, 6, PAL.maderaSombra);                            // paneles
    r(c, x0 + 2, y - 6, 7, 4, PAL.papel); r(c, x0 + 3, y - 5, 5, 1, '#999');                                    // papeles
    r(c, x1 - 8, y - 5, 4, 3, '#e0b93c'); r(c, x1 - 7, y - 6, 2, 1, '#e0b93c');                                 // el timbre
  }
  function silla(c, q, y1) {
    const x = q.silla.x, col = '#3d4260';
    r(c, x + 3, y1 - 20, 2, 13, col); r(c, x - 3, y1 - 9, 8, 2, col);                                         // respaldo y asiento
    r(c, x, y1 - 7, 2, 5, '#1d2030'); r(c, x - 3, y1 - 2, 8, 1, '#1d2030');                                   // pie y base
  }
  function estante(c, e) {
    r(c, e.x, e.y, e.w, e.h, '#6b4a2a'); r(c, e.x + 1, e.y + 1, e.w - 2, e.h - 2, '#2c1f12');
    const filas = Math.max(1, Math.floor((e.h - 2) / 12));
    for (let f = 0; f < filas; f++) {
      const by = e.y + 2 + f * 12; let cx = e.x + 2, i = f * 3;
      while (cx < e.x + e.w - 3) { const a = 2 + (i % 3); r(c, cx, by + (i % 2), a, 9 - (i % 2), LIBROS[(i + f) % LIBROS.length]); cx += a; i++; }
      r(c, e.x + 1, by + 10, e.w - 2, 1, '#6b4a2a');
    }
  }
  function pizarron(c, z) {
    r(c, z.x, z.y, z.w, z.h, '#8a6a3e'); r(c, z.x, z.y, z.w, 1, '#a88552'); r(c, z.x + 2, z.y + 2, z.w - 4, z.h - 4, '#1f4d3a'); r(c, z.x + 2, z.y + 2, z.w - 4, 1, '#163a2b');
    const tiza = '#e8f0e8', ama = '#f4e9a6';
    const linea = (ly, col, partes) => { let cx = z.x + 5; for (const a of partes) { if (cx + a > z.x + z.w - 24) break; r(c, cx, ly, a, 1, col); cx += a + 3; } };
    linea(z.y + 5, tiza, [9, 5, 7]); r(c, z.x + 5, z.y + 7, 21, 1, ama); linea(z.y + 10, tiza, [4, 8, 6, 5, 7]); linea(z.y + 13, tiza, [7, 4, 9, 6]); linea(z.y + 16, ama, [5, 6, 4, 8]); linea(z.y + 19, tiza, [6, 9, 4]);
    const dx = z.x + z.w - 20, dy = z.y + 6;                                                                   // la célula
    r(c, dx, dy, 14, 11, tiza); r(c, dx + 1, dy + 1, 12, 9, '#1f4d3a'); r(c, dx + 5, dy + 3, 4, 4, tiza); r(c, dx + 6, dy + 4, 2, 2, '#1f4d3a'); r(c, dx + 2, dy + 7, 2, 1, ama); r(c, dx + 10, dy + 2, 2, 1, ama);
    r(c, z.x + 1, z.y + z.h, z.w - 2, 2, '#a88552'); r(c, z.x + 4, z.y + z.h - 1, 5, 1, '#f1ead8'); r(c, z.x + 12, z.y + z.h - 1, 3, 1, ama);   // repisa y tizas
  }
  function pupitre(c, pu, fila) {
    const mad = fila ? '#8a6b45' : PAL.madera, osc = fila ? '#5c4228' : PAL.maderaOsc;   // las filas de atrás, más apagadas
    r(c, pu.mesa, pu.y - 12, 9, 2, mad); r(c, pu.mesa, pu.y - 12, 9, 1, fila ? mad : PAL.maderaClara);         // la tapa
    r(c, pu.mesa + 1, pu.y - 10, 1, 8, osc); r(c, pu.mesa + 7, pu.y - 10, 1, 8, osc);                            // patas
    r(c, pu.x - 3, pu.y - 8, 7, 2, osc); r(c, pu.x, pu.y - 6, 1, 4, osc);                                         // el banco
  }
  function lamparaTecho(c, x, y0, prendida) {
    r(c, x, y0, 1, 3, PAL.paredOsc); r(c, x - 4, y0 + 3, 9, 2, PAL.paredClara); r(c, x - 3, y0 + 5, 7, 1, prendida ? '#ffd9a0' : '#6a6a80');
    if (prendida) r(c, x - 1, y0 + 6, 3, 1, '#fff2d6');
  }
  function ventanaInterior(c, v, vidrio) {
    r(c, v.x - 1, v.y - 1, v.w + 2, v.h + 2, PAL.paredOsc); r(c, v.x, v.y, v.w, v.h, vidrio);
    r(c, v.x + (v.w >> 1), v.y, 1, v.h, PAL.paredOsc); r(c, v.x, v.y + 9, v.w, 1, PAL.paredOsc);                  // cruz
    r(c, v.x - 2, v.y + v.h + 1, v.w + 4, 2, PAL.maderaOsc); r(c, v.x - 2, v.y + v.h + 1, v.w + 4, 1, PAL.madera);   // antepecho
    r(c, v.x + 2, v.y + 2, 3, 1, 'rgba(255,255,255,.35)');
  }
  function plantaMaceta(c, x, y) { r(c, x - 3, y - 6, 7, 6, '#b5653a'); r(c, x - 3, y - 6, 7, 1, '#d28a5a'); r(c, x - 5, y - 13, 11, 7, PAL.verde); r(c, x - 3, y - 17, 7, 5, PAL.verdeOsc); r(c, x - 1, y - 20, 3, 4, PAL.verde); r(c, x - 6, y - 10, 2, 2, PAL.verdeOsc); r(c, x + 4, y - 11, 2, 2, PAL.verdeOsc); }
  function cuadro(c, x, y) { r(c, x, y, 20, 14, '#6b4a2a'); r(c, x + 2, y + 2, 16, 10, '#e7d9b4'); r(c, x + 3, y + 8, 7, 3, '#7a9e6a'); r(c, x + 10, y + 5, 6, 6, '#c99a5b'); r(c, x + 5, y + 4, 3, 2, '#9fd0ff'); }
  function reloj(c, x, y) { r(c, x, y, 10, 10, PAL.papel); r(c, x + 1, y + 1, 8, 8, '#fff'); r(c, x + 5, y + 2, 1, 4, '#222'); r(c, x + 5, y + 5, 3, 1, '#222'); }
  function corcho(c, x, y, w) {
    r(c, x, y, w, 18, '#6b4a2a'); r(c, x + 2, y + 2, w - 4, 14, '#c9a06a');
    const papeles = [[3, 3, 9, 7, PAL.papel], [14, 4, 8, 6, '#f4e9a6'], [24, 3, 9, 8, PAL.papel], [35, 5, 7, 6, '#bfe3f0'], [44, 3, 9, 7, PAL.papel]];
    for (const [px, py, pw, ph, col] of papeles) { if (px + pw > w - 3) break; r(c, x + px, y + py, pw, ph, col); r(c, x + px + 2, y + py + 2, pw - 4, 1, '#999'); r(c, x + px + 2, y + py + 4, pw - 5, 1, '#999'); r(c, x + px + (pw >> 1) - 1, y + py - 1, 2, 2, '#d9604c'); }
  }
  function cruz(c, x, y) { r(c, x, y, 10, 10, PAL.papel); r(c, x + 4, y + 2, 2, 6, '#d9604c'); r(c, x + 2, y + 4, 6, 2, '#d9604c'); }
  function proyector(c, x, y0) { r(c, x, y0, 1, 4, PAL.paredOsc); r(c, x - 4, y0 + 4, 9, 4, '#d8dde6'); r(c, x - 3, y0 + 8, 7, 1, '#9aa0ad'); r(c, x + 3, y0 + 5, 2, 2, '#6fa3ff'); }
  function sofa(c, x, y1) { r(c, x, y1 - 12, 4, 10, '#a8527f'); r(c, x + 4, y1 - 8, 16, 6, '#d886b6'); r(c, x + 4, y1 - 9, 16, 1, '#c96aa0'); r(c, x + 20, y1 - 10, 3, 8, '#a8527f'); r(c, x + 1, y1 - 2, 2, 2, '#1d2030'); r(c, x + 20, y1 - 2, 2, 2, '#1d2030'); }
  function vano(c, x, y1) {   // el vano a nivel de piso en el tabique: dintel, jambas y el hueco en penumbra, para que se lea que se pasa por ahí
    r(c, x - 2, y1 - 34, 7, 3, PAL.maderaOsc); r(c, x - 1, y1 - 33, 5, 1, PAL.madera);                        // dintel
    r(c, x, y1 - 31, 3, 29, '#30344a');                                                                      // el hueco (más oscuro que la pared)
    r(c, x - 2, y1 - 31, 2, 29, PAL.maderaOsc); r(c, x + 3, y1 - 31, 2, 29, PAL.maderaOsc);                   // jambas
    r(c, x - 2, y1 - 31, 1, 29, PAL.madera); r(c, x + 4, y1 - 31, 1, 29, PAL.madera);
  }
  function escaleraFrontal(c, y0, y1) {   // la escalera sube hacia el fondo: peldaños que se achican hacia arriba (perspectiva), con barandas
    const x = ESCALERA.x, w = ESCALERA.w;
    r(c, x, y0, w, y1 - y0, PAL.paredOsc);
    let y = y1 - 2, alto = 5;
    for (let i = 0; y - alto > y0 + 2; i++) { r(c, x + 1, y - alto, w - 2, alto, '#4a4668'); r(c, x + 1, y - alto, w - 2, 1, '#6b668f'); r(c, x + 1, y - 1, w - 2, 1, '#2f2c48'); y -= alto; if (i % 3 === 2 && alto > 2) alto--; }
    r(c, x + 1, y0 + 1, w - 2, Math.max(1, y - y0 - 1), '#2f2c48');                                              // lo que queda arriba: el hueco en penumbra
    r(c, x, y0 + 1, 1, y1 - y0 - 3, PAL.maderaOsc); r(c, x + w - 1, y0 + 1, 1, y1 - y0 - 3, PAL.maderaOsc);     // barandas
    r(c, x - 1, y1 - 20, 1, 18, PAL.maderaClara); r(c, x + w, y1 - 20, 1, 18, PAL.maderaClara);                 // pasamanos del arranque
  }
  function baranda(c, x, w, y1) { r(c, x, y1 - 14, w, 1, PAL.maderaClara); for (let px = x; px < x + w; px += 4) r(c, px, y1 - 13, 1, 11, PAL.maderaOsc); r(c, x, y1 - 3, w, 1, PAL.maderaOsc); }
  function marcas(c) {   // la línea de tiempo del hall: tres cuadritos enmarcados unidos por una línea (los años los pone la lámina)
    r(c, MARCAS[0] - 6, MARCAS_Y, MARCAS[2] - MARCAS[0] + 12, 1, '#A8A2D0');
    const escenas = [['#4f95c9', '#f4e9a6'], ['#5fae6a', '#f4f0e6'], ['#c96aa0', '#9fd0ff']];
    MARCAS.forEach((x, i) => { r(c, x - 5, MARCAS_Y - 7, 11, 13, '#F3F0FF'); r(c, x - 4, MARCAS_Y - 6, 9, 11, escenas[i][0]); r(c, x - 2, MARCAS_Y - 1, 5, 3, escenas[i][1]); r(c, x, MARCAS_Y - 4, 1, 2, escenas[i][1]); r(c, x, MARCAS_Y + 6, 1, 2, '#F3F0FF'); });
  }
  function puertaCalleInterior(c, vidrio, vereda) {   // la puerta de calle vista desde adentro: dos hojas de vidrio por las que se ve el cielo y la vereda
    const x = PUERTA.x, w = PUERTA.w, y1 = MUNDO.PB, h = 32;
    r(c, x - 2, y1 - h - 2, w + 4, h + 2, PAL.maderaOsc); r(c, x, y1 - h, w, h - 2, vidrio); r(c, x, y1 - 11, w, 9, vereda);
    r(c, x + (w >> 1) - 1, y1 - h, 2, h - 2, PAL.maderaOsc); r(c, x, y1 - 8, w, 1, PAL.maderaOsc);              // parante central y travesaño
    r(c, x + 1, y1 - h + 1, 3, 1, 'rgba(255,255,255,.4)'); r(c, x + (w >> 1) - 4, y1 - 16, 2, 3, PAL.maderaClara); r(c, x + (w >> 1) + 2, y1 - 16, 2, 3, PAL.maderaClara);   // brillo y picaportes
    r(c, x - 3, y1 - 2, w + 6, 2, PAL.paredOsc);                                                                // el umbral
  }

  // ---------- Exterior (árboles, reja, mástil) ----------
  function arbol(c, x, y, alto, tronco, copa, copaClara, copaOsc = '#23452c') {
    r(c, x - 1, y - alto, 3, alto, tronco); r(c, x - 3, y - 3, 7, 3, tronco); r(c, x + 1, y - alto, 1, alto, '#3d2816');
    r(c, x - 5, y - alto + 6, 4, 1, tronco); r(c, x + 2, y - alto + 10, 5, 1, tronco);                           // dos ramas
    // la copa: tres masas desparejas, con sombra abajo y luz arriba a la derecha
    const ty = y - alto;
    const masa = (mx, my, w, h, col) => { for (let j = 0; j < h; j++) { const k = j < h / 2 ? j : h - 1 - j; const ww = Math.max(2, w - Math.max(0, (h / 2 - k)) * 2 | 0); r(c, mx - (ww >> 1), my + j, ww, 1, col); } };
    masa(x - 7, ty - 4, 18, 12, copaOsc); masa(x + 8, ty - 2, 16, 10, copaOsc);
    masa(x - 6, ty - 8, 18, 12, copa); masa(x + 7, ty - 6, 16, 10, copa); masa(x, ty - 16, 20, 14, copa);
    masa(x + 3, ty - 15, 10, 7, copaClara); r(c, x - 7, ty - 9, 4, 2, copaClara); r(c, x + 7, ty - 3, 3, 2, copaClara); r(c, x - 2, ty - 5, 2, 1, copaClara);
  }
  function aroBasquet(c, x, y1) {
    r(c, x, y1 - 44, 2, 44, '#9a9ab0'); r(c, x - 2, y1 - 2, 6, 2, '#5a5a74');
    r(c, x - 7, y1 - 52, 12, 10, '#e8ecf2'); r(c, x - 7, y1 - 52, 12, 1, '#b8bfcc'); r(c, x - 4, y1 - 49, 6, 5, '#d9604c'); r(c, x - 3, y1 - 48, 4, 3, '#e8ecf2');
    r(c, x - 9, y1 - 43, 6, 1, '#ff7a3d'); r(c, x - 9, y1 - 42, 1, 3, '#e8ecf2'); r(c, x - 7, y1 - 42, 1, 3, '#e8ecf2'); r(c, x - 5, y1 - 42, 1, 3, '#e8ecf2');   // el aro y la red
  }
  function rejaPatio(c, x0, w, y1) {
    r(c, x0, y1 - 24, w, 2, HIERRO); r(c, x0, y1 - 4, w, 2, HIERRO);
    for (let x = x0; x < x0 + w; x += 4) { r(c, x, y1 - 22, 1, 18, HIERRO); r(c, x, y1 - 26, 1, 2, HIERRO); }
    for (let x = x0; x <= x0 + w; x += 28) { r(c, x - 1, y1 - 28, 3, 28, HIERRO); r(c, x - 2, y1 - 29, 5, 2, '#2c2a44'); }
  }
  function mastil(c, x, y1) {
    r(c, x - 3, y1 - 3, 7, 3, '#5a5a74'); r(c, x, y1 - 70, 1, 67, '#c9c9d6'); r(c, x - 1, y1 - 72, 3, 2, '#e0b93c');
    r(c, x + 1, y1 - 69, 12, 2, '#74acdf'); r(c, x + 1, y1 - 67, 12, 2, '#f4f0e6'); r(c, x + 1, y1 - 65, 12, 2, '#74acdf');
  }
  function banco(c, x, y1) { r(c, x, y1 - 9, 20, 2, PAL.madera); r(c, x, y1 - 14, 20, 2, PAL.maderaClara); r(c, x + 1, y1 - 7, 2, 7, HIERRO); r(c, x + 17, y1 - 7, 2, 7, HIERRO); r(c, x + 1, y1 - 12, 2, 3, HIERRO); r(c, x + 17, y1 - 12, 2, 3, HIERRO); }
  function tacho(c, x, y1) { r(c, x, y1 - 9, 6, 9, '#3d6a4a'); r(c, x - 1, y1 - 10, 8, 2, '#4f8a60'); r(c, x + 1, y1 - 6, 4, 1, '#2a4a34'); }

  // ---------- La fachada ----------
  function ventanaFachada(c, v, vidrio) {
    r(c, v.x - 2, v.y - 3, v.w + 4, 2, PAL.paredOsc);                                                          // dintel
    r(c, v.x - 1, v.y - 1, v.w + 2, v.h + 2, PAL.zocalo); r(c, v.x, v.y, v.w, v.h, vidrio);
    r(c, v.x + (v.w >> 1), v.y, 1, v.h, PAL.zocalo); r(c, v.x, v.y + 9, v.w, 1, PAL.zocalo);                     // la cruz del marco
    r(c, v.x - 2, v.y + v.h + 1, v.w + 4, 2, PAL.paredOsc); r(c, v.x - 2, v.y + v.h + 1, v.w + 4, 1, PAL.paredClara);   // antepecho
  }
  function puertaCalle(c, vidrio) {
    const x = PUERTA.x, w = PUERTA.w, y1 = MUNDO.PB;
    r(c, x - 4, y1 - 42, w + 8, 4, PAL.paredOsc); r(c, x - 4, y1 - 42, w + 8, 1, PAL.paredClara);               // la marquesina
    r(c, x - 3, y1 - 38, 1, 3, PAL.zocalo); r(c, x + w + 2, y1 - 38, 1, 3, PAL.zocalo);
    r(c, x - 2, y1 - 37, w + 4, 37, PAL.zocalo);                                                               // el marco
    r(c, x, y1 - 36, w, 4, vidrio);                                                                            // el montante
    r(c, x, y1 - 31, w, 31, PAL.maderaOsc);                                                                    // las dos hojas
    r(c, x + 1, y1 - 30, 7, 19, vidrio); r(c, x + 10, y1 - 30, 7, 19, vidrio);
    r(c, x + 1, y1 - 10, 7, 8, PAL.madera); r(c, x + 10, y1 - 10, 7, 8, PAL.madera);
    r(c, x + 6, y1 - 17, 2, 3, PAL.maderaClara); r(c, x + 10, y1 - 17, 2, 3, PAL.maderaClara);                  // picaportes
    r(c, x - 3, y1, w + 6, 2, '#6a6a86');                                                                      // el escalón
  }
  function cartel(c) {
    r(c, CARTEL.x - 1, CARTEL.y - 1, CARTEL.w + 2, CARTEL.h + 2, PAL.maderaOsc); r(c, CARTEL.x, CARTEL.y, CARTEL.w, CARTEL.h, PAL.papel);
    r(c, CARTEL.x + 1, CARTEL.y + CARTEL.h - 1, CARTEL.w - 2, 1, '#d8d3c4');
    texto(c, CARTEL.x + 4, CARTEL.y + 4, CARTEL.texto, PAL.ink);
  }

  const edificio = {
    plantas,
    cartel: CARTEL,
    /** Lo que está detrás y debajo del edificio: vereda, calle, el patio con su reja, el mástil y los árboles, un banco. */
    dibujarFondo(c) {
      const S = MUNDO.SUELO, XA = -MARGEN, XB = MUNDO.W + MARGEN;
      // la vereda, con baldosas, y la calle con su cordón (de margen a margen: si el lienzo es más ancho que el mundo, sigue)
      r(c, XA, S, XB - XA, 10, '#4e4f68'); for (let x = XA; x < XB; x += 8) r(c, x, S, 1, 10, '#454660'); r(c, XA, S + 5, XB - XA, 1, '#454660');
      r(c, XA, S + 10, XB - XA, 2, '#3a3b52'); r(c, XA, S + 12, XB - XA, MUNDO.H - S - 12, SUELO_COLOR);
      for (let x = XA + 4; x < XB; x += 24) r(c, x, S + 34, 12, 1, '#3d3c58');
      // el patio, a la derecha: pasto, el mástil con la bandera, un árbol, un banco, el aro de básquet y la reja al frente
      const px = PATIO.x;
      for (let x = px; x < XB; x += 8) r(c, x, S - 8, 8, 8, ((x - px) / 8 | 0) % 2 ? '#2f5a3a' : '#2a5034');
      r(c, px, S - 8, XB - px, 1, '#3a6a46');
      mastil(c, px + 16, S - 8);
      arbol(c, px + 62, S - 8, 34, '#5a3d24', '#2f5a3a', '#4a7f55');
      banco(c, px + 82, S - 8); aroBasquet(c, px + 108, S - 8);
      rejaPatio(c, px, XB - px, S);
      // a la izquierda: un árbol de vereda, un banco y un tacho
      arbol(c, 56, S, 30, '#5a3d24', '#2f5a3a', '#4a7f55');
      banco(c, 82, S); tacho(c, 108, S);
    },
    /** El interior: las salas con sus muebles de perfil, el hall con la puerta, las marcas y la escalera, los muros, la losa y la azotea. */
    dibujarInterior(c, estado) {
      const [, medio, horizonte] = cielo(estado.hora);
      const prendida = (estado.luzInterior ?? 1) > .3;
      const vidrioAlta = rgb(medio), vidrioBaja = rgb(mezcla(medio, horizonte, .5));
      // muros laterales, la losa entre plantas y la azotea (las caras cortadas de la casa de muñecas)
      r(c, MURO_IZQ, MUNDO.AZOTEA, MUNDO.X1 + MUROS - MURO_IZQ, MUNDO.SUELO - MUNDO.AZOTEA, PAL.paredOsc);
      for (const p of plantas) {
        const y0 = techo(p), y1 = pies(p), hall = !p.fisica;
        const pared = p.id === 'hall' ? PAL.paredClara : PAL.pared;
        r(c, p.x, y0, p.w, y1 - y0, pared);
        r(c, p.x, y0, p.w, 1, PAL.paredClara); r(c, p.x, y0 + 7, p.w, 1, p.id === 'hall' ? '#5a5f7e' : PAL.paredClara);   // cielorraso y guarda
        r(c, p.x, y1 - 6, p.w, 1, PAL.paredOsc); r(c, p.x, y1 - 5, p.w, 3, PAL.zocalo);                                      // zócalo
        for (let x = p.x; x < p.x + p.w; x += 8) r(c, x, y1 - 2, Math.min(8, p.x + p.w - x), 4, ((x - p.x) / 8 | 0) % 2 ? p.color[0] : p.color[1]);   // el piso
        r(c, p.x, y1 + 2, p.w, 1, PAL.paredOsc);
        // ventanas al fondo (una por escritorio, alineadas con las de la fachada) y la lámpara
        if (!hall) for (const v of this.ventanas(estado)) if (v.puesto && p.puestos.some((q) => q.id === v.puesto && q.escritorio)) ventanaInterior(c, v, p.planta === 'alta' ? vidrioAlta : vidrioBaja);
        if (p.id === 'p3') ventanaInterior(c, { x: 216, y: y0 + 18, w: 20, h: 24 }, vidrioBaja);
        if (p.id === 'hall-alto') ventanaInterior(c, { x: p.x + 11, y: y0 + 16, w: 18, h: 22 }, vidrioAlta);
        // muebles por sala
        if (p.id === 'p1') { cuadro(c, 128, y0 + 14); corcho(c, 190, y0 + 12, 50); plantaMaceta(c, 131, y1); }
        if (p.id === 'p2') { reloj(c, 350, y0 + 10); corcho(c, 400, y0 + 12, 60); plantaMaceta(c, 509, y1); }
        if (p.id === 'p3') { pizarron(c, p.pizarron); proyector(c, PROYECTOR.x, y0); reloj(c, 284, y0 + 10); plantaMaceta(c, 294, y1); for (let f = 2; f >= 0; f--) for (const pu of p.pupitres) if (pu.fila === f) pupitre(c, pu, f); }
        if (p.id === 'p4') { cruz(c, 404, y0 + 6); sofa(c, 403, y1 - 2); }
        for (const q of p.puestos) {
          if (q.estante) estante(c, q.estante);
          if (!q.escritorio) continue;
          silla(c, q, y1);
          if (q.mostrador) mostrador(c, q, y1); else escritorio(c, q, y1, prendida);
        }
        if (p.id === 'hall') { puertaCalleInterior(c, vidrioBaja, '#4e4f68'); marcas(c); escaleraFrontal(c, y0, y1); }
        if (p.id === 'hall-alto') { baranda(c, p.x + 20, 18, y1); plantaMaceta(c, p.x + 7, y1); }
        lamparaTecho(c, Math.round(p.x + p.w / 2), y0, prendida);
      }
      // tabiques entre salas de la misma planta, cortados abajo por el vano
      for (const p of plantas) if (p.x > MUNDO.X0) { const y0 = techo(p), y1 = pies(p); r(c, p.x - 2, y0, 3, y1 - 34 - y0, PAL.paredOsc); vano(c, p.x - 2, y1); }
      r(c, MURO_IZQ, MUNDO.PA + 2, FACHADA_W, 2, PAL.paredOsc); r(c, MURO_IZQ, MUNDO.PA + 2, FACHADA_W, 1, '#30344a');      // la losa
      // la azotea: parapeto, el tanque de agua y la antena
      r(c, MURO_IZQ - 4, MUNDO.AZOTEA, FACHADA_W + 8, 8, PAL.paredOsc); r(c, MURO_IZQ - 4, MUNDO.AZOTEA, FACHADA_W + 8, 1, '#5a5f7e'); r(c, MURO_IZQ - 4, MUNDO.AZOTEA + 7, FACHADA_W + 8, 1, PAL.zocalo);
      r(c, 472, MUNDO.AZOTEA - 16, 22, 16, '#5a5a74'); r(c, 472, MUNDO.AZOTEA - 16, 22, 2, '#7a7a96'); r(c, 474, MUNDO.AZOTEA - 18, 18, 2, '#7a7a96'); r(c, 472, MUNDO.AZOTEA - 6, 22, 1, '#44445c');
      r(c, 474, MUNDO.AZOTEA - 2, 2, 2, '#2c2a44'); r(c, 490, MUNDO.AZOTEA - 2, 2, 2, '#2c2a44');
      r(c, 144, MUNDO.AZOTEA - 20, 1, 20, '#9a9ab0'); r(c, 140, MUNDO.AZOTEA - 17, 9, 1, '#9a9ab0'); r(c, 141, MUNDO.AZOTEA - 12, 7, 1, '#9a9ab0'); r(c, 142, MUNDO.AZOTEA - 7, 5, 1, '#9a9ab0');
    },
    /** La pared de frente: ventanas (una por puesto), la puerta de calle con su marquesina y el cartel; su opacidad es estado.fachada. */
    dibujarFachada(c, estado) {
      c.clearRect(0, 0, MUNDO.W, MUNDO.H);
      const [, medio, horizonte] = cielo(estado.hora), noche = 1 - Math.abs(estado.hora - .5) * 2;
      const vidrioDe = (prendida) => rgb(mezcla(mezcla(medio, horizonte, .4), [255, 214, 150], Math.min(1, prendida * (.3 + .7 * Math.max(0, noche)))));
      const vidrio = vidrioDe(estado.luzInterior ?? 1);
      const y0 = MUNDO.AZOTEA + 8, y1 = MUNDO.SUELO;
      r(c, FACHADA_X0, y0, FACHADA_W, y1 - y0, PAL.paredClara);
      r(c, FACHADA_X0, y1 - 8, FACHADA_W, 8, PAL.zocalo); r(c, FACHADA_X0, y1 - 8, FACHADA_W, 1, PAL.paredOsc);      // el zócalo de la calle
      r(c, FACHADA_X0, MUNDO.PA + 1, FACHADA_W, 4, PAL.paredOsc); r(c, FACHADA_X0, MUNDO.PA, FACHADA_W, 1, '#5a5f7e');   // la cornisa entre plantas
      r(c, FACHADA_X0, y0, 4, y1 - y0, PAL.pared); r(c, FACHADA_X0 + FACHADA_W - 4, y0, 4, y1 - y0, PAL.pared);          // pilastras
      r(c, FACHADA_X0 + 4, y0, 1, y1 - y0, PAL.paredOsc); r(c, FACHADA_X0 + FACHADA_W - 5, y0, 1, y1 - y0, PAL.paredOsc);
      for (const v of this.ventanas(estado)) ventanaFachada(c, v, vidrioDe(ventanaPrendida(v, estado)));
      puertaCalle(c, vidrio);
      cartel(c);
    },
    /** Lejos (paralaje .45): las sierras en dos planos y una línea de árboles de fondo. Sin arcos: columnas de 1 px. */
    capaLejana(c) {
      c.clearRect(-MARGEN, 0, MUNDO.W + MARGEN * 2, MUNDO.H);
      const base = MUNDO.SUELO + 4;
      const bumps = (x, lista) => { let h = 0; for (const [cx, w, a] of lista) { const d = Math.abs(x - cx) / w; if (d < 1) h += a * (1 - d * d) * (1 - d * d); } return h; };
      const lejos = [[-120, 170, 44], [40, 160, 46], [250, 230, 70], [460, 200, 58], [640, 180, 50], [800, 170, 48]], cerca = [[-60, 140, 32], [110, 130, 30], [330, 170, 40], [560, 150, 36], [740, 150, 34]];
      for (let x = -MARGEN; x < MUNDO.W + MARGEN; x++) {
        const h1 = Math.round(bumps(x, lejos) + 18), h2 = Math.round(bumps(x, cerca) + 6);
        r(c, x, base - h1, 1, h1, '#2a2a56'); r(c, x, base - h1, 1, 1, '#363668');
        r(c, x, base - h2, 1, h2, '#232248'); r(c, x, base - h2, 1, 1, '#2c2b54');
      }
      for (let i = 0; i < 44; i++) {   // árboles de fondo, en silueta, de alturas distintas
        const x = -MARGEN + 6 + i * 22 + (i * 13) % 9, alto = 14 + (i * 7) % 12, y = base - 4;
        r(c, x, y - alto, 2, alto, '#1c1b3e'); const anchos = [4, 8, 10, 10, 8, 6]; anchos.forEach((w, j) => r(c, x + 1 - (w >> 1), y - alto - 12 + j * 2, w, 2, '#1e1d42'));
      }
    },
    /** Cerca (paralaje 1.5; solo se ve afuera): la reja de la calle, dos farolas y dos ramas con hojas que entran por arriba. */
    capaCercana(c) {
      c.clearRect(-MARGEN, 0, MUNDO.W + MARGEN * 2, MUNDO.H);
      const OSC = '#0b0a18', y0 = 254, XA = -MARGEN, XB = MUNDO.W + MARGEN;
      r(c, XA, y0, XB - XA, 2, OSC); r(c, XA, MUNDO.H - 4, XB - XA, 4, OSC);
      for (let x = XA + 2; x < XB; x += 6) { r(c, x, y0 - 4, 1, MUNDO.H - y0 + 4, OSC); r(c, x - 1, y0 - 5, 3, 2, OSC); }
      for (let x = XA; x <= XB; x += 48) { r(c, x - 2, y0 - 8, 4, MUNDO.H - y0 + 8, OSC); r(c, x - 3, y0 - 10, 6, 2, OSC); }
      for (const x of [150, 490]) {   // las farolas: poste, brazo y cabeza con la luz prendida
        r(c, x - 2, 140, 4, MUNDO.H - 140, OSC); r(c, x - 4, MUNDO.H - 8, 8, 8, OSC);
        r(c, x - 6, 134, 12, 6, OSC); r(c, x - 7, 132, 14, 2, OSC); r(c, x - 4, 140, 8, 2, '#ffd9a0'); r(c, x - 2, 142, 4, 1, '#fff2d6');
      }
      // dos ramas que entran en cuadro desde arriba, con racimos de hojas en tres tonos
      const racimo = (x, y, w, h) => { for (let j = 0; j < h; j++) { const k = Math.min(j, h - 1 - j), ww = Math.max(4, w - (Math.max(0, h / 2 - k - 1) * 4 | 0)); r(c, x - (ww >> 1), y + j, ww, 1, j > h * .6 ? '#0f1c14' : '#13241a'); } r(c, x - (w >> 2), y + 1, w >> 2, 2, '#1d3a26'); r(c, x + 2, y + (h >> 1), 3, 1, '#1d3a26'); };
      const rama = (x0, y0r, dx, largo) => { let x = x0, y = y0r; for (let i = 0; i < largo; i++) { r(c, x, y, 4, 3, '#1a1410'); x += dx; y += (i % 2 === 0) ? 1 : 0; if (i % 3 === 1) racimo(x + (dx > 0 ? 8 : -8), y - 6 + (i % 2) * 6, 26 + (i % 3) * 6, 12); } };
      rama(-12, 0, 6, 22); rama(-8, 16, 6, 10); rama(MUNDO.W + 10, -2, -6, 24); rama(MUNDO.W + 6, 18, -6, 9);
    },
    /** Una ventana de la fachada por puesto. `umbral`: la ventana está prendida mientras luzInterior lo supera, así con luzInterior
     *  fraccionario se prenden (lámina 3) y se apagan (gracias) de a una; en Coordinación y Bienestar se quedan trabajando hasta el final. */
    ventanas() {
      const v = [];
      for (const p of plantas) for (const q of p.puestos) v.push({ x: q.x - 10, y: techo(p) + 18, w: 20, h: 24, puesto: q.id, umbral: UMBRALES[q.id] ?? .5 });
      return v;
    },
    /** Una lámpara por sala, en el techo; x0 y w son los de la sala, para recortar la luz. */
    lamparas() { return plantas.map((p) => ({ x: Math.round(p.x + p.w / 2), y: techo(p) + 5, r: Math.round((pies(p) - techo(p)) * 1.1), sala: p.id, x0: p.x, w: p.w })); },
    /** El proyector del aula y el pizarrón donde cae el haz; null si el plano no es el aula o el aula está vacía. */
    proyector(estado) {
      if (!estado || estado.plano !== 'aula' || estado.vacia) return null;
      const z = plantas.find((p) => p.id === 'p3').pizarron;
      return { x: PROYECTOR.x, y: PROYECTOR.y, pantalla: { x: z.x + (z.w >> 1), y0: z.y, y1: z.y + z.h } };
    },
    /** Las farolas de la capa cercana, para el halo de noche. */
    farolas() { return FAROLAS.map((f) => ({ ...f })); },
    cielo,
    techo, pies,
  };
  return edificio;
}
