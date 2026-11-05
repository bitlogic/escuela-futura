// La luz (HD-2D): compone en pantalla el cielo, las capas con paralaje, el mundo en pixel-art nítido, la fachada
// con su opacidad, y encima la luz: lámparas, ventanas, el haz del proyector, los halos, la esfera; después la
// franja de foco (tilt-shift), la viñeta y el grading. Ver CONTRATO.md §4 (luz.js).
//
// Pipeline por cuadro (todo en el espacio de la composición de 1920×1080; `vista` lo centra en la ventana):
//   cielo (degradado por hora, estrellas de noche, sol bajo al atardecer, suelo bajo el horizonte)
//   → capa lejana pre-desenfocada (blur 7 px, paralaje .45)
//   → el mundo y la fachada, nítidos: el lienzo lógico se escala a S entero sin suavizar y después a la escala
//     exacta con suavizado, así el pixel-art queda parejo a cualquier zoom
//   → luces en 'lighter': lámparas por sala, ventanas (con fachada puesta), el haz del proyector del aula,
//     el halo del foco (y el de Sofía cuando escena.js pasa su posición), la esfera
//   → niebla rasante afuera → capa cercana pre-desenfocada (blur 9 px, paralaje 1.5, opacidad fachada)
//   → franja de foco (las franjas de arriba y abajo redibujadas con blur 3 px) → viñeta → grading (overlay).
//
// Lo caro se hace una vez: los desenfoques de las capas se hornean en canvases propios cuando cambia la capa,
// los halos son sprites radiales cacheados por color, la viñeta y el grading son degradados cacheados.
// `hd: false` deja cielo plano, mundo, fachada y las capas sin desenfoque. `degradado` (FPS bajos) apaga los
// desenfoques, la niebla, la luz del día y el grading (las pasadas de pantalla entera) y deja luces y viñeta: medido el
// 4/11 (evaluaciones/escena/rendimiento.md), con GPU la escena cuesta ~1 ms por cuadro y nada de esto importa; sin GPU
// (raster por software) HD-2D da 33 fps, y apagar solo los desenfoques no cambiaba nada (34 fps): lo caro ahí son las
// pasadas de pantalla entera. Se recupera una vez a los 10 s buenos y otra a los 20; a la tercera caída queda degradado,
// para que no parpadee entre los dos modos. Con prefers-reduced-motion nada respira: ni la franja ni la niebla.
//
//   crearLuz(canvas) → { render(args), medirFps(dt), hd (get/set), degradado, fps }
// El módulo se importa en Node sin DOM: nada de document fuera de crearLuz.
//
// El modo cenital (la misma luz sobre el plano de la demo, stage/index.html) vive en /stage/luz.js, que es lo que
// sirve también el servidor de la escuela; de ahí vienen los sprites radiales y el halo que se usan acá, y de ahí
// se reexporta `crearLuzCenital` para que la charla tenga un solo punto de entrada a la luz.

import { PANTALLA } from './camara.js';
import { SUELO_COLOR, MUNDO, ventanaPrendida } from './edificio.js';
import { crearHalos } from '../../stage/luz.js';
export { crearLuzCenital, lamparasDe } from '../../stage/luz.js';

const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;

// Colores de la luz (rgb). Cálidos para lo que viene de adentro; los del sistema del deck (azul BIT, celeste, durazno) para la esfera y el grading.
export const COLORES = {
  lampara: [255, 214, 160], ventana: [255, 196, 120], proyector: [190, 225, 255], foco: [220, 255, 248],
  sofia: [255, 170, 235], niebla: [150, 140, 200], sol: [255, 150, 90], suelo: [14, 18, 20], sueloDia: [52, 66, 56], dia: [150, 185, 230],
  celeste: [159, 182, 243], azul: [62, 107, 232], durazno: [254, 175, 155],
};
export const DESENFOQUES = { lejana: 7, cercana: 9, franja: 3 };     // px de pantalla (a esc 1)
export const FPS_MINIMO = 40, SEGUNDOS_LENTOS = 3;

/** Cuánto prende lo de adentro visto desde afuera: de noche todo, al atardecer bastante, de mañana casi nada. */
export function encendido(hora) {
  const noche = 1 - Math.abs(hora - .5) * 2, tarde = Math.max(0, 1 - hora * 2);
  return clamp(Math.max(noche, .6 * tarde), 0, 1);
}

