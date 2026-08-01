/**
 * tooling-atlas — агрегатор контейнера контейнеров (спринт tooling-atlas /
 * atlas-report-plane #1097).
 *
 * Контейнер контейнеров: его элементы — сами дома с мастерскими. Атлас НЕ хранит
 * описаний, а собирает производный индекс из README + workshop.manifest каждого
 * контейнера. Источник истины остаётся в контейнерах; ATLAS.md и mintlify-страница —
 * производные (руками не правятся, дрейф ловит --check).
 *
 * Ссылки и группировка — по `home` (каталог манифеста). `worksOn` — «над чем
 * работает» мастерская, не id строки. Плоскости: report (`docs/audit/*`) /
 * domain / meta.
 *
 * Канон: docs/tooling-atlas/README.md · паттерны GROUP_CONTAINERIZATION + HOME_WORKSHOP.
 * Операции — чтение, идемпотентны.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { listWorkshopManifests, validateWorkshop } from './validate-workshop.mjs';
import { discoverHomes } from './atlas-discovery.mjs';
import { collectUsage, renderUsageSection, workshopsWithoutUsage } from './atlas-usage.mjs';

const MANDATORY = ['audit', 'decompose', 'inspectElement'];

const PLANE_ORDER = { report: 0, domain: 1, meta: 2 };
const PLANE_HEADING = {
  report: 'Плоскость отчётов (`docs/audit`)',
  domain: 'Domain (предметные дома)',
  meta: 'Meta (атлас)',
};

// Markdown-ссылку → её текст: `[текст](rel)` относителен к README-источнику и ломается
// при агрегации в другое место (ATLAS.md / mintlify). Оставляем только текст.
const stripLinks = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1');

/** Выжимка README: H1 + первый непустой не-заголовочный абзац (ссылки → текст). */
function readmeDigest(readmePath) {
  if (!existsSync(readmePath)) return { title: null, summary: null };
  const lines = readFileSync(readmePath, 'utf8').split(/\r?\n/u);
  let title = null;
  let summary = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!title && line.startsWith('# ')) { title = line.slice(2).trim(); continue; }
    // summary — первый прозаический абзац, НЕ завязан на наличие H1.
    if (!summary && line !== '' && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('<!--')) {
      summary = stripLinks(line);
    }
    if (title && summary) break;
  }
  return { title, summary };
}

/** Семья (совместимость `--decompose --by family`) — по `home`. */
function familyOf(home) {
  if (home === 'docs/audit' || home.startsWith('docs/audit/')) return 'audit-family';
  if (home === 'docs/tooling-atlas') return 'meta';
  return 'domain';
}

/** Плоскость индекса: report-plane vs domain vs meta. */
export function planeOf(home) {
  if (home === 'docs/audit' || home.startsWith('docs/audit/')) return 'report';
  if (home === 'docs/tooling-atlas') return 'meta';
  return 'domain';
}

/**
 * @param {unknown} role
 * @returns {'primary'|'derivative'|null}
 */
function normalizeRole(role) {
  if (role === 'primary' || role === 'derivative') return role;
  return null;
}

/**
 * Обнаружить контейнеры: каждый workshop.manifest.json = контейнер.
 * @param {string} repoRoot
 * @returns {{worksOn, home, name, kit, verbs, missingVerbs, title, summary, family, plane, role, valid, warnings, problems}[]}
 */
