# El bus de menciones

Cómo corren los agentes sin Buzz: un servidor Node (`servidor/`) con una conversación por agente sobre la API de Anthropic y un bus que rutea mensajes por `@mención`. Es el equivalente de un workspace de agentes, reducido a lo que la demo necesita.

## Piezas

| Archivo | Qué hace |
|---|---|
| `servidor/escuela.mjs` | Entrada: lee `.env`, arma todo, abre el navegador. `./escenario` lo llama. |
| `servidor/personas.mjs` | Lee `pack/instructions.md` y `pack/agents/*.persona.md` (frontmatter con `tools:`). |
| `servidor/menciones.mjs` | `@Nombre` → id de agente o `persona:direccion`, sin tildes; `@todos`. |
| `servidor/bus.mjs` | La máquina de estados: chat, cola y estado por agente, quién espera a quién, topes. Sin I/O. |
| `servidor/agente.mjs` | Un turno contra la API: system = instrucciones + persona, herramientas de su rol + `enviar_mensaje`, bucle de tool use. Pasa cada mensaje por el verificador. |
| `servidor/verificador.mjs` | El verificador de datos: cifras y fechas de cada mensaje contra los `tool_result` del agente y lo que le dijeron otros. Texto contra texto, sin modelo. |
| `servidor/http.mjs` | Sirve `stage/` y la API de abajo. Solo `127.0.0.1`. |
| `mcp-escuela/herramientas.mjs` | Las 12 herramientas sobre `data/escuela-futura.json`; el servidor las corre en proceso. `server.mjs` las expone por MCP (stdio) para Claude Code. |

## Cómo circula un mensaje

1. **Mensaje** = `{de, texto, a}`. Los destinatarios salen de las `@menciones` del texto (`@todos` = todos los agentes; `@Dirección`, `@Director`, `@Directora` = la persona). Un agente sin mención le responde a quien lo despertó; una persona sin mención le habla a Coordinación.
2. **Publicar** = agregar al chat, emitir un evento `dice` (agente) o `persona` (humano) para la vista, y **despertar** a cada agente mencionado.
3. **Despertar** = encolar. Si el agente está libre, arranca un turno tras 1,5 s juntando lo que llegue mientras tanto en un solo mensaje de usuario (`Mensajes nuevos en #coordinacion: …`). Si está en medio de un turno, lo recibe junto con los resultados de sus herramientas ("Mensajes nuevos mientras trabajabas") o, si el turno ya no llama herramientas, en el turno siguiente.
4. **Turno** = `inicio` → llamadas a la API con herramientas → `fin`. Cada herramienta de la escuela emite `herramienta` (con la sala a la que va el personaje, de `stage/herramientas.js`). Cada `enviar_mensaje` publica en el momento. El texto que el agente escribe fuera de `enviar_mensaje` no va al chat: se emite como `piensa` (un globo).
5. **Verificar** = antes de publicar, el corredor cruza cada cifra y fecha del mensaje con sus fuentes (abajo) y el resultado viaja dentro del evento `dice` como `verificacion` (y en el mensaje que reciben los destinatarios, así la duda se hereda).

## El verificador de datos

Que valide alguien que no sea el modelo: `servidor/verificador.mjs` es código, no otro Claude. Para cada agente guarda dos fuentes: las **propias** (el texto de cada `tool_result` que recibió en la corrida, parseado: números, fechas ISO como `d/m`, fechas y números dentro de textos, largos de listas y los pares "N de M" entre campos hermanos donde M es un total: `presentes/clases`, `ejercicios_resueltos/ejercicios_totales`, `inscriptos/cupo`) y las **ajenas** (los mensajes que le mandaron otros agentes y la persona, con la verificación que traían). Cuando el agente manda un mensaje, `datosDe` saca sus datos (fechas `d/m`, pares `N de M`, números; ignora la numeración de listas, las @menciones y los nombres con número como "Parcial 2" o "Biología 1") y cada uno queda en un estado:

