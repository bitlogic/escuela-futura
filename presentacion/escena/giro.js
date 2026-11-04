// El giro: de la escuela de perfil a la escuela desde arriba (la app) y la vuelta. Ver CONTRATO.md §4 (giro.js).
//
// Con `iframeDemo` el giro es una sola cámara que sube: antes de girar se le pide a la vista de la demo un cuadro del mapa
// (postMessage { tipo: 'cuadro' } → { tipo: 'cuadro', dataUrl, ancho, alto }, con 150 ms de espera; si no contesta y es del
// mismo origen, se lee su canvas #lienzo directo) y con ese cuadro se arma una "tapa": un canvas propio con el mapa en el
// mismo lugar donde lo va a mostrar el iframe. La tapa y el canvas de la escena son dos caras de un mismo cubo que rueda
// hacia la sala alrededor de un eje horizontal: el perfil (la cara del frente) se acuesta hacia abajo mientras la planta
// (la cara de arriba) baja y se levanta hasta llenar la pantalla, con la misma perspectiva, la misma curva y un pequeño
// alejamiento a mitad de camino para que el cubo entre en cuadro. En el último tramo la tapa se funde con el iframe real,
// que estuvo debajo todo el tiempo sin tocarse ni recargarse (sigue conectado por SSE); al terminar la tapa se saca del
// DOM. aPerfil() es la inversa, con un cuadro nuevo (la demo cambió). Solo se transforman contenedores.
//
// Sin cuadro (la vista no contesta, otro origen), sin `iframeDemo`, con `simple` (?plano=1) o prefers-reduced-motion,
// queda el respaldo: el giro simulado de antes (el perfil se acuesta con rotateX(78deg) y la capa de la demo crece desde
// una franja), o el fundido de 450 ms de siempre. Al terminar, los estilos en línea quedan limpios y la capa de la demo
// con su clase `visible` puesta o sacada, así el fundido normal de #ui-demo sigue andando en las otras láminas.
// Si llega una llamada mientras otra está en curso (una tecla a destiempo), el giro se redirige desde donde está (el cubo
// vuelve sobre sus pasos) y la llamada anterior resuelve enseguida: nunca hay dos giros peleándose por los mismos contenedores.
//
//   crearGiro({ canvasEscena, capaDemo, iframeDemo, duracion = 900, simple = false }) → { aCenital() → Promise, aPerfil() → Promise, enCurso }
//
// Se importa en Node sin DOM: nada de document, matchMedia ni getComputedStyle fuera de crearGiro (y lo del cubo, solo al girar).

export const CURVA = 'cubic-bezier(.6,0,.2,1)';
/** El canvas de la escena acostado (la planta vista en escorzo) y de pie; misma lista de funciones para que la interpolación sea por componente. */
export const ACOSTADO = 'perspective(1600px) rotateX(78deg) scale(1.15)';
export const DE_PIE = 'perspective(1600px) rotateX(0deg) scale(1)';
/** La capa de la demo como franja y entera. */
export const FRANJA = 'scaleY(.06)';
export const ENTERA = 'scaleY(1)';
export const FUNDIDO_MS = 450;     // el giro simple (?plano=1, prefers-reduced-motion)
export const OPACIDAD_MS = 300;    // el canvas se apaga en los últimos 300 ms (y se prende en los primeros, a la vuelta)
/** El cubo: cuánto se espera el cuadro, el alejamiento a mitad de camino y cuándo la tapa se funde con el iframe real. */
export const CUADRO_MS = 150;
export const ESCALA_MEDIA = .7;
export const FUNDIDO_TAPA = .86;   // fracción del tiempo a partir de la cual la tapa deja ver el iframe (hacia la demo) o lo tapa (a la vuelta)
export const ASENTADO = .97;      // fracción del progreso (de la curva) desde la que el cubo ya está exactamente plano: la tapa se funde sin desdoblar el mapa
export const APAGADO_FRENTE = [.3, .5];   // el frente se apaga entre estas fracciones del tiempo (de -15° a -63°, donde su reverso quedaría a la vista)
export const ID_TAPA = 'ui-giro-tapa';

/** Las dos caras del cubo en un momento del giro: `angulo` va de 0 (perfil de frente) a -90 (planta de frente), `escala` es el alejamiento.
 *  El eje pasa por el centro del cubo, medio alto detrás de la pantalla; el ojo (el origen) está en el borde de arriba, así la planta
 *  entra desde el borde como el techo que aparece cuando la cámara sube. Exportado para los tests. */
export function carasCubo(angulo, escala, alto, perspectiva = Math.max(1200, Math.round(alto * 1.5))) {
  const medio = Math.round(alto / 2);
  const cara = (grados) => `perspective(${perspectiva}px) translateY(${medio}px) translateZ(${-medio}px) scale3d(${escala},${escala},${escala}) rotateX(${grados}deg) translateZ(${medio}px) translateY(${-medio}px)`;
  return { frente: cara(angulo), techo: cara(angulo + 90) };
}

