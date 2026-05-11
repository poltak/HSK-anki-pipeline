const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { paths } = require("../config/paths");
const { parseCsv } = require("../utils/csv");
const { writeJson } = require("../utils/fs");

const DEFAULT_SOURCE_VERSION = "new_hsk_3_0_chinesetest_syllabus";

function normalizeRow(row, fallbackLevel, sourceVersion, sourceFileHash) {
  const sequenceNumber = Number(row.sequenceNumber || row.sequence || row.seq);
  const hskLevel = Number(row.hskLevel || row.level || fallbackLevel);
  const word = String(row.word || row.hanzi || row.chinese || "").trim();
  const pinyin = String(row.pinyin || "").replace(/\s+/g, " ").trim();
  const partOfSpeech = String(row.partOfSpeech || row.pos || "").trim();

  return {
    id: `new-hsk-3-0-l${hskLevel}-${String(sequenceNumber).padStart(4, "0")}`,
    sourceVersion,
    sourceFileHash,
    hskLevel,
    sequenceNumber,
    word,
    pinyin,
    partOfSpeech: partOfSpeech || undefined,
  };
}

function importHskCsv({ source, levels = [2], sourceVersion = DEFAULT_SOURCE_VERSION }) {
  const sourcePath = path.resolve(paths.root, source);
  const text = fs.readFileSync(sourcePath, "utf8");
  const sourceFileHash = crypto.createHash("sha256").update(text).digest("hex");
  const rows = parseCsv(text);
  const items = rows
    .map((row) => normalizeRow(row, levels[0], sourceVersion, sourceFileHash))
    .filter((item) => levels.includes(item.hskLevel));

  const grouped = new Map();
  for (const item of items) {
    const current = grouped.get(item.hskLevel) || [];
    current.push(item);
    grouped.set(item.hskLevel, current);
  }

  for (const [level, levelItems] of grouped.entries()) {
    levelItems.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    writeJson(path.join(paths.official, `level_${level}_items.json`), levelItems);
  }

  return {
    imported: items.length,
    levels: [...grouped.keys()].sort(),
    sourceFileHash,
  };
}

module.exports = {
  DEFAULT_SOURCE_VERSION,
  importHskCsv,
};
