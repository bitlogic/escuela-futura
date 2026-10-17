# Spec: modo claro / oscuro en la vista de escenario

Estado: **implementado el 16/10/2026** (fases 0 a 3; tecla `t`, botón Claro/Oscuro, `?tema=`, `data-tema`, `TEMAS` en `oficina.js`, paletas de autor por tema en `personajes.js`). Decisiones sobre las preguntas abiertas: paleta clara crema cálida; globos sin invertir (contraste borde/pared 11:1); sin modo automático. Queda como referencia del diseño. Alcance: `stage/index.html`, `stage/oficina.js`, `stage/personajes.js`, `stage/organigrama.html`.

## 1. Objetivo

Poder cambiar la vista entre **oscuro** y **claro** el día de la charla, en un toque, sin recargar ni perder la conexión en vivo, para elegir según la sala (auditorio oscuro con proyector, o sala luminosa donde el oscuro se lava).

Criterios de éxito:

1. Un solo gesto cambia el tema (tecla y botón), en menos de 1 segundo, sin cortar el WebSocket ni reiniciar a los personajes.
2. Todo el texto proyectado (chat, globos, carteles, nombres) cumple **contraste ≥ 4,5:1** en ambos temas; el texto grande (≥ 24 px en el escenario), ≥ 3:1.
3. El tema elegido se recuerda entre aperturas y se puede forzar por URL (`?tema=claro|oscuro`) para ensayar.
4. Si algo falla, la vista cae al tema oscuro actual, que es el ya probado.

Fuera de alcance: seguir la preferencia del sistema operativo automáticamente (ver decisión D2), rediseñar los personajes, cambiar los sprites de Pixel Agents.

## 2. Análisis de lo que hay hoy

La vista tiene **un solo tema, y es oscuro**. "Oscuro" es el estado actual y queda como base y valor por defecto. El trabajo real es **diseñar y construir el claro**.

La interfaz se compone de tres capas con estrategias de color distintas, y por eso el cambio no es una sola variable:

| Capa | Dónde | Cómo se pinta hoy | Esfuerzo para tematizar |
|---|---|---|---|
| **Cromo HTML** (fondo de página, chat, caja de texto, barra, popover de clave) | CSS en `index.html` | Variables parciales (`--ink`, `--papel`, `--naranja`, `--verde`, `--fuera`, `--panel`, `--linea`) más unos 15 hex sueltos (`#cfd3ea`, `#8f93b0`, `#6b6f8a`, `#2c2f48`, `#3c4066`, `#1b1b2b`, `#4a4f78`, `#9a9eba`, `#ffb48a`, …) | Bajo: pasar todo a tokens |
| **Texto sobre la escuela** (globos, etiquetas con nombre, carteles de sala, tag de Martina) | CSS en `index.html`; el tag de Martina tiene colores en línea (`style.cssText`) | Globos claros (`--papel`) con borde `--ink`; etiquetas oscuras; carteles `#dfe2f5` sobre la pared | Bajo-medio: dependen del tema de la escuela, no solo del cromo |
| **Colores de autor** en el chat | `COLOR` en el JS (7 hex) | Pensados para fondo oscuro (p. ej. `#f0c13f`, `#6fd987`) | Medio: sobre fondo claro esos tonos no llegan a 4,5:1 y necesitan una segunda paleta |
| **La escuela en el canvas** | `oficina.js`: `PAL` (13 colores) + **98 literales hex en 69 valores únicos** + 9 `rgba` | Se dibuja con `fillRect`; el fondo (pisos, paredes, casilleros) se pinta **una vez en un canvas aparte y se reusa** (`armar()` en `crearOficina`) | Alto: hay que decidir qué cambia (ver §3) y reconstruir el fondo al cambiar |
| **Sprites** (personajes, estudiantes) | PNG de Pixel Agents (+ tinte para estudiantes y Academia) | Imágenes fijas | Nulo: no cambian |

Hechos que condicionan el diseño:

- El fondo cacheado hay que **redibujarlo al cambiar de tema**. `armar(S)` ya hace eso al cambiar de resolución, así que el mecanismo existe; la lógica de tema solo necesita invocarlo.
- Los muebles se dibujan **cada cuadro** leyendo `PAL` y literales; cambiar `PAL` en caliente se refleja de inmediato. Los literales sueltos (maderas, libros, pizarrón, pantallas) no cambian si no se tocan.
- Contrastes medidos en el tema actual (sirven de referencia): texto del chat 16,4:1; nombre de Advisor 9,2:1; Bienestar 7,5:1; estado del canal 6,3:1; cartel de sala sobre pared 8,1:1; **hora de cada mensaje 3,8:1 (ya no llega a 4,5:1; conviene subirla en ambos temas)**.
- La vista se proyecta: el pixel-art y los pisos de colores (rojizo, azul, verde, rosa) funcionan en cualquier fondo; lo que se "apaga" en un tema claro son las paredes y el pasillo, que hoy son azul grisáceo oscuro y beige.

