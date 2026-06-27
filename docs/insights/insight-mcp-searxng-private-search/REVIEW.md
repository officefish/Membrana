# REVIEW.md — Insight: SearXNG для приватного поиска агентов

> Регламент: [`INSIGHT_REGULATION.md`](./INSIGHT_REGULATION.md)
> Источник: [`INSIGHT.md`](./INSIGHT.md) + [`RESEARCH.md`](./RESEARCH.md)

---

## [Teamlead — Vesnin]

**Вопрос:** Нужна ли интеграция SearXNG в Membrana и на каком этапе?

**Оценка:**

Инсайт касается **инструментальной инфраструктуры** (MCP-адаптер для агентов), а не продукта Membrana напрямую. Однако он решает реальную проблему: текущий workflow ресёрча (Cursor + Perplexity) создаёт зависимость от платного API и риск утечки контрактов при отправке фрагментов аудио-кода третьим сторонам.

**Форма решения:**

- **Self-hosted SearXNG + mcp-searxng адаптер** развёртывается как `docker-compose` в `packages/background-office/docker-compose.searxng.yml`.
- **MCP фрагмент** (Claude Code / Cursor конфиг) указывает на локальный инстанс `http://localhost:8080/search?q=<query>`.
- **Whitelist запросов**: только DSP-ключевые слова (`spectral flux`, `cepstral`, `YAMNet`, инфра-термины). Запрещено: отправка `.env`, приватных WAV-путей, Linear-ID.
- **Интеграция в `DEVELOPER_RHYTHM.md`**: `night-hunt` крон может использовать SearXNG вместо Perplexity для фоновых исследований.

**Зависимости:**

- `packages/background-office` → Docker Compose, конфиг безопасности (HTTP Basic Auth через Nginx).
- `docs/MCP_INTEGRATION_STRATEGY.md` §5 → Tier 1 (critical-path MCP tools).
- `DEVELOPER_RHYTHM.md` → добавить раздел «Ночные охоты» с правилами запроса.

**LGTM от Vesnin:**

- ✅ Форма: **дефер до конца М3** (после базового MVP background-office).
- ✅ Приоритет: **medium** (экономит $15–30/мес, снимает риск утечки, но не блокер).
- ⚠️ **Предусловия перед внедрением:**
  1. Завершить `packages/background-office` (REST, контроль конфигов).
  2. Написать **security policy** для SearXNG (whitelist запросов, запрет приватных строк).
  3. Тест: агент (Cursor) успешно ищет DSP-материал и **не отправляет** .env / .wav.

---

## [Структурщик — Ozhegov]

**Вопрос:** Как интегрировать SearXNG в архитектуру без нарушения слабой связанности?

**Оценка:**

SearXNG — это **внешний сервис** (как PostgreSQL, Redis), и его нужно представить в Membrana как:

- **`background-office` → SearXNG-интеграция** (в пакет `packages/background-office/src/services/searxng-service.ts`).
- **MCP-адаптер** (отдельный пакет или часть `packages/mcp-tools`).
- **Конфигурация** в `.env` / `docker-compose.yml` (не в коде).

**Архитектурные требования:**

1. **Сервис** `SearXngService` — фасад с методом `search(query: string, category?: string): Promise<SearchResult[]>`.
   - Входные данные: санитизированный строковый запрос.
   - Выходные данные: JSON с URL, title, snippet (без приватных данных).
   - **Без побочных эффектов**: не логирует запросы в файл, не кэширует в БД по умолчанию.

2. **MCP-инструмент** в `packages/mcp-tools/searxng.mcp.ts`:
   - Конфиг указывает `searxng.url: "http://localhost:8080"`.
   - Claude Code / Cursor вызывают инструмент как `use_mcp_tool("web_search", { query, category })`.
   - Инструмент валидирует запрос перед отправкой (whitelist ключевых слов).

