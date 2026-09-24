# syntax=docker/dockerfile:1.7
#
# The agrilok API. Build from the repository root, because the API depends on
# packages/core and infra through the uv workspace:
#
#   docker build -f apps/api/Dockerfile -t agrilok-api .
#   docker run --env-file .env -p 8080:8080 agrilok-api
#
# Migrations are a separate one-off step against the same image:
#
#   docker run --env-file .env agrilok-api agrilok-db migrate

FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /repo
# The whole workspace definition is needed to read the lockfile; .dockerignore
# keeps the corpus, the web app and local state out of the build context.
COPY . .
RUN uv sync --frozen --no-dev --no-editable \
      --package agrilok-api --package agrilok-infra --extra observability

FROM python:3.12-slim
RUN useradd --create-home --uid 10001 agrilok
COPY --from=build --chown=agrilok:agrilok /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8080 \
    APP_ENV=production
USER agrilok
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/v1/health', timeout=4)"
CMD ["agrilok-api"]
