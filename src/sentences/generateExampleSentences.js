const path = require("path");
const { paths } = require("../config/paths");
const { readJson, writeJson } = require("../utils/fs");

function defaultSentence(item, enrichment) {
  return {
    officialItemId: item.id,
    targetHanzi: item.word,
    sentenceZh: "",
    sentenceZhBold: "",
    sentencePinyin: "",
    sentenceVi: "",
    sentenceEn: "",
    reviewStatus: "needs_review",
    qaWarnings: ["missing_reviewed_example_sentence"],
  };
}

function generateExampleSentences({ levels = [2] }) {
  const sentenceOverrides = readJson(path.join(paths.overrides, "sentence_overrides.json"), {});
  const results = [];

  for (const level of levels) {
    const officialItems = readJson(path.join(paths.official, `level_${level}_items.json`), []);
    const enrichedItems = readJson(path.join(paths.generated, `level_${level}_enriched.json`), []);
    const enrichmentById = new Map(enrichedItems.map((item) => [item.officialItemId, item]));

    const sentences = officialItems.map((item) => {
      const enrichment = enrichmentById.get(item.id) || {};
      const override = sentenceOverrides[item.id] || sentenceOverrides[item.word] || {};
      const generated = defaultSentence(item, enrichment);
      const sentenceZh = override.sentenceZh || generated.sentenceZh;
      return {
        ...generated,
        ...override,
        officialItemId: item.id,
        targetHanzi: item.word,
        sentenceZh,
        sentenceZhBold: override.sentenceZhBold || (sentenceZh ? sentenceZh.replace(item.word, `<b>${item.word}</b>`) : ""),
      };
    });

    writeJson(path.join(paths.generated, `level_${level}_sentences.json`), sentences);
    results.push({ level, count: sentences.length });
  }

  return results;
}

module.exports = {
  generateExampleSentences,
};
