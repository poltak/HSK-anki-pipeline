# Chinese Learning Pipeline

Vietnamese-first Anki TSV generation for New HSK 3.0 study.

The current implementation creates one note per word and expects two Anki card templates:

- Reading: Chinese sentence with the target word bolded.
- Listening: sentence audio only on the front.

## Quick Start

```bash
npm run build:deck -- --source sources/new_hsk_3_0_level_2_seed.csv --levels 2 --skip-audio --allow-invalid
```

Output:

```txt
dist/new_hsk_3_0_level_2.tsv
reports/qa_summary.md
reports/qa_warnings.json
```

## With Local Audio

On macOS, the local provider uses `say` with the `Tingting` voice. If `ffmpeg` is installed, it converts to MP3.

```bash
npm run build:deck -- --source sources/new_hsk_3_0_level_2_seed.csv --levels 2
```

Audio files are written to:

```txt
audio/new_hsk_3_0/level_2/
```

Copy or import those media files into Anki's media collection when importing the TSV.

For full API imports, build the text deck first, then generate audio separately so progress is visible:

```bash
npm run build:deck -- --api --levels 2 --skip-audio --allow-invalid --out dist/new_hsk_3_0_level_2_api.tsv
npm run generate:audio -- --levels 2 --audio-timeout-ms 15000
npm run qa -- --levels 2
npm run export:anki -- --levels 2 --out dist/new_hsk_3_0_level_2_api.tsv
```

Level 2 has 200 words, so local synthesis creates up to 400 files: one word audio file and one sentence audio file per note.

To see installed Mandarin voices:

```bash
say -v '?' | grep zh_CN
```

Pass a different voice with:

```bash
npm run generate:audio -- --levels 2 --voice Tingting --force
```

## Source CSV

The source CSV columns are:

```csv
sequenceNumber,hskLevel,word,pinyin,partOfSpeech
```

The included seed file is only a tiny working sample. Replace it with a pinned extraction from the official New HSK 3.0 syllabus when ready.

## Import From ChineseTest Vocabulary API

The ChineseTest vocabulary tab calls `https://api.hskmock.com/mock/word/searchWords`.
This pipeline can import from that endpoint:

```bash
npm run import:hsk-api -- --levels 2
```

This maps New HSK levels to the API's internal ids:

```txt
New HSK1 -> 31
New HSK2 -> 32
New HSK3 -> 33
```

For New HSK Level 2, the endpoint currently returns 200 words. The importer stores the API source URL and response hash in `data/official/new_hsk_3_0/level_2_items.json`.

You can build from the API source with:

```bash
npm run build:deck -- --api --levels 2 --skip-audio --allow-invalid --out dist/new_hsk_3_0_level_2_api.tsv
```

The API is convenient, but the official syllabus PDF is still the more archival source. Treat API imports as pinned source snapshots and keep the response hash.

## Manual Review

Generated data is cached separately from official data:

```txt
data/official/new_hsk_3_0/
data/generated/new_hsk_3_0/
data/overrides/
```

Use overrides for reviewed Vietnamese and sentence data:

```txt
data/overrides/vi_hsk_overrides.json
data/overrides/sentence_overrides.json
```

## Anki Setup

Use the note/card templates in:

```txt
src/anki/templates/HSK_VI_SENTENCE.md
```
