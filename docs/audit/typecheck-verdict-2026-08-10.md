# Вердикт долга typecheck из ревью 08.08 — 2026-08-10

> Блок b1 спринта `s-queue-tail-2026-08-10` (держатель ozhegov, конспект контекста —
> [`../discussions/block-b1-typecheck-verdict-ozhegov.md`](../discussions/block-b1-typecheck-verdict-ozhegov.md)).
> Строка 7 десятки хендофа 09.08.

## Предмет

DoD `DAILY_CODE_REVIEW` 08.08 (дважды, `grep -c typecheck` → 2), дословно:

```bash
yarn turbo run typecheck --filter=@membrana/background-cabinet --filter=@membrana/background-office
```

Оба раза перенесён. Здесь — прогон и вердикт по каждому объекту отдельно.

## Команды и вывод

| Что | Где | Результат |
|---|---|---|
| `yarn turbo run typecheck --filter=@membrana/background-cabinet --filter=@membrana/background-office --continue` | локально, ветка `angelina/work/2026-08-10-s-queue` @ `e387e2ba` (от `origin/main @ 273f936d`), 10.08 | cabinet: **pass**; office: **exit 2** |
| workflow `CI` (`yarn turbo run lint typecheck test build`) | GitHub Actions, `main @ 273f936d`, 09.08 18:05 UTC | **success** (оба пакета в скоупе turbo) |

Хвост локального красного office (все три ошибки — резолюция, не код):

```text
static-registry-runtime.provider.ts(21,12): TS2307 Cannot find module '@membrana/static-registry-service'
static-registry-runtime.provider.ts(23,11): TS2339 'parseStaticRegistryJsonl' does not exist on
  typeof import("C:/Users/user190825/practice/Membrana-grok/packages/core/dist/index", …)
static-registry-runtime.provider.ts(27,63): TS7006 Parameter 'error' implicitly has an 'any' type
```

## Наблюдения

- **cabinet** — зелёный и локально, и в CI. Две независимые машины доказательства.
- **office** — зелёный в CI на `273f936d`; локально красный, и причина видна в самом
  тексте ошибки: TypeScript читает `@membrana/core` из **чужого дерева**
  (`…/Membrana-grok/packages/core/dist/index`). Симлинки `node_modules/@membrana/*`
  стоят с 29.07 и смотрят в Membrana-grok, где нет ни контракта static-registry
  (влит в наш core вчера, `9baa7f61` #1828), ни пакета `@membrana/static-registry-service`
  (в node_modules отсутствует вовсе). Класс #1647 — тот же корень, что у «красных CI»
  детекторов ([прецедент 10.08](../precedents/2026-08-10-detectors-red-ci-verdict-foreign-tree.md)).
- Карточка `core-static-registry-contract-1828` не нужна (вопрос держателя блока):
  контракт УЖЕ в нашем core — `packages/core/src/contracts/static-registry/`.

## Границы утверждения

Вердикт office **не** утверждает локальной воспроизводимости зелёного: до починки
резолюции локальный прогон office будет красным на любом HEAD. Это дефект среды,
не кода; вынесен карточкой.

## Вердикт

| Объект | Вердикт | Формула доказательства |
|---|---|---|
| `@membrana/background-cabinet` | **долг закрыт** | локальный прогон 10.08 pass + CI `273f936d` success |
| `@membrana/background-office` | **долг закрыт условно по CI-наблюдению** | CI `273f936d` success; локальный красный — открытый дефект среды (класс #1647), карточка `fix-node-modules-links-1647` |

## Отложенное

Починка резолюции — карточка `fix-node-modules-links-1647` в реестре
(промпт: [`../prompts/FIX_NODE_MODULES_LINKS_1647_PROMPT.md`](../prompts/FIX_NODE_MODULES_LINKS_1647_PROMPT.md)).
Условие tarasov из шота №1 сегодня («после мерджа — сразу заводи задачу») выполнено этой карточкой.
