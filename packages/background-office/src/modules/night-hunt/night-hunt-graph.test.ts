/**
 * Зубы графа зависимостей ночной охоты. Предмет — фикстура lock-файла: разбор,
 * рёбра, правила §1 и циклы. Красный вход показывается подсадкой нарушающего ребра.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildGraphEdges,
  classifyEdgeKind,
  findCycles,
  findGraphSuspicions,
  manifestPathOf,
  parseWorkspaceGraph,
  renderGraphSubject,
  type ResolvedSuspicion,
} from './night-hunt-graph';

/** Здоровый кусок монорепо: core ни от кого, сервис от core, приложение от всех. */
const HEALTHY_LOCK = `
"@membrana/core@workspace:packages/core":
  version: 0.0.0-use.local
  resolution: "@membrana/core@workspace:packages/core"
  dependencies:
    zod: "npm:^3.23.8"
  languageName: unknown
  linkType: soft

"@membrana/agenda@workspace:packages/agenda":
  version: 0.0.0-use.local
  resolution: "@membrana/agenda@workspace:packages/agenda"
  dependencies:
    "@membrana/core": "npm:*"
    react: "npm:^18.3.1"
  languageName: unknown
  linkType: soft

"@membrana/audio-engine-service@workspace:packages/services/audio-engine":
  version: 0.0.0-use.local
  resolution: "@membrana/audio-engine-service@workspace:packages/services/audio-engine"
  dependencies:
    "@membrana/core": "npm:*"
  languageName: unknown
  linkType: soft

"@membrana/client@workspace:apps/client":
  version: 0.0.0-use.local
  resolution: "@membrana/client@workspace:apps/client"
  dependencies:
    "@membrana/agenda": "npm:*"
    "@membrana/core": "npm:*"
    "@membrana/audio-engine-service": "npm:*"
  languageName: unknown
  linkType: soft

"root-workspace-0b6124@workspace:.":
  version: 0.0.0-use.local
  resolution: "root-workspace-0b6124@workspace:."
  dependencies:
    turbo: "npm:^2.0.0"
  languageName: unknown
  linkType: soft
`;

describe('разбор yarn.lock', () => {
  it('составной Berry-ключ разбирается по спецификации @workspace: (#2464)', () => {
    const composite = HEALTHY_LOCK.replace(
      '"@membrana/core@workspace:packages/core":',
      '"@membrana/core@npm:*, @membrana/core@workspace:packages/core":',
    );

    expect(parseWorkspaceGraph(composite)).toContainEqual({
      name: '@membrana/core',
      path: 'packages/core',
      deps: [],
    });
  });

  it('живой yarn.lock не теряет составные workspace-записи и внутренние рёбра (#2464)', () => {
    const lockText = readFileSync(new URL('../../../../../yarn.lock', import.meta.url), 'utf8');
    const declared = [...lockText.matchAll(/^"[^"]*@workspace:[^"]*":\s*$/gmu)].filter(
      ([header]) => !header.includes('@workspace:.'),
    ).length;
    const workspaces = parseWorkspaceGraph(lockText);

    expect(workspaces).toHaveLength(declared);
    expect(buildGraphEdges(workspaces).length).toBeGreaterThan(0);
  });

  it('workspace-запись, которую парсер не разобрал, объявляется отказом (#2464)', () => {
    const malformed = `
"@membrana/core@workspace:":
  version: 0.0.0-use.local
  languageName: unknown
  linkType: soft
`;

    expect(() => parseWorkspaceGraph(malformed)).toThrow(/workspace.*разобран/u);
  });

  it('зависимости при нуле внутренних рёбер — противоречие, а не чистый граф (#2464)', () => {
    const missingTarget = `
"@membrana/client@workspace:apps/client":
  version: 0.0.0-use.local
  dependencies:
    "@membrana/core": "npm:*"
  languageName: unknown
  linkType: soft
`;

    expect(() => parseWorkspaceGraph(missingTarget)).toThrow(/зависимост.*р.б.*0/iu);
  });

  it('рабочие области читаются с именем, путём и внутренними зависимостями', () => {
    const ws = parseWorkspaceGraph(HEALTHY_LOCK);
    const names = ws.map((w) => w.name);

    expect(names).toContain('@membrana/core');
    expect(names).toContain('@membrana/client');
    expect(ws.find((w) => w.name === '@membrana/agenda')?.path).toBe('packages/agenda');
    expect(ws.find((w) => w.name === '@membrana/client')?.deps).toEqual([
      '@membrana/agenda',
      '@membrana/core',
      '@membrana/audio-engine-service',
    ]);
  });

  it('корень репозитория пакетом графа не считается', () => {
    expect(parseWorkspaceGraph(HEALTHY_LOCK).map((w) => w.path)).not.toContain('.');
  });

  it('внешние npm-зависимости в рёбра не попадают', () => {
    const core = parseWorkspaceGraph(HEALTHY_LOCK).find((w) => w.name === '@membrana/core');
    expect(core?.deps).toEqual([]);
  });

  it('пустой или мусорный файл даёт пустой граф, а не падение', () => {
    expect(parseWorkspaceGraph('')).toEqual([]);
    expect(parseWorkspaceGraph('не lock-файл вовсе')).toEqual([]);
  });
});

