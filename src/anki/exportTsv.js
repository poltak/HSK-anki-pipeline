const fs = require("fs");
const path = require("path");
const { paths } = require("../config/paths");
const { escapeTsv } = require("../utils/csv");
const { ensureDir, readJson } = require("../utils/fs");

const HEADERS = [
  "TargetHanzi",
  "TargetPinyin",
  "TargetVi",
  "TargetEn",
  "SentenceZh",
  "SentenceZhBold",
  "SentencePinyin",
  "SentenceVi",
  "SentenceEn",
  "WordAudio",
  "SentenceAudio",
  "HskLevel",
  "SequenceNumber",
  "SourceVersion",
  "PartOfSpeech",
  "ReviewStatus",
  "Tags",
];

function soundRef(relativePath) {
  if (!relativePath) return "";
  return `[sound:${path.basename(relativePath)}]`;
}

function buildTags(item, enrichment) {
  return [
    `hsk::${item.hskLevel}`,
    "curriculum::new_hsk_3_0",
    `source::${item.sourceVersion}`,
    item.partOfSpeech ? `pos::${item.partOfSpeech}` : "",
    enrichment.reviewStatus === "reviewed" ? "reviewed" : "needs_review",
  ].filter(Boolean).join(" ");
}

function exportTsv({ levels = [2], out, allowDraft = false }) {
  const rows = [];
  const blockers = [];

  for (const level of levels) {
    const officialItems = readJson(path.join(paths.official, `level_${level}_items.json`), []);
    const enrichedItems = readJson(path.join(paths.generated, `level_${level}_enriched.json`), []);
    const sentences = readJson(path.join(paths.generated, `level_${level}_sentences.json`), []);
    const audioManifest = readJson(path.join(paths.generated, `level_${level}_audio_manifest.json`), []);

    const enrichedById = new Map(enrichedItems.map((item) => [item.officialItemId, item]));
    const sentenceById = new Map(sentences.map((item) => [item.officialItemId, item]));
    const audioById = new Map(audioManifest.map((item) => [item.officialItemId, item]));

    for (const item of officialItems) {
      const enrichment = enrichedById.get(item.id) || {};
      const sentence = sentenceById.get(item.id) || {};
      const audio = audioById.get(item.id) || {};

      if (!allowDraft) {
        if (!sentence.sentenceZh) blockers.push(`${item.id} ${item.word}: missing Chinese sentence`);
        if (sentence.reviewStatus !== "reviewed") blockers.push(`${item.id} ${item.word}: sentence is not reviewed`);
        if (sentence.qaWarnings && sentence.qaWarnings.length > 0) blockers.push(`${item.id} ${item.word}: ${sentence.qaWarnings.join(", ")}`);
      }

      rows.push({
        TargetHanzi: item.word,
        TargetPinyin: item.pinyin,
        TargetVi: enrichment.targetVi,
        TargetEn: enrichment.targetEn,
        SentenceZh: sentence.sentenceZh,
        SentenceZhBold: sentence.sentenceZhBold,
        SentencePinyin: sentence.sentencePinyin,
        SentenceVi: sentence.sentenceVi,
        SentenceEn: sentence.sentenceEn,
        WordAudio: soundRef(audio.wordAudio),
        SentenceAudio: soundRef(audio.sentenceAudio),
        HskLevel: item.hskLevel,
        SequenceNumber: item.sequenceNumber,
        SourceVersion: item.sourceVersion,
        PartOfSpeech: item.partOfSpeech || "",
        ReviewStatus: [enrichment.reviewStatus, sentence.reviewStatus].filter(Boolean).join(","),
        Tags: buildTags(item, enrichment),
      });
    }
  }

  if (blockers.length > 0) {
    throw new Error([
      `Refusing to export ${blockers.length} draft/invalid sentence rows.`,
      "Fix sentence overrides or pass --allow-draft-export if you really want draft output.",
      blockers.slice(0, 10).join("\n"),
    ].join("\n"));
  }

  const outputPath = path.resolve(paths.root, out || path.join("dist", `new_hsk_3_0_level_${levels.join("_")}.tsv`));
  ensureDir(path.dirname(outputPath));
  const body = [
    HEADERS.join("\t"),
    ...rows.map((row) => HEADERS.map((header) => escapeTsv(row[header])).join("\t")),
  ].join("\n");
  fs.writeFileSync(outputPath, `${body}\n`);

  return { outputPath, count: rows.length };
}

module.exports = {
  exportTsv,
};
