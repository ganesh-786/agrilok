# syntax=docker/dockerfile:1.7
#
# The agrilok web app. Build from the repository root, like the API, so the
# root .dockerignore keeps node_modules, build output and .env files out:
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://your.domain -t agrilok-web .
#   docker run -p 3000:3000 \
#     -e AGRILOK_API_URL=http://api:8080 -e API_INTERNAL_TOKEN=... agrilok-web
#
# NEXT_PUBLIC_SITE_URL is fixed into the build (Next.js inlines NEXT_PUBLIC_
# values), so it is a build argument. AGRILOK_API_URL and API_INTERNAL_TOKEN
# are read when the server runs and never reach the browser.

FROM node:24-slim AS deps
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./
# No API is reachable here. Pages render on request, and the sitemap falls
# back to the fixed pages until its first revalidation.
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# `output: "standalone"` traces only the files the server needs; static
# assets and public/ are copied beside it, as Next.js expects.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/robots.txt').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server.js"]
