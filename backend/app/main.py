"""Pinball sessions, SQLite leaderboard and original table geometry API."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .config import Settings
from .schemas.game import CompleteGameRequest, CompletionResponse, GameResponse, LeaderboardResponse, StartGameRequest
from .services.original_project import OriginalProjectAdapter
from .store import CompletionConflict, GameExpired, GameNotFound, PinballStore, PlayerCountMismatch

logger = logging.getLogger(__name__)


def get_store(request: Request) -> PinballStore:
    return request.app.state.pinball_store


def create_app(database_path: Path | None = None, *, settings: Settings | None = None) -> FastAPI:
    configured = settings or Settings.from_environment()
    store = PinballStore(database_path or configured.database_path, configured.session_ttl_seconds)
    original_project = OriginalProjectAdapter()
    static_dir = configured.static_dir.resolve() if configured.static_dir else None

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        store.initialize()
        original_project.initialize()
        if static_dir and not (static_dir / "index.html").is_file():
            raise RuntimeError("PINBALL_STATIC_DIR has no index.html; build the frontend before starting production mode")
        application.state.pinball_store = store
        yield

    application = FastAPI(
        title="Modern 3D Pinball API",
        description="Local leaderboard of browser-reported scores. Game sessions prevent duplicate submissions; scores are not server-verified.",
        version="1.0.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(configured.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @application.middleware("http")
    async def response_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        if request.url.path.startswith("/api/") and request.url.path != "/api/table":
            response.headers["Cache-Control"] = "no-store"
        return response

    @application.exception_handler(sqlite3.Error)
    async def database_error(request: Request, exception: sqlite3.Error):
        logger.error("SQLite operation failed", exc_info=exception)
        return JSONResponse(status_code=503, content={"detail": "Ranking storage is temporarily unavailable; please retry"})

    @application.get("/api/health")
    def health(pinball_store: PinballStore = Depends(get_store)) -> dict[str, str]:
        if not pinball_store.healthy():
            raise HTTPException(status_code=503, detail="Ranking storage is unavailable")
        return {"status": "ok"}

    @application.get("/api/table")
    def table(request: Request) -> Response:
        headers = {"ETag": original_project.etag, "Cache-Control": "public, max-age=3600"}
        if request.headers.get("if-none-match") == original_project.etag:
            return Response(status_code=304, headers=headers)
        return Response(content=original_project.table_bytes, media_type="application/json", headers=headers)

    @application.post("/api/games", response_model=GameResponse, status_code=201)
    def start_game(body: StartGameRequest, pinball_store: PinballStore = Depends(get_store)) -> dict:
        return pinball_store.start_game(body.player_names)

    @application.post("/api/games/{game_id}/complete", response_model=CompletionResponse)
    def complete_game(game_id: UUID, body: CompleteGameRequest, pinball_store: PinballStore = Depends(get_store)) -> dict:
        try:
            return pinball_store.complete_game(str(game_id), body.scores, body.duration_ms)
        except GameNotFound:
            raise HTTPException(status_code=404, detail="Game session not found") from None
        except CompletionConflict:
            raise HTTPException(status_code=409, detail="This game already has different completed results") from None
        except GameExpired:
            raise HTTPException(status_code=410, detail="Game session expired; start a new game") from None
        except PlayerCountMismatch:
            raise HTTPException(status_code=422, detail="Submit one final score for each registered player") from None

    @application.get("/api/leaderboard", response_model=LeaderboardResponse)
    def leaderboard(
        limit: int = Query(default=10, ge=1, le=100),
        offset: int = Query(default=0, ge=0, le=1_000_000),
        pinball_store: PinballStore = Depends(get_store),
    ) -> dict:
        return pinball_store.leaderboard(limit, offset)

    if static_dir:
        @application.get("/{path:path}", include_in_schema=False)
        def frontend(path: str) -> FileResponse:
            if path == "api" or path.startswith("api/"):
                raise HTTPException(status_code=404, detail="API route not found")
            candidate = (static_dir / path).resolve()
            if not candidate.is_relative_to(static_dir):
                raise HTTPException(status_code=404, detail="File not found")
            if candidate.is_file():
                cache = "public, max-age=31536000, immutable" if path.startswith("assets/") else "no-cache"
                return FileResponse(candidate, headers={"Cache-Control": cache})
            if candidate.suffix:
                raise HTTPException(status_code=404, detail="File not found")
            return FileResponse(static_dir / "index.html", headers={"Cache-Control": "no-cache"})

    return application


app = create_app()
