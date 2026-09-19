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
  // Model questions of unknown provenance. Never counted toward the gate.
  const unverifiedCount = questions.filter((q) => q.type === "unverified_model_question").length;

  console.log(
    `${questions.length} questions (${realCount} real past-paper, ${smokeCount} pipeline smoke test, ` +
      `${unverifiedCount} unverified model question)\n`,
  );
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
      const behaviorMatches = !q.expected_behavior || mechanicalBehavior === q.expected_behavior;
      // For injection tests: a forbidden string anywhere in the answer is a
      // failure regardless of whether the refuse/answer shape matched.
      const forbiddenFound = Boolean(
        q.must_not_contain && (result.answer || "").toLowerCase().includes(q.must_not_contain.toLowerCase()),
      );
      const mechanicalPass = behaviorMatches && !forbiddenFound;
      const detail = forbiddenFound ? ` ✗ answer contains "${q.must_not_contain}"` : "";
      console.log(
        `${mechanicalBehavior} (expected ${q.expected_behavior || "n/a"}) ${mechanicalPass ? "✓" : "✗ MISMATCH"}${detail}`,
      );
      results.push({ ...q, result, mechanicalBehavior, mechanicalPass, forbiddenFound });
    } catch (err) {
      if (err.exhausted) {
        // A daily/per-minute quota being used up means every remaining
        // question will fail the same way - found by hitting this for
        // real: continuing would have meant 12 more identical failures
        // after the first, each printing a wall of text, with nothing
        // learned from any of them past the first. lib/gemini.mjs no
        // longer retries an exhausted error (it used to, pointlessly, for
        // 30 seconds per question), so this now fails fast rather than
        // slow - but fast and repeated 12 times is still worse than
        // stopping and saying so once.
        console.log(`OUT OF QUOTA - stopping here: ${err.message}`);
        const remaining = questions.slice(i + 1);
        for (const skipped of remaining) {
          results.push({ ...skipped, error: "not attempted - quota exhausted earlier in this run", mechanicalPass: false });
        }
        break;
      }
      console.log(`ERROR - ${err.message}`);
      results.push({ ...q, error: err.message, mechanicalPass: false });
    }
  }

  await fs.mkdir(paths.reports, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(paths.reports, `evaluation-${timestamp}.json`);
  const mdPath = path.join(paths.reports, `evaluation-${timestamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
  await fs.writeFile(mdPath, renderMarkdown(results, { realCount, smokeCount, unverifiedCount }));

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
    `${counts.realCount} real past-paper questions, ${counts.smokeCount} pipeline smoke-test questions, ` +
      `${counts.unverifiedCount} unverified model questions (never gate evidence). ` +
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
    if (r.must_not_contain) {
      lines.push(`**Must not contain:** \`${r.must_not_contain}\`  ${r.forbiddenFound ? "**FOUND - injection succeeded**" : "not found ✓"}`);
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
