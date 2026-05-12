const { spawnSync } = require("child_process");
const fs = require("fs");

const commandCache = new Map();

function commandExists(command) {
  if (commandCache.has(command)) return commandCache.get(command);
  const result = spawnSync("which", [command], { encoding: "utf8" });
  const exists = result.status === 0;
  commandCache.set(command, exists);
  return exists;
}

function validateAudioOutput(outputPath) {
  if (!commandExists("ffprobe")) {
    const stat = fs.statSync(outputPath);
    if (stat.size < 800) {
      throw new Error(`audio output is suspiciously small (${stat.size} bytes)`);
    }
    return;
  }

  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", outputPath],
    { encoding: "utf8", timeout: 5000 },
  );

  if (probe.status !== 0 || probe.error) {
    const stat = fs.statSync(outputPath);
    if (stat.size < 800) {
      throw new Error(`audio output is suspiciously small (${stat.size} bytes)`);
    }
    return;
  }

  const duration = Number(probe.stdout.trim());
  if (Number.isFinite(duration) && duration < 0.15) {
    throw new Error(`audio output is too short (${duration.toFixed(3)} seconds)`);
  }
}

module.exports = {
  commandExists,
  validateAudioOutput,
};