describe('рёбра', () => {
  it('ребро строится только на известные рабочие области', () => {
    const edges = buildGraphEdges(parseWorkspaceGraph(HEALTHY_LOCK));
    expect(edges).toContainEqual({
      from: '@membrana/client',
      fromPath: 'apps/client',
      to: '@membrana/core',
    });
    expect(edges.every((e) => e.to.startsWith('@membrana/'))).toBe(true);
  });
});

describe('правила §1', () => {
  it('на здоровом графе нарушений нет', () => {
    expect(findGraphSuspicions(parseWorkspaceGraph(HEALTHY_LOCK))).toEqual([]);
  });

  it('core с внутренней зависимостью — нарушение с адресом', () => {
    const broken = HEALTHY_LOCK.replace(
      `  resolution: "@membrana/core@workspace:packages/core"
  dependencies:
    zod: "npm:^3.23.8"`,
      `  resolution: "@membrana/core@workspace:packages/core"
  dependencies:
    "@membrana/agenda": "npm:*"`,
    );
    const violations = findGraphSuspicions(parseWorkspaceGraph(broken));

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: 'core-has-no-internal-deps',
      from: '@membrana/core',
      fromPath: 'packages/core',
      to: '@membrana/agenda',
    });
  });

  it('agenda на device-board — нарушение «не друг от друга»', () => {
    const broken = HEALTHY_LOCK.replace(
      `    "@membrana/core": "npm:*"
    react: "npm:^18.3.1"`,
      `    "@membrana/core": "npm:*"
    "@membrana/device-board": "npm:*"`,
    ).concat(`
"@membrana/device-board@workspace:packages/device-board":
  version: 0.0.0-use.local
  resolution: "@membrana/device-board@workspace:packages/device-board"
  dependencies:
    "@membrana/core": "npm:*"
  languageName: unknown
  linkType: soft
`);
    const violations = findGraphSuspicions(parseWorkspaceGraph(broken));

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: 'agenda-and-board-depend-on-core-only',
      from: '@membrana/agenda',
      to: '@membrana/device-board',
    });
  });

  it('сервис на сервис — нарушение §1a', () => {
    const broken = HEALTHY_LOCK.concat(`
"@membrana/fft-analyzer-service@workspace:packages/services/fft-analyzer":
  version: 0.0.0-use.local
  resolution: "@membrana/fft-analyzer-service@workspace:packages/services/fft-analyzer"
  dependencies:
    "@membrana/core": "npm:*"
    "@membrana/audio-engine-service": "npm:*"
  languageName: unknown
  linkType: soft
`);
    const violations = findGraphSuspicions(parseWorkspaceGraph(broken));

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: 'service-depends-on-core-only',
      from: '@membrana/fft-analyzer-service',
      fromPath: 'packages/services/fft-analyzer',
      to: '@membrana/audio-engine-service',
    });
  });

  it('детекторы выведены из правила сервисов (§1e) — не краснеют', () => {
    const detectors = HEALTHY_LOCK.concat(`
"@membrana/drone-detector@workspace:packages/services/detectors/drone":
  version: 0.0.0-use.local
  resolution: "@membrana/drone-detector@workspace:packages/services/detectors/drone"
  dependencies:
    "@membrana/core": "npm:*"
    "@membrana/audio-engine-service": "npm:*"
  languageName: unknown
  linkType: soft
`);
    expect(findGraphSuspicions(parseWorkspaceGraph(detectors))).toEqual([]);
  });
});

