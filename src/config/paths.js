const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

const paths = {
  root: ROOT,
  sources: path.join(ROOT, "sources"),
  official: path.join(ROOT, "data/official/new_hsk_3_0"),
  generated: path.join(ROOT, "data/generated/new_hsk_3_0"),
  overrides: path.join(ROOT, "data/overrides"),
  audio: path.join(ROOT, "audio/new_hsk_3_0"),
  reports: path.join(ROOT, "reports"),
  dist: path.join(ROOT, "dist"),
};

module.exports = {
  paths,
};
