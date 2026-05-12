const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ensureDir } = require("../../utils/fs");
const { commandExists, validateAudioOutput } = require("../validateAudioOutput");

const voiceCache = new Set();

function validateVoice(voice) {
  if (voiceCache.has(voice)) return;
  const result = spawnSync("say", ["-v", "?"], { encoding: "utf8" });
  if (result.status !== 0) return;

  const exists = result.stdout
    .split(/\r?\n/)
    .some((line) => line.split(/\s+/)[0] === voice);

  if (!exists) {
    throw new Error(`macOS voice '${voice}' is not installed. Run "say -v '?' | grep zh_CN" and pass --voice <name>.`);
  }

  voiceCache.add(voice);
}

function synthesizeWithSay({ text, voice = "Tingting", outputPath, timeoutMs = 15000 }) {
  ensureDir(path.dirname(outputPath));

  if (!commandExists("say")) {
    throw new Error("macOS 'say' command was not found.");
  }
  validateVoice(voice);

  const aiffPath = outputPath.replace(/\.mp3$/i, ".aiff");
  const sayResult = spawnSync("say", ["-v", voice, text, "-o", aiffPath], {
    encoding: "utf8",
    timeout: timeoutMs,
  });

  if (sayResult.error) {
    throw new Error(`say failed for ${outputPath}: ${sayResult.error.message}`);
  }

  if (sayResult.status !== 0) {
    throw new Error(sayResult.stderr || `say failed for ${outputPath}`);
  }

  if (outputPath.endsWith(".mp3") && commandExists("ffmpeg")) {
    const ffmpegResult = spawnSync("ffmpeg", ["-y", "-i", aiffPath, outputPath], {
      encoding: "utf8",
      timeout: timeoutMs,
    });
    if (ffmpegResult.error) {
      throw new Error(`ffmpeg failed for ${outputPath}: ${ffmpegResult.error.message}`);
    }
    if (ffmpegResult.status !== 0) {
      throw new Error(ffmpegResult.stderr || `ffmpeg failed for ${outputPath}`);
    }
    fs.unlinkSync(aiffPath);
    validateAudioOutput(outputPath);
    return;
  }

  if (outputPath !== aiffPath) {
    fs.renameSync(aiffPath, outputPath);
  }
  validateAudioOutput(outputPath);
}

module.exports = {
  synthesizeWithSay,
};
