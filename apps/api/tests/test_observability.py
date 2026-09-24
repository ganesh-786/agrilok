from __future__ import annotations

import pytest
from pydantic import SecretStr

from agrilok_api.observability import init_sentry
from agrilok_core.settings import Settings


@pytest.mark.parametrize("dsn", [None, SecretStr(""), SecretStr("  ")])
def test_an_empty_sentry_dsn_leaves_error_reporting_off(dsn: SecretStr | None) -> None:
    # The blank `SENTRY_DSN=` line in .env.example must not count as configured.
    assert init_sentry(Settings(sentry_dsn=dsn)) is False
