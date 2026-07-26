# Прецедент 2026-07-21: холодная сессия воспроизвела старый сценарий утра — спринт потерян из поля зрения

<!-- precedent-meta
{
  "id": "2026-07-21-ritual-old-scenario-lost-sprint",
  "date": "2026-07-21",
  "class": "cold-start",
  "symptom": "на «Доброе утро!» холодная сессия на боковой ветке пошла устаревшим membrana-developer-rhythm, не увидев новый контур angelina-hostess в main",
  "rootCause": "приветствие=команда + скилл-рецидив (developer-rhythm) + память не гейт + боковая ветка без эскалации",
  "fix": "membrana-morning-ritual (live), утро вычеркнуто из developer-rhythm; ветка утра=main; читать прецеденты до первого скилла",
  "canonicalCause": "холодная сессия детерминированно идёт по устаревшему скиллу",
  "prevention": "C первым в DAG angelina-hostess; docs:verify-canon; эскалация при грязном дереве/не-main",
  "actionItems": [{"text": "обновить membrana-developer-rhythm и зеркала канона", "owner": "angelina", "status": "done"}],
  "related": [
    "2026-07-21-morning-ritual-live-run-mechanics-pass-value-fail",
    "2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-cold-start-autostart"
  ]
}
-->

<!-- Тип: прецедент-доклад (корень рецидива холодного старта). Повод: заседание angelina-hostess M0 — «корень №4». -->

## Резюме (одной строкой)

**Холодная сессия 21.07 не «сломала утро» — она честно исполнила устаревший сценарий**, пока весь новый контур (спринт angelina-hostess, PR #756/#765/#769) уже жил в **main**. Спринт для сессии «потерян»: агент смотрел на боковую ветку и старый скилл, а не на ратифицированный порядок.

---

## Четыре корня (канон для DAG M0)

1. **«Приветствие = команда на исполнение».** «Доброе утро!» — сигнал присутствия, не поручение. Сессия достроила «запусти ритуал» и пошла без слова владельца.
2. **Скилл-рецидив.** `membrana-developer-rhythm` описывал старую цепочку (morning-care → plan:day → standup → main-day-issue). Новый `membrana-morning-ritual` ещё не стоял первым в пути холодной сессии.
3. **Память — фон, не гейт.** Запись `morning-magistral-owner-gate` и свежие прецеденты были доступны, но **не прочитаны до первого вызова скилла**.
4. **Боковая ветка + грязное дерево без эскалации.** Прогон шёл не с main, где лежал новый контур; вместо STOP — продолжение «как получится».

---

## Следствие для процесса

- Заседание **angelina-hostess** (21.07): кандидат **C (каноны/зеркала)** — корень DAG, потому что закрывает рецидив **немедленно**, до кода и сборки канона.
- Создан **`membrana-morning-ritual` (live)**; утро **вычеркнуто** из `membrana-developer-rhythm`.
- Прецедент 22.07 (`cold-start-autostart`) — **рецидив того же класса** на следующий день, пока зеркала не обновлены.

## Ссылки

- Заседание: `docs/seanses/angelina-hostess-EPIC-2026-07-21.md`, M0-порядок `angelina-hostess-m0-order-2026-07-21.md`
- Боевой прогон того же дня: `2026-07-21-morning-ritual-live-run-mechanics-pass-value-fail.md`
- Рецидив 22.07: `2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-cold-start-autostart.md`
- Скилл-ответ: `.cursor/skills/membrana-morning-ritual/SKILL.md`
