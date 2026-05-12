const fs = require("fs");
const https = require("https");
const path = require("path");
const { ensureDir } = require("../../utils/fs");
const { validateAudioOutput } = require("../validateAudioOutput");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml({ text, voice }) {
  return [
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">',
    `  <voice name="${escapeXml(voice)}">${escapeXml(text)}</voice>`,
    "</speak>",
  ].join("");
}

function requestAzureTts({ text, voice, key, region, timeoutMs }) {
  const ssml = buildSsml({ text, voice });
  const hostname = `${region}.tts.speech.microsoft.com`;

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname,
        path: "/cognitiveservices/v1",
        method: "POST",
        timeout: timeoutMs,
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "chinese-learning-pipeline",
          "Content-Length": Buffer.byteLength(ssml),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks);
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Azure TTS HTTP ${response.statusCode}: ${body.toString("utf8")}`));
            return;
          }
          resolve(body);
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Azure TTS request timed out after ${timeoutMs}ms`));
    });
    request.on("error", reject);
    request.write(ssml);
    request.end();
  });
}

async function synthesizeWithAzure({
  text,
  voice = "zh-CN-XiaoxiaoNeural",
  outputPath,
  timeoutMs = 30000,
  key = process.env.AZURE_SPEECH_KEY,
  region = process.env.AZURE_SPEECH_REGION,
}) {
  if (!key) throw new Error("Missing AZURE_SPEECH_KEY.");
  if (!region) throw new Error("Missing AZURE_SPEECH_REGION.");

  ensureDir(path.dirname(outputPath));
  const audio = await requestAzureTts({ text, voice, key, region, timeoutMs });
  fs.writeFileSync(outputPath, audio);
  validateAudioOutput(outputPath);
}

module.exports = {
  synthesizeWithAzure,
};
