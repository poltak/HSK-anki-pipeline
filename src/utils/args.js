function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const raw = token.slice(2);
    const eqIndex = raw.indexOf("=");
    if (eqIndex !== -1) {
      args[raw.slice(0, eqIndex)] = raw.slice(eqIndex + 1);
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[raw] = true;
    } else {
      args[raw] = next;
      i += 1;
    }
  }

  return args;
}

function parseLevels(value, fallback = [2]) {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((level) => Number(level.trim()))
    .filter((level) => Number.isInteger(level));
}

module.exports = {
  parseArgs,
  parseLevels,
};
