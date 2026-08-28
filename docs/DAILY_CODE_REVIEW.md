<!-- Сгенерировано: 2026-08-28T18:38:15.062Z (yarn code-review; daily, llm-xai) -->

> Контур ревью (rt-8):
> Режим: работа дня
> Precision: exact
> Период: 6ad1085f0a40e8142c4a4d63ea527bbe5858abe5^..560360574835bba62d94220d9ed0a6b594299107 (11 коммит(ов))
> ⚠ Oversized (>400 строк, дифф не развёрнут — ревьюить отдельно): 6ad1085f #2221 (707), 7e74e10e #2204 (531), 56036057 (609)

---

Tier: T2

**[vesnin]:** пропуск с оговорками (не блок дня). Дифф дня — гигиена деплоя/образов и fail-closed полевого rate, не закрытие продуктового DoD #2204 п.3; бестиарий B1–B10 в развёрнутых кусках не всплыл. B6 лечится зубом `verify:image-workspace-deps` (стадия build + focus); B3 риск остаётся вне диффа: «кнопки/GC/образ зелёный» ≠ стоп по remaining. Oversized без разворота: `6ad1085f` #2221 (707), хвост #2204/`7e74e10e` (531), `56036057` (609) — отдельно, не в зачёт вечера.

[Teamlead]: День 28.08 — ритуальные доки (#2222), fail-closed `FIELD_NODE_RATE=48k` (#2216), честный live-session guard с именами env и запасной дверью (#2217), цепочка образа cabinet-web: COPY+focus+build `plugin-contracts` + зуб на `apps/*` (#2223–#2225), снимок сети фактом (#2227). Магистраль owner #2204 (green media + стоп remaining) **не доказана** развёрнутым диффом: ушли build/CI-гигиена под тем же номером issue, не предикат стопа. PR size: несколько merge OK; три oversized без тела — P1 «ревью отдельно», не nit. Утро: читать этот файл + `MAIN_DAY_ISSUE`; не синтезировать L из top-3, пока нет green media и п.3/gap в #2204. Команды: `yarn turbo run test --filter=@membrana/media-library-service --filter=@membrana/background-media`; `yarn test:scripts` (или точечно preflight/image-deps); `yarn verify:image-workspace-deps`; при касании кабинета — сборка образа/CI step «Образы — транзитивный граф».

[Архитектор]: Контракт preflight стал явным: URL/token/legacy door — именованные списки, probe возвращает `urlSource`/`credentialSource`/`note`, отказ fail-closed не маскируется подсказкой (#2199). Зуб образов признал класс, не случай: `cabinet-web` + `stage: 'build'` vs runtime — верная граница; второй список `yarn workspaces focus` судится отдельно от COPY. Поле 48 kHz — узкий инвариант Firebat, без расползания в audio-engine. Риск архитектуры дня: issue #2204 как «зонтик» для Dockerfile/tsconfig без носителя buffer-stop в `packages/` — не плодить второе ядро «по пути».

[Структурщик]: Границы соблюдены: логика в `scripts/_deploy-preflight.mjs` / `verify-image-workspace-deps.mjs`, cabinet только paths+Dockerfile. C1: циклов нет; C4/C3/C2 N/A. Тесты рядом с предикатами (parseEnv 44.1k, defaultLiveSessionProbe, buildStagePackageDirs, focus missing, coverage всех Dockerfile). C7: явный CI step `yarn verify:image-workspace-deps` — хорошо против «одна строка в 4k». C8/C9: секреты в `.env.example` как имена, не значения; токены только из env. Слабое место: рукописные COPY+focus в Dockerfile снова разъедутся — зуб обязателен в CI (уже добавлен).

[Математик]: `FIELD_NODE_RATE !== DEFAULTS.rate` — жёсткий equality, не «около 48000»; тест на 44100. `liveSessionProblem` / age probe без смены численной семантики maxAge. NaN/empty: `Number.isFinite` на poll/rate сохранены. Стоп-предикат remaining/порог буфера в диффе **отсутствует** — correctness DoD #2204 п.3 не закрыт кодом дня.

[Музыкант]: Канон захвата 48 kHz fail-closed на field-poller согласован с продуктовым контуром Firebat; Web Audio path не трогали (C2 —). Сборка `plugin-contracts` в cabinet-web — обвязка контрактов плагинов, не DSP. Квота буфера/дежурство: без воспроизводимого stop+signal сценарный record path по-прежнему может писать в квоту — ops-риск, не клиппинг audio graph.

[Верстальщик]: UI/DESIGN.md в развёрнутом диффе нет (—). tsconfig path `@membrana/plugin-contracts` — инфраструктура резолва, не презентация. Не принимать будущий GC UI за a11y/DoD без контракта стопа.

Итоговый артефакт: `docs/DAILY_CODE_REVIEW.md` (вечер 28.08) — сводка merge #2216/#2217/#2221–#2225/#2227 + долг #2204 DoD п.3 / media RED / oversized-без-diff.

Definition of Done (утро):
1. `yarn turbo run test --filter=@membrana/media-library-service --filter=@membrana/background-media` → green или fail-log в #2204  
2. Стоп по remaining+сигнал **или** gap-таблица п.3 в #2204 (не UI-only)  
3. `yarn verify:image-workspace-deps` + не краснеть step CI «Образы…»  
4. При необходимости: `node --test scripts/_deploy-preflight.test.mjs scripts/firebat-poller.test.mjs scripts/verify-image-workspace-deps.test.mjs`  
5. Smoke частичной разгрузки ≠ wipe-all; вещдоки перед GC «ранние»  
6. Oversized #2221 / 531 / 609 — очередь ревью, не блок merge уже влитого без отдельного прохода

Риски:
- **P0:** RED `@membrana/media-library-service` / `@membrana/background-media` и отсутствие фальсифицируемого стопа remaining (#2204) на день дежурства/квоты  
- **P1:** три oversized без развёрнутого diff; #2199 ещё OPEN в таблице живых состояний при уже влитом #2217 — сверить `gh pr view`, не верить только прозе  
- **P1:** подмена закрытия #2204 починкой образа cabinet (B3)  
- **P2:** рукописный drift COPY↔focus снова; dual-list лечится зубом, не памятью