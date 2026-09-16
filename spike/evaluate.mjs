#!/usr/bin/env node
// Runs golden_set/questions.yaml through the pipeline and writes a report
// structured for a human to do the actual faithfulness check by hand -
// this script checks mechanics (did it refuse or answer as expected), it
// does NOT check faithfulness. Faithfulness - does the answer actually
// follow from the cited text - requires a person reading the citation
// against the source, per docs/evaluation.md and the go/no-go gate in
// docs/roadmap.md. No amount of scripting substitutes for that at Phase 0.
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { paths } from "./lib/config.mjs";
import { answerQuestion } from "./lib/pipeline.mjs";

async function main() {
  const raw = await fs.readFile(paths.goldenSet, "utf8");
  const { questions } = yaml.load(raw);

  const realCount = questions.filter((q) => q.type === "real_past_paper").length;
  const smokeCount = questions.filter((q) => q.type === "pipeline_smoke_test").length;

  console.log(`${questions.length} questions (${realCount} real past-paper, ${smokeCount} pipeline smoke test)\n`);
  if (realCount < 20) {
    console.log(
      `NOTE: the go/no-go gate requires >=20 real past-paper questions. This run has ${realCount}. ` +
        `See golden_set/README.md. This report is not gate evidence on its own.\n`,
    );
  }

  const results = [];
  for (const [i, q] of questions.entries()) {
    process.stdout.write(`[${i + 1}/${questions.length}] ${q.id}  `);
    try {
      const result = await answerQuestion(q.question, q.filters || {});
      const mechanicalBehavior = result.refused ? "refuse" : "answer";
      const mechanicalPass = !q.expected_behavior || mechanicalBehavior === q.expected_behavior;
      console.log(`${mechanicalBehavior} (expected ${q.expected_behavior || "n/a"}) ${mechanicalPass ? "✓" : "✗ MISMATCH"}`);
      results.push({ ...q, result, mechanicalBehavior, mechanicalPass });
    } catch (err) {
      console.log(`ERROR - ${err.message.slice(0, 150)}`);
      results.push({ ...q, error: err.message, mechanicalPass: false });
    }
  }

  await fs.mkdir(paths.reports, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(paths.reports, `evaluation-${timestamp}.json`);
  const mdPath = path.join(paths.reports, `evaluation-${timestamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
  await fs.writeFile(mdPath, renderMarkdown(results, { realCount, smokeCount }));

  const mechanicalFails = results.filter((r) => !r.mechanicalPass);
  console.log(`\n${results.length - mechanicalFails.length}/${results.length} matched expected behavior (refuse vs answer).`);
  console.log(`\nReport written to:\n  ${jsonPath}\n  ${mdPath}`);
  console.log(`\nNEXT STEP (not automated): open the .md report and, for every "answer" row, read the`);
  console.log(`cited source text and judge by hand whether the answer actually follows from it.`);
  console.log(`That judgment is what the go/no-go gate needs, not this script's pass/fail count.`);
}

function renderMarkdown(results, counts) {
  const lines = [];
  lines.push(`# Phase 0 evaluation run — ${new Date().toISOString()}`);
  lines.push("");
  lines.push(
    `${counts.realCount} real past-paper questions, ${counts.smokeCount} pipeline smoke-test questions. ` +
      `See golden_set/README.md before treating this as go/no-go gate evidence.`,
  );
  lines.push("");
  lines.push(
    `This report checks **mechanics** (refuse vs answer, as expected). It does not check ` +
      `**faithfulness** — for every row below marked "answer", read the cited source text and judge ` +
      `by hand whether the answer actually follows from it. Use one of: FAITHFUL / PARTIALLY FAITHFUL / ` +
      `NOT FAITHFUL / CANNOT ASSESS, and write the judgment directly into this file.`,
  );
  lines.push("");

  for (const r of results) {
    lines.push(`## ${r.id} (${r.type})`);
    lines.push("");
    lines.push(`**Question:** ${r.question}`);
    if (r.filters && Object.keys(r.filters).length) {
      lines.push(`**Filters:** \`${JSON.stringify(r.filters)}\``);
    }
    if (r.expected_behavior) {
      lines.push(`**Expected:** ${r.expected_behavior}  **Got:** ${r.mechanicalBehavior || "error"}  ${r.mechanicalPass ? "✓" : "**MISMATCH**"}`);
    }
    if (r.note) lines.push(`**Note:** ${r.note}`);
    lines.push("");

    if (r.error) {
      lines.push(`**ERROR:** ${r.error}`);
    } else if (r.result.refused) {
      lines.push(`**Refused** (${r.result.refusalStage}): ${r.result.refusalReason}`);
    } else {
      lines.push("**Answer:**");
      lines.push("");
      lines.push("> " + r.result.answer.replace(/\n/g, "\n> "));
      lines.push("");
      lines.push(`**Cited:** ${r.result.citedSourceIds.join(", ") || "(none)"}`);
      if (r.result.uncitedRetrievedIds?.length) {
        lines.push(`**Retrieved but not cited:** ${r.result.uncitedRetrievedIds.join(", ")}`);
      }
      lines.push("");
      lines.push("**Retrieved chunks (check these against the answer above):**");
      for (const c of r.result.retrievedChunks) {
        lines.push(`- \`${c.chunkId}\` score=${c.score} L${c.examLevel} ${c.province} — ${c.sourceTitle}`);
        lines.push(`  ${c.sourceUrl}`);
      }
      lines.push("");
      lines.push("**Faithfulness judgment (fill in by hand):** _____________________");
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.error("evaluate.mjs failed:", err);
  process.exitCode = 1;
});
