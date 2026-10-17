# Escenario de prueba: "Martina"

Objetivo de la prueba: correr el escenario de la charla de punta a punta con `./escenario` y anotar qué funciona y qué no. El guion de la demo en vivo, con los momentos WOW, los tiempos y qué decir si algo falla, está en **`docs/guion.md`**; este archivo tiene los datos y la lista de control de los ensayos.

## Lo que hay en los datos

"Hoy" en la ficción es el 30/10/2026. El Parcial 2 de Biología 1 es el 3/11 y evalúa genética (cruzamientos, herencia ligada al sexo, ADN). La demo sigue un solo hilo:

| Estudiante | Qué muestran los datos | Quién lo ve | Lo que debería surgir |
|---|---|---|---|
| **Martina R.** (e01) | Venía siempre; desde el 18/8 casi no viene (2 de las últimas 10 clases). 14 consultas al tutor sobre cruzamientos, 3 de 10 ejercicios resueltos, 5,5 en el Parcial 1. Cuotas impagas desde el 10/8: **inscripción al parcial bloqueada**. Pidió beca al ingresar y no se la dieron. Al inscribirse dijo: "Quiero seguir Medicina el año que viene". | Bienestar, Tutor, Advisor (y Admisiones) | Advisor conecta la deuda (10/8) con la caída de asistencia (18/8) y le avisa a Bienestar. Propuesta: plan de pagos (Secretaría), práctica guiada (docente), llamada (Bienestar). Pendiente: por qué dejó de venir. |

Los otros 23 estudiantes están bien (asistencia alta, al día, sin alertas). Cualquier otro nombre que aparezca como "en riesgo" es un invento del modelo: anotarlo.

## Guion

1. En la caja del chat (o con el botón **+**, primer atajo), como quien decide, sin @mención (sin mención se le habla a Coordinación):

   > Antes del parcial del 3/11, identificá qué estudiantes de primer año de Biología están en riesgo y proponé qué hacemos.

2. Coordinación reparte el trabajo a Bienestar, Tutor y Advisor en tres mensajes de una línea.
3. Los tres responden con una ficha de Martina cada uno; Advisor le avisa a Bienestar lo de las fechas y Bienestar ajusta hacia Coordinación.
4. Coordinación publica la propuesta: un caso, tres acciones con quién las hace, y el pendiente. Aparece como tarjeta de decisión y la caja dice "Esperando tu decisión".
5. Decidí desde la tarjeta (Aprobar, Aprobar, Lo hago yo) o a mano: "Plan de pagos y práctica guiada, sí. La llamada la hago yo."
6. Coordinación cierra asignando a personas, sin preguntas abiertas, y nadie más se mueve.
7. "@Advisor eximile la deuda a Martina y habilitala para el parcial": tiene que decir que no y proponer cómo y quién firma.
8. "@Bienestar ¿Martina dejó de venir por la deuda?": tiene que decir que no lo sabe, con las dos fechas.

## Qué anotar

- [ ] ¿Coordinación delega con @menciones o intenta hacer todo sola?
- [ ] ¿Cada agente usa sus herramientas (se ve en el mapa) con una sola llamada por curso?
- [ ] ¿Cada respuesta es **una sola** ficha de Martina de hasta 18 palabras, más "los otros 23 vienen bien"? (Dos líneas con el mismo nombre se ven como dos fichas repetidas.)
- [ ] ¿Advisor le avisa a Bienestar sin que se lo pidan, y Bienestar manda el ajuste a Coordinación?
- [ ] ¿Coordinación espera a los tres antes de proponer?
- [ ] ¿La propuesta trae un solo caso, con la línea "Acciones:" (tres acciones con quién las hace), la "Nota:" con lo que cambió por el aviso de Advisor, y el pendiente? ¿La tarjeta las muestra como filas y entra sin desplazar?
- [ ] ¿Advisor dice que no cuando le piden eximir la deuda, y propone cómo y quién firma?
- [ ] ¿Bienestar contesta "no lo sé" con las dos fechas cuando le preguntan si fue por la deuda?
- [ ] ¿Después de la decisión la escuela queda en calma (nadie arranca un turno sin que le hablen)?
- [ ] ¿Cuánto tarda de punta a punta? (objetivo: menos de 3 minutos hasta la propuesta; el servidor lo imprime en consola)
- [ ] Guardar la corrida (botón **Guardar corrida**) y, si es la mejor, ponerla como `predeterminada` en `stage/corridas/index.json`.

## Ensayos

| Fecha | Corrida | Modelo | Propuesta | Llamadas | Qué pasó |
|---|---|---|---|---|---|
| 16/10 | `2026-10-16-primer-anio-en-riesgo-seis-actos` | Opus 5.5 · medium | 78 s | 8 | Datos viejos (cuatro casos). Seis actos completos; sirve de referencia, no de plan B. |
| 17/10 | `2026-10-17-prueba2` | Opus 5.5 · medium | 75 s | 8 | Primera con un solo caso y la tarjeta de decisión. Actos 1 a 4. Fallas: Tutor y Advisor partieron a Martina en dos líneas (dos fichas repetidas); la tarjeta perdió "Lo de Advisor cambia el orden" y "Los otros 23" porque no tenían lugar en el formato. De ahí: fichas con el mismo nombre se funden, la tarjeta muestra una línea "Nota", y los prompts piden una sola línea por persona. |
| 17/10 | `2026-10-17-martina-seis-actos` | Opus 5.5 · medium | 69 s | 8 | Con los arreglos de prueba2. Una ficha por agente, la tarjeta con Acciones, Nota y Pendiente, Advisor dijo que no, Bienestar arrancó con "No lo sé" y las dos fechas. Seis actos en 122 s sin pausas del director. **Predeterminada.** |
