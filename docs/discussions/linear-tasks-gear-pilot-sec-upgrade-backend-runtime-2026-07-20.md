# Пилот LINEAR_TASKS_GEAR × `sec-upgrade-backend-runtime`

> Открыт: 2026-07-20. Статус: **в работе**.  
> Цель файла: фиксировать трение старого регламента и нового движка, пока спринт-процесс не пересажен. Материал для рефакторинга процедур (шторм «подводка», T2).

---

## 0. Исходные документы (прочитаны до кода)

| Документ | Роль |
|---|---|
| [`docs/tasks/LINEAR_TASKS_GEAR.md`](../tasks/LINEAR_TASKS_GEAR.md) | паспорт движка |
| [`docs/tasks/UNITS_DICTIONARY.md`](../tasks/UNITS_DICTIONARY.md) | единицы счёта |
| [`docs/prompts/TASK_PROMPT_WORKFLOW.md`](../prompts/TASK_PROMPT_WORKFLOW.md) | текущий регламент M/L |
| `.cursor/skills/membrana-task-lifecycle/SKILL.md` | playbook старта/закрытия |
| `docs/seanses/security-posture-m2-upgrade-2026-07-19.md` | вердикт DoD задачи1 |
| `docs/storm/storm-engine-onboarding-2026-07-19/THESES.md` | подводка ещё не сделана |

## 1. Импровизированный START (что сделали вместо отсутствующих проводов)

Движок требует: **центральная задача = GitHub-issue** (без Issue — незаконно). Старый регламент: registry → prompt → код; Issue часто `null`.

