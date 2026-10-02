import { execFile, spawn } from "node:child_process";

const port = process.env.E2E_PORT ?? "3000";
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", port], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) return Promise.resolve();

  if (process.platform === "win32") {
    return new Promise((resolve) => {
      execFile("taskkill", ["/pid", String(child.pid), "/t", "/f"], () => resolve());
    });
  }

  child.kill("SIGTERM");
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`The Next.js server exited before becoming ready (${server.exitCode}).`);
    }

    try {
      const response = await fetch(`${baseUrl}/`, {
        signal: AbortSignal.timeout(2_000),
      });

      if (response.status < 500) return;
    } catch {
      // The development server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for the Next.js server at ${baseUrl}.`);
}

function runPlaywright() {
  const playwright = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );

  return new Promise((resolve, reject) => {
    playwright.once("error", reject);
    playwright.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

let exitCode = 1;

try {
  await waitForServer();
  exitCode = await runPlaywright();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  await stopProcessTree(server);
}

process.exit(exitCode);
