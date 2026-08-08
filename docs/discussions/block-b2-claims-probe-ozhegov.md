# Обсуждение: block-b2-claims-probe-ozhegov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-08 12:06 UTC · ozhegov

**Контекст:** docs/prompts/FEEDBACK_CLAIMS_CODE_PROBE_PROMPT.md
**Вопрос:** Ты исполнитель блока b2-claims-probe. Ядро b1 готово: scripts/lib/feedback-claims/atoms.mjs (claimLines, classifyToken, extractAtoms, dedupeAtoms; классы symbol/path/doc/card/verb/pr/opaque, токен несёт МНОЖЕСТВО классов) и verdict.mjs (verdictFor(atom, evidence) → holds | violates.hard | violates.soft | unknown; факты приходят готовым объектом ClaimEvidence с полями symbolDecls, pathExists, docExists, cardFound, cardStatus, cardDeliveredPr, verbExists, prMerged, prFiles). Твой блок — обвязка scripts/feedback-claims-probe.mjs: собрать факты ПО АДРЕСУ КЛАССА и напечатать отчёт. Ответь решениями: (1) точный адрес для каждого класса — какая команда/файл, и где граница охвата (например для symbol: почему только src и почему не доки); (2) как узнать, что работа карточки доставлена, оффлайн — чтобы получить cardDeliveredPr для находки «реестр протух»; (3) как отличить «git недоступен» от «не найдено» в каждом сборщике, чтобы null не превратился в false; (4) какой протокол брать по умолчанию, если --protocol не задан; (5) exit-коды. Коротко.

**Ответ:**

[память:подсознание] emerge ozhegov-2026-07-18-evening-auditor-doc2-report-generator — там я уже разводил омонимию «вечернего аудитора» на три леммы и настаивал на probe с exit-кодами по инвариантам; b2 — прямое продолжение той линии для вечера.
[память:подсознание] emerge ozhegov-2026-08-03-one-shot-manifest-m4-homogeneity — оттуда правило «работать с тем, что существует в коде прямо сейчас», против кандидатов-фантомов; здесь оно диктует адрес каждого класса.

Решения по b2:

1) Адреса сборки фактов (граница = где утверждение осмысленно):
- `symbol` → `git grep -nE "\\b<tok>\\b" -- 'packages/**/src/**' 'apps/**/src/**'`. Только `src`: утверждение о существовании кода; доки — это метатекст, ложные хиты (`PromoDeclineReason` в примере промпта был бы найден в самом протоколе). `symbolDecls=[]` → hard.
- `path` → `git ls-files -- <tok>` (нормализовать ведущий `./`, срезать якорь `#...`). Вне репо → `unknown`.
- `doc` → тот же `git ls-files`, но ограничение `docs/**` и `*.md`.
- `card` → чтение `docs/tasks/registry.json` (SoT реестра): `cardFound`, `cardStatus`, `cardDeliveredPr` из полей карточки.
- `verb` → `node -e "require('./package.json').scripts['<tok>']"` + грепом по `scripts/**/*.mjs` для CLI-имён; граница — только корневой `package.json` и `scripts/`.
- `pr` → оффлайн: `git log --all --grep="#<N>" --format=%H` + `git show --name-only <sha>`; для мерджа — `git log --merges --grep="#<N>"`. Сеть/`gh` — вне v1 (в промпте прямо: онлайн-класс не берём).
- `opaque` → сразу `unknown`.

2) `cardDeliveredPr` оффлайн: из `registry.json` карточки берём `deliveredPr` (или `pr`), затем сверяем `git log --merges --grep="#<N>"`. Находка «реестр протух» = `cardStatus==='active' && prMerged===true`. Если поля нет — `cardDeliveredPr=null`, вердикт `unknown`, не hard.

3) Отличие «git недоступен» от «не найдено»: каждый сборщик возвращает `{ ok: boolean, value, reason }`. `ok=false` только при ненулевом exit ≠1 у `git` или отсутствии бинарника (проверять `spawnSync('git',['--version'])` один раз на старте); exit=1 у `git grep`/`log` — это легитимный «пусто», `ok=true, value=[]`. В `ClaimEvidence` поле пишется `null` только при `ok=false`; `verdictFor` трактует `null` как `unknown`. Никаких `catch → false`.

4) Протокол по умолчанию: последний файл `docs/seanses/team-evening-feedback-*.md` по mtime, но требовать, чтобы дата в имени ≤ сегодня; если пусто — exit=2 с сообщением «нет протокола». Флаг `--protocol <path>` перекрывает.

5) Exit-коды (эталон `main-day-probe`, гейт не чинит):
- `0` — все `holds` или только `soft`/`unknown`;
- `1` — хотя бы один `violates.hard`;
- `2` — сам probe не смог работать (нет протокола, нет git, битый `registry.json`) — это не вердикт о коде, это отказ инструмента;
- `3` — зарезервировать для «отчёт напечатан, но ласточка должна встать» (если обвязка `evening:gate` захочет отличать hard-нарушение от собственной поломки).

Риск связанности: `feedback-claims-probe.mjs` не должен импортировать ничего из `apps/*` или сервисов — только `scripts/lib/feedback-claims/*` и node stdlib; `registry.json` читать как данные, не через пакет.

---
