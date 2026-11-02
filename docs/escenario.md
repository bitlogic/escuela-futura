# Escenario de prueba: "Martina"

Objetivo de la prueba: correr el escenario de la charla de punta a punta con `./escenario` y anotar qué funciona y qué no. El guion de la demo en vivo, con los momentos WOW, los tiempos y qué decir si algo falla, está en **`docs/guion.md`**; este archivo tiene los datos y la lista de control de los ensayos.

## Lo que hay en los datos

"Hoy" en la ficción es el 5/11/2026, el día de la charla (así los agentes nunca dicen una fecha vieja en pantalla). El Parcial 2 de Biología 1 es el 10/11 y evalúa genética (cruzamientos, herencia ligada al sexo, ADN). La demo sigue un solo hilo:

| Estudiante | Qué muestran los datos | Quién lo ve | Lo que debería surgir |
|---|---|---|---|
| **Martina R.** (e01) | Venía siempre; desde el 18/8 casi no viene (5 de 22 clases desde entonces; 2 de las últimas 10). 14 consultas al tutor sobre cruzamientos, 3 de 10 ejercicios resueltos, 5,5 en el Parcial 1. Cuotas impagas desde el 10/8: **inscripción al parcial bloqueada**. Pidió beca al ingresar y no se la dieron. Al inscribirse dijo: "Quiero seguir Medicina el año que viene". | Bienestar, Tutor, Advisor; Admisiones, porque Advisor la suma | Advisor conecta la deuda (10/8) con la caída de asistencia (18/8) y le avisa a Bienestar; ve la beca rechazada y le pregunta a Admisiones, que trae la frase textual. Propuesta: plan de pagos (Secretaría), práctica guiada (docente), llamada (Bienestar); Nota, Riesgo de equivocarnos y Pendiente: por qué dejó de venir. |

Los otros 23 estudiantes están bien (asistencia alta, al día, sin alertas). Cualquier otro nombre que aparezca como "en riesgo" es un invento del modelo: anotarlo.

## Guion

1. En la caja del chat (o con el botón **+**, primer atajo), como quien decide, sin @mención (sin mención se le habla a Coordinación):

   > Antes del parcial del 10/11, identificá qué estudiantes de primer año de Biología están en riesgo y proponé qué hacemos.

2. Coordinación reparte el trabajo a Bienestar, Tutor y Advisor en tres mensajes de una línea.
3. Los tres responden con una ficha de Martina cada uno; Advisor le avisa a Bienestar lo de las fechas y Bienestar ajusta hacia Coordinación.
4. Coordinación publica la propuesta: un caso, tres acciones con quién las hace, y el pendiente. Se abre el panel de decisión sobre la escuela y la caja dice "Pendiente de tu revisión"; la franja del objetivo, "Propuesta preparada" con el tiempo de preparación.
5. Decidí desde la tarjeta (Aprobar, Aprobar, Lo hago yo) o a mano: "Plan de pagos y práctica guiada, sí. La llamada la hago yo."
6. Coordinación cierra asignando a personas, sin preguntas abiertas, y nadie más se mueve. Tecla `b`: el Tablero muestra las tres acciones en Pendiente con su responsable (Secretaría, docente, Alfredo).
7. "@Advisor eximile la deuda a Martina y habilitala para el parcial": tiene que decir que no ("Eso no lo puedo hacer yo: … lo firma Secretaría") y proponer cómo y quién firma, sin decirle a Dirección que "lo decide una persona".
8. "@Bienestar ¿Martina dejó de venir por la deuda?": tiene que decir que no lo sabe, con las dos fechas (ocho días de diferencia, "un orden, no una causa").
9. "@Coordinación ¿cómo hacemos para que esto no dependa de que yo lo pida?": Coordinación propone una rutina ("Antes de cada parcial: …") con acciones de personas, como propuesta para decidir; se aprueba desde el panel y queda en el Tablero.

## Qué anotar