export function discoverContainers(repoRoot) {
  const out = [];
  // Обнаружение — по README и RootPolicy (§3), а не по манифесту: критерий сменил
  // `atlas-discovery.mjs`, здесь остаётся сбор полей. Дом без манифеста в индекс ПОПАДАЕТ
  // третьим видом записи — заводить 33 манифеста «для зелени» §3 запрещает.
  for (const rec of discoverHomes(repoRoot)) {
    const dir = join(repoRoot, rec.home);
    const manifestPath = join(dir, 'workshop.manifest.json');
    let manifest = null;
    if (rec.hasManifest) {
      try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { manifest = null; }
    }
    const v = rec.hasManifest ? validateWorkshop(manifestPath, repoRoot) : { valid: true, warnings: [], problems: [] };
    const verbs = manifest?.verbs ?? {};
    const present = MANDATORY.filter((k) => typeof verbs[k] === 'string' && verbs[k].trim() !== '');
    const domainTools = Array.isArray(verbs.domain)
      ? verbs.domain
          .filter((item) => item !== null && typeof item === 'object' && !Array.isArray(item))
          .map((item) => ({
            name: String(item.name ?? '').trim(),
            worksOn: String(item.worksOn ?? '').trim(),
            tool: typeof item.tool === 'string' && item.tool.trim() !== '' ? item.tool.trim() : null,
          }))
      : [];
    const missingVerbs = rec.hasManifest ? MANDATORY.filter((k) => !present.includes(k)) : [];
    const home = rec.home;
    const worksOn = typeof manifest?.worksOn === 'string' ? manifest.worksOn : home;
    const { title, summary } = readmeDigest(join(dir, 'README.md'));
    out.push({
      worksOn,
      home,
      kind: rec.kind,
      name: manifest?.name ?? '—',
      kit: manifest?.kit ?? null,
      verbs: present,
      // Команды, а не имена: `audit` — ключ, `yarn repo:branches` — дверь. Печатать ключ
      // значит предлагать вызов, которого не существует (тот же дефект, что пол сессии
      // поймал у себя 31.07).
      commands: {
        ...Object.fromEntries(
          Object.entries(verbs)
            .filter(([, command]) => typeof command === 'string' && command.trim() !== '')
            .map(([name, command]) => [name, command.trim()]),
        ),
        ...Object.fromEntries(domainTools.filter((item) => item.tool).map((item) => [item.name, item.tool])),
      },
      entryCommand: present.length > 0 ? String(verbs[present[0]]).trim() : null,
      domainTools,
      // `usage` — поле-сосед из поправки Ф1: что даёт вызов и как выглядит вывод. Отдаётся
      // как есть; форму проверяет валидатор, а не справочник — двойная проверка разъехалась
      // бы первой же правкой схемы.
      usage: manifest?.usage ?? null,
      missingVerbs,
      title,
      summary,
      family: familyOf(home),
      plane: planeOf(home),
      role: normalizeRole(manifest?.role),
      valid: v.valid,
      warnings: v.warnings,
      problems: v.problems,
    });
  }
  return out.sort((a, b) => {
    const pa = PLANE_ORDER[a.plane] ?? 9;
    const pb = PLANE_ORDER[b.plane] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.home < b.home ? -1 : a.home > b.home ? 1 : 0;
  });
}

/** audit — здоровье контейнеров и их мастерских. @returns {{healthy, warned, broken, rows}} */
export function auditContainers(repoRoot) {
  const all = discoverContainers(repoRoot);
  // Здоровье считается ТОЛЬКО по мастерским. Дом без манифеста не «здоров» — у него нечего
  // проверять, и зачесть его в здоровые значило бы раздуть числитель тридцатью домами,
  // которых валидатор в глаза не видел. Их место — отдельный счётчик.
  const rows = all.filter((r) => r.kind === 'workshop');
  return {
    healthy: rows.filter((r) => r.valid && r.warnings.length === 0).length,
    warned: rows.filter((r) => r.valid && r.warnings.length > 0).length,
    broken: rows.filter((r) => !r.valid).length,
    homesWithoutWorkshop: all.length - rows.length,
    rows,
  };
}

const DECOMPOSE_BY = {
  family: (c) => c.family,
  plane: (c) => c.plane,
  holder: (c) => c.name,
  kit: (c) => (typeof c.kit === 'string' ? c.kit : 'null'),
};

/** decompose — раскладка контейнеров (значения = `home`). @returns {Map<string,string[]>} */
export function decomposeContainers(containers, by) {
  const keyOf = DECOMPOSE_BY[by] ?? DECOMPOSE_BY.family;
  const out = new Map();
  for (const c of containers) {
    const k = keyOf(c) ?? '—';
    out.set(k, [...(out.get(k) ?? []), c.home]);
  }
  return out;
}

/** inspectElement — один контейнер вглубь (по home или worksOn). */
export function inspectContainer(repoRoot, home) {
  const c = discoverContainers(repoRoot).find((x) => x.worksOn === home || x.home === home);
  return c ?? null;
}

const cell = (v) => String(v ?? '—').replace(/[|\r\n]+/gu, ' ').trim();
const verbMark = (c) => MANDATORY.map((k) => (c.verbs.includes(k) ? k : `~~${k}~~`)).join(' · ');
const roleMark = (c) => (c.role == null ? '—' : c.role);

/**
 * Производный индекс ATLAS.md. Стабильный (без волатильных date/sha), поэтому
 * `--render` байт-идемпотентен, а `--check` — плоское сравнение.
 * Ссылки — от `docs/tooling-atlas/registry/` (3 уровня вглубь) → `../../../<home>`.
 * Якорь строки = **home**, не worksOn.
 */
