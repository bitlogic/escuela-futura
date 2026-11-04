// El sonido de la charla: seis señales sintetizadas con WebAudio, sin archivos. Ver CONTRATO.md §4 (sonido.js).
// Nada suena sin un gesto previo del operador (habilitar() desde la primera tecla) ni con silenciar(true): antes de eso
// las señales se ignoran sin error. Se importa en Node sin DOM: el AudioContext y el EventSource se crean adentro de
// las funciones, nunca al importar.
//
//   crearSonido() → { timbre(), luces(), motivo(sube), giro(), tic(), campana(), silenciar(si) → activo, habilitar(),
//                     activo, habilitado, vigilarPropuesta(url), contador, cerrar() }
//
// Las seis señales, todas con el fin de la envolvente clavado en DURACIONES (así el banco puede medirlas):
//   timbre   dos tonos cuadrados filtrados con el "rrring" de un timbre de escuela (tremolo de 19 Hz), 1,2 s
//   luces    el clic del relé y los tubos fluorescentes que titilan hasta prenderse (zumbido de 100 Hz), 2 s
//   motivo   tres notas seno con un armónico, 523-659-784 Hz subiendo (o al revés con motivo(false)), 1 s
//   giro     ruido filtrado con barrido de 300 a 1400 Hz, 0,9 s
//   tic      ruido corto pasa-altos, 50 ms
//   campana  1318 Hz más 1760 Hz con el golpe al principio, 1,4 s
// Todo pasa por un limitador suave (compresor con rodilla ancha) y la ganancia maestra 0,9: nada satura.

import { esPropuesta } from '../../stage/chat.js';

/** Duración de cada señal en segundos (el test exige que, con lo que suena en la charla, sumen 45 s o menos). */
export const DURACIONES = { timbre: 1.2, luces: 2, motivo: 1, giro: .9, tic: .05, campana: 1.4 };
/** Cuántas veces suena cada una en una charla: el timbre una, las luces una, el motivo tres, el giro dos, el tic por cada cambio de plano (unos 14), la campana dos (la propuesta de Martina y la rutina del acto 7). */
export const VECES = { timbre: 1, luces: 1, motivo: 3, giro: 2, tic: 14, campana: 2 };
export const TOTAL_SEGUNDOS = Object.entries(DURACIONES).reduce((t, [k, d]) => t + d * VECES[k], 0);

/** Las notas del motivo de la esfera (do, mi, sol de la quinta octava) y las dos parciales de la campana. */
export const NOTAS_MOTIVO = [523.25, 659.25, 783.99];
export const PARCIALES_CAMPANA = [1318.5, 1760];
export const GANANCIA_MAESTRA = .9;
/** Cada cuánto se vuelve a abrir /api/eventos cuando no hay servidor (502 sin escuela) o se cortó. */
export const REINTENTO_MS = 15000;

/**
 * ¿Este evento del bus es la propuesta que abre el panel de decisión? El mismo criterio que la vista (stage/index.html):
 * un `dice` dirigido a una persona cuyo texto `esPropuesta` (stage/chat.js). La vista no mira quién lo manda; en la
 * demo siempre es Coordinación.
 */
export function esEventoPropuesta(ev) {
  return !!ev && ev.tipo === 'dice' && (ev.a || []).some((d) => String(d || '').startsWith('persona:')) && esPropuesta(ev.texto);
}

/**
 * @param {{ contexto?: AudioContext }} [op] `contexto` lo usa el banco para medir con un OfflineAudioContext; en la charla
 *   se crea solo, al primer gesto.
 */