## 3. Decisiones de diseño

**D1. Qué cambia en el tema claro.** Opciones:

- **A. Solo el cromo** (chat, fondo de página, barra) y la escuela queda igual. Es barato y deja un contraste fuerte entre un chat blanco y una escuela de paredes oscuras, que se ve desparejo.
- **B. Cromo + marco de la escuela** (paredes, zócalos, fondo exterior, carteles). Los pisos, muebles y sprites quedan. **Recomendada**: cambia lo que más pesa en la percepción de claro/oscuro con poco riesgo, porque solo se tocan los 13 colores de `PAL` y los pocos literales de pared y exterior.
- **C. Todo recoloreado** (también maderas, pisos). Mucho trabajo y riesgo de que los personajes pierdan contraste con el suelo.

→ Se implementa **B**, con la paleta de la escuela en un objeto por tema para poder crecer a C sin rehacer.

**D2. Valor inicial.** Oscuro, **sin** seguir `prefers-color-scheme`. Razón: en la demo la notebook y el proyector pueden tener ajustes de sistema distintos al entorno de proyección; el presentador decide. La preferencia elegida se guarda en `localStorage` (con `try/catch`, la vista funciona sin él).

**D3. Dónde vive el toggle.** Tecla **`t`** y un botón "Tema" en la barra que aparece al mover el mouse (junto a Grabación / En vivo). No se agrega nada al chat ni a la escuela, para no ensuciar la proyección. `?tema=claro|oscuro` fuerza el tema al abrir.

**D4. Cómo se aplica.** Un atributo `data-tema="claro|oscuro"` en `<html>`; los colores del cromo salen de variables CSS definidas por tema; la escuela lee un objeto `TEMAS` en `oficina.js`.

## 4. Diseño técnico

### 4.1 Cromo HTML (CSS)

1. Pasar **todos** los hex del CSS a variables, con nombres por función y no por color:
   `--fondo-pagina`, `--panel`, `--panel-borde`, `--texto`, `--texto-suave`, `--texto-tenue`, `--acento` (naranja), `--ok` (verde), `--campo` (caja de texto), `--manija`, `--boton`, `--boton-hover`, `--globo-fondo`, `--globo-texto`, `--globo-borde`, `--etiqueta-fondo`, `--etiqueta-texto`, `--cartel`, `--mencion`.
2. Definir el tema oscuro en `:root` (valores actuales, para no cambiar nada hoy) y el claro en `:root[data-tema="claro"]`. `color-scheme` acorde para scrollbars y controles.
3. Reemplazar el `style.cssText` del tag de Martina por una clase que use `--acento`.

### 4.2 Colores de autor del chat

Reemplazar el `COLOR` fijo por **dos paletas** (oscuro / claro), con el mismo orden de agentes, y que `chatAgregar` lea la del tema vigente al crear cada mensaje. Los mensajes ya dibujados deben cambiar al alternar: se define el color con una variable CSS por mensaje (`--c-oscuro`, `--c-claro`) y se elige con el tema, así no hace falta redibujar el chat.

Paleta de partida para el claro (a validar con el script de contraste del §6): tonos más profundos de los mismos matices, p. ej. coordinación `#3b55c9`, tutor `#8a6a00`, advisor `#0d7a6b`, bienestar `#b4306a`, admisiones `#8a6c14`, academia `#1d7a42`, persona `#c24a10`.

### 4.3 La escuela (canvas)

1. Mover `PAL` a `TEMAS = { oscuro: {…PAL actual…}, claro: {…} }` y exponer `PAL` como un objeto mutable que se llena con el tema activo (`Object.assign(PAL, TEMAS[nombre])`).
2. Colores del tema claro para el marco (a afinar mirando capturas): `fuera` (marco exterior), `pared`, `paredClara`, `paredOsc`, `zocalo`. Pasar de azules grisáceos oscuros a un neutro cálido medio-claro, **sin llegar a blanco puro**, para que los pisos de colores y los personajes sigan destacando.
3. Los literales de pared y exterior que hoy están sueltos (`rgba(255,255,255,.05)` de las juntas, sombras) se cuentan como parte del tema: las sombras `rgba(0,0,0,…)` funcionan en ambos; las líneas claras sobre pared (`rgba(255,255,255,…)`) pasan a oscuras en el claro.
4. Nueva función `of.tema(nombre)`: aplica la paleta, vuelve a pintar el fondo cacheado (reusar `armar(S)`) y listo. Los muebles se redibujan solos en el cuadro siguiente.
5. **Nada cambia** en maderas, libros, pizarrones, pantallas ni sprites en la primera versión (D1-B).

### 4.4 Globos y etiquetas

- Hoy el globo es **claro con borde oscuro**, que se lee bien sobre una escuela oscura. En el tema claro, sobre paredes claras, pierde separación. Opción: en el claro, globo **oscuro con texto claro** (invertido) para mantener la figura; en el oscuro, como está. Etiquetas con nombre: igual criterio.
- Los carteles de sala (`#dfe2f5` hoy) pasan a un tono oscuro sobre la pared clara. Validar legibilidad a 1440×900 y 1920×1080.

