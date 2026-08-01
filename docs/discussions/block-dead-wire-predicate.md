> **Вещдок прогона через профильный контекст — ВХОД, а не норма.**
> Сырой ответ персоны, сохранён следом рода `context_run` для гейта спринта.
> Нормативен только дом процедуры: `docs/procedures/weekly-dead-wire/README.md`.
> Часть предложений ниже отклонена с причиной — разбор расхождений в доме.

# Обсуждение: WEEKLY_DEAD_WIRE_AUDIT_PROMPT

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-01 06:45 UTC · dynin

**Контекст:** docs/prompts/WEEKLY_DEAD_WIRE_AUDIT_PROMPT.md
**Вопрос:** Блок dead-wire-predicate спринта weekly-dead-wire-audit. Спроектируй ЧИСТОЕ ЯДРО в scripts/lib/dead-wire.mjs: вход — разобранные scripts из package.json плюс инъектируемая функция существования пути и перечень pending; выход — находки. Предикат связи: файл существует ИЛИ команда стоит в явном перечне pending с причиной и датой; третьего молчаливого состояния нет (норма B10). Ответь строго по пунктам: 1) сигнатуры экспортируемых функций и форма находки; 2) как отличать команду вида 'node scripts/x.mjs' от команд без файлового носителя (turbo, yarn workspace, tsx, составные через && и |) — какие НЕ проверяем и почему; 3) схема записи pending как ЗАКРЫТОГО перечня, а не свободного текста (норма B9 Проза): обязательные поля и валидация; 4) закрытый enum вердиктов implement|pending|remove — где он живёт и кто его читает; 5) какие граничные случаи ядро обязано различать. Без обвязки, без сети, без fs внутри ядра.

**Ответ:**

Отвечаю по пунктам, строго.

---

## 1) Сигнатуры функций и форма находки

```typescript
// scripts/lib/dead-wire.mjs

/**
 * Основной предикат: команда корректна (файл существует ИЛИ в pending).
 * Вход: текст команды, инъектируемая функция проверки пути, карта pending.
 * Выход: { valid: boolean; reason?: string; pendingEntry?: PendingEntry }
 */
export function validateCommand(
  command: string,
  fileExists: (path: string) => boolean,
  pendingMap: Map<string, PendingEntry>
): ValidationResult {
  // ...
}

/**
 * Аудит всего перечня.
 * Вход: объект { [cmdName]: cmdText }, fileExists, pendingMap.
 * Выход: находки с классификацией по вердиктам.
 */
export function auditCommands(
  commands: Record<string, string>,
  fileExists: (path: string) => boolean,
  pendingMap: Map<string, PendingEntry>
): AuditReport {
  // ...
}

// Формы данных:
export type ValidationResult = {
  valid: boolean;
  reason?: string;           // "file not found" | "in pending" | "pending expired"
  pendingEntry?: PendingEntry;
};

export type AuditFinding = {
  commandName: string;
  commandText: string;
  verdict: Verdict;          // 'implement' | 'pending' | 'remove'
  validation: ValidationResult;
  pendingEntry?: PendingEntry; // если verdict === 'pending'
};

export type AuditReport = {
  findings: AuditFinding[];
  summary: {
    implement: string[];     // командные имена
    pending: string[];
    remove: string[];
  };
};
```

---

## 2) Отличение команд с файловым носителем

**Паттерн для проверки:** только `node scripts/*.mjs` (и близкие варианты) требуют проверки на диск.

```typescript
/**
 * Извлекает имя скрипта из команды типа 'node scripts/foo.mjs'.
 * Возвращает путь или null, если команда не этого типа.
 */
export function extractScriptPath(commandText: string): string | null {
  const match = commandText.match(
    /^(?:node|tsx|npx ts-node)\s+(scripts\/[a-z\-]+\.mjs|src\/scripts\/[^/]+\.ts)(?:\s+.*)?$/
  );
  return match ? match[1] : null;
}

/**
 * Определяет, требует ли команда проверки на файловый носитель.
 */
export function requiresFileValidation(commandText: string): boolean {
  const scriptPath = extractScriptPath(commandText);
  return scriptPath !== null;
}
```

