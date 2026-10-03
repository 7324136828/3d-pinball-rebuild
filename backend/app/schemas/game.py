"""Bounded JSON contracts. Names remain plain text, never HTML."""

from __future__ import annotations

import unicodedata
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from ..config import MAX_DURATION_MS, MAX_SCORE

PlayerName = Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=32)]
Score = Annotated[int, Field(strict=True, ge=0, le=MAX_SCORE)]


class StartGameRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    player_names: Annotated[list[PlayerName], Field(min_length=1, max_length=4)]

    @field_validator("player_names")
    @classmethod
    def names_are_printable(cls, names: list[str]) -> list[str]:
        if any(unicodedata.category(character) in {"Cc", "Cs"} for name in names for character in name):
            raise ValueError("Player names cannot contain control characters")
        return names


class CompleteGameRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scores: Annotated[list[Score], Field(min_length=1, max_length=4)]
    duration_ms: Annotated[int, Field(strict=True, ge=0, le=MAX_DURATION_MS)]


class GameResponse(BaseModel):
    id: str
    status: Literal["active"]
    player_names: list[str]
    created_at: str


class RankedResult(BaseModel):
    id: int
    rank: int
    player_name: str
    score: int
    played_at: str


class CompletionResponse(BaseModel):
    game_id: str
    results: list[RankedResult]


class LeaderboardResponse(BaseModel):
    entries: list[RankedResult]
    total: int