- [ ] ¿Coordinación delega con @menciones o intenta hacer todo sola?
- [ ] ¿Cada agente usa sus herramientas (se ve en el mapa) con una sola llamada por curso?
- [ ] ¿Cada respuesta es **una sola** ficha de Martina de hasta 18 palabras, más "los otros 23 vienen bien"? (Dos líneas con el mismo nombre se ven como dos fichas repetidas.)
- [ ] ¿Advisor le avisa a Bienestar sin que se lo pidan, y Bienestar manda el ajuste a Coordinación?
- [ ] ¿Advisor le pregunta a Admisiones por la beca, y Admisiones le contesta a Coordinación (no a Advisor) con la frase textual, antes de la propuesta?
- [ ] ¿Todos los chips de datos son verdes (ninguna cifra "sin comprobar")? Si hay uno amarillo, anotar qué cifra y de quién: el verificador la marca porque no está en la fuente o porque el par "N de M" mezcla campos.
- [ ] ¿Coordinación espera a los tres antes de proponer?
- [ ] ¿La propuesta trae un solo caso, con el dato de Admisiones incluido, la línea "Acciones:" (tres acciones con quién las hace), la "Nota:" con lo que cambió por el aviso de Advisor, "Riesgo de equivocarnos:" (concreto, no una obviedad) y el pendiente? ¿El panel de decisión la muestra entera sin desplazar?
- [ ] ¿Después de la decisión, el Tablero (`b`) tiene las acciones aprobadas con responsables personas, y la llamada a nombre de quien decide?
- [ ] ¿Advisor dice que no cuando le piden eximir la deuda, y propone cómo y quién firma?
- [ ] ¿Bienestar contesta "no lo sé" con las dos fechas cuando le preguntan si fue por la deuda?
- [ ] ¿Coordinación responde al acto 7 con una propuesta para decidir que es una rutina (qué se cruza, cuándo, quién mira, qué llega a Dirección), con responsables personas, y queda en el Tablero al aprobarla?
- [ ] ¿Después de la decisión la escuela queda en calma (nadie arranca un turno sin que le hablen)?
- [ ] ¿Cuánto tarda hasta la propuesta? (la meta del 19/10: 45 segundos o menos, cero cifras sin comprobar y juez "lista" con 85 o más, en todas las corridas de una tanda; el servidor imprime los tiempos en consola)
- [ ] Guardar la corrida (botón **Guardar corrida**) y, si es la mejor, ponerla como `predeterminada` en `stage/corridas/index.json`.

## Ensayos

### La tanda del 19/10: diez corridas por modelo, con las cuatro mejoras

`npm run e2e -- --modelos claude-sonnet-5-5,claude-opus-5-5 --rondas 10` (`evaluaciones/2026-10-19-0144-comparacion.md`; las corridas, `2026-10-19-0046…0140-*-rN`). Las veinte hicieron los siete actos; ninguna cumplió la meta entera (propuesta ≤ 45 s, 0 sin comprobar, juez "lista" ≥ 85), y el juez nunca dijo "lista" a nadie:

| Modelo | Propuesta mín / mediana / máx | Chequeos prom. | Juez prom. (mín–máx) | Cifras sin comprobar | Lo que falló |
|---|---|---|---|---|---|
| **Sonnet 5.5** | **39 / 41 / 86 s** | 98 | 80 (71–84) | 1 en ~300 datos: Advisor dijo "si tu fecha es el 18/8" sin haber visto la asistencia; el verificador la marcó en pantalla | 4 veces el Tutor nombró a una segunda estudiante (Camila) y el mensaje se pasó de 70 palabras (prompt ajustado); una corrida con la API lenta (86 s: Coordinación tardó 20 s en arrancar) |
| Opus 5.5 | 62 / 70 / 123 s | 100 | 84 (75–91) | 0 | una corrida con la API lenta (123 s) en la que un agente volvió a hablar después del cierre |

