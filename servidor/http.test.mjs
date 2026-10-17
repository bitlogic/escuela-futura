// Prueba de humo del HTTP: SSE con snapshot y frames, POST de mensaje, reinicio, estáticos de stage/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { crearBus } from './bus.mjs';
import { crearResolutor } from './menciones.mjs';
import { crearHttp } from './http.mjs';

const AGENTES = [{ id: 'coordinacion', nombre: 'Coordinación' }];
const PERSONA = { id: 'persona:direccion', nombre: 'Dirección' };

test('la vista puede conectarse, escribir y reiniciar', async () => {
  const correrTurno = async (id, lote, ctx) => { ctx.enviar('@Dirección recibido'); };
  const bus = crearBus({ agentes: AGENTES, persona: PERSONA, resolver: crearResolutor({ agentes: AGENTES, persona: PERSONA }), correrTurno, limites: { espera: 10 } });
  const http = crearHttp({ bus, reiniciar: () => bus.reiniciar(), info: { modelo: 'm', persona: 'Dirección' } });
  const puerto = await http.escuchar(0);
  const base = `http://localhost:${puerto}`;
  try {
    const sse = await fetch(base + '/api/eventos');
    assert.equal(sse.headers.get('content-type'), 'text/event-stream');
    const lector = sse.body.getReader(); const dec = new TextDecoder(); let buf = '';
    const leer = async (hasta) => { while (!buf.includes(hasta)) { const { value, done } = await lector.read(); if (done) throw new Error('cerrado'); buf += dec.decode(value); } };
    await leer('event: snapshot');
    assert.match(buf, /event: estado\ndata: \{"vivo":true,"modelo":"m","persona":"Dirección"\}/);

    const JSON_ = { 'Content-Type': 'application/json' };
    assert.equal((await fetch(base + '/api/mensaje', { method: 'POST', body: JSON.stringify({ texto: 'hola' }) })).status, 403, 'sin Content-Type JSON no pasa (CSRF)');
    assert.equal((await fetch(base + '/api/mensaje', { method: 'POST', headers: { ...JSON_, Origin: 'http://evil.example' }, body: '{"texto":"x"}' })).status, 403, 'Origin ajeno no pasa');
    const r = await (await fetch(base + '/api/mensaje', { method: 'POST', headers: { ...JSON_, Origin: base }, body: JSON.stringify({ texto: 'hola' }) })).json();
    assert.deepEqual(r, { ok: true, a: ['coordinacion'], invalidas: [] });
    await leer('"tipo":"fin"');
    const frames = [...buf.matchAll(/event: eventos\ndata: (.*)\n/g)].map((m) => JSON.parse(m[1]));
    const tipos = frames.flat().map((e) => e.tipo);
    assert.deepEqual(tipos, ['persona', 'inicio', 'dice', 'fin']);
    assert.equal(frames.flat()[2].a[0], 'persona:direccion');

    assert.equal((await fetch(base + '/api/mensaje', { method: 'POST', headers: JSON_, body: '{}' })).status, 400);
    assert.deepEqual(await (await fetch(base + '/api/reiniciar', { method: 'POST', headers: JSON_ })).json(), { ok: true });
    await leer('event: reinicio');
    assert.deepEqual((await (await fetch(base + '/api/corrida')).json()).eventos, []);

    assert.equal((await fetch(base + '/')).redirected, true);
    assert.equal((await fetch(base + '/stage/agentes.json')).headers.get('content-type'), 'application/json; charset=utf-8');
    assert.equal((await fetch(base + '/stage/')).headers.get('content-type'), 'text/html; charset=utf-8', '/stage/ sirve index.html');
    assert.equal((await fetch(base + '/stage/.env')).status, 404);
    assert.equal((await fetch(base + '/stage/../package.json')).status, 404);
    // fetch no deja cambiar Host; con node:http sí
    const codigo = await new Promise((ok) => request({ host: '127.0.0.1', port: puerto, path: '/api/estado', headers: { Host: 'evil.example' } }, (r) => { r.resume(); ok(r.statusCode); }).end());
    assert.equal(codigo, 403);
    await lector.cancel().catch(() => {});
  } finally { http.cerrar(); }
});
