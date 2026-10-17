// HTTP del servidor de la demo: sirve stage/ y expone la API que usa la vista (ver docs/bus.md).
// Escucha solo en 127.0.0.1 y rechaza Host que no sea local.

import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGE = join(dirname(fileURLToPath(import.meta.url)), '..', 'stage');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml' };

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const leerJson = (req) => new Promise((ok, no) => { let s = ''; req.on('data', (d) => { s += d; if (s.length > 1e6) req.destroy(); }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { no(e); } }); req.on('error', no); });

/**
 * @param {object} o
 * @param {object} o.bus        de bus.mjs
 * @param {Function} o.reiniciar  reinicia bus + conversaciones
 * @param {object} o.info       {modelo, persona}
 */
export function crearHttp({ bus, reiniciar, info, log = () => {}, corridasDir = join(STAGE, 'corridas') }) {
  const clientes = new Set();
  const leerIndice = () => { try { return JSON.parse(readFileSync(join(corridasDir, 'index.json'), 'utf8')); } catch { return { predeterminada: null, corridas: [] }; } };
  bus.suscribir((frame) => { const d = `event: eventos\ndata: ${JSON.stringify(frame)}\n\n`; for (const c of clientes) c.write(d); });
  const latido = setInterval(() => { for (const c of clientes) c.write(': ping\n\n'); }, 15000);
  latido.unref();

  const server = createServer(async (req, res) => {
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]') { res.writeHead(403); return res.end('Solo local.'); }
    const url = new URL(req.url, 'http://localhost');
    const ruta = url.pathname;
    // Los POST cambian estado (y gastan API): solo desde la propia vista, nunca desde otra página abierta en el navegador.
    if (req.method === 'POST') {
      const origen = req.headers.origin;
      const esJson = /^application\/json\b/i.test(req.headers['content-type'] || '');
      if (!esJson || (origen && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origen))) { res.writeHead(403); return res.end('Solo desde la vista.'); }
    }
    try {
      if (ruta === '/') { res.writeHead(302, { Location: '/stage/' }); return res.end(); }
      if (ruta === '/api/eventos' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.write(`event: estado\ndata: ${JSON.stringify({ vivo: true, ...info })}\n\n`);
        res.write(`event: snapshot\ndata: ${JSON.stringify(bus.snapshot())}\n\n`);
        clientes.add(res); req.on('close', () => clientes.delete(res));
        return;
      }
      if (ruta === '/api/mensaje' && req.method === 'POST') {
        const { texto } = await leerJson(req);
        const t = String(texto || '').trim();
        if (!t) return json(res, 400, { error: 'Mensaje vacío.' });
        const r = bus.mensajePersona(t);
        if (r.invalidas.length) return json(res, 400, { error: `No hay nadie que se llame @${r.invalidas.join(', @')}. Podés hablarle a: ${r.nombres.filter((n) => n !== 'todos').join(', ')} o @todos.`, invalidas: r.invalidas });
        return json(res, 200, { ok: true, a: r.a });
      }
      if (ruta === '/api/reiniciar' && req.method === 'POST') {
        reiniciar();
        for (const c of clientes) c.write('event: reinicio\ndata: {}\n\n');
        log('reinicio');
        return json(res, 200, { ok: true });
      }
      if (ruta === '/api/estado' && req.method === 'GET') return json(res, 200, { vivo: true, ...info, ...bus.estado() });
      if (ruta === '/api/corrida' && req.method === 'GET') return json(res, 200, bus.corrida());
      // Corridas grabadas: el índice (stage/corridas/index.json) y guardar la actual con un título
      if (ruta === '/api/corridas' && req.method === 'GET') return json(res, 200, leerIndice());
      if (ruta === '/api/corridas' && req.method === 'POST') {
        const { titulo } = await leerJson(req);
        const t = String(titulo || '').trim().slice(0, 80);
        if (!t) return json(res, 400, { error: 'Falta el título.' });
        const corrida = bus.corrida();
        if (!corrida.eventos.length) return json(res, 400, { error: 'Todavía no pasó nada que guardar.' });
        const d = new Date(), dd = (n) => String(n).padStart(2, '0'), fecha = `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
        const slug = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'corrida';
        let archivo = `${fecha}-${slug}.eventos.json`;
        for (let n = 2; existsSync(join(corridasDir, archivo)); n++) archivo = `${fecha}-${slug}-${n}.eventos.json`;
        const t0 = corrida.eventos[0].t;
        writeFileSync(join(corridasDir, archivo), JSON.stringify({ ...corrida, titulo: t, eventos: corrida.eventos.map((e) => ({ ...e, t: e.t - t0 })) }, null, 1));
        const idx = leerIndice(); idx.corridas.unshift({ archivo, titulo: t, fecha }); if (!idx.predeterminada) idx.predeterminada = archivo;
        writeFileSync(join(corridasDir, 'index.json'), JSON.stringify(idx, null, 2) + '\n');
        log('corrida guardada', archivo);
        return json(res, 200, { ok: true, archivo });
      }
      if (ruta.startsWith('/stage/') && req.method === 'GET') {
        const rel = normalize(decodeURIComponent(ruta.slice('/stage/'.length))).replace(/^(\.\.[/\\])+/, '').replace(/^\.$/, '');
        if (rel.split(/[/\\]/).some((p) => p.startsWith('.'))) { res.writeHead(404); return res.end(); }
        let f = join(STAGE, rel || 'index.html');
        if (!f.startsWith(STAGE)) { res.writeHead(404); return res.end(); }
        let st; try { st = statSync(f); if (st.isDirectory()) { f = join(f, 'index.html'); st = statSync(f); } } catch { res.writeHead(404); return res.end('No está.'); }
        res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
        return createReadStream(f).pipe(res);
      }
      res.writeHead(404); res.end('No está.');
    } catch (e) { log('http', e.message); json(res, 500, { error: e.message }); }
  });
  return {
    server,
    escuchar: (puerto) => new Promise((ok, no) => { server.on('error', no); server.listen(puerto, '127.0.0.1', () => ok(server.address().port)); }),
    cerrar: () => { clearInterval(latido); for (const c of clientes) c.end(); clientes.clear(); server.closeAllConnections(); server.close(); },
  };
}
