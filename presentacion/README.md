# La charla: láminas + demo embebida

App aparte de la demo: la presentación de 30 minutos de **"Institución Agéntica"** (nació del deck en claude.ai; desde el ensayo del 3/11 con Greyla la versión que manda es esta, 21 láminas) con la vista de Escuela Futura embebida en el lugar de la demo, para que slides y demo sean una sola cosa en pantalla. Mismo stack que la demo: Node sin dependencias, HTML y JS a mano, todo local (fuentes y logos incluidos: no necesita red).

Desde el 4/11 la charla transcurre **adentro de la escuela**: detrás de las láminas hay una escena (`escena/`), la misma escuela de la demo vista de perfil en pixel-art HD-2D, con los agentes caminando; el texto va sobre una placa plana que mide el texto de cada lámina, y la demo entra con un giro de cámara. Plan y contrato: `docs/inmersiva.md` y `escena/CONTRATO.md`.

## Abrir

Desde la raíz del repo: `./charla` (= `node presentacion/servidor.mjs`). Abre `http://localhost:8090/`. Si la escuela (`./escenario`) no está corriendo, la levanta ella misma en el 8080 y espera a que responda antes de abrir el navegador, para que la vista embebida arranque **en vivo**. Flags: `--puerto N`, `--puerto-escuela N`, `--sin-navegador`, `--sin-escuela` (solo láminas: la demo reproduce la grabación). Ctrl+C corta las dos.

Los parámetros de la vista que vengan en la URL de la charla pasan a la escuela: `http://localhost:8090/?nombre=Greyla&ritmo=pausado`. `#id` o `?lamina=N` abren en una lámina (`http://localhost:8090/#demo`); el `#` se actualiza al navegar, así que recargar no pierde el lugar. **Plan B dentro de la app:** `?sin-escena=1` apaga la escena y deja la charla exactamente como el tag `plan-b-2026-11-05`; `?plano=1` apaga el HD-2D (sin desenfoque ni luces, giro como fundido); `?mudo=1` arranca sin sonido. Si la escena falla al cargar o en vivo, se apaga sola y la charla sigue.

## Teclas

| Tecla | Hace |
|---|---|
| `→` `espacio` `PageDown` · clic | próximo paso de la lámina; cuando no quedan, la lámina siguiente |
| `←` `PageUp` | deshace el paso; al principio de la lámina, vuelve a la anterior (completa) |
| `d` | trae o esconde la demo (la escuela en vivo) sobre la lámina actual |
| `n` | abre la **vista del presentador** (otra ventana: lámina actual y siguiente, notas, reloj y plan de tiempos) |
| `t` | reinicia el reloj de la charla (arranca solo al salir de la portada) |
| `f` | pantalla completa |
| `m` | silencia el sonido de la escena (timbre, luces, motivo de la esfera, giro, campana de la propuesta) |
| `Inicio` `Fin` | primera / última |
| `?` | ayuda |

**Con la demo en pantalla** las teclas son de la escuela (`b` Tablero, `o` organigrama, `c` chat, `t` tema, `Enter` escribe, `Escape` vuelve al plano). Para seguir con las láminas: `PageDown` (lo que manda un clicker), `Shift+→` o `d`. `f` sigue siendo pantalla completa de la charla.

## Cómo está armado

- `servidor.mjs`: sirve esta carpeta y reenvía `/stage/*` y `/api/*` al servidor de la escuela (**mismo origen**: la vista va en un iframe y las teclas de la charla siguen andando adentro; el SSE de `/api/eventos` pasa encadenado). Si la escuela no responde, `/stage/*` se sirve desde el repo y la vista cae sola a la corrida grabada (plan B); `/api/*` contesta 502.
- `index.html` + `reproductor.js` + `estilo.css`: el reproductor (con el número de lámina, solo el número, fijo abajo a la derecha). **Pasos:** un elemento con `data-paso="N"` queda oculto hasta el clic N de su lámina (fundido corto y un leve ascenso); el presentador muestra en qué paso va. `tesis` no tiene pasos a propósito. Carga `deck.json` y `slides/<id>.html`, que están **en el formato del tipo Slides de claude.ai** (una `<section>` de 1920×1080 con estilos en línea, `<aside>` con las notas, `<x-embed>` para el orb animado, `<x-shape>`, `<x-icon>`). El reproductor los traduce a HTML común (iframe aislado para el embed, SVG para el ícono, píldoras, el orden de pintado del formato) y escala el lienzo a la ventana. Fundido entre láminas.
- `slides/vivo.html` es la lámina de la demo (`data-demo`): cuando está en pantalla, la escuela (iframe `/stage/`, cargado desde el arranque para que esté conectada) se muestra a pantalla completa sobre el lienzo. Va justo después de `escuela`. El objetivo se manda en vivo, en escena, después de recorrer el organigrama y la ficha de un agente (ver las notas de `vivo`).
- `presentador.html`: vista del presentador; se sincroniza con la principal por `BroadcastChannel` (también navega desde ahí).
- `escena/`: la escena detrás de las láminas. `escena.js` orquesta; `camara.js` (los seis planos), `edificio.js` (la escuela de perfil derivada del plano de la demo), `gente.js` (los sprites de Pixel Agents de perfil, Sofía, el aula), `luz.js` (HD-2D), `giro.js` (perfil → cenital), `sonido.js` (seis señales sintetizadas). Cada lámina declara su puesta en escena con `data-escena` y `data-placa` (`CONTRATO.md` §3.4). `banco.html` monta la escena sola (`?plano=hall&sofia=camina`); `capturas.mjs` saca las 21 láminas a 1920×1080 en `evaluaciones/escena/`.
- `assets/`: Outfit y JetBrains Mono (OFL), los dos logos de la portada y las fotos de Greyla y Alfredo (`greyla.jpg`, `alfredo.jpg`) para la lámina `equipo`.
- `servidor.test.mjs`: tests del deck (índice y láminas) y del servidor (estáticos, proxy, plan B); `escena.test.mjs`: el contrato de la escena, las 21 láminas, la cámara, la gente simulada, el giro y la campana con DOM falso. Corren con `npm test`.

## Cambiar las láminas

Las láminas se editan acá (`slides/<id>.html`, formato del tipo Slides de claude.ai: una `<section>` de 1920×1080 con estilos en línea y las notas en `<aside>` al final). Una lámina nueva se suma a `order` en `deck.json`. El deck de claude.ai (ver `docs/deck/README.md`) quedó atrás desde el 3/11: `equipo` y `agente` son nuevas, `demo`, `mitad` y `límite` se sacaron, y cambiaron `entrevista`, `escuela`, `aula`, `criterio`, `recibe` y el orb; si hace falta volver a tenerlo al día, se copian estos archivos para allá.
