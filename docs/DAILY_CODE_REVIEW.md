<!-- Сгенерировано: 2026-07-16T16:13:22.058Z (yarn code-review; daily) -->

> Контур ревью (rt-8):
> Режим: работа дня
> Precision: exact
> Период: c7b8f4a30664f0b85a18b46c60f30276ec1e04a5^..04a419f22bc71566401c540b1453ab9c441e0064 (29 коммит(ов))
> ⚠ Oversized (>400 строк, дифф не развёрнут — ревьюить отдельно): 32989425 #528 (631), 4e4d1aa9 #531 (854), 537f7230 #535 (401), fdc05d05 #533 (1116), 8abd7f06 #533 (968), ec6e4637 #539 (797), 9c58bcca #539 (467), e4f44c87 #560 (431), e114d197 #561 (442)

---

Tier: T2

[Teamlead]: День масштабный — 29 коммитов, ≥2 пакетов (`apps/panel`, `packages/background-office`, `deploy`, docs/ADR), затронут `background-office` auth → авто-T2, полный формат. Ключевой merge-предмет — `abb2f9cc #541` (GRP1 маршрут-мост): security-граница (`forward_auth` + HMAC + owner-only) сделана по канону ADR-0010, `canAccessSection` — server source of truth, ролей в Caddy нет — инвариант консилиума соблюдён. **9 oversized PR (>400) не развёрнуты** — это P1 «ревьюить отдельно», не блокирую задним числом уже смерженное, но помечаю к утренней сверке. ADR-0009/0010, консилиум и реестр (GRP1-4) синхронны — C10 ок. **Вердикт по дню: LGTM с follow-up** — блокеров P0 нет; проверить контракт-тест гейта и границы импортов панели утром.

[Структурщик]: C1/C4 — граница `apps/panel` ↔ блоки держится: раздел `graphify` — только `<iframe src="/panel/section/graphify/"`, прямого импорта исходников блока нет, комментарий явно фиксирует инвариант — хорошо. C7 — `panel-gate.controller.test.ts` покрывает критичные ветки (owner→204, operator/ally/public→403, подпись), это правильная зона теста для security-границы. Насторожило: `canAccessSection` — `owner`-разделы грантами (вкл. `*` wildcard) не открываются — лестница ролей не размывается, лемма «единственный арбитр — office» соблюдена. **P1:** линт границ импортов (`apps/panel` не тянет `graphify`/`research-tree`) заявлен в DoD GRP1 — убедиться, что он реально в CI, а не только в промпте. 9 oversized PR (особенно `fdc05d05` 1116, `8abd7f06` 968, `4e4d1aa9` 854) — границы пакетов в них не верифицированы этим ревью.

[Математик]: C6/correctness — `canAccessSection`: `if (canAccess(role, minRole)) return true; return minRole !== 'owner' && grantsAllowSection(...)` — предикат монотонный, edge на `owner` закрыт корректно, wildcard `*` не пробивает owner-раздел. `grantsAllowSection` защищён от `undefined` (`Boolean(grants && ...)`) — null-path чист. Тестовый `fakeRes` минимален, но покрывает 204/403; **проверить утром ветку 404** (несуществующий `sectionId`) — в диффе она обрезана, а в DoD ADR-0010 значится (`204/403/404`). Вторичная зона (security): `forward_auth` форвардит cookie в подзапрос, `no-store` на мосту выставлен — деплой-логика без утечки секретов. C9 — секретов в диффе нет; `SECRET = 'gate-test-secret'` только в тесте.

[Музыкант]: — (аудио-путь и Web Audio не затронуты; C2/C3 неприменимы).

[Верстальщик]: C5 — `GraphifyBoard` презентационный, рамка + iframe, `title` на iframe есть (a11y). **P2 (opportunity):** iframe без явного состояния загрузки — консилиум требует `skeleton` + `aria-busy` и cold-load ≤3с, но это по плану GRP3, для owner-preview GRP1 приемлемо. `WIDE_SECTIONS` расширен корректно. Empty-state «грантов ноль» — забота GRP2, здесь не регресс.

Итоговый артефакт: `docs/DAILY_CODE_REVIEW.md` (на завтра утром).

Definition of Done (утро):
1. `yarn turbo run lint typecheck test --filter=@membrana/background-office` — проверить контракт-тест гейта, включая ветку 404.
2. `yarn turbo run lint typecheck build --filter=@membrana/panel` — убедиться, что линт границ импортов (panel ↮ graphify/research-tree) реально в CI.
3. `yarn docs:lint && yarn docs:verify-canon` — ADR-0009/0010 + реестр GRP1-4 sync.
4. Живой смоук моста (Р3 ADR-0010): owner видит граф; не-owner/аноним → 403 — отдать владельцу (human-in-loop).

Риски:
- **P1:** 9 oversized PR (>400) не развёрнуты и не отревьюены этим проходом — `fdc05d05` (1116), `8abd7f06` (968), `4e4d1aa9` (854), `ec6e4637` (797), `32989425` (631) и др. Follow-up: ревьюить отдельно, границы пакетов и тесты не верифицированы.
- **P1:** линт границ импортов панели заявлен в DoD, но в диффе не виден как CI-гейт — подтвердить, иначе инвариант «panel не импортирует блоки» держится только комментарием.
- **P2:** ветка 404 гейта в тесте обрезана в контексте — досмотреть; iframe без skeleton/aria-busy (плановый долг GRP3).
- Утром `yarn code-review` **не** запускать — только читать этот файл.