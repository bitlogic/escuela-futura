# El sistema visual del deck (4/11)

El deck es "neón sobre navy": la paleta original de las láminas de claude.ai (navy con un degradado radial, texto lila claro, teal, magenta y violeta, Outfit y JetBrains Mono). El 4/11 se probó pasarlo a la noche `#0b0b12` de la escuela con papel crema, azul BIT y Plain, después de la crítica que marcaba tres sistemas en una pantalla (`.impeccable/critique/2026-11-04T12-39-34Z__presentacion-index-html.md`); Alfredo lo revisó esa noche y prefirió los colores originales, así que **la paleta original es la base de toda la app** (láminas, placa de la escena, giro, interfaz del operador), y lo que quedó del rediseño es la estructura: cada lámina se escribe con estas clases (`estilo.css`, bloque "El sistema del deck") y casi sin estilos en línea. La escena (pixel-art, cielo por hora) se integra porque la placa y los recuadros usan el mismo navy.

## Tokens

| Token | Oscuro (default) | Claro (`.lamina.clara`) | Qué es |
|---|---|---|---|
| `--fondo` / `--fondo-luz` | `#0B0920` / `#0F2A3A` | `#F3F0FF` / `#FFE3F9` | el fondo es un degradado radial de `--fondo-luz` (arriba a la izquierda) a `--fondo`. La placa de la escena y los recuadros usan `--fondo` (`PLACA_COLOR` en `escena.js`), así el cubo del giro no cambia de fondo. |
| `--texto` | `#F3F0FF` | `#120E2E` | lila claro / tinta |
| `--suave` | `#A8A2D0` | `#5E5889` | texto secundario |
| `--tenue` | `#7F79B0` | `#8A84B4` | fuentes al pie, años no activos (4,9:1 sobre el navy; el `#5E5889` original daba 3:1) |
| `--linea` | `#2A2452` | `#D9D2F0` | la única regla: 2 px; y las barras apagadas |
| `--teal` | `#2EE6D2` | `#0E7C86` | **la institución y los agentes**: marcas, `#31`, "Actúa", "enseñarlo", el 01 de las listas |
| `--magenta` | `#FF4FD8` | `#B0179F` | **la persona que decide** y el dato que duele: "Una persona decide.", "Qué nos reservamos", 26 %, el punto de Sofía, el 02 |
| `--violeta` | `#7B5CFF` | `#5A3FD6` | el tercero: el 03 de las listas, el final de la barra, Bitlogic |

`.lamina.gradiente` (solo la tesis): la lámina entera es el degradado teal → azul → magenta del deck original. La esfera de la escena (`luz.js`, en `sofia` y `recibe`) lleva el mismo degradado que el orb.

Regla de color: lila claro para todo; teal para lo que hace la institución con agentes; magenta para la persona que decide (y para la cifra que duele); violeta solo como tercer acento de una serie. Los degradados y los brillos van en tres lugares, los del deck original: el orb, la tesis y la barra del ranking.

## Tipografía

Outfit (300–800, local) para todo el texto; **JetBrains Mono** para las marcas, los números de lista y los años. Plain y Apple Garamond (brand kit) quedan declaradas en `estilo.css` por si una lámina las pide, pero el sistema no las usa.

| Clase | Tamaño | Uso |
|---|---|---|
| `.marca` | 28 px mono, tracking 4 px, mayúsculas, teal | la línea de contexto arriba del título (fecha, capítulo). Solo si dice algo. |
| `h1` | 120 px, 600, interletrado −0,025 em | el titular de una lámina de una idea |
| `h1.xl` | 168 px, 700 | la portada |
| `h2` | 80 px, 600 | títulos de láminas con lista o comparación |
| `h3` | 48 px, 600 | filas de lista |
| `.frase` / `.frase.xl` | 112 / 168 px, 600 | las tres frases grandes: tesis, decisión, cierre |
| `.cuerpo` | 40 px, 400, interlineado 1,3 | texto que se lee desde el fondo |
| `.secundario` | 36 px, `--suave` | aclaraciones, años en la grilla |
| `.nota` | 26 px, `--tenue` | fuentes al pie (lo mínimo que va en pantalla) |
| `.cifra` | 200 px, 700 | las cifras de `datos` |
| `.num` | 40 px mono, `--suave`; toma color solo por clase (`.num.teal`, `.num.magenta`) en la fila que lo merece | el número de una fila de lista |
| `.cita` | 48 px | la consigna de `capo`, la que después se tipea en vivo |

## Layout

- La lámina es `section.lamina` (padding 128 / 128 / 160, columna, centrada verticalmente). El ancho del texto se limita con `.col` (900 px: las láminas con placa a la izquierda, así el borde de la placa cae siempre cerca de x = 1000 y la escena tiene su mitad), `.col.media` (1150) o `.col.ancha` (1664, las `plena`).
- Lista numerada: `.fila-lista` (grilla 110 px + 1 fr, regla arriba, la última también abajo) con `.num`, `h3` y `p`. En recuadros (`llamadas`) el `h3` va a 56 px y el `p` a 36: menos no se lee desde la última fila. `agente` lleva solo la palabra por fila; la descripción la dice el presentador.
- Comparación de dos columnas (`capo`): `.columnas`, una regla vertical entre las dos; sin tarjetas.
- Un elemento con `data-hasta="N"` se oculta desde el paso N (`capo`: el bloque "Preguntar" se achica a una línea cuando entra "Delegar").
- Línea de tiempo de Sofía: `.regla-tiempo` (la regla, pineada abajo, `--suave` al 50 %), `.punto` (20 px, magenta con brillo, pineado sobre la regla; `left` según el año) y `.linea-tiempo` (los tres años en mono; `.activo` en teal).
- Pie: `.pie` (pineado abajo, fila con los extremos).
- Fotos: `.foto` (400 px, redondas, borde de 6 px y brillo del color del dueño: `.foto.magenta` Greyla, `.foto.violeta` Alfredo).
- Barras (`ranking`): `.barra` (28 px, radio 14, `--linea`), `.barra.teal` (degradado teal → violeta).
- **Lo pineado lleva `position:absolute` en línea** (el reproductor lo detecta por el atributo `style` para el orden de pintado y la placa lo ignora al medir el texto).
- La esfera ("el tercer invitado"): el orb original del deck (teal, magenta y violeta girando adentro, dos anillos, halo), en un `x-embed.esfera` con una esfera de respaldo debajo por si el iframe no pinta. Solo en la portada, que conserva sus estilos en línea del deck original (es la única lámina que no usa `.lamina`).

## Movimiento

Curva única: `cubic-bezier(.22, 1, .36, 1)` (ease-out-quint). La lámina que entra sube 16 px en 0,7 s (clase `entrando`, la pone `ir()` en `index.html`); la que sale se funde en 0,3 s desde el primer cuadro cuando hay escena. Los pasos (`data-paso`) entran con fundido y 18 px de ascenso, y los elementos de un mismo paso se escalonan 90 ms (`--i`, lo pone `mostrarPaso`). Con `prefers-reduced-motion` todo es un fundido corto.

## Qué no cambia

El contenido, las notas (`<aside>`), los `id`, `data-escena`, `data-placa`, `data-paso`, `data-demo` y el orden en `deck.json`. El formato sigue siendo una `<section>` de 1920×1080 por archivo.
