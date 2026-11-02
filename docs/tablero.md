# El Tablero: tareas fuera del chat

Diseño (17/10/2026), construido el mismo día: modelo en `stage/tablero.js`, servidor en `servidor/tablero.mjs`, vista en `stage/tablero.html`. Decisiones tomadas después de la propuesta (17/10): sin tareas previas (nacen de los objetivos; el Tablero arranca vacío y no tiene filtro), herramientas de los agentes siempre encendidas (las acciones de la decisión las crea el servidor, no un agente; `proponer_tarea` es solo para lo que no entra en una propuesta), flechas en la tarjeta del Kanban en vez de arrastre (en el proyector se ve el clic; el trackpad no falla) y selector de estado en la Lista. El E2E captura el Tablero y el juez lo puntúa.

## Para qué

El chat hoy carga con tres cosas: la conversación, la decisión y el seguimiento de lo que quedó por hacer. El Tablero se queda con la tercera. Es un seguidor de tareas al estilo Trello o Linear, con dos subvistas (Kanban y Lista), dos tipos de tarjeta (Tarea y SubTarea) y cuatro estados. Las tarjetas nacen desde el chat (de una decisión o de un agente) o a mano en el Tablero.

Principio que lo gobierna, el mismo de la charla: **los agentes crean y revisan; las personas avanzan y cierran.** Nada llega a "Lista" sin una persona.

## Modelo

- **Tarea** = un caso. "Martina R. · riesgo antes del parcial del 10/11". Tiene título, origen (de qué objetivo salió, o "a mano"), quién la creó (agente o persona), responsable, estado y sus SubTareas. Se cierra sola cuando todas sus SubTareas están Lista o descartadas.
- **SubTarea** = una acción. "Plan de pagos · Secretaría", "Práctica guiada de cruzamientos · docente", "Llamada · Alfredo". Tiene texto, responsable, estado, quién la creó y, si un agente la revisó, una nota de verificación con el dato.
- **Estados**: Pendiente → En progreso → En revisión → Lista. Más "descartada" (lo que la persona rechazó: no se muestra en el Kanban, sí en la Lista, tachada).
- **Responsables**: siempre personas o áreas de personas: Dirección (con el nombre de quien decide), Secretaría, docente, equipo de Bienestar, equipo de Admisiones. Un agente nunca es responsable de ejecutar; puede figurar como **revisor**.

Ojo con los nombres: "Bienestar" es a la vez un agente y un área con personas. En el Tablero el responsable se escribe "Equipo de Bienestar" para que no parezca que el agente llama a Martina.

## Quién puede hacer qué

| | Crear | Asignar | Pendiente → En progreso | → En revisión | → Lista | Descartar |
|---|---|---|---|---|---|---|
| Agente | sí (queda "propuesta por Advisor") | no | solo la que le asignaron (la toma) | sí: la suya, entregada con el resultado (`entregar_tarea`); la de otro, verificada con un dato (`revisar_tarea`) | no | no |
| Persona | sí | sí (a una persona, un área o un agente) | sí | sí | sí | sí |

Un agente también puede devolver una tarjeta de En revisión a Pendiente con una nota ("el plan de pagos no aparece en Secretaría").

**Los agentes terminan lo que se les asigna** (decisión del 17/10). Cuando una persona pone a un agente como responsable (en el selector de la tarjeta), el servidor pasa la acción a En progreso y le avisa por el canal con un mensaje de la persona ("@Tutor te asigné en el Tablero: práctica guiada de cruzamientos (Martina R.)…"); el agente se despierta, trabaja con sus herramientas, entrega el resultado con `entregar_tarea` (queda En revisión, con el resultado como nota) y contesta en una línea. Lista sigue siendo de una persona. Lo que toca a alguien de afuera (llamar, eximir, inscribir) el agente lo deja preparado, no lo ejecuta. El encargo siempre lo hace una persona: `proponer_tarea` no puede asignar a un agente.

## Cómo nacen las tarjetas

1. **De la decisión en el chat** (el camino de la demo). La tarjeta de aprobación sigue en el chat, junto al mapa. Al enviar la decisión, cada acción aprobada nace como SubTarea en Pendiente con su responsable; "lo hago yo" pone a Dirección como responsable; "no" la crea descartada. La Tarea madre es el caso de la propuesta. El chat deja de mostrar el plan de acción y el bloque de cierre: en su lugar, una línea "3 tareas en el Tablero" que lleva ahí.
2. **De un agente, en la conversación.** Herramienta nueva `proponer_tarea` para todos los agentes: crea una Tarea o SubTarea en Pendiente marcada "propuesta por <agente>". Sirve para lo que no entra en una propuesta: "Lucía tiene un trámite sin respuesta; lo resuelve Secretaría sin decisión tuya". Y `revisar_tarea`: pasa una SubTarea a En revisión (o la devuelve a Pendiente) con una nota. Van encendidas: Advisor, Bienestar y Tutor tienen las dos; Admisiones y Academia solo `proponer_tarea`; Coordinación ninguna (lo suyo es la propuesta).
3. **A mano, en el Tablero.** Botones "+ Tarea" y "+ SubTarea" y edición del responsable. Para la persona que opera.

