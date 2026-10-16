#!/usr/bin/env bash
# Entorno de la demo Escuela Futura — se corre en la Mac, desde Terminal.
#
#   bash scripts/entorno.sh estado          qué está corriendo (apps, agentes, puertos)
#   bash scripts/entorno.sh apagar          cierra todo: Buzz.app, Buzz Dev, agentes, vista, Docker
#   bash scripts/entorno.sh buzz            levanta Buzz Dev (build del repo) contra el relay hosteado
#   bash scripts/entorno.sh buzz --fresh    igual, pero borrando antes TODO el estado de Buzz Dev
#   bash scripts/entorno.sh escenario       (o: vista) levanta la vista "la escuela desde arriba" (puerto 8080)
#
# La receta completa está en docs/entorno.md.
set -euo pipefail

BUZZ_DIR="${BUZZ_DIR:-$HOME/github/buzz}"
ESCUELA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_ID="xyz.block.buzz.app.dev"
DEV_DATA="$HOME/Library/Application Support/$DEV_ID"
VISTA_PUERTO="${VISTA_PUERTO:-8080}"

# Puerto de Vite que usa Buzz Dev: lo calcula instance-env.sh a partir de la ruta del repo.
vite_port() {
  python3 -c "import hashlib,sys; h=int(hashlib.sha256(sys.argv[1].encode()).hexdigest(),16); print(10000+h%55000)" "$BUZZ_DIR"
}

titulo() { printf '\n\033[1m%s\033[0m\n' "$*"; }

listar() { # listar <patrón pgrep -f> <etiqueta>
  local pids
  pids=$(pgrep -f "$1" || true)
  if [[ -n "$pids" ]]; then
    printf '  %-28s corriendo (pid %s)\n' "$2" "$(echo "$pids" | tr '\n' ' ')"
  else
    printf '  %-28s —\n' "$2"
  fi
}

puerto() { # puerto <n> <etiqueta>
  if lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; then
    printf '  :%-6s %-22s ocupado por %s\n' "$1" "$2" "$(lsof -nP -iTCP:"$1" -sTCP:LISTEN | awk 'NR==2{print $1" (pid "$2")"}')"
  else
    printf '  :%-6s %-22s libre\n' "$1" "$2"
  fi
}

estado() {
  local vp; vp=$(vite_port)
  titulo "Apps"
  listar "/Applications/Buzz.app/Contents/MacOS" "Buzz.app (instalada)"
  listar "src-tauri/target/debug/buzz-desktop" "Buzz Dev (repo)"
  listar "node_modules/.bin/vite" "Vite (frontend Buzz Dev)"
  titulo "Agentes y herramientas"
  listar "buzz-acp" "buzz-acp (harness)"
  listar "buzz-agent" "buzz-agent"
  listar "mcp-escuela/server.mjs" "MCP escuela-futura"
  titulo "Vista desde arriba"
  listar "escuela.py" "escuela.py"
  listar "http.server" "python -m http.server"
  titulo "Puertos"
  puerto "$vp" "Vite de Buzz Dev"
  puerto "$VISTA_PUERTO" "vista desde arriba"
  puerto 3000 "relay local (no se usa)"
  puerto 5432 "Postgres (Docker)"
  titulo "Estado de Buzz Dev"
  if [[ -d "$DEV_DATA" ]]; then
    echo "  datos:   $DEV_DATA"
    if [[ -f "$DEV_DATA/agents/managed-agents.json" ]]; then
      # Las claves pueden estar inline en el archivo o migradas al llavero dev; miramos los dos.
      # El blob del llavero no se imprime: solo se usan los nombres de sus entradas.
      BLOB="$(security find-generic-password -s "buzz-desktop-dev.main" -a secrets -w 2>/dev/null || true)" \
      python3 - "$DEV_DATA/agents/managed-agents.json" <<'PY'
import json, os, sys
try:
    en_llavero = set(k.split("agent:",1)[1] for k in json.loads(os.environ.get("BLOB") or "{}") if k.startswith("agent:"))
except Exception:
    en_llavero = set()
try:
    for a in json.load(open(sys.argv[1])):
        pk = a.get("pubkey", "")
        if not pk:
            continue          # sin pubkey = definición (persona), no una instancia con clave
        if a.get("private_key_nsec"): clave = "sí (archivo)"
        elif pk in en_llavero:        clave = "sí (llavero)"
        else:                         clave = "NO → no va a arrancar"
        print(f"  agente:  {a.get('name','?'):14} {pk[:8]}  clave: {clave}")
except Exception as e:
    print("  (no pude leer managed-agents.json:", e, ")")
PY
    fi
  else
    echo "  sin estado (nunca se abrió, o se limpió con --fresh)"
  fi
  if security find-generic-password -s "buzz-desktop-dev.main" -a secrets >/dev/null 2>&1; then
    echo "  llavero: buzz-desktop-dev.main presente"
  else
    echo "  llavero: buzz-desktop-dev.main ausente (las claves de los agentes, si existen, están en el archivo)"
  fi
  echo
}

