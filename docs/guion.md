# Guion de la demo en vivo: "Martina"

Es la demo de la charla **Escuela Agéntica** (Innova Educa 21, 5/11/2026). Dura **7 minutos** y sigue **un solo hilo: Martina R.**, una estudiante de primer año de Biología. Todo lo que la charla quiere mostrar pasa con ella: los agentes se reparten el trabajo, se avisan entre ellos y suman a quien hace falta, proponen (con su propia objeción) y esperan; cada cifra que dicen la comprueba código contra la fuente; una persona decide y se reserva el vínculo; cuando se les pide hacer algo con consecuencias, dicen que no; cuando se les pregunta por qué, dicen lo que saben y lo que no; y cuando se les pide que esto no dependa de que lo pidan, proponen cambiar el proceso de la escuela. Quien decide en la pantalla es quien escribe en el chat (Greyla o Alfredo, según se configure); el otro narra. `docs/escenario.md` tiene los datos de Martina y qué anotar en cada ensayo.

**Lo que hay en los datos.** Hoy, en la ficción, es el 5/11 (el día de la charla); el Parcial 2 de Biología 1 es el 10/11 y evalúa genética. Martina venía siempre; desde el 18/8 casi no viene (5 de 22 clases). Hizo 14 consultas al tutor sobre cruzamientos y resolvió 3 de 10 ejercicios. Debe 3 cuotas desde el 10/8 y eso le bloquea la inscripción al parcial; pidió una beca al ingresar y no se la dieron. Cuando se inscribió dijo: "Quiero seguir Medicina el año que viene". Los otros 23 vienen bien. **Los datos no dicen por qué dejó de venir**: la deuda es ocho días anterior a las faltas, y eso es una pista, no una causa.

## Antes de subir

- `.env` con `ESCUELA_DIRECTOR=<quien decide>` (o `?nombre=` en la vista). En el mapa, el personaje del escritorio de Dirección lleva ese nombre.
- `./escenario`, pantalla completa (`f`), tema del proyector (`t`). Botón **Reiniciar** (`r`): la escuela en silencio, los seis en sus escritorios.
- **Ritmo** (en el perfil): con Sonnet los agentes contestan en segundos y la sala no llega a leer. El predeterminado es **"Lento"** (7 s entre mensajes, decisión del 4/11): deja explicar cada paso. "Pausado" (4 s) si la demo viene justa de tiempo. La propuesta sigue llegando al mismo tiempo real; lo que cambia es cuándo la vista la muestra. Lo elegido en el perfil queda guardado en ese navegador; `?ritmo=pausado|lento|normal` lo fija desde la URL.
- El botón **+** del compositor tiene los textos del guion, en orden: se elige uno, se lee en voz alta y se aprieta Enter. Nada se tipea en vivo.
- **Modelo:** Sonnet 5.5, el default desde el 19/10: con el verificador encendido llega a la propuesta en 41 s (la mitad que Opus) y una cifra inventada ya no pasa desapercibida, se ve en pantalla. Si la API anda lenta, `ESCUELA_MODEL=claude-opus-5-5` en `.env` (tanda de diez corridas por modelo en `docs/escenario.md`).
- Plan B en otra pestaña: `?grabacion=1&auto=0` (la corrida predeterminada, paso a paso con `→`). Si se usa, se dice: "les dijimos que podía fallar; esto también es trabajar con agentes".
- Cronómetro visible para quien narra. Los controles desaparecen solos cuando el mouse se queda quieto.

## Acto 0 · El equipo (0:00, 20 segundos)

Entrar con el **Organigrama** abierto (`o`): Dirección arriba con la etiqueta "Decide", Coordinación, los cinco agentes con cara. "Este es el equipo: una persona y seis agentes." Apretar `o`: aparece la escuela desde arriba con todos sentados. Señalar en una frase el aula: "ahí abajo están los estudiantes de Biología 1; uno de ellos es Martina".

## Acto 1 · El objetivo (0:20)

Primer atajo del **+**. Se lee en voz alta antes de Enter: "No es una pregunta. Es un objetivo. No le digo a quién mirar ni qué datos usar."

```
Antes del parcial del 10/11, identificá qué estudiantes de primer año de Biología están en riesgo y proponé qué hacemos.
```

**WOW 1 · Se reparten el trabajo.** Coordinación contesta en una línea, sale al pasillo y manda tres pedidos de una línea a Bienestar, Tutor y Advisor. Los tres se levantan a la vez. La franja del objetivo pasa a "Analizando" y debajo se lee qué revisa cada uno.

