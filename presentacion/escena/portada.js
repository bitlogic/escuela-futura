// La portada (4/11): los seis agentes en pixel-art, parados en fila de frente a la sala, esperando que empiece la charla.
// Respiran, se miran entre ellos cada tanto y alguno saca el globo de "..." como si pensara. Es el espejo del final: en la
// última lámina salen a la vereda a saludar. Sin edificio ni fondo: los personajes sobre el navy del deck.
//
//   crearPortada(canvas, { cargarImagen, MODELOS }, { activa }) → { parar() }
import { AGENTES, teñirLocal, peloVioleta } from './gente.js';

const ESCALA = 10;                       // píxeles del canvas por píxel del sprite (el canvas mide el doble de su tamaño en CSS): 160 px de alto en la lámina
const PASO = 20;                         // píxeles de sprite entre un agente y el siguiente
const FILA = { abajo: 0, arriba: 1, perfil: 2 };
const azar = (a, b) => a + Math.random() * (b - a);

export async function crearPortada(canvas, { cargarImagen, MODELOS }, { activa = () => true } = {}) {
  const hojas = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => cargarImagen(`/stage/assets/personajes/char_${i}.png`).catch(() => null)));
  hojas[6] = hojas[2] ? (() => { try { return peloVioleta(teñirLocal(hojas[2], 120, 21)); } catch { return hojas[2]; } })() : null;   // Academia
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const W = canvas.width / ESCALA, H = canvas.height / ESCALA;
  const x0 = W - 10 - PASO * (AGENTES.length - 1), suelo = H - 4;   // la fila termina en el borde derecho del canvas (que cae en el margen de la lámina); los pies, a 4 px del borde de abajo
  const gente = AGENTES.map((a, i) => ({ ...a, hoja: hojas[MODELOS[a.id] ?? 2], x: x0 + i * PASO, fase: azar(0, 6), mira: 0, dir: 1, habla: 0 }));
  let vivo = true, raf = 0, ultimo = performance.now(), proxMirada = 2.5, proxGlobo = 4, reloj = 0;
  const r = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x) * ESCALA, Math.round(y) * ESCALA, w * ESCALA, h * ESCALA); };
  function sprite(p, cuadro, fila, dir, x, y) {
    if (!p.hoja) { r(x - 3, y - 14, 6, 14, p.color); return; }
    const sx = cuadro * 16, sy = fila * 32, dx = Math.round(x) - 8, dy = Math.round(y) - 32;
    ctx.save(); ctx.scale(ESCALA, ESCALA);
    if (dir < 0 && fila === FILA.perfil) { ctx.translate(dx + 16, dy); ctx.scale(-1, 1); ctx.drawImage(p.hoja, sx, sy, 16, 32, 0, 0, 16, 32); }
    else ctx.drawImage(p.hoja, sx, sy, 16, 32, dx, dy, 16, 32);
    ctx.restore();
  }
  function globo(x, y, color) {
    const bx = Math.round(x) - 6, by = Math.round(y) - 46;
    r(bx - 1, by - 1, 14, 12, '#1a1a2e'); r(bx, by, 12, 10, '#fff');
    const k = (reloj * 4 | 0) % 3; for (let i = 0; i < 3; i++) r(bx + 2 + i * 3, by + 4 - (i === k ? 1 : 0), 2, 2, i === k ? color : '#9a9aa8');
    r(bx + 4, by + 10, 4, 2, '#1a1a2e');
  }
  function cuadro(ahora) {
    if (!vivo) return;
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(.1, (ahora - ultimo) / 1000); ultimo = ahora;
    if (!activa()) return;
    reloj += dt; proxMirada -= dt; proxGlobo -= dt;
    if (proxMirada <= 0) {   // uno mira al de al lado; el otro, a veces, le devuelve la mirada
      const i = Math.floor(azar(0, gente.length)), j = i + (i === gente.length - 1 || (i > 0 && Math.random() < .5) ? -1 : 1);
      gente[i].mira = azar(1.2, 2.2); gente[i].dir = j > i ? 1 : -1;
      if (Math.random() < .6) { gente[j].mira = gente[i].mira - .5; gente[j].dir = j > i ? -1 : 1; }
      proxMirada = azar(4, 9);
    }
    if (proxGlobo <= 0) { const g = gente[Math.floor(azar(0, gente.length))]; if (g.mira <= 0) g.habla = azar(1.8, 2.8); proxGlobo = azar(5, 11); }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const g of gente) {
      g.mira = Math.max(0, g.mira - dt); g.habla = Math.max(0, g.habla - dt);
      const resp = Math.sin(reloj * 2 * Math.PI / 2.4 + g.fase) > .3 ? 1 : 0;   // respira: un píxel, cada tanto
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect((Math.round(g.x) - 6) * ESCALA, (suelo - 1) * ESCALA, 12 * ESCALA, 2 * ESCALA);
      if (g.mira > 0) sprite(g, 1, FILA.perfil, g.dir, g.x, suelo - resp);
      else sprite(g, 1, FILA.abajo, 1, g.x, suelo - resp);
      if (g.habla > 0) globo(g.x, suelo - resp, g.color);
    }
  }
  raf = requestAnimationFrame(cuadro);
  return { parar() { vivo = false; cancelAnimationFrame(raf); } };
}
