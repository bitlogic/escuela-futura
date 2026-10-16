#!/usr/bin/env python3
"""Publica el canvas de un canal desde scripts/canvas/<canal>.md.

    python3 scripts/canvas.py welcome       (usa scripts/canvas/welcome.md en el canal #welcome)

Pide el nsec por teclado y no lo guarda. Reemplaza el canvas completo del canal.
"""
import getpass
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import canales  # noqa: E402  (reusa el CLI `buzz` y el relay de canales.json)

canal = sys.argv[1] if len(sys.argv) > 1 else "welcome"
archivo = canales.RAIZ / "scripts" / "canvas" / f"{canal}.md"
if not archivo.exists():
    sys.exit(f"No existe {archivo}.")
if not os.environ.get("BUZZ_PRIVATE_KEY"):
    os.environ["BUZZ_PRIVATE_KEY"] = getpass.getpass("nsec (no se guarda): ").strip()

cid = canales.canal_id(canal)
r = subprocess.run([canales.BUZZ, "--relay", canales.CONFIG["relay"], "canvas", "set", "--channel", cid, "--content", "-"],
                   input=archivo.read_text(), capture_output=True, text=True)
if r.returncode != 0:
    sys.exit(f"No se pudo publicar: {r.stderr.strip() or r.stdout.strip()}")
print(f"Canvas de #{canal} publicado ({archivo.name}).")