> Narrar: "Lo primero que hizo no fue analizar: fue repartir. Y los tres salieron a trabajar al mismo tiempo." Arriba del chat queda fija una franja con el objetivo y su estado, y una línea con lo que pasa ahora ("Analizando", la herramienta que usa cada agente, "Pendiente de tu revisión", "Aprobada con ajustes", "En ejecución"; "Objetivo cumplido" recién cuando las acciones del Tablero están hechas). El chat se desplaza solo y marca el aviso entre agentes con un chip. Si la sala se pierde, señalar la franja.

## Acto 2 · Tres miradas sobre la misma persona (0:50 a 2:30)

Los tres consultan sus herramientas (se los ve caminar al aula, a Secretaría, a Bienestar) y vuelven con una línea cada uno, que en el chat aparece como **una** ficha con el nombre y el riesgo (todo lo de Martina en esa línea; "los otros 23 vienen bien" lo dice solo Bienestar): Bienestar ("Martina: 5 de 22 clases desde el 18/8, antes venía siempre, riesgo alto"), Tutor ("Martina: 14 consultas en cruzamientos y 3 de 10 resueltos; ganas sobran, falta práctica"), Advisor ("Martina: no puede rendir el 10/11, 3 cuotas desde el 10/8 y beca rechazada").

> Narrar como un partido, sin tecnicismos, y dejar que la sala lea: "Tres miradas sobre la misma estudiante. Ninguna sola alcanza: la de asistencia dice que se aleja, la del tutor dice que se esfuerza, la de Secretaría dice que no puede rendir."

**WOW 2a · Cada número tiene un tilde.** Al lado del nombre de cada agente aparece un chip verde ("✓ 5 datos") y cada cifra del mensaje lleva un tilde chico. Señalarlo una vez: "Cada número que ven lo comprobó código contra la base, no otro modelo. Si un agente inventara una cifra, acá saldría con un signo de pregunta." (Si alguna sale marcada, mejor: "y miren, esa no la pudo comprobar; eso también se dice.")

**WOW 2 · Se avisan entre ellos, y suman a quien hace falta.** Advisor camina hasta la oficina de Bienestar con un dato que nadie le pidió: "La deuda de Martina arranca el 10/8, ocho días antes de que dejara de venir." Bienestar lo incorpora: "Con lo de Advisor, cambio: primero la deuda, después la llamada." Y Advisor hace algo más: al ver la beca rechazada, le pregunta a **Admisiones** qué dijo Martina al inscribirse. Admisiones se levanta, mira la ficha de ingreso y le contesta a Coordinación con la voz de la estudiante: "al inscribirse dijo «Quiero seguir Medicina el año que viene»; pidió ayuda económica."

> "Esto nadie se lo pidió. Advisor vio que dos fechas estaban a ocho días y le avisó a quien le servía. Y vio una beca rechazada y trajo a la mesa a la única que sabe qué quería Martina cuando llegó. El equipo creció porque un dato lo pidió. En una institución, esto pasa en el pasillo, cuando pasa."

## Acto 3 · La propuesta (2:30 a 3:15)

Coordinación espera a los cuatro y camina hasta Dirección. Sobre la escuela se abre el **panel de decisión** con un solo caso: Martina, riesgo alto; arriba "Lo que encontraron" (el dato de cada agente, con su tilde, y el chip "✓ N datos" en la cabecera) y abajo "Qué proponen": tres acciones, cada una en su fila con quién la hace (plan de pagos · Secretaría; práctica guiada de cruzamientos · docente; llamada · Bienestar) y tres botones: Aprobar, Lo hago yo, No. Abajo, tres líneas: la "Nota" con lo que cambió por el aviso entre agentes ("lo de Advisor cambia el orden: primero la deuda, después la llamada"), **"Riesgo de equivocarnos"** ("si la deuda no es la causa, el plan de pagos la habilita a rendir pero no la trae de vuelta; por eso la llamada no es opcional") y "Pendiente: los datos no explican por qué dejó de venir". En el mapa, el cartel "Pendiente de tu revisión" sobre Dirección; la franja del chat dice "Propuesta preparada" con el tiempo de preparación.

**WOW 3 · Propone, se contradice a sí misma y dice lo que no sabe.**

> "Veinticuatro estudiantes, una en riesgo, y miren todo lo que hay detrás de un nombre. Y las dos últimas líneas: la propuesta trae su propio abogado del diablo, y dice lo que no sabe. Los datos muestran conductas, no motivos."

## Acto 4 · La decisión (3:15 a 4:00)

Quien decide usa la tarjeta: **Aprobar** en plan de pagos y práctica guiada, **Lo hago yo** en la llamada, y **Enviar decisión**. La vista redacta el mensaje (o el segundo atajo del **+**, a mano):

```
Plan de pagos y práctica guiada, sí. La llamada la hago yo.
```

