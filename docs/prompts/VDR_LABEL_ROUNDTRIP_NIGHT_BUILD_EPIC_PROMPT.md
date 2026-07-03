# Night Build: VDR label round-trip — разметка пилота через клиентскую библиотеку

| Поле | Значение |
|------|----------|
| **Epic id** | `vdr-label-roundtrip-night-build` |
| **sprintKind** | `night-build` |
| **Дата** | ночь 2026-07-03 → 2026-07-04 |
| **Ветка** | `night/vdr-label-roundtrip-night-build-2026-07-03` (base `techies68` = main после DR5-синка) |
| **Родитель** | эпик `vdr-hard-gate` (GH #47) · память `labeling-via-client-library` |
| **Контекст** | Оператор размечает датасеты в клиентской «Библиотеке сэмплов» (SampleLibraryModule), а истина hard-gate живёт в `data/detectors-benchmark/vdr-hard-gate-pilot/manifest.json`. Недостающее звено — round-trip меток, чтобы к приходу оборудования (~2026-07-17) оператор сел и просто размечал. |

---

## Night Build — промпт целиком

Сделать путь «разметил в библиотеке → метки в манифесте пилота» полностью рабочим, не трогая кабинет и форматы v0.2.

### In scope (заморожено)

| Фаза | Что | Файлы | Lead / Support |
|------|-----|-------|----------------|
| **NB0 Gate** | Baseline scoped CI (client + scripts), фиксация модели хранения библиотеки (media-library-service) и полей манифеста пилота в чекпоинте. Кода нет. | — | Vesnin / Ozhegov |
| **NB1 Экспорт меток (UI)** | Кнопка «Экспорт меток (JSON)» у коллекции в `SampleLibraryModule` (видна при `canLabelAnnotate`): выгружает `{collection, exportedAt, labels: [{fileName, label, notes}]}` для всех сэмплов коллекции. Скачивание файла — по паттерну существующего onExport WAV. | `apps/client/src/modules/SampleLibraryModule.tsx`, при необходимости мелкий helper в `components/sample-library/` | Ozhegov / Rodchenko |
| **NB2 Merge-скрипт** | `yarn vdr:labels-merge -- --labels <export.json> --manifest <pilot/manifest.json>`: матч по имени файла (без расширения, как `sampleIdFromFileName`), перенос `label`/`notes` в манифест; отчёт applied / unmatched / conflicts; `--dry-run`; режим `--labels-only <out.json>` — не трогает манифест, а пишет плоский файл меток для `validate:vdr --labels-a/--labels-b` (intra-rater, второй прогон). Unit-тесты, регистрация в `test:scripts`. | `scripts/vdr-labels-merge.mjs`, `scripts/vdr-labels-merge.test.mjs`, `package.json` | Dynin / Ozhegov |
| **NB3 Фильтр разметки (UI)** | В таблице клиентской библиотеки: фильтр по метке (все / drone / not-drone / unlabeled, toggle-группа с `aria-pressed`) + счётчик прогресса «размечено N из M» (`aria-live`) — порт HG1-UX из кабинетной таблицы. Клиентская пагинация не ломается (фильтр по текущим строкам). | `apps/client/src/modules/SampleLibraryModule.tsx` | Rodchenko / Dynin |
| **NB4 Docs** | `DATASET_CURATION.md` §Пилот hard-gate: путь разметки = клиентская библиотека (импорт 33 WAV через UI → метки → экспорт JSON → `vdr:labels-merge`), intra-rater через `--labels-only` + `validate:vdr`. | `docs/DATASET_CURATION.md` | Vesnin / Dynin |

### Out of scope (не трогать ночью)

- Кабинет (`apps/cabinet`) и его таблицы; плагин «VDR-валидация»; `packages/core` / `agenda` / `MembranaRegistry`.
- Форматы `data/detectors-benchmark/v0.2` и real-collection; автоимпорт WAV в библиотеку (импорт 33 файлов — ручной drag-drop через существующий UI).
- Prod-deploy, SSH, `task:close-github`, новые Issue.

### Stop rules

- 2 падения scoped CI подряд → checkpoint `fail`, стоп фазы, блокер в HANDOFF.
- Неожиданное расхождение модели хранения (NB0) с планом NB1/NB2 → зафиксировать в чекпоинте, NB1+ не начинать, handoff с предложением.

### Чекпоинты

После каждой фазы:

```bash
yarn turbo run lint typecheck test --continue --filter=@membrana/client
yarn test:scripts
git add -A && git commit -m "night(vdr-label-roundtrip-night-build): NB<n> <кратко>" && git push origin HEAD
yarn night:checkpoint --phase NB<n> --status pass|fail
```

### DoD ночи

- [ ] NB0–NB4 done или explicitly deferred в HANDOFF;
- [ ] scoped CI зелёный (client 21/21, `test:scripts` без падений);
- [ ] PR `night(vdr-label-roundtrip): …` открыт на main, **не смержен** (утренний LGTM);
- [ ] `HANDOFF.md` в `docs/archive/night-build/<дата>/`; `NIGHT_BUILD_ACTIVE` closed;
- [ ] Утром: LGTM → merge → `task:archive` NB-задач; операторская инструкция готова к ~2026-07-17.
