const fs = require("fs");
const path = require("path");
const { paths } = require("../config/paths");
const { readJson, writeJson } = require("../utils/fs");

function validateLevel(level) {
  const warnings = [];
  const officialItems = readJson(path.join(paths.official, `level_${level}_items.json`), []);
  const enrichedItems = readJson(path.join(paths.generated, `level_${level}_enriched.json`), []);
  const sentences = readJson(path.join(paths.generated, `level_${level}_sentences.json`), []);
  const audioManifest = readJson(path.join(paths.generated, `level_${level}_audio_manifest.json`), []);

  const seenSeq = new Set();
  const seenWords = new Set();
  for (const item of officialItems) {
    if (!item.word) warnings.push({ level, itemId: item.id, severity: "fatal", code: "missing_word" });
    if (!item.pinyin) warnings.push({ level, itemId: item.id, severity: "fatal", code: "missing_pinyin" });
    if (seenSeq.has(item.sequenceNumber)) warnings.push({ level, itemId: item.id, severity: "fatal", code: "duplicate_sequence_number" });
    if (seenWords.has(item.word)) warnings.push({ level, itemId: item.id, severity: "warning", code: "duplicate_word" });
    seenSeq.add(item.sequenceNumber);
    seenWords.add(item.word);
  }

  const enrichedById = new Map(enrichedItems.map((item) => [item.officialItemId, item]));
  const sentenceById = new Map(sentences.map((item) => [item.officialItemId, item]));
  const audioById = new Map(audioManifest.map((item) => [item.officialItemId, item]));

  for (const item of officialItems) {
    const enriched = enrichedById.get(item.id);
    const sentence = sentenceById.get(item.id);
    const audio = audioById.get(item.id);

    if (!enriched) warnings.push({ level, itemId: item.id, severity: "fatal", code: "missing_enrichment" });
    if (enriched && !enriched.targetVi) warnings.push({ level, itemId: item.id, severity: "warning", code: "missing_vietnamese_gloss" });
    if (enriched && enriched.reviewStatus !== "reviewed") warnings.push({ level, itemId: item.id, severity: "warning", code: "enrichment_not_reviewed" });

    if (!sentence) warnings.push({ level, itemId: item.id, severity: "fatal", code: "missing_sentence" });
    if (sentence && !sentence.sentenceZh.includes(item.word)) warnings.push({ level, itemId: item.id, severity: "fatal", code: "sentence_missing_target_word" });
    if (sentence && !sentence.sentencePinyin) warnings.push({ level, itemId: item.id, severity: "warning", code: "missing_sentence_pinyin" });
    if (sentence && !sentence.sentenceVi) warnings.push({ level, itemId: item.id, severity: "warning", code: "missing_sentence_vietnamese" });
    if (sentence && sentence.reviewStatus !== "reviewed") warnings.push({ level, itemId: item.id, severity: "warning", code: "sentence_not_reviewed" });

    if (!audio) {
      warnings.push({ level, itemId: item.id, severity: "warning", code: "missing_audio_manifest" });
    } else {
      for (const key of ["wordAudio", "sentenceAudio"]) {
        const audioPath = path.join(paths.root, audio[key]);
        if (!fs.existsSync(audioPath)) warnings.push({ level, itemId: item.id, severity: "warning", code: `missing_${key}` });
        if (fs.existsSync(audioPath) && fs.statSync(audioPath).size === 0) warnings.push({ level, itemId: item.id, severity: "fatal", code: `empty_${key}` });
      }
    }
  }

  return warnings;
}

function runQa({ levels = [2] }) {
  const warnings = levels.flatMap((level) => validateLevel(level));
  const fatalCount = warnings.filter((warning) => warning.severity === "fatal").length;
  const warningCount = warnings.filter((warning) => warning.severity !== "fatal").length;

  writeJson(path.join(paths.reports, "qa_warnings.json"), warnings);
  const summary = [
    "# QA Summary",
    "",
    `- Fatal errors: ${fatalCount}`,
    `- Warnings: ${warningCount}`,
    `- Levels: ${levels.join(", ")}`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(paths.reports, "qa_summary.md"), summary);

  return { fatalCount, warningCount };
}

module.exports = {
  runQa,
};