**Что НЕ проверяем и почему:**

| Команда | Причина отпуска |
|---------|-----------------|
| `turbo run build` | Turbo сам управляет таргетами; зависимость на существование конкретного файла — инвертирована (скрипт ищет turbo.json, не наоборот) |
| `yarn workspace @pkg build` | Workspace-имена и таргеты — в `package.json` и `tsconfig.json`; файловой привязки нет |
| `tsx src/cli.ts` | Может быть скомпилирован в памяти (esbuild); путь — подсказка, не контракт |
| `npm run foo && npm run bar` | Составная команда; каждый компонент проверяется отдельно, композитор — в обвязке |
| `echo "test"` | Встроенные shell-команды; нет файлового носителя |

---

## 3) Схема `pending` как закрытого перечня (норма B9)

```typescript
// Объявить один раз в scripts/lib/pending-schema.mjs

export const PendingReasons = Object.freeze({
  SCAFFOLD_AWAITS_IMPL:   'scaffold-awaits-impl',    // 'есть место, нет тела'
  BLOCKED_BY_EPIC:        'blocked-by-epic',          // зависит от мержа эпика
  DEFERRED_STAGING:       'deferred-staging',         // намеренно в staging-ветке
  MIGRATION_IN_PROGRESS:  'migration-in-progress',    // переезд в другую папку/имя
  EXTERNAL_DEPENDENCY:    'external-dependency',      // ждём внешний pull/lib
  TBD_IMPLEMENTATION:     'tbd-implementation',       // техдолг, срок известен
});

export type PendingEntry = {
  reason: keyof typeof PendingReasons;      // один из enum, не строка
  dueDate: string;                          // ISO 8601, например '2026-08-15'
  ticketUrl?: string;                       // опционально: ссылка на карточку
  notes?: string;                           // одна строка, макс 120 символов
};

/**
 * Валидирует входящий pending-объект.
 */
export function validatePendingEntry(entry: unknown): entry is PendingEntry {
  if (typeof entry !== 'object' || !entry) return false;
  const e = entry as Record<string, unknown>;

  // reason: обязателен, известный ключ
  if (!(e.reason in PendingReasons)) return false;

  // dueDate: обязателен, парсится как дата
  if (typeof e.dueDate !== 'string') return false;
  const due = new Date(e.dueDate);
  if (isNaN(due.getTime())) return false;

  // ticketUrl: опционален, если есть — URL
  if (e.ticketUrl !== undefined && typeof e.ticketUrl !== 'string') return false;

  // notes: опционален, если есть — строка ≤ 120 символов
  if (e.notes !== undefined && (typeof e.notes !== 'string' || e.notes.length > 120)) return false;

  return true;
}

/**
 * Проверяет, истёк ли срок pending.
 */
export function isPendingExpired(entry: PendingEntry, nowDate: Date = new Date()): boolean {
  const dueDate = new Date(entry.dueDate);
  return nowDate > dueDate;
}
```

**Использование в ядре:**

```typescript
export function validateCommand(
  command: string,
  fileExists: (path: string) => boolean,
  pendingMap: Map<string, PendingEntry>  // ← Map<commandName, PendingEntry>
): ValidationResult {
  const scriptPath = extractScriptPath(command);
  
  if (!scriptPath) {
    // Команда не требует файловой проверки — всегда valid
    return { valid: true };
  }

  // Проверяем файл
  if (fileExists(scriptPath)) {
    return { valid: true };
  }

  // Файла нет — ищем в pending
  const cmdName = command.split(/\s+/)[2]?.split('/').pop() || 'unknown';
  const pending = pendingMap.get(cmdName);

  if (!pending || !validatePendingEntry(pending)) {
    return { valid: false, reason: 'file-not-found' };
  }

  if (isPendingExpired(pending)) {
    return { valid: false, reason: 'pending-expired', pendingEntry: pending };
  }

  return { valid: true, reason: 'in-pending', pendingEntry: pending };
}
```

