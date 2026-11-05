// Institución Agéntica · la página para leer.
// La escuela de la charla (presentacion/escena/, copiada en vendor/ por scripts/armar-pages.mjs) queda en un canvas fijo
// detrás de la página; cada bloque con data-paso-escena le dice qué mostrar cuando llega al centro de la pantalla,
// igual que data-escena en las láminas. Si la escena no arranca, la página se lee igual: los capítulos tienen el fondo del deck.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const leer = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } };

// ---------- Aparecer al entrar en pantalla ----------
const alVer = new IntersectionObserver((entradas) => {
  for (const e of entradas) if (e.isIntersecting) { e.target.classList.add('visto'); alVer.unobserve(e.target); if (e.target.querySelector('[data-contar]') || e.target.matches('[data-contar]')) contar(e.target); }
}, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
$$('.revelar, .paso, .agentes').forEach((el) => alVer.observe(el));
$$('.agentes li').forEach((li, i) => li.style.setProperty('--i', i));

// Los números cuentan desde cero la primera vez que se ven.
function contar(raiz) {
  for (const el of raiz.matches('[data-contar]') ? [raiz] : $$('[data-contar]', raiz)) {
    if (el.dataset.contado) continue; el.dataset.contado = '1';
    const fin = +el.dataset.contar, sufijo = ' %';
    if (reducido) { el.textContent = fin + sufijo; continue; }
    const t0 = performance.now(), dur = 1400;
    const tick = (t) => { const u = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - u, 4); el.textContent = Math.round(fin * k) + sufijo; if (u < 1) requestAnimationFrame(tick); };
    el.textContent = '0' + sufijo; requestAnimationFrame(tick);
  }
}

// ---------- Barra: progreso de lectura y capítulo actual ----------
const progreso = $('#progreso');
const enlaces = $$('.barra-nav a');
const capitulos = enlaces.map((a) => $(a.getAttribute('href'))).filter(Boolean);
const finDe = { '#sofia': '#velocidad', '#velocidad': '#tesis', '#tesis': '#delegar', '#delegar': '#escuela-futura', '#escuela-futura': '#aula', '#criterio': '#recibe' };
function actualizarBarra() {
  const max = document.documentElement.scrollHeight - innerHeight;
  progreso.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  const y = scrollY + innerHeight * .35;
  let activo = null;
  for (const a of enlaces) {
    const ini = $(a.getAttribute('href')), fin = $(finDe[a.getAttribute('href')] || '#conversemos');
    if (ini && ini.offsetTop <= y && (!fin || fin.offsetTop > y)) activo = a;
  }
  for (const a of enlaces) a.classList.toggle('activo', a === activo);
}

// ---------- La escena ----------
const canvas = $('#escena');
const pasos = $$('[data-paso-escena]').map((el) => ({ el, datos: JSON.parse(el.dataset.pasoEscena) }));
const conEscena = $$('.escena');
let escena = null, actual = null, claveActual = '', corriendo = false;
const extra = new Map();   // lo que la página le suma a un paso (las manos que levantó quien lee)

async function arrancarEscena() {
  if (new URLSearchParams(location.search).get('sin-escena') === '1') return;
  try {
    const [{ crearEscena }, { SALAS, TEMAS }, { MODELOS, cargarImagen }] = await Promise.all([
      import('./vendor/presentacion/escena/escena.js'), import('./vendor/stage/oficina.js'), import('./vendor/stage/personajes.js'),
    ]);
    // En una pantalla vertical la composición de 16:9 entraría como una franja: se agranda hasta mostrar la mitad del ancho.
    const cubrir = () => (canvas.clientWidth / Math.max(1, canvas.clientHeight) >= 1.2 ? 1 : .55);
    escena = await crearEscena({
      canvas, placa: $('#escena-placa'), capaDemo: $('#escena-demo'),
      deps: { SALAS, TEMAS, MODELOS, cargarImagen },
      opciones: { cubrir, medirLienzo: true, hd: new URLSearchParams(location.search).get('plano') !== '1' },
      alFallar: (e) => { console.error('La escena falló; la página sigue sin ella.', e); apagarEscena(); },
    });
    document.body.classList.add('con-escena-viva');
    actual = null; claveActual = ''; revisarEscena();
  } catch (e) { console.warn('La escena no pudo arrancar; la página se lee sin ella.', e); escena = null; }
}
function apagarEscena() { try { escena && escena.apagar(); } catch {} escena = null; document.body.classList.remove('con-escena-viva'); canvas.classList.remove('visible'); }

