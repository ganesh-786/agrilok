"""Configuration, read once from the environment and the repository .env.

Every secret is a SecretStr so it cannot end up in a log line or an error
report by accident (CLAUDE.md rule 6). Nothing here is ever sent to the
browser; the web app has its own, public-only configuration.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# packages/core/src/agrilok_core/settings.py -> the repository root. Inside a
# container the file does not exist and only real environment variables count.
_REPO_ROOT = Path(__file__).resolve().parents[4]


def _env_file() -> Path:
    override = os.environ.get("AGRILOK_ENV_FILE")
    return Path(override) if override else _REPO_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "staging", "production"] = "development"
    log_level: Literal["debug", "info", "warning", "error"] = "info"

    # --- Gemini ------------------------------------------------------------
    gemini_api_key: SecretStr | None = None
    # ADR-0008: the live path runs on the Lite tier behind the support check.
    gemini_generation_model: str = "gemini-3.1-flash-lite"
    # Tried in order on overload or quota errors only. Keep these Lite-tier.
    gemini_generation_fallbacks: str = "gemini-3.5-flash-lite"
    # ADR-0008: pre-generated answers use the strongest model available, with
    # no fallback, because they are served to everyone.
    gemini_pregeneration_model: str = "gemini-3.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    gemini_embedding_dimensions: int = 768
    # Our ceilings, set below the published quota so we degrade on our own
    # terms (ADR-0004). Observed free-tier limits on 2026-09-18: 500 requests
    # a day for Lite models, 1,000 for embeddings. Dated observations, not
    # constants: check https://ai.google.dev/gemini-api/docs/rate-limits.
    gemini_max_requests_per_minute: int = Field(default=10, ge=1)
    gemini_max_requests_per_day: int = Field(default=400, ge=0)
    gemini_max_embed_requests_per_day: int = Field(default=900, ge=0)
    # Answers carry a verbatim quote per claim and Devanagari is token-heavy;
    # at 30 seconds long answers were cut off and retried from scratch.
    gemini_request_timeout_seconds: float = Field(default=90, gt=0)

    # --- Database ----------------------------------------------------------
    database_url: str = "postgresql://postgres@127.0.0.1:54329/agrilok"
    database_pool_size: int = Field(default=5, ge=1)

    # --- Retrieval and cache -------------------------------------------------
    # The golden set baseline (35 of 37) was measured with top 6 and 0.55.
    retrieval_top_k: int = Field(default=6, ge=1, le=20)
    retrieval_min_score: float = Field(default=0.55, ge=0, le=1)
    # A strong keyword hit may pass with a weaker vector score (ADR-0013).
    retrieval_keyword_min_score: float = Field(default=0.45, ge=0, le=1)
    semantic_cache_similarity_threshold: float = Field(default=0.92, ge=0, le=1)
    chunk_target_tokens: int = Field(default=400, ge=50)
    chunk_overlap_ratio: float = Field(default=0.15, ge=0, lt=1)

    # --- Review --------------------------------------------------------------
    # Below this, admission needs a recorded comparison against the PDF.
    ocr_min_confidence: float = Field(default=0.80, ge=0, le=1)

    # --- API -------------------------------------------------------------------
    # Shared secret between the web server and the API. Only a request that
    # carries it may speak for a browser (forwarded client id for rate limits).
    api_internal_token: SecretStr | None = None
    cors_allow_origins: str = "http://localhost:3000"
    sentry_dsn: SecretStr | None = None

    @property
    def generation_models(self) -> list[str]:
        fallbacks = [m.strip() for m in self.gemini_generation_fallbacks.split(",") if m.strip()]
        return [self.gemini_generation_model, *fallbacks]

    @property
    def gemini_configured(self) -> bool:
        return self.gemini_api_key is not None and bool(self.gemini_api_key.get_secret_value())

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
