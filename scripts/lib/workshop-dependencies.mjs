/**
 * checkWorkshopDependencies — зуб иерархии мастерских (tasks-workshop V1 / EPIC V1).
 *
 * Предикаты:
 *  (1) ровно одна role=primary на дом (house);
 *  (2) любая role=derivative имеет непустой dependentOn;
 *  (3) mirrorsFrom == worksOn(dependentOn[0]) — иначе warning (DoD M1).
 *  (+ ) rulesVersion манифеста vs semantics.rulesVersion — warning при расхождении.
 *
 * Чистая функция: без сети и FS. Канон: docs/audit/workshop-semantics.json,
 * docs/meeting/tasks-workshop/EPIC.md (V1), seanse m1-adress.
 */

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Нормализовать POSIX-путь (без ведущего ./, без хвостового / кроме корня).
 * @param {string} p
 * @returns {string}
 */
export function normalizeRepoPath(p) {
  if (!isNonEmptyString(p)) return '';
  let s = p.replace(/\\/gu, '/').replace(/^\.\//u, '');
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

/**
 * Дом мастерской по worksOn: файл → dirname, каталог → сам путь.
 * @param {string} worksOn
 * @returns {string}
 */
export function houseFromWorksOn(worksOn) {
  const w = normalizeRepoPath(worksOn);
  if (!w) return '';
  // файл (есть расширение после последнего сегмента) → родитель
  const base = w.split('/').pop() ?? '';
  if (base.includes('.') && !w.endsWith('/')) {
    const i = w.lastIndexOf('/');
    return i <= 0 ? w : w.slice(0, i);
  }
  return w;
}

/**
 * @typedef {{ path: string, home: string, manifest: object }} WorkshopEntry
 * @typedef {{ workshop: string, issue: string, level: 'error'|'warning' }} Violation
 */

/**
 * Проверить иерархию primary/derivative.
 *
 * @param {WorkshopEntry[]} entries
 * @param {{ rulesVersion?: string, dependency?: object, roles?: string[] }} [semantics]
 * @returns {{ violations: Violation[], warnings: Violation[], ok: boolean }}
 */
export function checkWorkshopDependencies(entries, semantics = {}) {
  const violations = [];
  const warnings = [];
  const roles = Array.isArray(semantics.roles) ? semantics.roles : ['primary', 'derivative'];
  const dep = semantics.dependency ?? {};
  const mirrorsLevel = dep.mirrorsFromMismatch === 'error' ? 'error' : 'warning';
  const rulesLevel = dep.rulesVersionMismatch === 'error' ? 'error' : 'warning';

  const byHome = new Map();
  for (const e of entries) {
    const home = normalizeRepoPath(e.home);
    byHome.set(home, e);
  }

  /** @type {Map<string, WorkshopEntry[]>} */
  const primariesByHouse = new Map();

  for (const e of entries) {
    const m = e.manifest;
    const workshop = normalizeRepoPath(e.home) || e.path;
    const role = m?.role;

    if (role != null && !roles.includes(role)) {
      violations.push({
        workshop,
        issue: `role «${role}» не из ${roles.join('|')}`,
        level: 'error',
      });
      continue;
    }

    if (role === 'primary') {
      const house = houseFromWorksOn(m.worksOn) || normalizeRepoPath(e.home);
      if (!primariesByHouse.has(house)) primariesByHouse.set(house, []);
      primariesByHouse.get(house).push(e);
    }

    if (role === 'derivative') {
      const depOn = m.dependentOn;
      if (!Array.isArray(depOn) || depOn.length === 0 || !depOn.every(isNonEmptyString)) {
        violations.push({
          workshop,
          issue: 'role=derivative без непустого dependentOn[]',
          level: 'error',
        });
      } else {
        const parentHome = normalizeRepoPath(depOn[0]);
        const parent = byHome.get(parentHome);
        if (!parent) {
          violations.push({
            workshop,
            issue: `dependentOn[0]=«${parentHome}» — мастерская-опекун не найдена`,
            level: 'error',
          });
        } else {
          const expected = normalizeRepoPath(parent.manifest?.worksOn);
          const mirror = normalizeRepoPath(m.mirrorsFrom);
          if (!isNonEmptyString(m.mirrorsFrom)) {
            const item = {
              workshop,
              issue: 'role=derivative без mirrorsFrom',
              level: mirrorsLevel,
            };
            if (mirrorsLevel === 'error') violations.push(item);
            else warnings.push(item);
          } else if (mirror !== expected) {
            const item = {
              workshop,
              issue: `mirrorsFrom «${mirror}» ≠ worksOn опекуна «${expected}»`,
              level: mirrorsLevel,
            };
            if (mirrorsLevel === 'error') violations.push(item);
            else warnings.push(item);
          }
        }
      }
    }

    if (isNonEmptyString(semantics.rulesVersion) && isNonEmptyString(m.rulesVersion)) {
      if (String(m.rulesVersion) !== String(semantics.rulesVersion)) {
        const item = {
          workshop,
          issue: `rulesVersion «${m.rulesVersion}» ≠ semantics «${semantics.rulesVersion}»`,
          level: rulesLevel,
        };
        if (rulesLevel === 'error') violations.push(item);
        else warnings.push(item);
      }
    }
  }

  if (dep.exactlyOnePrimaryPerHouse !== false) {
    for (const [house, list] of primariesByHouse) {
      if (list.length > 1) {
        violations.push({
          workshop: house,
          issue: `две или более role=primary на дом «${house}» (${list.map((x) => normalizeRepoPath(x.home)).join(', ')})`,
          level: 'error',
        });
      }
    }
  }

  return {
    violations,
    warnings,
    ok: violations.length === 0,
  };
}
