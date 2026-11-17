/**
 * Ведущий код-ревью (день-спринт code-review-lead-refactor; тезисы T3/T4 шторма
 * branch-taxonomy 21.07): ревью ведёт ОДИН назначенный главным (пятеро советующих плюс
 * Teamlead умолчанием — см. `PERSONAS`). Он
 * проверяет дифф на антипаттерны (бестиарий, T5) и выносит пропуск/блок; на
 * ревью работает его персональная память (T4).
 *
 * Каскад назначения — зеркало K2 таксономии (явное слово → карточка → скоуп →
 * Teamlead), с той разницей, что здесь ревью, а не ветка: явное слово владельца >
 * leadPersona активной карточки, чей id виден в ветке/диффе > маппинг
 * скоуп→персона по путям диффа > Teamlead + громкая пометка «вне конвенции».
 *
 * ГРАНИЦА: грамматику имён веток (resolveHolder, Р4 #785) этот модуль НЕ парсит —
 * это соседний спринт; здесь только подстрочное совпадение id карточки.
 *
 * Чистые функции без fs/сети/git — все снимки передаёт вызывающий.
 *
 * ЕДИНСТВЕННЫЙ СУДЬЯ. Ведущего назначает только `resolveReviewLead`; второго предиката
 * того же правила в контуре нет и быть не должно — два судьи одного правила это два
 * правила. Потребители (`code-review.mjs`, гейт) ТРАНСПОРТИРУЮТ его вывод, не пересчитывают.
 */
import { PERSONA_ROLE_LABELS } from './persona-memory.mjs';

/**
 * Кто может быть ведущим ревью.
 *
 * ПОЧЕМУ ЗДЕСЬ ТАРАСОВ (#2491). До 28.09 список был «пять советующих», а умолчание каскада
 * возвращало `vesnin` с основанием «Teamlead по умолчанию». Тимлид — `tarasov`
 * (`PERSONA_ROLE_LABELS`), и его в списке не было ВОВСЕ: каскад по построению не мог вернуть
 * того, кого объявлял своим умолчанием, и наружу шесть дней выходила строка
 * `LGTM тимлида (vesnin)` — на 57 PR из 60 за 22–27.09.
 *
 * Основание состава — канон, не вкус: `docs/VIRTUAL_TEAM_PROMPT.md` («**Teamlead** по
 * завершённому модулю даёт краткое ревью… Без **LGTM** слияние не считается принятым»),
 * шапка этого же модуля (каскад заканчивается Teamlead'ом) и уже влитый прецедент
 * `HOLDER_PERSONAS` в `procedure-personas.mjs`, где Тарасов стоит шестым рядом с пятерью.
 *
 * ЧЕГО ЭТО НЕ МЕНЯЕТ: панель консилиума (`CONSILIUM_ROLE_KEY_TO_SLUG`) и ростер `yarn ask`
 * живут в других модулях и не тронуты — пятеро советующих остались пятью. Здесь только
 * allowlist ВЕДУЩЕГО РЕВЬЮ, и `PERSONAS` из этого файла никто снаружи не импортирует.
 */
export const PERSONAS = Object.freeze(['vesnin', 'ozhegov', 'dynin', 'kuryokhin', 'rodchenko', 'tarasov']);

/**
 * Ведущий по умолчанию — Teamlead. Вынесен константой, потому что основание умолчания
 * собирается ИЗ НЕГО (`PERSONA_ROLE_LABELS[DEFAULT_LEAD]`), а не набирается строкой рядом:
 * ровно так `PERSONA_ROLE_LABELS` шесть дней не знал, что Тарасов стал тимлидом (#1644),
 * и ровно так основание здесь называло Teamlead'а, возвращая Архитектора (#2491).
 */
export const DEFAULT_LEAD = 'tarasov';

/**
 * Маппинг скоупа (префикс/маркер пути) → персона. Порядок важен: первый матч
 * побеждает; сила — из таблицы ролей VIRTUAL_TEAM_PROMPT.
 *
 * НЕПОКРЫТЫЙ ПУТЬ НЕ ГОЛОСУЕТ — и это второй путь, которым серверный контур терял хозяина,
 * хуже первого (#2491). Замер на реальном диффе PR #2393 (пять файлов `background-office` и
 * один попутный `scripts/_ssh-panel-smoke.mjs`): серверные пути не совпадали ни с одним
 * правилом и голосов не подавали, поэтому решал ОДИН скрипт —
 * `{persona: 'vesnin', basis: 'скоуп диффа (1 из 6 путей)', outOfConvention: false}`.
 * Здесь ложь тише, чем в умолчании: пометки «вне конвенции» нет ВОВСЕ, и предупреждение в
 * stderr не печаталось — назначение выглядело обоснованным скоупом. После правки тот же дифф
 * даёт `{persona: 'ozhegov', basis: 'скоуп диффа (5 из 6 путей)'}`.
 *
 * ГДЕ МЕСТО В СПИСКЕ ВСЁ-ТАКИ РЕШАЕТ. Первый матч побеждает, поэтому пересекающиеся правила
 * чувствительны к порядку: `packages/background-office/package.json` совпадает и с общим
 * `package\.json$` Архитектора. Пакетные правила стоят выше — собственный манифест серверного
 * пакета принадлежит его хозяину. При РАВЕНСТВЕ голосов побеждает меньший индекс персоны в
 * этом списке, а не индекс правила: у `ozhegov` он 3 и был им до правки, так что ничьи
 * «серверный файл против попутного скрипта» правка не переворачивает — она их создаёт.
 */
