import { createServer, type Server } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiUnavailableError, readApiJson } from "@/lib/api-read";

describe("bounded API reads", () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = createServer((request, response) => {
      if (request.url === "/stalled-headers") return;
      response.setHeader("content-type", "application/json");
      if (request.url === "/stalled-body") {
        response.writeHead(200);
        response.write('{"documents":');
        return;
      }
      if (request.url === "/missing") {
        response.writeHead(404);
        response.end("{}");
        return;
      }
      if (request.url === "/failure") {
        response.writeHead(503);
        response.end("{}");
        return;
      }
      if (request.url === "/malformed") {
        response.end("{");
        return;
      }
      response.end('{"documents":[]}');
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test server address");
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns valid empty catalogues and preserves a genuine 404", async () => {
    await expect(readApiJson(`${origin}/healthy`, {})).resolves.toEqual({ documents: [] });
    await expect(readApiJson(`${origin}/missing`, {})).resolves.toBeNull();
  });

  it.each(["stalled-headers", "stalled-body"])(
    "aborts %s within the read budget",
    async (endpoint) => {
      const started = performance.now();
      await expect(readApiJson(`${origin}/${endpoint}`, {}, 80)).rejects.toThrow(
        "the API read timed out",
      );
      expect(performance.now() - started).toBeLessThan(1_000);
    },
  );

  it("keeps a caller's cancellation without letting it remove the deadline", async () => {
    const caller = new AbortController();
    await expect(
      readApiJson(`${origin}/stalled-headers`, { signal: caller.signal }, 80),
    ).rejects.toThrow("the API read timed out");
    caller.abort();
    await expect(
      readApiJson(`${origin}/healthy`, { signal: caller.signal }),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("distinguishes upstream errors from missing records and handles malformed JSON", async () => {
    await expect(readApiJson(`${origin}/failure`, {})).rejects.toThrow("the API answered 503");
    await expect(readApiJson(`${origin}/malformed`, {})).rejects.toThrow(
      "the API read could not be completed",
    );
  });
});
