# Архив: Turbo build green: client + cabinet typecheck/build parity

| Поле | Значение |
|------|----------|
| **ID** | `turbo-build-green-apps` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-06-17 |
| **Архивирована** | 2026-06-17 |
| **GitHub Issue** | #86 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/TURBO_BUILD_GREEN_APPS_EPIC_PROMPT.md`](../../docs/prompts/TURBO_BUILD_GREEN_APPS_EPIC_PROMPT.md) |

## Заметки при закрытии

https://github.com/officefish/Membrana/pull/87 Closes #86

## Отчёт о выполнении

**Что сделано.** Эпик F0–F6: честный `typecheck` (`tsc -b`) для `apps/client` и `apps/cabinet`; project references в cabinet; ~35 TS-фиксов в client (journal, FFT plugins, LiveModeConfig, trends builder); prod build alignment (Dockerfile cabinet); CI branch `techies68`. В том же PR — стек DRONE_TIGHT + merge-hardening R1–R5 (squash в main).

**PRs.** [#87](https://github.com/officefish/Membrana/pull/87) merged → `main` @ `351095f`.

**Linear ticket.** —

**Связь со стратегией.** Зелёный turbo gate для apps (#84 follow-up); калибровка DRONE_TIGHT в client/sample-library.

**Реестр.** `yarn task:archive turbo-build-green-apps` + подзадачи `tbga-f0`…`tbga-f6` — выполнено 2026-06-17.

**Известные нюансы / отложено.** Полный CI на `main` может падать на `@membrana/background-cabinet#typecheck` и `@membrana/background-media#typecheck` — вне scope эпика (client/cabinet build/typecheck зелёные).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
