"""
Workforce FastAPI backend — entry point.

Mounts all routers under /api/v1 to match the production PythonAnywhere
deployment path prefix used by the frontend.
"""
from fastapi import FastAPI

from backend.auth_router import router as auth_router

app = FastAPI(
    title="Workforce API",
    version="1.0.0",
    description=(
        "Production-aligned FastAPI backend for the Workforce Showcase. "
        "Run with: uvicorn backend.main:app --reload"
    ),
)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
