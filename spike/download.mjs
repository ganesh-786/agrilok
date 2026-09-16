#!/usr/bin/env node
// Fetch the 18 source PDFs listed in corpus/sources.yaml into corpus/raw/.
//
// This is a one-time hand-run for a spike, not the production crawler - no
// robots.txt handling, no whitelist enforcement, no scheduling. Those exist
// in services/crawler/ (Phase 1) precisely because they matter for repeated,
// automated fetching. A dozen-and-a-half one-off GETs to sites already
// checked by hand don't need that machinery, per docs/roadmap.md's own
// instruction to collect Phase 0 documents "by hand".
//
// What it does keep from the real architecture, because these matter
// regardless of scale: identify itself honestly, record provenance (source
// URL, fetch date, checksum) for every file, and never silently overwrite
// evidence of what was actually downloaded.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import yaml from "js-yaml";
import { paths } from "./lib/config.mjs";

const USER_AGENT =
  "agrilok-phase0-spike/0.1 (+https://github.com/ganesh-786/agrilok; research use, contact: ganeshchaudhary4400@gmail.com)";
const DELAY_BETWEEN_REQUESTS_MS = 1500;
const TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOne(doc) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(doc.url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status}` };
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("pdf")) {
      return { ok: false, reason: `unexpected content-type: ${contentType}` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) {
      return { ok: false, reason: `suspiciously small (${buf.length} bytes)` };
    }
    return { ok: true, buf, contentType };
  } catch (err) {
    if (err.name === "AbortError") return { ok: false, reason: `timed out after ${TIMEOUT_MS}ms` };
    return { ok: false, reason: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const manifest = yaml.load(await fs.readFile(paths.sources, "utf8"));
  await fs.mkdir(paths.raw, { recursive: true });

  const results = [];
  console.log(`Fetching ${manifest.documents.length} documents (politely, ${DELAY_BETWEEN_REQUESTS_MS}ms apart)...\n`);

  for (const [i, doc] of manifest.documents.entries()) {
    process.stdout.write(`[${i + 1}/${manifest.documents.length}] ${doc.id}  `);
    const outPath = path.join(paths.raw, `${doc.id}.pdf`);

    const existing = await fs.stat(outPath).catch(() => null);
    if (existing) {
      console.log(`already downloaded (${existing.size} bytes) - skipping`);
      results.push({ id: doc.id, status: "cached", bytes: existing.size });
      continue;
    }

    const result = await fetchOne(doc);
    if (!result.ok) {
      console.log(`FAILED - ${result.reason}`);
      results.push({ id: doc.id, status: "failed", reason: result.reason, url: doc.url });
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
      continue;
    }

    const checksum = crypto.createHash("sha256").update(result.buf).digest("hex");
    await fs.writeFile(outPath, result.buf);

    const expectedBytes = doc.verified_bytes;
    const sizeMatch = expectedBytes ? result.buf.length === expectedBytes : null;
    if (sizeMatch === false) {
      console.log(
        `OK, ${result.buf.length} bytes (WARNING: differs from verified size ${expectedBytes} - ` +
          `source may have changed since verification on ${doc.verified_on})`,
      );
    } else {
      console.log(`OK, ${result.buf.length} bytes`);
    }

    results.push({
      id: doc.id,
      status: "downloaded",
      bytes: result.buf.length,
      checksum,
      sizeMatchesVerification: sizeMatch,
      fetchedAt: new Date().toISOString(),
    });

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  const reportPath = path.join(paths.raw, "download-report.json");
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));

  const failed = results.filter((r) => r.status === "failed");
  const changed = results.filter((r) => r.sizeMatchesVerification === false);
  console.log(`\nDone. ${results.length - failed.length}/${results.length} available in corpus/raw/.`);
  if (changed.length) {
    console.log(
      `${changed.length} document(s) downloaded with a different size than when verified - ` +
        `worth a manual check that the content is still what sources.yaml describes.`,
    );
  }
  if (failed.length) {
    console.log(`${failed.length} document(s) failed:`);
    for (const f of failed) console.log(`  - ${f.id}: ${f.reason} (${f.url})`);
    console.log(`\nThese sources may have moved since verification. Re-check by hand before re-running.`);
  }
}

main().catch((err) => {
  console.error("download.mjs failed:", err);
  process.exitCode = 1;
});
