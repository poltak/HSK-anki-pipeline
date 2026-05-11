# HSK_VI_SENTENCE

Create one Anki note type with the fields in `dist/*.tsv`.

## Card 1: Reading

Front:

```html
<div class="sentence-zh">{{SentenceZhBold}}</div>
<div class="audio">{{SentenceAudio}}</div>
```

Back:

```html
<div class="sentence-zh">{{SentenceZhBold}}</div>
<div class="sentence-pinyin">{{SentencePinyin}}</div>
<div class="sentence-vi">{{SentenceVi}}</div>
<div class="sentence-en">{{SentenceEn}}</div>

<hr>

<div class="target-hanzi">{{TargetHanzi}}</div>
<div class="target-pinyin">{{TargetPinyin}}</div>
<div class="target-vi">{{TargetVi}}</div>
<div class="target-en">{{TargetEn}}</div>
<div>{{WordAudio}}</div>
```

## Card 2: Listening

Front:

```html
<div class="audio-only">{{SentenceAudio}}</div>
```

Back:

```html
<div class="sentence-zh">{{SentenceZhBold}}</div>
<div class="sentence-pinyin">{{SentencePinyin}}</div>
<div class="sentence-vi">{{SentenceVi}}</div>
<div class="sentence-en">{{SentenceEn}}</div>

<hr>

<div class="target-hanzi">{{TargetHanzi}}</div>
<div class="target-pinyin">{{TargetPinyin}}</div>
<div class="target-vi">{{TargetVi}}</div>
<div class="target-en">{{TargetEn}}</div>
<div>{{WordAudio}}</div>
```

## Styling

```css
.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 22px;
  line-height: 1.45;
  text-align: center;
}

.sentence-zh {
  font-size: 34px;
  margin: 16px 0;
}

.sentence-zh b {
  color: #b42318;
}

.sentence-pinyin {
  color: #475467;
  margin: 10px 0;
}

.sentence-vi {
  font-size: 24px;
  margin: 14px 0;
}

.sentence-en,
.target-en {
  color: #667085;
}

.target-hanzi {
  font-size: 36px;
  margin-top: 14px;
}

.audio-only {
  margin-top: 40px;
}
```
