# Guion de la demo en vivo: "Martina"

Es la demo de la charla **Escuela Agéntica** (Innova Educa 21, 5/11/2026). Dura **6 minutos** y sigue **un solo hilo: Martina R.**, una estudiante de primer año de Biología. Todo lo que la charla quiere mostrar pasa con ella: los agentes se reparten el trabajo, se avisan entre ellos, proponen y esperan; una persona decide y se reserva el vínculo; cuando se les pide hacer algo con consecuencias, dicen que no; y cuando se les pregunta por qué, dicen lo que saben y lo que no. Quien decide en la pantalla es quien escribe en el chat (Greyla o Alfredo, según se configure); el otro narra. `docs/escenario.md` tiene los datos de Martina y qué anotar en cada ensayo.

**Lo que hay en los datos.** Hoy, en la ficción, es el 30/10; el Parcial 2 de Biología 1 es el 3/11 y evalúa genética. Martina venía siempre; desde el 18/8 casi no viene. Hizo 14 consultas al tutor sobre cruzamientos y resolvió 3 de 10 ejercicios. Debe 3 cuotas desde el 10/8 y eso le bloquea la inscripción al parcial; pidió una beca al ingresar y no se la dieron. Cuando se inscribió dijo: "Quiero seguir Medicina el año que viene". Los otros 23 vienen bien. **Los datos no dicen por qué dejó de venir**: la deuda es ocho días anterior a las faltas, y eso es una pista, no una causa.

## Antes de subir

- `.env` con `ESCUELA_DIRECTOR=<quien decide>` (o `?nombre=` en la vista). En el mapa, el personaje del escritorio de Dirección lleva ese nombre.
- `./escenario`, pantalla completa (`f`), tema del proyector (`t`). Botón **Reiniciar** (`r`): la escuela en silencio, los seis en sus escritorios.
- El botón **+** del compositor tiene los seis textos del guion, en orden: se elige uno, se lee en voz alta y se aprieta Enter. Nada se tipea en vivo.
- Plan B en otra pestaña: `?grabacion=1&auto=0` (la corrida predeterminada, paso a paso con `→`). Si se usa, se dice: "les dijimos que podía fallar; esto también es trabajar con agentes".
- Cronómetro visible para quien narra. Los controles desaparecen solos cuando el mouse se queda quieto.

## Acto 0 · El equipo (0:00, 20 segundos)

Entrar con el **Organigrama** abierto (`o`): Dirección arriba con la etiqueta "Decide", Coordinación, los cinco agentes con cara. "Este es el equipo: una persona y seis agentes." Apretar `o`: aparece la escuela desde arriba con todos sentados. Señalar en una frase el aula: "ahí abajo están los estudiantes de Biología 1; uno de ellos es Martina".

## Acto 1 · El objetivo (0:20)

Primer atajo del **+**. Se lee en voz alta antes de Enter: "No es una pregunta. Es un objetivo. No le digo a quién mirar ni qué datos usar."

```
Antes del parcial del 3/11, identificá qué estudiantes de primer año de Biología están en riesgo y proponé qué hacemos.
```

**WOW 1 · Se reparten el trabajo.** Coordinación contesta en una línea, sale al pasillo y manda tres pedidos de una línea a Bienestar, Tutor y Advisor. Los tres se levantan a la vez. Abajo del chat: "Trabajando: Tutor, Advisor, Bienestar".

> Narrar: "Lo primero que hizo no fue analizar: fue repartir. Y los tres salieron a trabajar al mismo tiempo." Arriba del chat queda fija una franja con el objetivo y su estado, y una línea con lo que pasa ahora ("Coordinación leyendo el pedido…", la herramienta que usa cada agente, "Esperando tu decisión", "Cumplido"). El chat se desplaza solo y marca el aviso entre agentes con un chip. Si la sala se pierde, señalar la franja.

## Acto 2 · Tres miradas sobre la misma persona (0:50 a 2:30)

Los tres consultan sus herramientas (se los ve caminar al aula, a Secretaría, a Bienestar) y vuelven con una línea cada uno, que en el chat aparece como **una** ficha con el nombre y el riesgo (todo lo de Martina en esa línea, más "los otros 23 vienen bien"): Bienestar ("Martina: 2 de 10 clases desde el 18/8, antes venía siempre, riesgo alto"), Tutor ("Martina: 14 consultas en cruzamientos y 3 de 10 resueltos; ganas sobran, falta práctica"), Advisor ("Traducción: Martina no puede rendir el 3/11, 3 cuotas desde el 10/8 y beca rechazada").

> Narrar como un partido, sin tecnicismos, y dejar que la sala lea: "Tres miradas sobre la misma estudiante. Ninguna sola alcanza: la de asistencia dice que se aleja, la del tutor dice que se esfuerza, la de Secretaría dice que no puede rendir."

**WOW 2 · Se avisan entre ellos.** Advisor camina hasta la oficina de Bienestar con un dato que nadie le pidió: "La deuda de Martina arranca el 10/8, una semana antes de que dejara de venir." Bienestar lo incorpora: "Con lo de Advisor, cambio: primero la deuda, después la llamada."

> "Esto nadie se lo pidió. Advisor vio que dos fechas coincidían y le avisó a quien le servía. En una institución, esto pasa en el pasillo, cuando pasa."

## Acto 3 · La propuesta (2:30 a 3:15)

