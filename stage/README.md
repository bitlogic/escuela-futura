# La escuela desde arriba

Vista de escenario de Escuela Futura: un plano de la escuela donde los agentes se mueven según lo que hacen de verdad. En pixel-art, con los personajes de Pixel Agents. Quien decide es quien mira la pantalla: tiene su personaje en el escritorio de Dirección (nombre por defecto **Alfredo**; lo cambia `ESCUELA_DIRECTOR` en el servidor o `?nombre=` en la URL) y habla por el chat.

## Abrir

Lo más corto, desde la raíz del repo: `./escenario` (levanta el servidor de la escuela y abre el navegador en `http://localhost:8080/stage/`). La vista arranca **en vivo**, conectada al servidor; si no hay servidor (p. ej. abierta con `python3 -m http.server 8080`), cae sola a la corrida grabada. `?grabacion=1` fuerza la grabación, `?auto=0` la deja en pausa, `?paso=23` abre en un paso puntual y `?corrida=corridas/otra.eventos.json` carga otra corrida. Las grabadas se listan en `corridas/index.json` (la `predeterminada` es la que se reproduce; el desplegable de la barra elige otra).

La vista se acomoda a la ventana: a la izquierda el **chat** del canal `#coordinacion` (una columna de ancho fijo, arrastrable por el borde o con `[` y `]`; queda guardado) y a la derecha la **escuela**, que se escala por aspecto al espacio que queda. Las letras bajan con la pantalla para que entren. Por debajo de 1000 px de ancho el chat pasa abajo. `f` pone pantalla completa.

Arriba del transcript hay una **franja del objetivo** de dos líneas (`seguimiento.js`, lógica pura con tests): lo que pidió la persona (en una línea, con elipsis) y su estado a la derecha ("Trabajando: 3 agentes", "Esperando tu decisión", "Objetivo cumplido en 1:18"), y debajo una sola línea viva con lo que pasa ahora: mientras un agente piensa, palabras que giran por rol ("Coordinación leyendo el pedido…"; son una simulación honesta de que está trabajando); cuando usa una herramienta, esa ("Bienestar · Reviso la asistencia de Biología 1"); "Esperando tu decisión" en azul; al final, "Cumplido. Quedan 3 acciones del plan". Sin pedido ofrece el primero del guion. Una pregunta a un agente ("@Advisor …") es un pedido aparte.

El transcript es **un solo stream** que se desplaza solo: todos los mensajes en orden, del mismo tamaño y sin hora, y sigue lo último que llega salvo mientras se lee una propuesta (ahí se queda en la tarjeta; si subiste a leer, un botón "↓ Nuevo" avisa). El aviso entre agentes se marca con un chip ("le avisa sin que se lo pidan") en el mensaje que corresponde. Cuando el objetivo se cumple, al final del stream queda un bloque verde con "Objetivo cumplido en…" y el plan de acción que dejó la decisión (qué, quién, pendiente/hecha; se marca a mano).

Cada mensaje se dibuja según lo que trae: la @mención inicial pasa al encabezado ("Advisor → Coordinación"), cada línea "Nombre: …" es una ficha con el nombre en rótulo y el riesgo como badge (alto, medio, bajo), y los rótulos "Traducción:", "Pendiente:" o "Borrador:" van en una etiqueta. La propuesta de Coordinación se muestra como **tarjeta de decisión**: por caso, "Lo que encontraron" (la evidencia, muda) y "Qué proponen", cada acción en su fila con quién la hace y tres botones: Aprobar, Lo hago yo, No (si la propuesta no trae una línea "Acciones:", el caso entero se aprueba, edita o rechaza), más una nota opcional; **Enviar decisión** redacta el mensaje por quien decide (`redactarDecision` en `chat.js`) y lo publica como cualquier mensaje de la persona; **Escribir a mano** lleva el foco a la caja. Mientras la propuesta espera, el chat se ensancha para que la tarjeta entre. En grabación la tarjeta se ve, pero no se puede decidir.

