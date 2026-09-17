#!/usr/bin/env node
// Interactive CLI for one question at a time. For running the golden set,
// use evaluate.mjs instead - this is for poking at the pipeline by hand.
//
// Usage:
//   node ask.mjs "What are the main soil forming processes?"
//   node ask.mjs "..." --level 7
//   node ask.mjs "..." --level 4 --province lumbini
//   node ask.mjs "..." --group agronomy
import { answerQuestion } from "./lib/pipeline.mjs";

function parseArgs(argv) {
  const args = { question: null, filters: {} };
  const rest = [...argv];
  while (rest.length) {
    const tok = rest.shift();
    if (tok === "--level") args.filters.level = Number.parseInt(rest.shift(), 10);
    else if (tok === "--province") args.filters.province = rest.shift();
    else if (tok === "--group") args.filters.group = rest.shift();
    else if (args.question === null) args.question = tok;
    else args.question += " " + tok;
  }
  return args;
}

async function main() {
  const { question, filters } = parseArgs(process.argv.slice(2));
  if (!question) {
    console.error('Usage: node ask.mjs "your question" [--level 7] [--province lumbini] [--group agronomy]');
    process.exitCode = 1;
    return;
  }

  console.log(`Question: ${question}`);
  if (Object.keys(filters).length) console.log(`Filters: ${JSON.stringify(filters)}`);
  console.log("Retrieving and generating...\n");

  const result = await answerQuestion(question, filters);

  console.log("─".repeat(72));
  if (result.refused) {
    console.log(`REFUSED (${result.refusalStage}): ${result.refusalReason}`);
  } else {
    console.log(result.answer);
    console.log("");
    console.log(`Cited: ${result.citedSourceIds.join(", ") || "(none - see note below)"}`);
    if (result.uncitedRetrievedIds.length) {
      console.log(`Retrieved but not cited: ${result.uncitedRetrievedIds.join(", ")}`);
    }
  }
  console.log("─".repeat(72));

  if (result.retrievedChunks.length) {
    console.log("\nRetrieved chunks (for manual faithfulness review):");
    for (const c of result.retrievedChunks) {
      console.log(
        `  [${c.chunkId}] score=${c.score}  L${c.examLevel} ${c.province}  ${c.sourceTitle}`,
      );
      console.log(`      ${c.sourceUrl}`);
    }
  }
}

main().catch((err) => {
  if (err.exhausted) {
    // A daily/per-minute quota being used up is an expected failure mode on
    // free tier, not a bug - a stack trace is the wrong way to report it.
    // See lib/gemini.mjs buildApiError and spike/.env.example for why the
    // confirmed real ceiling (20 requests/day for gemini-2.5-flash) makes
    // this a routine thing to hit, not an exception.
    console.error(`\nOut of quota: ${err.message}\n`);
    console.error("This will not resolve by retrying. Check https://aistudio.google.com/rate-limit");
    console.error("for the reset time, or switch GEMINI_GENERATION_MODEL in .env to a model with");
    console.error("more remaining headroom for the rest of today.");
  } else {
    console.error("ask.mjs failed:", err);
  }
  process.exitCode = 1;
});