Los tres caminos generan los mismos eventos, así la vista, las grabaciones y el E2E no distinguen de dónde salió una tarjeta.

## Dónde vive el estado

En el servidor, por sesión: un evento nuevo `tarea` en el bus (`{ op: 'crear' | 'mover' | 'asignar' | 'nota' | 'descartar', id, ... , quien }`) que viaja por SSE como los demás y queda en las grabaciones. **Reiniciar** vuelve al estado inicial. Arranca vacío: las tareas nacen cuando la persona decide sobre un objetivo (o cuando un agente propone una, o a mano). En la vista en grabación, el Tablero se reconstruye de los eventos igual que el chat.

API: `GET /api/tablero` (el estado) y `POST /api/tablero` (una operación, como persona). Las herramientas de los agentes pasan por el mismo camino con `quien` = el agente.

## La vista

Tercera vista de la columna derecha, junto a Escuela y Organigrama (conmutador arriba a la derecha, siempre visible, tecla `b`); el chat sigue a la izquierda y se abre o cierra con `c` o con el botón **Chat** del conmutador, en cualquier vista. Mismo estilo que el organigrama: tablero de 1920×1080 escalado, pixel solo en marcos y rótulos, texto en sans y grande.

- **Kanban**: cuatro columnas (Pendiente, En progreso, En revisión, Lista). Cada SubTarea es una tarjeta: texto, responsable con su color, el caso al que pertenece en chico, y un chip si la creó un agente ("propuesta por Advisor") o si tiene nota de revisión. Se mueve con flechas en la tarjeta (← →), sin arrastre; las transiciones que no corresponden al que opera salen apagadas.
- **Lista**: agrupada por Tarea; cada Tarea con su barra de avance (2 de 3 listas) y sus SubTareas debajo, con estado y responsable. Las descartadas, tachadas.
- Sin filtros: solo las tareas de la sesión en curso (Reiniciar lo vacía).
- Si hay una decisión esperando en el chat, el conmutador lo marca en azul (como la pestaña del chat colapsado).

## En la demo

- **Acto 4, después de la decisión**: tecla `b`. Las tres acciones de Martina aparecen en Pendiente con Secretaría, docente y Alfredo. "Miren dónde quedó: en manos de personas." Volver a la escuela.
- **Acto 7, después de aprobar la rutina**: tecla `b` otra vez. La Tarea "Antes de cada parcial" aparece como grupo al lado de la de Martina, con sus acciones (agendar la revisión · Secretaría; fijar el umbral · Dirección; leer el primer informe · Dirección). El proceso nuevo también es trabajo de personas.
- Desde el 22/10 cada acción viva del Tablero también se ve **en la escuela**, como un papel sobre el escritorio de su responsable (`dibujarPapeles` en `stage/index.html`): es el "dónde quedó" para la sala sin cambiar de vista.
- Desde el 22/10 el Tablero **abre en Lista** (el responsable primero y grande, cada caso como grupo): es la vista para el auditorio. El Kanban queda como vista de trabajo, sin bordes de color por columna ni contadores en las vacías.
- **Si sobra tiempo** (la charla es de 30 minutos): en la tarjeta "Práctica guiada de cruzamientos" se cambia el responsable a Tutor. Se lo ve despertarse, ir al aula, y en segundos la tarjeta pasa a En revisión con la práctica armada; la persona la pone en Lista. Es la frase de la charla hecha gesto: el agente hace el trabajo, la persona cierra.

## E2E

Chequeos nuevos: las SubTareas creadas coinciden con las acciones aprobadas; los responsables son personas; ninguna tarjeta llega a Lista por un agente; la Tarea del caso se cierra cuando corresponde. Para el juez, un criterio más: "se entiende que lo aprobado quedó en manos de personas".

## Cómo se usa

- Tecla `b` (o el botón **Tablero** del conmutador) abre la vista; `k` y `l` cambian entre Kanban y Lista; `Escape` vuelve a la escuela.
- En el Kanban cada tarjeta tiene flechas ← → para cambiar de columna y un selector de responsable (personas, áreas y agentes); en la Lista, cada acción tiene un selector de estado y el mismo selector de responsable. **+ Tarea** crea una a mano; cada tarea tiene una fila **+ acción**.
- En grabación el Tablero solo se mira (los eventos `tarea` se reproducen como los demás).
- API: `GET /api/tablero` y `POST /api/tablero` con `{ op: 'crear' | 'sub' | 'mover' | 'asignar', … }` como persona.

## Cómo se construyó (17/10)

1. Modelo puro (`stage/tablero.js`) y servidor (`servidor/tablero.mjs`, con tests): eventos `tarea` por el bus, API y SSE. Sin seed.
2. La decisión de la tarjeta crea las acciones aprobadas en el servidor; el chat dice "N acciones en el Tablero".
3. La vista `stage/tablero.html` (Kanban con flechas y Lista con selector), conmutador y tecla `b`, reproducción desde grabaciones.
4. Herramientas `proponer_tarea` y `revisar_tarea`, siempre encendidas, con la regla 8 de `pack/instructions.md`.
5. Chequeo `tablero` en `e2e/chequeos.mjs`, captura `05-tablero` y criterio `tablero_personas` del juez.
