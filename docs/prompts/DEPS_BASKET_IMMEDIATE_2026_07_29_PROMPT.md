# Промпт: корзина deps «СРАЗУ» — 1 critical + 22 high (дозор 29.07)

> Task-промпт. Размер: **S**. Основание: вердикт M1 заседания `security-posture`
> (ратифицирован 19.07), регламент [`DEPS_WATCH_REGULATION.md`](../security/DEPS_WATCH_REGULATION.md):
> «Dependabot alert → задача реестра, владелец — Teamlead»; порог «рантайм-прод ×
> critical|high → задача **сразу**».
> Реестр: `id` = `deps-basket-immediate-2026-07-29`.

## Контекст

Утренний дозор 29.07 (`yarn deps:watch --mode morning`, снимок
[`deps-watch-snapshot.json`](../security/deps-watch-snapshot.json)) дал **69 находок**:
1 critical · 22 high · 41 moderate · 5 low. Порог регламента перейдён — корзина
«СРАЗУ» не разобрана и висит без ответственного (строка №4 хендоффа 29.07).

**Critical (рантайм-прод):** `tar` — *node-tar: Decompression/parse DoS via unlimited
input* ([GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw)).
Распаковка архивов — живой путь: деплой office (`_ssh-office-prod-up.mjs` шлёт tgz),
archivarius-ingest, сборки electron.

**High, рантайм-прод (13 находок, 10 пакетов):** `@fastify/static`, `adm-zip`,
`axios`, `find-my-way`, `js-yaml`, `lodash`, `music-metadata`, `path-to-regexp`,
`sharp`, `tar`.

**High, dev-тулинг (планово, не «сразу»):** `app-builder-lib`, `brace-expansion`,
`builder-util-runtime`, `minimatch`, `postcss`.

## Что сделать

1. **Critical `tar` — первым**: поднять версию до пропатченной, прогнать пути
   распаковки (деплой office, ingest архивариуса, сборка studio) — смоук, не вера.
2. **Рантайм-high пакетно**: обновить 10 пакетов, разложив по рабочим поверхностям
   (office-стек · media/cabinet · studio); каждый апгрейд — отдельным коммитом с
   прогоном соответствующих зубов.
3. **Dev-high — НЕ в этой задаче**: вход в апгрейд-спринт по регламенту (планово).
   Явно записать это в заметках карточки, чтобы «планово» не превратилось в «никогда».
4. **Проверка результата** — `yarn deps:watch --mode morning`: corzina «СРАЗУ» пуста
   либо каждый оставшийся пункт назван с причиной (нет патча / ломает контракт).
5. Не тащить в задачу moderate/low — накопительно по регламенту.

## Границы

- Не трогать office-код и прод-деплой в рамках апгрейда без отдельного слова владельца
  (выкатка office — owner-gated, ранбук `membrana-office-vds-deploy`).
- Не включать Dependabot auto-PR — их судьба за M2 (вердикт M1).
- Не переписывать регламент: задача исполняет порог, а не меняет его.

## DoD

- `tar` обновлён, пути распаковки прогнаны смоуком;
- 10 рантайм-пакетов high обновлены либо каждый отказ назван причиной;
- dev-high вынесены в апгрейд-спринт явной строкой;
- повторный `yarn deps:watch --mode morning` показывает пустую корзину «СРАЗУ»
  или honest-список с причинами;
- карточка закрыта `yarn task:archive` со свидетельством (SHA/PR).
