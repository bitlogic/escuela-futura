# El Tablero: tareas fuera del chat

Diseño (17/10/2026), construido el mismo día: modelo en `stage/tablero.js`, servidor en `servidor/tablero.mjs`, vista en `stage/tablero.html`. Decisiones tomadas después de la propuesta: sin tareas previas (nacen de los objetivos), herramientas de los agentes encendidas, estado por selector en la Lista y arrastre en el Kanban.

## Para qué

El chat hoy carga con tres cosas: la conversación, la decisión y el seguimiento de lo que quedó por hacer. El Tablero se queda con la tercera. Es un seguidor de tareas al estilo Trello o Linear, con dos subvistas (Kanban y Lista), dos tipos de tarjeta (Tarea y SubTarea) y cuatro estados. Las tarjetas nacen desde el chat (de una decisión o de un agente) o a mano en el Tablero.

Principio que lo gobierna, el mismo de la charla: **los agentes crean y revisan; las personas avanzan y cierran.** Nada llega a "Lista" sin una persona.

## Modelo

- **Tarea** = un caso. "Martina R. · riesgo antes del parcial del 3/11". Tiene título, origen (de qué objetivo salió, o "a mano"), quién la creó (agente o persona), responsable, estado y sus SubTareas. Se cierra sola cuando todas sus SubTareas están Lista o descartadas.
- **SubTarea** = una acción. "Plan de pagos · Secretaría", "Práctica guiada de cruzamientos · docente", "Llamada · Alfredo". Tiene texto, responsable, estado, quién la creó y, si un agente la revisó, una nota de verificación con el dato.
- **Estados**: Pendiente → En progreso → En revisión → Lista. Más "descartada" (lo que la persona rechazó: no se muestra en el Kanban, sí en la Lista, tachada).
- **Responsables**: siempre personas o áreas de personas: Dirección (con el nombre de quien decide), Secretaría, docente, equipo de Bienestar, equipo de Admisiones. Un agente nunca es responsable de ejecutar; puede figurar como **revisor**.

Ojo con los nombres: "Bienestar" es a la vez un agente y un área con personas. En el Tablero el responsable se escribe "Equipo de Bienestar" para que no parezca que el agente llama a Martina.

## Quién puede hacer qué

| | Crear | Pendiente → En progreso | → En revisión | → Lista | Descartar |
|---|---|---|---|---|---|
| Agente | sí (queda "propuesta por Advisor") | no | sí, con una nota de verificación ("la cuota de agosto figura paga") | no | no |
| Persona | sí | sí | sí | sí | sí |

Un agente también puede devolver una tarjeta de En revisión a Pendiente con una nota ("el plan de pagos no aparece en Secretaría"). Es el único movimiento "hacia atrás" que tiene.

## Cómo nacen las tarjetas

1. **De la decisión en el chat** (el camino de la demo). La tarjeta de aprobación sigue en el chat, junto al mapa. Al enviar la decisión, cada acción aprobada nace como SubTarea en Pendiente con su responsable; "lo hago yo" pone a Dirección como responsable; "no" la crea descartada. La Tarea madre es el caso de la propuesta. El chat deja de mostrar el plan de acción y el bloque de cierre: en su lugar, una línea "3 tareas en el Tablero" que lleva ahí.
2. **De un agente, en la conversación.** Herramienta nueva `proponer_tarea` para todos los agentes: crea una Tarea o SubTarea en Pendiente marcada "propuesta por <agente>". Sirve para lo que no entra en una propuesta: "Lucía tiene un trámite sin respuesta; lo resuelve Secretaría sin decisión tuya". Y `revisar_tarea`: pasa una SubTarea a En revisión (o la devuelve a Pendiente) con una nota. Van encendidas: Advisor, Bienestar y Tutor tienen las dos; Admisiones y Academia solo `proponer_tarea`; Coordinación ninguna (lo suyo es la propuesta).
3. **A mano, en el Tablero.** Botones "+ Tarea" y "+ SubTarea" y edición del responsable. Para la persona que opera.

