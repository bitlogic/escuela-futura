# Plan B: levantar la versión de la charla tal cual está

Esta es la versión **asegurada** de la charla "Institución Agéntica" (Innova Educa 21, Córdoba, 5/11/2026): las 21 láminas del deck ensayado con Greyla el 3/11 más la demo embebida. Está marcada en git con el tag **`plan-b-2026-11-05`**. Todo lo que se construya después (la versión inmersiva) va aparte; si algo de eso falla o no llega, se vuelve a este tag y la charla se da con esto.

Probado el 3/11 en un clon limpio desde cero (`git clone` + `npm ci`): con clave, la demo embebida arranca en vivo; sin clave, cae sola a la grabación.

## Lo que hace falta

- Node 20 o más (la demo se desarrolló con Node 26).
- Una API key de Anthropic en `.env` (`ANTHROPIC_API_KEY=sk-ant-…`, ver `.env.example`). **Sin clave la charla igual funciona**: la demo reproduce la corrida grabada en vez de los agentes en vivo.
- Chrome o similar. Nada más: no hay dependencias de red en las láminas (fuentes y logos están en el repo).
- Opcional, solo por estética de la vista de la demo: las fuentes licenciadas del brand kit no se suben al repo. En la máquina de la charla, copiarlas a `stage/assets/` desde `~/github/brand-kit/assets/fonts/`: `plain/Plain-Regular.otf`, `plain/Plain-Medium.otf`, `plain/Plain-Bold.otf` y `apple-garamond/AppleGaramond-Light.ttf`. Si faltan, la vista usa la fuente del sistema y se ve igual de bien para la sala.

## Levantarla

```bash
git clone <repo> escuela-futura && cd escuela-futura
git checkout plan-b-2026-11-05
npm ci
cp .env.example .env            # y completar ANTHROPIC_API_KEY (opcional: sin clave va la grabación)
./charla                        # abre http://localhost:8090/ en el navegador
```

`./charla` levanta solo el servidor de la escuela (los seis agentes, puerto 8080) y espera a que responda antes de abrir el navegador, para que la vista embebida arranque **en vivo**. En la consola tiene que verse esto:

```
[charla] levanto la escuela (servidor/escuela.mjs)…
Escuela Futura → http://localhost:8080/stage/   (6 agentes · claude-sonnet-5-5 · effort medium · Ctrl+C para cortar)
[charla] la escuela responde en http://localhost:8080/stage/
Charla → http://localhost:8090/   (láminas + demo embebida · ? muestra las teclas · Ctrl+C para cortar)
```

Si en cambio dice `la escuela terminó con código 1: la demo va a reproducir la grabación (plan B)`, falta la clave o falló la API: la charla sigue igual, con la demo grabada. Ctrl+C corta las dos cosas.

Verificar antes de empezar: `http://localhost:8090/` muestra la portada; `d` trae la demo y la barra de la escuela dice **En vivo** (o **Grabación** si no hay clave); `d` de nuevo la esconde; `n` abre la vista del presentador en otra ventana.

## En la charla

| Tecla | Hace |
|---|---|
| `→` `espacio` `PageDown` · clic · clicker | siguiente lámina (y el siguiente paso dentro de una lámina) |
| `←` `PageUp` | anterior |
| `d` | trae o esconde la demo sobre la lámina actual |
| `n` | vista del presentador: lámina actual y siguiente, notas, reloj y plan de tiempos |
| `t` | reinicia el reloj (arranca solo al salir de la portada) |
| `f` | pantalla completa |
| `?` | todas las teclas |

La demo aparece sola al llegar a la lámina `vivo` (después de "Les presentamos a Escuela Futura"). Adentro, las teclas son de la escuela (`Enter` escribe, `b` Tablero, `o` organigrama, `Escape` vuelve al plano); para seguir con las láminas, `PageDown` (lo que manda el clicker), `Shift+→` o `d`.

`http://localhost:8090/?nombre=Greyla` hace que decida Greyla en vez de Alfredo; `?ritmo=pausado` retiene los mensajes de los agentes 4 s para que la sala los lea (sin parámetro, el ritmo es Lento, 7 s, o lo que se haya elegido en el perfil de ese navegador). `#id` o `?lamina=N` abren en una lámina puntual, y el `#` de la URL se actualiza al navegar, así que recargar no pierde el lugar.

## Los tres escalones de respaldo

1. **Vivo**: `./charla` con clave. Los agentes trabajan de verdad sobre la API.
2. **Grabación dentro de la charla**: sin clave, sin red, o si la API falla al arrancar, la misma lámina `vivo` reproduce la corrida grabada predeterminada (`stage/corridas/index.json`). Si la vista arrancó en grabación porque la escuela tardó en responder, `v` la pone en vivo.
3. **La demo sola**: si la app de la charla no levanta, `./escenario` abre la escuela en `http://localhost:8080/stage/` y las láminas se pasan desde el deck de claude.ai (ver `docs/deck/README.md` y `presentacion/README.md`). Y si tampoco hay servidor, `python3 -m http.server 8080` en la raíz y `http://localhost:8080/stage/?grabacion=1` reproduce la grabación.

El guion de la demo, con tiempos, momentos WOW y qué decir si algo falla, está en `docs/guion.md`. Los datos del caso y la lista de control de los ensayos, en `docs/escenario.md`.

## Qué incluye el tag

- `presentacion/`: las 21 láminas (`slides/*.html`, `deck.json`), el reproductor con pasos por clic (`data-paso`), la vista del presentador, el contador de láminas, el servidor que reenvía `/stage/*` y `/api/*` a la escuela, y sus tests.
- `servidor/`, `pack/`, `mcp-escuela/`, `stage/`: la demo como quedó el 22/10 (verificador de datos, acto 7, Sonnet 5.5, tres sesiones grabadas, Tablero).
- `npm test`: 82 tests en verde al momento del tag.