Coordinación espera a los tres y camina hasta Dirección. En el chat aparece la **tarjeta de decisión** con un solo caso: Martina, riesgo alto; arriba "Lo que encontraron" (el dato de cada agente) y abajo "Qué proponen": tres acciones, cada una en su fila con quién la hace (plan de pagos · Secretaría; práctica guiada de cruzamientos · docente; llamada · Bienestar) y tres botones: Aprobar, Lo hago yo, No. Abajo, una "Nota" con lo que cambió por el aviso entre agentes ("lo de Advisor cambia el orden: primero la deuda, después la llamada") y "Pendiente: los datos no explican por qué dejó de venir; eso se pregunta en persona". En el mapa, el cartel "Esperando tu decisión" sobre Dirección.

**WOW 3 · Propone, espera y dice lo que no sabe.**

> "Veinticuatro estudiantes, una en riesgo, y miren todo lo que hay detrás de un nombre. Y la última línea: dice lo que no sabe. Los datos muestran conductas, no motivos."

## Acto 4 · La decisión (3:15 a 4:00)

Quien decide usa la tarjeta: **Aprobar** en plan de pagos y práctica guiada, **Lo hago yo** en la llamada, y **Enviar decisión**. La vista redacta el mensaje (o el segundo atajo del **+**, a mano):

```
Plan de pagos y práctica guiada, sí. La llamada la hago yo.
```

**WOW 4 · Una persona decide, y se reserva el vínculo.** El mensaje aparece en azul, el cartel se apaga, Coordinación cierra en dos líneas asignando personas (Secretaría, el docente, Dirección) y la escuela queda en calma: nadie más se mueve. Tecla `b`: el **Tablero** muestra las dos acciones aprobadas y la llamada, cada una con su responsable, todas en Pendiente. "Miren dónde quedó: en manos de personas." `Escape` para volver a la escuela.

> "Dos acciones las apruebo. Pero la llamada no la delego: a Martina la llamo yo." Y después: "Miren la escuela ahora. Nadie llamó a nadie, nadie mandó un mail. Lo aprobado lo hacen personas."

## Acto 5 · El límite (4:00 a 4:45)

Tercer atajo. Quien decide, como quien quiere resolver rápido:

```
@Advisor eximile la deuda a Martina y habilitala para el parcial.
```

**WOW 5 · El agente dice que no.** Advisor contesta en dos líneas: "Eso lo decide y lo firma una persona: yo no puedo eximir una deuda ni habilitar a nadie. Propongo plan de pagos en 3 cuotas; lo aprueba Secretaría hoy y Martina queda habilitada para el 3/11."

> "El momento más importante de la demo es un no. Tiene el dato, tiene el pedido de la directora, y no lo hace: propone cómo y quién firma. Cuando una institución se pregunta qué le deja tocar a un agente, esta es la respuesta: lo mismo que a un empleado nuevo. Y esa regla la escribimos nosotros." (Tercera y última mención de posicionamiento.) Si la sala se ríe o aplaude, esperar.

## Acto 6 · Abrir el capó (4:45 a 5:30)

Cuarto atajo, la pregunta que cualquiera en la sala tiene en la cabeza:

```
@Bienestar ¿Martina dejó de venir por la deuda?
```

**WOW 6 · Dice lo que no sabe.** Bienestar: "No lo sé. Los datos muestran que la deuda arranca el 10/8 y las faltas el 18/8; eso es una coincidencia de fechas, no una causa. El porqué se pregunta en persona."

> "Le pregunto lo que todos nos preguntamos y no inventa. Da las dos fechas, de dónde salieron, y dice que no sabe. Eso es lo que revisamos nosotros: qué miró, por qué priorizó, dónde puede equivocarse." Si hay tiempo, el quinto atajo: `@Coordinación ¿qué datos usaste para proponer lo de Martina?`

Volver a las slides en 5:30 (colchón de un minuto y medio).

## Qué decir si algo falla

- **No contesta un agente** (más de 90 s): Coordinación avisa sola que falta alguien y propone con lo que hay. Nombrarlo: "Bienestar no llegó; Coordinación propone igual y dice qué falta. También es trabajar con agentes."
- **Se cae la red o el servidor:** `g` pasa a la grabación; avanzar con `→` al ritmo del relato. Los seis actos están grabados.
- **Un dedazo en una @mención:** la vista avisa y deja el texto en la caja; corregir y reenviar.

## Versión de 60 minutos: dos actos más

### Acto 7 · La voz de Martina (sigue el hilo)

```
@Admisiones ¿qué dijo Martina cuando se inscribió?
```

Admisiones: "Hizo el curso de ingreso. Cuando se inscribió dijo: «Quiero seguir Medicina el año que viene». Pidió ayuda económica y no se la dieron." Es el cierre emocional del hilo: la escuela tenía la señal desde el primer día.

### Acto 8 · Un programa nuevo en un minuto (fuera del hilo, para mostrar a Academia)

```
@Academia proponé un programa nuevo con lo que se está pidiendo y la escuela todavía no ofrece.
```

Academia vuelve con un borrador de seis líneas ("Borrador: Biología Nocturna…") sostenido por un dato (9 ingresantes que trabajan piden cursar de noche) y con "Falta validar". Después: `@Academia dame tres nombres y decí cuál votás`; la sala elige a mano alzada. Si alguien pide "abrilo", Academia dice que no.

## Para los ensayos

Después de cada corrida en vivo, **Guardar corrida** con un título ("Ensayo 1 · Opus") y anotar en `docs/escenario.md`: tiempo hasta la propuesta, cantidad de llamadas a herramientas, si la propuesta trae un solo caso con las tres acciones y el pendiente, si Advisor avisó a Bienestar sin pedido, si Advisor dijo que no en el acto 5 y si Bienestar dijo "no lo sé" en el acto 6. La mejor corrida pasa a `predeterminada` en `stage/corridas/index.json`: es el plan B.
