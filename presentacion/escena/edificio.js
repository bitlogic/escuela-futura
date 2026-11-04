// El edificio de perfil (casa de muñecas): el mundo lógico de 640×288 px con dos plantas derivadas del plano
// de la demo (SALAS de stage/oficina.js), el hall con la escalera y la puerta de calle, la fachada, el patio y
// las capas lejana y cercana. Ver CONTRATO.md §3.1 y §4.
//
// RELLENO (oleada 0): dibuja rectángulos de color por sala, losas, techo, puerta y ventanas. El agente
// "edificio" de la oleada 1 lo reemplaza por el dibujo real (muebles de perfil, escalera, marcas, cartel,
// exterior, capas) manteniendo estas firmas.

export const MUNDO = { W: 640, H: 288, PB: 228, PA: 148, X0: 120, X1: 520, TECHO_BAJA: 152, TECHO_ALTA: 72, AZOTEA: 64, SUELO: 230 };

// El reparto de la planta baja y la alta en x (el hall se ensancha a 100 px para que Sofía pueda recorrerlo).
const REPARTO = {
  baja: [{ fisica: 'p3', x: 120, w: 180 }, { id: 'hall', x: 300, w: 100 }, { fisica: 'p4', x: 400, w: 120 }],
  alta: [{ fisica: 'p1', x: 120, w: 180 }, { id: 'hall-alto', x: 300, w: 40 }, { fisica: 'p2', x: 340, w: 180 }],
};
export const PUERTA = { x: 302, w: 18 };                      // la puerta de calle, al principio del hall de planta baja
export const MARCAS = [328, 354, 380];                         // 2022 · 2024 · 2026 en la pared del hall (x lógico): Sofía entra por la puerta y las recorre
export const MARCAS_Y = 168;
export const ESCALERA = { x: 382, w: 18 };                     // la escalera al final del hall, pegada a Bienestar

/** Deriva las plantas de perfil de las salas del plano: mismo orden y mismos puestos, anchos proporcionales. */
export function derivarPlantas(SALAS) {
  const lugares = Object.entries(SALAS).filter(([, s]) => s.fisica);
  const plantas = [];
  for (const [planta, tramos] of Object.entries(REPARTO)) {
    for (const t of tramos) {
      if (!t.fisica) { plantas.push({ id: t.id, nombre: t.id === 'hall' ? 'Hall' : 'Descanso', x: t.x, w: t.w, planta, fisica: null, puestos: [], color: ['#3a3d5c', '#34375a'] }); continue; }
      const propios = lugares.filter(([, s]) => s.fisica.id === t.fisica);
      const f = propios[0][1].fisica;
      const puestos = propios.map(([id, s]) => ({ id, nombre: s.nombre, x: s.escritorio === false ? t.x + t.w * .8 : t.x + ((s.cx ?? s.visitas[0].x) - f.x0) / f.ancho * t.w, escritorio: s.escritorio !== false }));
      plantas.push({ id: f.id, nombre: f.nombre, x: t.x, w: t.w, planta, fisica: f, puestos, color: f.piso });
    }
  }
  return plantas;
}

const lerp = (a, b, k) => a + (b - a) * k;
const mezcla = (c1, c2, k) => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
const CIELOS = { tarde: [[20, 16, 50], [122, 60, 150], [255, 140, 90]], noche: [[6, 5, 15], [10, 9, 30], [18, 16, 48]], manana: [[60, 80, 150], [130, 170, 230], [196, 226, 255]] };

/** Cielo por hora: [arriba, medio, horizonte] en rgb. 0 atardecer · .5 noche · 1 mañana. */
export function cielo(hora) {
  const k = hora < .5 ? hora * 2 : (hora - .5) * 2, A = hora < .5 ? CIELOS.tarde : CIELOS.noche, B = hora < .5 ? CIELOS.noche : CIELOS.manana;
  return [mezcla(A[0], B[0], k), mezcla(A[1], B[1], k), mezcla(A[2], B[2], k)];
}
const oscurecer = (hex, k) => { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return `rgb(${r * k | 0},${g * k | 0},${b * k | 0})`; };

