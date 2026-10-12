# La escuela desde arriba

Vista de escenario de Escuela Futura: un plano de la escuela donde los agentes se mueven según lo que hacen de verdad en Buzz. Sigue el DESIGN.md del brand kit de Bitlogic (papel crema, tinta negra, lavados como superficies, Apple Garamond para la única frase grande, Plain para todo lo demás).

## Abrir

Necesita un servidor local (el navegador no deja cargar módulos ni JSON desde `file://`). Desde la raíz del repo:

```bash
python3 -m http.server 8080
```

y abrí <http://localhost:8080/stage/>. Carga sola la corrida real del 12/10.

- **Espacio** play/pausa · **← →** un paso · **r** reinicia · **f** pantalla completa.
- `?paso=23` abre en un paso puntual; `?corrida=corridas/otra.eventos.json` carga otra corrida.
- **Cargar**: acepta tanto una corrida normalizada (`*.eventos.json`) como un export crudo de `buzz-probe`.
- **En vivo**: se conecta al relay y mueve a los agentes con lo que pasa en Buzz. Pide tu `nsec` (es la dueña de los agentes y la única que puede descifrar su actividad) y el id del canal.

## Cómo se mueven

| Evento en Buzz | En el plano |
|---|---|
| Una persona escribe en el canal | Globo en Dirección; "le da un objetivo a…" |
| Un agente arranca un turno | Anillo punteado girando |
| Usa una herramienta de la escuela | Camina al lugar de esa herramienta (ver `normalizar.js`) |
| Le escribe a un agente | Camina hasta ese agente, con el mensaje en un globo |
| Le escribe a varios a la vez | Sale al pasillo: "reparte el trabajo" |
| Le escribe a una persona con una propuesta | Camina a Dirección; la persona queda con un anillo naranja: "tiene que decidir" |
| La persona responde | Se apaga el anillo: "decide" |
| Termina el turno | Vuelve a su lugar |

## Archivos

- `index.html` — la vista (sin dependencias; `nostr-tools` solo se carga en modo en vivo).
- `normalizar.js` — traduce mensajes (kind 9) y telemetría descifrada (kind 24200) a la línea de tiempo. Lo usa la vista y `scripts/normalizar-corrida.mjs`.
- `agentes.json` — elenco: id, nombre, iniciales, color de marca y lugar de cada agente.
- `corridas/` — corridas normalizadas listas para reproducir.
- `assets/` — fuentes y piezas del brand kit (copiadas de `github/brand-kit`).

## Grabar una corrida nueva

1. Abrí `innova-educa-2026/buzz-probe/index.html`, conectá y corré el escenario en Buzz.
2. Exportá el JSON a `docs/corridas/<fecha>-<nombre>.json`.
3. `node scripts/normalizar-corrida.mjs docs/corridas/<archivo>.json --canal <id del canal> --desde <epoch del primer mensaje>`
4. Si el probe no guardó los mensajes de las personas, agregalos en `<archivo>.extra.json` (ver el ejemplo del 12/10).
