#!/usr/bin/env node
// Start agrilok for development with one command: the API and the web app,
// against the database .env names, with both logs in one terminal.
//
//   node scripts/dev.mjs
//
// Ctrl+C stops everything it started.
//
// Node rather than bash like the rest of scripts/: this one has to run the
// same from PowerShell, cmd and a Unix shell, and Node is already required
// for the web app.
//
// What it does, in order, and why:
//
// 1. Checks that uv, Node and .env are there, and that ports 8000 and 3000
//    are free. A server left over from an earlier run fails loudly here,
//    instead of the new web app quietly talking to the old API.
// 2. Installs dependencies only when they are missing or out of date, from
//    the lockfiles, so starting never rewrites uv.lock or package-lock.json.
// 3. Starts the local embedded Postgres only when DATABASE_URL points at it
//    (127.0.0.1:54329), and stops it again on exit. A hosted database such as
//    Supabase is used as it is.
// 4. Applies pending migrations, except when APP_ENV=production: changing a
//    production schema is a deliberate step, never a side effect of starting
//    a dev server.
// 5. Starts the API and waits for /v1/ready to confirm the database is
//    reachable, then starts the web app with the API's address and
//    API_INTERNAL_TOKEN from .env, so the two always agree.
//
// It prints no secret. From .env it reads only DATABASE_URL (to show its
// host and decide about the local database), APP_ENV and API_INTERNAL_TOKEN,
// and passes them on to the processes it starts.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_DIR = path.join(ROOT, "apps", "web");
const WINDOWS = process.platform === "win32";

const API_PORT = 8000;
const WEB_PORT = 3000;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;
// Where `agrilok-db start` runs Postgres (infra/src/agrilok_infra/paths.py).
const LOCAL_DB_PORT = "54329";

// The first page compile of `next dev` can take a while on a slow machine.
const API_READY_TIMEOUT_MS = 90_000;
const WEB_READY_TIMEOUT_MS = 180_000;

const paint = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const bold = paint("1");
const red = paint("31");
const green = paint("32");
const cyan = paint("36");
const magenta = paint("35");

const say = (message) => console.log(`${bold("[dev]")} ${message}`);

// --- Before anything starts --------------------------------------------------

function stopEarly(message) {
  console.error(`${red("[dev]")} ${message}`);
  process.exit(1);
}

// Windows can only start npm through a shell, because it is npm.cmd there,
// and Node wants a shell command as one string. Every argument this script
// passes is a fixed word written here, never user input.
function invocation(command, args) {
  return WINDOWS && command === "npm"
    ? { file: [command, ...args].join(" "), args: [], shell: true }
    : { file: command, args, shell: false };
}

function runStep(command, args, { cwd = ROOT, env = {} } = {}) {
  const run = invocation(command, args);
  const result = spawnSync(run.file, run.args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: run.shell,
  });
  return result.status === 0;
}

function hasTool(command, args) {
  const run = invocation(command, args);
  const result = spawnSync(run.file, run.args, {
    encoding: "utf8",
    shell: run.shell,
    windowsHide: true,
  });
  return result.status === 0;
}

// A small .env reader for the three values this script needs. The Python
// side reads the file itself; these are only for decisions made here.
function readEnvFile(file) {
  const values = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const end = value.indexOf(value[0], 1);
      value = end > 0 ? value.slice(1, end) : value.slice(1);
    } else {
      value = value.split(/\s+#/)[0].trim();
    }
    values[key] = value;
  }
  return values;
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

function isLocalDatabase(url) {
  if (!url) return true; // the code's own default is the local database
  try {
    const parsed = new URL(url);
    return ["127.0.0.1", "localhost"].includes(parsed.hostname) && parsed.port === LOCAL_DB_PORT;
  } catch {
    return false;
  }
}

function databaseHost(url) {
  try {
    return new URL(url || `postgresql://127.0.0.1:${LOCAL_DB_PORT}`).host;
  } catch {
    return "(DATABASE_URL could not be read as a URL)";
  }
}