export function renderAtlasRegistry(containers, opts = {}) {
  // Вторым параметром исторически приходила легаси-опция `{date, sha}` (не используется).
  // Занять эту позицию массивом значило бы уронить всякий старый вызов — поймано своим же
  // прогоном смежных зубов. Поэтому именованное поле: чужой объект деградирует в пустоту,
  // а не в исключение.
  const namespaces = Array.isArray(opts?.namespaces) ? opts.namespaces : [];
  const planes = decomposeContainers(containers, 'plane');
  const workshops = containers.filter((c) => c.kind === 'workshop');
  const homes = containers.filter((c) => c.kind !== 'workshop');
  const lines = [];
  lines.push('# ATLAS — контейнеры проекта (производный индекс, руками не править)');
  lines.push('');
  // Шапка называет ИСТИННЫЙ источник обнаружения. Прежняя говорила «docs/**/workshop.manifest.json»
  // и врала дважды: обнаружение шло по манифесту вопреки §3, а после двухклассовой RootPolicy
  // область перестала быть только `docs/**`.
  lines.push('> Производный · Обнаружение: `README.md` + `RootPolicy` (§3). Поля мастерской: `workshop.manifest.json`. Неймспейсы: `docs/namespaces/REGISTRY.json`.');
  lines.push('> Пересобрать: `yarn tooling:atlas --render`. Дрейф ловит `yarn tooling:atlas --check`.');
  lines.push('> Ссылка = `home` каталога. `docs/tasks` (domain) ≠ `docs/audit/tasks` (report, отчёты про задачи).');
  lines.push('> **Дом без мастерской — законное состояние**, а не дефект: мастерская есть подтип дома.');
  lines.push('');
  lines.push(`Домов: **${containers.length}** · из них мастерских: **${workshops.length}** · домов без мастерской: **${homes.length}** · плоскостей: **${planes.size}** · с полным набором из 3 глаголов: **${workshops.filter((c) => c.missingVerbs.length === 0).length}**.`);
  lines.push('');

  for (const plane of ['report', 'domain', 'meta']) {
    const rows = containers.filter((c) => c.plane === plane && c.kind === 'workshop');
    if (rows.length === 0) continue;
    lines.push(`## ${PLANE_HEADING[plane]}`);
    lines.push('');
    lines.push('| Контейнер (`home`) | role | Входной глагол | Мастерская (глаголы) | kit | Про что |');
    lines.push('|--------------------|------|----------------|----------------------|-----|---------|');
    for (const c of rows) {
      const flag = c.valid ? '' : ' ✗';
      const entry = c.entryCommand ? `\`${cell(c.entryCommand)}\`` : '—';
      lines.push(`| [${cell(c.home)}](../../../${c.home}/README.md)${flag} | ${roleMark(c)} | ${entry} | ${verbMark(c)} | ${cell(c.kit)} | ${cell(c.summary).slice(0, 90)} |`);
    }
    lines.push('');
  }

  if (homes.length > 0) {
    lines.push('## Дома без мастерской');
    lines.push('');
    lines.push('Законное состояние (§3): группа есть, оснастка не заведена. Манифесты «для зелени» не заводятся.');
    lines.push('');
    lines.push('| Дом (`home`) | Про что |');
    lines.push('|--------------|---------|');
    for (const c of homes) {
      lines.push(`| [${cell(c.home)}](../../../${c.home}/README.md) | ${cell(c.summary).slice(0, 110)} |`);
    }
    lines.push('');
  }

  const domainTools = workshops.flatMap((c) => c.domainTools.map((item) => ({ home: c.home, ...item })));
  if (domainTools.length > 0) {
    lines.push('## Предметные инструменты мастерских');
    lines.push('');
    lines.push('Команды из `verbs.domain`; это полноправные двери мастерской, а не скрытые примечания к трём общим глаголам.');
    lines.push('');
    lines.push('| Контейнер (`home`) | Инструмент | Команда | `worksOn` |');
    lines.push('|--------------------|------------|---------|-----------|');
    for (const item of domainTools) {
      const command = item.tool ? `\`${cell(item.tool)}\`` : '—';
      lines.push(`| [${cell(item.home)}](../../../${item.home}/README.md) | \`${cell(item.name)}\` | ${command} | \`${cell(item.worksOn)}\` |`);
    }
    lines.push('');
  }

  // Проекция реестра — ОТДЕЛЬНОЙ секцией (§3). Атлас потребитель-агрегатор: источник истины
  // о членстве остаётся в REGISTRY.json, здесь только проекция, и «строка ATLAS» истиной
  // не является.
  lines.push('## Неймспейсы (проекция реестра)');
  lines.push('');
  if (namespaces.length === 0) {
    // Пусто ≠ «всё припарковано»: §1 объявил сиротство честным исходом.
    lines.push('Правил членства **ноль**. Это НЕ значит «всё припарковано» — значит, правило ещё не написано.');
  } else {
    lines.push('Источник истины — [`docs/namespaces/REGISTRY.json`](../../../docs/namespaces/REGISTRY.json); здесь производная проекция.');
    lines.push('');
    lines.push('| `id` | Держатель | Правило членства | Контейнер |');
    lines.push('|------|-----------|------------------|-----------|');
    for (const ns of namespaces) {
      lines.push(`| ${cell(ns.id)} | ${cell(ns.holder)} | ${cell(ns.membership?.kind)}: \`${cell(ns.membership?.value)}\` | ${cell(ns.containerKind)} |`);
    }
  }
  lines.push('');

  // Примеры вызова — из `usage` манифестов (поправка Ф1). Справочник агрегирует, не сочиняет.
  lines.push(...renderUsageSection(collectUsage(containers), workshops.length));
  const without = workshopsWithoutUsage(containers);
  if (without.length > 0) {
    // Поимённо, а не долей: заполнение идёт поштучно, и без перечня «почти всё заполнено»
    // через месяц будет означать что угодно.
    lines.push(`Без примеров: ${without.map((h) => `\`${h}\``).join(' · ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

// MDX-безопасно: помимо |\r\n нейтрализуем { } < > — иначе README с `{config}`/`<Tag>`
// в тексте ломает mintlify-билд (JSX-инъекция в .mdx).
const mdxSafe = (v) => cell(v).replace(/[{}<>]/gu, (ch) => ({ '{': '｛', '}': '｝', '<': '‹', '>': '›' }[ch]));

/** Витрина mintlify (.mdx). Группировка по plane; заголовок несёт `home`. */
export function renderMintlifyPage(containers) {
  const lines = [];
  lines.push('---');
  lines.push('title: Контейнеры и мастерские');
  lines.push('description: Общая документация по туллингу — все контейнеры проекта и их мастерские (производный индекс).');
  lines.push('---');
  lines.push('');
  lines.push('{/* Производная страница — генерится `yarn tooling:atlas --render`. Руками не править. */}');
  lines.push('');
  lines.push('Каждый контейнер несёт свою группу и мастерскую (три глагола: осмотр · декомпозиция · рассмотрение). Источник истины — `README.md` и `workshop.manifest.json` каждого контейнера. Ссылка/адрес — **`home`**. `docs/tasks` (задания) ≠ `docs/audit/tasks` (отчёты про задачи).');
  lines.push('');

  for (const plane of ['report', 'domain', 'meta']) {
    // Витрина показывает МАСТЕРСКИЕ: у дома без манифеста нет ни имени, ни глаголов, и
    // страница из тридцати заголовков «—» была бы шумом, а не документацией. Их счёт даётся
    // строкой ниже — умолчать о них тоже нельзя.
    const rows = containers.filter((c) => c.plane === plane && c.kind === 'workshop');
    if (rows.length === 0) continue;
    lines.push(`## ${mdxSafe(PLANE_HEADING[plane])}`);
    lines.push('');
    for (const c of rows) {
      lines.push(`### ${mdxSafe(c.name)} (\`${mdxSafe(c.home)}\`)`);
      lines.push('');
      if (c.entryCommand) lines.push(`Входной глагол: \`${mdxSafe(c.entryCommand)}\``);
      if (c.entryCommand) lines.push('');
      if (c.summary) lines.push(mdxSafe(c.summary));
      lines.push('');
      lines.push(`- **Плоскость:** ${mdxSafe(c.plane)}`);
      lines.push(`- **role:** ${mdxSafe(roleMark(c))}`);
      lines.push(`- **worksOn:** \`${mdxSafe(c.worksOn)}\``);
      lines.push(`- **Глаголы мастерской:** ${MANDATORY.map((k) => (c.verbs.includes(k) ? `\`${k}\`` : `~~${k}~~`)).join(', ')}`);
      if (c.domainTools.length > 0) {
        const tools = c.domainTools.map((item) => `\`${mdxSafe(item.name)}\` → ${item.tool ? `\`${mdxSafe(item.tool)}\`` : 'команда не объявлена'}`);
        lines.push(`- **Предметные инструменты:** ${tools.join('; ')}`);
      }
      lines.push(`- **kit:** \`${mdxSafe(c.kit)}\``);
      lines.push('');
    }
  }
  const homes = containers.filter((c) => c.kind !== 'workshop');
  if (homes.length > 0) {
    lines.push('## Дома без мастерской');
    lines.push('');
    lines.push(`Ещё **${homes.length}** домов несут группу, но оснастки не имеют — законное состояние (мастерская есть подтип дома, а не обязанность каждого). Перечень — в \`docs/tooling-atlas/registry/ATLAS.md\`.`);
    lines.push('');
  }
  return lines.join('\n');
}