| Шаг | Старый путь | Пилот на движке |
|---|---|---|
| Удостоверение | `registry.json` + optional Issue | **сначала** GH Issue [#686](https://github.com/officefish/Membrana/issues/686) |
| Движение | статусы в JSON / Linear ad-hoc | Linear **не трогали**: §9 паспорта — RU IP block; боевой pull ждёт egress. В журнале — stub движения |
| Содержание | `promptPath` | MEETING_BRIEF — **не** task-промпт; пишем отдельный `SEC_UPGRADE_BACKEND_RUNTIME_PROMPT.md` |
| Ответственный | `leadPersona: dynin` | оставляем; исполнитель — обезличенный агент (без подписи в коммите как следа) |
| Worktree | часто main dirty | `Membrana-sec-backend` / `feat/sec-upgrade-backend-runtime` от `origin/main` @ `84ff0042` |
| MAIN_DAY | #598 night:research | **конфликт:** пилот сознательно вне магистрали дня — по слову владельца «импровизируй на движке» |

### Stub движения (вместо Linear-карточки)

```
container: (deferred) Linear parent «security-posture upgrades» — egress blocked
central: GH #686 ⟺ registry id sec-upgrade-backend-runtime
delegate: anonymous agent session 2026-07-20
assignee/lead: dynin
state improvisation: Started (локально, не в Linear)
```

## 2. Наблюдения (факты эпизода)

### O1. Карточка незаконна по движку до #686
`githubIssue: null` при `status: active` — прямое нарушение аксиомы §2 паспорта. Старый `task:register` это допускает. **Рефакторинг:** гейт регистрации/старта без Issue → код 21/22 или отказ до кода.

### O2. `promptPath` указывает на MEETING_BRIEF
Это бриф заседания, не «Промпт целиком». Агент вынужден собирать DoD из сеанса M2. **Рефакторинг:** при регистрации L-задачи из вердикта — генерировать task-промпт-скелет автоматически.

### O3. «Оба сервера» в карточке ≠ поверхность уязвимости
Вердикт/карточка: office + media. Факт кода: **office = Express** (`platform-express`); fastify+middie живут в **media + cabinet**. Атом безопасности = Nest 11 везде + fastify 5 на media/cabinet. Без cabinet critical middie не снимается. **Рефакторинг:** в DoD security-задач — явный inventory `yarn why @fastify/middie` до старта.

### O4. Нет команды «старт на движке»
`yarn task:register` / `task:archive` / `trace:gate` есть; нет `task:start` который: создаёт Issue, пишет biject в registry, (опц.) Linear stub, печатает acceptance template. Агент собирает руками. **Кандидат процедуры T2.**

### O5. AGENTS.md всё ещё сеет старую модель
Подтверждает тезис шторма T1/председателя: «register in registry.json» без паспорта. Дикий агент повторит O1.

### O6. Parallel dirty main
Ритуал шёл на `fix/adr-0013-accepted` без #683 → `night:land-reports` invisible. Пилот worktree от `origin/main` — правильно; норма «ритуал только на tip main» должна стать зубом.

### O7. Auto-review / sandbox тёрли worktree+issue в одном вызове
Операционный шум: составные команды «issue+worktree» режутся. Для пилота процесса — отделять удостоверение (сеть) от checkout (git write).

### O8. Конфликт с MAIN_DAY
Владелец явно поручил пилот L-задачи вне магистрали. Старый ритм это запрещает молчаливой нормой; движок про ответственность единицы — не про фокус дня. **Рефакторинг:** явное поле `overridesMainDay: true` + ссылка на Issue владельца, иначе агент не знает, кому верить.

### O9. Owner correction: office → Fastify (идентичный стек)
20.07 владелец уточнил: карточка/вердикт M2 («office+media», Express у office) — **упущение**. Требование теперь: Nest/Fastify стек **идентичен** на office + media + cabinet. Express 5 «как хватит для Nest 11» — **недостаточно**. Атом #686 расширен: миграция `background-office` с `platform-express` на `platform-fastify`. **Рефакторинг:** вердикты dependency-апгрейдов должны фиксировать целевой адаптер явно, не «поднять Nest».

### O10. Nest 11 `platform-fastify` больше не тянет `@fastify/middie`
Факт lockfile/package Nest 11.1.28: зависимости — `fastify` 5.x, `@fastify/cors`, `@fastify/formbody`; **middie отсутствует**. Critical middie снимается не «middie 9», а уходом с Nest 10 platform-fastify (который тянул middie 8.3.3). DoD аудита = «нет `@fastify/middie` в дереве» / нет advisory, а не «middie≥9».

### O11. Junction `node_modules` на sibling worktree ломает мажор-апгрейд
Симлинк/junction на `Membrana/node_modules` дал рассинхрон: package.json уже `express^5`, а `yarn why` резолвил 4.21.2 из чужого дерева. Для dependency-major worktree нужен **свой** install, не bootstrap-junction. **Рефакторинг:** `worktree:bootstrap` — два режима: shared (docs) / isolated (lockfile majors).

### O12. Review→ship: open CORS — ловушка «как у media»
При переносе office на Fastify агент скопировал `@fastify/cors` с `origin: true` + `credentials: true`. У Express-office CORS **не было**; panel cookies сделали бы это P0. Teamlead review (20.07) снял cors до merge. **Рефакторинг:** в шаблоне миграции адаптера — «не наследовать CORS/listen от соседнего сервера без сверки прежнего bootstrap».

### O13. Owner: «тим лид ревью и потом мердж»
Приёмка владельцем = review→ship контур (не отдельный acceptance artifact ещё). После merge остаётся `task:archive` + Linear stub.

## 3. Чеклист исполнения (живой)

- [x] Прочитан паспорт + словарь + TASK_PROMPT_WORKFLOW
- [x] GH Issue #686 (удостоверение)
- [x] Worktree `feat/sec-upgrade-backend-runtime` @ origin/main
- [x] Task-промпт `docs/prompts/SEC_UPGRADE_BACKEND_RUNTIME_PROMPT.md`
- [x] Registry: `githubIssue: 686`, promptPath → новый промпт
- [x] Апгрейд package.json (office/media/cabinet) + lockfile; office → Fastify
- [x] typecheck/test трёх пакетов (office 186, media 39, cabinet 103)
- [x] Audit: `@fastify/middie` отсутствует в дереве (`yarn why` пуст)
- [x] Teamlead review LGTM (CORS P0 снят) → ship по слову владельца
- [ ] PR merge + отчёт в #686
- [ ] Closure artifact `{acceptedBy, headRev}` после merge SHA
- [ ] `yarn task:archive` + Linear stub deferred

## 4. Предложения в рефакторинг процесса (черновик)

1. **Легальный старт:** `yarn task:start --id <slug>` → Issue + registry biject + stub Linear (или честный `movement: deferred-egress`).
2. **Отказ без Issue** в pre-push / task:archive уже частичный — расширить на «active без githubIssue».
3. **Inventory-шаг** для dependency upgrades в task-промпт шаблоне.
4. **Acceptance template** рядом с PR (не в commit message) — файл `docs/tasks/closures/<id>.md`.
5. Переписать посев в AGENTS.md / lifecycle skill → ссылка на LINEAR_TASKS_GEAR §1–4.

## 5. Хронология

| UTC+3 | Событие |
|---|---|
| 07:10+ | Владелец: найти gear, регламент, пилот sec-upgrade на движке + журнал |
| 07:15+ | Прочитаны паспорт, словарь, workflow, M2, registry card |
| — | Issue #686; worktree Membrana-sec-backend |
| ~07:25 | Owner correction: office → Fastify (O9); Nest11 без middie (O10) |
| ~07:45 | office переписан на FastifyAdapter; e2e зелёные; media/cabinet зелёные |
| — | Ждём слово владельца на commit/PR |