function webDependenciesStale() {
  const installed = path.join(WEB_DIR, "node_modules", ".package-lock.json");
  if (!existsSync(installed)) return true;
  return statSync(path.join(WEB_DIR, "package-lock.json")).mtimeMs > statSync(installed).mtimeMs;
}

// --- Running processes and stopping them ---------------------------------------

const children = [];
let stopping = false;
let startedLocalDatabase = false;

function launch(name, color, command, args, { cwd = ROOT, env = {} } = {}) {
  const run = invocation(command, args);
  const child = spawn(run.file, run.args, {
    cwd,
    env: { ...process.env, ...env },
    // No stdin: on Windows a child waiting on "Terminate batch job (Y/N)?"
    // after Ctrl+C would otherwise hang.
    stdio: ["ignore", "pipe", "pipe"],
    shell: run.shell,
    windowsHide: true,
    // Its own process group on Unix, so shutdown can stop its children too.
    detached: !WINDOWS,
  });
  const label = color(`[${name}]`);
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (line) => console.log(`${label} ${line}`));
  }
  child.on("error", (error) => {
    say(red(`${name} could not start: ${error.message}`));
    shutdown(1);
  });
  child.on("exit", (code, signal) => {
    child.exited = true;
    // On Windows, Ctrl+C reaches the children as well as this script, and a
    // child can exit just before this script's own handler runs. A moment's
    // grace keeps a normal Ctrl+C from being reported as a crash.
    setTimeout(() => {
      if (stopping) return;
      say(
        red(
          `${name} stopped unexpectedly (${signal ?? `exit code ${code}`}). Stopping everything.`,
        ),
      );
      shutdown(1);
    }, 500);
  });
  children.push(child);
  return child;
}

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  say("Stopping...");
  for (const child of children) {
    if (child.exited || child.pid === undefined) continue;
    if (WINDOWS) {
      // /T takes the whole tree: uv's Python, and npm's shell and Next.js.
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // already gone
      }
    }
  }
  if (startedLocalDatabase) runStep("uv", ["run", "--no-sync", "agrilok-db", "stop"]);
  say("Everything this script started has stopped.");
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function waitFor(url, isReady, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (await isReady(response)) return true;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

// --- Main ------------------------------------------------------------------

const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 12)) {
  stopEarly(
    `Node ${process.versions.node} is too old; the web app needs 22.12 or newer (.nvmrc says 24).`,
  );
}
if (!hasTool("uv", ["--version"])) {
  stopEarly("uv is not installed or not on PATH. Install it from https://docs.astral.sh/uv/");
}
if (!hasTool("npm", ["--version"])) {
  stopEarly("npm is not on PATH. It comes with Node: https://nodejs.org/");
}

const envFile = process.env.AGRILOK_ENV_FILE || path.join(ROOT, ".env");
if (!existsSync(envFile)) {
  stopEarly(
    `No ${path.relative(ROOT, envFile) || envFile} yet. Create it with "cp .env.example .env" ` +
      "and fill in GEMINI_API_KEY and DATABASE_URL (see .env.example, sections 2 and 3).",
  );
}
const fileEnv = readEnvFile(envFile);
// The environment wins over the file, as it does for the Python code.
const setting = (key) => process.env[key] ?? fileEnv[key] ?? "";
const databaseUrl = setting("DATABASE_URL");
const appEnv = setting("APP_ENV") || "development";
const internalToken = setting("API_INTERNAL_TOKEN");

for (const [port, what] of [
  [API_PORT, "the API"],
  [WEB_PORT, "the web app"],
]) {
  if (await portInUse(port)) {
    stopEarly(
      `Port ${port}, which ${what} needs, is already in use, probably by an earlier run that is ` +
        `still going. Stop it first. To find it: ${WINDOWS ? `netstat -ano | findstr :${port}` : `lsof -i :${port}`}`,
    );
  }
}

