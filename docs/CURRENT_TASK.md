[Teamlead]: Снимок после мер по `CURRENT_TASK` (optional Claude, артефакты TS, ESLint `any`, индекс документов, расхождение lifecycle).

Сделано в репозитории:

- **Optional Claude PR review:** в `.github/workflows/optional-claude-pr-review.yml` убран недопустимый `if` с `secrets.*` на уровне job; job выполняется при **`vars.ENABLE_CLAUDE_PR_REVIEW == 'true'`** (и по-прежнему нужен секрет `ANTHROPIC_API_KEY` для шага с action). Описано в `docs/CONTRIBUTING.md` и в summary `virtual-team-context.yml`.
- **Tracked tsbuildinfo:** `apps/client/.tsbuildinfo.app` и `.tsbuildinfo.node` сняты с индекса (`git rm --cached`), в `.gitignore` добавлен шаблон `**/.tsbuildinfo.*`; в `apps/client` скрипт `clean` удаляет суффиксные кэши.
- **ESLint:** `@typescript-eslint/no-explicit-any` снова **`error`** в `.eslintrc.cjs` (и для `.ts`, и для `.tsx`).
- **MODULE_AND_PLUGIN_UI.md:** добавлен в `docs/README.md`, в чеклист `virtual-team-context.yml`, в шапку и PR-чеклист `CONTRIBUTING.md`; в §4 добавлено примечание, что `store.ts` при toggle плагина пока **не** вызывает `plugin.install()` — целевой контракт vs фактический код.

Действие владельца репозитория на GitHub: при необходимости опционального Claude-review создать variable **`ENABLE_CLAUDE_PR_REVIEW`** = `true` (Settings → Secrets and variables → Actions → Variables).

[Структурщик]: Обязательный CI по-прежнему `ci.yml`; optional workflow теперь валиден и не блокирует разработку при выключенной переменной.

[Математик]: —

[Музыкант]: —

[Верстальщик]: Игнор и `clean` для client tsbuildinfo снижают шум в PR и соответствуют правилу не коммитить артефакты сборки.

Приоритет на будущее (не блокер CI): выровнять lifecycle плагинов в `packages/agenda/src/core/store.ts` с документом или перенести подписки на поток в слой, где `install()` гарантирован.

Definition of Done (неизменно): обязательный CI зелёный на PR/push; реальный deploy только после этого.