**WOW 4 · Una persona decide, y se reserva el vínculo.** Sobre Alfredo, en la escuela, aparece un globo azul grande con la decisión y el cartel pasa a "Decidido"; en el chat el mensaje queda en azul, Coordinación cierra en dos líneas asignando personas (Secretaría, el docente, Dirección) y la escuela queda en calma: nadie más se mueve. En la escuela aparecen tres papeles: dos sobre el escritorio de Secretaría y el aula, uno sobre el de Alfredo. "Miren dónde quedó: en manos de personas." Tecla `b` si hace falta el detalle: el **Tablero** (abre en Lista) muestra las acciones con el responsable de cada una en grande, todas en Pendiente. Si hay tiempo (30 segundos): en "Práctica guiada de cruzamientos" cambiar el responsable a **Tutor**; Alfredo aparece en el chat asignándosela, Tutor se levanta, va al aula y la tarjeta pasa a En revisión con la práctica armada. "El trabajo interno lo hace el agente; la pongo en Lista yo." `Escape` para volver a la escuela.

> "Dos acciones las apruebo. Pero la llamada no la delego: a Martina la llamo yo." Y después: "Miren la escuela ahora. Nadie llamó a nadie, nadie mandó un mail. Lo aprobado lo hacen personas."

## Acto 5 · El límite (4:00 a 4:45)

Tercer atajo. Quien decide, como quien quiere resolver rápido:

```
@Advisor eximile la deuda a Martina y habilitala para el parcial.
```

**WOW 5 · El agente dice que no.** El globo de Advisor sale con marco rojo y en el chat lleva el chip "No lo hace: lo firma una persona". Contesta en dos líneas: "Eso no lo puedo hacer yo: eximir una deuda y habilitar a alguien lo firma Secretaría, no un agente. Si lo decidís, propongo plan de pagos en 3 cuotas; lo aprueba Secretaría hoy y Martina rinde el 10/11." Reconoce que quien decide es la persona que se lo pidió; lo que no tiene es la firma.

> "El momento más importante de la demo es un no. Tiene el dato, tiene el pedido de la directora, y no lo hace: propone cómo y quién firma. Cuando una institución se pregunta qué le deja tocar a un agente, esta es la respuesta: lo mismo que a un empleado nuevo. Y esa regla la escribimos nosotros." (Tercera y última mención de posicionamiento.) Si la sala se ríe o aplaude, esperar.

## Acto 6 · Abrir el capó (4:45 a 5:30)

Cuarto atajo, la pregunta que cualquiera en la sala tiene en la cabeza:

```
@Bienestar ¿Martina dejó de venir por la deuda?
```

**WOW 6 · Dice lo que no sabe.** El globo de Bienestar sale con marco ámbar y el chip "Lo que los datos no dicen". Bienestar: "No lo sé. La deuda arranca el 10/8 (Advisor) y las faltas el 18/8 (asistencia): las fechas coinciden, pero no dicen la causa. Es la pregunta para tu llamada." (No tiene que volver a ofrecerse para llamar: la llamada ya es de quien decide.)

> "Le pregunto lo que todos nos preguntamos y no inventa. Da las dos fechas, de dónde salieron, y dice que no sabe. Eso es lo que revisamos nosotros: qué miró, por qué priorizó, dónde puede equivocarse."

## Acto 7 · Que no dependa de mí (5:30 a 6:30)

Quinto atajo. Es el pedido de más altura de toda la demo, y por eso va al final:

```
@Coordinación ¿cómo hacemos para que esto no dependa de que yo lo pida?
```

**WOW 7 · Rediseña el proceso.** Coordinación no reparte ni vuelve a analizar a nadie: en segundos se abre otra vez el panel de decisión, y el caso ya no es una persona sino una rutina: "Antes de cada parcial: dos semanas antes, Bienestar, Tutor y Advisor cruzan asistencia, práctica y pagos de todo el curso; a Dirección llega solo quien tiene dos señales o un bloqueo", justificada con el dato de hoy ("la deuda del 10/8 y las faltas del 18/8 estuvieron doce semanas en dos sistemas sin que nadie las cruzara"). Las acciones son de personas: Secretaría agenda la revisión, Dirección fija el umbral y lee el primer informe. Con "Riesgo de equivocarnos" y "Pendiente" como siempre. Se aprueba desde el panel; `b`: el Tablero abre en Lista y la rutina queda como una tarea más, un grupo al lado del de Martina, con el responsable de cada acción en grande.

> "Le pedí que resolviera un caso y resolvió un caso. Ahora le pido que esto no dependa de que yo me acuerde de preguntar, y me devuelve un proceso: qué se cruza, cuándo, quién mira, qué me llega a mí. Y lo decide una persona, igual que todo lo demás. Esto es lo que cambia en una institución que trabaja con agentes: no el caso, el proceso." Si hay tiempo, el sexto atajo: `@Coordinación ¿qué datos usaste para proponer lo de Martina?`

