# Архив подсознания персон — словарь лемм

> Дом второго контура памяти (заседание memory-subconscious, C1, ратифицирован
> 28.07.2026; сшивка — docs/meeting/memory-subconscious/MEETING_VERDICT.md).
> Схема и операции: `scripts/persona-memory/lib/`. **Руками файлы .jsonl не править:
> лента append-only, историю не переписывают.**

- **Архив (A, подсознание)** — `archive/<personaId>.jsonl`: полная адресуемая лента
  записей персоны; источник истины. Ничто не умирает: оператора erase не существует.
- **Проекция (O, оперативная)** — `../<personaId>.md`: «сделанный стек» под бюджетом,
  пересобирается из архива политикой C2; view, не хранилище.
- **ArchiveRecord** — единица ленты: `id · personaId · ts · provenance · source ·
  kind (verbatim|summary) · text [· fullRef · importanceSnapshot]`.
- **verbatim** — дословная запись; **summary** — конспект, обязан нести `fullRef`
  на полный текст (конспект без указателя не существует).
- **transfer** — единственный путь выбытия из O: событие перетока в A (причина —
  в op-log, не в записи архива: межа сшивки №2).
- **importanceSnapshot** — снимок человек-флага importance.json на момент перетока;
  история не мутирует задним числом.
- **provenance миграции**: `migration-snapshot` (day-zero перенос текущих журналов) ·
  `git-restore` (восстановление окна потерь из истории, с sha коммита).

Соседние дома контура: `op-log/<persona>/<date>.jsonl` (глаголы C5),
`metrics/<date>.json`, `signals/<date>.json`. Всплытие (облако/акт) — C3;
циклы вечера/утра — C4; провод extractor — C6 (фазы P0–P6).