describe('циклы', () => {
  it('на здоровом графе циклов нет', () => {
    expect(findCycles(parseWorkspaceGraph(HEALTHY_LOCK))).toEqual([]);
  });

  it('взаимная зависимость двух пакетов названа кругом', () => {
    const cyclic = HEALTHY_LOCK.replace(
      `  resolution: "@membrana/core@workspace:packages/core"
  dependencies:
    zod: "npm:^3.23.8"`,
      `  resolution: "@membrana/core@workspace:packages/core"
  dependencies:
    "@membrana/agenda": "npm:*"`,
    );
    const cycles = findCycles(parseWorkspaceGraph(cyclic));

    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual([
      '@membrana/core',
      '@membrana/agenda',
      '@membrana/core',
    ]);
  });
});

describe('вид ребра по манифесту', () => {
  const manifest = JSON.stringify({
    name: '@membrana/fft-analyzer-service',
    dependencies: { '@membrana/core': '*' },
    devDependencies: { '@membrana/audio-engine-service': '*' },
    peerDependencies: { react: '^18' },
  });

  it('зависимость прода названа прод-ребром', () => {
    expect(classifyEdgeKind(manifest, '@membrana/core')).toBe('prod');
  });

  it('зависимость сборки названа своим видом — это вопрос, а не приговор', () => {
    expect(classifyEdgeKind(manifest, '@membrana/audio-engine-service')).toBe('dev');
  });

  it('ребра в манифесте нет — след lock-файла устарел', () => {
    expect(classifyEdgeKind(manifest, '@membrana/device-board')).toBe('absent');
  });

  it('манифест не прочитан или сломан — отказ назвать вид, а не догадка', () => {
    expect(classifyEdgeKind(null, '@membrana/core')).toBe('unknown');
    expect(classifyEdgeKind('{ это не json', '@membrana/core')).toBe('unknown');
  });

  it('адрес манифеста строится от пути рабочей области', () => {
    expect(manifestPathOf('packages/services/fft-analyzer')).toBe(
      'packages/services/fft-analyzer/package.json',
    );
    expect(manifestPathOf('apps/client/')).toBe('apps/client/package.json');
  });
});

describe('предмет для модели', () => {
  it('несёт числа, адреса и оговорку источника, а не рассуждение', () => {
    const subject = renderGraphSubject(parseWorkspaceGraph(HEALTHY_LOCK));

    expect(subject).toContain('Рабочих областей: 4');
    expect(subject).toContain('@membrana/client (apps/client) → @membrana/core');
    expect(subject).toContain('devDependencies');
    expect(subject).not.toMatch(/типичн/i);
  });

  it('прод-ребро названо нарушением, ребро сборки — вопросом, непрочитанный манифест — отказом', () => {
    const base = {
      rule: 'service-depends-on-core-only',
      from: '@membrana/fft-analyzer-service',
      fromPath: 'packages/services/fft-analyzer',
      to: '@membrana/audio-engine-service',
      reason: 'сервис зависит только от core, а зависит от @membrana/audio-engine-service',
      manifestPath: 'packages/services/fft-analyzer/package.json',
    };
    const resolved: ResolvedSuspicion[] = [
      { ...base, kind: 'prod' },
      { ...base, from: '@membrana/a-service', kind: 'dev' },
      { ...base, from: '@membrana/b-service', kind: 'unknown' },
    ];
    const subject = renderGraphSubject(parseWorkspaceGraph(HEALTHY_LOCK), resolved);

    expect(subject).toContain('нарушений прода: 1');
    expect(subject).toContain('вопросов: 1');
    expect(subject).toContain('не выяснено: 1');
    expect(subject).toContain('НАРУШЕНИЕ §1 — зависимость прода');
    expect(subject).toContain('ВОПРОС — только сборка/тесты, не приговор');
    expect(subject).toContain('НЕ ВЫЯСНЕНО — манифест не прочитан, проверить руками');
    expect(subject).toContain('packages/services/fft-analyzer/package.json');
  });

  it('подозрение попадает в предмет таблицей с путём', () => {
    const broken = HEALTHY_LOCK.replace(
      `  resolution: "@membrana/core@workspace:packages/core"
  dependencies:
    zod: "npm:^3.23.8"`,
      `  resolution: "@membrana/core@workspace:packages/core"
  dependencies:
    "@membrana/agenda": "npm:*"`,
    );
    const workspaces = parseWorkspaceGraph(broken);
    const resolved: ResolvedSuspicion[] = findGraphSuspicions(workspaces).map((s) => ({
      ...s,
      kind: 'prod' as const,
      manifestPath: manifestPathOf(s.fromPath),
    }));
    const subject = renderGraphSubject(workspaces, resolved);

    expect(subject).toContain('core-has-no-internal-deps');
    expect(subject).toContain('packages/core/package.json');
  });
});