export const SCOPE_TO_PERSONA = Object.freeze([
  { re: /packages\/services\/detectors\/|fft|\/math\//u, persona: 'dynin' },
  { re: /audio|webaudio|recorder|effects/iu, persona: 'kuryokhin' },
  { re: /\.tsx$|apps\/client\/src\/(components|plugins)\//u, persona: 'rodchenko' },
  { re: /packages\/services\/|packages\/libs\/|\/hooks\//u, persona: 'ozhegov' },
  // ─── серверный контур и ядро (#2491) ─────────────────────────────────────────────
  // Контейнеризация серверного контура — НЕ Структурщику, и это не вкус, а прямой запрет:
  // PROMPT_STRUCTURER.md, «Детальный деплой, hardening, Docker/CI-скрипты и низкоуровневая
  // кибербезопасность — зона **Математика** (как ops); ты описываешь логическую топологию
  // сервисов». Таблица ролей VIRTUAL_TEAM_PROMPT.md подтверждает с другой стороны:
  // Математик — «также Linux, security, bash/mjs, Docker». Правило стоит ПЕРЕД
  // `background-*`, иначе манифест образа серверного пакета уезжал бы Структурщику через
  // пакетное правило — дефект, который правка #2491 иначе внесла бы сама.
  { re: /(^|\/)Dockerfile[^/]*$|(^|\/)docker-compose[^/]*\.ya?ml$|(^|\/)\.dockerignore$/u, persona: 'dynin' },
  // NestJS `background-*` — дословная зона Структурщика: PROMPT_STRUCTURER.md, «сетевые
  // технологии (HTTP, WebSocket, REST/gRPC-контракты), микросервисная архитектура и
  // границы между сервисами в монорепо и NestJS `background-*`»; таблица ролей
  // VIRTUAL_TEAM_PROMPT.md: «Сервисы, хуки, сторы, фасады, слабая связанность… сеть,
  // микросервисы». Правило стоит ПОСЛЕ `audio` намеренно: DSP внутри media-контура
  // (`background-media/src/audio/**`) остаётся Музыканту по его первичной зоне.
  { re: /packages\/background-[^/]+\//u, persona: 'ozhegov' },
  // `@membrana/core` — контракты, на которые опираются все пакеты (package.json пакета).
  // Таблица ролей: Архитектор — «границы модулей и пакетов, контракты»; PROMPT_ARCHITECT.md
  // — «границы пакетов, контракты между слоями». Тот же предмет охраняет консилиум-гейт
  // `docs/CONTRIBUTING.md`.
  { re: /packages\/core\//u, persona: 'vesnin' },
  // `@membrana/agenda` — реестр, стор, провайдер, жизненный цикл плагинов: «сервисы, хуки,
  // сторы, фасады» таблицы ролей. Его `ui/**` — это `.tsx`, и правило Верстальщика выше
  // забирает их раньше: вёрстка модуля Верстальщику, композиция Структурщику.
  { re: /packages\/agenda\//u, persona: 'ozhegov' },
  // `apps/cabinet` — браузерное приложение (аудит M0 21.09). Разрез тот же, что у
  // `apps/client` выше: HTTP-клиенты, сторы и рантайм-состояние — Структурщику, экраны и
  // компоненты — Верстальщику (его «презентационный UI», ему же запрещена бизнес-логика).
  { re: /apps\/cabinet\/src\/(api|lib|services|context)\//u, persona: 'ozhegov' },
  { re: /apps\/cabinet\/src\/(components|pages|plugins)\//u, persona: 'rodchenko' },
  // ─────────────────────────────────────────────────────────────────────────────────
  { re: /scripts\/|docs\/|\.github\/|package\.json$/u, persona: 'vesnin' },
]);

/**
 * Назначение ведущего ревью. Возвращает и ОСНОВАНИЕ — назначение без названного
 * основания это ровно «молчаливый роутинг», против которого T2/K2.
 *
 * @param {{
 *   explicit?: string|null,
 *   branch?: string|null,
 *   diffPaths?: string[],
 *   activeTasks?: Array<{id: string, leadPersona?: string|null}>,
 * }} input
 * @returns {{persona: string, basis: string, outOfConvention: boolean}}
 */
export function resolveReviewLead({ explicit = null, branch = null, diffPaths = [], activeTasks = [] } = {}) {
  if (explicit && PERSONAS.includes(explicit)) {
    return { persona: explicit, basis: 'явное слово владельца', outOfConvention: false };
  }

  // Карточка, чей id виден в имени ветки или путях диффа, отдаёт своего ведущего.
  const haystack = [branch ?? '', ...diffPaths].join('\n');
  for (const t of activeTasks) {
    if (t?.id && t.leadPersona && PERSONAS.includes(t.leadPersona) && haystack.includes(t.id)) {
      return { persona: t.leadPersona, basis: `leadPersona карточки «${t.id}»`, outOfConvention: false };
    }
  }

  // Скоуп-маппинг: голосуют пути диффа, побеждает большинство (при равенстве —
  // порядок SCOPE_TO_PERSONA как приоритет силы).
  const votes = new Map();
  for (const p of diffPaths) {
    const hit = SCOPE_TO_PERSONA.find((s) => s.re.test(p));
    if (hit) votes.set(hit.persona, (votes.get(hit.persona) ?? 0) + 1);
  }
  if (votes.size > 0) {
    const ranked = [...votes.entries()].sort(
      (a, b) => b[1] - a[1]
        || SCOPE_TO_PERSONA.findIndex((s) => s.persona === a[0]) - SCOPE_TO_PERSONA.findIndex((s) => s.persona === b[0]),
    );
    const [persona, n] = ranked[0];
    return { persona, basis: `скоуп диффа (${n} из ${diffPaths.length} путей)`, outOfConvention: false };
  }

  // Умолчание. Роль берётся из ЕДИНСТВЕННОГО словаря меток, поэтому основание физически
  // не может назвать роль, которой не соответствует возвращаемая персона (#2491).
  return {
    persona: DEFAULT_LEAD,
    basis: `вне конвенции — ни карточки, ни скоупа; ${PERSONA_ROLE_LABELS[DEFAULT_LEAD]} по умолчанию`,
    outOfConvention: true,
  };
}

/**
 * Громкая строка «у этого диффа нет хозяина ревью» — ОДНО определение текста для всех, кто
 * его показывает: промпт ведущего, артефакт ревью, причина гейта.
 *
 * ПОЧЕМУ ВООБЩЕ ФУНКЦИЯ (#2491). До 28.09 `outOfConvention: true` печатался одной строкой в
 * stderr (`code-review.mjs`) и не доходил никуда: ни в промпт ведущему, ни в артефакт, ни в
 * commit-статус. Величина измерима и выбрасывалась — тот же класс, что «проверка без
 * предмета». Образец лечения взят у соседа по файлу: срез диффа (#1550) виден и человеку
 * (громкая строка), и машине (метка в артефакте), и гейту (причина в статусе).
 *
 * @returns {string}
 */
export function outOfConventionNotice() {
  return (
    '⚠ **ВНЕ КОНВЕНЦИИ: у этого диффа нет хозяина ревью.** Ни одна карточка реестра и ни одно '
    + 'правило карты скоупов (`SCOPE_TO_PERSONA`) не покрывает его пути, поэтому ведущий назначен '
    + `умолчанием (${PERSONA_ROLE_LABELS[DEFAULT_LEAD]}). Это не «всё в порядке»: это заявка на `
    + 'правило в карте скоупов — назвать в вердикте, какому контуру не хватает хозяина (#2491).'
  );
}

/**
 * Блок ведущего для промпта ревью: кто ведёт, на каком основании, его память и
 * бестиарий. Обязанность ведущего (T3) названа явно: пропуск или блок.
 * @param {{persona: string, basis: string, outOfConvention?: boolean, memoryExcerpt?: string,
 *          bestiary?: string}} p
 * @returns {string}
 */
export function formatLeadBlock({ persona, basis, outOfConvention = false, memoryExcerpt = '', bestiary = '' }) {
  const parts = [
    '## Ведущий ревью (T3 — назначенный главный)',
    '',
    `Это ревью ведёт **${persona}** (основание: ${basis}).`,
    'Ведущий проверяет дифф на антипаттерны бестиария и выносит вердикт',
    '**пропуск или блок** — его строка в ответе обязательна и идёт первой.',
  ];
  // Первый из трёх адресов, куда доезжает сигнал: сам ведущий обязан прочитать, что его
  // назначили умолчанием, и назвать это в вердикте (#2491).
  if (outOfConvention) parts.push('', outOfConventionNotice());
  if (memoryExcerpt.trim()) {
    parts.push('', '### Память ведущего (T4 — работает на ревью)', '', memoryExcerpt.trim());
  }
  if (bestiary.trim()) {
    parts.push('', '### Бестиарий антипаттернов (T5 — чек-лист ведущего)', '', bestiary.trim());
  }
  return parts.join('\n');
}
