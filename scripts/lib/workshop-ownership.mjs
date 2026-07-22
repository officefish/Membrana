/**
 * checkOwnership — зуб принадлежности инструмента мастерской (Ф4, заседание home-workshop).
 *
 * Правило: `owner(tool) = workshop(worksOn(tool))` — инструмент принадлежит мастерской
 * того дома, над содержимым которого работает. Зуб проверяет два инварианта:
 *   1) приписка: `declaredWorksOn(tool) == worksOn(манифест, где он лежит)`;
 *   2) уникальность: инструмент ровно в одном манифесте.
 * Инструмент без дома-приёмника — амнистия через Allowlist (`reason`+`expiresWhen`),
 * видимо, без тихого pending.
 *
 * Чистая функция, без сети и файловой системы: вход — извлечённые записи и allowlist.
 * Канон: docs/patterns/HOME_WORKSHOP.md (Ф4).
 */

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Извлечь доменные инструменты мастерской в записи принадлежности.
 * Обязательные глаголы (audit/decompose/inspectElement) — собственные, всегда
 * приписаны верно; проверяются только доменные (специализированные), несущие свой worksOn.
 *
 * @param {object} manifest распарсенный workshop.manifest.json
 * @param {string} home имя дома (каталог манифеста)
 * @returns {{name: string, declaredWorksOn: string, manifestWorksOn: string, home: string}[]}
 */
export function extractOwnedTools(manifest, home) {
  const out = [];
  const manifestWorksOn = manifest?.worksOn;
  const domain = manifest?.verbs?.domain;
  if (Array.isArray(domain)) {
    for (const d of domain) {
      if (d && typeof d === 'object' && isNonEmptyString(d.name)) {
        out.push({
          name: d.name,
          declaredWorksOn: isNonEmptyString(d.worksOn) ? d.worksOn : null,
          manifestWorksOn: isNonEmptyString(manifestWorksOn) ? manifestWorksOn : null,
          home,
        });
      }
    }
  }
  return out;
}

/**
 * Проверить принадлежность по извлечённым записям.
 *
 * @param {{name: string, declaredWorksOn: string|null, manifestWorksOn: string|null, home: string}[]} records
 * @param {{tool: string, reason: string, expiresWhen: string}[]} [allowlist]
 * @returns {{violations: object[], amnestied: object[], ok: object[]}}
 */
export function checkOwnership(records, allowlist = []) {
  const amnesty = new Map(allowlist.map((a) => [a.tool, a]));
  const violations = [];
  const amnestied = [];
  const ok = [];

  // 2) уникальность: имя инструмента ровно в одном манифесте (считаем заранее,
  //    чтобы дубль не попал заодно в ok первым циклом).
  const byName = new Map();
  for (const r of records) byName.set(r.name, (byName.get(r.name) ?? 0) + 1);
  const duplicated = new Set([...byName].filter(([, c]) => c > 1).map(([n]) => n));

  // 1) приписка declaredWorksOn == manifestWorksOn.
  for (const r of records) {
    if (duplicated.has(r.name)) continue; // дубли обрабатываются ниже, не в ok
    if (r.declaredWorksOn === null) {
      // Инструмент без объявленного дома — не «ok» молча (принцип Ф4: без тихого pending).
      violations.push({ ...r, kind: 'no-address', message: `инструмент «${r.name}» без worksOn — адрес не объявлен (${r.home})` });
    } else if (r.declaredWorksOn !== r.manifestWorksOn) {
      if (amnesty.has(r.name)) {
        amnestied.push({ ...r, kind: 'misfiled-amnestied', allow: amnesty.get(r.name) });
      } else {
        violations.push({
          ...r,
          kind: 'misfiled',
          message: `инструмент «${r.name}» работает над «${r.declaredWorksOn}», а лежит в мастерской дома «${r.manifestWorksOn}» (${r.home})`,
        });
      }
    } else {
      ok.push(r);
    }
  }

  for (const name of duplicated) {
    violations.push({
      name,
      kind: 'duplicate',
      message: `инструмент «${name}» объявлен ${byName.get(name)} раз — должен ровно один раз (в одном манифесте)`,
    });
  }

  return { violations, amnestied, ok };
}