function pasoEnPantalla() {
  const centro = innerHeight / 2; let mejor = null, dist = Infinity;
  for (const p of pasos) {
    const r = p.el.getBoundingClientRect();
    if (r.bottom < innerHeight * .25 || r.top > innerHeight * .75) continue;
    const d = r.top <= centro && r.bottom >= centro ? 0 : Math.min(Math.abs(r.top - centro), Math.abs(r.bottom - centro));
    if (d < dist) { dist = d; mejor = p; }
  }
  return mejor;
}
function hayEscenaEnPantalla() { return conEscena.some((s) => { const r = s.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }); }

function revisarEscena() {
  if (!escena) return;
  const visible = hayEscenaEnPantalla();
  if (visible !== corriendo) { corriendo = visible; escena.pausar(!visible); canvas.classList.toggle('oculta-fuera', !visible); }
  if (!visible) return;
  const p = pasoEnPantalla();
  if (!p || p === actual) return;
  mostrar(p);
}
function mostrar(p, forzar = false) {
  const { id, escena: e, paso = 0 } = p.datos;
  // camxAncha: en una pantalla apaisada el texto va a un costado y la escuela se corre al otro.
  const ancha = innerWidth / Math.max(1, innerHeight) >= 1.2 && innerWidth > 900;
  // movil: lo que cambia en una pantalla vertical (la escuela sube para dejarle la mitad de abajo al texto).
  const declarada = { ...e, ...(ancha && p.datos.camxAncha != null ? { camx: p.datos.camxAncha } : {}), ...(!ancha && p.datos.movil ? p.datos.movil : {}), ...(extra.get(p.el) || {}) };
  const clave = id + JSON.stringify(declarada);
  const primera = !actual;
  actual = p;
  if (!forzar && clave === claveActual) { escena.paso(paso); return; }
  claveActual = clave;
  escena.ir({ id, escena: declarada, placa: 'ninguna', section: p.el, pasos: e.foco === 'pasos' ? 5 : 0 }, paso, { instantaneo: primera && reducido });
}

// ---------- La línea de tiempo de Sofía ----------
const linea = $('#linea-sofia'), punto = $('#ls-punto'), sofia = $('#sofia');
function actualizarSofia() {
  const r = sofia.getBoundingClientRect();
  const dentro = r.top < innerHeight * .6 && r.bottom > innerHeight * .7;
  linea.classList.toggle('on', dentro);
  if (!dentro) return;
  let k = 0;
  for (const el of $$('[data-sofia]', sofia)) if (el.getBoundingClientRect().top < innerHeight * .6) k = +el.dataset.sofia;
  punto.style.left = (k * 100) + '%';
  for (const a of $$('.ls-anio', linea)) { const ka = +a.dataset.k; a.style.left = (ka * 100) + '%'; a.classList.toggle('activo', Math.abs(ka - k) < .26 || (ka === 0 && k < .26)); }
}

// ---------- Scroll ----------
let pendiente = false;
function alMover() { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false; actualizarBarra(); actualizarSofia(); revisarEscena(); }); }
addEventListener('scroll', alMover, { passive: true });
let eraAncha = innerWidth / Math.max(1, innerHeight) >= 1.2 && innerWidth > 900;
addEventListener('resize', () => {
  if (escena) escena.medir();
  const ancha = innerWidth / Math.max(1, innerHeight) >= 1.2 && innerWidth > 900;
  if (ancha !== eraAncha && escena && actual) { eraAncha = ancha; mostrar(actual, true); }
  alMover();
});
alMover();

// ---------- Las dos preguntas: las manos del aula suben con la respuesta ----------
const RESPUESTAS = {
  1: {
    si: { manos: 1, texto: 'Como casi toda la sala. Es el primer paso, y el más común: decidir qué pueden hacer los estudiantes con la IA.' },
    no: { manos: .3, texto: 'Están en minoría, pero no solos. Y tienen una ventaja: pueden empezar por la pregunta que sigue, que es la que casi nadie se hizo.' },
    nose: { manos: .55, texto: 'Pasa más de lo que parece. Si existe y nadie la conoce, para el trabajo de todos los días es casi lo mismo que no tenerla.' },
  },
  2: {
    si: { manos: .3, texto: 'Están adelante de la mayoría: según UNESCO, solo el 26 % de las instituciones de la región tiene una estrategia formal. Lo que sigue en esta página es hasta dónde puede llegar eso.' },
    no: { manos: .08, texto: 'Es lo más normal. En la sala bajaron casi todas las manos. Primero regulamos a los estudiantes: lo fácil es regular al otro; lo difícil es decidir cómo trabaja con IA la propia institución. Muchos preocupados, pocos ocupados.' },
    nose: { manos: .15, texto: 'Entonces probablemente no la haya, o no se usa. La IA igual ya está adentro: la usan docentes y equipos, cada uno a su manera.' },
  },
};
for (const grupo of $$('.opciones')) {
  const n = grupo.dataset.pregunta, salida = $(`[data-respuesta="${n}"]`), paso = grupo.closest('[data-paso-escena]');
  const elegir = (r, animar = true) => {
    for (const b of $$('button', grupo)) b.setAttribute('aria-pressed', String(b.dataset.r === r));
    const res = RESPUESTAS[n][r]; salida.textContent = res.texto;
    extra.set(paso, { manos: res.manos }); guardar('ia-pregunta-' + n, r);
    if (animar && escena && paso) { const p = pasos.find((x) => x.el === paso); if (p) mostrar(p, true); }
  };
  for (const b of $$('button', grupo)) { b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => elegir(b.dataset.r)); }
  const previa = leer('ia-pregunta-' + n, null); if (previa && RESPUESTAS[n][previa]) elegir(previa, false);
}