El chat está pensado para leerse desde el fondo: el mensaje más nuevo ocupa el espacio que necesite, completo y grande (la letra baja hasta el 62 % hasta que entre; si no entra, se desvanece y dice "sigue en el canal"), y los 4 anteriores quedan arriba, de a una línea. Los casos numerados y sus detalles se dibujan como lista. La lógica (limpieza, @menciones, listas, orden y duplicados) está en `chat.js` y se prueba con `node --test 'stage/**/*.test.js'`. Abajo muestra quién está trabajando. **Escribir:** el compositor de abajo publica en `#coordinacion` como la persona que decide (`Enter` envía, `Shift+Enter` salta de línea). Tiene una barra con **+** (los atajos del guion, en `atajos.json`: llenan la caja sin enviar, para leer y apretar Enter), un selector de destinatario (sin elegir nada se le habla a Coordinación; elegir a otro agrega la @mención) y el botón de enviar. Los agentes solo contestan a quien se @menciona: `@Coordinación …`, `@todos` para el equipo entero; sin @mención se le habla a Coordinación. Mientras hay una propuesta sin responder, la caja dice **Esperando tu decisión** (en azul, con el pedido de aprobar, editar o rechazar), en el mapa aparece el cartel azul sobre el despacho de Dirección, los rótulos de los agentes bajan de intensidad y la pantalla del escritorio de Dirección se enciende; la respuesta se ve en el chat destacada en azul.