matar() { # matar <patrón> <etiqueta>
  local pids
  pids=$(pgrep -f "$1" || true)
  [[ -z "$pids" ]] && return 0
  echo "  cerrando $2 (pid $(echo "$pids" | tr '\n' ' '))"
  kill $pids 2>/dev/null || true
  sleep 1
  pids=$(pgrep -f "$1" || true)
  [[ -n "$pids" ]] && kill -9 $pids 2>/dev/null || true
}

apagar() {
  titulo "Apagando todo"
  osascript -e 'tell application "Buzz" to quit' >/dev/null 2>&1 || true
  osascript -e 'tell application "Buzz Dev" to quit' >/dev/null 2>&1 || true
  sleep 1
  # Agentes que quedaron huérfanos de Buzz Dev (mismo mecanismo que usa el justfile de Buzz)
  if [[ -x "$BUZZ_DIR/scripts/cleanup-instance-agents.sh" ]]; then
    "$BUZZ_DIR/scripts/cleanup-instance-agents.sh" "$DEV_ID" || true
  fi
  matar "/Applications/Buzz.app/Contents/MacOS" "Buzz.app"
  matar "src-tauri/target/debug/buzz-desktop" "Buzz Dev"
  matar "node_modules/.bin/vite" "Vite"
  matar "buzz-acp" "buzz-acp"
  matar "buzz-agent" "buzz-agent"
  matar "mcp-escuela/server.mjs" "MCP escuela-futura"
  matar "escuela.py" "escuela.py"
  matar "http.server" "http.server"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    if [[ -f "$BUZZ_DIR/docker-compose.yml" || -f "$BUZZ_DIR/compose.yml" ]]; then
      echo "  bajando Docker de Buzz (relay local)"
      (cd "$BUZZ_DIR" && docker compose down >/dev/null 2>&1) || true
    fi
  fi
  rm -f /tmp/buzz-keychain-*.lock 2>/dev/null || true
  echo "  listo."
  estado
}

buzz() {
  local fresh=""
  [[ "${1:-}" == "--fresh" ]] && fresh="fresh=1"
  if pgrep -f "/Applications/Buzz.app/Contents/MacOS" >/dev/null; then
    echo "Buzz.app está abierta. Cerrala primero (scripts/entorno.sh apagar): dos apps con la misma identidad se pelean por los agentes." >&2
    exit 1
  fi
  if pgrep -f "src-tauri/target/debug/buzz-desktop" >/dev/null; then
    echo "Buzz Dev ya está corriendo." >&2
    exit 1
  fi
  if ! claude mcp list 2>/dev/null | grep -q escuela-futura; then
    echo "Registrando el MCP escuela-futura en Claude Code…"
    claude mcp add --scope user escuela-futura -- node "$ESCUELA_DIR/mcp-escuela/server.mjs"
  fi
  [[ -n "$fresh" ]] && echo "⚠ --fresh borra TODO el estado de Buzz Dev (identidad, agentes, llavero dev). Vas a tener que importar tu nsec y el equipo de nuevo."
  echo "Buzz Dev en http://localhost:$(vite_port) (Vite) · relay: la comunidad hosteada que elijas al entrar"
  cd "$BUZZ_DIR"
  # shellcheck disable=SC1091
  . ./bin/activate-hermit
  exec just ${fresh:+$fresh} desktop-standalone
}

vista() {
  cd "$ESCUELA_DIR"
  exec python3 escuela.py --puerto "$VISTA_PUERTO"
}

case "${1:-}" in
  estado) estado ;;
  apagar) apagar ;;
  buzz)   shift; buzz "$@" ;;
  vista|escenario) vista ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac
