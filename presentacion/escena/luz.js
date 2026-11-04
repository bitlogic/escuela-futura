// La luz (HD-2D): compone en pantalla el cielo, las capas con paralaje, el mundo en pixel-art nítido, la fachada
// con su opacidad, y encima la luz: lámparas, ventanas, haces, halos, la esfera; después la franja de foco,
// la viñeta y el grading. Ver CONTRATO.md §4 (luz.js).
//
// RELLENO (oleada 0): cielo, capas, mundo, fachada, lámparas simples y viñeta. El agente "luz" de la oleada 1
// completa el pipeline (desenfoque por capas, ventanas, haces, halos, esfera, tilt-shift, grading, degradación
// por FPS, prefers-reduced-motion) manteniendo esta firma:
//   crearLuz(canvas) → { render({ mundo, fachada, capas, estado, aPantalla, aPantallaCapa, ventanas, lamparas, foco, cielo }), medirFps(dt), hd, degradado }

import { PANTALLA } from './camara.js';
import { MUNDO } from './edificio.js';

const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export function crearLuz(canvas) {
  const ctx = canvas.getContext('2d');
  const W = PANTALLA.W, H = PANTALLA.H;
  const luz = { hd: true, degradado: false, fps: 60 };
  let acumulado = 0, cuadros = 0, lentos = 0, avisado = false;
  const escalado = document.createElement('canvas'); let S = 0;   // el mundo a S píxeles por píxel lógico, sin suavizar

  function mundoEscalado(mundo, s) {
    const Si = Math.max(1, Math.ceil(s));
    if (Si !== S) { S = Si; escalado.width = MUNDO.W * S; escalado.height = MUNDO.H * S; }
    const e = escalado.getContext('2d'); e.imageSmoothingEnabled = false; e.clearRect(0, 0, escalado.width, escalado.height); e.drawImage(mundo, 0, 0, escalado.width, escalado.height);
    return escalado;
  }
  function capa(img, aP, factor, alpha = 1) {
    const [x, y, s] = factor === 1 ? aP(0, 0) : aP(0, 0, factor);
    ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = factor === 1; ctx.drawImage(img, x, y, MUNDO.W * s, MUNDO.H * s); ctx.restore();
  }
  function glow(x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgb(c, a)); g.addColorStop(1, rgb(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }

  // `vista` = { esc, ox, oy }: la composición de 1920×1080 entra entera en la ventana, centrada (como el lienzo de las láminas);
  // las bandas que sobren se pintan del color de arriba del cielo.
  function render({ mundo, fachada, capas, estado, aPantalla, aPantallaCapa, lamparas, cielo, vista }) {
    const C = cielo(estado.hora), noche = 1 - Math.abs(estado.hora - .5) * 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgb(C[0]); ctx.fillRect(0, 0, canvas.width, canvas.height);
    const v = vista || { esc: canvas.width / W, ox: 0, oy: 0 }; ctx.setTransform(v.esc, 0, 0, v.esc, v.ox, v.oy);
    if (luz.hd) { const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, rgb(C[0])); sky.addColorStop(.45, rgb(C[1])); sky.addColorStop(.8, rgb(C[2])); ctx.fillStyle = sky; } else ctx.fillStyle = rgb(C[1]);
    ctx.fillRect(0, 0, W, H);
    if (luz.hd && noche > .3) { ctx.fillStyle = `rgba(255,255,255,${.6 * (noche - .3)})`; for (let i = 0; i < 90; i++) ctx.fillRect((i * 211) % W, (i * 97) % (H * .45), 2, 2); }
    capa(capas.lejana, aPantallaCapa, .45);
    const s = aPantalla(0, 0)[2];
    capa(mundoEscalado(mundo, s), aPantalla, 1);
    if (estado.fachada > .01) capa(fachada, aPantalla, 1, estado.fachada);
    if (luz.hd) {
      ctx.globalCompositeOperation = 'lighter';
      const interior = (estado.luzInterior ?? 1) * (1 - estado.fachada);
      if (interior > .01) for (const l of lamparas) { const [x, y, sc] = aPantalla(l.x, l.y); glow(x, y + l.r * sc * .3, l.r * sc, [255, 214, 160], .14 * interior); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (estado.fachada > .01) capa(capas.cercana, aPantallaCapa, 1.5, estado.fachada);
    if (luz.hd) { const v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(3,2,10,${.5 + .25 * noche})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
  }
  /** Promedio de FPS; si baja de 40 durante 3 s, degrada (apaga lo caro) y avisa una vez. */
  function medirFps(dt) {
    acumulado += dt; cuadros++;
    if (acumulado >= 1) { luz.fps = cuadros / acumulado; acumulado = 0; cuadros = 0; lentos = luz.fps < 40 ? lentos + 1 : 0; if (lentos >= 3 && !luz.degradado) { luz.degradado = true; if (!avisado) { avisado = true; console.warn('[escena] FPS bajos: se apagan los desenfoques'); } } }
    return luz.fps;
  }
  return { render, medirFps, get hd() { return luz.hd; }, set hd(v) { luz.hd = !!v; }, get degradado() { return luz.degradado; }, get fps() { return luz.fps; } };
}
