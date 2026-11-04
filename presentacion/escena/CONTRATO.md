# El contrato de la escena

Lo que fija el hilo principal para que los módulos de `presentacion/escena/` se construyan en paralelo. Es la sección 3 de `docs/inmersiva.md` más los ajustes que salieron al construir la oleada 0 (al final). Si un módulo necesita algo que no está acá, se pide en el reporte y lo cambia el hilo principal.

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

`data-escena` (JSON con claves del estado; lo que falta hereda del plano) y `data-placa` (`izq|der|abajo|ninguna`, más la palabra `clara` cuando la lámina es de fondo claro). La placa toma el color base del deck: oscura `#0B0920`, clara `#F3F0FF`; en `tesis` la banda de abajo lleva el degradado propio de la lámina. Los pasos (`data-paso`) se publican en `estado.paso` y la escena reacciona donde se indica.

| # | Lámina | `data-escena` | `data-placa` | Qué pasa |
|---|---|---|---|---|
| 1 | cover | `{"plano":"fachada","hora":0,"esfera":true}` | izq | ventanas prendiéndose; la esfera sobre el edificio, arriba a la derecha |
| 2 | equipo | `{"plano":"fachada","hora":0.05,"zoom":1.4,"camx":340,"camy":200}` | izq | la cámara se acerca a la puerta |
| 3 | sofia | `{"plano":"hall","sofia":"entra"}` | izq | Sofía entra por la puerta y arranca; las marcas 2022 · 2024 · 2026 están en la pared del hall; la esfera se encoge en la marca de 2022 |
| 4 | chatgpt | `{"plano":"hall","sofia":"camina"}` | izq | sigue el travelling |
| 5 | carrera | `{"plano":"hall","sofia":"camina"}` | izq | sigue; los pasos de la lámina (2024, 2026) adelantan `sofiaK` |
| 6 | entrevista | `{"plano":"hall","sofia":"puerta"}` | izq | Sofía al final del pasillo, de espaldas a la cámara, mirando la puerta |
| 7 | primera-vez | `{"plano":"edificio","hora":1}` | izq clara | amanece: el cambio de luz de las notas, literal |
| 8 | ranking | `{"plano":"edificio","hora":1,"quieto":true}` | izq clara | quieto |
| 9 | manos | `{"plano":"aula","manos":"pasos"}` | izq | las manos suben con los pasos de la lámina (paso 1: un tercio; paso 2: todas) |
| 10 | datos | `{"plano":"aula","zoom":1.6,"quieto":true}` | izq | quieto, un poco más lejos |
| 11 | tesis | `{"plano":"edificio","hora":0.5,"luzInterior":1}` | abajo | todas las ventanas encendidas |
| 12 | capo | `{"plano":"edificio","hora":0.5,"zoom":1.05,"fachada":0}` | izq | la fachada se desvanece al entrar: casa de muñecas con los seis trabajando |
| 13 | agente | `{"plano":"oficina","oficina":"coordinacion","foco":"pasos"}` | izq | paso 1 rol (el agente se ilumina), 2 skills (el estante), 3 herramientas (la pantalla), 4 memoria (el cuaderno), 5 autonomía (se levanta y va a otra sala) |
| 14 | escuela | `{"plano":"edificio","hora":0.5,"zoom":1.05,"fachada":0}` | izq | mismo plano que capo, sin movimiento |
| 15 | vivo | `{"plano":"edificio","hora":0.5,"zoom":1.05,"fachada":0,"giro":true}` | ninguna | el giro |
| 16 | decision | `{"plano":"oficina","oficina":"direccion","hora":0.55}` | der clara | la persona en el escritorio; un agente en la puerta con el papel |
| 17 | aula | `{"plano":"aula","hora":0.2,"manos":0,"quieto":true,"vacia":true}` | izq | la misma aula, vacía, luz de la tarde |
| 18 | criterio | `{"plano":"edificio","hora":0.5,"zoom":1.05,"fachada":0,"quieto":true}` | izq | el edificio abierto, quieto |
| 19 | recibe | `{"plano":"patio","sofia":"sale","esfera":true}` | izq | Sofía sale por la puerta y cruza hacia fuera de cuadro; la esfera en la marca de 2026 |
| 20 | cierre | `{"plano":"fachada","hora":0.85,"esfera":true}` | abajo | el mismo encuadre que la portada; la esfera se expande |
| 21 | gracias | `{"plano":"fachada","hora":0.5,"luzInterior":1}` | izq | ventanas prendidas durante las preguntas |

Las láminas de fondo claro (primera-vez, ranking, decision) llevan placa clara y escena de día. Dos láminas mueven su bloque de texto al pie para la placa de abajo (tesis, cierre): es layout, no contenido.

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


## Ajustes de la oleada 0 (mandan sobre lo de arriba)

- **Las dependencias se inyectan**, para que los módulos se importen en Node sin DOM y los tests corran: `crearEdificio({ SALAS, TEMAS })`, `crearGente({ cargarImagen, MODELOS, plantas })`, `crearEscena({ canvas, placa, capaDemo, deps: { SALAS, TEMAS, MODELOS, cargarImagen }, opciones })`. La app y el banco importan `/stage/oficina.js` y `/stage/personajes.js` y los pasan. El `cargarHojas()` de la demo usa rutas relativas a `stage/`: desde la charla los sprites se cargan con `cargarImagen('/stage/assets/personajes/char_N.png')`.
- **El hall de planta baja mide 100 px** (x 300..400) para que Sofía pueda recorrerlo: la puerta de calle está al principio (`PUERTA` x 302..320), las marcas 2022 · 2024 · 2026 en la pared a x 328, 354, 380 (`MARCAS`, y 168), y la escalera al final (`ESCALERA` x 382..400). Los anchos de las salas son los de `REPARTO` en `edificio.js` (p3 120..300, p4 400..520; p1 120..300, hall alto 300..340, p2 340..520), con los puestos en posición proporcional a la del plano.
- **El travelling de Sofía** va de camx 330 a 378 (`HALL_TRAVELLING`), proporcional a `sofiaK`.
- **La esfera**: cover y cierre ya traen su propia esfera en la lámina (el orb del deck), así que no la piden a la escena; `esfera: true` queda solo en `sofia` (el punto en la marca de 2022). Por lo mismo, **cierre va con placa izq**, no abajo. Tesis lleva `abajo propia`: la placa usa el degradado de la propia lámina.
- **`data-placa` admite modificadores**: `clara` (fondo claro) y `propia` (la placa toma el `background` de la lámina). La placa es `#ui-placa`, fija a la ventana, con una máscara de degradado hacia la escena (estilo.css).
- **`manos: "pasos"`** → por paso: 0 → 0, 1 → 1, 2 → .15. **`foco: "pasos"`** → por paso: 1 rol, 2 skills, 3 herramientas, 4 memoria, 5 autonomía.
- **`luz.render` recibe `vista`** `{ esc, ox, oy }`: la composición de 1920×1080 entra entera en la ventana, centrada como el lienzo; las bandas sobrantes se pintan del color de arriba del cielo.
- **El banco** (`banco.html`) arma una lámina ficticia con la URL y expone `window.banco.estado(cambios, paso)`; el estado por cuadro llega a `escena.alFin(f)`.
- `escena.tecla(k)` devuelve `{ hecho, aviso }`; `escena.gesto()` habilita el audio con la primera tecla.
