<!-- Сгенерировано: 2026-11-20T14:32:53.262Z (yarn code-review; daily, llm-xai) -->

> Контур ревью (rt-8):
> Режим: работа дня
> Precision: exact
> Период: cec5096a41b104442247b55e296729b5eb4cabfc^..242aef3d4deb5665fb7491dfe5ba440a45e558ae (16 коммит(ов))
> ⚠ Oversized (>400 строк, дифф не развёрнут — ревьюить отдельно): 0b987186 #2696 (407), 242aef3d (567)

---

Tier: T2

[Teamlead / vesnin]: День закрывает шов g5b и g6a эпика #2632 по канону ADR-0032: media владеет журналом и пишет, office — метроном и чтение через дверь, панель — только GET. Верно пофикшено #2690/#2694: пульс считает только `trigger=cron`, иначе превью панели маскировало бы мёртвый cron (анти-B6). Oversized вне развёртки: `0b987186` #2696 (~407) и `242aef3d` (~567) — утром отдельный проход, не «зелёные по умолчанию». Живые состояния: #2632/#2588 OPEN; g7 (приёмка september + live словом владельца) и D1 (замок при репликах) — не в стволе как закрытые. Вердикт дня: **пропуск в main по влитому** при зелёном CI на затронутых пакетах; **не** LGTM на боевой `DRY_RUN=false`. Утро: прочитать этот файл; не `yarn code-review`.

[Архитектор]: ADR-0032 фиксирует уже ратифицированную границу, не плодит новый контракт core; ссылка из ADR-0031 — одна строка, жизненный цикл границы отделён. Открытые долги D1–D6 названы с местом закрытия — хорошо. Шов trigger/snapshot (g5b-stitch3) закрывает Н20; `orphan_blob` и manual-live остаются словами, не молчаливой реализацией.

[Структурщик]: Границы пакетов соблюдены: journal store/runner только media; office client не пишет в БД media; panel `coldArchiveApi` — read-only, без POST delete. `ColdArchivePulseController` под `@OwnerAdmin` + `PanelAuthGuard`; media purge — `ApiTokenGuard`. Зубы на 0 вызовов media при disabled, на invalid_trigger/snapshot, на «нет путей в JSON» — на месте. C1/C4/C7/C9: циклов не видно; React в office/media нет; секреты в заголовке, не в логе.

[Математик]: `pulseOf`: порог **строго >** 2 ч, ровно 2 ч = ok; `null` lastSucceeded → stale; disabled игнорирует журнал. `isoOrNull` кривую форму → unreachable, не «ни разу». Correctness edge paths покрыты unit-зубами; NaN дат не проглатывается.

[Музыкант]: Web Audio / audio-engine / DSP-путь не затронуты (C2 —). Уборка cold-archive вне runtime-захвата — ок.

[Верстальщик]: g6a — клиент и типы без UI-кнопок удаления; человеческие фразы ошибок без имён env. g6b–g6d (экран журнала) в этом срезе не закрыты — не выдавать «панель готова». a11y экрана — follow-up при вёрстке списка прогонов.

Итоговый артефакт: `docs/DAILY_CODE_REVIEW.md` (вечер 2026-11-20, контур #2632 / ADR-0032 / g5b+g6a)

Definition of Done (утро):
```bash
yarn turbo run lint typecheck test --filter=@membrana/background-media --filter=@membrana/background-office --filter=@membrana/panel
# точечно, если есть скрипты пакетов:
yarn turbo run test --filter=@membrana/background-office -- cold-archive
yarn turbo run test --filter=@membrana/background-media -- purge
# oversized отдельно (не сливать вниманием с T0):
# git show 0b987186 --stat; git show 242aef3d --stat
```

Риски:
- **P1** — oversized #2696 / `242aef3d` без развёрнутого diff в вечернем прогоне → утренний human/diff pass
- **P1** — D1: вторая реплика media + live = ложный abandoned / параллельные proгоны; live только при одной реплике
- **P1** — g7 не принят: **BLOCK** на `COLD_ARCHIVE_SWEEP_DRY_RUN=false` до CLOSURE/verify на september
- **P2** — g6 UI, orphan_blob, manual trigger rights, панель «прогонов не было ≠ всё чисто» ещё в плане