### 4.5 Control y estado

```
let tema = leerGuardado() || 'oscuro';        // localStorage, try/catch
function aplicarTema(t) {
  document.documentElement.dataset.tema = t;  // cromo CSS
  ofi.tema(t);                                // canvas
  guardar(t); actualizarBoton();
}
// tecla t · botón "Tema" · ?tema=…
```

El cambio **no reinicia** personajes, bubbles ni conexión: solo repinta. `aplicarTema` se llama una vez al arrancar antes del primer cuadro, para evitar un destello del tema equivocado.

## 5. Plan por fases

| Fase | Contenido | Resultado verificable | Esfuerzo |
|---|---|---|---|
| **0. Refactor sin cambio visual** | Pasar todos los hex del CSS a variables (tema oscuro = valores actuales); `PAL` a `TEMAS.oscuro`; clase para el tag de Martina | Capturas antes/después **idénticas** | ~1 h |
| **1. Toggle + cromo claro** | `data-tema`, botón y tecla `t`, persistencia, `?tema=`; paleta clara del cromo y de los colores de autor | Chat, barra, caja de texto y popover legibles en claro | ~1,5 h |
| **2. Escuela clara** | `TEMAS.claro`, `of.tema()`, repintado del fondo, globos y carteles invertidos | Marco claro, pisos y personajes siguen destacando | ~2 h |
| **3. Afinado y ensayo** | Contrastes, capturas a 1440×900 y 1920×1080, prueba con conexión en vivo y alternando durante una corrida, ajuste de la hora del chat | Lista de §6 en verde | ~1 h |

Total estimado: **5 a 6 horas**. La fase 0 se puede fusionar sola (no cambia nada) y deja el repo listo aunque se frene ahí.

## 6. Verificación

- **Capturas** en ambos temas: `?paso=20` (grabación) y en vivo, a 1440×900 y 1920×1080; comparar la fase 0 contra la captura actual (debe ser idéntica píxel a píxel salvo animaciones).
- **Contraste**: script único (como el usado en este análisis) con los pares texto/fondo de ambos temas; objetivo 4,5:1 en texto del chat, globos, nombres de autor, carteles y estados. Corregir la hora del mensaje (hoy 3,8:1).
- **Alternar en vuelo**: durante una corrida en vivo, apretar `t` varias veces: sin reconexión, sin globos perdidos, sin personajes reubicados, sin errores en consola.
- **Sin `localStorage`** (ventana privada): arranca en oscuro y alterna igual.
- **Proyector real o pantalla externa**: ver los dos temas al menos una vez antes de la charla; el claro puede verse lavado en proyectores de bajo contraste.

## 7. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El claro se ve lavado en un proyector | Probar en proyector real; mantener oscuro como valor por defecto y plan A |
| Personajes pierden contraste con paredes claras | D1-B no toca pisos ni sprites; paredes medio-claras con zócalo oscuro; revisar capturas |
| Destello de tema equivocado al abrir | Aplicar el tema antes del primer cuadro y antes de mostrar el escenario |
| Olvidar un hex suelto y quedar un parche oscuro en el claro | Buscar hex literales con `grep` al final de la fase 0 y de la 1; la lista de §2 es el inventario |
| Alternar rompe el WebSocket o el estado | El toggle solo toca CSS y el fondo del canvas; probado en §6 |
| Complejidad de dos paletas de autor | Una sola tabla con ambas columnas y el script de contraste para validarla |

## 8. Preguntas abiertas

1. ¿El tema claro tiene que verse "de escuela luminosa" (paredes crema, mucho aire) o "limpio y neutro" (grises)? Cambia la paleta de §4.3. Mi propuesta: crema/neutro cálido, coherente con los pisos.
2. ¿Querés el tema también en el **Libreto** (artifact)? Ya sigue el tema del visor solo; no requiere trabajo.
3. ¿Hace falta un tercer estado "automático" (seguir al sistema)? Hoy se descarta (D2); se puede agregar después sin tocar el resto.
4. ¿Los globos invertidos en claro (§4.4) te convencen, o preferís que mantengan el estilo actual y ajustar solo las paredes?

## 9. Criterios de aceptación

- [ ] `t`, el botón "Tema" y `?tema=` cambian el tema y se recuerda la elección.
- [ ] Ninguna pieza de la interfaz queda con colores del otro tema (cromo, chat, globos, carteles, popover, caja de texto).
- [ ] Contraste ≥ 4,5:1 en todo texto de lectura en ambos temas (incluida la hora de cada mensaje).
- [ ] Alternar con la conexión en vivo no reconecta ni reinicia personajes.
- [ ] El tema oscuro es idéntico al de hoy tras la fase 0.
- [ ] README de `stage/` actualizado (tecla `t`, `?tema=`).