// Estrellas fijas en el cielo del mundo (paralaje .25): x −400..1040 lógico, y 0..60.
const ESTRELLAS = Array.from({ length: 140 }, (_, i) => ({ x: -400 + ((i * 1013) % 1440), y: ((i * 467) % 58) + 2, t: (i * 73) % 17 / 17, g: i % 5 === 0 ? 2 : 1 }));

export function crearLuz(canvas) {
  const ctx = canvas.getContext('2d');
  const W = PANTALLA.W, H = PANTALLA.H;
  const luz = { hd: true, degradado: false, fps: 60 };
  const conFiltro = ctx && 'filter' in ctx;                            // Safari viejo no tiene ctx.filter: sin desenfoque
  const quieto = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reloj = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
  let acumulado = 0, cuadros = 0, lentos = 0, buenos = 0, avisado = false, transcurrido = 0, caidas = 0;
  const ESPERA_INICIAL = 5, SEGUNDOS_BUENOS = 10, FPS_RECUPERA = 55, CAIDAS_MAX = 3;   // se ignora el arranque (la demo también carga); se vuelve a prender si la máquina da, cada vez con el doble de segundos buenos, y a la tercera caída queda degradado
  let tHaz = 0, tFoco = 0, ultimoReloj = reloj();                     // rampas internas (el haz y el halo entran y salen suaves)

  // ---------- Lienzos y cachés ----------
  const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const escalado = lienzo(1, 1);                                       // el recorte visible del mundo a S píxeles por píxel lógico
  const borrosas = new Map();                                          // capa → { img, radio, margen }: la capa pre-desenfocada
  const { halo } = crearHalos(ctx);                                    // sprites radiales cacheados por color + el halo escalado (rx, ry pueden diferir para la niebla y los haces); compartidos con el modo cenital
  let vineta = null, grading = null, esferaDeg = null, esferaR = 0;

  /** La capa (640×288 lógico) desenfocada una sola vez, a 3 px por píxel lógico y con margen para que el borde se funda. */
  function borrosa(capa, radio) {
    const b = borrosas.get(capa);
    if (b && b.radio === radio) return b;
    const E = 3, margen = radio * 3, img = lienzo(MUNDO.W * E + margen * 2, MUNDO.H * E + margen * 2), g = img.getContext('2d');
    g.imageSmoothingEnabled = false; if (conFiltro) g.filter = `blur(${radio}px)`;
    g.drawImage(capa, margen, margen, MUNDO.W * E, MUNDO.H * E);
    const r = { img, radio, margen, E }; borrosas.set(capa, r); return r;
  }
  function tapa() {
    if (!vineta) { vineta = ctx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * 1.15); vineta.addColorStop(0, 'rgba(3,2,10,0)'); vineta.addColorStop(.6, 'rgba(3,2,10,.3)'); vineta.addColorStop(1, 'rgba(3,2,10,.95)'); }
    if (!grading) { grading = ctx.createLinearGradient(0, 0, W, H); grading.addColorStop(0, rgb(COLORES.azul)); grading.addColorStop(1, rgb(COLORES.durazno)); }
  }

  // ---------- Capas ----------
  /** Una capa con paralaje: nítida (hd apagado o degradado) o pre-desenfocada; tres copias en x para cubrir el ancho cuando la cámara se abre. */
  function capa(img, aPC, factor, alpha, radio) {
    const [x, y, s] = aPC(0, 0, factor), w = MUNDO.W * s, h = MUNDO.H * s;
    ctx.globalAlpha = alpha;
    if (radio && luz.hd && !luz.degradado && conFiltro) {
      const b = borrosa(img, radio), m = b.margen / b.E * s;            // el margen, de píxeles del horneado a píxeles de pantalla
      ctx.imageSmoothingEnabled = true;
      for (const dx of [-w, 0, w]) ctx.drawImage(b.img, x + dx - m, y - m, w + m * 2, h + m * 2);
    } else { ctx.imageSmoothingEnabled = false; for (const dx of [-w, 0, w]) ctx.drawImage(img, x + dx, y, w, h); }
    ctx.globalAlpha = 1;
  }
  /** El mundo y la fachada, nítidos: solo el recorte visible, a S entero sin suavizar, y a la escala exacta con suavizado. */
  function mundoNitido(mundo, fachada, encima, estado, aPantalla, v) {
    const [x0, y0, s] = aPantalla(0, 0);
    const S = clamp(Math.ceil(s * v.esc), 1, 16);
    // el recorte del mundo que entra en la composición (más un píxel de margen)
    const vx0 = clamp(Math.floor(-x0 / s) - 1, 0, MUNDO.W), vy0 = clamp(Math.floor(-y0 / s) - 1, 0, MUNDO.H);
    const vx1 = clamp(Math.ceil((W - x0) / s) + 1, 0, MUNDO.W), vy1 = clamp(Math.ceil((H - y0) / s) + 1, 0, MUNDO.H);
    const w = vx1 - vx0, h = vy1 - vy0; if (w <= 0 || h <= 0) return;
    if (escalado.width < w * S || escalado.height < h * S) { escalado.width = Math.max(escalado.width, w * S); escalado.height = Math.max(escalado.height, h * S); }   // crece, nunca por cuadro
    const e = escalado.getContext('2d'); e.imageSmoothingEnabled = false; e.globalAlpha = 1;
    e.clearRect(0, 0, w * S, h * S);
    e.drawImage(mundo, vx0, vy0, w, h, 0, 0, w * S, h * S);
    if (estado.fachada > .01) { e.globalAlpha = clamp(estado.fachada, 0, 1); e.drawImage(fachada, vx0, vy0, w, h, 0, 0, w * S, h * S); e.globalAlpha = 1; }
    if (encima) e.drawImage(encima, vx0, vy0, w, h, 0, 0, w * S, h * S);   // lo que va por encima de la pared (los globos del saludo)
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(escalado, 0, 0, w * S, h * S, x0 + vx0 * s, y0 + vy0 * s, w * s, h * s);
  }

  // ---------- El cielo ----------
  function cieloYSuelo(C, estado, aPantalla, aPantallaCapa, t) {
    const noche = 1 - Math.abs(estado.hora - .5) * 2;
    const horizonte = clamp(aPantalla(0, MUNDO.SUELO)[1], H * .3, H + 200);
    if (!luz.hd) { ctx.fillStyle = rgb(C[1]); ctx.fillRect(0, 0, W, H); }
    else {
      const sky = ctx.createLinearGradient(0, 0, 0, horizonte);
      sky.addColorStop(0, rgb(C[0])); sky.addColorStop(.5, rgb(C[1])); sky.addColorStop(1, rgb(C[2]));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, Math.min(H, horizonte));
      // el sol bajo del atardecer, pegado al horizonte, y el resplandor del alba
      const tarde = Math.max(0, 1 - estado.hora * 2), alba = Math.max(0, (estado.hora - .5) * 2);
      ctx.globalCompositeOperation = 'lighter';
      if (tarde > .02) halo(W * .72, horizonte - 10, 520, 260, COLORES.sol, .55 * tarde, true);
      if (alba > .02 && alba < .98) halo(W * .3, horizonte, 700, 300, [255, 220, 170], .3 * alba * (1 - alba) * 4, true);
      // estrellas: fijas en el cielo del mundo, con un paralaje leve; titilan si el movimiento está permitido
      if (noche > .25) {
        const a = Math.min(1, (noche - .25) * 1.6);
        for (const e of ESTRELLAS) {
          const [px, py] = aPantallaCapa(e.x, e.y, .25); if (px < -4 || px > W + 4 || py < -4 || py > horizonte - 40) continue;
          const tit = quieto ? 1 : .6 + .4 * Math.sin(t * (1.3 + e.t) + e.t * 20);
          ctx.fillStyle = `rgba(255,255,255,${(.9 * a * tit).toFixed(3)})`; ctx.fillRect(px, py, 2 + e.g, 2 + e.g);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // el suelo: todo lo que queda bajo el horizonte, para que los costados del mundo no sean cielo
    const dia = Math.max(0, (estado.hora - .5) * 2), suelo = COLORES.suelo.map((c, i) => lerp(c, COLORES.sueloDia[i], dia));
    if (horizonte < H) { ctx.fillStyle = rgb(suelo); ctx.fillRect(0, horizonte, W, H - horizonte); }
    return horizonte;
  }

  // ---------- Las luces ----------
  function luces({ estado, aPantalla, ventanas, lamparas, foco, sofiaEn, saludos = [], t, dt }) {
    const fach = clamp(estado.fachada, 0, 1), interior = clamp(estado.luzInterior ?? 1, 0, 1), prendido = encendido(estado.hora);
    const haz = estado.plano === 'aula' && !estado.vacia ? 1 : 0;
    tHaz = lerp(tHaz, haz, 1 - Math.pow(.05, dt)); tFoco = lerp(tFoco, foco ? 1 : 0, 1 - Math.pow(.02, dt));
    ctx.globalCompositeOperation = 'lighter';
    // lámparas por sala: radial cálida bajo el techo, acotada a la altura de su sala para que no suba a la planta de arriba
    const aLamp = interior * (1 - fach) * (.55 + .45 * prendido);
    if (aLamp > .01) for (const l of lamparas) {
      const [x, y, s] = aPantalla(l.x, l.y), r = l.r * s, alto = (l.r / 1.1) * s;
      ctx.save(); ctx.beginPath(); ctx.rect(x - r * 1.5, y - 6 * s, r * 3, alto + 6 * s); ctx.clip();
      halo(x, y + r * .25, r, r * .85, COLORES.lampara, .34 * aLamp);
      halo(x, y, r * .22, r * .12, [255, 240, 210], .5 * aLamp);        // el tubo mismo, un punto de luz
      ctx.restore();
    }
    // ventanas: con la fachada puesta, cada ventana irradia según la hora (y según su propio umbral: se prenden y apagan de a una)
    const aVentBase = fach * prendido;
    if (aVentBase > .01) for (const v of ventanas) {
      const aVent = aVentBase * ventanaPrendida(v, estado); if (aVent < .01) continue;
      const [x, y, s] = aPantalla(v.x + v.w / 2, v.y + v.h / 2);
      halo(x, y, v.w * s * 1.7, v.h * s * 1.5, COLORES.ventana, .42 * aVent);
      halo(x, y + v.h * s * .9, v.w * s * 1.1, v.h * s * .6, COLORES.ventana, .22 * aVent);   // el charco de luz sobre la pared de abajo
    }
    // el haz del proyector del aula (planta baja, izquierda): del fondo del aula al pizarrón en la pared izquierda
    const aHaz = tHaz * (1 - fach) * (.6 + .4 * prendido);
    if (aHaz > .01) {
      const [x1, y1, s] = aPantalla(MUNDO.X0 + 2, MUNDO.TECHO_BAJA + 12), [x2, y2] = aPantalla(MUNDO.X0 + 2, MUNDO.PB - 16), [px, py] = aPantalla(MUNDO.X0 + 140, MUNDO.TECHO_BAJA + 6);
      const g = ctx.createLinearGradient(px, py, x1, (y1 + y2) / 2); g.addColorStop(0, rgb(COLORES.proyector, .32 * aHaz)); g.addColorStop(1, rgb(COLORES.proyector, .05 * aHaz));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgb(COLORES.proyector, .28 * aHaz); ctx.fillRect(x1, y1, 3 * s, y2 - y1);   // la pantalla iluminada
      halo(px, py, 10 * s, 7 * s, [255, 255, 255], .5 * aHaz);
    }
    // el halo del foco ("agente": el agente, el estante, la pantalla, el cuaderno), con un latido leve
    if (foco && tFoco > .01) {
      const [x, y, s] = aPantalla(foco.x, foco.y), lat = quieto ? 1 : .9 + .1 * Math.sin(t * 2.2);
      halo(x, y, 52 * s * lat, 52 * s * lat, COLORES.foco, .35 * tFoco); halo(x, y, 14 * s, 14 * s, [255, 255, 255], .18 * tFoco);
    }
    // el halo de Sofía: solo cuando escena.js pasa su posición (sofiaEn, en coordenadas del mundo)
    if (estado.sofia && sofiaEn) { const [x, y, s] = aPantalla(sofiaEn.x, sofiaEn.y); halo(x, y, 30 * s, 30 * s, COLORES.sofia, .6); }
    for (const p of saludos) { const [x, y, s] = aPantalla(p.x, p.y); halo(x, y, 30 * s, 30 * s, COLORES.ventana, .5); }   // los agentes que saludan en la vereda (gracias), de noche   // más luz: Sofía mide 10 cm en la pantalla de 4 m
    // la esfera: el tercer invitado, con el degradado del deck y un halo violeta
    if (estado.esfera && estado.esfera.on && estado.esfera.r > 0) esfera(estado.esfera, t);
    ctx.globalCompositeOperation = 'source-over';
  }
  function esfera({ x, y, r }, t) {
    const lat = quieto ? 1 : 1 + .04 * Math.sin(t * 1.7);
    halo(x, y, r * 3.2 * lat, r * 3.2 * lat, [123, 92, 255], .5); halo(x, y, r * 1.8, r * 1.8, [46, 230, 210], .3);   // violeta y teal: el orb del deck
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (!esferaDeg || Math.abs(esferaR - r) > .5) {       // el degradado se cachea por radio (cambia solo cuando la esfera crece o se encoge)
      esferaR = r; esferaDeg = ctx.createRadialGradient(-r * .3, -r * .32, 0, 0, 0, r);
      esferaDeg.addColorStop(0, '#FFE3F9'); esferaDeg.addColorStop(.22, '#2EE6D2'); esferaDeg.addColorStop(.6, '#7B5CFF'); esferaDeg.addColorStop(1, '#B0179F');
    }
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = esferaDeg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
  }
  /** Niebla rasante afuera, de noche y al atardecer: tres jirones anchos que derivan despacio (quietos con reduced-motion). */
  function niebla(estado, aPantalla, t) {
    const fach = clamp(estado.fachada, 0, 1), fuerza = fach * (.5 + .5 * encendido(estado.hora)) * (1 - Math.max(0, (estado.hora - .75) * 4));
    if (fuerza < .02) return;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const wx = 120 + i * 200 + (quieto ? 0 : Math.sin(t * (.05 + i * .02) + i) * 90), [x, y, s] = aPantalla(wx, MUNDO.SUELO + 8 + i * 5);
      halo(x, y, (140 + i * 30) * s, 14 * s, COLORES.niebla, .07 * fuerza, true);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Franja de foco, viñeta, grading ----------
  /** Tilt-shift: lo de arriba y lo de abajo de la franja nítida se redibuja desenfocado, en dos escalones para que la transición no se vea. */
  function franja(estado, v, t, nitidoHasta = 0) {
    const centro = H / 2 + (estado.zoom >= 1.8 ? 40 : 0) + (quieto ? 0 : Math.sin(t * .5) * 14);
    const medio = H * (estado.zoom >= 1.8 ? .36 : .28);
    const abajo = Math.max(centro + medio, nitidoHasta);   // la gente (Sofía, el agente del foco) queda nítida aunque camine por la franja de abajo
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${(DESENFOQUES.franja * v.esc).toFixed(2)}px)`; ctx.imageSmoothingEnabled = true;
    const cw = canvas.width, ch = canvas.height, m = Math.ceil(DESENFOQUES.franja * v.esc * 3);
    const paso = (ya, yb, a) => {       // ya..yb en la composición → en el canvas; la fuente se toma con margen para que el borde no se funda a transparente
      const y0 = clamp(v.oy + ya * v.esc, 0, ch), y1 = clamp(v.oy + yb * v.esc, 0, ch); if (y1 - y0 < 1) return;
      const s0 = Math.max(0, y0 - m), s1 = Math.min(ch, y1 + m);
      ctx.save(); ctx.beginPath(); ctx.rect(0, y0, cw, y1 - y0); ctx.clip(); ctx.globalAlpha = a;
      ctx.drawImage(canvas, 0, s0, cw, s1 - s0, 0, s0, cw, s1 - s0); ctx.restore();
    };
    paso(-40, centro - medio - 60, 1); paso(centro - medio - 60, centro - medio, .45);
    paso(abajo + 60, H + 40, 1); paso(abajo, abajo + 60, .45);
    ctx.filter = 'none'; ctx.restore();
  }

  // ---------- Render ----------
  // `vista` = { esc, ox, oy }: la composición de 1920×1080 entra entera en la ventana, centrada (como el lienzo de las láminas);
  // las bandas que sobren se pintan del color de arriba del cielo.
  function render({ mundo, fachada, encima = null, capas, estado, aPantalla, aPantallaCapa, ventanas = [], lamparas = [], foco = null, sofiaEn = null, saludos = [], cielo, vista }) {
    const t = reloj(), dt = clamp(t - ultimoReloj, 0, .1); ultimoReloj = t;
    const C = cielo(estado.hora), noche = 1 - Math.abs(estado.hora - .5) * 2;
    const v = vista || { esc: canvas.width / W, ox: 0, oy: 0 };
    const hd = luz.hd, desenfoque = hd && !luz.degradado && conFiltro;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; if (conFiltro) ctx.filter = 'none';
    {   // las bandas de una ventana que no es 16:9 (el auditorio es 2:1): el mismo cielo degradado y el mismo suelo que la composición, no una franja de otro color
      const hy = aPantalla(0, MUNDO.SUELO)[1] * v.esc + v.oy;
      if (hd) { const sky = ctx.createLinearGradient(0, v.oy, 0, Math.max(v.oy + 1, hy)); sky.addColorStop(0, rgb(C[0])); sky.addColorStop(.5, rgb(C[1])); sky.addColorStop(1, rgb(C[2])); ctx.fillStyle = sky; } else ctx.fillStyle = rgb(C[1]);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (hy < canvas.height) { ctx.fillStyle = SUELO_COLOR; ctx.fillRect(0, hy, canvas.width, canvas.height - hy); }
    }
    ctx.setTransform(v.esc, 0, 0, v.esc, v.ox, v.oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();        // nada se sale de la composición

    cieloYSuelo(C, estado, aPantalla, aPantallaCapa, t);
    if (capas && capas.lejana) capa(capas.lejana, aPantallaCapa, .45, 1, hd ? DESENFOQUES.lejana : 0);
    mundoNitido(mundo, fachada, encima, estado, aPantalla, v);
    const entero = hd && !luz.degradado;   // las pasadas de pantalla entera (niebla, luz del día, grading): lo caro sin GPU
    if (hd) {
      tapa();
      luces({ estado, aPantalla, ventanas, lamparas, foco, sofiaEn, saludos, t, dt });
      if (entero) niebla(estado, aPantalla, t);
    }
    if (capas && capas.cercana && estado.fachada > .01) capa(capas.cercana, aPantallaCapa, 1.5, clamp(estado.fachada, 0, 1), hd ? DESENFOQUES.cercana : 0);
    if (desenfoque) {
      let nitidoHasta = 0;   // hasta dónde (y de la composición) tiene que llegar lo nítido para no desenfocar a la gente
      for (const p of [estado.sofia ? sofiaEn : null, foco, ...saludos]) if (p && Number.isFinite(p.x)) { const [, y, s] = aPantalla(p.x, p.y); nitidoHasta = Math.max(nitidoHasta, y + 40 * s); }
      franja(estado, v, t, nitidoHasta);
    }
    if (hd) {
      // la luz del día: una subida pareja ('screen') que aclara el mundo cuando amanece, antes de la viñeta
      const dia = Math.max(0, (estado.hora - .5) * 2) * (.4 + .6 * clamp(estado.fachada, 0, 1));
      if (entero && dia > .01) { ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .16 * dia; ctx.fillStyle = rgb(COLORES.dia); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
      ctx.globalAlpha = .4 + .3 * noche; ctx.fillStyle = vineta; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      if (entero) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .18; ctx.fillStyle = grading; ctx.fillRect(0, 0, W, H); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /** Promedio de FPS por segundo; si baja de 40 durante 3 s seguidos, degrada (apaga desenfoques, niebla, día y grading) y avisa
   *  una sola vez. Se recupera con 10 s a 55 o más; la segunda vez pide 20 s, y a la tercera caída no se recupera más (sin parpadeo). */
  function medirFps(dt) {
    acumulado += dt; cuadros++;
    if (acumulado >= 1) {
      luz.fps = cuadros / acumulado; acumulado = 0; cuadros = 0;
      transcurrido += 1; if (transcurrido <= ESPERA_INICIAL) return luz.fps;
      lentos = luz.fps < FPS_MINIMO ? lentos + 1 : 0; buenos = luz.fps >= FPS_RECUPERA ? buenos + 1 : 0;
      if (luz.degradado && caidas < CAIDAS_MAX && buenos >= SEGUNDOS_BUENOS * Math.pow(2, caidas - 1)) { luz.degradado = false; buenos = 0; }
      if (lentos >= SEGUNDOS_LENTOS && !luz.degradado) { luz.degradado = true; caidas++; if (!avisado) { avisado = true; console.warn(`[escena] FPS bajos (${luz.fps.toFixed(0)}): se apagan desenfoques, niebla, día y grading; quedan luces y viñeta`); } }
    }
    return luz.fps;
  }
  return { render, medirFps, get hd() { return luz.hd; }, set hd(v) { luz.hd = !!v; }, get degradado() { return luz.degradado; }, get fps() { return luz.fps; }, get conFiltro() { return conFiltro; }, get reducido() { return quieto; } };
}
