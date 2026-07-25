/**
 * Единственный законный путь производства `docs/tasks/README.md` (#1201).
 *
 * До этого модуля README печатала ad-hoc-функция `renderTasksReadme`: она собирала
 * документ целиком из реестра, поэтому любая живущая в файле секция стиралась молча
 * (23.07 чуть не снесло HOME_WORKSHOP из соседней сессии). Лечили карантином
 * `TASKS_README_SYNC_FORCE=1` — то есть выключали генератор, а не чинили.
 *
 * Здесь генератор устроен иначе: документ = Template `tasks-readme` + гранулы.
 * Ручной текст живёт в literal-гранулах контейнера, набор задач — в fn-гранулах,
 * читающих `registry.json` через io-адаптер. Стереть чужую секцию нечем: её носитель
 * не в коде генератора, а в шаблоне.
 *
 * Инвариант идемпотентности: ни одна гранула не смотрит на часы. Тот же реестр +
 * тот же шаблон → байт-в-байт тот же документ (старая подпись «обновлён
 * автоматически: <сегодня>» этот инвариант ломала на каждом прогоне).
 */
import { integratedGenerate } from './strategic-docs-integration.mjs';
import { loadGranules, loadTemplate } from './strategic-docs-loader.mjs';

export const TASKS_README_TEMPLATE_ID = 'tasks-readme';

/**
 * io-адаптер гранул: единственная разрешённая операция — отдать уже загруженный реестр.
 * Реестр приходит в память от вызывающего (edge), гранулы к диску не ходят.
 *
 * @param {{ version: number, tasks: object[] }} registry
 * @returns {{ exec: (req: { op: string, args?: object }) => Promise<any> }}
 */
export function makeRegistryIo(registry) {
  return {
    async exec(req) {
      if (req?.op === 'loadRegistry') return registry;
      throw new Error(`tasks-readme io: операция "${req?.op}" не разрешена`);
    },
  };
}

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * renderBody, в котором скелет шаблона — АВТОРИТЕТ порядка.
 *
 * Дефолтный renderBody движка просто склеивает части в порядке слотов и скелет
 * игнорирует; тогда `skeleton` в template.json — украшение, и переставленный слот
 * молча меняет документ. Здесь части кладутся в свои плейсхолдеры.
 *
 * Подстановка ОДНИМ проходом, а не цепочкой replaceAll: тела гранул приходят из
 * registry.json, то есть из текста, который пишут люди. Последовательные замены
 * подставляли бы в уже вставленный текст — заголовок задачи вида `{{howto}}`
 * утащил бы в себя соседний слот.
 *
 * @param {{ skeleton: string, slots: Array<{ placeholder: string }> }} template
 * @returns {(parts: string[]) => string}
 */
export function renderBySkeleton(template) {
  return (parts) => {
    const bySlot = new Map(
      (template.slots ?? []).map((slot, i) => [slot.placeholder, String(parts[i] ?? '').trim()]),
    );
    const out = bySlot.size
      ? template.skeleton.replace(
          new RegExp([...bySlot.keys()].map(escapeRegExp).join('|'), 'g'),
          (hit) => bySlot.get(hit),
        )
      : template.skeleton;
    return out.endsWith('\n') ? out : `${out}\n`;
  };
}

/**
 * Сборка README реестра через движок стратегических документов.
 *
 * @param {{ version: number, tasks: object[] }} registry
 * @param {{
 *   loadTemplate?: typeof loadTemplate,
 *   loadGranules?: typeof loadGranules,
 *   granulesDir?: string,
 * }} [deps]
 * @returns {Promise<{ body: string, route: 'release'|'experiment', validation: {ok:boolean, reasons:string[]}, trace: object }>}
 */
export async function generateTasksReadme(registry, deps = {}) {
  const loadTpl = deps.loadTemplate ?? loadTemplate;
  const loadGr = deps.loadGranules ?? loadGranules;

  const template = await loadTpl(TASKS_README_TEMPLATE_ID);
  const granules = deps.granulesDir ? await loadGr(deps.granulesDir) : await loadGr();

  const result = await integratedGenerate(template, granules, {
    io: makeRegistryIo(registry),
    renderBody: renderBySkeleton(template),
  });

  return {
    body: result.body,
    route: result.route,
    validation: result.validation,
    trace: result.trace,
  };
}
