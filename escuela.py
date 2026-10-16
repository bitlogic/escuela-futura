#!/usr/bin/env python3
"""Levanta la vista de Escuela Futura y abre el navegador.

    python3 escuela.py            # puerto 8080
    python3 escuela.py --puerto 9000 --sin-navegador

La vista reproduce la corrida grabada y, con el botón "En vivo", se conecta al relay de Buzz.
"""
import argparse
import functools
import http.server
import socketserver
import threading
import webbrowser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--puerto", type=int, default=8080)
    ap.add_argument("--sin-navegador", action="store_true")
    args = ap.parse_args()

    socketserver.TCPServer.allow_reuse_address = True
    handler = functools.partial(Handler, directory=str(RAIZ))
    with socketserver.ThreadingTCPServer(("127.0.0.1", args.puerto), handler) as srv:
        url = f"http://localhost:{args.puerto}/stage/"
        print(f"Escuela Futura → {url}   (Ctrl+C para cortar)")
        if not args.sin_navegador:
            threading.Timer(0.5, lambda: webbrowser.open(url)).start()
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print()


if __name__ == "__main__":
    main()
