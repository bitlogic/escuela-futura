#!/bin/sh
# Corta Escuela Futura levantada con ./start.sh (por PID; si no hay PID, por el puerto).
# Uso: ./stop.sh [--puerto N]

cd "$(dirname "$0")" || exit 1

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
PIDFILE=.escuela-$PUERTO.pid

PIDS=""
if [ -f "$PIDFILE" ]; then
  PIDS=$(cat "$PIDFILE")
  kill -0 "$PIDS" 2>/dev/null || PIDS=""
fi
# Sin PID válido: buscamos quién escucha en el puerto.
[ -z "$PIDS" ] && PIDS=$(lsof -tiTCP:"$PUERTO" -sTCP:LISTEN 2>/dev/null)

if [ -z "$PIDS" ]; then
  echo "Escuela Futura no está corriendo."
  rm -f "$PIDFILE"
  exit 0
fi

kill $PIDS 2>/dev/null
# Hasta 5 s para que cierre solo; después SIGKILL.
i=0
while [ $i -lt 10 ]; do
  vivo=""
  for p in $PIDS; do kill -0 "$p" 2>/dev/null && vivo=1; done
  [ -z "$vivo" ] && break
  i=$((i + 1))
  sleep 0.5
done
for p in $PIDS; do kill -0 "$p" 2>/dev/null && kill -9 "$p" 2>/dev/null; done

rm -f "$PIDFILE"
echo "Escuela Futura detenida (PID $PIDS)."