---

## 4) Закрытый enum вердиктов и где он живёт

```typescript
// scripts/lib/verdicts.mjs

export const Verdicts = Object.freeze({
  IMPLEMENT:  'implement',   // файл не существует, pending нет → нужно писать
  PENDING:    'pending',     // файл не существует, но есть валидная pending-запись
  REMOVE:     'remove',      // файл не существует, pending истёк → снять объявление
});

export type Verdict = keyof typeof Verdicts;

/**
 * Логика: по ValidationResult → Verdict
 */
export function resolveVerdict(
  validation: ValidationResult,
  pendingExpired: boolean = false
): Verdict {
  if (validation.valid && validation.reason === 'in-pending') {
    return 'pending';
  }
  if (!validation.valid) {
    return pendingExpired ? 'remove' : 'implement';
  }
  // Файл существует — нет вердикта (находка не генерируется)
  return null; // ← сигнал обвязке: эту команду не включать в findings
}
```

**Кто читает:** `scripts/tasks-bookkeeping.mjs` (обвязка, точка входа от yarn task) разбирает findings и для каждого вердикта вызывает свой обработчик (консольный вывод, коммит, ссылка на карточку).

---

## 5) Граничные случаи, которые ядро различает

```typescript
/**
 * Граничные случаи, которые ДОЛЖНЫ работать корректно:
 */

// а) Команда с параметрами
validateCommand(
  'node scripts/test.mjs --verbose --timeout 5000',
  fileExists,
  pendingMap
); // → должна извлечь 'scripts/test.mjs' и проверить его

// б) Относительные пути с ./ и ../
validateCommand(
  'node ./scripts/test.mjs',
  fileExists,
  pendingMap
); // → должна нормализовать и проверить

// в) Абсолютные пути (/home/user/...)
validateCommand(
  'node /home/user/repo/scripts/test.mjs',
  fileExists,
  pendingMap
); // → должна проверить как есть

// г) Пути с дефисами и подчёркиваниями
validateCommand(
  'node scripts/my-special_test.mjs',
  fileExists,
  pendingMap
); // → должна парсить корректно

// д) Pending истёк на день: вердикт меняется с 'pending' на 'remove'
const pendingExpired = {
  reason: 'scaffold-awaits-impl',
  dueDate: '2026-07-31',  // вчера
};
isPendingExpired(pendingExpired, new Date('2026-08-01')); // → true

// е) Pending завтра: всё ещё 'pending'
const pendingFuture = {
  reason: 'blocked-by-epic',
  dueDate: '2026-08-02',  // завтра
};
isPendingExpired(pendingFuture, new Date('2026-08-01')); // → false

// ж) Команда без file-носителя → всегда valid, никогда в findings
validateCommand('turbo run build', fileExists, pendingMap);
// → { valid: true } — finds не содержит эту команду

// з) Поддельная pending-запись (неправильный reason)
const fakePending = { reason: 'unknown-reason', dueDate: '2026-08-15' };
validatePendingEntry(fakePending); // → false (не пускаем в Map)

// и) Pending-дата не парсится как ISO
const badDate = { reason: 'scaffold-awaits-impl', dueDate: 'bad-date' };
validatePendingEntry(badDate); // → false

// й) Команда повторяется в package.json — каждый вызов независим
// (ядро не держит состояние между вызовами)
```

---

**Вывод:** ядро — чистая функция: вход (команда, предикат существования, карта pending) → выход (verdict + reason). Обвязка (`package.json` → parse → ядро → report → fs/console) живёт в `scripts/tasks-bookkeeping.mjs` и держит состояние, обращается к диску, пишет логи. Ядро заканчивается на enum и изоляции from B9 (закрытый перечень, не прозе).

---