La escuela (400×288 px lógicos, dibujada en alta resolución para que el pixel-art no se deforme): cuatro salas con varios escritorios cada una (Dirección y Coordinación, Secretaría y Admisiones, Aula de Biología 1, Bienestar y Biblioteca) y un pasillo. Los personajes son los de [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (ver `assets/personajes/CREDITOS.md`): se sientan en su escritorio, tipean cuando trabajan, caminan por las puertas hasta la sala de la herramienta que usan, y leen cuando están en ella. Sobre cada uno aparece lo que hace o dice (globos de hasta 4 líneas, máximo tres a la vez; el texto completo está en el chat) y un "…" mientras trabaja.

**El Tablero** (`tablero.html`, tecla `b`): tercera vista a pantalla completa con las tareas que dejan las decisiones (ver `docs/tablero.md`): Kanban de cuatro columnas con arrastre y Lista con selector de estado, agrupada por caso. Las tarjetas nacen al aprobar una propuesta (también las crean los agentes con `proponer_tarea`, o a mano) y viajan como eventos `tarea` por SSE y en las grabaciones; embebido, la vista madre le pasa los eventos por `postMessage`. Los agentes solo crean y pasan a En revisión; Lista la pone una persona. El bloque de cierre y el plan de acción ya no están en el chat: la franja del objetivo dice "Cumplido. 3 acciones en el Tablero" y lleva ahí.

**Escuela ↔ Organigrama:** el conmutador de arriba a la derecha (aparece al mover el mouse, como la barra; o la tecla `o`) cambia entre el plano y el organigrama de la institución (`organigrama.html`, también se abre solo en `http://localhost:8080/stage/organigrama.html`): Dirección (con el nombre de quien decide), Coordinación y los cinco agentes con su cara, área y rol. Cambiar de vista no corta la conexión. **Tema:** `t` o el botón **Claro / Oscuro** de la barra alternan entre el tema oscuro (el de siempre) y uno claro sobre papel crema; se recuerda entre aperturas y `?tema=claro|oscuro` lo fuerza al abrir. El organigrama sigue el mismo tema.

Los controles aparecen al mover el mouse: **Grabación** (`g`) reproduce la corrida grabada (con play/pausa, un paso y velocidad), **En vivo** (`v`) vuelve a conectar al servidor, **Reiniciar** (`r`) pide una sesión nueva (los agentes arrancan de cero; en grabación, vuelve al principio) y **Guardar corrida** descarga la corrida actual como `<fecha>-corrida.eventos.json`.

- **Espacio** play/pausa · **← →** un paso · **r** reinicia · **o** organigrama · **t** tema · **c** esconde o muestra el chat (la escuela ocupa todo; la pestaña del borde izquierdo lo reabre y se pone azul si hay una decisión esperando; `?chat=0` arranca sin chat) · **f** pantalla completa.
- **Arrastrar un JSON a la ventana** reproduce esa corrida (formato `*.eventos.json`).

## Modo en vivo

La vista habla con el servidor de la escuela (`servidor/`) por HTTP: `GET /api/eventos` es un stream SSE que manda `estado` al conectar, `snapshot` con la corrida hasta ese momento (se repone de golpe, sin globos) y después `eventos`, un array por frame, con la misma forma que las corridas grabadas (`t` en ms desde el inicio de la corrida, más `id` y `hora` en los mensajes). `POST /api/mensaje` publica lo que escribe la persona; `POST /api/reiniciar` arranca una sesión nueva; `GET /api/corrida` devuelve la corrida en el formato de `corridas/`. Si la conexión se corta, el navegador reintenta solo y al volver repone el snapshot.

## Cómo se mueven

| Evento | En el plano |
|---|---|
| La persona escribe en el canal | Aparece en el chat y en un globo sobre su personaje, en Dirección |
| Un agente arranca un turno | "…" sobre el personaje y "Trabajando: …" en el chat |
| Usa una herramienta de la escuela | Camina al lugar de esa herramienta (ver `herramientas.js`) |
| Le escribe a un agente | Camina hasta ese agente, con el mensaje en un globo |
| Le escribe a varios a la vez | Sale al pasillo: "reparte el trabajo" |
| Le escribe a la persona con una propuesta | Camina al despacho de Dirección; la caja de chat dice "Esperando tu decisión" |
| La persona responde | La decisión se ve en azul en el chat; se apaga la espera |
| Piensa sin mandar nada | Globo de herramienta con lo que pensó |
| Termina el turno | Vuelve a su lugar |

## Archivos

- `oficina.js` — salas, muebles, sprites, movimiento y paletas por tema (canvas 400×288 lógicos, dibujado a S× según el tamaño en pantalla).
- `organigrama.html` — el organigrama (tablero 16:9 escalado, mismos personajes y tema).
- `tablero.html` + `tablero.js` (+ `tablero.test.js`) — el Tablero y su modelo puro (tareas, subtareas, estados, permisos, los eventos que deja una decisión).
- `personajes.js` — hojas de Pixel Agents, colores de autor por tema y caras, compartidos por la escuela, el chat y el organigrama.
- `herramientas.js` — a qué sala va cada herramienta y qué dice el globo; lo usa también el servidor.
- `index.html` — la vista (layout, chat, conexión SSE, tema).
- `chat.js` + `chat.test.js` — lógica pura del chat: bloques (fichas, rótulos, casos), la propuesta como casos para la tarjeta y la redacción de la decisión.
- `seguimiento.js` + `seguimiento.test.js` — el pedido en curso como máquina de estados (enviado, repartido, propuesta, decidido, cerrado) y los pasos que dibuja la tarjeta del objetivo.
- `atajos.json` — los atajos del guion que ofrece el botón **+** del compositor.
- `agentes.json` — elenco: id, nombre, iniciales, color de marca y lugar de cada agente; nombre de la persona.
- `corridas/` — corridas normalizadas listas para reproducir.
- `assets/personajes/` — hojas de personajes de Pixel Agents (MIT / CC0). `assets/` también guarda piezas del brand kit que esta vista ya no usa.

## Grabar una corrida nueva

Corré el escenario en vivo y apretá **Guardar corrida**: pide un título y el servidor la escribe en `corridas/<fecha>-<título>.eventos.json` y la suma a `corridas/index.json`. Para que sea la que se reproduce sin servidor (plan B), poné su archivo en `predeterminada` dentro del índice. En modo grabación el mismo botón descarga el JSON de lo que se está viendo.
