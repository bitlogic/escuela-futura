// La luz de la escuela vista desde arriba (modo cenital): una capa sobre el lienzo del plano (`#luz` sobre
// `#lienzo` en index.html), con una lámpara cálida por sala física, una viñeta suave y un halo azul sobre el
// escritorio de Dirección mientras hay una propuesta esperando decisión. El pixel-art de abajo sigue nítido:
// acá no hay desenfoque, solo degradados radiales compuestos en 'lighter' y una viñeta en 'source-over'.
//
// Es el mismo mundo que la escena de perfil de la charla (presentacion/escena/luz.js): ese módulo importa de
// acá `crearHalos` (los sprites radiales cacheados por color y el halo) y reexporta `crearLuzCenital`. Vive en
// stage/ porque el servidor de la escuela (./escenario) sirve solo esta carpeta; la charla (./charla) la
// reenvía por el mismo origen, así `./luz.js` resuelve en los dos.
//
//   crearLuzCenital(canvas, { salas, W, H, tema }) → { render({ esperandoDecision, tema, t, escala }), activa (get/set), lamparas }
//
// `render` dibuja solo cuando algo cambió (tema, decisión, resolución) o mientras el halo de Dirección respira;
// con `activa = false` limpia una vez y no dibuja ni consume. El módulo se importa en Node sin DOM: nada de
// document fuera de crear….

const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Colores (rgb). La lámpara es la misma cálida de la escena de perfil; el halo de decisión es el azul de la vista.
export const COLORES_CENITAL = { lampara: [255, 214, 160], decision: [111, 163, 255], noche: [8, 6, 28], dia: [40, 30, 20] };

// Cuánto se nota cada cosa por tema: en el claro (papel crema) la luz es más suave para no ensuciar el fondo.
export const INTENSIDAD = {
  oscuro: { ambiente: .30, lampara: .46, tubo: .22, vineta: .55, decision: .62 },
  claro:  { ambiente: .07, lampara: .24, tubo: .12, vineta: .22, decision: .6 },
};

/** Sprites radiales cacheados por color (256×256, del color al centro a transparente al borde) y el halo que los dibuja escalados. */
export function crearHalos(ctx) {
  const sprites = new Map();
  function sprite(color, suave = false) {
    const k = color.join(',') + (suave ? 's' : '');
    if (sprites.has(k)) return sprites.get(k);
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d'), d = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    if (suave) { d.addColorStop(0, rgb(color, .55)); d.addColorStop(.5, rgb(color, .18)); d.addColorStop(1, rgb(color, 0)); }
    else { d.addColorStop(0, rgb(color, 1)); d.addColorStop(.28, rgb(color, .55)); d.addColorStop(.62, rgb(color, .14)); d.addColorStop(1, rgb(color, 0)); }
    g.fillStyle = d; g.fillRect(0, 0, 256, 256); sprites.set(k, c); return c;
  }
  /** Un halo radial: sprite escalado a rx × ry (pueden diferir) con alfa `a`. */
  function halo(x, y, rx, ry, color, a, suave = false) { if (a <= .003 || rx <= 0) return; ctx.globalAlpha = a; ctx.drawImage(sprite(color, suave), x - rx, y - ry, rx * 2, ry * 2); }
  return { sprite, halo };
}

/** Las lámparas del plano: una por sala física (las `fisica` distintas de las salas), centrada en el piso, en coordenadas lógicas. */
export function lamparasDe(salas) {
  const vistas = new Map();
  for (const s of Object.values(salas || {})) { const f = s && s.fisica; if (f && !vistas.has(f.id)) vistas.set(f.id, f); }
  return [...vistas.values()].map((f) => ({
    sala: f.id, x: f.x0 + f.ancho / 2, y: (f.y0 + f.y1) / 2,
    rx: f.ancho * .6, ry: (f.y1 - f.y0) * .85,
    // el recorte de la sala con sus paredes: arriba la cara de pared está sobre el piso (32 px), abajo también; así la luz no cruza al pasillo
    clip: { x: f.x0 - 2, y: f.y0 - 32, w: f.ancho + 4, h: (f.y1 - f.y0) + 32 + 8 },
  }));
}

