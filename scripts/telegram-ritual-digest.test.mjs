import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractDayDigest,
  extractDigestHeader,
  extractEveningDigest,
  stripInlineMd,
} from './lib/ritual-digest-extract.mjs';

const DAY_FIXTURE = `<!-- Сгенерировано -->

# MAIN_DAY_ISSUE — 2026-07-16

\`\`\`
┌──────────────────────────────────────────────┐
│ ⚡ РАЗВЕДКА §5 → ВЕРДИКТ → СТАРТ В КОДЕ       │
│                                              │
│ 🎯 Критерий вечера: магистраль стартовала в  │
│    коде, рабочее дерево чистое.              │
└──────────────────────────────────────────────┘
\`\`\`

**Одна фраза дня:** последний день перед дедлайном FREE — сначала **разведка §5**,
затем однозначный **вердикт**, и в тот же день **старт магистрали в коде**.

## 🔗 Issues в скоупе

| Приоритет | Issues |
|-----------|--------|
| **Магистраль / критпуть FREE** | #415 (live-neural fusion) |
| **Долг (side-слот при простое)** | #476 п.1 (merge-driver реестра), #407 (pr:ship устойчивость) |
| **Отложено (пост-FREE)** | #494 (batch-collection), #420 (полевой data-anchor, privacy-гейт) |
| **Отложено (долг)** | #236, #197, #196 |

---
`;

const EVENING_FIXTURE = `<!-- Сгенерировано -->

# Team Evening Feedback — 2026-07-16

**Средний балл команды:** 7.8/10

### Итоги против плана

**Сошлось:**
- fusion-узел стартовал в коде
- разведка §5 закрыта

**Не сошлось / перенесено:**
- UC-документы не тронуты

**Неожиданно всплыло:**
- починка CI-флейка

### Резюме Teamlead

- **Вердикт дня:** День продуктивный: магистраль стартовала в коде.
`;

test('stripInlineMd снимает жирный/код/ссылки', () => {
  assert.equal(
    stripInlineMd('**Жирно** и `код` и [текст](https://x)'),
    'Жирно и код и текст',
  );
});

test('extractDayDigest: центральная фраза, приоритет, перспективы, критерий', () => {
  const d = extractDayDigest(DAY_FIXTURE);
  assert.equal(d.kind, 'day');
  assert.equal(d.date, '2026-07-16');
  assert.equal(
    d.headline,
    'последний день перед дедлайном FREE — сначала разведка §5, затем однозначный вердикт, и в тот же день старт магистрали в коде',
  );
  assert.deepEqual(d.highPriority, [
    'live-neural fusion (#415)',
    'merge-driver реестра (#476)',
    'pr:ship устойчивость (#407)',
  ]);
  assert.deepEqual(d.perspective, [
    'batch-collection (#494)',
    'полевой data-anchor, privacy-гейт (#420)',
  ]);
  assert.equal(d.eveningCriterion, 'магистраль стартовала в коде, рабочее дерево чистое');
});

test('extractDayDigest: фолбэк headline на ⚡ при отсутствии «Одной фразы»', () => {
  const noPhrase = `# MAIN_DAY_ISSUE — 2026-07-16

\`\`\`
┌────────────────────┐
│ ⚡ СТАРТ МАГИСТРАЛИ │
└────────────────────┘
\`\`\`
`;
  assert.equal(extractDayDigest(noPhrase).headline, 'СТАРТ МАГИСТРАЛИ');
});

test('extractDayDigest: нераспознанный артефакт → null (graceful)', () => {
  assert.equal(extractDayDigest(''), null);
  assert.equal(extractDayDigest('# MAIN_DAY_ISSUE — 2026-07-16\nбез бокса'), null);
});

test('extractEveningDigest: вердикт, балл, три секции итогов', () => {
  const d = extractEveningDigest(EVENING_FIXTURE);
  assert.equal(d.kind, 'evening');
  assert.equal(d.date, '2026-07-16');
  assert.equal(d.teamScore, '7.8/10');
  assert.ok(d.headline.startsWith('День продуктивный'));
  assert.ok(!d.headline.includes('**'), 'markdown снят');
  assert.deepEqual(d.converged, ['fusion-узел стартовал в коде', 'разведка §5 закрыта']);
  assert.deepEqual(d.notConverged, ['UC-документы не тронуты']);
  assert.deepEqual(d.unexpected, ['починка CI-флейка']);
});

test('extractEveningDigest: без секции «Итоги против плана» — секции опущены (graceful)', () => {
  const bare = `# Team Evening Feedback — 2026-07-16

**Средний балл команды:** 8.0/10

### Резюме Teamlead

- **Вердикт дня:** Ровный день.
`;
  const d = extractEveningDigest(bare);
  assert.equal(d.converged, undefined);
  assert.equal(d.notConverged, undefined);
  assert.equal(d.unexpected, undefined);
  assert.ok(d.headline.startsWith('Ровный день'));
});

test('extractEveningDigest: без вердикта — фолбэк-headline, без даты — null', () => {
  const noVerdict = extractEveningDigest('# Team Evening Feedback — 2026-07-16\n');
  assert.ok(noVerdict.headline.includes('Вечерний ритуал завершён'));
  assert.equal(extractEveningDigest('нет даты'), null);
});

test('extractDigestHeader: содержимое между маркерами; без маркеров/пусто → null', () => {
  const md = `# Шапка

> служебный комментарий вне маркеров

<!-- digest-header:start -->
**Membrana** — сеть «ушей».

*Мини-словарь:* **PR** — порция изменений.
<!-- digest-header:end -->
`;
  assert.equal(
    extractDigestHeader(md),
    '**Membrana** — сеть «ушей».\n\n*Мини-словарь:* **PR** — порция изменений.',
  );
  assert.equal(extractDigestHeader('# без маркеров'), null);
  assert.equal(extractDigestHeader('<!-- digest-header:start --><!-- digest-header:end -->'), null);
});
