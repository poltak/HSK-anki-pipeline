const path = require("path");
const { paths } = require("../config/paths");
const { fileExists, readJson, writeJson } = require("../utils/fs");
const { synthesizeWithSay } = require("./providers/LocalSayTtsProvider");

function audioFileName(item, kind) {
  const sequence = String(item.sequenceNumber).padStart(4, "0");
  return `${sequence}_${item.word}_${kind}.mp3`;
}

function generateAudio({
  levels = [2],
  force = false,
  voice = "Tingting",
  skip = false,
  timeoutMs = 15000,
  verbose = false,
}) {
  const results = [];

  for (const level of levels) {
    const officialItems = readJson(path.join(paths.official, `level_${level}_items.json`), []);
    const sentences = readJson(path.join(paths.generated, `level_${level}_sentences.json`), []);
    const sentenceById = new Map(sentences.map((item) => [item.officialItemId, item]));
    const manifest = [];
    const errors = [];

    for (let index = 0; index < officialItems.length; index += 1) {
      const item = officialItems[index];
      const sentence = sentenceById.get(item.id);
      const levelAudioDir = path.join(paths.audio, `level_${level}`);
      const wordPath = path.join(levelAudioDir, audioFileName(item, "word"));
      const sentencePath = path.join(levelAudioDir, audioFileName(item, "sentence"));
      const prefix = `[audio level ${level} ${index + 1}/${officialItems.length}] ${item.word}`;

      if (!skip && verbose) console.log(prefix);

      if (!skip && (force || !fileExists(wordPath))) {
        try {
          synthesizeWithSay({ text: item.word, voice, outputPath: wordPath, timeoutMs });
        } catch (error) {
          errors.push({ officialItemId: item.id, kind: "word", message: error.message });
          console.warn(`${prefix} word audio failed: ${error.message}`);
        }
      }

      if (!skip && sentence && (force || !fileExists(sentencePath))) {
        try {
          synthesizeWithSay({ text: sentence.sentenceZh, voice, outputPath: sentencePath, timeoutMs });
        } catch (error) {
          errors.push({ officialItemId: item.id, kind: "sentence", message: error.message });
          console.warn(`${prefix} sentence audio failed: ${error.message}`);
        }
      }

      manifest.push({
        officialItemId: item.id,
        wordAudio: path.relative(paths.root, wordPath),
        sentenceAudio: path.relative(paths.root, sentencePath),
        voice,
      });
    }

    writeJson(path.join(paths.generated, `level_${level}_audio_manifest.json`), manifest);
    if (errors.length > 0) {
      writeJson(path.join(paths.generated, `level_${level}_audio_errors.json`), errors);
    }
    results.push({ level, count: manifest.length, skippedSynthesis: skip, audioErrors: errors.length });
  }

  return results;
}

module.exports = {
  generateAudio,
};
