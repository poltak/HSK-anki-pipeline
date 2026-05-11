const crypto = require("crypto");
const https = require("https");
const path = require("path");
const { paths } = require("../config/paths");
const { writeJson } = require("../utils/fs");

const API_URL = "https://api.hskmock.com/mock/word/searchWords";
const SOURCE_VERSION = "new_hsk_3_0_hskmock_api_chinesetest_vocab_tab";
const NEW_HSK_LEVEL_IDS = {
  1: 31,
  2: 32,
  3: 33,
  4: 34,
  5: 35,
  6: 36,
};

function requestJson(body) {
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const request = https.request(
      API_URL,
      {
        method: "POST",
        headers: {
          accept: "application/json, text/plain, */*",
          "access-ch-ref-site": "96C3AC381A612881570F2AD9E573536B",
          "access-ch-ref-stamp": String(Date.now()),
          "content-type": "application/json",
          origin: "https://www.chinesetest.cn",
          referer: "https://www.chinesetest.cn/",
          "user-language": "en",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HSK mock API returned HTTP ${response.statusCode}: ${data}`));
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Could not parse HSK mock API response: ${error.message}`));
          }
        });
      },
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function normalizeApiWord(word, level, sequenceNumber, sourceHash) {
  return {
    id: `new-hsk-3-0-l${level}-${String(sequenceNumber).padStart(4, "0")}`,
    sourceVersion: SOURCE_VERSION,
    sourceApi: API_URL,
    sourceHash,
    hskLevel: level,
    sequenceNumber,
    apiWordId: word.id,
    word: word.word,
    pinyin: word.pinyin_tone || word.pinyin || "",
    pinyinPlain: word.pinyin || "",
    pinyinNumbered: word.pinyin_num || "",
    partOfSpeech: word.syntax || undefined,
    sourceTranslation: (word.full_translation || word.translation || "").trim(),
    sourceTtsUrl: word.tts_url || "",
  };
}

async function fetchLevel(level, pageSize) {
  const apiLevelId = NEW_HSK_LEVEL_IDS[level];
  if (!apiLevelId) throw new Error(`No New-HSK API level id configured for level ${level}.`);

  const first = await requestJson({
    level_ids: [apiLevelId],
    initial: "",
    keyword: "",
    page_num: 1,
    page_size: pageSize,
  });

  if (first.errcode !== 0) {
    throw new Error(`HSK mock API error: ${first.errmsg || first.errcode}`);
  }

  const pageCount = first.data.page_count;
  const allResponses = [first];

  for (let page = 2; page <= pageCount; page += 1) {
    const response = await requestJson({
      level_ids: [apiLevelId],
      initial: "",
      keyword: "",
      page_num: page,
      page_size: pageSize,
    });
    if (response.errcode !== 0) {
      throw new Error(`HSK mock API error on page ${page}: ${response.errmsg || response.errcode}`);
    }
    allResponses.push(response);
  }

  const sourceHash = crypto.createHash("sha256").update(JSON.stringify(allResponses)).digest("hex");
  const words = allResponses.flatMap((response) => response.data.list);
  return words.map((word, index) => normalizeApiWord(word, level, index + 1, sourceHash));
}

async function importHskMockApi({ levels = [2], pageSize = 100 }) {
  const results = [];

  for (const level of levels) {
    const items = await fetchLevel(level, pageSize);
    writeJson(path.join(paths.official, `level_${level}_items.json`), items);
    results.push({ level, count: items.length, sourceVersion: SOURCE_VERSION });
  }

  return results;
}

module.exports = {
  importHskMockApi,
};
