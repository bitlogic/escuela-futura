# Escuela Futura

Demo de la charla **Escuela Agéntica** (Innova Educa 21, 5/11/2026): una escuela ficticia donde seis agentes institucionales trabajan junto a una persona que decide. Los agentes corren sobre la API de Anthropic en un servidor propio; se los ve trabajar en una vista de la escuela desde arriba, en pixel-art, con el chat del equipo al lado.

Todo es ficticio: la escuela, los estudiantes y los datos.

## Qué hay acá

```
pack/                     fuente de verdad de los agentes
  instructions.md         instrucciones del equipo (compartidas)
  agents/*.persona.md     Coordinación, Tutor, Advisor, Bienestar, Admisiones, Academia (prompt + tools)
  avatars/                íconos
servidor/                 los agentes y el bus de menciones (Node, @anthropic-ai/sdk) · ver docs/bus.md
mcp-escuela/              herramientas de la escuela: en proceso para el servidor, por MCP (stdio) para Claude Code
data/escuela-futura.json  datos sintéticos (24 estudiantes de Biología 1)
stage/                    la vista: escuela desde arriba + chat + organigrama · ver stage/README.md
scripts/generar_datos.py  regenera data/
docs/bus.md               cómo funciona el bus y la API de la vista
docs/guion.md             guion de la demo en vivo · docs/e2e.md: el ensayo automático
```

## Puesta en marcha

Requisitos: Node 20+ y una API key de Anthropic.

```bash
npm install
cp .env.example .env      # y completá ANTHROPIC_API_KEY
./escenario               # levanta el servidor y abre http://localhost:8080/stage/
```

En la vista, escribí en la caja del chat como la persona que decide (por defecto "Alfredo"; `ESCUELA_DIRECTOR` en `.env` o `?nombre=Ana` en la URL lo cambian; sin `@mención` le hablás a Coordinación) y seguí `docs/escenario.md`. **Reiniciar** arranca una sesión nueva; **Guardar corrida** descarga lo que pasó para reproducirlo después (`stage/corridas/`). Sin servidor (o sin red), la vista reproduce la corrida grabada: plan B de la demo.

Flags: `./escenario --puerto 9000 --sin-navegador`. Variables: `ESCUELA_MODEL` (`claude-opus-5-5`), `ESCUELA_EFFORT` (`medium`), `ESCUELA_PUERTO`.

Para dejarlo corriendo en segundo plano: `./start.sh` (acepta los mismos flags; PID en `.escuela-<puerto>.pid`, salida en `escuela-<puerto>.log`) y `./stop.sh` para cortarlo.

Tests: `npm test`. Ensayo automático de la demo con puntaje: `npm run e2e` (ver `docs/e2e.md`).

## Cambiar algo

- **Un agente:** editá su `pack/agents/<nombre>.persona.md` (el frontmatter `tools:` dice qué herramientas usa) y reiniciá el servidor.
- **Las reglas del equipo:** `pack/instructions.md`.
- **Los datos:** editá `scripts/generar_datos.py` y corré `python3 scripts/generar_datos.py`. Las herramientas releen el archivo en cada llamada.
- **Las herramientas:** `mcp-escuela/herramientas.mjs`. Para usarlas desde Claude Code: `claude mcp add --scope user escuela-futura -- node "$PWD/mcp-escuela/server.mjs"`.
- **La vista:** `stage/` (ver su README).