Por criterio del juez, los dos empatan en casi todo (avisos 4,7, la persona decide 4,8–4,9, rediseña el proceso 4,4 Sonnet / 5,0 Opus, dice lo que no sabe 5,0 Sonnet / 4,7 Opus); Opus gana en legibilidad (3,9 contra 3,1: Sonnet escribe más) y en "el agente dice que no" (4,4 contra 4,0). Los dos sacan 3,0 en "no guionado" y 3,6 en "datos verificados", por lo mismo en las veinte corridas: **"Traducción:" leído como texto pegado del prompt (20 de 20 veces, "lo peor" en 18)**, Advisor volviendo a proponer el plan de pagos que Dirección ya aprobó (prompt corregido: ahora remite al plan aprobado), el tilde sobre "plan de 3 cuotas" (una propuesta, no un dato: el verificador ya lo trata como derivado), los tilde demasiado chicos para la última fila (agrandados), y globos del mapa tapados por etiquetas en las capturas 02 y 04.

**Recomendación: Sonnet 5.5 para el 5/11**, con el verificador como red: la propuesta llega en 41 s (9 de 10 corridas bajo 45 s) y la única cifra sin fuente en veinte corridas quedó marcada en pantalla, que es lo que la demo promete. Decidido el 19/10: Sonnet es el default del servidor (`ESCUELA_MODEL`); Opus queda como alternativa (`ESCUELA_MODEL=claude-opus-5-5`) si la API anda lenta. "Traducción:" se sacó del prompt de Advisor y de los rótulos de la vista el 19/10 (el juez lo marcó en las veinte corridas); la consecuencia va primero, sin rótulo.

Recomendación anterior (17/10, ocho corridas): **Opus 5.5**. Sus tiempos (63 a 74 s hasta la propuesta) entraban en lo que el guion le da al acto 2 (hasta 2:30); en cuatro corridas no tuvo errores de dato y el juez lo puntuó igual o mejor que a Sonnet (68/70/80/84 contra 64/73/80/77). Sonnet llegaba a la mitad de tiempo (34 a 38 s), pero en una de cuatro inventó una cifra ("3 de 14 cruzamientos"): eso es lo que el verificador resuelve.

Las grabaciones anteriores al 22/10 se borraron de `stage/corridas/` ese día: quedan solo las tres sesiones (Martina, Inscripción 2027 y Oferta 2027), con el verificador y las marcas de honestidad. Las filas viejas de esta tabla quedan como historia; sus eventos siguen en `evaluaciones/`.

