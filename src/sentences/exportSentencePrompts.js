const fs = require("fs");
const path = require("path");
const { paths } = require("../config/paths");
const { ensureDir, readJson } = require("../utils/fs");

function buildPrompt({ item, enrichment }) {
  return [
    "Generate one beginner Mandarin example sentence for this New HSK vocabulary item.",
    "",
    `Target word: ${item.word}`,
    `Pinyin: ${item.pinyin}`,
    `Part of speech: ${item.partOfSpeech || ""}`,
    `English meaning: ${enrichment.targetEn || item.sourceTranslation || ""}`,
    `Vietnamese meaning: ${enrichment.targetVi || ""}`,
    `HSK level: ${item.hskLevel}`,
    "",
    "Return strict JSON with:",
    "{",
    '  "word": string,',
    '  "sentenceZh": string,',
    '  "sentencePinyin": string,',
    '  "sentenceVi": string,',
    '  "sentenceEn": string,',
    '  "reviewStatus": "reviewed",',
    '  "qaWarnings": []',
    "}",
    "",
    "Rules:",
    "- sentenceZh must contain the target word exactly.",
    "- Keep the sentence short and natural.",
    "- Prefer HSK 2 or easier vocabulary.",
    "- Avoid advanced idioms.",
    "- sentenceVi must be natural Vietnamese.",
    "- Return JSON only.",
  ].join("\n");
}

function exportSentencePrompts({ levels = [2], out }) {
  const outputPath = path.resolve(paths.root, out || "reports/sentence_prompts.jsonl");
  ensureDir(path.dirname(outputPath));
  const rows = [];

  for (const level of levels) {
    const officialItems = readJson(path.join(paths.official, `level_${level}_items.json`), []);
    const enrichedItems = readJson(path.join(paths.generated, `level_${level}_enriched.json`), []);
    const sentenceOverrides = readJson(path.join(paths.overrides, "sentence_overrides.json"), {});
    const enrichmentById = new Map(enrichedItems.map((item) => [item.officialItemId, item]));

    for (const item of officialItems) {
      if (sentenceOverrides[item.id] || sentenceOverrides[item.word]) continue;
      const enrichment = enrichmentById.get(item.id) || {};
      rows.push(JSON.stringify({
        id: item.id,
        word: item.word,
        prompt: buildPrompt({ item, enrichment }),
      }));
    }
  }

  fs.writeFileSync(outputPath, `${rows.join("\n")}\n`);
  return { outputPath, count: rows.length };
}

module.exports = {
  exportSentencePrompts,
};
