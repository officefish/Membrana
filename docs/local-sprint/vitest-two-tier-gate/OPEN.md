# Membrana Local Sprint OPEN: vitest-two-tier-gate

| Поле | Значение |
|------|----------|
| Sprint | `vitest-two-tier-gate` |
| Procedure | `membrana-local-sprint` |
| Registry cards | `cg2-two-tier-test-gate` (M) · `cg4-ci-testing-docs` (S) · эпик `ci-gate-stabilization` |
| Plan | [`docs/sprint/cut/vitest-two-tier-gate.json`](../../sprint/cut/vitest-two-tier-gate.json) (v1, ратифицирован 10.08 11:51Z) |
| Prompt | [`CI_GATE_STABILIZATION_SPRINT_PROMPT.md`](../../prompts/CI_GATE_STABILIZATION_SPRINT_PROMPT.md) |
| Cutter | ozhegov ([конспект](../../discussions/cut-vitest-two-tier-gate-ozhegov.md)) |
| Blocks | b1-smoke-catalog (dynin) · b2-affected-scope (ozhegov) · b3-ci-wire (vesnin) · b4-contributing (rodchenko) |
| Status | OPEN |

## Зачем

Мердж-гейт сегодня полный: [`ci.yml:81-82`](../../../.github/workflows/ci.yml#L81-L82) гоняет
`turbo run lint typecheck test build --continue` на каждый коммит каждой ветки при 12 живых
рабочих деревьях. Карточки `cg2` и `cg4` заведены 2026-07-02 и не двигались 39 дней; ревизия
реестра 09.08 оставила их active с формулировкой «двухуровневого гейта нет».

## Предмет — второй корпус, а не расширение первого

«Test gate» — омоним, и разбор резчика начинается именно с этого. Контейнер ADR-0018 стоит
над корпусом **scripts** (`discovery.root='scripts'`, `suffix='.test.mjs'`, 367 файлов, под
`packages/` — ноль). Новый ярус — над корпусом **vitest** (430 файлов, 38 пакетов со скриптом
`test`). Две словарные статьи с одной леммой. Всё новое зовётся `vitest-*`, существующее не
переименовывается, b4 описывает обе статьи раздельно.

## Что уже было в стволе до спринта

- **Ярус full существует** — [`scheduled-ci.yml:47-51`](../../../.github/workflows/scheduled-ci.yml#L47-L51),
  но каденция недельная (`cron: '0 6 * * 1'`), не ночная. Не трогаем: другая статья.
- **Приём affected применён** — [`desktop-studio.yml:79`](../../../.github/workflows/desktop-studio.yml#L79).
- **Его дефект уже вылечен один раз** — [`prepush-typecheck-scope.mjs`](../../../scripts/prepush-typecheck-scope.mjs)
  (#1168): turbo метит пакет affected по любому файлу, включая markdown; правка `.md` тянула
  зависимых и роняла push на `vite` exit 127.

## Замер, изменивший нарезку

Резчик предложил признак smoke — замыкание зависимостей от `apps/client` и
`packages/background-*`. Посчитано по дереву 10.08: **27 пакетов из 38, 71% корпуса**. Ярус,
который не сужает, цели карточки не достигает.

Замерена альтернатива на 25 последних merge-коммитах:

| Мерка | Значение |
|-------|----------|
| медиана affected-пакетов | **1** |
| мерджей, не трогающих пакеты вовсе | 10 из 25 |
| мерджей меньше половины корпуса | 23 из 25 |
| выбросы | `6ab04582` (467 файлов, задет корневой конфиг → весь корпус, законно) · `1ff09f7c` (11 файлов → 28 через `core`) |

Вывод: сужает affected-селекция, статический smoke нужен только как страховка от системного
слома. Признак заменён на порог транзитивного фан-ина ≥ 10 — обрыв в графе чистый:
`@membrana/core` 27 · `@membrana/audio-engine-service` 16 · `@membrana/detector-base` 11 ·
дальше пологий хвост (`fft-analyzer` 9, `trends` 6). Три пакета вместо двадцати семи.

## Границы, названные заранее

Настройка branch protection — ход владельца, не скрипта (предусловие ADR-0018 дословно).
`vitest-nightly.yml` ходит по расписанию, но красный **ничего не блокирует**: ночь становится
гейтом отдельным жестом владельца, и спринт этого не обещает.

Также вне: миграция `scheduled-ci.yml`; файловый import-граф для vitest; починка
`resolveImport` в [`tests-container.mjs:66`](../../../scripts/lib/tests-container.mjs#L66)
(слеп к `@membrana/*`, `.tsx` без кандидата на резолв) — дефект соседнего контейнера,
заводится отдельной карточкой.