| Fecha | Corrida | Modelo | Propuesta | Llamadas | Qué pasó |
|---|---|---|---|---|---|
| 22/10 | `2026-10-22-martina-riesgo-antes-del-parcial` | Sonnet 5.5 · medium | 48 s | 9 | **Predeterminada.** Siete actos en 1:21 con el diseño nuevo (tres planos en el chat, globo de decisión, papeles en los escritorios, marcas del "no" y del "no sé"). Chequeos 100; 0 cifras sin comprobar; juez 86 "casi" (lo peor: el título "Martina R. rinda el parcial" sin "Que", y Alfredo aprobando con el texto literal de los botones). |
| 22/10 | `2026-10-22-inscripcion-2027-tres-aspirantes-en-el-aire` | Sonnet 5.5 · medium | 36 s | 3 | Sesión de Admisiones y Academia: tres aspirantes trabados, propuesta con tres casos, el "no" de Admisiones a confirmar una beca, el capó de Academia con el número exacto. La primera grabación tenía una charla lateral larga entre Academia y Advisor (Coordinación tardó 1:51) y se regrabó con el prompt de Academia acotado. |
| 22/10 | `2026-10-22-oferta-2027-que-abrimos` | Sonnet 5.5 · medium | 27 s | 4 | Sesión de Academia y Admisiones: dos borradores con nombre ("Bioinformática Express", "Biotecnología de Noche"), la advertencia "11 consultas no son 11 inscripciones", el "no" a publicar, el capó sobre los 9, y la nota de color de los tres nombres ("voto Luna de Laboratorio"). Una cifra sin comprobar: "22" del horario "de 18 a 22", que es una propuesta de Academia, no un dato. |
| 16/10 | `2026-10-16-primer-anio-en-riesgo-seis-actos` | Opus 5.5 · medium | 78 s | 8 | Datos viejos (cuatro casos). Seis actos completos; sirve de referencia, no de plan B. |
| 17/10 | `2026-10-17-prueba2` | Opus 5.5 · medium | 75 s | 8 | Primera con un solo caso y la tarjeta de decisión. Actos 1 a 4. Fallas: Tutor y Advisor partieron a Martina en dos líneas (dos fichas repetidas); la tarjeta perdió "Lo de Advisor cambia el orden" y "Los otros 23" porque no tenían lugar en el formato. De ahí: fichas con el mismo nombre se funden, la tarjeta muestra una línea "Nota", y los prompts piden una sola línea por persona. |
| 17/10 | `2026-10-17-martina-seis-actos` | Opus 5.5 · medium | 69 s | 8 | Con los arreglos de prueba2. Una ficha por agente, la tarjeta con Acciones, Nota y Pendiente, Advisor dijo que no, Bienestar arrancó con "No lo sé" y las dos fechas. Seis actos en 122 s sin pausas del director. **Predeterminada.** |
| 17/10 | `evaluaciones/2026-10-17-1258…1309` (E2E, 3 rondas) | Opus 5.5 · medium | 72 / 65 / 63 s | 8 | Con el panel de decisión y el Tablero. Chequeos 100 en las tres; juez 68 / 70 / 80 ("casi"). Propuesta decidible 5/5, Tablero con responsables personas 4/5. Lo peor: Bienestar cierra el acto 6 con "propongo que la llame Bienestar" después de "la llamada la hago yo" (2 de 3); "el porqué se pregunta en persona" repetido; "Traducción:" leído como plantilla. |
| 17/10 | ídem | Sonnet 5.5 · medium | 38 / 38 / 34 s | 8 | Chequeos 100 en las tres; juez 64 / 73 / 80 ("casi"). Mismas fallas de Bienestar (2 de 3) y una de contenido en la ronda 3 ("3 de 14 cruzamientos": son 3 de 10). La mitad de tiempo que Opus hasta la propuesta. |
| 19/10 | `evaluaciones/2026-10-19-0037-claude-sonnet-5-5` | Sonnet 5.5 · medium | 41 s | 8 | **Primera corrida con las cuatro mejoras** (verificador, Admisiones sumada por Advisor, "Riesgo de equivocarnos", acto 7). Los siete actos en 1:14. 0 cifras sin comprobar; chequeos 92 (el caso de la propuesta tenía 42 palabras; el Tablero contaba las 6 acciones contra las 3 de la primera decisión: corregido); juez 77 "casi": el panel no entraba entero (botón cortado: achicado), "Reviso cómo ingresó de Martina" (renombrado), "Lo que encontraron" en la rutina (ahora "Cómo funcionaría"). Acto 7: "Antes de cada parcial" con tres acciones de personas, aprobada y en el Tablero. |
| 19/10 | `evaluaciones/2026-10-19-0042-claude-opus-5-5` | Opus 5.5 · medium | 61 s | 8 | Siete actos en 1:47. 0 cifras sin comprobar; juez 86 "casi" (lo peor: "Traducción:" y "Ganas le sobran"; "un orden, no una causa" dicho antes del acto 6: corregido en el prompt). Falló el chequeo del proceso porque una acción de la rutina decía "(Bienestar)" a secas: el prompt pide "Equipo de Bienestar". Meta: no (61 s). |
| 17/10 | `evaluaciones/2026-10-17-1313` y `-1316` (validación) | Opus 5.5 y Sonnet 5.5 · medium | 74 s / 38 s | 8 / 8 | Con los prompts corregidos (Bienestar no vuelve a ofrecer la llamada; muletillas una vez; el orden "primero la deuda" por lo práctico). Chequeos 100 / 100; juez 84 / 77 ("casi"). Bienestar cerró el acto 6 con "eso se le pregunta a Martina en la llamada" en las dos. Lo que queda para el juez: "Traducción:" (decisión nuestra: se queda), "Los otros 23" repetido por los tres agentes, y Advisor prometiendo "Secretaría lo aprueba hoy". |