| Estado | Qué significa | En pantalla |
|---|---|---|
| `verificado` | está en un `tool_result` propio, o lo citó de alguien que lo tenía verificado | tilde |
| `citado` | está en un mensaje de otro agente o de la persona | tilde |
| `derivado` | es un cálculo del agente: lleva unidad ("ocho días", "8 días") o es un resto ("los otros 23", "en 3 cuotas") | nada (no se comprueba ni se penaliza) |
| `no_comprobado` | "N de M" cuyos números existen pero no como par: el cruce es del agente ("3 de 14" cuando son 3 ejercicios de 10 y 14 consultas) | lavado y "?" |
| `sin_fuente` | no aparece en ninguna fuente | lavado y "?" |

El evento `dice` lleva `verificacion: { datos: [{ texto, clave, estado }], resumen: { verificados, citados, derivados, noComprobados, sinFuente } }`. La vista pone un chip en el encabezado del mensaje ("✓ 4 datos", o "✓ 4 datos · 1 sin comprobar") y subraya cada cifra en el texto; el panel de decisión muestra el chip en la cabecera. El E2E tiene el chequeo `datos_con_fuente` (ninguna cifra sin comprobar) y el transcript marca cada mensaje con `[datos: N con fuente; sin comprobar: …]`. Como la verificación se hereda al citar, si Tutor dice "3 de 14" y Coordinación lo copia en la propuesta, la duda llega al panel. El prompt de los agentes **no** es fuente: los ejemplos del prompt traen cifras de Martina, y copiarlas no sería tener el dato.

Para que las cifras que los agentes van a decir existan tal cual en la fuente, los datos traen los agregados hechos: la asistencia de Martina tiene `resumen.desde_cambio = { desde: 2026-08-18, presentes: 5, clases: 22 }` (lo genera `scripts/generar_datos.py`), así "5 de 22 clases desde el 18/8" se comprueba como par y no como suma del modelo.

## Reglas que hacen que el guion salga siempre

- **Pendientes.** Cuando X le escribe a Y por iniciativa propia (Y no le había escrito en ese turno), el servidor anota que X espera a Y. Cuando Y le escribe a X, deja de esperarlo. **Contestar no crea expectativa:** si Tutor le responde a Coordinación, no queda "esperando" que Coordinación le conteste.
- **Esperar a que callen.** Un despertar provocado por agentes no arranca mientras alguno de los que X espera esté corriendo o por correr, **ni mientras alguno de los que X mandó a trabajar en su último turno siga activo**, aunque ya le haya contestado: puede estar ajustando por un aviso de otro (Advisor le avisa a Bienestar; Bienestar vuelve a trabajar y manda "Con lo de Advisor, cambio"). Arranca cuando callan (tope: 90 s). Así Coordinación recibe las tres respuestas y los ajustes en un solo turno. Los mensajes de la persona nunca se retienen.
- **El equipo crece.** Si un delegado de X despierta a alguien que no estaba en el equipo (Advisor ve la beca rechazada y le pregunta a Admisiones qué dijo Martina al ingresar), ese alguien entra al equipo de X: Coordinación también espera a Admisiones, y su respuesta (que va directo a Coordinación, por prompt) llega en el mismo turno que las otras. Es la regla que hace que una cuarta disciplina entre a la propuesta sin que nadie la convoque de antemano.
- **Fin sin respuesta.** Si Y termina un turno (normal, error de API, `refusal`) sin escribirle a X, X recibe "Terminaron sin responderte: Y". Se despierta solo si ya estaba por arrancar (retenido esperando a Y, o con mensajes en cola); si estaba quieto, el aviso queda para su próximo turno: un aviso solo no vale un turno. Límite conocido: si *todos* los que Coordinación mencionó fallan sin contestar, Coordinación queda quieta y hay que volver a escribirle.
- **Quién falta.** Si venció el tope de espera, el mensaje de X dice "Todavía no respondieron: …". Los prompts dicen que entonces no cierre el tema.
- **Topes.** Cada mensaje lleva un `salto` (persona 0; agente = el máximo de lo que lo despertó + 1); más de 5 se publica pero no despierta. Turnos por corrida: Coordinación 10, el resto 6. 40 mensajes de agentes por corrida. La persona siempre despierta a quien menciona. El `tool_result` de `enviar_mensaje` dice la verdad ("Enviado a Tutor", "no va a responder: límite de la corrida", `is_error` con los nombres válidos si la mención no existe).
- **Texto sin mensaje.** Si un turno termina en texto, le pidieron algo y no espera a nadie, se le dice una vez "No mandaste ningún mensaje. Si eso era una respuesta, mandala con enviar_mensaje". Si sigue sin mandar, `piensa`: una nota corta (hasta 80 caracteres, "Espero a Advisor.") se muestra tal cual; una larga se reemplaza por "Sin novedades." para no proyectar razonamiento interno.
- **Menciones de la persona.** Si Dirección menciona a alguien que no existe (`@Pepe`), el mensaje no se manda: el servidor devuelve 400 con la lista de nombres válidos y la vista lo avisa sin borrar el texto.
- **Encargos del Tablero.** Cuando la persona asigna una acción del Tablero a un agente (`POST /api/tablero` con `agente`), el servidor publica un mensaje de la persona ("@Tutor te asigné en el Tablero: …") por el camino normal: despierta al agente como cualquier mensaje humano y queda en el chat y en la grabación.
- **Reiniciar.** Sesión nueva: se borran conversaciones, chat y eventos; lo que estaba en vuelo se descarta. Es el botón **Reiniciar** de la vista (`POST /api/reiniciar`).