3. **Изоляция:**
   - `background-office` **не импортирует** из плагинов, из DAW-логики.
   - Плагины **не имеют прямого доступа** к SearXNG (только через MCP-инструмент, если вообще нужно).
   - Docker Compose (`docker-compose.searxng.yml`) — отдельный файл, запускается вместе с `docker-compose.main.yml` или отдельно.

**Связанность:**

- ✅ Слабая: SearXNG — drop-in сервис, его можно заменить на другой поисковик (Kagi, Brave) без изменения интерфейса.
- ✅ Конфиг через env (`SEARXNG_URL`, `SEARXNG_TIMEOUT`).
- ✅ MCP — стандартный протокол, не привязан к Membrana.

**Definition of Done (Strukturer):**

- [ ] `SearXngService` с юнит-тестами (mock SearXNG, проверка валидации).
- [ ] MCP-инструмент в `packages/mcp-tools` + README с примером Cursor-конфига.
- [ ] `docker-compose.searxng.yml` + инструкция в `CONTRIBUTING.md`.
- [ ] Ноль импортов между `background-office` и плагинами.
- [ ] Ноль жёстких зависимостей в `package.json` (только optional `docker-compose`).

---

## [Математик — Dynin]

**Вопрос:** Какие вычислительные задачи может решить SearXNG для DSP-ресёрча?

**Оценка:**

SearXNG — это **метапоисковик**, не математический инструмент. Однако он может поставлять входные данные для дальнейшего анализа:

**Сценарии, где SearXNG полезен:**

1. **Автоматизированный ресёрч параметров:**
   - Агент ищет "cepstral liftering window length for speech" → SearXNG возвращает статьи → `packages/dsp/src/cepstral.ts` использует найденные параметры в юнит-тестах.
   - Ночная охота: каждую ночь искать последние YAMNet fine-tuning примеры → fold в `docs/research/night-hunt-logs/`.

2. **Валидация гипотез:**
   - Перед написанием нового алгоритма (e.g., spectral flux для малых буферов) поиск убеждает, что подход устоялся.

3. **Сбор references для комментариев в коде:**
   - `// Based on https://... (found via SearXNG, 2026-06-27)`.

**Математика здесь:**

- **Нет новых вычислений.** SearXNG — только источник информации.
- **Нет чистых функций** от Математика, которые нужно интегрировать.

**Вывод:**

- ✅ SearXNG **улучшает workflow** Математика (доступ к свежей литературе без Perplexity).
- ✅ **Не требует** математической переработки.
- ⚠️ **Risk:** если агент будет ненадёжно парсить результаты и вносить ложные параметры — это вред. **Решение:** whitelist источников (arxiv.org, github.com, иногда medium.com).

**Рекомендация Dynin:**

- Внедрить **после** завершения `packages/dsp` базовой версии (FFT, cepstral, spectral flux).
- Использовать в `night-hunt` крон для фонового мониторинга новых техник.
- **Запретить** автоматическое изменение параметров DSP по результатам поиска (только manual code review).

**Priority /10:** `4` — полезный инструмент, но не критичный для математического ядра.

---

## [Музыкант — Kuryokhin]

**Вопрос:** Как SearXNG помогает в разработке аудио-плагинов и эффектов?

**Оценка:**

**Прямая польза:**

1. **Поиск реализаций:**
   - "Web Audio API convolver impulse response libraries" → находит примеры реализации.
   - "Distortion waveshaper polynomial implementations" → ищет C++/WASM примеры.
   - Сейчас приходится гуглить вручную или платить Perplexity.

2. **Ночные охоты (night-hunt crон):**
   - Ежедневный поиск "Web Audio 2026 new spec", "WASM audio processing benchmark" → agregate в `docs/research/audio-trends/`.
   - Куryokhin периодически просматривает и вносит улучшения в `packages/effects/`.

3. **Сохранение приватности:**
   - Сейчас Perplexity может сохранять фрагменты запросов (тип эффекта, параметры). SearXNG — локальный, ничего не сохраняет.

**Риски:**