// ---------- Preguntar / delegar ----------
const tabs = $$('.comparar-tabs [role="tab"]');
function elegirTab(tab) {
  for (const t of tabs) { const si = t === tab; t.setAttribute('aria-selected', String(si)); t.tabIndex = si ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !si; }
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => elegirTab(t));
  t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const o = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; elegirTab(o); o.focus(); e.preventDefault(); } });
});
// Arranca en "Preguntar" y, la primera vez que se ve, pasa sola a "Delegar": la diferencia se ve sin tocar nada.
elegirTab(tabs[0]);
{
  const comp = $('.comparar'); let tocado = false;
  comp.addEventListener('pointerdown', () => { tocado = true; }, { once: true });
  new IntersectionObserver(([e], obs) => { if (!e.isIntersecting) return; obs.disconnect(); setTimeout(() => { if (!tocado) elegirTab(tabs[1]); }, 2600); }, { threshold: .6 }).observe(comp);
}

// ---------- Las seis preguntas ----------
const casillas = $$('#preguntas input');
const estadoPreg = $('#preguntas-estado');
function contarPreguntas() {
  const n = casillas.filter((c) => c.checked).length;
  estadoPreg.textContent = n === 0 ? 'Ninguna marcada todavía.' : n === 6 ? 'Las seis tienen respuesta. Están listos para el primer agente.' : `${n} de 6 con respuesta. ${n >= 4 ? 'Falta poco.' : 'Las que faltan son un buen orden del día.'}`;
  guardar('ia-preguntas', casillas.map((c) => c.checked));
}
leer('ia-preguntas', []).forEach((v, i) => { if (casillas[i]) casillas[i].checked = !!v; });
casillas.forEach((c) => c.addEventListener('change', contarPreguntas)); contarPreguntas();
$('#copiar-preguntas').addEventListener('click', async (e) => {
  const texto = 'Seis preguntas antes del primer agente (Institución Agéntica, Innova Educa 21)\n\n' +
    $$('#preguntas li').map((li, i) => `${i + 1}. ${$('b', li).textContent} ${$('b', li).nextSibling.textContent.trim()}`).join('\n') + '\n\n' + location.href.split('#')[0];
  const b = e.currentTarget, antes = b.textContent;
  try { await navigator.clipboard.writeText(texto); b.textContent = 'Copiadas. Pegalas donde quieras.'; }
  catch { b.textContent = 'No se pudo copiar desde este navegador.'; }
  setTimeout(() => { b.textContent = antes; }, 2800);
});

// ---------- Capturas ampliadas ----------
const visor = $('#visor');
for (const b of $$('.ampliar')) b.addEventListener('click', () => { const img = $('img', b); $('img', visor).src = img.src; $('img', visor).alt = img.alt; visor.showModal(); });
$('.visor-cerrar').addEventListener('click', () => visor.close());
visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });

// ---------- Los seis agentes en fila (el mismo dibujo de la portada de la charla) ----------
async function fila() {
  const lienzo = $('#agentes'); if (!lienzo) return;
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(lienzo);
  try {
    const [{ crearPortada }, { MODELOS, cargarImagen }] = await Promise.all([import('./vendor/presentacion/escena/portada.js'), import('./vendor/stage/personajes.js')]);
    await crearPortada(lienzo, { cargarImagen, MODELOS }, { activa: () => visible });
  } catch (e) { console.warn('No se pudo dibujar la fila de agentes.', e); lienzo.hidden = true; }
}

fila();
arrancarEscena();
