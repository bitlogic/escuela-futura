// El giro: de la escuela de perfil a la escuela desde arriba (la app) y la vuelta. Ver CONTRATO.md §4 (giro.js).
//
// aCenital(): el canvas de la escena se acuesta (perspective + rotateX(78deg) + scale(1.15), 900 ms, una sola curva) y se
// apaga en los últimos 300 ms; en paralelo la capa de la demo crece desde una franja (scaleY(.06), opacidad 0) hasta
// ocupar la pantalla, con la misma curva. aPerfil() es la inversa. Solo se transforman contenedores: el iframe de la
// demo sigue conectado por SSE y no se recarga nada. Al terminar, los estilos en línea quedan limpios y la capa de la
// demo con su clase `visible` puesta o sacada, así el fundido normal de #ui-demo sigue andando en las otras láminas.
// Con `simple` (?plano=1) o prefers-reduced-motion, el giro es el fundido de 450 ms de siempre.
// Si llega una llamada mientras otra está en curso (una tecla a destiempo), las transiciones se redirigen desde donde
// están y la llamada anterior resuelve enseguida: nunca hay dos giros peleándose por los mismos contenedores.
//
//   crearGiro({ canvasEscena, capaDemo, duracion = 900, simple = false }) → { aCenital() → Promise, aPerfil() → Promise, enCurso }
//
// Se importa en Node sin DOM: nada de document, matchMedia ni getComputedStyle fuera de crearGiro.

export const CURVA = 'cubic-bezier(.6,0,.2,1)';
/** El canvas de la escena acostado (la planta vista en escorzo) y de pie; misma lista de funciones para que la interpolación sea por componente. */
export const ACOSTADO = 'perspective(1600px) rotateX(78deg) scale(1.15)';
export const DE_PIE = 'perspective(1600px) rotateX(0deg) scale(1)';
/** La capa de la demo como franja y entera. */
export const FRANJA = 'scaleY(.06)';
export const ENTERA = 'scaleY(1)';
export const FUNDIDO_MS = 450;     // el giro simple (?plano=1, prefers-reduced-motion)
export const OPACIDAD_MS = 300;    // el canvas se apaga en los últimos 300 ms (y se prende en los primeros, a la vuelta)

export function crearGiro({ canvasEscena, capaDemo, duracion = 900, simple = false } = {}) {
  const reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fundido = simple || reducido || !canvasEscena;
  const g = { enCurso: false };
  let generacion = 0;
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const poner = (el, estilos) => { for (const k of Object.keys(estilos)) el.style[k] = estilos[k]; };
  // Fuerza el recálculo de estilos: el estado inicial queda fijado antes de poner la transición y el destino.
  const asentarEstilos = (el) => { if (typeof getComputedStyle === 'function') void getComputedStyle(el).transform; };
  // Resuelve cuando termina la transición de `prop` en `el`, o a los `ms` si el navegador no la avisa (pestaña oculta, valores iguales).
  const finDe = (el, prop, ms) => new Promise((ok) => {
    const t = setTimeout(() => { el.removeEventListener('transitionend', f); ok('tiempo'); }, ms);
    function f(e) { if (e.target === el && e.propertyName === prop) { clearTimeout(t); el.removeEventListener('transitionend', f); ok('fin'); } }
    el.addEventListener('transitionend', f);
  });
  // Deja un elemento sin estilos en línea sin disparar la transición de su CSS: primero sin transición, después se la devuelve.
  function limpiar(el) {
    el.style.transition = 'none';
    for (const k of ['transform', 'transformOrigin', 'opacity', 'visibility', 'willChange']) el.style[k] = '';
    asentarEstilos(el);
    el.style.transition = '';
  }

  async function girar(aDemo) {
    const gen = ++generacion;
    const seguia = g.enCurso;   // llamada a destiempo: se redirige desde donde está, sin volver a fijar el estado inicial
    g.enCurso = true;
    if (fundido) {
      capaDemo.classList.toggle('visible', aDemo);
      await espera(FUNDIDO_MS);
    } else {
      if (aDemo) capaDemo.classList.add('visible');   // desde ya: el resto de la app la ve visible; los estilos en línea mandan mientras dura el giro
      if (!seguia) {
        poner(canvasEscena, { transition: 'none', transformOrigin: '50% 50%', willChange: 'transform, opacity', transform: aDemo ? DE_PIE : ACOSTADO, opacity: aDemo ? '1' : '0' });
        poner(capaDemo, { transition: 'none', transformOrigin: '50% 50%', willChange: 'transform, opacity', visibility: 'visible', transform: aDemo ? FRANJA : ENTERA, opacity: aDemo ? '0' : '1' });
        asentarEstilos(canvasEscena); asentarEstilos(capaDemo);
      }
      const giroCss = `transform ${duracion}ms ${CURVA}`;
      poner(canvasEscena, { transition: `${giroCss}, opacity ${OPACIDAD_MS}ms linear ${aDemo ? Math.max(0, duracion - OPACIDAD_MS) : 0}ms`, transform: aDemo ? ACOSTADO : DE_PIE, opacity: aDemo ? '0' : '1' });
      poner(capaDemo, { transition: `${giroCss}, opacity ${duracion}ms ${CURVA}`, transform: aDemo ? ENTERA : FRANJA, opacity: aDemo ? '1' : '0' });
      await Promise.race([finDe(capaDemo, 'transform', duracion + 150), espera(duracion + 150)]);
    }
    if (gen !== generacion) return;   // la superó otra llamada: limpia esa
    if (!fundido) { capaDemo.classList.toggle('visible', aDemo); limpiar(canvasEscena); limpiar(capaDemo); }
    g.enCurso = false;
  }

  return { aCenital: () => girar(true), aPerfil: () => girar(false), get enCurso() { return g.enCurso; } };
}