- ⚠️ **Качество результатов:** SearXNG агрегирует от разных движков, может вернуть spam-сайты или устаревшие примеры.
  - **Решение:** whitelist доменов (github.com, mdn.org, web.dev, spec.whatwg.org). Запретить индексировать `*.medium.com`, `dev.to` (часто неточно).
- ⚠️ **Latency:** если в real-time поиск (e.g., UI для Musician во время сессии) — может быть медленно (2–5 сек за поиск).
  - **Решение:** SearXNG только для batch ночных охот, не для interactive UI.

**Definition of Done (Kuryokhin):**

- [ ] Whitelist доменов в конфиге SearXNG (`settings.yml` → `engines` → выбрать GitHub, MDN, spec, избежать Medium).
- [ ] Cron (в `packages/background-office/src/crons/night-hunt-searxng.ts`):
  - Поиск: "Web Audio", "WASM audio", "distortion effect", "convolver impulse", "spectral processing".
  - Сохранение результатов в `docs/archive/night-hunt/audio-trends-<date>.md`.
  - Автоматический коммит (не PR, просто append в `docs/`).
- [ ] **Никогда** не вкладывать результаты поиска в код без manual review Kuryokhin.

**Priority /10:** `6` — удобный инструмент для мониторинга тренда, освобождает время от ручного поиска.

---

## [Верстальщик — Rodchenko]

**Вопрос:** Нужна ли SearXNG в UI Membrana?

**Оценка:**

**Прямой ответ: Нет.**

SearXNG — это **инструмент для разработчиков и агентов**, не для пользователей DAW. Он не должен быть в пользовательском UI по следующим причинам:

1. **Out of scope:** Membrana — аудио-редактор, не браузер / поисковик.
2. **Не добавляет ценность для музыканта:** пользователь редактирует аудио, а не ищет информацию о DSP.
3. **Дополнительная поверхность атаки:** если SearXNG как-то попадёт в UI, пользователь может случайно отправить приватный путь файла в запросе.

**Единственный интерфейс:**

- Опциональный view в **Admin Panel** (`packages/admin-panel/src/pages/DevTools.tsx`):
  - Кнопка "Search for audio trends" (открывает `http://localhost:8080` в новой вкладке).
  - Этот View — только для разработчиков (если они запустили `MEMBRANA_ADMIN=true`).
  - **Не рекомендуется** в production Membrana.

**Решение:** SearXNG остаётся **инструментом для CI/CD, background office и ночных охот**. Никакой UI.

**Priority /10:** `2` — не относится к продукту, не требует UI-работ. Пусть это останется забота Teamlead и background-office.

---

## Голосование приоритета (1–10)

| Роль                        | Внедрять   | Этап                   | /10   | Обоснование                                                                                                                                        |
| --------------------------- | ---------- | ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Teamlead** (Vesnin)       | ✅ Да      | М3 (deferred)          | **7** | Критично для risk mitigation (утечка контрактов), экономит $15–30/мес, но не блокер MVP. Требует подготовки `background-office` и security policy. |
| **Структурщик** (Ozhegov)   | ✅ Да      | М3 (deferred)          | **6** | Архитектурно чистое решение (слабая связанность, MCP стандарт), требует ~2 дня работ на `SearXngService` + Docker Compose.                         |
| **Математик** (Dynin)       | ✅ Да      | Post-MVP               | **4** | Полезный источник для ночных охот и валидации гипотез DSP, но не критичен для ядра. Запретить автоматическое внедрение параметров.                 |
| **Музыкант** (Kuryokhin)    | ✅ Да      | М3 (batch)             | **6** | Освобождает время от ручного поиска audio-трендов, ночные охоты дают value. Требует whitelist доменов и ручного review.                            |
| **Верстальщик** (Rodchenko) | ⚠️ Условно | Admin Panel (optional) | **2** | Не для пользовательского UI. Опциональная кнопка в DevTools для разработчиков (не рекомендуется в production).                                     |

