#!/usr/bin/env python3
"""Deja los canales de Escuela Futura en un estado conocido, desde afuera de la UI de Buzz.

    python3 scripts/canales.py estado     qué hay en cada canal (miembros, fantasmas, cantidad de mensajes)
    python3 scripts/canales.py miembros   deja en cada canal exactamente los miembros de scripts/canales.json
    python3 scripts/canales.py vaciar     borra todos los mensajes de los seis canales
    python3 scripts/canales.py reset      miembros + vaciar: el punto de inicio de la demo

Usa el CLI `buzz` del repo de Buzz (BUZZ_BIN) contra el relay de scripts/canales.json.
Pide el nsec por teclado (no lo guarda); si BUZZ_PRIVATE_KEY ya está en el entorno, lo usa.
Los agentes "verdaderos" son los de Buzz Dev (~/Library/Application Support/xyz.block.buzz.app.dev);
cualquier otro miembro que no sea el owner ni una persona listada se considera fantasma y se saca.
"""
import getpass
import json
import os
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONFIG = json.loads((RAIZ / "scripts" / "canales.json").read_text())
AGENTES = {a["id"]: a["nombre"] for a in json.loads((RAIZ / "stage" / "agentes.json").read_text())["agentes"]}
DEV_DATA = Path.home() / "Library/Application Support/xyz.block.buzz.app.dev"
BUZZ_DIR = Path(os.environ.get("BUZZ_DIR", Path.home() / "github/buzz"))


def buzz_bin():
    if os.environ.get("BUZZ_BIN"):
        return os.environ["BUZZ_BIN"]
    if shutil.which("buzz"):
        return "buzz"
    # El binario compilado en target/ primero: la copia en src-tauri/binaries (sidecar) a veces la mata macOS (SIGKILL, -9)
    for destino in ("debug", "release"):
        directo = BUZZ_DIR / "target" / destino / "buzz"
        if directo.exists():
            return str(directo)
    candidatos = sorted((BUZZ_DIR / "desktop/src-tauri/binaries").glob("buzz-*apple-darwin"))
    candidatos = [c for c in candidatos if c.name.startswith("buzz-") and not c.name.startswith(("buzz-acp", "buzz-agent", "buzz-backend", "buzz-dev"))]
    if candidatos:
        return str(candidatos[0])
    sys.exit("No encuentro el CLI `buzz`. Corré `just desktop-standalone` una vez (lo compila) o seteá BUZZ_BIN.")


BUZZ = buzz_bin()


def buzz(*args, parse=True):
    cmd = [BUZZ, "--relay", CONFIG["relay"], "--format", "json", *args]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"buzz {' '.join(args[:3])} falló ({r.returncode}): {r.stderr.strip() or r.stdout.strip()}")
    return json.loads(r.stdout) if parse and r.stdout.strip() else r.stdout


