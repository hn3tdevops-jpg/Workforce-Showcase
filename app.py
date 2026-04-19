from pathlib import Path
from flask import Flask, send_from_directory, abort

BASE_DIR = Path(__file__).resolve().parent
import os

FRONTEND_DIST = os.environ.get("FRONTEND_DIST_DIR")
if FRONTEND_DIST:
    DIST_DIR = Path(FRONTEND_DIST).resolve()
else:
    DIST_DIR = BASE_DIR / "dist"

app = Flask(__name__, static_folder=None)

@app.route("/assets/<path:filename>")
def assets(filename: str):
    return send_from_directory(DIST_DIR / "assets", filename)

@app.route("/images/<path:filename>")
def images(filename: str):
    return send_from_directory(DIST_DIR / "images", filename)

@app.route("/favicon.svg")
def favicon_svg():
    return send_from_directory(DIST_DIR, "favicon.svg")

@app.route("/favicon.ico")
def favicon_ico():
    ico = DIST_DIR / "favicon.ico"
    if ico.exists():
        return send_from_directory(DIST_DIR, "favicon.ico")
    abort(404)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa(path: str):
    candidate = DIST_DIR / path
    if path and candidate.exists() and candidate.is_file():
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")

application = app
