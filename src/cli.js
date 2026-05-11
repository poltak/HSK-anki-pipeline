#!/usr/bin/env node
const { parseArgs, parseLevels } = require("./utils/args");
const { importHskCsv } = require("./import/importHskCsv");
const { importHskMockApi } = require("./import/importHskMockApi");
const { enrichVietnamese } = require("./enrich/enrichVietnamese");
const { generateExampleSentences } = require("./sentences/generateExampleSentences");
const { generateAudio } = require("./audio/generateAudio");
const { runQa } = require("./qa/runQa");
const { exportTsv } = require("./anki/exportTsv");

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const levels = parseLevels(args.levels, [2]);

  if (!command || args.help) {
    printHelp();
    return;
  }

  if (command === "import:hsk") {
    if (!args.source) throw new Error("Missing --source path to CSV.");
    console.log(importHskCsv({ source: args.source, levels, sourceVersion: args.version }));
    return;
  }

  if (command === "import:hsk-api") {
    console.log(await importHskMockApi({ levels, pageSize: Number(args["page-size"] || 100) }));
    return;
  }

  if (command === "enrich:vi") {
    console.log(enrichVietnamese({ levels }));
    return;
  }

  if (command === "generate:sentences") {
    console.log(generateExampleSentences({ levels }));
    return;
  }

  if (command === "generate:audio") {
    console.log(generateAudio({
      levels,
      force: Boolean(args.force),
      voice: args.voice || "Tingting",
      skip: Boolean(args.skip),
      timeoutMs: Number(args["audio-timeout-ms"] || 15000),
      verbose: args.verbose !== false,
    }));
    return;
  }

  if (command === "qa") {
    const result = runQa({ levels });
    console.log(result);
    process.exitCode = result.fatalCount > 0 ? 1 : 0;
    return;
  }

  if (command === "export:anki") {
    console.log(exportTsv({ levels, out: args.out }));
    return;
  }

  if (command === "build:deck") {
    if (args.source) {
      console.log(importHskCsv({ source: args.source, levels, sourceVersion: args.version }));
    } else if (args.api) {
      console.log(await importHskMockApi({ levels, pageSize: Number(args["page-size"] || 100) }));
    }
    console.log(enrichVietnamese({ levels }));
    console.log(generateExampleSentences({ levels }));
    console.log(generateAudio({
      levels,
      force: Boolean(args.force),
      voice: args.voice || "Tingting",
      skip: Boolean(args["skip-audio"]),
      timeoutMs: Number(args["audio-timeout-ms"] || 15000),
      verbose: args.verbose !== false,
    }));
    const qa = runQa({ levels });
    console.log(qa);
    if (qa.fatalCount > 0 && !args["allow-invalid"]) {
      throw new Error("Fatal QA errors found. Re-run with --allow-invalid to export anyway.");
    }
    console.log(exportTsv({ levels, out: args.out }));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function printHelp() {
  console.log(`
Usage:
  npm run import:hsk -- --source sources/new_hsk_3_0_level_2_seed.csv --levels 2
  npm run import:hsk-api -- --levels 2
  npm run enrich:vi -- --levels 2
  npm run generate:sentences -- --levels 2
  npm run generate:audio -- --levels 2
  npm run qa -- --levels 2
  npm run export:anki -- --levels 2 --out dist/new_hsk_3_0_level_2.tsv
  npm run build:deck -- --source sources/new_hsk_3_0_level_2_seed.csv --levels 2 --skip-audio --allow-invalid
  npm run build:deck -- --api --levels 2 --skip-audio --allow-invalid
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
