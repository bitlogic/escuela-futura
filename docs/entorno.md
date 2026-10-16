# Entorno de la demo: cómo se levanta, siempre igual

Decisiones (12/10/2026):

- **La app es Buzz Dev**, la build del repo de Buzz (`~/github/buzz`, `just desktop-standalone`). **Buzz.app (la instalada) no se usa más**: tiene sus propios agentes con sus propias claves y, si está abierta con la misma identidad, se pelea con Buzz Dev por los agentes.
- **El relay es el hosteado**: comunidad `wss://escuelafutura.communities.buzz.xyz`. No se levanta Docker ni relay local.
- **La identidad es una sola** (el `nsec` de Alfre), importada en Buzz Dev. Es la dueña de los agentes y la única que descifra su actividad en el mapa.
- Todo lo de la escuela vive en este repo; Buzz no se toca.

Dónde guarda cada cosa Buzz Dev (sirve para entender los errores):

| Qué | Dónde |
|---|---|
| Datos de la app (identidad, agentes, logs) | `~/Library/Application Support/xyz.block.buzz.app.dev/` |
| Claves de los agentes | llavero de macOS, servicio `buzz-desktop-dev.main` |
| Frontend (Vite) | puerto calculado a partir de la ruta del repo; `bash scripts/entorno.sh estado` lo muestra |
| Herramientas de la escuela (MCP) | registradas en Claude Code a nivel usuario (`claude mcp list`) |

Buzz.app usa otra carpeta (`xyz.block.buzz.app`) y otro servicio de llavero (`buzz-desktop`). Por eso un agente creado en Buzz.app aparece en Buzz Dev **sin clave** y falla con `has no private key available`: la clave está en el otro llavero. La solución no es copiarla sino crear los agentes en Buzz Dev.

## Un solo comando por cosa

Todo se hace con `scripts/entorno.sh`, desde Terminal, en la Mac:

```bash
cd ~/github/escuela-futura
bash scripts/entorno.sh estado     # qué está corriendo y qué puertos están ocupados
bash scripts/entorno.sh apagar     # cierra Buzz.app, Buzz Dev, agentes huérfanos, la vista y Docker
bash scripts/entorno.sh buzz       # levanta Buzz Dev (terminal 1, queda ocupada)
bash scripts/entorno.sh vista      # levanta la vista desde arriba (terminal 2, queda ocupada)
```

## Los canales, desde afuera: `scripts/canales.py`

Buzz trae un CLI (`buzz`, se compila con `just desktop-standalone`) que habla con el relay con tu identidad. `scripts/canales.py` lo usa para dejar los seis canales en un estado conocido sin tocar la UI:

```bash
python3 scripts/canales.py estado     # miembros de cada canal (marca FANTASMA / FALTA) y cuántos mensajes hay
python3 scripts/canales.py miembros   # deja en cada canal exactamente lo que dice scripts/canales.json
python3 scripts/canales.py vaciar     # borra todos los mensajes de los seis canales
python3 scripts/canales.py reset      # miembros + vaciar: el punto de inicio de la demo
```

Pide el `nsec` por teclado y no lo guarda. Los agentes "verdaderos" son los que tiene Buzz Dev (los empareja por nombre); cualquier otro miembro que no sea el owner ni una persona listada en `canales.json` es fantasma y `miembros` lo saca. Para sumar a Greyla, poné su pubkey hex en `personas.coordinacion` de `scripts/canales.json`. Los fantasmas siguen siendo miembros de la **comunidad** hasta que los saques en Settings → Community → Members (eso no tiene CLI).

Antes de cada ensayo de la demo: `python3 scripts/canales.py reset`, y en Buzz Dev reiniciar los agentes con sesión nueva.

## Limpieza inicial (una vez)

El objetivo es que Buzz Dev tenga la identidad, los seis agentes con claves propias, y que no queden agentes viejos de Buzz.app dando vueltas en la comunidad.

1. **Apagar todo.** `bash scripts/entorno.sh apagar` y después `bash scripts/entorno.sh estado`: todo en `—` y los puertos libres.

2. **Borrar el estado de Buzz Dev y arrancar de cero.** `bash scripts/entorno.sh buzz --fresh`. Esto borra la carpeta de datos y el llavero dev de Buzz Dev (no toca Buzz.app ni nada del relay). Al abrir, Buzz Dev pide identidad: **Import** y pegar el `nsec`. Para conseguirlo, una única vez: abrir Buzz.app → Settings → Private key → Reveal → copiar; cerrar Buzz.app. No guardar el `nsec` en ningún archivo.

