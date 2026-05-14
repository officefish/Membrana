/**
 * scripts/bootstrap-test-issues.mjs
 *
 * Одноразовый bootstrap: создаёт GitHub Issues по плану из docs/UNIT_TESTING_NEEDS.md.
 * Тестирует методологию работы с задачами (см. docs/TASKS_MANAGEMENT.md).
 *
 * Что делает:
 *   1) проверяет, что gh CLI установлен и авторизован;
 *   2) создаёт недостающие label'ы (idempotent);
 *   3) создаёт 6 Issues с body, соответствующим шаблону `imperfection`.
 *
 * Запуск (локально, где gh имеет права write):
 *   node scripts/bootstrap-test-issues.mjs              # боевой
 *   node scripts/bootstrap-test-issues.mjs --dry-run    # план без обращений к API
 *   node scripts/bootstrap-test-issues.mjs --help
 *
 * После завершения Linear через Auto-link подтянет созданные Issues в Linear-проект.
 * Triage и привязка Linear-ID — за Teamlead'ом.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: node scripts/bootstrap-test-issues.mjs [--dry-run] [--help]

  --dry-run   Распечатать план без обращений к GitHub API.
  --help      Эта справка.

Требования:
  • gh CLI установлен (https://cli.github.com/)
  • gh auth login выполнен и имеет права write на текущий репозиторий
  • запускать в корне репо (gh берёт remote оттуда)`);
  process.exit(0);
}

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Label'ы, которые нужны для этих Issues. Цвета согласованы с TASKS_MANAGEMENT.md.

const LABELS = [
  { name: 'imperfection', color: 'B60205', description: 'Технический долг / недоделка / отсутствующие тесты' },
  { name: 'status:triage', color: 'D4C5F9', description: 'Issue ждёт триажа Teamlead' },
  { name: 'package:agenda', color: '0E8A16', description: 'Касается packages/agenda' },
  { name: 'package:client', color: '0E8A16', description: 'Касается apps/client' },
  { name: 'package:fft-analyzer-service', color: '0E8A16', description: 'Касается packages/services/fft-analyzer' },
  { name: 'package:infra', color: '0E8A16', description: 'Касается инфраструктуры (CI, scripts, configs)' },
];

// ---------------------------------------------------------------------------
// Issues. Поля совпадают с .github/ISSUE_TEMPLATE/imperfection.yml.

const ISSUES = [
  {
    title: '[Imperfection] Покрыть unit-тестами store/registry в @membrana/agenda',
    labels: ['imperfection', 'status:triage', 'package:agenda'],
    where: '`packages/agenda/src/core/store.ts`, `packages/agenda/src/core/registry.ts`',
    what:
      'В `@membrana/agenda` нет unit-тестов на store и registry. CI запускает `vitest run --passWithNoTests`, ' +
      'поэтому отсутствие тестов проходит молча, но ключевая логика модулей и плагинов остаётся непокрытой.',
    why:
      'Недавний фикс «remove explicit any, type persist merge and module registration» — пример того, как без тестов ' +
      'регрессии здесь повторяются. Agenda — центральный пакет: любая его поломка отключает регистрацию всех модулей ' +
      'клиента. Тесты дешёвые (чистая Zustand-логика без DOM/Web Audio), даёт высокий ROI.',
    acceptance: [
      '`registerModule`: тесты сохранения `enabled`, `config`, `activePlugins`, наложения `defaultConfig`, применения `pendingModulePrefs`.',
      '`registerPlugin<TConfig>`: типизированный `Plugin<MicStreamVizPluginConfig>` принимается, `active` сохраняется, повторная регистрация мержит `config`, пользовательское состояние не теряется.',
      '`activatePlugin` / `deactivatePlugin` / `togglePlugin`: меняют `plugin.active` и синхронизируют `module.activePlugins`.',
      '`persist.merge`: читает новый `modulePrefs`, читает legacy `modules`, не кладёт React-компоненты в persisted state.',
      'Тесты выполняются как часть `yarn test` и зелёные в CI.',
    ],
    whitePaper: 'Этап 0 — фундамент: укрепление надёжности core-инфраструктуры перед стартом Этапа 1.',
    source: 'docs/UNIT_TESTING_NEEDS.md — пункт 1',
  },

  {
    title: '[Imperfection] Покрыть smoke-тестами регистрацию модулей и плагинов в apps/client',
    labels: ['imperfection', 'status:triage', 'package:client'],
    where: '`apps/client/src/modules/registerClientModules.ts`',
    what:
      'Smoke-test регистрации модулей не существует. Поломки обнаруживаются только вручную после `yarn dev`.',
    why:
      'Недавняя проблема с `Plugin<MicStreamVizPluginConfig>` — пример того, как runtime-баг пробивается через ' +
      'typecheck и build. Тип сходится, но при регистрации store ведёт себя не так, как ожидалось. Smoke-test ' +
      'закроет этот класс ошибок.',
    acceptance: [
      'Тест подтверждает регистрацию FFT, Spectrum, AudioFileUpload, Oscilloscope, Microphone.',
      'Тест подтверждает, что microphone получает плагин `microphone-stream-viz`.',
      'Тест подтверждает, что `createMicStreamVizPlugin()` проходит через `store.registerPlugin` напрямую.',
      'Тест подтверждает, что `pendingModulePrefs` сбрасывается после регистрации.',
      'Тесты включены в `yarn test` и зелёные в CI.',
    ],
    whitePaper: 'Этап 0 — фундамент: проверка корректности сборки клиентских модулей.',
    source: 'docs/UNIT_TESTING_NEEDS.md — пункт 2',
  },

  {
    title: '[Imperfection] Тесты на microphoneStreamHub (replay для поздних подписчиков)',
    labels: ['imperfection', 'status:triage', 'package:client'],
    where: '`apps/client/src/modules/microphone/microphoneStreamHub.ts`',
    what: 'Поведение «late subscriber» (повторное получение последнего потока) не тестируется.',
    why:
      'Hub — точка слабой связанности между микрофон-модулем и плагинами-визуализаторами. Ошибка здесь незаметно ' +
      'сломает все плагины, использующие микрофон. Файл маленький — тестов нужно немного, ROI высокий.',
    acceptance: [
      'Late subscriber сразу получает последний `MediaStream`.',
      'Late subscriber получает `null`, если поток уже остановлен.',
      '`unsubscribe` удаляет listener.',
      'Публикация в один `moduleId` не затрагивает другой.',
      'Тесты включены в `yarn test` и зелёные в CI.',
    ],
    whitePaper: 'Этап 0 — фундамент: надёжность шины событий между модулями (см. ARCHITECTURE.md, раздел «Плагины и слабая связанность»).',
    source: 'docs/UNIT_TESTING_NEEDS.md — пункт 3',
  },

  {
    title: '[Imperfection] Unit-тесты на чистую математику в @membrana/fft-analyzer-service',
    labels: ['imperfection', 'status:triage', 'package:fft-analyzer-service'],
    where: '`packages/services/fft-analyzer/src/math/{fft,metrics,statistics}.ts`',
    what:
      'Чистая математика без побочных эффектов не покрыта тестами. Это прямо противоречит правилу из SERVICES.md: ' +
      '«Чистое ядро не зависит от React/DOM/Web Audio, идеальный кандидат для unit-тестов».',
    why:
      'На Этапе 1 White Paper будет создаваться `@membrana/drone-detector-service`, который полагается на эти ' +
      'расчёты. Без тестов любая правка спектральной математики может незаметно сломать классификатор.',
    acceptance: [
      '`fft.ts`: фиксированные входы — zero signal, constant signal, simple sine-like buffer; проверяется корректность амплитуд и частот.',
      '`metrics.ts`: RMS, spectral centroid, threshold detection.',
      '`statistics.ts`: ключевые функции (по списку файла).',
      'Edge cases: пустой массив, маленький буфер, некорректный `windowSize` — контракт чёткий (защитное поведение или явная ошибка).',
      'Тесты deterministic, без браузерных API, включены в `yarn test`.',
    ],
    whitePaper: 'Этап 1 — одинокий слушатель: надёжная спектральная база — обязательное условие для drone-detector-service.',
    source: 'docs/UNIT_TESTING_NEEDS.md — пункт 4',
  },

  {
    title: '[Imperfection] Тесты на resolveMicStreamVizConfig в microphone-stream-viz',
    labels: ['imperfection', 'status:triage', 'package:client'],
    where: '`apps/client/src/plugins/microphone-stream-viz/types.ts`',
    what: 'Функция нормализации конфига плагина не покрыта тестами.',
    why:
      'Пользовательский config из persist может прийти в любом виде (legacy, частичный, с некорректными типами). ' +
      'Неправильная нормализация выключает плагин или ломает рендер без явных ошибок.',
    acceptance: [
      '`undefined → default config`.',
      'Частичный config → default + override (все известные ключи).',
      'Некорректные типы игнорируются и заменяются на default.',
      'Все boolean-флаги сохраняются.',
      'Тесты включены в `yarn test` и зелёные в CI.',
    ],
    whitePaper: 'Этап 0 — фундамент: защита от мусора в persist для плагинов.',
    source: 'docs/UNIT_TESTING_NEEDS.md — пункт 5',
  },

  {
    title: '[Imperfection] Добавить yarn test:scripts отдельным шагом в CI',
    labels: ['imperfection', 'status:triage', 'package:infra'],
    where: '`.github/workflows/ci.yml`',
    what:
      '`scripts/context-collector-paths.test.mjs` живёт на root-уровне и не запускается через `turbo run test`. ' +
      'CI не проверяет тесты политики путей, регрессии в фильтрах могут пройти.',
    why:
      'Тесты уже написаны, скрипт `yarn test:scripts` уже зарегистрирован в `package.json`. Не хватает одного шага ' +
      'в `ci.yml`. Минимальное изменение — максимальная польза.',
    acceptance: [
      'В `.github/workflows/ci.yml` добавлен шаг `yarn test:scripts` после `Install dependencies`.',
      'Шаг падает, если падают root-тесты.',
      '`docs/CONTRIBUTING.md` упоминает `yarn test:scripts` среди обязательных локальных проверок.',
    ],
    whitePaper: 'Инфраструктурная задача — без прямой привязки к этапам.',
    source: 'docs/UNIT_TESTING_NEEDS.md — раздел «Что добавить в CI прямо сейчас»',
  },
];

// ---------------------------------------------------------------------------

function makeBody(issue) {
  const accept = issue.acceptance.map((line) => `- [ ] ${line}`).join('\n');
  return [
    '## Где',
    issue.where,
    '',
    '## Что не так',
    issue.what,
    '',
    '## Почему стоит починить',
    issue.why,
    '',
    '## Acceptance criteria',
    accept,
    '',
    '## Связь с WHITE_PAPER.md',
    issue.whitePaper,
    '',
    '---',
    `_Источник: ${issue.source}._`,
    '',
    '> Создано автоматически скриптом `scripts/bootstrap-test-issues.mjs` для проверки методологии работы с задачами (см. `docs/TASKS_MANAGEMENT.md`). После триажа Teamlead конвертирует Issue в Linear-ticket.',
    '',
  ].join('\n');
}

function gh(args, opts = {}) {
  return spawnSync('gh', args, { encoding: 'utf8', ...opts });
}

function checkGh() {
  const ver = gh(['--version']);
  if (ver.status !== 0) {
    console.error('gh CLI не найден. Установите: https://cli.github.com/');
    process.exit(1);
  }
  if (DRY_RUN) return;
  const auth = gh(['auth', 'status']);
  if (auth.status !== 0) {
    console.error('gh не авторизован для текущего репо. Выполните `gh auth login` и повторите.');
    process.exit(1);
  }
}

function existingLabelNames() {
  const res = gh(['label', 'list', '--limit', '200', '--json', 'name', '-q', '.[].name']);
  if (res.status !== 0) return new Set();
  return new Set((res.stdout || '').trim().split('\n').filter(Boolean));
}

function ensureLabels() {
  console.log('==> Проверка label\'ов...');
  const present = DRY_RUN ? new Set() : existingLabelNames();
  for (const { name, color, description } of LABELS) {
    if (present.has(name)) {
      console.log(`  [skip] ${name}`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`  [dry-run] would create label "${name}" (color ${color})`);
      continue;
    }
    const res = gh(
      ['label', 'create', name, '--color', color, '--description', description],
      { stdio: 'inherit' },
    );
    if (res.status !== 0) {
      console.error(`Не удалось создать label "${name}". Прерываюсь.`);
      process.exit(1);
    }
    console.log(`  [+]    ${name}`);
  }
}

function createIssues() {
  const tmpDir = resolve(tmpdir(), `membrana-bootstrap-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  try {
    for (let i = 0; i < ISSUES.length; i++) {
      const issue = ISSUES[i];
      const body = makeBody(issue);
      console.log(`\n==> [${i + 1}/${ISSUES.length}] ${issue.title}`);
      console.log(`    labels: ${issue.labels.join(', ')}`);
      if (DRY_RUN) {
        const preview = body.split('\n').slice(0, 6).join('\n      ');
        console.log(`      ${preview}`);
        console.log('      …');
        continue;
      }
      const bodyFile = resolve(tmpDir, `issue-${i + 1}.md`);
      writeFileSync(bodyFile, body, 'utf8');
      const res = gh(
        [
          'issue', 'create',
          '--title', issue.title,
          '--body-file', bodyFile,
          '--label', issue.labels.join(','),
        ],
        { stdio: 'inherit' },
      );
      if (res.status !== 0) {
        console.error('Не удалось создать Issue. Прерываюсь.');
        process.exit(1);
      }
    }
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

checkGh();
ensureLabels();
createIssues();

console.log('');
console.log('Готово.');
if (!DRY_RUN) {
  console.log('Linear через Auto-link подтянет созданные Issues в Linear-проект.');
  console.log('Дальше — триаж: Teamlead создаёт Linear-ticket\'ы и проставляет `status:linear`.');
  console.log('См. docs/TASKS_MANAGEMENT.md.');
}
