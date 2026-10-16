#!/usr/bin/env python3
"""Sube el equipo (dist/escuela-futura.team.png) como adjunto a un canal, para importarlo desde la tarjeta del mensaje.

Es el plan B cuando el selector de archivos de Agents → Teams → Import no hace nada en Buzz Dev.
Buzz muestra los adjuntos *.team.json como una tarjeta con botón de importar.

    python3 scripts/subir_equipo.py [canal]      (por defecto: coordinacion)

Pide el nsec por teclado y no lo guarda. Después de importar, `python3 scripts/canales.py reset` borra el mensaje.
"""
import base64
import getpass
import os
import struct
import zlib
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import canales  # noqa: E402  (reusa el CLI `buzz` y el relay de canales.json)

def png_con_equipo(json_path, destino):
    """El relay no acepta .json como adjunto: Buzz admite el mismo snapshot embebido en un PNG de 1×1 (chunk tEXt `buzz_team_snapshot`)."""
    def chunk(tipo, datos):
        c = tipo + datos
        return struct.pack(">I", len(datos)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    texto = base64.b64encode(json_path.read_bytes())
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
           + chunk(b"tEXt", b"buzz_team_snapshot\x00" + texto)
           + chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00\x00"))
           + chunk(b"IEND", b""))
    destino.write_bytes(png)


canal = sys.argv[1] if len(sys.argv) > 1 else "coordinacion"
archivo = canales.RAIZ / "dist" / "escuela-futura.team.json"
if not archivo.exists():
    sys.exit("Falta dist/escuela-futura.team.json: corré `node scripts/build-team.mjs`.")
png = archivo.with_suffix("").with_suffix(".team.png")
png_con_equipo(archivo, png)
if not os.environ.get("BUZZ_PRIVATE_KEY"):
    os.environ["BUZZ_PRIVATE_KEY"] = getpass.getpass("nsec (no se guarda): ").strip()

import hashlib
import json
import re

cid = canales.canal_id(canal)
sha = hashlib.sha256(png.read_bytes()).hexdigest()
BASE = [canales.BUZZ, "--relay", canales.CONFIG["relay"]]


def enviar(texto):
    r = subprocess.run(BASE + ["messages", "send", "--channel", cid, "--content", texto, "--file", str(png)], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"No se pudo enviar: {r.stderr.strip() or r.stdout.strip()}")


def url_subida():
    r = subprocess.run(BASE + ["--format", "json", "messages", "get", "--channel", cid, "--limit", "30"], capture_output=True, text=True)
    m = re.search(r'https?://[^\s"\\]*' + sha + r'[^\s"\\]*', r.stdout)
    if m:
        return m.group(0)
    todas = re.findall(r'https?://[^\s"\\]+/media/[^\s"\\]+\.png', r.stdout)   # si el relay renombró el archivo
    return todas[-1] if todas else None


# 1) El CLI adjunta el archivo como metadatos (imeta) pero Buzz dibuja la tarjeta a partir de un link
#    markdown en el texto: hace falta la URL que dejó la subida.
url = url_subida()
if not url:
    enviar("Equipo Escuela Futura")
    url = url_subida()
if not url:
    sys.exit("Subí el archivo pero no pude leer su URL del canal. Pasame la salida de `buzz messages get` y lo resuelvo.")
enviar(f"Equipo Escuela Futura: [escuela-futura.team.png]({url})")
print(f"Enviado a #{canal}. Abrí el canal en Buzz Dev: el último mensaje debería mostrar la tarjeta del equipo con botón Import.")
