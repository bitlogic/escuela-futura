// Personajes de Pixel Agents (assets/personajes/char_N.png: 7 cuadros de 16×32, filas abajo / arriba / derecha),
// compartidos por la escuela (oficina.js), el chat y el organigrama.
// Las rutas de las imágenes son relativas a la página (stage/).

/** Qué hoja usa cada uno. Academia es la de Advisor con otra ropa y el pelo violeta (ver cargarHojas). */
export const MODELOS = { persona: 0, coordinacion: 1, advisor: 2, bienestar: 3, admisiones: 4, tutor: 5, academia: 6 };

/** Color de cada uno en el chat y el organigrama (sobre fondo oscuro). */
export const COLOR = { coordinacion: '#7a9bff', tutor: '#f0c13f', advisor: '#44c9b3', bienestar: '#f07fb0', admisiones: '#e0b84a', academia: '#6fd987', persona: '#ff7a3d' };

export function cargarImagen(src) { return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo cargar ' + src)); i.src = src; }); }

/** Rota el tono de una hoja. desdeY: deja la cabeza (piel y pelo) como está y tiñe solo desde esa fila de cada cuadro. */
export function teñir(img, grados, desdeY = 0) {
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, cv.width, cv.height); const a = grados * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
  for (let i = 0; i < d.data.length; i += 4) {
    if ((((i / 4) / cv.width) | 0) % 32 < desdeY) continue;
    const R = d.data[i], G = d.data[i + 1], B = d.data[i + 2];
    d.data[i] = Math.max(0, Math.min(255, R * (.213 + cs * .787 - sn * .213) + G * (.715 - cs * .715 - sn * .715) + B * (.072 - cs * .072 + sn * .928)));
    d.data[i + 1] = Math.max(0, Math.min(255, R * (.213 - cs * .213 + sn * .143) + G * (.715 + cs * .285 + sn * .14) + B * (.072 - cs * .072 - sn * .283)));
    d.data[i + 2] = Math.max(0, Math.min(255, R * (.213 - cs * .213 - sn * .787) + G * (.715 - cs * .715 + sn * .715) + B * (.072 + cs * .928 + sn * .072)));
  }
  c.putImageData(d, 0, 0); return cv;
}

/** Pinta de violeta el pelo oscuro (filas de arriba de cada cuadro, sin tocar ojos ni piel). Devuelve el mismo canvas. */
function peloVioleta(cv, hastaY = 13) {
  const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height);
  for (let i = 0; i < d.data.length; i += 4) {
    if ((((i / 4) / cv.width) | 0) % 32 >= hastaY || d.data[i + 3] === 0) continue;
    const R = d.data[i], G = d.data[i + 1], B = d.data[i + 2];
    if (R > 90 || G > 90 || B > 90) continue;                 // solo lo oscuro: el pelo y su contorno
    const v = (R + G + B) / 3;
    d.data[i] = Math.min(255, v * 1.9 + 24); d.data[i + 1] = Math.min(255, v * 0.55 + 6); d.data[i + 2] = Math.min(255, v * 2.7 + 40);
  }
  c.putImageData(d, 0, 0); return cv;
}

/** Las 7 hojas (0..5 de Pixel Agents + 6 = Academia). */
export async function cargarHojas() {
  const hojas = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => cargarImagen(`assets/personajes/char_${i}.png`)));
  hojas.push(peloVioleta(teñir(hojas[2], 120, 21)));
  return hojas;
}

/** La cara de un personaje (cuadro de pie por defecto, mirando de frente; 3 y 4 son los de tipear, 5 y 6 los de leer) como canvas de 16×16 px lógicos a la escala pedida. */
export function cara(hoja, escala = 1, cuadro = 1) {
  const cv = document.createElement('canvas'); cv.width = 16 * escala; cv.height = 16 * escala;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.drawImage(hoja, cuadro * 16, cuadro === 3 || cuadro === 4 ? 6 : 3, 16, 16, 0, 0, 16 * escala, 16 * escala);
  return cv;
}

/**
 * Una cara con vida: los ojos miran a un costado, parpadea y puede levantar la mano para saludar.
 * Devuelve { canvas, dibujar({ mirada: -1|0|1, parpado: bool, mano: 0|1|2 }) }; mano 1 y 2 son las dos posiciones del saludo.
 */
export function caraViva(hoja, escala = 6) {
  const base = document.createElement('canvas'); base.width = base.height = 16;
  const bc = base.getContext('2d', { willReadFrequently: true }); bc.drawImage(hoja, 16, 3, 16, 16, 0, 0, 16, 16);
  const orig = bc.getImageData(0, 0, 16, 16); const px = orig.data;
  const esOjo = (i) => px[i + 3] > 0 && ((px[i] <= 20 && px[i + 1] <= 20 && px[i + 2] <= 20) || (px[i] >= 250 && px[i + 1] >= 250 && px[i + 2] >= 250));
  const ojos = [];
  for (let y = 8; y <= 14; y++) for (let x = 3; x <= 12; x++) { const i = (y * 16 + x) * 4; if (esOjo(i)) ojos.push({ x, y, c: [px[i], px[i + 1], px[i + 2]] }); }
  // piel: el color más común entre los píxeles no-ojo de las filas de los ojos
  const filas = new Set(ojos.map((o) => o.y)); const cuenta = new Map();
  for (const y of filas) for (let x = 4; x <= 11; x++) { const i = (y * 16 + x) * 4; if (px[i + 3] && !esOjo(i)) { const k = px[i] + ',' + px[i + 1] + ',' + px[i + 2]; cuenta.set(k, (cuenta.get(k) || 0) + 1); } }
  const piel = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0].split(',').map(Number) || [233, 163, 132];
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16 * escala;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  const cv = document.createElement('canvas'); cv.width = cv.height = 16; const cc = cv.getContext('2d');
  const MANO = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.'];   // la palma abierta; en la posición 2 se inclina un píxel
  function dibujar({ mirada = 0, parpado = false, mano = 0 } = {}) {
    const img = new ImageData(new Uint8ClampedArray(px), 16, 16); const d = img.data;
    const poner = (x, y, col) => { if (x < 0 || x > 15) return; const i = (y * 16 + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
    for (const o of ojos) poner(o.x, o.y, piel);
    if (!parpado) for (const o of ojos) poner(o.x + mirada, o.y, o.c);
    cc.putImageData(img, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(cv, 0, 0, canvas.width, canvas.height);
    if (mano) {
      const borde = `rgb(${piel.map((v) => v * 0.45 | 0)})`, relleno = `rgb(${piel})`;
      const y0 = 11 - (mano === 2 ? 1 : 0), x0 = 11 + (mano === 2 ? 0 : -0);
      MANO.forEach((fila, j) => [...fila].forEach((ch, i) => { if (ch !== 'X') return; const x = x0 + i + (mano === 2 ? (j < 2 ? 1 : 0) : 0), y = y0 + j; c.fillStyle = borde; c.fillRect((x - 0.35) * escala, (y - 0.35) * escala, escala * 1.7, escala * 1.7); }));
      MANO.forEach((fila, j) => [...fila].forEach((ch, i) => { if (ch !== 'X') return; const x = x0 + i + (mano === 2 ? (j < 2 ? 1 : 0) : 0), y = y0 + j; c.fillStyle = relleno; c.fillRect(x * escala, y * escala, escala, escala); }));
    }
  }
  dibujar();
  return { canvas, dibujar };
}
