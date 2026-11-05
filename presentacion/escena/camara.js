// La cámara de la escena: los seis planos con nombre, la interpolación hacia el objetivo y la única
// conversión de coordenadas del mundo (640×288 px lógicos) a la pantalla (1920×1080). Ver CONTRATO.md §3.1 y §3.3.

export const PANTALLA = { W: 1920, H: 1080, PX: 3 };          // a zoom 1, cada píxel lógico son 3 de pantalla

export const PLANOS = {
  fachada:  { camx: 320, camy: 160, zoom: 1,    hora: 0,   fachada: 1 },
  hall:     { camx: 350, camy: 232, zoom: 2.3,  hora: .15, fachada: 0 },   // la planta alta queda fuera de cuadro: nadie cortado a mitad de cuerpo
  edificio: { camx: 320, camy: 150, zoom: .85,  hora: .5,  fachada: 1 },
  aula:     { camx: 210, camy: 190, zoom: 2,    hora: .25, fachada: 0 },
  oficina:  { camx: 240, camy: 110, zoom: 2.4,  hora: .55, fachada: 0 },
  patio:    { camx: 420, camy: 200, zoom: 1.6,  hora: 1,   fachada: 1 },
};
// En "oficina", la cámara va al puesto: Coordinación o Dirección (planta alta, izquierda).
export const OFICINAS = { coordinacion: 240, direccion: 160 };
// El travelling de Sofía por el hall: camx según sofiaK (0 = la puerta de calle, 1 = el final del pasillo).
export const HALL_TRAVELLING = { desde: 330, hasta: 378 };
// Corrimiento de la escena cuando hay placa (píxeles de pantalla): la escena se va al lado libre. Con `arriba` (el título sobre la
// escuela) baja 200 px para que el edificio entero quede bajo el texto; con `llamadas` no se corre: el texto flota en sus recuadros.
export const CORRIMIENTO = { izq: [440, 0], der: [-440, 0], abajo: [0, -150], arriba: [0, 200], plena: [0, 0], ninguna: [0, 0], llamadas: [0, 0] };

const lerp = (a, b, k) => a + (b - a) * k;

export function crearCamara() {
  const cur = { camx: 320, camy: 160, zoom: 1, hora: 0, fachada: 1, dx: 0, dy: 0 };
  const obj = { ...cur };
  const LENTAS = ['camx', 'camy', 'zoom'];                  // la cámara se mueve con calma; la hora, más despacio todavía (un amanecer dura 2 s)
  const RAPIDAS = ['fachada', 'dx', 'dy'];                   // la fachada y el corrimiento, un poco más vivos
  return {
    /** Fija el objetivo: un plano por nombre más parámetros sueltos ({ plano, camx, zoom, hora, fachada, oficina, sofiaK, placa }). */
    ir(objetivo = {}) {
      const base = PLANOS[objetivo.plano] || {};
      const o = { ...base }; for (const [k, v] of Object.entries(objetivo)) if (v != null) o[k] = v;   // lo que la lámina no fija lo pone el plano
      if (objetivo.plano === 'oficina' && objetivo.oficina && objetivo.camx == null) o.camx = OFICINAS[objetivo.oficina] ?? base.camx;
      if (objetivo.plano === 'hall' && objetivo.sofiaK != null && objetivo.camx == null) o.camx = lerp(HALL_TRAVELLING.desde, HALL_TRAVELLING.hasta, objetivo.sofiaK);
      for (const k of LENTAS) if (o[k] != null) obj[k] = o[k];
      if (o.hora != null) obj.hora = o.hora;
      if (o.fachada != null) obj.fachada = o.fachada;
      const [dx, dy] = CORRIMIENTO[objetivo.placa] || CORRIMIENTO.ninguna; obj.dx = dx; obj.dy = dy;
    },
    /** Sin transición: la cámara salta al objetivo (al abrir en una lámina). */
    saltar() { Object.assign(cur, obj); },
    /** Un cuadro de interpolación; devuelve el estado parcial de la cámara. */
    tick(dt) {
      const k = 1 - Math.pow(0.0025, dt), kr = 1 - Math.pow(0.03, dt);
      for (const key of LENTAS) cur[key] = lerp(cur[key], obj[key], k);
      cur.hora = lerp(cur.hora, obj.hora, 1 - Math.pow(0.2, dt));
      for (const key of RAPIDAS) cur[key] = lerp(cur[key], obj[key], kr);
      return { ...cur };
    },
    /** Mundo → pantalla: [px, py, s] con s = píxeles de pantalla por píxel lógico. */
    aPantalla(wx, wy) { const s = PANTALLA.PX * cur.zoom; return [PANTALLA.W / 2 + cur.dx + (wx - cur.camx) * s, PANTALLA.H / 2 + cur.dy + (wy - cur.camy) * s, s]; },
    /** Lo mismo para una capa con paralaje (factor 1 = la principal). */
    aPantallaCapa(wx, wy, factor) { const s = PANTALLA.PX * cur.zoom; const cx = 320 + (cur.camx - 320) * factor; return [PANTALLA.W / 2 + cur.dx + (wx - cx) * s, PANTALLA.H / 2 + cur.dy + (wy - cur.camy) * s, s]; },
    corrimiento(placa) { return CORRIMIENTO[placa] || CORRIMIENTO.ninguna; },
    escala() { return PANTALLA.PX * cur.zoom; },
    actual() { return { ...cur }; },
    objetivo() { return { ...obj }; },
  };
}
