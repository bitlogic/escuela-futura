// Reproductor del deck de la charla. Las láminas están en slides/<id>.html con el formato del tipo Slides de claude.ai
// (una <section> de 1920×1080 con todos los estilos en línea; <aside> = notas; <x-embed> = una página chica aislada;
// <x-shape> y <x-icon> = formas e íconos). Este módulo las carga, las traduce a HTML común y las monta en un lienzo;
// lo usan la presentación (index.html) y la vista del presentador (presentador.html).

export const ANCHO = 1920, ALTO = 1080;

// Los íconos del formato que usa el deck (name="…"), como SVG en línea que toma el color del elemento.
const ICONOS = {
  Warning: '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 2.4 22.6 20.6H1.4Z" fill="currentColor"/><path d="M11 9h2v5.2h-2zm0 6.6h2v2.1h-2z" fill="#0E0C22"/></svg>',
};

// Carga deck.json y cada lámina del orden. `base` es el prefijo de las URLs (vacío: la misma carpeta).
export async function cargarDeck(base = '') {
  const deck = await (await fetch(base + 'deck.json')).json();
  const laminas = await Promise.all(deck.order.map(async (id) => {
    const r = await fetch(`${base}slides/${id}.html`);
    if (!r.ok) throw new Error(`No está la lámina ${id} (${r.status})`);
    return prepararLamina(id, await r.text());
  }));
  return { deck, laminas };
}

// De un archivo de lámina a { id, section, notas, titulo, demo, desde, hasta }: la <section> lista para montar.
export function prepararLamina(id, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const section = doc.querySelector('section');
  if (!section) throw new Error(`La lámina ${id} no tiene <section>`);
  const aside = section.querySelector('aside');
  const notas = aside ? aside.textContent.trim() : '';
  if (aside) aside.remove();
  // <x-embed>: una página chica que corre aislada (el orb animado de la portada). Va como iframe con sandbox, sin red ni foco.
  for (const e of [...section.querySelectorAll('x-embed')]) {
    const f = doc.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('style', (e.getAttribute('style') || '') + ';border:0;pointer-events:none;background:transparent');
    f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true'); f.setAttribute('title', '');
    f.setAttribute('srcdoc', '<!doctype html><meta charset="utf-8">' + e.innerHTML);
    e.replaceWith(f);
  }
  // <x-icon name="…">: SVG en línea.
  for (const e of [...section.querySelectorAll('x-icon')]) {
    const s = doc.createElement('span'); s.className = 'x-icon';
    s.setAttribute('style', e.getAttribute('style') || '');
    s.innerHTML = ICONOS[e.getAttribute('name')] || '';
    e.replaceWith(s);
  }
  // En el formato, border-radius:50% sobre un texto es una píldora (no una elipse).
  for (const p of section.querySelectorAll('p, h1, h2, h3')) if (/border-radius:\s*50%/.test(p.getAttribute('style') || '')) p.style.borderRadius = '9999px';
  // Orden de pintado del formato: los hijos pintan en el orden del HTML, y todo el flujo es UNA capa ubicada donde está el
  // primer hijo de flujo (un fondo pineado listado primero queda debajo del texto; uno listado después, encima). En CSS
  // común lo pineado siempre pinta sobre el flujo, así que se reparte en tres capas: pineados de antes, el flujo, pineados de después.
  const hijos = [...section.children];
  const pineado = (h) => /position:\s*absolute/.test(h.getAttribute('style') || '');
  const primerFlujo = hijos.findIndex((h) => !pineado(h));
  hijos.forEach((h, i) => {
    if (!pineado(h)) { h.style.position = 'relative'; h.style.zIndex = '1'; }
    else h.style.zIndex = primerFlujo >= 0 && i > primerFlujo ? '2' : '0';
  });
  // Pasos: los elementos con data-paso="N" (N ≥ 1) quedan ocultos hasta el clic N de la lámina (ver mostrarPaso).
  const pasos = Math.max(0, ...[...section.querySelectorAll('[data-paso]')].map((e) => Number(e.dataset.paso) || 0));
  const titulo = ((section.querySelector('h1, h2, h3') || {}).textContent || id).replace(/\s+/g, ' ').trim();
  // La puesta en escena de la lámina (presentacion/escena/): data-escena (JSON) y data-placa. Sin ellos, la lámina se ve como siempre.
  let escena = null; try { escena = section.dataset.escena ? JSON.parse(section.dataset.escena) : null; } catch (e) { console.error(`La lámina ${id} tiene un data-escena inválido:`, e.message); }
  const placa = section.dataset.placa || null;
  const t = notas.match(/^\[(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?/) || [];
  return { id, section: document.importNode(section, true), notas, titulo, pasos, demo: section.dataset.demo || null, escena, placa, desde: t[1] || null, hasta: t[2] || null, transicion: section.dataset.transition || 'fade' };
}

// Deja vistos los elementos de la lámina con data-paso ≤ k (k = 0: solo lo que no tiene paso).
export function mostrarPaso(section, k) {
  for (const e of section.querySelectorAll('[data-paso]')) e.classList.toggle('visto', (Number(e.dataset.paso) || 0) <= k);
}

// Escala un lienzo de 1920×1080 para que entre en su contenedor (o en la ventana), centrado.
export function escalar(lienzo, ancho = innerWidth, alto = innerHeight) {
  const s = Math.min(ancho / ANCHO, alto / ALTO);
  lienzo.style.transform = `translate(${(ancho - ANCHO * s) / 2}px, ${(alto - ALTO * s) / 2}px) scale(${s})`;
  return s;
}

// "8:45" → segundos.
export const segundos = (mmss) => { if (!mmss) return null; const [m, s] = mmss.split(':').map(Number); return m * 60 + s; };
export const mmss = (seg) => { seg = Math.max(0, Math.floor(seg)); return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`; };