3. **Entrar a la comunidad.** Join community con la URL `wss://escuelafutura.communities.buzz.xyz`. Tienen que aparecer los canales `#coordinacion`, `#permanencia`, `#secretaria`, `#aula-biologia-1`, `#admisiones`, `#academia`. Si falta alguno (por ejemplo `#academia`), no hace falta crearlo a mano: `canales.py miembros` lo crea en el paso 6.

4. **Sacar los agentes fantasma.** En la comunidad van a seguir figurando como miembros los seis agentes de Buzz.app (los que tienen clave en el otro llavero). Quitarlos del canal no alcanza: siguen siendo miembros de la comunidad y reaparecen en el selector al agregar gente. Se sacan en **Settings → Community → Members → `…` → Remove from community** (sos owner). Cómo reconocerlos: un agente que no se puede arrancar desde Agents es fantasma; `bash scripts/entorno.sh estado` lista solo los verdaderos. Si Buzz Dev los muestra como agentes propios sin clave, borrarlos también de Agents.

5. **Importar el equipo.** `node scripts/build-team.mjs` (por si cambió algo en `pack/`) y después en Buzz Dev: Agents → Agent teams → Import → `dist/escuela-futura.team.json`. Se crean los seis agentes con claves nuevas, guardadas en el llavero dev. Si macOS pregunta por el llavero: **Always Allow**.

6. **Sumarlos a los canales:** `python3 scripts/canales.py miembros` (agrega los verdaderos, saca los fantasmas de cada canal). A mano sería según la tabla del README.

7. **Probar uno.** Arrancar Coordinación y escribirle en `#coordinacion` `@Coordinación ¿qué herramientas tenés?`. Tiene que listar las de `escuela-futura`. Si no las ve, `claude mcp list` en Terminal tiene que mostrar `escuela-futura`; `bash scripts/entorno.sh buzz` lo registra solo si falta.

Después de esto, `bash scripts/entorno.sh estado` muestra los seis agentes con `clave: sí`.

## Cada vez (rutina de demo o de prueba)

```bash
# Terminal 1
cd ~/github/escuela-futura && bash scripts/entorno.sh apagar && bash scripts/entorno.sh buzz

# Terminal 2
cd ~/github/escuela-futura && bash scripts/entorno.sh vista
```

Si querés arrancar de cero: `python3 scripts/canales.py reset` (borra los mensajes de los seis canales). En Buzz Dev: arrancar los seis agentes **con sesión nueva** (si reusan sesión, no vuelven a llamar a las herramientas y el mapa no los ve moverse). En la vista: **En vivo** → relay `wss://escuelafutura.communities.buzz.xyz`, el `nsec`, canal `e1343f4a-82ac-4627-846f-3b460f886466` (`#coordinacion`). Después, seguir `docs/escenario.md`.

Para cortar: Ctrl+C en las dos terminales. El `just desktop-standalone` de Buzz mata a los agentes al salir; si algo queda vivo, `bash scripts/entorno.sh apagar`.

## Si algo falla

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `agent … has no private key available — the OS keyring may be unreachable` | El agente fue creado en otra app (Buzz.app) o se negó el acceso al llavero | `estado` muestra `clave: NO`. Borrar ese agente en Buzz Dev y reimportar el equipo; si fue el diálogo del llavero, relanzar y **Always Allow** |
| Dos agentes con el mismo nombre, o nadie responde en el canal aunque por DM sí | Fantasmas: los de Buzz.app siguen en la comunidad y en el canal están ellos, no los nuevos | Quitar los viejos de la comunidad (paso 4) y agregar los verdaderos a cada canal |
| Los agentes no llaman herramientas | Sesión reusada | Arrancarlos con sesión nueva |
| `restricted: not a channel member` en la vista o el probe | La identidad no está en ese canal, o el relay no es el hosteado | Revisar relay y que tu usuario esté en `#coordinacion` |
| Vite no arranca / puerto ocupado | Quedó un Buzz Dev anterior | `apagar` y volver a `buzz` |
| Buzz Dev no abre la comunidad | Sin internet o el relay hosteado caído | Plan B: la vista reproduce la corrida grabada sin Buzz (`escuela.py` solo) |

Regla: los agentes se crean en **una sola app**. Si alguna vez hay que reimportar el equipo (claves nuevas), primero se quitan de la comunidad los anteriores, después se importa, después se suman a los canales.

## Greyla

Greyla necesita su propia identidad en Buzz (otra Mac con Buzz.app o Buzz Dev, su propio `nsec`) y que la sumemos a la comunidad y a `#coordinacion`. Hasta entonces los agentes le hablan a "Alfredo Edye".
