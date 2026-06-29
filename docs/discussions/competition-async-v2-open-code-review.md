<!-- Сгенерировано: 2026-06-25T11:35:13.739Z (yarn code-review; branch) -->

Tier: T2

[Teamlead]: PR size: **oversized** (+1537 lines). Архивирование v1 competition + открытие async-v2 sprint — легитимная смена фокуса, но объём требует разбора по ролям. Структурно: новые скрипты (build, deepseek API), документы brief, CONCEPT draft'ы, каталог и тесты. **Стратегический вердикт:** LGTM при условии зелёного `yarn turbo run lint typecheck test --filter='@membrana/device-board'` и архивирования v1 (проверить `archived-competition-user-case-entries.ts` + тесты). Утром: smoke `yarn usercase:build-competition-async-v2-all && yarn usercase:verify-layout`.

[Структурщик]: ✅ Границы пакетов соблюдены: `/scripts` (build, deepseek API), `/docs/competition-sprint` (briefs, CONCEPT), `/packages/device-board/src/catalog` (archive + bundled entries). Циклов нет. **Риск C1:** `archived-competition-user-case-entries.ts` импортирует `getDefault*Document()` — проверить, что loader-ы не вызываются статически на старте (ленивая загрузка). `bundled-user-case-entries.ts` правильно убрал alpha/beta/gamma из picker. Тест `user-case-catalog.test.ts` обновлен корректно (размер каталога 1 вместо 4). ✅ Слабая связанность соблюдена.

[Математик]: `build-usercase-competition-async-v2-team.mjs` + `_deepseek-env.mjs` — новые операции. **Проверки:** (1) DeepSeek API fallback'ится на ошибку сети или только фейлится? Нет обработки `ECONNREFUSED` → P2 opportunity. (2) `seedTeamBundleFromMvp(team)` корректно копирует MVP manifest'ы и перекрывает `scenarioTitle`, `userCaseId`, metadata. (3) `packMvpUserCaseForTeam(team, document)` — функция не показана в diff, предполагаю, что уже существует в `usercase-competition-pack.js` (должна быть в repo). Если нова — добавить unit-тесты. ✅ JSON манипуляция корректна.

[Музыкант]: `COMPETITION_SPRINT_BRIEF.md` определяет F1–F7 паритет v2.0-async (latent Sequence, StartAsyncJob, trends on gate, detached drone). **Риск C2:** draft CONCEPT'ы (alpha/beta/gamma) упоминают Promise nodes и async topology, но не видны конкретные Sequence и detached branch реализации в diff. Это ожидаемо (Phase 1 draft), но дефолтный MVP document (в diff не показан) уже содержит v2.0-async runtime? Проверить `default-usercase-mvp-microphone.js` что он загружает Sequence + Promise. ⚠ **P1:** убедиться, что при Apply UserCase async-v2 fork'а runtime не затирает audio-engine контракты.

[Верстальщик]: Каталог и picker UI: `bundled-user-case-entries.ts` теперь содержит только 1 entry (MVP); competition v1 forks архивированы в `archived-*-entries.ts`. **DESIGN.md alignment:** нет новых React компонентов в diff, только data. Comment group profiles + packProfile для команд (alpha/beta/gamma) закладывают основу для layout. ✅ Тесты обновлены (expect 1 вместо 4). **Риск:** если UI пикера hard-coded ожидает ≥3 entry, может сломаться. Проверить `device-board/src/ui/catalog-picker.tsx` (или эквивалент).

Итоговый артефакт: `docs/competition-sprint/comp-mvp-async-v2-2026-06-25/COMPETITION_SPRINT_BRIEF.md` + team CONCEPT draft'ы + архив v1 в `/archive/competition-sprint/`.

Definition of Done:
```bash
yarn turbo run lint typecheck test --filter='@membrana/device-board'
yarn usercase:build-competition-async-v2-all
yarn usercase:verify-layout
yarn usercase:verify-competition
```

Риски:
- **P1:** Loader-ы в `archived-*` должны быть ленивыми (проверить, нет ли `import { getDefault*Document }` на уровне exports).
- **P1:** `packMvpUserCaseForTeam` должна существовать; если нова — требуется unit-test.
- **P2:** DeepSeek API error handling (timeout, network).
- **P2:** Picker UI при 1 entry вместо 4 — визуальный smoke test.

Вердикт: **BLOCK** до зелёного линта и проверки загрузчиков ленивыми. После этого → **LGTM**.

---

## Follow-up (2026-06-25, operator)

- `yarn turbo run lint typecheck test --filter=@membrana/device-board` — **PASS** (557 tests, 0 errors).
- `archived-competition-user-case-entries.ts`: `loadDocument` — ссылки на getter, не вызываются на старте; `ARCHIVED_*` не импортируется в active catalog.
- `packMvpUserCaseForTeam` — существует, `usercase-competition-pack.test.ts` PASS.
- `board-usercase-picker-modal.test.ts` — PASS с catalog.size === 1.

**Вердикт (финал): LGTM** — merged to `main`, competition Phase 1 open.