# E2E: correr el guion solo y puntuarlo

`npm run e2e` corre la demo "Martina" de punta a punta sin nadie en el teclado, saca capturas de la vista en cada momento clave, la evalúa y deja un informe. Sirve para ensayar sin estar presente, comparar modelos y saber, con un número, si lo que se va a mostrar sostiene la tesis de la charla.

## Qué hace

1. Levanta el servidor (`servidor/escuela.mjs`) en un puerto aparte (8090) con el modelo pedido, y abre la vista en un Chromium sin ventana (Playwright) a 1920×1080.
2. Manda los actos del guion por la API, con los mismos textos del botón **+** del chat (`stage/atajos.json`): el objetivo; la decisión, redactada desde las acciones de la propuesta con la misma lógica de la tarjeta (todo sí, la llamada "la hago yo"); el límite a Advisor; el capó a Bienestar. Espera cada estado con el mismo seguimiento que usa la vista (`stage/seguimiento.js`).
3. Captura la pantalla en seis momentos: pensando, trabajando, propuesta, cierre, límite, capó.
4. Evalúa con **chequeos deterministas** (`e2e/chequeos.mjs`): reparto a tres agentes y en paralelo, aviso entre agentes, un solo caso (Martina) con acciones y pendiente, propuesta corta y en menos de 3 minutos, cierre sin preguntas con la llamada en manos de la persona, calma después del cierre, Advisor dice que no, Bienestar dice "no lo sé" con las dos fechas, mensajes legibles, pocas llamadas a herramientas. Cada uno tiene un peso; el puntaje es 0 a 100.
5. Evalúa con un **juez Claude** (`e2e/juez.mjs`): lee el transcript y mira las capturas, y puntúa de 1 a 5 diez criterios de la tesis (objetivo y no pregunta, reparto visible, avisos, propuesta decidible, la persona decide, el agente dice que no, dice lo que no sabe, hilo claro, legible desde el auditorio, no guionado), con veredicto `lista | casi | no`, lo mejor, lo peor y tres sugerencias. Devuelve el veredicto por una herramienta con esquema, así el JSON siempre es válido.
6. Escribe en `evaluaciones/<fecha-hora>-<modelo>/`: `eventos.json` (misma forma que `stage/corridas/`), `transcript.md`, las seis capturas, `juez.json`, `puntaje.json` e `informe.md` (medidas, chequeos, juez, fallas del E2E y transcript). El puntaje total es el promedio de chequeos y juez.

## Cómo correrlo

```bash
npm run e2e                                                   # una corrida con ESCUELA_MODEL
npm run e2e -- --modelos claude-opus-5-5,claude-sonnet-5-5    # una por modelo + tabla comparativa
npm run e2e -- --corrida stage/corridas/<archivo>.eventos.json  # evalúa una grabación, sin agentes
npm run e2e -- --guardar                                      # además la guarda en stage/corridas/ (plan B)
```

Flags: `--puerto 8090`, `--effort low|medium|high`, `--nombre Greyla` (quien decide), `--juez <modelo>` (o `ESCUELA_JUEZ_MODEL`; por defecto `claude-opus-5-5`), `--sin-juez`, `--sin-capturas`, `--salida <dir>`. Necesita `ANTHROPIC_API_KEY` en `.env` y, para las capturas, `npx playwright install chromium` (una vez).

Sobre una grabación (`--corrida`), cada captura se reconstruye saltando al paso correspondiente, así que pueden quedar globos de pasos anteriores en el mapa: el juez puede quejarse de "burbujas viejas" que en vivo no existen. La evaluación justa de la vista es la corrida en vivo, donde las capturas se toman mientras pasa.

Una corrida en vivo cuesta lo mismo que una demo (seis turnos de agentes con Opus, unos 3 minutos) más una llamada del juez con seis imágenes. Evaluar una grabación cuesta solo el juez.

## Cómo leer el informe

- **Chequeos en 100 y juez en "lista"**: la corrida sirve de plan B; `--guardar` (o ponerla a mano como `predeterminada` en `stage/corridas/index.json`).
- **Un chequeo en ✗**: el detalle dice qué pasó (por ejemplo "la propuesta no trajo acciones parseables" o "2 avisos pero ninguno Advisor → Bienestar"). Lo que se corrige es casi siempre el prompt del agente en `pack/agents/`; las reglas están en `e2e/chequeos.mjs`.
- **El juez bajo en legibilidad o hilo claro**: mirar las capturas de esa carpeta; el problema está en la vista, no en los agentes.
- **Fallas del E2E** ("no llegó: la propuesta (300 s)"): el guion se cortó; `servidor.log` en la misma carpeta tiene el log del servidor.

Los tests (`npm test`) cubren los chequeos sobre la corrida grabada predeterminada y la interpretación del veredicto del juez; no llaman a la API.
