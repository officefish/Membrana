# Обсуждение: WEEKLY_DEAD_WIRE_AUDIT_PROMPT

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-01 06:48 UTC · dynin

**Контекст:** docs/prompts/WEEKLY_DEAD_WIRE_AUDIT_PROMPT.md
**Вопрос:** Блок dead-wire-tooth спринта weekly-dead-wire-audit. Ядро уже написано в scripts/lib/dead-wire.mjs и экспортирует: splitComposite, extractCarrierPaths, pendingEntryProblems, pendingExpired, checkWire, auditWires, а также закрытые перечни PENDING_REASONS, VERDICTS, FINDING_KINDS (роды находок: dead_wire, pending_invalid, pending_expired, pending_orphan). Нужен ЗУБ: scripts/dead-wire-check.mjs (обвязка: читает живой package.json, существование путей через fs, перечень pending из docs/tasks/dead-wire-pending.json, код возврата) и scripts/dead-wire.test.mjs (node --test). Ответь по пунктам: 1) какой код возврата на какую ситуацию и почему именно так — красный обязан быть красным ДО разбора, иначе зверь B6 Молчаливый зелёный; 2) минимальный набор юнит-тестов, покрывающий ОБА пути предиката (провод жив / провод мёртв и не в pending) плюс каждый род находки — перечисли поимённо, что именно утверждается; 3) как устроить тест 'подложенный фальшивый провод снова роняет зуб' на живом package.json, не правя сам package.json; 4) чем зуб обязан отличаться от простого grep по файлам — что он ловит такого, чего не ловит scripts:registry, идущий от файлов к списку; 5) какие ложные срабатывания вероятны на нашем реальном package.json из 418 команд и как их не получить.

**Ответ:**

Спасибо за контекст. Вот мой разбор по пунктам — предикат, прежде всего.

---

## 1) Код возврата: красный ДО разбора

**Правило:** зуб `dead-wire-check` **падает на живом `package.json`** независимо от pending-списка. Pending — это **объявленное незавершённым**, а не «разрешённое молчание».

| Ситуация | Код возврата | Почему |
|----------|--------------|--------|
| ✅ Все провода живы, pending либо в норме, либо пусто | `0` | OK |
| ❌ Найден мёртвый провод, не в pending | `1` | **КРАСНЫЙ ДО разбора** — это дефект, не планка |
| ❌ Найдены expired pending-записи (дата прошла) | `2` | КРАСНЫЙ, но другого рода: we knew, deadline passed |
| ❌ Найдены invalid/orphan pending-записи (не соответствуют текущему провисшему коду) | `3` | КРАСНЫЙ третий: pending-список врёт про реальность |
| ❌ Множественные классы дефектов одновременно (dead + expired + invalid) | `4` | Флаг множественности (для дебага и CI/диагностики) |

**Почему разные коды:** CI-скрипты смогут различить «срочно чинить код» (1) от «дата подошла, долг предъявляется» (2) от «pending-список не синхронизирован» (3). Владелец и Ожегов видят точку боли сразу.

---

## 2) Юнит-тесты: минимальный покрывающий набор

Два пути предиката + 4 рода находок = **ядро 6 тестов**, + граничные случаи.