def normalizar(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip()


def agentes_verdaderos():
    """id → pubkey, leyendo los agentes de Buzz Dev y emparejando por nombre."""
    ruta = DEV_DATA / "agents/managed-agents.json"
    if not ruta.exists():
        sys.exit(f"No existe {ruta}: Buzz Dev no tiene agentes importados.")
    por_nombre = {normalizar(a["name"]): a["pubkey"] for a in json.loads(ruta.read_text()) if a.get("pubkey")}
    out = {}
    for aid, nombre in AGENTES.items():
        pk = por_nombre.get(normalizar(nombre))
        if not pk:
            sys.exit(f"Buzz Dev no tiene un agente llamado «{nombre}». Importá dist/escuela-futura.team.json primero.")
        out[aid] = pk
    return out


def canal_id(nombre, crear=False):
    res = buzz("channels", "search", "--query", nombre, "--exact")
    if not res and crear:
        nuevo = buzz("channels", "create", "--name", nombre, "--type", "stream", "--visibility", "open")
        print(f"  creé el canal #{nombre}")
        return nuevo.get("channel_id") or nuevo["id"]
    if not res:
        sys.exit(f"No encuentro el canal #{nombre} en el relay.")
    if len(res) > 1:
        print(f"  ⚠ hay {len(res)} canales llamados #{nombre}; uso el primero ({res[0]['channel_id']})")
    return res[0]["channel_id"]


def nombres(pubkeys):
    if not pubkeys:
        return {}
    args = []
    for pk in pubkeys:
        args += ["--pubkey", pk]
    try:
        perfiles = buzz("users", "get", *args)
    except SystemExit:
        return {}
    return {p["pubkey"]: p.get("display_name") or "" for p in perfiles}


def plan(crear=False):
    yo = buzz("users", "get")
    mi_pk = (yo[0] if isinstance(yo, list) else yo)["pubkey"]
    reales = agentes_verdaderos()
    personas = CONFIG.get("personas", {})
    out = []
    for nombre, ids in CONFIG["canales"].items():
        cid = canal_id(nombre, crear)
        esperados = {reales[i] for i in ids} | {mi_pk} | set(personas.get(nombre, []))
        actuales = {m["pubkey"]: m.get("role", "member") for m in buzz("channels", "members", "--channel", cid)}
        out.append(dict(nombre=nombre, id=cid, esperados=esperados, actuales=actuales, mi_pk=mi_pk, reales=reales))
    return out


def estado():
    for c in plan():
        msgs = buzz("messages", "get", "--channel", c["id"], "--limit", "1000")
        print(f"\n#{c['nombre']}  {c['id']}  ·  {len(msgs)} mensajes")
        etiquetas = {pk: aid for aid, pk in c["reales"].items()}
        nom = nombres([pk for pk in c["actuales"] if pk not in etiquetas and pk != c["mi_pk"]])
        for pk, rol in c["actuales"].items():
            if pk == c["mi_pk"]:
                tipo = "owner (vos)"
            elif pk in etiquetas:
                tipo = f"agente {AGENTES[etiquetas[pk]]}"
            elif pk in c["esperados"]:
                tipo = f"persona {nom.get(pk, '')}".strip()
            else:
                tipo = f"FANTASMA {nom.get(pk, '')}".strip()
            print(f"  {pk[:8]}  {rol:7}  {tipo}")
        for pk in sorted(c["esperados"] - set(c["actuales"])):
            print(f"  {pk[:8]}  —        FALTA {AGENTES.get(etiquetas.get(pk, ''), 'persona')}")


def miembros():
    for c in plan(crear=True):
        faltan = c["esperados"] - set(c["actuales"])
        sobran = set(c["actuales"]) - c["esperados"] - {c["mi_pk"]}
        sobran = {pk for pk in sobran if c["actuales"][pk] != "owner"}
        print(f"\n#{c['nombre']}: +{len(faltan)} −{len(sobran)}")
        for pk in sorted(sobran):
            buzz("channels", "remove-member", "--channel", c["id"], "--pubkey", pk, parse=False)
            print(f"  saqué   {pk[:8]}")
        for pk in sorted(faltan):
            rol = "bot" if pk in c["reales"].values() else "member"
            buzz("channels", "add-member", "--channel", c["id"], "--pubkey", pk, "--role", rol, parse=False)
            print(f"  agregué {pk[:8]} ({rol})")


def vaciar():
    for c in plan():
        total = 0
        while True:
            msgs = buzz("messages", "get", "--channel", c["id"], "--limit", "500")
            if not msgs:
                break
            for m in msgs:
                buzz("messages", "delete", "--event", m["id"], parse=False)
                total += 1
            if len(msgs) < 500:
                break
        print(f"#{c['nombre']}: borré {total} mensajes")


def main():
    accion = sys.argv[1] if len(sys.argv) > 1 else ""
    if accion not in {"estado", "miembros", "vaciar", "reset"}:
        print(__doc__)
        sys.exit(1)
    if not os.environ.get("BUZZ_PRIVATE_KEY"):
        os.environ["BUZZ_PRIVATE_KEY"] = getpass.getpass("nsec del owner (no se guarda): ").strip()
    if accion == "reset":
        print("Esto deja los miembros según canales.json y BORRA todos los mensajes de los seis canales.")
        if input("¿Seguimos? [s/N] ").strip().lower() != "s":
            sys.exit(0)
        miembros()
        vaciar()
    else:
        {"estado": estado, "miembros": miembros, "vaciar": vaciar}[accion]()
    print("\nlisto.")


if __name__ == "__main__":
    main()
