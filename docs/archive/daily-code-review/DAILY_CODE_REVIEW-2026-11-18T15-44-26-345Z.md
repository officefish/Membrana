<!-- Сгенерировано: 2026-11-18T15:44:22.064Z (yarn code-review; daily, llm-xai) -->

> Контур ревью (rt-8):
> Режим: работа дня
> Precision: exact
> Период: 1837b337e71287de19db78c641635bad4bc19c13^..d63a05be19960bfecfcbfc65d97ae19f2d1769c7 (24 коммит(ов))
> ⚠ Oversized (>400 строк, дифф не развёрнут — ревьюить отдельно): 8e4009b9 #2644 (601), ed29cf92 #2665 (813), 71b04ba8 #2668 (586), a2b3715b #2671 (731), 2c13609c #2669 (757), 3a801b96 #2662 (421), 9a363c6d #2615 (494), d63a05be (662)

---

Tier: T2

[Teamlead / Vesnin]: День — магистраль уборщика архива (#2632 g1–g4a) + return-hygiene + typecheck-развязка #2660. Влито много (в т.ч. #2661 busboy, #2666 proof, #2667 retry, #2670 unpushed, #2672 apps typecheck, #2674 read-doors); OPEN: #2632, #2350, #2662, #2587. **8 oversized** без развёрнутого diff (#2644 g1a, #2668 g1b, #2671 g3b, #2669 packages typecheck, #2665 ritual, #2662, #2615, хвост d63a05be) — утром **отдельный** `yarn code-review:pr` на каждый, не «выглядит ок». Бестиарий по раскрытому: B3 не пойман (зубы на исходы/пути/leak); B6/B8 на g4a — адреса не наружу, guard на классе. P1: не сливать g3b/g1b без чтения полного diff. Утро: media после busboy + зубы media + oversized PR.

[Структурщик]: `background-media`: proof (g2) → policy (g3a) → journal/read (g4a) — чистые швы, blob не тянет словарь журнала (литералы сверяют тесты). `delete` сохранён; `removeWithProof` — новый путь. Controller: Prisma + purge service, GET под тем же `ApiTokenGuard`/префиксом. `unpushed-count.mjs` вынесен из `repo-clean` — правильно. Typecheck apps: отдельные `.tsbuildinfo.typecheck.*`, `KNOWN_DEBT` пуст. Риск: g1b/g3b oversized — лизы/транзакции/идемпотентность захвата смотреть в полном diff.

[Математик]: `classifyRemoval` / `decideAfterAttempt` / `backoffMs` / `foldRunCounters` — чистые, границы attempt≥5, backoff монотонен с cap, `already_absent` = успех (идемпотентный повтор). Stat-ошибка ≠ ENOENT → failed (консервативно). NaN/дробный attempt → RangeError. Зубы на таблице исходов и fold∘merge — ок. Oversized g3b: сверить, что live-прогон не судит успех по коду rm.

[Музыкант]: Web Audio / audio-engine не затронуты. Media-контур: удаление blob с proof — к байтам на диске; busboy 3.2.6 — multipart/upload path, после выката media проверить приём файлов. IoT/MCU — нет.

[Верстальщик]: UI/DESIGN.md не в раскрытом diff; g4a — internal API для панели (счётчики, без путей). Когда g4b/UI — a11y и отсутствие «кнопок удаления» в read-only журнале по канону issue.

Итоговый артефакт: `docs/DAILY_CODE_REVIEW.md` (вечер 18.11; ствол ~1837b337..d63a05be, 24 коммита)

Definition of Done (утро):
1. `yarn turbo run lint typecheck test --filter=@membrana/background-media`
2. `node --test scripts/lib/unpushed-count.test.mjs scripts/verify-task-write-targets.test.mjs`
3. `yarn code-review:pr 2671` и `yarn code-review:pr 2668` (и при необходимости 2644, 2669) — закрыть слепые oversized
4. Проверка выката media после #2661 (критерий gate `return-hygiene` 0.1)
5. Статус OPEN: #2632 (остаток g*), #2662, #2350 — не плодить параллельный scope

Риски:
- **P1** — восемь oversized без полного diff (особенно g1b storage + g3b executor): merge в стволе не отменяет утренний pass
- **P1** — #2632 ещё OPEN: read-doors без полного executor/journal write = не закрывать epic по механике отдельных PR (B3)
- **P2** — WEEKLY_PLAN_TOKEN: истёкший PAT не фолбэчится (задокументировано) — мониторинг понедельничного workflow
- **P2** — горизонт `return-hygiene` / phase mid: Docker и «media выкачена» — human checklist, не CI