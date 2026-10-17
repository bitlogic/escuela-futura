# Escuela Futura

Demo en vivo para la charla **"Escuela Agéntica"** (Innova Educa 21, Universidad Siglo 21, Córdoba, 5/11/2026), que dan Alfre (Bitlogic) y Greyla Alvarez. Tesis de la charla: *no se puede formar personas para trabajar con agentes desde una institución que no trabaja con agentes*. La demo muestra una escuela ficticia donde seis agentes trabajan junto a personas, y una persona decide: el director o directora de la escuela es quien mira la pantalla y escribe en el chat. En el mapa tiene su personaje en el escritorio de Dirección; su nombre se configura (`ESCUELA_DIRECTOR` en `.env`, o `?nombre=` en la vista; por defecto "Alfredo") y los agentes la mencionan como `@Dirección`.

Todo es ficticio: la escuela, los estudiantes y los datos. Idioma del proyecto: español rioplatense.

## Cómo funciona

- **Un solo proceso:** `./escenario` (= `node servidor/escuela.mjs`) levanta los agentes y sirve la vista en `http://localhost:8080/stage/`. Necesita `ANTHROPIC_API_KEY` en `.env` (fuera de git; ver `.env.example`). Antes (hasta el commit `34f3b0a`) los agentes corrían en Buzz sobre un relay Nostr; se reemplazó por un servidor propio para sacar esa dependencia.
- **`servidor/`** es el bus de menciones: una conversación por agente sobre la API de Anthropic (`@anthropic-ai/sdk`, única dependencia); los mensajes despiertan a quien `@mencionan`; los agentes hablan solo con la herramienta `enviar_mensaje`. Las reglas (quién espera a quién, retención hasta que callen, avisos de "falta X", topes de saltos/turnos/mensajes) están en **`docs/bus.md`**, junto con la API SSE/HTTP que consume la vista. Modelo por `ESCUELA_MODEL` (default `claude-opus-5-5`), `ESCUELA_EFFORT` (`medium`).
- **`pack/`** es la fuente de verdad de los agentes: `agents/*.persona.md` (frontmatter con `name`, `display_name`, `description`, `tools`; el cuerpo es el prompt) e `instructions.md` (reglas del equipo, incluida la sección "Cómo hablar"). El servidor los lee al arrancar: cambiar un prompt = reiniciar el servidor.
- **`mcp-escuela/herramientas.mjs`** tiene las 12 herramientas (`buscar_estudiantes`, `ver_asistencia`, `ver_notas`, `ver_situacion_administrativa`, …) sobre `data/escuela-futura.json` (24 estudiantes sintéticos, uno en riesgo: Martina; se regenera con `scripts/generar_datos.py`). Las 7 consultas por estudiante aceptan `estudiante`, `estudiantes` (lista) o `curso` (todo el curso) para que un agente haga una llamada y no 24; el globo lo resume `textoHerramienta` en `stage/herramientas.js`. El servidor las corre en proceso. `mcp-escuela/server.mjs` las expone por MCP stdio para Claude Code (`claude mcp add --scope user escuela-futura -- node <ruta>/mcp-escuela/server.mjs`).
- **`stage/`** es la vista: escuela en pixel-art desde arriba (personajes de Pixel Agents, `oficina.js`), chat del equipo, organigrama (`organigrama.html`), tema claro/oscuro. Se conecta al servidor por SSE; sin servidor reproduce la corrida grabada (`stage/corridas/*.eventos.json`). `stage/herramientas.js` dice a qué sala va cada herramienta; lo usan la vista y el servidor. Ver `stage/README.md`.
- **El Tablero** (`stage/tablero.html`, tecla `b`; modelo puro en `stage/tablero.js`, servidor en `servidor/tablero.mjs`): las tareas que dejan las decisiones, con Kanban y Lista. Los agentes crean (`proponer_tarea`) y pasan a revisión (`revisar_tarea`); solo una persona cierra. Viaja como eventos `tarea` por el bus. Ver `docs/tablero.md`.
- **`e2e/`** corre el guion solo contra el servidor real (`npm run e2e`), saca capturas con Playwright, puntúa con chequeos deterministas y con un juez Claude, y deja todo en `evaluaciones/` (ver `docs/e2e.md`). `--corrida` evalúa una grabación sin agentes.
- **`docs/guion.md`** es el guion de la demo en vivo (actos, tiempos, momentos WOW, plan B); **`docs/escenario.md`** tiene los datos del caso (la demo sigue un solo hilo, Martina R.; los otros 23 estudiantes vienen bien) y la lista de control de los ensayos.