export function crearGiro({ canvasEscena, capaDemo, iframeDemo = null, duracion = 900, simple = false } = {}) {
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
    for (const k of ['transform', 'transformOrigin', 'opacity', 'visibility', 'willChange', 'backfaceVisibility']) el.style[k] = '';
    asentarEstilos(el);
    el.style.transition = '';
  }

  // ---------- El cubo: el cuadro de la demo y la tapa ----------
  const puedeCubo = !!iframeDemo && typeof document !== 'undefined' && typeof Image === 'function' && typeof HTMLElement === 'function' && typeof HTMLElement.prototype.animate === 'function';
  let tapa = null, animaciones = [];   // la tapa viva y las animaciones del cubo (frente, techo, capa de la demo) mientras dura el giro

  // Pide el cuadro del mapa por postMessage; si no llega a tiempo y la vista es del mismo origen, lee su canvas. Devuelve
  // { imagen, rect, fondo } o null. `rect` es dónde está el mapa en la ventana (el iframe ocupa la ventana entera).
  async function pedirCuadro() {
    const win = iframeDemo.contentWindow; if (!win) return null;
    const respuesta = await new Promise((ok) => {
      const t = setTimeout(() => { removeEventListener('message', f); ok(null); }, CUADRO_MS);
      function f(e) { if (e.source === win && e.data && e.data.tipo === 'cuadro') { clearTimeout(t); removeEventListener('message', f); ok(e.data); } }
      addEventListener('message', f);
      try { win.postMessage({ tipo: 'cuadro' }, '*'); } catch { clearTimeout(t); removeEventListener('message', f); ok(null); }
    });
    let imagen = null, lienzo = null, doc = null;
    try { doc = iframeDemo.contentDocument; lienzo = doc && doc.getElementById('lienzo'); } catch { doc = null; lienzo = null; }   // otro origen: no se puede mirar adentro
    if (respuesta && respuesta.dataUrl) {
      imagen = new Image(); imagen.src = respuesta.dataUrl;
      try { await imagen.decode(); } catch { imagen = null; }
    }
    if (!imagen && lienzo && lienzo.width) imagen = lienzo;   // puente del mismo origen: el canvas del mapa, tal cual está
    if (!imagen) return null;
    let rect = respuesta && respuesta.rect && respuesta.rect.ancho ? respuesta.rect : null;
    if (!rect && lienzo) { const r = lienzo.getBoundingClientRect(); if (r.width) rect = { x: r.left, y: r.top, ancho: r.width, alto: r.height }; }
    if (!rect) {   // sin dónde ponerlo: el mapa entero centrado, sin deformar
      const iw = imagen.naturalWidth || imagen.width, ih = imagen.naturalHeight || imagen.height, W = innerWidth, H = innerHeight;
      const k = Math.min(W / iw, H / ih); rect = { x: (W - iw * k) / 2, y: (H - ih * k) / 2, ancho: iw * k, alto: ih * k };
    }
    let fondo = (respuesta && respuesta.fondo) || '';
    if (!fondo && doc && typeof getComputedStyle === 'function') { try { fondo = getComputedStyle(doc.body).backgroundColor || ''; } catch {} }
    if (!fondo || fondo === 'rgba(0, 0, 0, 0)' || fondo === 'transparent') fondo = '#06050F';
    return { imagen, rect, fondo };
  }
  // La tapa: un canvas del tamaño de la ventana con el fondo de la vista y el mapa en su lugar, encima de la capa de la demo.
  function crearTapa({ imagen, rect, fondo }) {
    const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    const c = document.createElement('canvas'); c.id = ID_TAPA; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    poner(c, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '11', pointerEvents: 'none', display: 'block' });
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(imagen, rect.x, rect.y, rect.ancho, rect.alto);
    (capaDemo.parentNode || document.body).appendChild(c);
    return c;
  }
  function sacarTapa() { for (const a of animaciones) a.cancel(); animaciones = []; if (tapa && tapa.parentNode) tapa.parentNode.removeChild(tapa); tapa = null; }
  // Las animaciones del cubo hacia la demo (`aDemo`); la vuelta es la misma al revés (direction: 'reverse'). Los transform
  // siguen la CURVA; las opacidades van lineales en el tiempo: el frente se apaga entre APAGADO_FRENTE (cuando ya es una
  // franja al pie y antes de que se vea su reverso) y la tapa se funde con el iframe real en el último tramo (FUNDIDO_TAPA),
  // cuando ya está casi plana y a escala 1, así el mapa no se desdobla.
  function animarCubo(aDemo) {
    const H = innerHeight;
    const a0 = carasCubo(0, 1, H), am = carasCubo(-45, ESCALA_MEDIA, H), a1 = carasCubo(-90, 1, H);
    const direction = aDemo ? 'normal' : 'reverse';
    const giro = { duration: duracion, easing: CURVA, fill: 'both', direction }, lineal = { duration: duracion, easing: 'linear', fill: 'both', direction };
    const base = { transformOrigin: '50% 0%', willChange: 'transform, opacity', backfaceVisibility: 'hidden' };
    poner(canvasEscena, base); poner(tapa, base);
    const [f0, f1] = APAGADO_FRENTE;
    animaciones = [
      canvasEscena.animate([{ transform: a0.frente }, { transform: am.frente, offset: .5 }, { transform: a1.frente, offset: ASENTADO }, { transform: a1.frente }], giro),
      canvasEscena.animate([{ opacity: 1 }, { opacity: 1, offset: f0 }, { opacity: 0, offset: f1 }, { opacity: 0 }], lineal),
      tapa.animate([{ transform: a0.techo }, { transform: am.techo, offset: .5 }, { transform: a1.techo, offset: ASENTADO }, { transform: a1.techo }], giro),
      tapa.animate([{ opacity: 1 }, { opacity: 1, offset: FUNDIDO_TAPA }, { opacity: 0 }], lineal),
      capaDemo.animate([{ opacity: 0 }, { opacity: 0, offset: FUNDIDO_TAPA }, { opacity: 1 }], lineal),   // el iframe real, invisible debajo hasta que la tapa se funde
    ];
  }
  const finCubo = () => Promise.race([Promise.all(animaciones.map((a) => a.finished.catch(() => null))), espera(duracion + 150)]);

  let enMarcha = false, cuboHaciaDemo = false;   // enMarcha: ya hay estilos o animaciones puestos (mientras se espera el cuadro todavía no)
  async function girar(aDemo) {
    const gen = ++generacion;
    const seguia = enMarcha;   // llamada a destiempo: se redirige desde donde está, sin volver a fijar el estado inicial
    g.enCurso = true;
    if (fundido) {
      capaDemo.classList.toggle('visible', aDemo);
      await espera(FUNDIDO_MS);
    } else if (seguia && tapa) {
      // el cubo vuelve sobre sus pasos: las mismas animaciones, al revés desde donde están
      if (aDemo !== cuboHaciaDemo) { cuboHaciaDemo = aDemo; for (const a of animaciones) a.reverse(); }
      await finCubo();
    } else {
      let cuadro = null;
      if (!seguia && puedeCubo) {
        cuadro = await pedirCuadro().catch(() => null);
        if (gen !== generacion) return;   // mientras esperaba el cuadro llegó otra llamada: esa arranca de cero
      }
      if (cuadro) {
        tapa = crearTapa(cuadro); enMarcha = true; cuboHaciaDemo = aDemo;
        if (aDemo) capaDemo.classList.add('visible');   // desde ya: el resto de la app la ve visible; la animación la tiene a 0 hasta el final
        poner(capaDemo, { visibility: 'visible' });
        animarCubo(aDemo);
        await finCubo();
      } else {
        // el respaldo: el giro simulado
        if (aDemo) capaDemo.classList.add('visible');   // desde ya: el resto de la app la ve visible; los estilos en línea mandan mientras dura el giro
        if (!seguia) {
          poner(canvasEscena, { transition: 'none', transformOrigin: '50% 50%', willChange: 'transform, opacity', transform: aDemo ? DE_PIE : ACOSTADO, opacity: aDemo ? '1' : '0' });
          poner(capaDemo, { transition: 'none', transformOrigin: '50% 50%', willChange: 'transform, opacity', visibility: 'visible', transform: aDemo ? FRANJA : ENTERA, opacity: aDemo ? '0' : '1' });
          asentarEstilos(canvasEscena); asentarEstilos(capaDemo);
        }
        enMarcha = true;
        const giroCss = `transform ${duracion}ms ${CURVA}`;
        poner(canvasEscena, { transition: `${giroCss}, opacity ${OPACIDAD_MS}ms linear ${aDemo ? Math.max(0, duracion - OPACIDAD_MS) : 0}ms`, transform: aDemo ? ACOSTADO : DE_PIE, opacity: aDemo ? '0' : '1' });
        poner(capaDemo, { transition: `${giroCss}, opacity ${duracion}ms ${CURVA}`, transform: aDemo ? ENTERA : FRANJA, opacity: aDemo ? '1' : '0' });
        await Promise.race([finDe(capaDemo, 'transform', duracion + 150), espera(duracion + 150)]);
      }
    }
    if (gen !== generacion) return;   // la superó otra llamada: limpia esa
    if (!fundido) { capaDemo.classList.toggle('visible', aDemo); sacarTapa(); limpiar(canvasEscena); limpiar(capaDemo); }
    enMarcha = false; g.enCurso = false;
  }

  return { aCenital: () => girar(true), aPerfil: () => girar(false), get enCurso() { return g.enCurso; } };
}