export function crearLuzCenital(canvas, { salas, W = 400, H = 288, tema = 'oscuro', escala = 3 } = {}) {
  const ctx = canvas.getContext('2d');
  const { halo } = crearHalos(ctx);
  const lamparas = lamparasDe(salas);
  const dir = salas && salas.direccion;
  const decision = dir ? { x: dir.cx, y: dir.mesaY ?? (dir.asiento ? dir.asiento.y - 4 : 0) } : null;   // el escritorio de Dirección
  const quieto = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let E = 0, vineta = null, activa = true, ultimaClave = null, limpio = true;

  function armar(e) {
    E = e; canvas.width = W * E; canvas.height = H * E;
    vineta = ctx.createRadialGradient(W * E / 2, H * E / 2, H * E * .42, W * E / 2, H * E / 2, H * E * 1.05);
    vineta.addColorStop(0, 'rgba(3,2,10,0)'); vineta.addColorStop(.55, 'rgba(3,2,10,.35)'); vineta.addColorStop(1, 'rgba(3,2,10,.95)');
    ultimaClave = null;
  }

  function dibujar(esperandoDecision, nombreTema, t) {
    const I = INTENSIDAD[nombreTema] || INTENSIDAD.oscuro;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(E, 0, 0, E, 0, 0);
    // el ambiente: una bajada pareja (azul de noche en el oscuro, apenas cálida en el claro) para que las lámparas se lean como luz
    ctx.fillStyle = rgb(nombreTema === 'claro' ? COLORES_CENITAL.dia : COLORES_CENITAL.noche, I.ambiente); ctx.fillRect(0, 0, W, H);
    // las lámparas, en 'lighter', cada una recortada a su sala (con las paredes) para que la luz no cruce al pasillo
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lamparas) {
      ctx.save(); ctx.beginPath(); ctx.rect(l.clip.x, l.clip.y, l.clip.w, l.clip.h); ctx.clip();
      halo(l.x, l.y, l.rx, l.ry, COLORES_CENITAL.lampara, I.lampara);
      halo(l.x, l.y - l.ry * .15, l.rx * .32, l.ry * .28, [255, 240, 210], I.tubo);   // el centro, más blanco: el tubo mismo
      ctx.restore();
    }
    // el halo sobre Dirección mientras la propuesta espera: azul, con un latido lento (quieto con reduced-motion)
    if (esperandoDecision && decision) {
      const lat = quieto ? 1 : .9 + .1 * Math.sin(t * 1.6);
      halo(decision.x, decision.y, 84 * lat, 68 * lat, COLORES_CENITAL.decision, I.decision, true);   // ancho y suave: el despacho entero toma el azul
      halo(decision.x, decision.y, 30, 24, [225, 238, 255], I.decision * .35);                        // el centro, sobre el escritorio

    }
    // la viñeta: los bordes del plano se apagan, el centro queda
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = I.vineta;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = vineta; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1; limpio = false;
  }

  /** Dibuja si hace falta. `t` en segundos (para el latido); `escala` cambia la resolución (píxeles por píxel lógico, 1..4). */
  function render({ esperandoDecision = false, tema: nombreTema = tema, t = 0, escala: e = E || escala } = {}) {
    if (!activa) { if (!limpio) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); limpio = true; ultimaClave = null; } return false; }
    const E2 = clamp(Math.round(e) || 3, 1, 4); if (E2 !== E) armar(E2);
    const nt = nombreTema === 'claro' ? 'claro' : 'oscuro';
    // mientras el halo respira se dibuja cada cuadro; si no, solo cuando cambia algo
    const clave = `${nt}|${esperandoDecision ? (quieto ? 'd' : 'd' + (t * 30 | 0)) : '-'}`;
    if (clave === ultimaClave) return false;
    ultimaClave = clave; dibujar(!!esperandoDecision, nt, t); return true;
  }

  return {
    render, lamparas, decision,
    get activa() { return activa; }, set activa(v) { activa = !!v; if (!activa) render(); },
    get escala() { return E; },
  };
}
