const path = require("path");
const { paths } = require("../config/paths");
const { readJson, writeJson } = require("../utils/fs");

function buildFallbackEnrichment(item) {
  return {
    officialItemId: item.id,
    targetHanzi: item.word,
    targetPinyin: item.pinyin,
    targetVi: "",
    targetEn: item.sourceTranslation || "",
    hanViet: "",
    memoryNote: "",
    reviewStatus: "needs_review",
    qaWarnings: ["missing_manual_vietnamese_enrichment"],
  };
}

function enrichVietnamese({ levels = [2] }) {
  const overrides = readJson(path.join(paths.overrides, "vi_hsk_overrides.json"), {});
  const results = [];

  for (const level of levels) {
    const officialItems = readJson(path.join(paths.official, `level_${level}_items.json`), []);
    const enriched = officialItems.map((item) => {
      const override = overrides[item.word] || {};
      return {
        ...buildFallbackEnrichment(item),
        ...override,
        officialItemId: item.id,
        targetHanzi: item.word,
        targetPinyin: item.pinyin,
      };
    });

    writeJson(path.join(paths.generated, `level_${level}_enriched.json`), enriched);
    results.push({ level, count: enriched.length });
  }

  return results;
}

module.exports = {
  enrichVietnamese,
};