Parámetros: `ESCUELA_MODEL` (`claude-sonnet-5-5` desde el 19/10; `claude-opus-5-5` como alternativa), `ESCUELA_EFFORT` (`medium`; `low` si hace falta velocidad), `max_tokens` 8000, sin `temperature`, `cache_control` en el system, reintento en otro modelo si un turno cae en `refusal` (`ESCUELA_SIN_FALLBACK=1` lo apaga). Hasta 4 llamadas a la API a la vez.

## API para la vista

- `GET /` → `/stage/`. `GET /stage/*` estáticos.
- `GET /api/eventos` (SSE): `event: estado` `{vivo, modelo, persona}`; `event: snapshot` `{eventos}` (toda la corrida); luego `event: eventos` con un **array** por frame; `event: reinicio`. Cada evento tiene la forma de `stage/corridas/*.eventos.json` (`t` en ms desde el inicio de la corrida) más `hora` e `id` en `dice`/`persona`, y, en `dice`, `verificacion` (el verificador) y `marca` (`'limite'` cuando el agente dice que no, `'no_se'` cuando dice lo que no sabe; la detecta `marcaDe` en `stage/chat.js`, compartida con la vista, que la calcula sola si una grabación vieja no la trae). Las grabaciones anteriores al 19/10 no traen ninguna de las dos y la vista lo tolera.
- `POST /api/mensaje` `{"texto", "decision"?}` → `{ok, a, invalidas}`. `decision` es la de la tarjeta, estructurada (`{acciones: [{texto, quien, estado: si|yo|no}], nota}`, saneada en el servidor): va dentro del evento `persona` y queda en la grabación, así el seguimiento de la vista no la adivina del texto.
- `POST /api/reiniciar` · `GET /api/corrida` (la corrida actual) · `GET /api/estado` · `GET /api/agentes` (la ficha de cada agente: rol, prompt, herramientas con descripción y sala; solo lectura, para `stage/agente.html`).
- `GET /api/corridas` → `stage/corridas/index.json` (`{predeterminada, corridas: [{archivo, titulo, fecha}]}`). `POST /api/corridas` `{"titulo"}` guarda la corrida actual en `stage/corridas/<fecha>-<slug>.eventos.json` (con `t` desde 0) y la suma al índice; la predeterminada se cambia a mano en el índice.

## Tests

`npm test` corre `servidor/*.test.mjs` (bus con turnos guionados y reloj manual, corredor con cliente falso, verificador, pack, HTTP con SSE real) y `stage/*.test.js`.
