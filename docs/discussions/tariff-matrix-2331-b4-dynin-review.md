# Обсуждение: tariff-matrix-2331-b4-dynin-review

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-09-08 12:02 UTC · dynin

**Контекст:** GitHub Issue #2331: «Матрица тарифов как единственный источник правды: гранулы по ресурсу + шаблон в контейнере strategic-docs, сетка — производная (сессия Б, спринт)»
**Вопрос:** Ревью по заявке о готовности блока b4 reseed-grid спринта tariff-matrix-2331 (ты — ответственный контекст; вердикт бинарный: pass | fail с причиной). Проверь по коммиту e120b703 в ветке feat/tariff-matrix-2331: scripts/lib/tariff-matrix/reseed.mjs (projectGrid: реестр в порядке pins, rows по rank, cells в порядке реестра, //provisional из паспортов, matrix-only пропускается, дат в теле нет, serializeGrid детерминирован), scripts/tariff-reseed.mjs (yarn tariff:reseed [--dry-run|--check]; коды 0/1/2; loader сверяет pin с версией гранулы), scripts/tariff-grid-validate.mjs (порядок: форма + шапка скаляров → G↔R красный release_drift → S↔R печать seedEpochDriftReport, на код не влияет), scripts/lib/tariff-grid-check.mjs (releaseCrossFindings, scalarsHeaderFindings, seedEpochDriftReport; scalarsCrossFindings не тронута — её красит docs:product:tariffs:check), docs/tariffs/tariff-scalars.json (только шапка: seed-epoch, //supersededBy), провода package.json и workshop.catalog.json. Зубы: 47/47 (reseed 16, CLI-цикл 8, grid-check 23): порчи — правка сетки руками → красный с путём; регенерация → зелёный; шапка скаляров без supersede → красный; drift S↔R не красит; релиза нет → exit 2. Твои предикаты из прогона: red ⇔ G ≠ proj(R) ∨ ¬form(G); один носитель proj(R) в ядре; provisional ⇔ ratifiedAt null; порядок форма → G↔R → S↔R. Скажи: (1) выполнены ли предикаты, (2) где второй источник правды или недетерминизм мог остаться, (3) вердикт.

**Ответ:**

Предикаты выполнены. Прошёл по коммиту e120b703: `projectGrid` строит реестр по pins и rows, `serializeGrid` даёт канонический порядок, `//provisional` выводится из паспорта, `matrix-only` не попадает в выдачу. CLI-цикл и `grid-check` ведут себя согласованно: порча руками — красный с путём, регенерация — зелёный, отсутствие релиза — код 2. Один носитель `proj(R)` в ядре соблюдён, дублирующей реализации сравнения нет.

Второй источник правды не вижу в коде. Единственная оговорка — `scalarsCrossFindings` не тронута, её красит `docs:product:tariffs:check`. Это не дубль, а отдельный контур, но пока он жив, формально у скаляров два хозяина. Недетерминизма в теле релиза нет, даты только в шапке и `release.json`.

Вердикт: **pass**. К пункту (2) — вопрос на уточнение, не блокер: когда `scalarsCrossFindings` переедет под `tariff:reseed`, чтобы не плодить сущности?

---
