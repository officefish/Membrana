/**
 * Граф зависимостей монорепо для ночной охоты — предмет вместо прозы.
 *
 * Дело `monorepo-dependency-graph` до 25.09 просило модель «перечислить ТИПИЧНЫЕ
 * нарушения графа пакетов» по тексту ARCHITECTURE.md. Заказан был пересказ правил,
 * его и получали: отчёт без единого адреса нечем опровергнуть, и разбирать его никто
 * не брался. Здесь рёбра считаются в коде, а модели остаётся объяснение найденного.
 *
 * Источник рёбер — `yarn.lock`: каждая рабочая область объявлена записью
 * `"@membrana/<имя>@workspace:<путь>"` со списком зависимостей. Один файл, одна
 * выборка, без обхода каталогов (служба работает без чекаута, а листинг GitHub
 * отдаёт только файлы, не каталоги).
 *
 * ЦЕНА ИСТОЧНИКА И ПОРЯДОК ЕЁ ПОГАШЕНИЯ: у рабочих областей `yarn.lock` склеивает
 * `dependencies` и `devDependencies` в один блок — ребро видно, вид ребра нет. А
 * разница существенна: сервис, тянущий соседний сервис в проде, нарушает §1a, тогда
 * как то же ребро только в `devDependencies` ради тестовой фикстуры — вопрос, а не
 * приговор. Поэтому lock даёт ПОДОЗРЕНИЯ, а вид ребра выясняется вторым шагом — по
 * `package.json` подозреваемого пакета (столько выборок, сколько подозрений; в
 * здоровом стволе ноль). Манифест не прочитан — находка не выносится как нарушение:
 * «ребро есть, вид неизвестен, проверить руками» с именем файла.
 *
 * Те же правила §1 живут на диске в `scripts/check-package-boundaries.mjs`, но тот
 * зуб сканирует ИСХОДНИКИ рабочего дерева и в офисе неисполним: служба работает без
 * чекаута. Здесь не второй свод правил, а те же статьи по другому предмету.
 */

/** Рабочая область: имя пакета и путь от корня репозитория. */
export interface WorkspaceEntry {
  readonly name: string;
  readonly path: string;
  /** Внутренние зависимости (`@membrana/*`), как объявлены в lock-файле. */
  readonly deps: readonly string[];
}

/** Ребро графа: кто на кого ссылается. */
export interface GraphEdge {
  readonly from: string;
  readonly fromPath: string;
  readonly to: string;
}

/**
 * Подозрение на нарушение §1 с адресом: имена пакетов, путь и статья правила.
 * Приговором оно становится только после того, как выяснен вид ребра.
 */
export interface GraphSuspicion {
  readonly rule: string;
  readonly from: string;
  readonly fromPath: string;
  readonly to: string;
  readonly reason: string;
}

/** Вид ребра по манифесту подозреваемого пакета. */
export type EdgeKind = 'prod' | 'dev' | 'peer' | 'absent' | 'unknown';

/** Подозрение с выясненным видом ребра. */
export interface ResolvedSuspicion extends GraphSuspicion {
  readonly kind: EdgeKind;
  /** Файл, по которому вид выяснялся (или должен был выясняться). */
  readonly manifestPath: string;
}

const MEMBRANA_SCOPE = '@membrana/';

function entryKey(line: string): string | null {
  const header = /^(?:"([^"]+)"|(\S.*)):\s*$/u.exec(line);
  return header?.[1] ?? header?.[2] ?? null;
}

function workspaceDescriptor(key: string): { name: string; path: string } | null {
  const workspaceSpec = key
    .split(/,\s*/u)
    .map((spec) => spec.trim())
    .find((spec) => spec.includes('@workspace:'));
  if (!workspaceSpec) return null;

  const parsed = /^(.+)@workspace:(.+)$/u.exec(workspaceSpec);
  return parsed ? { name: parsed[1]!, path: parsed[2]! } : null;
}

function countWorkspaceEntries(lines: readonly string[]): number {
  let count = 0;
  for (const line of lines) {
    const key = entryKey(line);
    if (!key) continue;
    const specs = key.split(/,\s*/u).map((spec) => spec.trim());
    const hasWorkspace = specs.some((spec) => spec.includes('@workspace:'));
    const isRoot = specs.some((spec) => spec.endsWith('@workspace:.'));
    if (hasWorkspace && !isRoot) count += 1;
  }
  return count;
}

/** Отказывает на неполном разборе: пустота графа не может выглядеть как чистота. */
function assertWorkspaceGraphIntegrity(
  workspaces: readonly WorkspaceEntry[],
  expectedWorkspaceCount: number,
): void {
  if (workspaces.length !== expectedWorkspaceCount) {
    throw new Error(
      `monorepo-dependency-graph: workspace-записей ${expectedWorkspaceCount}, ` +
        `разобрано рабочих областей ${workspaces.length}`,
    );
  }

  const dependencyCount = workspaces.reduce((sum, workspace) => sum + workspace.deps.length, 0);
  const edgeCount = buildGraphEdges(workspaces).length;
  if (dependencyCount > 0 && edgeCount === 0) {
    throw new Error(
      `monorepo-dependency-graph: объявлено внутренних зависимостей ${dependencyCount}, ` +
        'но внутренних рёбер 0 — разбор графа противоречив',
    );
  }
}

