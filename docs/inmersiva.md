# La charla inmersiva: plan completo de construcción

Qué se construye: la charla transcurre **adentro de Escuela Futura**. Las 21 láminas se apoyan sobre la escuela vista de perfil (casa de muñecas), en pixel-art HD-2D con los mismos sprites y la misma paleta de la demo; la demo es la misma escuela vista desde arriba, y se entra con un giro de cámara, no con un fundido. El texto siempre va sobre una placa plana; la escena sigue viva detrás. Decisiones del 3/11 (maqueta: https://claude.ai/artifact/CE1cFegiNUPZHgddgb5oox).

Lo que no cambia: los textos, los pasos y los tiempos de las 21 láminas (`presentacion/slides/`, `deck.json`), el servidor de la charla, los agentes y el bus. El plan B es el tag `plan-b-2026-11-05` (`docs/plan-b.md`) y se desarrolla sin tocarlo: todo va en la rama `inmersiva` y se mezcla a `main` cuando pasa el ensayo. Se construye **todo**: este documento tiene lo necesario para hacerlo con subagentes, de punta a punta.

## 1. Principios

1. **El texto manda.** Placa plana; la escena a un costado, nítida pero secundaria. Mientras la sala lee, la escena no empieza nada nuevo: primero se asienta el plano, después entra el texto, y los agentes vuelven a caminar cinco segundos más tarde. En las láminas que son listas (ranking, datos, agente, criterio), la escuela queda quieta.
2. **Cada cambio tiene una razón.** La escena cambia solo cuando cambia el lugar o la hora del relato; varias láminas seguidas van sobre la misma escena sin que la cámara se mueva. La placa cambia de lado solo con un cambio de plano: izquierda por defecto, abajo en tesis y cierre, derecha en Dirección.
3. **Un solo mundo.** El edificio de perfil es el mismo plano de `stage/oficina.js` visto de costado: la fila de arriba del plano es la planta alta, la de abajo la planta baja, el pasillo es el hall con la escalera. Mismos sprites, misma paleta.
4. **Diseñado para 4×2 m comprimidos.** Contraste alto, cuerpo de 40 px o más sobre escena, nada importante en los medios tonos. Se prueba con el proyector, no con el monitor.
5. **El operador no se pierde.** Las mismas teclas que hoy; `m` silencia; `?plano=1` apaga el HD-2D; `?sin-escena=1` apaga el mundo entero y queda el plan B dentro de la misma app.

## 2. Arquitectura y archivos

Todo vive en `presentacion/`. El servidor de la charla no cambia: ya sirve `/stage/*` por el mismo origen, así que la escena importa `/stage/personajes.js` y `/stage/oficina.js` directamente. Los módulos nuevos son `.js` (el servidor no sirve `.mjs` salvo `reproductor.js`); los tests, `.test.mjs` en `presentacion/`, que es donde los recoge `npm test`.

```
presentacion/
  index.html            + <canvas id="ui-escena"> debajo del lienzo, <div id="ui-placa">, el giro, teclas m / ?plano / ?sin-escena
  presentador.html      + el plano actual y la escena en miniatura
  escena/
    CONTRATO.md         lo que fija la sección 3, en el repo, para los agentes
    edificio.js         el mundo lógico: dos plantas derivadas de SALAS de oficina.js, hall, fachada, patio, capas lejana y cercana
    gente.js            agentes y Sofía de perfil: rutas entre salas por planta, globos, pasos, la gente del aula, los cinco focos
    camara.js           los seis planos con nombre, la interpolación, el travelling de Sofía, el corrimiento por placa
    luz.js              HD-2D: lámparas, ventanas, haces, desenfoque por capas, tilt-shift, viñeta, grading; degradación por FPS
    giro.js             perfil → cenital y la vuelta
    sonido.js           seis señales sintetizadas con WebAudio
    escena.js           orquesta: lee data-escena y data-placa, interpola el estado, dibuja, pausa cuando la demo está en pantalla
    banco.html          banco de pruebas: un módulo solo, con el resto en relleno
    capturas.mjs        script Playwright: las 21 láminas a 1920×1080 (y el banco), para revisar y para la crítica
  escena.test.mjs       tests del contrato y de las láminas
stage/
  index.html            (oleada 4) + <canvas id="luz"> sobre #lienzo con la misma luz.js, tecla para apagarla
```

## 3. El contrato

Se escribe antes de repartir, en `presentacion/escena/CONTRATO.md`, con este contenido. Cada agente construye contra esto; si no le alcanza, lo reporta y lo cambia el hilo principal.

### 3.1 Coordenadas

- **Mundo lógico**: 640×288 px. A zoom 1, cada píxel lógico son **3 píxeles de pantalla** (1920 = 640×3; 288×3 = 864, centrado en 1080 con cielo arriba y patio abajo). El mundo se dibuja a S píxeles por píxel lógico (S entero según el tamaño real de la pantalla, como en `oficina.js`) sin suavizado, y las capas de luz se dibujan a resolución de pantalla.
- **El edificio** ocupa x 120..520 (400 px, el ancho del plano de la demo). **Planta baja**: piso (pies) en y=228, techo en y=152. **Planta alta**: pies en y=148, techo en y=72. Azotea 64..72. Calle y patio: y 230..288. Cielo arriba de 64.
- **Salas de perfil**, derivadas de `SALAS` de `/stage/oficina.js` (cada lugar trae `fisica` con `x0`, `ancho`, `arriba`): la fila de arriba del plano (`p1` Dirección y Coordinación, `p2` Secretaría y Admisiones) es la **planta alta**, en el mismo orden de izquierda a derecha y con los mismos anchos (x = 120 + x0 − 8); la fila de abajo (`p3` Aula de Biología 1, `p4` Bienestar y Biblioteca) es la **planta baja**. El **hall** con la escalera ocupa el hueco entre `p1`/`p2` y entre `p3`/`p4` (x 302..318 arriba; abajo, el espacio entre el aula y Bienestar, x 334..350) y conecta las plantas; la **puerta de calle** está en la planta baja a x 334..350. Los puestos de cada sala (Dirección, Coordinación, Secretaría, Admisiones, Bienestar, Biblioteca) son escritorios en el mismo orden que en el plano.
- **La cámara** es `{ x, y, zoom }` en coordenadas del mundo (el punto del mundo que va al centro de la pantalla). `aPantalla(wx, wy) → [px, py, s]` es la única conversión y vive en `camara.js`. Con placa, la escena se corre: +440 px de pantalla con placa a la izquierda, −440 con placa a la derecha, −150 en y con placa abajo.
- **Capas y paralaje**: lejana (cerros, árboles) con factor 0,45; principal 1; cercana (reja, farolas, hojas) 1,5. La cercana solo se ve con fachada puesta (afuera).

### 3.2 El estado

Un objeto plano que `escena.js` interpola cuadro a cuadro hacia el objetivo de la lámina y pasa a cada módulo. Nadie lo muta salvo `escena.js`.

```js
{
  plano: 'fachada'|'hall'|'edificio'|'aula'|'oficina'|'patio',
  camx, camy, zoom,                 // de camara.js (PLANOS + parámetros de la lámina)
  hora: 0..1,                       // 0 atardecer · .5 noche · 1 mañana (cielo, ventanas, lámparas)
  fachada: 0..1,                    // 1 pared de frente puesta · 0 casa de muñecas
  luzInterior: 0..1,                // lámparas de las salas
  sofia: null|'entra'|'camina'|'puerta'|'sale', sofiaK: 0..1,
  manos: 0..1,                      // gente del aula con la mano levantada
  vacia: bool,                      // el aula sin gente
  quieto: bool,                     // nadie camina (láminas que son listas)
  foco: null|'rol'|'skills'|'herramientas'|'memoria'|'autonomia',   // el agente de Coordinación en "agente"
  oficina: 'coordinacion'|'direccion',
  esfera: { on: bool, x, y, r },    // el tercer invitado, en coordenadas de pantalla
  pausaLectura: 0..1,               // 1 = acaba de entrar texto: nadie empieza nada nuevo
  paso: n,                          // el paso actual de la lámina
  hd: bool, placa: 'izq'|'der'|'abajo'|'ninguna', placaClara: bool,
}
```

### 3.3 Los planos (`camara.js`)

| Plano | camx | camy | zoom | hora | fachada | Notas |
|---|---|---|---|---|---|---|
| fachada | 320 | 160 | 1 | 0 | 1 | el edificio entero de frente, con cielo y calle |
| hall | 326 | 190 | 2.3 | .15 | 0 | el hall de planta baja; Sofía entra por la puerta |
| edificio | 320 | 150 | .85 | según lámina | 1 | el edificio entero, un poco más lejos |
| aula | 180 | 190 | 2 | .25 | 0 | el aula de Biología 1 |
| oficina | según `oficina` | 110 | 2.4 | .55 | 0 | Coordinación (planta alta, izquierda) o Dirección (planta alta, extremo izquierdo) |
| patio | 400 | 200 | 1.6 | 1 | 1 | la puerta de calle y el patio hacia la derecha |

El travelling de Sofía (`hall`, `sofia: 'camina'`): camx va de 290 a 420 a lo largo de las cuatro láminas de Sofía, proporcional a `sofiaK`, que avanza con las láminas (sofia 0..0,25; chatgpt 0,25..0,5; carrera 0,5..0,85; entrevista 0,85..1) y no con el tiempo, así la cámara nunca se le adelanta al relato.

### 3.4 Lo que declara cada lámina

`data-escena` (JSON con claves del estado; lo que falta hereda del plano) y `data-placa` (`izq|der|abajo|plena|ninguna`, más `clara` cuando la lámina es de fondo claro y `propia` cuando la placa toma el fondo de la lámina; `plena` es la placa entera al 86 % para las láminas que son listas o texto centrado). La placa toma el color base del deck: oscura `#0B0920`, clara `#F3F0FF`; en `tesis` la banda de abajo lleva el degradado propio de la lámina. Los pasos (`data-paso`) se publican en `estado.paso` y la escena reacciona donde se indica.

| # | Lámina | `data-escena` | `data-placa` | Qué pasa |
|---|---|---|---|---|
| 1 | cover | `{"plano":"fachada","hora":0}` | izq | ventanas prendiéndose; la esfera es la del deck, en la propia lámina |
| 2 | equipo | `{"plano":"fachada","hora":0.05,"zoom":1.4,"camx":340,"camy":200}` | izq | la cámara se acerca a la puerta |
| 3 | sofia | `{"plano":"hall","sofia":"entra","esfera":true}` | izq | Sofía entra por la puerta y arranca; las marcas 2022 · 2024 · 2026 están en la pared del hall; la esfera se encoge en la marca de 2022 |
| 4 | chatgpt | `{"plano":"hall","sofia":"camina"}` | izq | sigue el travelling |
| 5 | carrera | `{"plano":"hall","sofia":"camina"}` | izq | sigue; los pasos de la lámina (2024, 2026) adelantan `sofiaK` |
| 6 | entrevista | `{"plano":"hall","sofia":"puerta","quieto":true}` | plena | Sofía al final del pasillo, de espaldas a la cámara, mirando la puerta |
| 7 | primera-vez | `{"plano":"edificio","hora":1}` | izq clara | amanece: el cambio de luz de las notas, literal |
| 8 | ranking | `{"plano":"edificio","hora":0.5,"quieto":true}` | plena | quieto; de noche, como su lámina |
| 9 | manos | `{"plano":"aula","manos":"pasos"}` | izq | las manos suben con los pasos de la lámina (paso 1: todas, mientras la sala tiene la mano arriba; paso 2: bajan, quedan pocas) |
| 10 | datos | `{"plano":"aula","zoom":1.6,"quieto":true}` | plena | quieto, un poco más lejos |
| 11 | tesis | `{"plano":"edificio","hora":0.5,"luzInterior":1}` | abajo propia | todas las ventanas encendidas |
| 12 | capo | `{"plano":"edificio","hora":0.5,"zoom":1.05,"fachada":0}` | izq | la fachada se desvanece al entrar: casa de muñecas con los seis trabajando |
| 13 | agente | `{"plano":"oficina","oficina":"coordinacion","foco":"pasos"}` | izq | paso 1 rol (el agente se ilumina), 2 skills (el estante), 3 herramientas (la pantalla), 4 memoria (el cuaderno), 5 autonomía (se levanta y va a otra sala) |
| 14 | escuela | `{"plano":"edificio","hora":0.5,"zoom":1.05,"fachada":0}` | izq | mismo plano que capo, sin movimiento |
| 15 | vivo | `{"plano":"edificio","hora":0.5,"zoom":1.05,"fachada":0,"giro":true}` | ninguna | el giro |
| 16 | decision | `{"plano":"oficina","oficina":"direccion","hora":0.95,"camx":185}` | der clara | la persona en el escritorio; un agente en la puerta con el papel |
| 17 | aula | `{"plano":"aula","hora":0.2,"manos":0,"quieto":true,"vacia":true}` | izq | la misma aula, vacía, luz de la tarde |
| 18 | criterio | `{"plano":"edificio","hora":0.5,"zoom":1.05,"fachada":0,"quieto":true}` | plena | el edificio abierto, quieto |
| 19 | recibe | `{"plano":"patio","sofia":"sale"}` | izq | Sofía sale por la puerta y cruza hacia fuera de cuadro; la esfera en la marca de 2026 |
| 20 | cierre | `{"plano":"fachada","hora":0.85}` | izq | el mismo encuadre que la portada; la esfera se expande |
| 21 | gracias | `{"plano":"fachada","hora":0.5,"luzInterior":1}` | izq | ventanas prendidas durante las preguntas |

Las láminas de fondo claro (primera-vez, ranking, decision) llevan placa clara y escena de día. Tesis mueve su bloque de texto al pie para la placa de abajo; decision se alinea a la derecha; primera-vez, manos y aula angostan el texto para que quede sobre la placa; y el año o la palabra gigante de fondo del deck (sofia, chatgpt, recibe) lleva `data-marca-agua` y no se ve con escena. Es layout, no contenido. Lo que trajeron los módulos reales está en `presentacion/escena/CONTRATO.md`, "Ajustes de la oleada 1".

### 3.5 Las firmas

```js
// edificio.js
export const MUNDO = { W: 640, H: 288, PB: 228, PA: 148, X0: 120, X1: 520 };
export const PLANTAS;   // [{ id, nombre, x, w, planta: 'alta'|'baja', fisica, puestos: [{ id, x }] }] derivadas de SALAS
export function crearEdificio(paleta) → { dibujarFondo(ctx, estado), dibujarInterior(ctx, estado), dibujarFachada(ctx, estado), capaLejana(ctx, estado), capaCercana(ctx, estado), ventanas(estado) → [{ x, y, w, h }], lamparas(estado) → [{ x, y, r }], cielo(hora) → [arriba, medio, horizonte] }
// gente.js
export async function crearGente({ cargarImagen, plantas }) → { tick(dt, estado), dibujar(ctx, estado), focoEn(estado) → { x, y } | null, agentes, sofia, aulaGente }
// camara.js
export const PLANOS;
export function crearCamara() → { ir(objetivo), tick(dt) → estadoParcial, aPantalla(wx, wy) → [px, py, s], corrimiento(placa) → [dx, dy] }
// luz.js
export function crearLuz(canvas) → { render({ mundo, fachada, capas, estado, aPantalla, ventanas, lamparas, foco }), medirFps(dt), hd, degradado }
// giro.js
export function crearGiro({ canvasEscena, capaDemo, duracion: 900 }) → { aCenital() → Promise, aPerfil() → Promise, enCurso }
// sonido.js
export function crearSonido() → { timbre(), luces(), motivo(sube), giro(), tic(), campana(), silenciar(si), activo, habilitar() }
// escena.js
export async function crearEscena({ canvas, placa, laminas, demo, opciones: { hd, sinEscena, mudo } }) → { ir(lamina, paso, { instantaneo }), paso(n), demo(si) → Promise, pausar(si), tecla(k) → bool, estado() }
```

### 3.6 El banco de pruebas (`banco.html`)

Una página servida por el mismo servidor (`http://localhost:8091/escena/banco.html` con `--sin-escuela`) que monta un módulo con el resto en relleno: `?modulo=edificio|gente|luz|giro|sonido&plano=hall&hora=.5&fachada=0&hd=1&sofia=camina&foco=skills&manos=1&quieto=1`. Dibuja a 1920×1080 y expone `window.banco.estado` para que Playwright pueda fijar un estado y capturar. Es lo que cada agente usa para verse sin la app entera.

### 3.7 Reglas para todos los agentes

- Cada agente es dueño de archivos concretos y **no toca otros**; si necesita algo de un archivo ajeno, lo pide en el reporte.
- Nadie commitea: el hilo principal integra, corre `npm test` y commitea.
- Verificación propia: `node --test presentacion/escena.test.mjs`, y capturas con Playwright desde el scratchpad (`import { chromium } from '<raíz>/node_modules/playwright/index.mjs'`), contra `node presentacion/servidor.mjs --sin-escuela --sin-navegador --puerto 8091` (el 8090 y el 8080 son de la app real, que puede estar corriendo).
- Reporte en tres partes: qué quedó (con las capturas), qué del contrato no alcanzó y qué propone, y qué queda pendiente.
- Español rioplatense en código y comentarios, como el resto del repo. Sin dependencias nuevas.

## 4. Especificaciones por módulo

### edificio.js
- Deriva `PLANTAS` de `SALAS` de `/stage/oficina.js` (los lugares traen `fisica`); importa `TEMAS` de ahí y usa la paleta oscura (paredes, zócalos, madera, papel). Los pisos de cada sala usan los colores `piso` de su `fisica`.
- Interior por sala: pared de fondo, zócalo, ventana al fondo (del color del cielo según `hora`), lámpara en el techo, muebles de perfil según el lugar: escritorio con pantalla y silla en los puestos; en el aula, pupitres en fila y pizarrón; en la biblioteca, estantes; en el hall, la escalera entre plantas, el mostrador y, en la pared, la línea de tiempo con tres marcas (sin texto: los años los pone la lámina).
- Fachada: pared de frente con ventanas (una por puesto), la puerta de calle, el cartel "ESCUELA FUTURA" (dibujado con píxeles o con `fillText` a 8 px de Silkscreen, que está en `/stage/assets/`), azotea. `estado.fachada` es su opacidad.
- Exterior: calle, vereda, patio a la derecha de la puerta con reja y un árbol; capa lejana (cerros y árboles de fondo), capa cercana (reja, dos farolas, hojas).
- Cielo por `hora`: tres paletas (atardecer naranja a violeta a azul, noche azul profundo con estrellas, mañana celeste), interpoladas; la dibuja `luz.js` en pantalla, pero `edificio.js` expone `cielo(hora)`.

### gente.js
- Sprites de Pixel Agents desde `/stage/assets/personajes/char_N.png` (7 cuadros de 16×32; filas abajo/arriba/derecha; izquierda = espejo), cargados con `cargarImagen` de `/stage/personajes.js` y `MODELOS` para saber qué hoja es cada agente (el `cargarHojas` de ahí usa rutas relativas a `stage/` y no sirve desde la charla). De perfil se usan los cuadros 0..2 (caminar), 3..4 (sentado trabajando), 5..6 (de pie trabajando), como `oficina.js`.
- Seis agentes con su puesto como casa; rutas: se levantan, caminan por su planta hasta otra sala (por la escalera del hall si cambian de planta), se quedan un rato, hablan (globo de tres puntos, 1,5 s) y vuelven. Con `quieto`, todos se sientan y no salen; con `pausaLectura > 0`, nadie empieza una ruta nueva.
- La persona que decide en Dirección (hoja `persona`, sentada).
- Sofía (hoja 2 teñida, como hace `oficina.js` con los estudiantes): `entra` (aparece en la puerta de calle y camina hasta la marca de 2022), `camina` (avanza con `sofiaK`, no con el tiempo), `puerta` (de espaldas, quieta junto a la puerta), `sale` (cruza el patio hacia la derecha y sale de cuadro, una sola vez).
- Aula: tres filas de siete estudiantes sentados (hojas teñidas con los tonos de `ESTUDIANTES`); `manos` levanta la mano de una fracción de ellos (brazo de 2×8 px); `vacia` los saca.
- El agente de Coordinación con `foco`: `rol` lo ilumina (lo marca `luz.js` con un halo en su posición), `skills` el estante, `herramientas` la pantalla, `memoria` el cuaderno sobre el escritorio, `autonomia` lo hace levantarse e ir a Secretaría. `gente.js` expone `focoEn(estado) → { x, y }` para que `luz.js` ponga el halo.

### camara.js
- `PLANOS` de 3.3; `ir(objetivo)` recibe el plano más los parámetros de la lámina y fija el objetivo; `tick(dt)` interpola con `1 − 0.0025^dt` para cámara y `1 − 0.03^dt` para fachada, manos y corrimiento (las mismas curvas de la maqueta); `aPantalla` aplica S, zoom, corrimiento por placa y el centrado.
- Nunca más de un movimiento a la vez: si la lámina nueva comparte plano y parámetros con la anterior, no hay movimiento.

### luz.js
- Pipeline por cuadro: cielo (degradado, estrellas de noche) → capa lejana con `filter: blur(7px)` → mundo (nítido, sin suavizado) → fachada con su opacidad → luces con `globalCompositeOperation: 'lighter'`: lámparas por sala (radial, cálida, radio = alto de la sala × 1,1, intensidad `luzInterior × (1 − fachada)`), ventanas (radial sobre cada ventana con fachada puesta, intensidad según `hora`), el haz del proyector del aula, el halo de Sofía y del `foco`, la esfera → capa cercana con `blur(9px)` y opacidad `fachada` → franja de foco (tilt-shift: las franjas de arriba y abajo redibujadas con `blur(3px)`) → viñeta (radial, más fuerte de noche) → grading (`overlay`, teal a magenta al 18 %).
- La esfera: el mismo degradado que el deck (blanco, teal, violeta, magenta), con halo; en `hall` se encoge en la marca de 2022 y en `recibe` está en la de 2026; en `cierre` vuelve al tamaño de la portada.
- `hd: false` apaga todo menos cielo plano, mundo y fachada. `medirFps(dt)`: si el promedio baja de 40 durante 3 s, `degradado = true` apaga los desenfoques (quedan luces y viñeta); se informa por consola una sola vez.
- `prefers-reduced-motion`: sin tilt-shift animado y niebla quieta.

### giro.js
- `aCenital()`: el canvas de la escena recibe `transform: perspective(1600px) rotateX(78deg) scale(1.15)` con transición de 900 ms (`cubic-bezier(.6,0,.2,1)`) y opacidad a 0 en los últimos 300 ms; en paralelo `capaDemo` pasa de `scaleY(.06)` y opacidad 0 a identidad, misma curva. Resuelve al terminar la transición. `aPerfil()` es la inversa. Durante `enCurso` se ignoran las teclas de navegación.
- Si `prefers-reduced-motion` o `?plano=1`, el giro es un fundido de 450 ms (el de hoy).

### sonido.js
- WebAudio, sin archivos: **timbre** de escuela (dos tonos cuadrados filtrados, 1,2 s), **luces** (un clic de relé y el zumbido de los tubos que se encienden, 2 s), **motivo** de la esfera (tres notas seno con armónico, 523-659-784 subiendo o al revés, 1 s), **giro** (ruido filtrado con barrido 300→1400 Hz, 0,9 s), **tic** (ruido corto pasa-altos, 50 ms), **campana** (1318 Hz más 1760 Hz, 1,4 s). Ganancia maestra 0,9; nada suena sin un gesto previo (`habilitar()` desde la primera tecla).
- La campana la dispara `escena.js` escuchando `/api/eventos` (mismo origen): el frame `eventos` cuyo `dice` de Coordinación trae la propuesta (la vista ya la reconoce: es el mensaje que abre el panel de decisión; `stage/chat.js` tiene el criterio). Una vez por sesión.
- `m` silencia, `?mudo=1` arranca silenciado.

### escena.js e index.html
- Capas, de atrás hacia adelante: `#ui-escena` (canvas, `position: fixed; inset: 0`, z 0) → `#ui-placa` (z 1, con la posición y el color de la lámina; borde suave de 8 % hacia la escena) → `#ui-lienzo` (z 2; las `section[data-escena]` pasan a `background: transparent` por CSS) → `#ui-demo` (z 10) → avisos y ayuda.
- `ir(lamina, paso)`: si la lámina no tiene `data-escena` o `?sin-escena=1`, oculta la escena y la placa y deja la lámina como hoy; si la tiene, fija el objetivo en la cámara, la placa, el estado, y `pausaLectura = 1` (baja a 0 en cinco segundos). `paso(n)` publica el paso. `demo(si)` llama al giro cuando la lámina tiene `giro`; si no, fundido. Mientras la demo está en pantalla, no se dibuja ningún cuadro.
- El bucle: `requestAnimationFrame`; `dt` acotado a 0,1 s; `camara.tick`, `gente.tick`, `edificio` dibuja en el canvas lógico, `luz.render` compone en pantalla. Cuando la pestaña no está visible, se detiene.
- Teclas nuevas: `m`; parámetros nuevos: `?plano=1`, `?sin-escena=1`, `?mudo=1`. Todo lo demás, igual que hoy. El estado publicado por `BroadcastChannel` suma `plano`.

### presentador.html
- Debajo de la lámina actual, el nombre del plano y los parámetros de la escena (`hall · sofia camina · hora .15`); en la miniatura de la siguiente, el plano al que se va, para que quien presenta sepa si la cámara se va a mover.

### stage/index.html (oleada 4)
- `<canvas id="luz">` sobre `#lienzo`, mismo tamaño, `pointer-events: none`; `luz.js` en modo cenital: lámparas por sala del plano (centros de las salas físicas), viñeta, y un halo sobre Dirección cuando `esperandoDecision`. Tecla `l` la apaga; `?luz=0` arranca apagada; apagada por defecto en grabación para que el E2E y el juez vean lo mismo que hoy. No se toca `oficina.js`.
- El giro real: la vista de la charla pide a la vista de la demo (por `postMessage`, mismo origen) un cuadro del plano sin interfaz y lo usa como textura del lado cenital durante el giro; así la cámara "sube" de un canvas al otro sin corte.

### escena.test.mjs y capturas.mjs
- Tests: las 21 láminas tienen `data-escena` válido (JSON, plano existente, claves del estado) y `data-placa` válido; `vivo` es la única con `giro`; cada `PLANOS[x]` tiene camx, camy, zoom, hora, fachada; `PLANTAS` cubre las cuatro salas físicas de `oficina.js` y sus puestos; los módulos se importan sin DOM (lo que lo necesita se crea en `crear…`, no al importar); las señales de sonido suman ≤ 45 s; `banco.html` y `capturas.mjs` existen.
- `capturas.mjs`: levanta el servidor en 8091 `--sin-escuela`, abre cada lámina con `?lamina=id&plano=0|1`, espera 3 s, captura a 1920×1080, y además el giro a mitad de camino; deja todo en `evaluaciones/escena/<fecha>/`. Lo usan los agentes, el crítico y el ensayo.

## 5. El programa de construcción con subagentes

Seis oleadas. Dentro de una oleada, los agentes corren en paralelo con archivos propios; entre oleadas, el hilo principal integra, prueba y commitea. Cada brief de abajo se entrega tal cual, más el enlace a `CONTRATO.md`, la sección 4 del módulo, y las reglas de 3.7.

### Oleada 0 · el contrato y la rebanada vertical (hilo principal, medio día)

1. Rama `inmersiva` desde `main` (que está en `plan-b-2026-11-05` más este documento).
2. `escena/CONTRATO.md` (sección 3), los esqueletos de los siete módulos con las firmas de 3.5 y un dibujo de relleno (rectángulos de color por sala, agentes como cuadrados que caminan), `banco.html`, `escena.test.mjs` con los tests del contrato (fallan hasta que las láminas tengan sus datos), `capturas.mjs`.
3. `index.html`: las capas, `escena.js` enganchado a `ir`, `paso` y `mostrarDemo`, `?sin-escena=1`, `?plano=1`, `?mudo=1`, `m`. Las `data-escena` y `data-placa` de las 21 láminas según 3.4, y el bloque de texto al pie en tesis y cierre.
4. Verificación: la app corre entera con escenas de relleno, `npm test` en verde, capturas de las 21. Commit "Oleada 0".

Con esto, cada agente de la oleada 1 reemplaza un relleno por el módulo real sin tocar nada más.

### Oleada 1 · los módulos (cinco agentes en paralelo, un día)

| Agente | Brief (resumen; el completo va con el contrato) | Archivos propios | Verifica y reporta |
|---|---|---|---|
| **edificio** | Construí `edificio.js` según la sección 4: las plantas derivadas de `SALAS`, el interior por sala con los muebles de perfil, el hall con la escalera y las tres marcas, la fachada con ventanas y cartel, el exterior, las capas lejana y cercana, `cielo(hora)`. Paleta de `TEMAS`. Nada de texto salvo el cartel. | `escena/edificio.js` | banco `?modulo=edificio`: capturas de los seis planos × tres horas (0, .5, 1) × fachada 0 y 1; `ventanas()` y `lamparas()` devuelven una por puesto |
| **gente** | Construí `gente.js`: sprites de Pixel Agents de perfil, rutas por planta con la escalera, globos, la persona en Dirección, Sofía en sus cuatro estados, la gente del aula con las manos y `vacia`, y el agente de Coordinación con los cinco focos y `focoEn`. Respetá `quieto` y `pausaLectura`. | `escena/gente.js` | banco `?modulo=gente`: capturas de cada estado de Sofía, `manos` 0/.3/1, cada `foco`, y un video de 20 s de rutas; nadie atraviesa paredes ni cambia de planta sin pasar por el hall |
| **luz** | Construí `luz.js` con el pipeline de la sección 4, `hd`, `medirFps` y la degradación, la esfera con sus tres tamaños, y `prefers-reduced-motion`. | `escena/luz.js` | banco `?modulo=luz` con el edificio de relleno: capturas con `hd=1` y `hd=0` en tres horas; FPS ≥ 50 a 1920×1080 en la notebook con la escuela real corriendo (`./charla` en 8090 aparte) |
| **giro** | Construí `giro.js` y conectá `escena.demo()` para que `vivo` entre y salga con el giro, y las demás con fundido; `reduced-motion` y `?plano=1` → fundido. Durante el giro, sin teclas. | `escena/giro.js`, la función `demo` de `escena.js` | Playwright: entrar a `vivo` desde `escuela` y salir con `PageDown`; sin errores; la vista embebida sigue conectada (el SSE no se corta); captura a mitad del giro |
| **sonido** | Construí `sonido.js` con las seis señales, `habilitar`, `silenciar`, y la escucha de `/api/eventos` para la campana (una vez por sesión). Nada sin gesto. | `escena/sonido.js` | banco `?modulo=sonido`: un botón por señal; duración total ≤ 45 s medida; la campana suena con una propuesta real (`./charla` en 8090 y el objetivo enviado) |

### Oleada 2 · integración (hilo principal, un día)

`escena.js` completo con los módulos reales: interpolación, el travelling de Sofía por cuatro láminas, los pasos que mueven la escena (manos, cinco puntos, carrera), la pausa de lectura, el corrimiento por placa, la esfera entre láminas, la campana. `presentador.html` con el plano. Capturas de las 21, `npm test`, corrección de lo que no cierra entre módulos. Commit "Oleada 2".

### Oleada 3 · revisión (dos agentes en paralelo, medio día)

- **revisor** (`feature-dev:code-reviewer`): el diff completo de la rama contra `main`, sin mi conclusión: errores, fugas (listeners, `requestAnimationFrame` sin detener, SSE duplicado), rutas que rompen el plan B, rendimiento. Reporta con archivo y línea.
- **crítico**: `/impeccable critique` sobre las 21 capturas y el giro, con los principios de la sección 1 como rúbrica: legibilidad sobre placa a 4×2 m, escena secundaria, nada decorativo, contraste comprimido.

Se corrige lo P0 y P1, `npm test`, ensayo completo con `./charla` y el presentador, y se mezcla a `main`. A partir de acá la app con escena es la charla; `?sin-escena=1` y el tag siguen siendo el plan B.

### Oleada 4 · la demo con luz y el giro real (dos agentes en paralelo, dos días)

| Agente | Brief | Archivos propios | Verifica |
|---|---|---|---|
| **demo-luz** | Agregá el `<canvas id="luz">` sobre `#lienzo` en `stage/index.html` y usá `luz.js` en modo cenital (sección 4); tecla `l`, `?luz=0`, apagada por defecto en grabación. No toques `oficina.js` ni el chat. | `stage/index.html` (solo el bloque de la capa de luz), `escena/luz.js` (el modo cenital) | `npm test`; `npm run e2e -- --corrida` igual que antes; capturas de la demo con luz y sin luz en los dos temas |
| **giro-real** | Reemplazá la inclinación simulada por el giro con textura: la vista de la demo responde a un `postMessage` con un cuadro del plano sin interfaz; `giro.js` lo proyecta como el lado cenital mientras la escena de perfil se acuesta. Mantené el fundido como respaldo. | `escena/giro.js`, un manejador de `postMessage` en `stage/index.html` | el giro a 60 fps con la escuela viva; captura a mitad de camino; `PageDown` adentro sigue andando |

Integración por el hilo principal, E2E completo contra el servidor real (`npm run e2e`), revisor de código sobre el diff. Commit y mezcla.

### Oleada 5 · pulido y sala (tres agentes en paralelo, un día; después, el auditorio)

| Agente | Brief | Archivos propios |
|---|---|---|
| **presentador** | El plano actual y la escena en miniatura en `presentador.html`; el reloj de la charla mueve `hora` entre láminas que no la fijan (de atardecer a noche a lo largo de los 30 min). | `presentador.html`, el campo `plano` del estado por `BroadcastChannel` en `escena.js` |
| **rendimiento** | Medí con la escuela viva: FPS por lámina, memoria a los 30 min, el giro, la degradación; `?plano=1`; dejá un informe con números y lo que cambiaste. | `escena/luz.js` (solo degradación y presupuesto), `evaluaciones/escena/rendimiento.md` |
| **crítico final** | `/impeccable critique` sobre las 21 láminas con escena y la demo con luz, en los dos temas. | informe en `.impeccable/critique/` |

En el auditorio (hilo principal con Alfredo): proyector real, los dos temas, placa clara y oscura, el audio, el clicker. Lo que se decide ahí entra como ajuste de `data-escena`, no como código. Lista de control en `docs/escenario.md`.

### Lo que no se delega

El contrato, la integración de cada oleada, los commits y la mezcla a `main`, y las decisiones de diseño que cambian lo que la sala ve. Los agentes construyen módulos contra el contrato y lo verifican; cuando un agente encuentra que el contrato no alcanza, lo reporta y se cambia en el hilo principal.

## 6. Calendario

| Cuándo | Qué |
|---|---|
| mié 4/11 mañana | Oleada 0 |
| mié 4/11 tarde | Oleada 1 (cinco agentes) |
| mié 4/11 noche · jue 5/11 temprano | Oleada 2 y el ensayo. **Corte**: lo que esté integrado, probado y ensayado va a la charla; si la integración no cierra, la charla es el plan B (`?sin-escena=1` o el tag) y la construcción sigue igual |
| jue 5/11 | la charla |
| vie 6/11 · lun 9/11 | Oleadas 3 y 4 |
| mar 10/11 · mié 11/11 | Oleada 5 y la crítica final |

El orden de las oleadas no depende del corte del jueves: la charla usa lo que haya y el programa sigue hasta el final.

## 7. Riesgos y cómo se cubren

- **El corte del jueves.** `?sin-escena=1` deja la app idéntica al plan B sin cambiar de rama; el tag deja el repo idéntico. Se decide a las 18:00 del miércoles con el ensayo, no a último momento.
- **Texto ilegible.** Placa plana obligatoria, cuerpo de 40 px o más sobre escena, prueba en proyector. Regla, no ajuste.
- **"Jueguito".** La escena es secundaria y quieta cuando hay que leer; los agentes se mueven cuando ustedes narran. Nada de sprites grandes ni animaciones decorativas.
- **Rendimiento con los seis agentes vivos.** La escena se pausa mientras la demo está en pantalla; HD-2D se degrada solo; `?plano=1` lo apaga; la oleada 5 lo mide con números.
- **Agentes que se pisan.** Archivos propios por agente, contrato fijo, banco por módulo, integración solo en el hilo principal.
- **El plan B y el E2E.** Nada en `stage/` cambia hasta la oleada 4, y ahí la luz arranca apagada en grabación para que el juez vea lo mismo que hoy.
- **Fuentes y assets.** Nada por red. Los sprites y la paleta se importan de `stage/`, así un cambio en la demo se refleja en la escena.
- **Audio del auditorio.** Desconocido; la charla no depende de él.

## 8. Preguntas a la organización (antes del jueves)

1. Resolución nativa y entrada del proyector (la pantalla es 4×2 m, 2:1; el deck es 16:9).
2. Lúmenes y qué luz de sala queda prendida durante las charlas.
3. Si toman audio de la notebook (HDMI o miniplug) y quién lo opera.
