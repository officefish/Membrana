<!-- канал: secretary (offline, #469 ti-2) — протокол написан в IDE-чате, LLM не вызывался -->
<!-- валидация канона: реплик 20, роли Teamlead:4 Структурщик:4 Математик:4 Музыкант:3 Верстальщик:5 -->
# Консилиум: топология корня membrana.space — /scenarios/docs, лендинг, маркет

| Поле | Значение |
|------|----------|
| Тема | Целевая топология корневого домена membrana.space: docs на /scenarios/docs, /scenarios маркет, лендинг; где root-Caddy |
| Дата | 2026-07-15 |
| Канал | secretary (кредит пуст) |
| Секретарь | Claude Code (не голосует) |
| Координатор | Teamlead (Vesnin) |
| Входы | DNS_DOMAIN_POLICY.md, research docs-hosting (Mintlify subpath), уточнения владельца (office/panel→mmbrn.tech; cabinet.membrana.space) |

## Повестка

Владелец хочет доки по `membrana.space/scenarios/docs`, а `membrana.space/scenarios/`
— будущий community-маркет сценариев. Решаем ТОПОЛОГИЮ корня (механика доков
де-рискована research'ем), не «можно ли доки».

## Заземление

- **Домены (DNS_DOMAIN_POLICY):** `membrana.space` = продукт (cabinet,
  cabinet-api, media, www); `mmbrn.tech` = фон/команда (office, panel). Корень
  `membrana.space/` сейчас **не обслуживается** (только поддомены).
- **Research (2026-07-15):** Mintlify **штатно поддерживает subpath** — reverse-proxy
  Caddy `handle_path /scenarios/docs/* { reverse_proxy <subdomain>.mintlify.site }`
  (set `Origin`, strip `Host`, POST разрешить, docs-пути `no-cache`, base path в
  дашборде Mintlify). **Миграция НЕ нужна.** Условие: доки ПУБЛИЧНЫЕ (subpath
  несовместим с Mintlify-auth). Только Nginx-пример → выверить Caddy.
- **Хост:** `cabinet.membrana.space` уже живёт на cabinet-VPS → root-Caddy
  membrana.space естественно там же.

## Спорные точки

- **СТ-1.** Docs: Mintlify subpath (reverse-proxy) — подтвердить, условие публичности.
- **СТ-2.** Root-сервер membrana.space — где (cabinet-VPS?) и что отдаёт `/`.
- **СТ-3.** `/scenarios` — одно приложение-shell или Caddy-хендлеры путей?
- **СТ-4.** Порядок: docs сейчас (независимо от маркета/лендинга) vs ждать shell.
- **СТ-5.** media-размещение + чистка office.membrana.space.

---

## Протокол

[Teamlead — Vesnin]: Рамка: research снял главный риск — доки на subpath штатны,
миграции нет. Значит консилиум не про «чем хостить», а про топологию корня и
порядок. Владелец хочет доки уже сейчас, маркет — будущее. Держим это как приоритет:
что нужно МИНИМАЛЬНО, чтобы `/scenarios/docs` заработал, не строя маркет.

[Структурщик — Ozhegov]: По СТ-2/СТ-4 — минимальный путь чистый. Корень
`membrana.space` сейчас без Caddy-блока. Нужен один site-блок на cabinet-VPS (там
уже TLS для cabinet.membrana.space, LE отработан). Внутри — `handle_path
/scenarios/docs/* { reverse_proxy <sub>.mintlify.site }` по research-рецепту. Всё.
`/` (лендинг) и `/scenarios/*` (маркет) — отдельные хендлеры ПОЗЖЕ; их отсутствие
не мешает `/scenarios/docs`. Порядок хендлеров: `/scenarios/docs/*` матчится ДО
любого широкого `/scenarios/*`.

[Математик — Dynin]: По СТ-1 — подтверждаю research, но с оговорками безопасности,
которые нельзя проспать. Заголовки критичны: `Origin: <sub>.mintlify.site` (без
него 404), **strip `Host`**, forward `X-Forwarded-*`/`X-Real-IP`, POST обязателен
(иначе аналитика Mintlify молча падает на `/_mintlify/api/...`), docs-пути
`no-cache`, кэшировать только `/mintlify-assets/_next/static/*`. Mintlify даёт
только Nginx-пример → короткий trial-loop на Caddy `header_up`. И жёсткое условие:
**доки остаются публичными** — subpath несовместим с Mintlify-auth.

[Верстальщик — Rodchenko]: По СТ-3 — против преждевременного «shell-приложения».
`/scenarios/` как единый маркет-фронт — это будущее (владелец сам сказал). Сейчас
`/scenarios/docs` — просто проксируемая Mintlify-дока, ей shell не нужен. Когда
придёт маркет, `/scenarios/` станет приложением, а `/scenarios/docs` останется
проксированным сегментом (или встроится в навигацию маркета). Не строить пустую
оболочку ради одного docs-сегмента.

[Музыкант — Kuryokhin]: С операционной стороны (мой смежный домен — деплой/сеть):
reverse-proxy на внешний origin (`mintlify.site`) с cabinet-VPS — это исходящий
HTTPS к их платформе на каждый запрос доки. Нужно убедиться, что VPS-сеть выпускает
(office-переезд был из-за IP-блока ТСПУ — у cabinet-VPS проверить egress к
`*.mintlify.site` / `cname.mintlify.builders`). Если DPI/блок — доки не поднимутся.
Проверить egress ПЕРЕД cutover.

[Структурщик — Ozhegov]: Хорошая ловушка, Kuryokhin. Добавлю в DoD: pre-flight
`curl` с cabinet-VPS к origin Mintlify. И DNS: `membrana.space` A-запись (apex) →
cabinet-VPS IP; apex требует ALIAS/CNAME-flattening у DNS-провайдера (не голый
CNAME на apex). Это owner-гейт (DNS-запись), как было с panel/office.

[Teamlead — Vesnin]: По СТ-5 — media и office-чистка. office.membrana.space —
устарел (переехал), чистим ссылки + `Caddyfile.office.template`. media — по
принципу policy «фон→mmbrn.tech» кандидат на `media.mmbrn.tech`, НО media отдаёт
сэмплы клиенту (частично user-facing). Это отдельное решение владельца, НЕ блокер
docs-топологии. Выносим в DNS_DOMAIN_POLICY как открытый пункт, не в этот cutover.

[Математик — Dynin]: Согласен вынести media отдельно. Ещё: после cutover
провалидировать на живом — абсолютные пути ассетов и canonical-теги (Mintlify
переписывает base-path сам, но проверить, что под `/scenarios/docs` ссылки не
уехали в корень). Это проверка СБОРКИ доков на новом пути, не разовый deploy.

[Верстальщик — Rodchenko]: И редирект/консистентность: пока лендинга нет, `/`
membrana.space можно временно 302→cabinet или отдавать заглушку, чтобы корень не
был «голым 404». Мелочь, но публичный домен без корня выглядит сломанным. Не
обязательно в этот cutover, но зафиксировать.

[Teamlead — Vesnin]: Свожу порядок. Минимальный cutover docs = (1) DNS apex
membrana.space → cabinet-VPS (owner-гейт), (2) Mintlify dashboard: base path
`/scenarios/docs` + custom domain, (3) Caddy root-блок на cabinet-VPS с
`handle_path /scenarios/docs/*` reverse-proxy по рецепту, (4) egress-preflight +
live-валидация ассетов/canonical. Лендинг и маркет — ПОЗЖЕ, отдельными задачами.
Форма фиксации решения — **ADR** (готовый канон: reverse-proxy по research, спора
контрактов нет).

[Структурщик — Ozhegov]: Поддерживаю ADR, не полноценный новый пакет. Это
рантайм/деплой-решение по готовому рецепту. ADR фиксирует: subpath-proxy-топология,
заголовки, порядок хендлеров, owner-гейты (DNS apex, docs-публичны).

[Музыкант — Kuryokhin]: Согласен. Один нюанс в ADR: fallback. Если egress к
Mintlify заблокирован ИЛИ доки понадобится закрыть auth — план B = subdomain
`docs.membrana.space` (CNAME → Mintlify) вместо subpath. Записать как явную
развилку, чтобы не переоткрывать.

[Математик — Dynin]: И зафиксировать в ADR условие-инвариант: **доки публичны**
(иначе subpath ломается). Если продукт когда-то захочет приватные доки за
тарифом — это автоматически возврат к subdomain-плану B.

[Верстальщик — Rodchenko]: Со стороны UX — согласен со всем. `/scenarios/docs`
сейчас, `/scenarios/` маркет и `/` лендинг — эволюция, каждый отдельным заходом.

[Верстальщик — Rodchenko]: ВАЖНАЯ ПОПРАВКА (владелец, mid-consilium): лендинг на
`/` — **ближний срок**, не далёкое будущее. Нужна продуктовая страница: описание
продукта + CTA «регистрация» + ссылки на загрузку клиентов. Значит корень
membrana.space `/` перестаёт быть «голым» — там скоро контентная страница. Маркет
`/scenarios/` остаётся будущим, но лендинг `/` двигается в ближний трек рядом с docs.

[Структурщик — Ozhegov]: Тогда root-Caddy-блок с самого начала проектируем на ДВА
хендлера, а не один: `/` → лендинг (статика `file_server` или reverse-proxy на
лендинг-приложение) И `/scenarios/docs/*` → Mintlify-прокси. Оба на cabinet-VPS,
один site-блок, TLS общий. Порядок: точные пути (`/scenarios/docs/*`) до корневого
`/`. Это не усложняет docs-cutover — просто корневой `/` теперь не заглушка, а
лендинг, когда он будет готов; до тех пор — временный редирект/заглушка (как решили).

[Музыкант — Kuryokhin]: Ссылки загрузки клиентов = сборки десктопной Studio
(nsis-упаковка Windows — она уже гоняется в CI «Package Membrana Studio») + кабинет
для веб. Регистрация → `cabinet.membrana.space`. Лендингу нужно, чтобы эти артефакты
были достижимы: download-ссылки на собранные инсталляторы (где они хостятся — GitHub
Releases? тот же VPS? — owner/отдельная задача), register → кабинет. Это вход для
лендинг-карточки, не для docs-cutover.

[Верстальщик — Rodchenko]: И бренд у лендинга есть — `docs/comms/canon/BRAND_TOKENS.md`
+ GLOSSARY (comms-контур). Лендинг не с нуля по стилю. Контент: что за продукт
(акустическая разведка/детекция дрона), CTA регистрация (→ кабинет), CTA скачать
(→ Studio-инсталлятор). Отдельная карточка, свой мини-дизайн.

[Математик — Dynin]: С хостинга: лендинг проще всего как СТАТИКА (собранный
Vite/Next-export) на cabinet-VPS через Caddy `file_server` — минимум движущихся
частей, в отличие от docs (внешний прокси). Два разных механизма в одном site-блоке
нормально: `handle /scenarios/docs/*` (proxy) + `handle /*` (file_server лендинга).

[Teamlead — Vesnin]: Свожу с учётом поправки. Ближний трек корня membrana.space =
ДВА: (A) docs `/scenarios/docs` (Mintlify subpath-proxy, этот консилиум) + (B)
лендинг `/` (продуктовая страница, отдельная карточка). Оба на cabinet-VPS, один
root-Caddy-блок, спроектированный на оба хендлера сразу. Маркет `/scenarios/` —
по-прежнему будущее. Реализация docs — карточка `root-domain-scenarios-docs` (M) +
ADR; лендинг — отдельная карточка `product-landing` (владелец задаёт контент/CTA).
Старт — LGTM владельца + owner-гейты (DNS apex, docs-публичны, где хостятся
download-артефакты).

---

## Итоговое решение (консенсус)

- **Docs на `membrana.space/scenarios/docs` — Mintlify subpath через Caddy
  reverse-proxy** (research-подтверждено, БЕЗ миграции). Инвариант-условие: **доки
  публичны** (subpath несовместим с Mintlify-auth; приватные доки → план B). Рецепт:
  `handle_path /scenarios/docs/* { reverse_proxy <sub>.mintlify.site }` +
  `Origin` set, `Host` strip, POST разрешить, docs `no-cache`, кэш только
  `/mintlify-assets/_next/static/*`; base path в дашборде Mintlify. Порт с Nginx на
  Caddy — короткий trial-loop.
- **Root-сервер membrana.space — на cabinet-VPS** (там уже TLS cabinet.membrana.space).
  Один site-блок, спроектированный на ДВА ближних хендлера сразу: `/scenarios/docs/*`
  → Mintlify-прокси (этот консилиум) И `/` → **лендинг** (ближний срок, поправка
  владельца — продуктовая страница + CTA регистрация/загрузка, статика `file_server`).
  Порядок: точные пути (`/scenarios/docs/*`) ДО корневого `/`. `/scenarios/*` (маркет)
  — **будущее**, shell-приложение сейчас НЕ строим. До готовности лендинга `/` —
  временная заглушка/редирект, не голый 404.
- **Минимальный cutover docs (порядок):** (1) DNS apex `membrana.space` →
  cabinet-VPS (**owner-гейт**, apex нужен ALIAS/flattening); (2) Mintlify dashboard
  base path + custom domain; (3) Caddy root-блок с рецептом; (4) **egress-preflight**
  с cabinet-VPS к `*.mintlify.site` (ловушка ТСПУ/DPI, как office) + live-валидация
  ассетов/canonical под subpath.
- **Фиксация:** **ADR** (готовый канон, спора контрактов нет) с явным **план-B
  fallback** (subdomain `docs.membrana.space` при блоке egress или приватных доках).
- **Ближний трек корня (ДВЕ карточки):** (A) docs-cutover `root-domain-scenarios-docs`
  (M, этот консилиум + ADR); (B) **лендинг `product-landing`** (продуктовая страница
  membrana.space `/`: описание + CTA регистрация→cabinet + загрузка клиентов→Studio-
  инсталлятор/кабинет; бренд из docs/comms/canon/BRAND_TOKENS.md; статика на cabinet-VPS).
  Оба на одном root-Caddy-блоке.
- **Вне scope:** маркет `/scenarios/` (будущее), переезд media (кандидат
  `media.mmbrn.tech` — решение владельца), чистка office.membrana.space. Открытый
  owner-вопрос: где хостятся download-артефакты десктопа (GitHub Releases / VPS).
  Старт реализации — LGTM владельца + owner-гейты (DNS apex, docs-публичны).