say("Checking Python dependencies (uv sync)...");
if (!runStep("uv", ["sync", "--locked", "--all-packages", "--all-extras", "--quiet"])) {
  stopEarly(
    'uv sync failed. If it says the lockfile needs updating, run "uv lock" and commit uv.lock.',
  );
}
if (webDependenciesStale()) {
  say("Installing web dependencies (npm ci)...");
  if (!runStep("npm", ["ci"], { cwd: WEB_DIR })) stopEarly("npm ci failed in apps/web.");
}

const childEnvDatabase = databaseUrl ? { DATABASE_URL: databaseUrl } : {};
if (isLocalDatabase(databaseUrl)) {
  if (await portInUse(Number(LOCAL_DB_PORT))) {
    say(`Using the local database that is already running on port ${LOCAL_DB_PORT}.`);
  } else {
    say("Starting the local database...");
    if (!runStep("uv", ["run", "--no-sync", "agrilok-db", "start"])) {
      stopEarly("The local database did not start. See the message above.");
    }
    startedLocalDatabase = true;
  }
} else {
  say(`Using the database at ${databaseHost(databaseUrl)}.`);
}

if (appEnv === "production") {
  say("APP_ENV is production, so migrations are not applied automatically.");
} else {
  say("Applying pending migrations...");
  if (!runStep("uv", ["run", "--no-sync", "agrilok-db", "migrate"], { env: childEnvDatabase })) {
    if (startedLocalDatabase) runStep("uv", ["run", "--no-sync", "agrilok-db", "stop"]);
    stopEarly("Migrations failed. Nothing else was started.");
  }
}

say("Starting the API...");
launch("api", cyan, "uv", ["run", "--no-sync", "agrilok-api"], {
  env: {
    ...childEnvDatabase,
    HOST: "127.0.0.1",
    PORT: String(API_PORT),
    PYTHONUNBUFFERED: "1",
    PYTHONIOENCODING: "utf-8",
  },
});

let readiness = null;
const apiReady = await waitFor(
  `${API_URL}/v1/ready`,
  async (response) => {
    readiness = await response.json().catch(() => null);
    return response.ok;
  },
  API_READY_TIMEOUT_MS,
);
if (!apiReady) {
  say(
    red(
      readiness?.database === "unreachable"
        ? "The API started but cannot reach the database. Check DATABASE_URL in .env."
        : "The API did not become ready in time. See its log above.",
    ),
  );
  shutdown(1);
}
const model = {
  configured: "Gemini is configured: live answers are on.",
  not_configured: "GEMINI_API_KEY is not set: library and search work, live answers are off.",
  missing: "The configured Gemini model no longer exists: live answers are off (see ADR-0008).",
}[readiness?.model];
if (model) say(model);
try {
  const meta = await (await fetch(`${API_URL}/v1/meta`)).json();
  if (meta?.library?.documents === 0) {
    say(
      "The library is empty: no document has been admitted yet. See CONTRIBUTING.md, " +
        '"Development setup", for importing and admitting documents.',
    );
  }
} catch {
  // informational only
}

say("Starting the web app...");
launch("web", magenta, "npm", ["run", "dev"], {
  cwd: WEB_DIR,
  env: {
    AGRILOK_API_URL: API_URL,
    NEXT_TELEMETRY_DISABLED: "1",
    ...(internalToken ? { API_INTERNAL_TOKEN: internalToken } : {}),
  },
});
if (!(await waitFor(WEB_URL, async (response) => response.status < 500, WEB_READY_TIMEOUT_MS))) {
  say(red("The web app did not answer in time. See its log above."));
  shutdown(1);
}

console.log("");
say(green("agrilok is running."));
say(`  Web app   ${bold(WEB_URL)}`);
say(
  `  API       ${API_URL}${appEnv === "production" ? "" : `  (interactive docs: ${API_URL}/docs)`}`,
);
say(`  Database  ${databaseHost(databaseUrl)}`);
say("Press Ctrl+C to stop everything.");
console.log("");