Los tres caminos generan los mismos eventos, así la vista, las grabaciones y el E2E no distinguen de dónde salió una tarjeta.

## Dónde vive el estado

En el servidor, por sesión: un evento nuevo `tarea` en el bus (`{ op: 'crear' | 'mover' | 'asignar' | 'nota' | 'descartar', id, ... , quien }`) que viaja por SSE como los demás y queda en las grabaciones. **Reiniciar** vuelve al estado inicial. Arranca vacío: las tareas nacen cuando la persona decide sobre un objetivo (o cuando un agente propone una, o a mano). En la vista en grabación, el Tablero se reconstruye de los eventos igual que el chat.

API: `GET /api/tablero` (el estado) y `POST /api/tablero` (una operación, como persona). Las herramientas de los agentes pasan por el mismo camino con `quien` = el agente.

## La vista

Tercera vista a pantalla completa, junto a Escuela y Organigrama (conmutador arriba a la derecha, tecla `b`). Mismo estilo que el organigrama: tablero de 1920×1080 escalado, pixel solo en marcos y rótulos, texto en sans y grande.

- **Kanban**: cuatro columnas (Pendiente, En progreso, En revisión, Lista). Cada SubTarea es una tarjeta: texto, responsable con su color, el caso al que pertenece en chico, y un chip si la creó un agente ("propuesta por Advisor") o si tiene nota de revisión. Se mueve con flechas en la tarjeta (← →) o arrastrando; las transiciones que no corresponden al que opera no se ofrecen.
- **Lista**: agrupada por Tarea; cada Tarea con su barra de avance (2 de 3 listas) y sus SubTareas debajo, con estado y responsable. Las descartadas, tachadas.
- Filtro único: "esta corrida" / "todo". Sin más controles.
- Si hay una decisión esperando en el chat, el conmutador lo marca en azul (como la pestaña del chat colapsado).

## En la demo

- **Acto 4, después de la decisión**: tecla `b`. Las tres acciones de Martina aparecen en Pendiente con Secretaría, docente y Alfredo. "Miren dónde quedó: en manos de personas." Volver a la escuela.
- **60 minutos**: la persona mueve "Plan de pagos" a En progreso; Advisor, con la herramienta encendida, la pasa a En revisión con una nota de verificación; la persona la cierra. Es la frase de la charla hecha gesto: el agente revisa, la persona cierra.

## E2E

Chequeos nuevos: las SubTareas creadas coinciden con las acciones aprobadas; los responsables son personas; ninguna tarjeta llega a Lista por un agente; la Tarea del caso se cierra cuando corresponde. Para el juez, un criterio más: "se entiende que lo aprobado quedó en manos de personas".

## Cómo se usa

- Tecla `b` (o el botón **Tablero** del conmutador) abre la vista; `k` y `l` cambian entre Kanban y Lista; `Escape` vuelve a la escuela.
- En el Kanban las tarjetas se arrastran entre columnas; en la Lista, cada acción tiene un selector de estado. **+ Tarea** crea una a mano; cada tarea tiene una fila **+ acción**.
- En grabación el Tablero solo se mira (los eventos `tarea` se reproducen como los demás).
- API: `GET /api/tablero` y `POST /api/tablero` con `{ op: 'crear' | 'sub' | 'mover' | 'asignar', … }` como persona.

## Orden de construcción

1. Modelo y eventos en el servidor (`servidor/tablero.mjs`, sin I/O, con tests) y el seed `data/tablero.json`. API y SSE.
2. La decisión del chat crea las tarjetas; el chat reemplaza el plan y el bloque de cierre por "N tareas en el Tablero".
3. La vista `stage/tablero.html` (Kanban y Lista), conmutador y tecla, reproducción desde grabaciones.
4. Herramientas `proponer_tarea` y `revisar_tarea` para los agentes, apagadas por defecto (`ESCUELA_TABLERO_AGENTES=1`).
5. Chequeos y criterio del juez en el E2E; guion y escenario.

Cada paso deja algo usable; el 1 y el 2 solos ya sacan del chat el seguimiento.

