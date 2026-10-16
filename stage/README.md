# La escuela desde arriba

Vista de escenario de Escuela Futura: un plano de la escuela donde los agentes se mueven según lo que hacen de verdad en Buzz. En pixel-art, con los personajes de Pixel Agents.

## Abrir

Lo más corto, desde la raíz del repo: `./escenario` (levanta el servidor y abre el navegador; `--puerto N`, `--sin-navegador`). Arranca conectada en vivo al canal (ver abajo). Si no hay clave o no hay red, cae sola a la corrida grabada; `?grabacion=1` fuerza la grabación y `?auto=0` la deja en pausa.

La vista es un escenario 16:9 (1920×1080, se escala para llenar la pantalla; tecla `f` para pantalla completa). A la izquierda, un **chat** del canal `#coordinacion` pensado para leerse desde el fondo: el mensaje más nuevo ocupa el espacio que necesite, completo y grande (la letra baja de 34 a 21 px hasta que entre; si no entra, se desvanece y dice "sigue en el canal"), y los 4 anteriores quedan arriba, de a una línea. Los casos numerados y sus detalles se dibujan como lista. Al conectar trae los últimos 30 mensajes, ordenados por hora y sin repetidos, y abajo muestra quién está trabajando. La lógica (limpieza, @menciones, listas, orden y duplicados) está en `chat.js` y se prueba con `node --test stage/`; a la derecha, la escuela desde arriba en pixel-art (320×288 px lógicos, ×3,75; el lienzo se dibuja en alta resolución para que el pixel-art no se deforme): cuatro salas con varios escritorios cada una (Dirección y Coordinación, Secretaría y Admisiones, Aula de Biología 1, Bienestar, Academia y Biblioteca) y un pasillo. Los personajes son los de [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (ver `assets/personajes/CREDITOS.md`): se sientan en su escritorio, tipean cuando trabajan, caminan por las puertas hasta la sala de la herramienta que usan, y leen cuando están en ella. Sobre cada uno aparece lo que hace o dice (globos de hasta 4 líneas, máximo tres a la vez; el texto completo está en el chat) y un "…" mientras trabaja; la persona de Dirección muestra un "!" naranja cuando tiene que decidir.

Está conectada de forma fija a la comunidad `escuelafutura` y al canal `#coordinacion` (constantes `RELAY` y `CANAL` en `index.html`). **La clave se lee de `stage/conexion.local.js`** (`export const NSEC = 'nsec1…'`), que está en `.gitignore` y no se sube al repo; con ese archivo la vista se conecta sola al abrir. Sin él arranca con la corrida grabada y **En vivo** (o `v`) pide el `nsec`. **Organigrama:** la tecla `o` (o el botón **Organigrama**) abre encima de la vista un organigrama de la institución (`organigrama.html`, también se abre solo en `http://localhost:8080/stage/organigrama.html`): Dirección, Coordinación, los cinco agentes con su cara, herramientas y las personas con las que trabajan. `Esc` o `o` vuelven, sin cortar la conexión en vivo. Las caras son las mismas de la escuela y se usan también como avatar en el chat; salen de `personajes.js`. **Escribir:** la caja de abajo del chat publica en `#coordinacion` como la persona (`Enter` envía, `Shift+Enter` salta de línea; la caja crece para mostrar todo el texto). Los agentes solo contestan a quien se @menciona: `@Coordinación …`, `@todos` para el equipo entero, y si no hay ninguna @mención se le habla a Coordinación. **Ancho del chat:** se arrastra el borde derecho o con `[` y `]` (queda guardado). Los controles aparecen al mover el mouse; **Grabación** (o `g`) reproduce la corrida grabada.

A mano, con el servidor de Python:

Necesita un servidor local (el navegador no deja cargar módulos ni JSON desde `file://`). Desde la raíz del repo:

```bash
python3 -m http.server 8080
```

y abrí <http://localhost:8080/stage/>. Carga sola la corrida real del 12/10.

- **Espacio** play/pausa · **← →** un paso · **r** reinicia · **f** pantalla completa.
- `?paso=23` abre en un paso puntual; `?corrida=corridas/otra.eventos.json` carga otra corrida.
- **Arrastrar un JSON a la ventana**: acepta tanto una corrida normalizada (`*.eventos.json`) como un export crudo de `buzz-probe`.
- **En vivo**: se conecta al relay y mueve a los agentes con lo que pasa en Buzz. Usa el `nsec` de `conexion.local.js` (la dueña de los agentes, la única que puede descifrar su actividad); relay y canal están fijos. Si se corta, reintenta cada 3 s; si nunca pudo conectar, reproduce la grabación. Necesita internet: `nostr-tools` se baja de jsDelivr.

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

- `oficina.js` — salas, muebles, sprites y movimiento (canvas 320×288 lógicos, dibujado a S× según el tamaño en pantalla).
- `organigrama.html` — el organigrama (misma escala 16:9 y mismos personajes).
- `personajes.js` — hojas de Pixel Agents, colores y caras, compartidos por la escuela, el chat y el organigrama.
- `index.html` — la vista (escenario 16:9, chat y lógica de conexión; `nostr-tools` solo se carga en modo en vivo).
- `normalizar.js` — traduce mensajes (kind 9) y telemetría descifrada (kind 24200) a la línea de tiempo. Lo usa la vista y `scripts/normalizar-corrida.mjs`.
- `agentes.json` — elenco: id, nombre, iniciales, color de marca y lugar de cada agente.
- `corridas/` — corridas normalizadas listas para reproducir.
- `assets/personajes/` — hojas de personajes de Pixel Agents (MIT / CC0). `assets/` también guarda piezas del brand kit que esta vista ya no usa.

## Grabar una corrida nueva

1. Abrí `innova-educa-2026/buzz-probe/index.html`, conectá y corré el escenario en Buzz.
2. Exportá el JSON a `docs/corridas/<fecha>-<nombre>.json`.
3. `node scripts/normalizar-corrida.mjs docs/corridas/<archivo>.json --canal <id del canal> --desde <epoch del primer mensaje>`
4. Si el probe no guardó los mensajes de las personas, agregalos en `<archivo>.extra.json` (ver el ejemplo del 12/10).
