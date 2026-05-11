function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (values[index] || "").trim();
    });
    return item;
  });
}

function escapeTsv(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, "<br>")
    .replace(/\t/g, " ");
}

module.exports = {
  escapeTsv,
  parseCsv,
};