/**
 * Разбор `yarn.lock` (Yarn Berry): записи рабочих областей и их внутренние рёбра.
 *
 * Формат записи:
 *   "@membrana/core@npm:*, @membrana/core@workspace:packages/core":
 *     dependencies:
 *       "@membrana/core": "npm:*"
 *
 * Чужие записи (npm-пакеты) пропускаются: у них нет `@workspace:`.
 */
export function parseWorkspaceGraph(lockText: string): WorkspaceEntry[] {
  const out: WorkspaceEntry[] = [];
  const lines = lockText.split(/\r?\n/);
  let current: { name: string; path: string; deps: string[] } | null = null;
  let inDeps = false;

  const flush = () => {
    if (current) out.push({ name: current.name, path: current.path, deps: current.deps });
    current = null;
    inDeps = false;
  };

  for (const line of lines) {
    const key = entryKey(line);
    if (key) {
      flush();
      const workspace = workspaceDescriptor(key);
      if (!workspace) continue;
      // Корень репозитория объявлен как `@workspace:.` — он не пакет графа.
      if (workspace.path !== '.') current = { ...workspace, deps: [] };
      continue;
    }
    if (!current) continue;
    if (/^\s{2}\S/.test(line)) {
      inDeps = /^\s{2}(dependencies|devDependencies|peerDependencies):\s*$/.test(line);
      continue;
    }
    if (!inDeps) continue;
    const dep = /^\s{4}"?(@[^"\s:]+\/[^"\s:]+)"?:\s*/.exec(line);
    if (dep && dep[1]!.startsWith(MEMBRANA_SCOPE) && !current.deps.includes(dep[1]!)) {
      current.deps.push(dep[1]!);
    }
  }
  flush();
  assertWorkspaceGraphIntegrity(out, countWorkspaceEntries(lines));
  return out;
}

/** Рёбра графа из списка рабочих областей: только связи внутри монорепо. */
export function buildGraphEdges(workspaces: readonly WorkspaceEntry[]): GraphEdge[] {
  const known = new Set(workspaces.map((w) => w.name));
  const edges: GraphEdge[] = [];
  for (const w of workspaces) {
    for (const dep of w.deps) {
      if (known.has(dep)) edges.push({ from: w.name, fromPath: w.path, to: dep });
    }
  }
  return edges;
}

/**
 * Правила §1 и §1a ARCHITECTURE.md — выписаны дословно по документу, не по памяти.
 * Каждое правило знает, к кому относится (предикат по пути или имени) и что запрещает.
 */
interface GraphRule {
  readonly id: string;
  readonly applies: (w: WorkspaceEntry) => boolean;
  readonly forbids: (to: string, workspaces: readonly WorkspaceEntry[]) => string | null;
}

const isService = (w: WorkspaceEntry) =>
  w.path.startsWith('packages/services/') && !w.path.startsWith('packages/services/detectors/');

const GRAPH_RULES: readonly GraphRule[] = [
  {
    // §1: «`@membrana/core` не зависит от других пакетов проекта».
    id: 'core-has-no-internal-deps',
    applies: (w) => w.name === '@membrana/core',
    forbids: (to) => `core не зависит от других пакетов проекта, а зависит от ${to}`,
  },
  {
    // §1: «`@membrana/agenda` и `@membrana/device-board` зависят только от
    // `@membrana/core`, не друг от друга».
    id: 'agenda-and-board-depend-on-core-only',
    applies: (w) => w.name === '@membrana/agenda' || w.name === '@membrana/device-board',
    forbids: (to) =>
      to === '@membrana/core'
        ? null
        : `зависит только от core, а зависит от ${to}`,
  },
  {
    // §1a: «Допустимые зависимости: только `@membrana/core` + внешние npm-пакеты»;
    // «Нельзя: зависеть от других сервисов, от agenda / device-board / apps/client».
    // Исключение §1e — `packages/services/detectors/*` — из области правила выведено.
    id: 'service-depends-on-core-only',
    applies: isService,
    forbids: (to) =>
      to === '@membrana/core' ? null : `сервис зависит только от core, а зависит от ${to}`,
  },
];

/** Проверка рёбер по правилам §1: каждое подозрение несёт адрес. */
export function findGraphSuspicions(workspaces: readonly WorkspaceEntry[]): GraphSuspicion[] {
  const byName = new Map(workspaces.map((w) => [w.name, w]));
  const suspicions: GraphSuspicion[] = [];
  for (const edge of buildGraphEdges(workspaces)) {
    const from = byName.get(edge.from);
    if (!from) continue;
    for (const rule of GRAPH_RULES) {
      if (!rule.applies(from)) continue;
      const reason = rule.forbids(edge.to, workspaces);
      if (reason) {
        suspicions.push({
          rule: rule.id,
          from: edge.from,
          fromPath: edge.fromPath,
          to: edge.to,
          reason,
        });
      }
    }
  }
  return suspicions;
}