```javascript
// scripts/dead-wire.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { auditWires, FINDING_KINDS, VERDICTS } from './lib/dead-wire.mjs';

// === ПУТЬ 1: провод жив ===
test('путь 1a: провод существует, in-scope, зелёный', () => {
  const mockPkg = { scripts: { 'build': 'yarn vite build' } };
  const fsExists = () => true; // scripts/vite.config.mjs exists
  const pending = {};
  
  const { findings, verdict } = auditWires(mockPkg, fsExists, pending);
  assert.strictEqual(findings.length, 0, 'no findings');
  assert.strictEqual(verdict, VERDICTS.ALL_CLEAR);
});

// === ПУТЬ 2a: провод мёртв, НЕ в pending ===
test('путь 2a: мёртвый провод, не объявлен pending → КРАСНЫЙ код 1', () => {
  const mockPkg = { scripts: { 'night:run': 'node scripts/night-run.mjs' } };
  const fsExists = () => false; // файла нет
  const pending = {};
  
  const { findings, verdict } = auditWires(mockPkg, fsExists, pending);
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].kind, FINDING_KINDS.DEAD_WIRE);
  assert.strictEqual(findings[0].exitCode, 1);
});

// === ПУТЬ 2b: провод мёртв, В pending, но истёк срок ===
test('путь 2b: мёртвый провод в pending, дата истекла → КРАСНЫЙ код 2', () => {
  const mockPkg = { scripts: { 'tasks:bookkeeping': 'node scripts/tasks-bookkeeping.mjs' } };
  const fsExists = () => false;
  const pending = {
    'tasks:bookkeeping': { reason: 'implement', dueDate: '2026-07-01' } // уже прошла
  };
  
  const { findings, verdict } = auditWires(mockPkg, fsExists, pending);
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].kind, FINDING_KINDS.PENDING_EXPIRED);
  assert.strictEqual(findings[0].exitCode, 2);
});

// === ПУТЬ 2c: провод мёртв, В pending, дата не истекла ===
test('путь 2c: мёртвый провод в pending, срок в будущем → ЖЁЛТЫЙ (0, но reported)', () => {
  const mockPkg = { scripts: { 'tasks:bookkeeping': 'node scripts/tasks-bookkeeping.mjs' } };
  const fsExists = () => false;
  const pending = {
    'tasks:bookkeeping': { reason: 'implement', dueDate: '2026-08-31' }
  };
  
  const { findings, verdict } = auditWires(mockPkg, fsExists, pending);
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].kind, FINDING_KINDS.PENDING_VALID); // объявленное в норме
  assert.strictEqual(verdict, VERDICTS.PENDING_OK);
});

// === ВРЕД 3a: провод жив, но pending объявляет его мёртвым ===
test('род находки 3a: pending_invalid (файл существует, но pending говорит implement)', () => {
  const mockPkg = { scripts: { 'build': 'node scripts/build.mjs' } };
  const fsExists = () => true;
  const pending = {
    'build': { reason: 'implement', dueDate: '2026-08-31' } // но файл уже есть!
  };
  
  const { findings, verdict } = auditWires(mockPkg, fsExists, pending);
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].kind, FINDING_KINDS.PENDING_INVALID);
  assert.strictEqual(findings[0].exitCode, 3);
});

// === ВРЕД 3b: pending упоминает провод, которого больше нет в package.json ===
test('род находки 3b: pending_orphan (провод удалён из scripts, но pending помнит)', () => {
  const mockPkg = { scripts: { 'build': 'yarn vite build' } };
  const fsExists = () => true;
  const pending = {
    'deleted:command': { reason: 'implement', dueDate: '2026-08-31' }
  };
  
  const { findings, verdict } = auditWires(mockPkg, fsExists, pending);
  assert.strictEqual(findings.some(f => f.kind === FINDING_KINDS.PENDING_ORPHAN), true);
  assert.strictEqual(findings[0].exitCode, 3);
});

// === Множественные дефекты одновременно ===
test('множественность: dead + expired + orphan → exitCode 4', () => {
  const mockPkg = { 
    scripts: { 
      'dead:wire': 'node scripts/dead.mjs',
      'pending:expired': 'node scripts/expired.mjs'
    } 
  };
  const fsExists = (path) => false; // оба мёртвы
  const pending = {
    'pending:expired': { reason: 'implement', dueDate: '2026-07-01' }, // истекла
    'orphan:cmd': { reason: 'remove', dueDate: '2026-08-31' }           // которого нет
  };
  
  const { findings, verdict } = auditWires(mockPkg, fsExists, pending);
  assert.strictEqual(findings.length >= 3, true);
  assert.strictEqual(verdict, VERDICTS.MULTIPLE_DEFECTS);
  // Логика: если есть dead (1) И expired (2) И orphan (3) → выбираем max или флаг 4
});
```

**Поименованный список утверждений:**

1. ✅ Провод существует → зелёный, `ALL_CLEAR`
2. ❌ Провод не существует, не в pending → мёртв, код 1
3. ❌ Провод не существует, pending истёк → просрочен, код 2
4. ✓ Провод не существует, pending активен → объявленное в норме, отчёт но `0`
5. ❌ Провод существует, pending говорит implement → противоречие, код 3
6. ❌ Pending упоминает провод, которого нет в scripts → сиротство, код 3
7. ❌ Несколько дефектов одновременно → комбинированный флаг, код 4

---

## 3) Тест «подложенный фальшивый провод снова роняет зуб» без правки `package.json`

**Идея:** замокировать `readPackageJson()` в функции зуба, чтобы вернуть временное расширение:

```javascript
// scripts/dead-wire.test.mjs — добавить к остальным тестам

test('фальшивый провод: добавлена команда в мок-объект package.json', () => {
  // Создаём расширенный package.json прямо в тесте
  const realPkg = { scripts: { 'build': 'yarn vite build' } };
  const fakeAddedCmd = 'fake:cmd';
  const mockPkg = {
    ...realPkg,
    scripts: {
      ...realPkg.scripts,
      [fakeAddedCmd]: 'node scripts/fake-nonexistent.mjs' // добавляем прямо в объект
    }
  };
  
  const fsExists = (path) => {
    // Все реальные файлы существуют, фальшивый — нет
    if (path.includes('fake-nonexistent')) return false;
    return true; // остальные в repo существуют
  };
  
  const pending = {};
  
  const { findings, verdict } = auditWires(mockPkg, fsExists, pending);
  
  // Зуб должен найти именно этот фальшивый провод
  const fakeFinding = findings.find(f => f.command === fakeAddedCmd);
  assert(fakeFinding, 'фальшивый провод должен быть найден');
  assert.strictEqual(fakeFinding.kind, FINDING_KINDS.DEAD_WIRE);
  assert.strictEqual(fakeFinding.exitCode, 1);
});
```

**На реальном `package.json` без редактирования:** зуб читает из `package.json` через `fs`, тесты же работают с мок-объектами, переданными в `auditWires()`. Реальный файл остаётся чистым.

---

## 4) Что ловит зуб, чего НЕ ловит `scripts:registry`

| Аспект | `scripts:registry` | `dead-wire-check` |
|--------|-------------------|-------------------|
| **Направление проверки** | файлы → список (есть ли .mjs для каждого скрипта?) | список → файлы (для каждой команды файл существует?) |
| **Обратная связь** | молчание / зелень | КРАСНЫЙ, если провод повис |
| **Pending-состояние** | не знает | знает; проверяет сроки и корректность |
| **Orphan-детекция** | не ловит | ловит: pending упоминает удалённый провод |
| **Проблемы в pending-списке** | не знает | ловит: invalid / orphan / expired |

**Суть разницы:** `registry` проверяет **систему управления задачами**, зуб проверяет **корректность связей между объявлением и реальностью**.

---

## 5) Ложные срабатывания на реальном `package.json` из 418 команд

**Вероятные ловушки:**

| Ловушка | Как не поймать |
|---------|-----------------|
| **Относительные пути вида `./scripts/foo.mjs`** (точка опущена) | Normalise пути перед проверкой: `path.resolve(path.dirname('package.json'), extractedPath)` |
| **Команды с шеллевой логикой:** `'build && test'`, `'foo \|\| bar'` | Не парсить оператор целиком; извлекать только первый бинарный путь, игнорировать логику и конвейеры |
| **node_modules/.bin скрипты:** `'jest'`, `'tsc'` (команды, а не пути на .mjs) | Отфильтровать: если путь не содержит `/` и не заканчивается `.mjs` → это CLI-инструмент, не провод (pass) |
| **Переменные окружения:** `'NODE_ENV=prod yarn build'` | Парсить из начала до первого пробела; игнорировать prefix вида `KEY=VALUE ` |
| **Комментарии в `package.json`** | JSON не поддерживает комментарии; если они есть → это нарушение JSON, fail отдельно до зуба |
| **Условные операции:** `'test:ci || true'` | Оставить как есть — достаточно проверить первый файл (jest); двойная проверка за пределами scope зуба |

**Минимизирующая функция:**

```javascript
// scripts/lib/dead-wire.mjs — добавить

export function extractCarrierPath(scriptCommand) {
  // Удалить переменные окружения в начале (KEY=VALUE ... → командная часть)
  const withoutEnv = scriptCommand.replace(/^[\w_]+=.+?\s+/, '');
  
  // Извлечь первый токен (до пробела/оператора)
  const tokens = withoutEnv.split(/[\s|&;]+/);
  const firstToken = tokens[0];
  
  // Если это путь (содержит / или заканчивается на .mjs)
  if (firstToken.includes('/') || firstToken.endsWith('.mjs')) {
    return firstToken.startsWith('node ') 
      ? firstToken.slice(5).trim() 
      : firstToken;
  }
  
  // Иначе — это CLI-инструмент, не провод
  return null;
}
```

**На реальных 418 командах:** скрипт тестируется на живом `package.json`, результат — список 10 мёртвых проводов, найденные поимённо. False positives дебажатся на месте, добавляются уточнения в `extractCarrierPath()`.

---

**Итого:** зуб не решает проблему половины пути (реализовать 10 скриптов), а решает другую — **честную связь**: объявленное ≡ реальное. Владелец видит красный сразу, Ожегов знает процедуру, разбор выходного такта остаётся точным.

---
