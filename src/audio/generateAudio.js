const path = require("path");
const { paths } = require("../config/paths");
const { fileExists, readJson, writeJson } = require("../utils/fs");
const { synthesizeWithSay } = require("./providers/LocalSayTtsProvider");
const { synthesizeWithAzure } = require("./providers/AzureTtsProvider");

function audioFileName(item, kind) {
  const sequence = String(item.sequenceNumber).padStart(4, "0");
  return `${sequence}_${item.word}_${kind}.mp3`;
}

function getProvider({ provider, voice }) {
  if (provider === "local") {
    return {
      name: "local",
      defaultVoice: "Tingting",
      synthesize: synthesizeWithSay,
    };
  }

  if (provider === "azure") {
    return {
      name: "azure",
      defaultVoice: "zh-CN-XiaoxiaoNeural",
      synthesize: synthesizeWithAzure,
    };
  }

  throw new Error(`Unknown audio provider '${provider}'. Expected 'local' or 'azure'.`);
}

function validateProviderConfig(provider) {
  if (provider !== "azure") return;
  if (!process.env.AZURE_SPEECH_KEY) throw new Error("Missing AZURE_SPEECH_KEY.");
  if (!process.env.AZURE_SPEECH_REGION) throw new Error("Missing AZURE_SPEECH_REGION.");
}

async function generateAudio({
  levels = [2],
  force = false,
  provider = "local",
  voice,
  skip = false,
  timeoutMs = 15000,
  verbose = false,
  maxItems,
}) {
  const results = [];
  const selectedProvider = getProvider({ provider, voice });
  const selectedVoice = voice || selectedProvider.defaultVoice;
  if (!skip) validateProviderConfig(selectedProvider.name);

  for (const level of levels) {
    const officialItems = readJson(path.join(paths.official, `level_${level}_items.json`), []);
    const sentences = readJson(path.join(paths.generated, `level_${level}_sentences.json`), []);
    const sentenceById = new Map(sentences.map((item) => [item.officialItemId, item]));
    const manifestPath = path.join(paths.generated, `level_${level}_audio_manifest.json`);
    const existingManifest = maxItems ? readJson(manifestPath, []) : [];
    const manifestById = new Map(existingManifest.map((item) => [item.officialItemId, item]));
    const errors = [];

    const itemsToProcess = maxItems ? officialItems.slice(0, maxItems) : officialItems;

    for (let index = 0; index < itemsToProcess.length; index += 1) {
      const item = itemsToProcess[index];
      const sentence = sentenceById.get(item.id);
      const levelAudioDir = path.join(paths.audio, `level_${level}`);
      const wordPath = path.join(levelAudioDir, audioFileName(item, "word"));
      const sentencePath = path.join(levelAudioDir, audioFileName(item, "sentence"));
      const prefix = `[audio level ${level} ${index + 1}/${itemsToProcess.length}] ${item.word}`;

      if (!skip && verbose) console.log(prefix);

      if (!skip && (force || !fileExists(wordPath))) {
        try {
          await selectedProvider.synthesize({ text: item.word, voice: selectedVoice, outputPath: wordPath, timeoutMs });
        } catch (error) {
          errors.push({ officialItemId: item.id, kind: "word", message: error.message });
          console.warn(`${prefix} word audio failed: ${error.message}`);
        }
      }

      if (!skip && sentence && (force || !fileExists(sentencePath))) {
        try {
          await selectedProvider.synthesize({ text: sentence.sentenceZh, voice: selectedVoice, outputPath: sentencePath, timeoutMs });
        } catch (error) {
          errors.push({ officialItemId: item.id, kind: "sentence", message: error.message });
          console.warn(`${prefix} sentence audio failed: ${error.message}`);
        }
      }

      manifestById.set(item.id, {
        officialItemId: item.id,
        wordAudio: path.relative(paths.root, wordPath),
        sentenceAudio: path.relative(paths.root, sentencePath),
        provider: selectedProvider.name,
        voice: selectedVoice,
      });
    }

    const manifest = maxItems
      ? Array.from(manifestById.values())
      : officialItems.map((item) => manifestById.get(item.id)).filter(Boolean);
    writeJson(manifestPath, manifest);
    if (errors.length > 0) {
      writeJson(path.join(paths.generated, `level_${level}_audio_errors.json`), errors);
    }
    results.push({ level, count: manifest.length, skippedSynthesis: skip, audioErrors: errors.length, partial: Boolean(maxItems) });
  }

  return results;
}

module.exports = {
  generateAudio,
};
