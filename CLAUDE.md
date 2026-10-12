# Escuela Futura

Demo en vivo para la charla **"Escuela Agéntica"** (Innova Educa 21, Universidad Siglo 21, Córdoba, 5/11/2026), que dan Alfre (Bitlogic) y Greyla Alvarez. Tesis de la charla: *no se puede formar personas para trabajar con agentes desde una institución que no trabaja con agentes*. La demo muestra una escuela ficticia donde cinco agentes trabajan junto a personas, y una persona decide.

Todo es ficticio: la escuela, los estudiantes y los datos. Idioma del proyecto: español rioplatense.

## Cómo funciona

- **Los agentes corren en [Buzz](https://github.com/block/buzz)** (workspace de personas + agentes sobre un relay Nostr). Usamos Buzz sin modificar, en la comunidad hosteada `wss://escuelafutura.communities.buzz.xyz`. Canal principal: `#coordinacion`.
- **`pack/`** es la fuente de verdad de los agentes (Persona Pack de Buzz): `agents/*.persona.md` (prompt + config por agente), `instructions.md` (reglas del equipo), `avatars/`. El desktop de Buzz no importa packs: `scripts/build-team.mjs` los traduce a `dist/escuela-futura.team.json` (team snapshot) para importar en Agents → Agent teams → Import.
- **`mcp-escuela/server.mjs`** es un servidor MCP (stdio, sin dependencias) con las herramientas de la escuela (`ver_asistencia`, `ver_notas`, `ver_situacion_administrativa`, …) sobre **`data/escuela-futura.json`** (24 estudiantes sintéticos; se regenera con `scripts/generar_datos.py`). Se registra en Claude Code con `claude mcp add --scope user escuela-futura -- node <ruta>/mcp-escuela/server.mjs`; los agentes de Buzz con runtime Claude lo toman de ahí.
- **`stage/`** es la vista de escenario "la escuela desde arriba": un plano donde los agentes caminan según lo que hacen de verdad. Se abre con `python3 -m http.server 8080` desde la raíz → `http://localhost:8080/stage/`. Reproduce corridas grabadas (`stage/corridas/*.eventos.json`) y tiene modo en vivo contra el relay. Ver `stage/README.md`.
- **`docs/escenario.md`** es el guion de la demo ("Primer año en riesgo") y qué anotar. **`docs/corridas/`** guarda los exports crudos del probe.
- **`innova-educa-2026/buzz-probe/index.html`** (otro repo, en la carpeta de la charla) es la página que escucha el relay y exporta los eventos a JSON.

## Hallazgos sobre Buzz que conviene no redescubrir

- La actividad de los agentes viaja como eventos **kind 24200** (ephemeral), cifrados NIP-44 para el dueño de los agentes. Traen `turn_started`/`turn_completed`, cada `tool_call` con `rawInput`, y los mensajes que mandan (`buzz messages send --channel … --mention …`). `stage/normalizar.js` los interpreta.
- El relay **no entrega eventos de canal a suscripciones globales**: hay que suscribirse por canal con `#h: [id]`. Todo requiere AUTH NIP-42.
- Mensajes de personas: kind 9 con tag `h` (canal) y `p` (mencionado). Aprobaciones: kinds 46030/46031 y 46010/46011 (todavía no usadas).
- Los agentes contestan solo cuando los @mencionan. `respondTo: anyone` en el snapshot para que puedan mencionarse entre ellos.

## Estilo

La UI sigue el brand kit de Bitlogic (`~/github/brand-kit`, `DESIGN.md`): papel crema `#F9F4EA`, tinta `#121212`, azul BIT `#3E6BE8` solo en formas grandes, lavados celeste/durazno/manteca como superficies (nunca texto), Apple Garamond Light para una sola frase grande, Plain para el resto, sin sombras ni bordes. Las fuentes de Plain son licenciadas: están en `stage/assets/` pero no se suben al repo.

## Estado y pendientes

Corrida completa del escenario el 12/10: Coordinación delega, tres agentes en paralelo, propuesta en 46 s, decisión humana reflejada. Pendientes, en orden:

1. Probar el modo en vivo de `stage/` contra el relay.
2. Antes de cada corrida de prueba, arrancar los agentes con sesión nueva (si no, reusan datos y no se ven las llamadas a herramientas en el mapa).
3. Ajustar `pack/agents/coordinacion.persona.md`: tras la aprobación, cerrar asignando a roles humanos, sin pregunta abierta.
4. Usuario propio para Greyla en la comunidad.
5. Decidir relay para el 5/11: hosteado (depende de internet del auditorio) vs. propio (Docker, `deploy/compose/` en el repo de Buzz).
6. Modo guionado como plan B: reproducir una corrida grabada si falla la red.
7. Formato de la charla: 30 min (demo de ~5 min) o 60 min (demo completa).

## Convenciones

- No tocar el código de Buzz; si hace falta marca/UI, va en un fork aparte con una rama `escuela-futura`.
- Los prompts de los agentes son cortos, en español, y cada agente usa solo sus herramientas. Nunca contactan a un estudiante ni ejecutan algo con consecuencias: proponen, una persona decide.
- Cambios en `pack/` → `node scripts/build-team.mjs` y reimportar el equipo.