export function crearEdificio({ SALAS, TEMAS }) {
  const PAL = (TEMAS && TEMAS.oscuro) || { pared: '#3b3f55', paredOsc: '#262a3b', zocalo: '#1d2030', madera: '#c79a63', papel: '#f4efe2' };
  const plantas = derivarPlantas(SALAS);
  const techo = (p) => (p.planta === 'baja' ? MUNDO.TECHO_BAJA : MUNDO.TECHO_ALTA);
  const pies = (p) => (p.planta === 'baja' ? MUNDO.PB : MUNDO.PA);
  const r = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  return {
    plantas,
    /** Terreno y calle (lo que está detrás y debajo del edificio). */
    dibujarFondo(c) {
      r(c, 0, MUNDO.SUELO, MUNDO.W, MUNDO.H - MUNDO.SUELO, '#1e2a22');
      r(c, 100, MUNDO.SUELO, 440, 6, '#3b3752'); r(c, 100, MUNDO.SUELO, 440, 1, '#5a5480');
    },
    /** El interior: salas con su piso, losas, techo, escalera y puerta. */
    dibujarInterior(c, estado) {
      r(c, MUNDO.X0 - 8, MUNDO.AZOTEA - 8, MUNDO.X1 - MUNDO.X0 + 16, MUNDO.SUELO - MUNDO.AZOTEA + 8, '#17152a');
      const [, medio] = cielo(estado.hora);
      for (const p of plantas) {
        const y0 = techo(p), y1 = pies(p);
        r(c, p.x, y0, p.w, y1 - y0, oscurecer(p.color[0], .55));
        r(c, p.x, y1 - 4, p.w, 4, oscurecer(p.color[1], .4));
        r(c, p.x, y0, p.w, 1, 'rgba(255,255,255,.06)');
        if (p.fisica) { r(c, p.x + p.w - 40, y0 + 14, 24, 22, `rgb(${medio.map((v) => v | 0).join(',')})`); r(c, p.x + p.w / 2 - 6, y0 + 2, 12, 3, PAL.papel); }
        for (const q of p.puestos) if (q.escritorio) { r(c, q.x - 12, y1 - 11, 24, 3, PAL.madera); r(c, q.x - 10, y1 - 8, 2, 8, PAL.madera); r(c, q.x + 8, y1 - 8, 2, 8, PAL.madera); r(c, q.x - 4, y1 - 16, 9, 5, PAL.papel); }
        if (p.id === 'hall') {
          for (let i = 0; i < 9; i++) r(c, ESCALERA.x, y1 - 4 - i * 8, ESCALERA.w, 3, '#4a4668');
          r(c, PUERTA.x, y1 - 28, PUERTA.w, 28, '#5a5480');
          r(c, MARCAS[0], MARCAS_Y, MARCAS[2] - MARCAS[0], 1, '#A8A2D0'); for (const x of MARCAS) r(c, x, MARCAS_Y - 3, 1, 7, '#F3F0FF');
        }
        if (p.x > MUNDO.X0) r(c, p.x - 1, y0, 2, y1 - y0, '#14122a');
      }
      r(c, MUNDO.X0 - 8, MUNDO.PA + 1, MUNDO.X1 - MUNDO.X0 + 16, 4, PAL.paredOsc);   // la losa entre plantas
      r(c, MUNDO.X0 - 16, MUNDO.AZOTEA - 8, MUNDO.X1 - MUNDO.X0 + 32, 8, PAL.paredOsc);  // la azotea
    },
    /** La pared de frente, con ventanas y la puerta; se dibuja aparte porque su opacidad es estado.fachada. */
    dibujarFachada(c, estado) {
      c.clearRect(0, 0, MUNDO.W, MUNDO.H);
      r(c, MUNDO.X0, MUNDO.AZOTEA, MUNDO.X1 - MUNDO.X0, MUNDO.SUELO - MUNDO.AZOTEA, PAL.pared);
      r(c, MUNDO.X0, MUNDO.PA, MUNDO.X1 - MUNDO.X0, 5, PAL.paredOsc);
      const noche = 1 - Math.abs(estado.hora - .5) * 2, luz = Math.max(noche, .45);
      for (const v of this.ventanas(estado)) { r(c, v.x - 2, v.y - 2, v.w + 4, v.h + 4, '#1b1830'); r(c, v.x, v.y, v.w, v.h, `rgba(255,214,160,${.35 + .6 * luz})`); r(c, v.x + v.w / 2 - 1, v.y, 2, v.h, '#1b1830'); r(c, v.x, v.y + v.h / 2 - 1, v.w, 2, '#1b1830'); }
      r(c, PUERTA.x - 3, MUNDO.PB - 31, PUERTA.w + 6, 31, '#1b1830'); r(c, PUERTA.x, MUNDO.PB - 28, PUERTA.w, 28, '#5a5480');
      r(c, 280, MUNDO.PA + 18, 124, 12, PAL.papel);   // el cartel (texto: oleada 1)
    },
    /** Lejos: cerros y árboles de fondo (paralaje .45). */
    capaLejana(c) {
      c.clearRect(0, 0, MUNDO.W, MUNDO.H);
      c.fillStyle = '#141230'; for (let i = 0; i < 9; i++) { const x = i * 90 - 40 + ((i * 37) % 50), rad = 70 + (i * 53) % 50; c.beginPath(); c.arc(x, MUNDO.SUELO + 20, rad, 0, 7); c.fill(); }
      c.fillStyle = '#1b1838'; for (let i = 0; i < 24; i++) { const x = i * 28 + (i * 19) % 17; c.fillRect(x, 200 - (i * 7) % 18, 4, 30); c.beginPath(); c.arc(x + 2, 198 - (i * 7) % 18, 8, 0, 7); c.fill(); }
    },
    /** Cerca: reja, farolas y hojas (paralaje 1.5; solo se ve afuera). */
    capaCercana(c) {
      c.clearRect(0, 0, MUNDO.W, MUNDO.H);
      c.fillStyle = '#0b0a18'; for (let x = 0; x < MUNDO.W; x += 18) c.fillRect(x, 240, 2, 48); c.fillRect(0, 242, MUNDO.W, 2);
      for (let i = 0; i < 5; i++) { const x = 60 + i * 140; c.fillRect(x, 160, 3, 84); c.fillStyle = '#ffd9a0'; c.fillRect(x - 3, 156, 9, 5); c.fillStyle = '#0b0a18'; }
    },
    /** Una ventana de la fachada por puesto. */
    ventanas() {
      const v = [];
      for (const p of plantas) for (const q of p.puestos) v.push({ x: q.x - 11, y: techo(p) + 20, w: 22, h: 26, puesto: q.id });
      return v;
    },
    /** Una lámpara por sala, en el techo. */
    lamparas() { return plantas.filter((p) => p.fisica || p.id === 'hall').map((p) => ({ x: p.x + p.w / 2, y: techo(p) + 4, r: (pies(p) - techo(p)) * 1.1, sala: p.id })); },
    cielo,
    techo, pies,
  };
}