## Hallazgos que conviene no redescubrir

- Opus 5.5 rechaza `temperature` y `tool_choice` forzado; el thinking está siempre activo y `max_tokens` lo incluye (por eso 8000). Las conversaciones solo se agregan al final, nunca se editan.
- La delegación triple de Coordinación sale como tres `tool_use` en una misma respuesta: los `tool_result` van todos en un solo mensaje de usuario (si se parten, el modelo deja de llamar en paralelo) y los tres eventos `dice` salen en un solo frame SSE (la vista los necesita juntos para mandar al personaje al pasillo).
- En la corrida con Buzz del 12/10, Coordinación recibía las respuestas de a una y mandó la propuesta en el tercer despertar por suerte del prompt. El bus ahora retiene el despertar hasta que los que deben respuesta callan (`docs/bus.md`).
- Las herramientas del fetch de Node no dejan cambiar `Host`; el test del chequeo de Host usa `node:http`.

## Estilo

La vista `stage/` es pixel-art (estilo Pixel Agents), no sigue el brand kit. Brand kit de Bitlogic (`~/github/brand-kit`, `DESIGN.md`): papel crema `#F9F4EA`, tinta `#121212`, azul BIT `#3E6BE8` solo en formas grandes, lavados celeste/durazno/manteca como superficies (nunca texto), Apple Garamond Light para una sola frase grande, Plain para el resto, sin sombras ni bordes. Las fuentes de Plain son licenciadas: están en `stage/assets/` pero no se suben al repo.

## Estado y pendientes

Reingeniería sin Buzz hecha el 16/10 (servidor, bus con tests, pack adaptado, vista por SSE). Ensayos del 16/10 con Opus 5.5 y effort `medium` (tabla en `docs/escenario.md`): la primera corrida tardó 152 s hasta la propuesta con 125 llamadas a herramientas; con herramientas por lote bajó a 8 llamadas, y con el bus esperando a los delegados activos la propuesta llega a los 78 s con el ajuste de Bienestar incluido. La corrida de los seis actos del guion es la predeterminada en `stage/corridas/` (plan B). En la demo decide Alfredo, como director (nombre por defecto). Pendientes, en orden:

1. Repetir el guion de seis actos varias veces (Opus 5.5 y Sonnet 5.5) anotando en la tabla de `docs/escenario.md`: tiempo hasta la propuesta, si el ajuste de Bienestar llega antes, si Advisor dice que no. Recién con varias corridas tocar prompts o `ESCUELA_EFFORT`.
2. Decidir modelo para el 5/11 según tiempo y calidad.
3. Probar en el proyector los dos temas (claro/oscuro) y el layout en la resolución del auditorio.
4. Formato de la charla: 30 min (demo de ~7 min) o 60 min (se suman Academia y Admisiones).

## Convenciones

- Los prompts de los agentes son cortos, en español, y cada agente usa solo sus herramientas (`tools:` del frontmatter). Nunca contactan a un estudiante ni ejecutan algo con consecuencias: proponen, una persona decide.
- `npm test` antes de commitear: tests del bus (turnos guionados, reloj manual), del corredor (cliente falso), del pack, del HTTP, del chat, del seguimiento y de los chequeos del E2E (sobre la corrida grabada; sin API).
- Para levantar la demo, siempre `./escenario`; para una sesión nueva, el botón **Reiniciar** de la vista (o `POST /api/reiniciar`).
- La vista tiene que seguir reproduciendo las corridas grabadas sin servidor (plan B si falla la red).