/** Путь манифеста рабочей области — адрес, по которому выясняется вид ребра. */
export function manifestPathOf(workspacePath: string): string {
  return `${workspacePath.replace(/\/+$/, '')}/package.json`;
}

/**
 * Вид ребра по манифесту подозреваемого. Манифест не прочитан или сломан —
 * `unknown`: это отказ назвать вид, а не догадка о нём.
 */
export function classifyEdgeKind(manifestText: string | null, dep: string): EdgeKind {
  if (!manifestText) return 'unknown';
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(manifestText) as Record<string, unknown>;
  } catch {
    return 'unknown';
  }
  const has = (field: string) => {
    const block = manifest[field];
    return typeof block === 'object' && block !== null && dep in (block as object);
  };
  if (has('dependencies')) return 'prod';
  if (has('devDependencies')) return 'dev';
  if (has('peerDependencies')) return 'peer';
  return 'absent';
}

/** Циклы в графе (§1 запрещает взаимную зависимость): каждый — список имён по кругу. */
export function findCycles(workspaces: readonly WorkspaceEntry[]): string[][] {
  const edges = buildGraphEdges(workspaces);
  const out = new Map<string, string[]>();
  for (const e of edges) {
    const list = out.get(e.from) ?? [];
    list.push(e.to);
    out.set(e.from, list);
  }
  const cycles: string[][] = [];
  const seen = new Set<string>();
  const stack: string[] = [];

  const walk = (node: string) => {
    const at = stack.indexOf(node);
    if (at >= 0) {
      cycles.push([...stack.slice(at), node]);
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);
    stack.push(node);
    for (const next of out.get(node) ?? []) walk(next);
    stack.pop();
  };

  for (const w of workspaces) walk(w.name);
  return cycles;
}

/**
 * Предмет для модели: замер графа с адресами. Проза остаётся моделью, числа — кодом.
 */
export function renderGraphSubject(
  workspaces: readonly WorkspaceEntry[],
  resolved: readonly ResolvedSuspicion[] = [],
): string {
  const edges = buildGraphEdges(workspaces);
  const cycles = findCycles(workspaces);

  const KIND_VERDICT: Record<EdgeKind, string> = {
    prod: 'НАРУШЕНИЕ §1 — зависимость прода',
    dev: 'ВОПРОС — только сборка/тесты, не приговор',
    peer: 'ВОПРОС — объявлено как peer',
    absent: 'СНЯТО — в манифесте ребра нет (след lock-файла устарел)',
    unknown: 'НЕ ВЫЯСНЕНО — манифест не прочитан, проверить руками',
  };

  const broken = resolved.filter((r) => r.kind === 'prod');
  const questions = resolved.filter((r) => r.kind === 'dev' || r.kind === 'peer');
  const unresolved = resolved.filter((r) => r.kind === 'unknown');

  const lines = [
    '## Замер графа (посчитан кодом, не пересказ)',
    '',
    `Рабочих областей: ${workspaces.length} · внутренних рёбер: ${edges.length} · ` +
      `подозрений по §1: ${resolved.length} · из них нарушений прода: ${broken.length} · ` +
      `вопросов: ${questions.length} · не выяснено: ${unresolved.length} · циклов: ${cycles.length}`,
    '',
    'Порядок замера: список рабочих областей и рёбра — из `yarn.lock` (одна выборка); ' +
      'вид каждого подозрительного ребра — из `package.json` подозреваемого. ' +
      'Lock склеивает `dependencies` и `devDependencies`, поэтому сам по себе приговора не даёт.',
    '',
    '### Подозрения §1 с адресами и видом ребра',
    '',
  ];

  if (resolved.length === 0) {
    lines.push('Подозрений по правилам §1 не найдено.', '');
  } else {
    lines.push(
      '| Пакет | Путь | Ребро | Правило | Вид | Вердикт | Где смотреть |',
      '|---|---|---|---|---|---|---|',
    );
    for (const r of resolved) {
      lines.push(
        `| ${r.from} | ${r.fromPath} | → ${r.to} | ${r.rule} | ${r.kind} | ` +
          `${KIND_VERDICT[r.kind]} | ${r.manifestPath} |`,
      );
    }
    lines.push('');
  }

  lines.push('### Циклы', '');
  if (cycles.length === 0) {
    lines.push('Циклов не найдено.', '');
  } else {
    for (const cycle of cycles) lines.push(`- ${cycle.join(' → ')}`);
    lines.push('');
  }

  lines.push('### Все внутренние рёбра', '');
  for (const e of edges) lines.push(`- ${e.from} (${e.fromPath}) → ${e.to}`);
  lines.push('');

  return lines.join('\n');
}
