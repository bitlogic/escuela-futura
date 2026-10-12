# Escuela Futura

Demo de la charla **Escuela Agéntica** (Innova Educa 21, 5/11/2026): una escuela ficticia donde cinco agentes institucionales trabajan junto a personas en [Buzz](https://github.com/block/buzz).

Todo es ficticio: la escuela, los estudiantes y los datos.

## Qué hay acá

```
pack/                     Persona Pack de Buzz (fuente de verdad de los agentes)
  .plugin/plugin.json     manifiesto
  instructions.md         instrucciones del equipo (compartidas)
  agents/*.persona.md     Coordinación, Tutor, Advisor, Bienestar, Admisiones
  avatars/                íconos (.svg editables + .png)
  .mcp.json               servidor MCP de la escuela
mcp-escuela/server.mjs    herramientas de la escuela (MCP por stdio, sin dependencias)
data/escuela-futura.json  datos sintéticos (24 estudiantes de Biología 1)
scripts/
  generar_datos.py        regenera data/ (python3 scripts/generar_datos.py)
  build-team.mjs          arma dist/escuela-futura.team.json desde pack/
dist/escuela-futura.team.json   equipo listo para importar en el desktop de Buzz
docs/escenario.md         guion de la prueba "Primer año en riesgo"
```

## Puesta en marcha

Requisitos: Buzz corriendo (relay + desktop), Node 18+ y Claude Code instalado y logueado.

1. **Registrar las herramientas de la escuela en Claude Code** (los agentes de Buzz con runtime Claude las toman de ahí):

   ```bash
   claude mcp add --scope user escuela-futura -- node "$HOME/github/escuela-futura/mcp-escuela/server.mjs"
   claude mcp list   # debería mostrar escuela-futura
   ```

2. **Importar el equipo en Buzz:** desktop → Agents → *Agent teams* → **Import** → `dist/escuela-futura.team.json`.
   Se crean los 5 agentes con sus avatares, prompts e instrucciones del equipo.

3. **Crear los canales** y sumar a los agentes:

   | Canal | Miembros |
   |---|---|
   | `#coordinacion` | todos + Greyla |
   | `#permanencia` | Bienestar, Coordinación |
   | `#secretaria` | Advisor, Coordinación |
   | `#aula-biologia-1` | Tutor, Coordinación |
   | `#admisiones` | Admisiones |

4. Seguí `docs/escenario.md`.

## Cambiar algo

- **Un agente:** editá su `pack/agents/<nombre>.persona.md` y corré `node scripts/build-team.mjs`. Reimportá el equipo (o pegá el prompt a mano en el agente).
- **Los datos:** editá `scripts/generar_datos.py` y corré `python3 scripts/generar_datos.py`. El servidor MCP relee el archivo en cada llamada.
- **Los íconos:** reemplazá los `.png` en `pack/avatars/` (512×512) y volvé a armar el equipo.
- **El modelo:** `ESCUELA_MODEL=<id> node scripts/build-team.mjs`. Sin la variable, cada agente usa el modelo por defecto del runtime.

## Notas

- El desktop de Buzz no importa Persona Packs directamente; por eso `build-team.mjs` los traduce al formato de team snapshot.
- Los agentes se crean con `respondTo: anyone` para que puedan mencionarse entre ellos. Usalos solo en un relay privado.
- `pack/.mcp.json` usa `${ESCUELA_FUTURA_DIR}`; sirve si en algún momento se corre el pack con `buzz-acp` directamente.