export function crearSonido({ contexto = null } = {}) {
  const s = { activo: true, habilitado: false, ctx: contexto, salida: null, ruido: null };
  const contador = { timbre: 0, luces: 0, motivo: 0, giro: 0, tic: 0, campana: 0 };

  // ---------- El contexto y la cadena de salida ----------
  function armar(ctx) {
    // señal → limitador suave → ganancia maestra → parlantes. La rodilla ancha y el ratio alto frenan cualquier pico sin
    // que se note como compresión en señales tan cortas.
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -8; lim.knee.value = 14; lim.ratio.value = 16; lim.attack.value = .002; lim.release.value = .08;
    const maestra = ctx.createGain(); maestra.gain.value = GANANCIA_MAESTRA;
    lim.connect(maestra); maestra.connect(ctx.destination);
    s.salida = lim;
  }
  function habilitar() {
    if (!s.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return false;   // sin WebAudio (Node, o un navegador raro): se queda mudo, sin error
      try { s.ctx = new AC(); } catch { return false; }
    }
    if (!s.salida) armar(s.ctx);
    if (s.ctx.state === 'suspended' && typeof s.ctx.resume === 'function') { try { const p = s.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch {} }
    s.habilitado = true;
    return true;
  }
  /** El contexto listo para sonar, o null si todavía no hubo gesto o está silenciado. */
  function listo() { return s.habilitado && s.activo && s.ctx && s.salida ? s.ctx : null; }

  // ---------- Piezas ----------
  function ruido(ctx) {   // un segundo de ruido blanco, compartido; cada señal lo lee con su propia fuente
    if (!s.ruido || s.ruido.sampleRate !== ctx.sampleRate) {
      const n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      s.ruido = b;
    }
    const src = ctx.createBufferSource(); src.buffer = s.ruido; src.loop = true; return src;
  }
  function osc(ctx, tipo, f, t0) { const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t0); return o; }
  function filtro(ctx, tipo, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; return b; }
  /** Una ganancia con envolvente: sube en `ataque`, queda en `nivel`, y cae a 0 justo en t0 + dur (lineal al final, para que el silencio sea silencio). */
  function envolvente(ctx, t0, dur, nivel, ataque = .005, caida = null) {
    const g = ctx.createGain(); const p = g.gain;
    p.setValueAtTime(0, t0); p.linearRampToValueAtTime(nivel, t0 + ataque);
    const tc = caida == null ? t0 + dur * .6 : t0 + Math.min(dur - .02, caida);
    p.setValueAtTime(nivel, tc); p.linearRampToValueAtTime(0, t0 + dur);
    return g;
  }
  function conectar(cadena, salida) { for (let i = 0; i < cadena.length - 1; i++) cadena[i].connect(cadena[i + 1]); cadena[cadena.length - 1].connect(salida); }
  function parar(fuentes, t) { for (const f of fuentes) f.stop(t); }

  // ---------- Las seis señales ----------
  function timbre() {
    const ctx = listo(); if (!ctx) return; contador.timbre++;
    const t0 = ctx.currentTime + .01, dur = DURACIONES.timbre;
    const a = osc(ctx, 'square', 622, t0), b = osc(ctx, 'square', 831, t0);   // dos tonos a una cuarta: el timbre de chapa
    const pb = filtro(ctx, 'lowpass', 2600, .8);
    const trem = osc(ctx, 'square', 19, t0), tremG = ctx.createGain(); tremG.gain.value = .35;   // el "rrring": el badajo pegando 19 veces por segundo
    const tremBase = ctx.createGain(); tremBase.gain.setValueAtTime(.65, t0);
    trem.connect(tremG); tremG.connect(tremBase.gain);
    const env = envolvente(ctx, t0, dur, .22, .004, dur - .25);
    const mezcla = ctx.createGain(); mezcla.gain.value = .5;
    a.connect(mezcla); b.connect(mezcla);
    conectar([mezcla, pb, tremBase, env], s.salida);
    a.start(t0); b.start(t0); trem.start(t0); parar([a, b, trem], t0 + dur + .05);
  }

  function luces() {
    const ctx = listo(); if (!ctx) return; contador.luces++;
    const t0 = ctx.currentTime + .01, dur = DURACIONES.luces;
    // 1. El clic del relé: un golpe de ruido pasa-banda de 12 ms más un toque grave.
    const clic = ruido(ctx), clicF = filtro(ctx, 'bandpass', 2800, 2), clicG = envolvente(ctx, t0, .012, .7, .001, .004);
    conectar([clic, clicF, clicG], s.salida); clic.start(t0); clic.stop(t0 + .03);
    const golpe = osc(ctx, 'sine', 140, t0), golpeG = envolvente(ctx, t0, .06, .35, .002, .01);
    golpe.frequency.exponentialRampToValueAtTime(50, t0 + .06);
    conectar([golpe, golpeG], s.salida); golpe.start(t0); golpe.stop(t0 + .08);
    // 2. Los tubos: zumbido de 100 Hz (la red, rectificada) con un armónico y un siseo fino; titilan hasta quedar prendidos
    //    a los 0,9 s y después se apagan despacio hasta los 2 s (en la charla, el zumbido se da por quedado).
    const zum = osc(ctx, 'sawtooth', 100, t0), zum2 = osc(ctx, 'sine', 200, t0), zumF = filtro(ctx, 'lowpass', 900, 1.5);
    const zumG = ctx.createGain(); zumG.gain.value = .5; zum.connect(zumG); zum2.connect(zumG);
    const sis = ruido(ctx), sisF = filtro(ctx, 'bandpass', 7000, 1.5), sisG = ctx.createGain(); sisG.gain.value = .05;
    const titileo = ctx.createGain(); titileo.gain.setValueAtTime(0, t0);
    let t = t0 + .05, on = false;   // ráfagas irregulares, cada vez más largas, hasta que queda encendido
    while (t < t0 + .9) { on = !on; titileo.gain.setValueAtTime(on ? 1 : 0, t); t += on ? .03 + Math.random() * .09 : .02 + Math.random() * .08; }
    titileo.gain.setValueAtTime(1, t0 + .9);
    const env = envolvente(ctx, t0, dur, .16, .002, 1.2);
    conectar([zumG, zumF, titileo], env); conectar([sis, sisF, sisG], titileo); env.connect(s.salida);
    zum.start(t0); zum2.start(t0); sis.start(t0); parar([zum, zum2, sis], t0 + dur + .05);
  }

  function motivo(sube = true) {
    const ctx = listo(); if (!ctx) return; contador.motivo++;
    const t0 = ctx.currentTime + .01, dur = DURACIONES.motivo;
    const notas = sube ? NOTAS_MOTIVO : [...NOTAS_MOTIVO].reverse();
    const paso = dur / notas.length;
    notas.forEach((f, i) => {
      const ti = t0 + i * paso, fin = i === notas.length - 1 ? t0 + dur : ti + paso * 1.35;   // cada nota se solapa con la siguiente; la última cierra en dur
      const a = osc(ctx, 'sine', f, ti), b = osc(ctx, 'sine', f * 2, ti), bG = ctx.createGain(); bG.gain.value = .22;
      const env = envolvente(ctx, ti, fin - ti, .28, .012, (fin - ti) * .35);
      a.connect(env); b.connect(bG); bG.connect(env); env.connect(s.salida);
      a.start(ti); b.start(ti); parar([a, b], fin + .02);
    });
  }

  function giro() {
    const ctx = listo(); if (!ctx) return; contador.giro++;
    const t0 = ctx.currentTime + .01, dur = DURACIONES.giro;
    const src = ruido(ctx), f = filtro(ctx, 'bandpass', 300, 3.5);   // el pasa-banda angosto come mucho ruido: el nivel compensa
    f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(1400, t0 + dur);
    const env = envolvente(ctx, t0, dur, 1.6, dur * .45, dur * .6);   // crece hasta la mitad y cae: un barrido que pasa de largo
    conectar([src, f, env], s.salida); src.start(t0); src.stop(t0 + dur + .05);
  }

  function tic() {
    const ctx = listo(); if (!ctx) return; contador.tic++;
    const t0 = ctx.currentTime + .005, dur = DURACIONES.tic;
    const src = ruido(ctx), f = filtro(ctx, 'highpass', 4200, .7), env = envolvente(ctx, t0, dur, .3, .002, .01);
    conectar([src, f, env], s.salida); src.start(t0); src.stop(t0 + dur + .02);
  }

  function campana() {
    const ctx = listo(); if (!ctx) return; contador.campana++;
    const t0 = ctx.currentTime + .01, dur = DURACIONES.campana;
    PARCIALES_CAMPANA.forEach((f, i) => {   // la parcial aguda se apaga antes, como en una campana de verdad
      const o = osc(ctx, 'sine', f, t0), g = ctx.createGain(), nivel = i === 0 ? .36 : .2;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(nivel, t0 + .004);
      g.gain.exponentialRampToValueAtTime(nivel * (i === 0 ? .08 : .03), t0 + dur - .15); g.gain.linearRampToValueAtTime(0, t0 + dur);
      o.connect(g); g.connect(s.salida); o.start(t0); o.stop(t0 + dur + .05);
    });
    const golpe = ruido(ctx), gF = filtro(ctx, 'bandpass', 3200, 1.2), gG = envolvente(ctx, t0, .02, .3, .001, .005);   // el badajo
    conectar([golpe, gF, gG], s.salida); golpe.start(t0); golpe.stop(t0 + .05);
  }

  // ---------- La campana cuando llega la propuesta ----------
  let vigia = null;
  /**
   * Escucha /api/eventos (SSE) y hace sonar la campana una vez por propuesta: cuando llega un `dice` que la vista reconoce
   * como una propuesta que abre el panel de decisión (en la demo hay dos: la de Martina y la rutina del acto 7). El
   * `snapshot` inicial trae lo que ya pasó: lo que ya llegó antes se da por sonado y no suena. `reinicio` abre una sesión nueva. Si el servidor no está (502 sin escuela) o se
   * corta, se cierra y se vuelve a intentar cada REINTENTO_MS, nunca en bucle.
   */
  function vigilarPropuesta(url = '/api/eventos') {
    if (vigia) vigia.cerrar();
    const v = { sono: false, es: null, timer: null, cerrado: false, propuestas: 0, vistas: new Set() };
    const claveDe = (ev) => ev.id ?? `${ev.t ?? ev.ts ?? ''}|${String(ev.texto || '').slice(0, 80)}`;
    const eventosDe = (data) => { try { const d = JSON.parse(data); return Array.isArray(d) ? d : (d && Array.isArray(d.eventos) ? d.eventos : []); } catch { return []; } };
    const mirar = (lista, { sonar }) => {
      for (const ev of lista) {
        if (!esEventoPropuesta(ev)) continue;
        const clave = claveDe(ev); if (v.vistas.has(clave)) continue;   // el mismo evento otra vez (reconexión) no suena
        v.vistas.add(clave); v.propuestas++; v.sono = true;
        if (sonar) campana();   // si está silenciado o sin gesto, campana() no suena; igual queda como sonada
      }
    };
    const abrir = () => {
      if (v.cerrado || typeof globalThis.EventSource !== 'function') return;
      let es; try { es = new EventSource(url); } catch { return programar(); }
      v.es = es;
      es.addEventListener('snapshot', (e) => mirar(eventosDe(e.data), { sonar: false }));
      es.addEventListener('eventos', (e) => mirar(eventosDe(e.data), { sonar: true }));
      es.addEventListener('reinicio', () => { v.sono = false; v.vistas.clear(); });
      es.onerror = () => { es.close(); if (v.es === es) v.es = null; programar(); };   // sin reconexión automática del navegador: un intento cada 15 s
    };
    const programar = () => { if (v.cerrado || v.timer) return; v.timer = setTimeout(() => { v.timer = null; abrir(); }, REINTENTO_MS); };
    v.cerrar = () => { v.cerrado = true; if (v.timer) clearTimeout(v.timer); v.timer = null; if (v.es) v.es.close(); v.es = null; };
    abrir();
    vigia = {
      cerrar: v.cerrar,
      get sono() { return v.sono; },
      get propuestas() { return v.propuestas; },
      get conectado() { return !!v.es && v.es.readyState === 1; },
    };
    return vigia;
  }

  return {
    timbre, luces, motivo, giro, tic, campana,
    silenciar(si) { s.activo = !si; return s.activo; },
    habilitar,
    vigilarPropuesta,
    cerrar() { if (vigia) vigia.cerrar(); vigia = null; if (s.ctx && !contexto && typeof s.ctx.close === 'function') { try { s.ctx.close(); } catch {} } s.ctx = null; s.salida = null; s.habilitado = false; },
    get activo() { return s.activo; },
    get habilitado() { return s.habilitado; },
    get contexto() { return s.ctx; },
    get contador() { return { ...contador }; },
    get vigia() { return vigia; },
  };
}
