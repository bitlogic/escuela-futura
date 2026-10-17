# El bus de menciones

Cómo corren los agentes sin Buzz: un servidor Node (`servidor/`) con una conversación por agente sobre la API de Anthropic y un bus que rutea mensajes por `@mención`. Es el equivalente de un workspace de agentes, reducido a lo que la demo necesita.

## Piezas

| Archivo | Qué hace |
|---|---|
| `servidor/escuela.mjs` | Entrada: lee `.env`, arma todo, abre el navegador. `./escenario` lo llama. |
| `servidor/personas.mjs` | Lee `pack/instructions.md` y `pack/agents/*.persona.md` (frontmatter con `tools:`). |
| `servidor/menciones.mjs` | `@Nombre` → id de agente o `persona:direccion`, sin tildes; `@todos`. |
| `servidor/bus.mjs` | La máquina de estados: chat, cola y estado por agente, quién espera a quién, topes. Sin I/O. |
| `servidor/agente.mjs` | Un turno contra la API: system = instrucciones + persona, herramientas de su rol + `enviar_mensaje`, bucle de tool use. |
| `servidor/http.mjs` | Sirve `stage/` y la API de abajo. Solo `127.0.0.1`. |
| `mcp-escuela/herramientas.mjs` | Las 12 herramientas sobre `data/escuela-futura.json`; el servidor las corre en proceso. `server.mjs` las expone por MCP (stdio) para Claude Code. |

## Cómo circula un mensaje

1. **Mensaje** = `{de, texto, a}`. Los destinatarios salen de las `@menciones` del texto (`@todos` = todos los agentes; `@Dirección`, `@Director`, `@Directora` = la persona). Un agente sin mención le responde a quien lo despertó; una persona sin mención le habla a Coordinación.
2. **Publicar** = agregar al chat, emitir un evento `dice` (agente) o `persona` (humano) para la vista, y **despertar** a cada agente mencionado.
3. **Despertar** = encolar. Si el agente está libre, arranca un turno tras 1,5 s juntando lo que llegue mientras tanto en un solo mensaje de usuario (`Mensajes nuevos en #coordinacion: …`). Si está en medio de un turno, lo recibe junto con los resultados de sus herramientas ("Mensajes nuevos mientras trabajabas") o, si el turno ya no llama herramientas, en el turno siguiente.
4. **Turno** = `inicio` → llamadas a la API con herramientas → `fin`. Cada herramienta de la escuela emite `herramienta` (con la sala a la que va el personaje, de `stage/herramientas.js`). Cada `enviar_mensaje` publica en el momento. El texto que el agente escribe fuera de `enviar_mensaje` no va al chat: se emite como `piensa` (un globo).

## Reglas que hacen que el guion salga siempre

- **Pendientes.** Cuando X le escribe a Y por iniciativa propia (Y no le había escrito en ese turno), el servidor anota que X espera a Y. Cuando Y le escribe a X, deja de esperarlo. **Contestar no crea expectativa:** si Tutor le responde a Coordinación, no queda "esperando" que Coordinación le conteste.
- **Esperar a que callen.** Un despertar provocado por agentes no arranca mientras alguno de los que X espera esté corriendo o por correr; arranca cuando callan (tope: 90 s; un agente que revisa a los 24 estudiantes tarda unos 60 s). Así Coordinación recibe las tres respuestas en un solo turno. Los mensajes de la persona nunca se retienen.
- **Fin sin respuesta.** Si Y termina un turno (normal, error de API, `refusal`) sin escribirle a X, X recibe "Terminaron sin responderte: Y". Se despierta solo si ya estaba por arrancar (retenido esperando a Y, o con mensajes en cola); si estaba quieto, el aviso queda para su próximo turno: un aviso solo no vale un turno. Límite conocido: si *todos* los que Coordinación mencionó fallan sin contestar, Coordinación queda quieta y hay que volver a escribirle.
- **Quién falta.** Si venció el tope de espera, el mensaje de X dice "Todavía no respondieron: …". Los prompts dicen que entonces no cierre el tema.
- **Topes.** Cada mensaje lleva un `salto` (persona 0; agente = el máximo de lo que lo despertó + 1); más de 5 se publica pero no despierta. Turnos por corrida: Coordinación 10, el resto 6. 40 mensajes de agentes por corrida. La persona siempre despierta a quien menciona. El `tool_result` de `enviar_mensaje` dice la verdad ("Enviado a Tutor", "no va a responder: límite de la corrida", `is_error` con los nombres válidos si la mención no existe).
- **Texto sin mensaje.** Si un turno termina en texto, le pidieron algo y no espera a nadie, se le dice una vez "No mandaste ningún mensaje. Si eso era una respuesta, mandala con enviar_mensaje". Si sigue sin mandar, `piensa`: una nota corta (hasta 80 caracteres, "Espero a Advisor.") se muestra tal cual; una larga se reemplaza por "Sin novedades." para no proyectar razonamiento interno.
- **Menciones de la persona.** Si Dirección menciona a alguien que no existe (`@Pepe`), el mensaje no se manda: el servidor devuelve 400 con la lista de nombres válidos y la vista lo avisa sin borrar el texto.
- **Reiniciar.** Sesión nueva: se borran conversaciones, chat y eventos; lo que estaba en vuelo se descarta. Es el botón **Reiniciar** de la vista (`POST /api/reiniciar`).

Parámetros: `ESCUELA_MODEL` (`claude-opus-5-5`), `ESCUELA_EFFORT` (`medium`; `low` si hace falta velocidad), `max_tokens` 8000, sin `temperature`, `cache_control` en el system, reintento en otro modelo si un turno cae en `refusal` (`ESCUELA_SIN_FALLBACK=1` lo apaga). Hasta 4 llamadas a la API a la vez.

## API para la vista

- `GET /` → `/stage/`. `GET /stage/*` estáticos.
- `GET /api/eventos` (SSE): `event: estado` `{vivo, modelo, persona}`; `event: snapshot` `{eventos}` (toda la corrida); luego `event: eventos` con un **array** por frame; `event: reinicio`. Cada evento tiene la forma de `stage/corridas/*.eventos.json` (`t` en ms desde el inicio de la corrida) más `hora` e `id` en `dice`/`persona`.
- `POST /api/mensaje` `{"texto"}` → `{ok, a, invalidas}`.
- `POST /api/reiniciar` · `GET /api/corrida` (para guardar y reproducir) · `GET /api/estado`.

## Tests

`npm test` corre `servidor/*.test.mjs` (bus con turnos guionados y reloj manual, corredor con cliente falso, pack, HTTP con SSE real) y `stage/*.test.js`.
