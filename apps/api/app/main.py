from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.app.db.base import import_models
from apps.api.app.api.router import api_router

# Ensure all SQLAlchemy models are registered before startup/migrations.
import_models()


def get_cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ALLOW_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    return [
        "https://hn3t.pythonanywhere.com",
        # Manus preview exact host (current preview)
        "https://3000-i6ne3nzbqxau88uqlo4n4-e11040b0.us1.manus.computer",
        "http://127.0.0.1:5000",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

app = FastAPI(
    title="Workforce API",
    version="0.1.0",
)

# Allow an origin regex (env override supported) to permit Manus preview hosts like *.manus.computer
_allow_origin_regex = os.environ.get("CORS_ALLOW_ORIGIN_REGEX", r"https://.*\\.manus\\.computer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=_allow_origin_regex or None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {"message": "Workforce API is running"}


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix="/api/v1")
