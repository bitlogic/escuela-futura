#!/bin/sh
# Levanta Escuela Futura en segundo plano y deja el PID en .escuela.pid y la salida en escuela.log.
# Uso: ./start.sh [--puerto N] [--sin-navegador]   (los flags van directo a ./escenario)
# Para cortarlo: ./stop.sh

cd "$(dirname "$0")" || exit 1
PIDFILE=.escuela.pid
LOG=escuela.log

# Puerto: flag --puerto, si no ESCUELA_PUERTO (entorno o .env), si no 8080.
PUERTO=""
prev=""
for a in "$@"; do
  [ "$prev" = "--puerto" ] && PUERTO=$a
  prev=$a
done
if [ -z "$PUERTO" ]; then
  PUERTO=${ESCUELA_PUERTO:-$( [ -f .env ] && sed -n 's/^[[:space:]]*ESCUELA_PUERTO[[:space:]]*=[[:space:]]*//p' .env | tail -1)}
  PUERTO=${PUERTO:-8080}
fi
URL="http://localhost:$PUERTO/stage/"

# ¿Ya está corriendo?
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Escuela Futura ya está corriendo (PID $(cat "$PIDFILE")) → $URL"
  exit 0
fi
rm -f "$PIDFILE"

if [ ! -f .env ] && [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Falta .env con ANTHROPIC_API_KEY (ver .env.example)." >&2
  exit 1
fi

: > "$LOG"
nohup ./escenario "$@" >> "$LOG" 2>&1 &
PID=$!
echo "$PID" > "$PIDFILE"

# Esperamos hasta 15 s a que el servidor conteste.
i=0
while [ $i -lt 30 ]; do
  if curl -fs "http://127.0.0.1:$PUERTO/api/estado" >/dev/null 2>&1; then
    echo "Escuela Futura corriendo (PID $PID) → $URL"
    echo "Log: $LOG · cortar con ./stop.sh"
    exit 0
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "El servidor se cerró al arrancar. Salida:" >&2
    cat "$LOG" >&2
    rm -f "$PIDFILE"
    exit 1
  fi
  i=$((i + 1))
  sleep 0.5
done

echo "El servidor no respondió en el puerto $PUERTO. Revisá $LOG" >&2
exit 1