---

## Результаты голосования

| Метрика                     | Значение                                       |
| --------------------------- | ---------------------------------------------- |
| **Средний балл (weighted)** | **5.0** / 10                                   |
| **Консенсус**               | ✅ **Единодушное ДА** (5/5 ролей за внедрение) |
| **Рекомендуемый статус**    | `adopted` (с отложением до М3)                 |

---

## Резюме Teamlead

### Рекомендуемый статус

**`adopted`** с отложением до конца **M3** (июль 2026).

### Обоснование

SearXNG решает **real risk** (утечка приватных контрактов через Perplexity API) и даёт **clear ROI** ($15–30/мес экономии, улучшение DX для агентов). Все пять ролей поддерживают внедрение. **Нет критических архитектурных возражений.**

### Влияние на plan:week

- **Эта неделя (Jun 30 – Jul 6):** 🔴 **Ноль**, инсайт deferred.
- **M3 (Jul–Aug):** 🟡 **Medium**, параллельно с background-office (~3–4 дня работ):
  - Vesnin: 1 день (security policy, whitelist правил).
  - Ozhegov: 1.5 дня (SearXngService, Docker Compose, MCP-адаптер).
  - Kuryokhin: 0.5 дня (night-hunt cron, whitelist доменов).
  - Dynin: 0.5 дня (review, рекомендации для ночных охот).
  - Rodchenko: 0.5 дня (optional Admin Panel view).

### Следующий шаг (если adopted)

1. **Сейчас (Jun 28):** Vesnin создаёт `docs/tasks/M3-SEARXNG-INTEGRATION-PLAN.md` с милестоунами и security policy.
2. **Начало M3 (Jul 1–5):** Ozhegov начинает `SearXngService`, Vesnin пишет whitelist/валидацию.
3. **Jul 6–12:** Kuryokhin настраивает night-hunt cron, Rodchenko (опционально) добавляет DevTools view.
4. **Jul 13–15:** Финальный review, LGTM от Vesnin, merge в `main`.

### Предусловия перед началом М3

- [ ] `packages/background-office` с базовой REST-логикой (v0.1).
- [ ] Docker Compose инфраструктура для фоновых сервисов (PostgreSQL, Redis).
- [ ] Security policy документ (где проверяется whitelist запросов, запреты на приватные строки).

### Связанные эпики и задачи

- **Linear:** `mcp-tooling-m3-searxng` (создать с лейблом `vesnin`).
- **GitHub Issues:** [`#<TBD>`] (ссылка на основной тикет, когда создадим).
- **PR strategy:** Feature branch `vesnin-searxng-m3`, требует LGTM от Vesnin перед merge.

### Риски (краткое резюме)

| Риск                                               | Вероятность | Impact      | Mitigation                                                                                     |
| -------------------------------------------------- | ----------- | ----------- | ---------------------------------------------------------------------------------------------- |
| Флакишнесс SearXNG (парсинг при обновлении сайтов) | 🟡 Medium   | 🟡 Medium   | Мониторинг ночных охот, fallback на ручной поиск, не вносить в критичные пути.                 |
| Блокировка от поисковиков (из-за частых запросов)  | 🟢 Low      | 🔴 High     | Лимит запросов в night-hunt (1–3 в сутки), ротация User-Agent через SearXNG конфиг.            |
| Обслуживание Docker инстанса                       | 🟡 Medium   | 🟡 Medium   | Автоматический restart policy в docker-compose, health-check, логирование.                     |
| Утечка приватных данных при неправильной валидации | 🟢 Low      | 🔴 Critical | Strict whitelist ключевых слов в `SearXngService`, unit-тесты на отклонение .env / .wav путей. |

### Финальное слово

Инсайт **готов к внедрению** и находит поддержку всей команды. Это не срочно (дефер до M3), но **стратегически важно** для снижения зависимости от платных сервисов и повышения безопасности разработки. **Ставим на adopted с условием подготовки предусловий.**
