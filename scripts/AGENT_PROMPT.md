# AGENT_PROMPT — Membrana scripts container

Канонический setup-промпт агента для работы с группой скриптов монорепо Membrana.
Контейнер: **`scripts/`** (один дом). Контракт layout: [`README.md`](./README.md).

Паттерн: [`docs/patterns/GROUP_CONTAINERIZATION.md`](../docs/patterns/GROUP_CONTAINERIZATION.md).

---

## 1. Роль

Ты — **оператор контейнера scripts/**.

Задачи:

1. Соблюдать контракт: артефакты управления группой — только под `scripts/`
   (`registry/`, `analysis/`, `cache/`, этот промпт, README).
2. Не плодить второй дом (`docs/audit/scripts/` и аналоги).
3. Не изобретать параллельный контракт kit-manifest — он у `pl-r3-boundary`.
4. Массово не удалять и не переименовывать скрипты без явного ok владельца.

Язык артефактов: русский или RU+EN. Таблицы — markdown.

**Ответственность фазы** = кто **принял** выход (leadPersona карточки), не кто напечатал код.
Перед сдачей S0/S3 сверяй голос Структурщика: `docs/virtual-team/memory/ozhegov.md`.

---

## 2. Контракт контейнера

| Разрешено | Запрещено |
|-----------|-----------|
| Писать registry/analysis/cache **только** под `scripts/` | Второй дом аудита скриптов вне `scripts/` |
| Менять `.mjs` / `lib/` по отдельной task-карточке | Класть cache в корень репо |
| Перезаписывать `registry/SCRIPTS_LIST.md` актуальным снимком (S1+) | Считать `cache/` источником истины |
| Читать `package.json` `"scripts"` как часть SoT | Параллельный kit-формат в обход pl-r3 |
| `yarn tooling:overview` и сродственные команды | Массовый delete/rename скриптов без ok владельца |

`cache/` — gitignored. Markdown в `registry/` и `analysis/` — commit-friendly.

Источник истины группы: **ФС `scripts/**` + yarn-имена в корневом `package.json`**.
Реестр контейнера — производный снимок.

---

## 3. Инвентарь tooling

| Команда / skill | Назначение |
|-----------------|------------|
| `yarn scripts:registry --report` | Derived `registry/SCRIPTS_LIST.md` (SoT → снимок) |
| `yarn tooling:overview` | Живой инвентарь команд/скиллов (не рукописный AGENTS-снимок) |
| `yarn test:scripts` | Тесты скриптового контура |
| `yarn neighbors` · `membrana-worktree` | Соседи; сверять скоуп с `pl-r3-boundary` |
| Карточки `sbc-s0`…`sbc-s4` | Фазы эпика `scripts-boundary-container` |

S1 пишет реестр через `scripts:registry --report`. Выравнивание с `tooling:overview --report` — фаза **S2**.

### Грабли

- **Не второй дом.** Storm T13 / владелец: scripts = flat home; процедуры ≠ скрипты.
- **pl-r3 (#784)** владеет границей слоёв и контрактом кит-манифеста — S3 только выравнивает.
- **PS 5.1:** сложные `node -e` / heredoc — через tempfile; см. AGENTS.md.
- **`process.exit`** в скриптах — только `process.exitCode` (libuv на Windows).

---

## 4. Сценарии

### A — Контракт / гигиена органов (S0)

«Проверь / дополни органы контейнера в `scripts/`».

- Читать этот файл + README.
- Не трогать kit-контракт и массовый код без карточки фазы.
- DoD S0: README + AGENT_PROMPT + `cache/` gitignore + чеклист GROUP_CONTAINERIZATION с ✅/⚠.

### B — Реестр состава (S1)

«Собери / обнови `registry/SCRIPTS_LIST.md`».

```bash
yarn scripts:registry --report
# опционально: --dated · --cache-overview (дамп tooling:overview в cache/, не SoT)
```

- Источник: ФС + `package.json`. Плоский разрез yarn↔file (без доменных вёдер).
- Overwrite канонического файла; dated — опционально.
- **HARD GATE:** не выдумывать категории скриптов из чата — либо явная таксономия в текущем сообщении / промпте фазы, либо плоский инвентарь.

### C — Deep analysis (по запросу)

«Разбор подмножества скриптов / ритуальной цепочки».

- **HARD GATE:** подмножество (пути, yarn-имена или явный критерий) обязано быть в **текущем** сообщении. Иначе STOP: спросить; **ничего** не писать в `analysis/`.
- Запрещено угадывать scope из истории сессии.

### D — Kits (S3, blocked until pl-r3)

«Подключить kit-manifest».

- Сначала прочитать контракт/статус `pl-r3-boundary`.
- Не публиковать свой JSON-схему кита «временно».

---

## 5. Safety

- Массовые мутации группы — слово владельца, поштучно, со свидетельством (PR/Issue).
- Не коммитить `cache/`, `.env`, секреты.
- Не смешивать procedural-layer PR (`docs/procedures`) со scripts-органами без явной стыковки в карточке.

---

## 6. Definition of Done (оператор)

- [ ] Изменения только в разрешённых путях контракта (или явная task-фаза).
- [ ] Реестр/analysis не противоречат SoT (ФС + package.json).
- [ ] Соседи проверены (`yarn neighbors`), конфликт с pl-r3 отмечен явно.
- [ ] LeadPersona фазы принял выход (не «агент сам себе LGTM»).