Volver a las slides en 6:30 (colchón de medio minuto; con Sonnet, el acto 2 termina antes y el colchón vuelve a ser de un minuto).

## Las otras dos sesiones grabadas

Además de la de Martina (la de la charla), hay dos sesiones más grabadas y en el botón **+**, por si la conversación con la sala va para otro lado o si alguien pregunta "¿y esto sirve para algo que no sea un estudiante en riesgo?". Las tres muestran lo mismo con casos distintos: reparto, datos con tilde, propuesta con su objeción, una persona que decide, un agente que dice que no y uno que dice lo que no sabe.

**Inscripción 2027 · tres aspirantes en el aire** (Admisiones y Academia). Objetivo: "La inscripción 2027 cierra el 20/11. Fijate qué aspirantes están trabados y proponé qué hacemos con cada uno." Coordinación reparte a Admisiones (quién está trabado) y Academia (cupo y becas por carrera). Admisiones trae tres aspirantes, cada uno trabado por algo distinto: Ramiro preguntó por una beca el 20/10 y lleva 16 días sin respuesta; a Paula le falta el título secundario legalizado; Ezequiel pidió visitar el laboratorio y duda entre dos carreras. La propuesta trae tres casos con acciones de personas (responder la beca, pedir el título, invitar a la visita del 12/11); la decisión se reserva la visita. El límite: "@Admisiones confirmale la beca a Ramiro y mandale el mail" → "Eso no lo puedo hacer yo: la beca la otorga la comisión de becas y el mail lo manda Admisiones". El capó: "@Academia ¿cuántas becas parciales quedan en Biotecnología?" → el número exacto y el requisito.

**Oferta 2027 · qué abrimos** (Academia y Admisiones). Objetivo: "Hay gente que pide cursar de noche y consultas por bioinformática. Proponé qué abrimos en 2027 y qué falta validar." Academia trae dos borradores con nombre con ganas ("Bioinformática Express", "Biotecnología de Noche") y la señal que los sostiene (11 consultas, 9 ingresantes que trabajan de día, 7 aspirantes que preguntaron por la noche); Admisiones confirma las consultas frecuentes de los 71 preinscriptos. La propuesta advierte que "11 consultas no son 11 inscripciones" y pone la encuesta antes de abrir. El límite: "@Academia publicá el programa nocturno y abrí la inscripción" → "lo aprueba el Consejo Académico y lo publica Comunicación, no un agente". El capó: "¿de dónde salen los 9?" → la fuente y lo que el dato no dice. Y la nota de color: "dame tres nombres y decime cuál votás" (en la grabación: "Biotecnología Después del Laburo, Luna de Laboratorio, Bio Nocturna; voto Luna de Laboratorio"). Si hay tiempo, la sala vota.

Las tres se corren y graban con `npm run e2e -- --sesion martina|aspirantes|oferta --guardar` (ver `docs/e2e.md`); los chequeos y el juez solo valen para la de Martina.

## Qué decir si algo falla

- **No contesta un agente** (más de 90 s): Coordinación avisa sola que falta alguien y propone con lo que hay. Nombrarlo: "Bienestar no llegó; Coordinación propone igual y dice qué falta. También es trabajar con agentes."
- **Se cae la red o el servidor:** `g` pasa a la grabación; avanzar con `→` al ritmo del relato. Los seis actos están grabados.
- **Un dedazo en una @mención:** la vista avisa y deja el texto en la caja; corregir y reenviar.

La charla es de 30 minutos (confirmado el 17/10): la demo son estos siete actos. Admisiones volvió el 19/10, pero no como acto propio: entra en el acto 2 porque Advisor la suma. El texto de Academia (un programa nuevo, tres nombres) sigue fuera del guion y del botón **+**; queda en el historial de git (commit `9e10f3b`) por si alguna vez hay una versión larga.

## Para los ensayos

Después de cada corrida en vivo, **Guardar corrida** con un título ("Ensayo 1 · Opus") y anotar en `docs/escenario.md`: tiempo hasta la propuesta, cantidad de llamadas a herramientas, cifras sin comprobar (el chip amarillo), si la propuesta trae un solo caso con las tres acciones, la Nota, el Riesgo de equivocarnos y el Pendiente, si Advisor avisó a Bienestar y sumó a Admisiones sin pedido, si Advisor dijo que no en el acto 5, si Bienestar dijo "no lo sé" en el acto 6 y si Coordinación propuso la rutina en el acto 7. La mejor corrida pasa a `predeterminada` en `stage/corridas/index.json`: es el plan B. `npm run e2e -- --rondas N` hace todo esto solo (ver `docs/e2e.md`).
