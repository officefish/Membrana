/**
 * tooling-overview — инвентарь агентского тулинга, ГЕНЕРИРУЕМЫЙ из источника (#554 TF-6).
 *
 * Повод: `AGENTS.md` §Agent tooling был рукописным снимком с датой в заголовке
 * («night-build agent-tooling, 2026-07-08») и держал **11 команд из 253** живых.
 * Агент читал его и пять раз за сессию 16.07 писал заново существующее — живой
 * случай: вместо `yarn neighbors` самописный grep про worktree, и он соврал.
 *
 * Та же болезнь, что у `detection-planning-priorities.mjs` (снимок 06.07 звал
 * писать `fuseDetectorConfidences`, слитый 13.07): рукописный текст, замороженный
 * на дате, поданный как факт. Родня `rt-7` (#539).
 *
 * ПРИНЦИП: инвентарь не пишется руками — он выводится. Рукой живут только ГРАБЛИ
 * («что врёт», «какая привычка стоит») — их из package.json не добыть, и по ним
 * норма уместна (`membrana-tooling-needs`, TF-7).
 *
 * Ядро чистое: на вход — уже прочитанные тексты, на выход — строка. I/O в обвязке.
 */

/** Скрипты, не относящиеся к агентскому циклу (продуктовая сборка/деплой/датасеты). */
const NOISE_PREFIXES = [
  'build', 'dev', 'lint', 'test', 'typecheck', 'clean', 'prepare',
  'templates:', 'dataset:', 'benchmark:', 'calibrate:', 'vdr:', 'report:',
  'detectors:', 'drift:', 'usercase:', 'comp:', 'competition:', 'cabinet:',
  'office:', 'panel:', 'deploy:', 'prisma:', 'bom:', 'tailwind:', 'verify:',
];

/** Группы агентского тулинга — по префиксу команды. */
const GROUPS = [
  { title: 'Задачи и закрытие', match: (n) => /^task|^tasks:|^issues:/u.test(n) },
  { title: 'Ревью', match: (n) => /^code-review|^local-code-review|^save-code-review/u.test(n) },
  { title: 'Ритуалы', match: (n) => /^ritual:|^morning-care|^plan:|^standup|^main-day|^team-evening/u.test(n) },
  { title: 'Команда и решения', match: (n) => /^consilium|^ask|^insight|^research|^cowork|^adr/u.test(n) },
  { title: 'Репозиторий и PR', match: (n) => /^pr:|^repo:|^neighbors|^git|^build:affected/u.test(n) },
  { title: 'Прочее агентское', match: () => true },
];

/** Отфильтровать продуктовые/сборочные скрипты — оставить агентский цикл. */
export function selectAgentScripts(scripts) {
  return Object.keys(scripts ?? {})
    .filter((name) => !NOISE_PREFIXES.some((p) => (p.endsWith(':') ? name.startsWith(p) : name === p)))
    .sort();
}

/** Разложить команды по группам (первое совпадение выигрывает). */
export function groupScripts(names) {
  const out = GROUPS.map((g) => ({ title: g.title, items: [] }));
  for (const name of names) {
    const idx = GROUPS.findIndex((g) => g.match(name));
    out[idx].items.push(name);
  }
  return out.filter((g) => g.items.length > 0);
}

/** Имена скиллов из `.cursor/skills/README.md` (строки-ссылки на каталоги). */
export function extractSkillNames(readmeMd) {
  const names = [];
  for (const m of String(readmeMd ?? '').matchAll(/`(membrana-[a-z0-9-]+)`/gu)) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names.sort();
}

/** Экспортируемые чистые леммы из текста `scripts/lib/*.mjs`. */
export function extractLibExports(fileText) {
  const names = [];
  for (const m of String(fileText ?? '').matchAll(/^export function ([a-zA-Z0-9_]+)/gmu)) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

/**
 * Собрать обзор.
 *
 * @param {{ scripts: object, skillsReadme: string, libs: {file: string, exports: string[]}[], hooks: string[] }} input
 */
export function buildToolingOverview(input) {
  const names = selectAgentScripts(input.scripts);
  const groups = groupScripts(names);
  const lines = [
    '# Инвентарь агентского тулинга (генерируется)',
    '',
    '> `yarn tooling:overview` — вывод собран из `package.json`, `.cursor/skills/README.md`,',
    '> экспортов `scripts/lib/*.mjs` и `.githooks/`. **Рукой не ведётся и не коммитится:**',
    '> рукописный снимок уже протухал (11 команд из 253 на 08.07) и стоил пяти повторов',
    '> «написал заново существующее» за одну сессию.',
    '',
    `**Команд агентского цикла: ${names.length}** (всего в package.json: ${Object.keys(input.scripts ?? {}).length})`,
    '',
  ];
  for (const g of groups) {
    lines.push(`## ${g.title}`, '');
    for (const item of g.items) lines.push(`- \`yarn ${item}\``);
    lines.push('');
  }
  if (input.skillsReadme) {
    const skills = extractSkillNames(input.skillsReadme);
    lines.push(`## Скиллы (${skills.length})`, '', ...skills.map((s) => `- \`${s}\``), '');
  }
  if (input.libs?.length) {
    lines.push('## Чистые леммы `scripts/lib` — переиспользовать, не писать заново', '');
    for (const lib of input.libs) {
      if (lib.exports.length === 0) continue;
      lines.push(`- **${lib.file}**: ${lib.exports.map((e) => `\`${e}\``).join(', ')}`);
    }
    lines.push('');
  }
  if (input.hooks?.length) {
    lines.push('## Хуки `.githooks/`', '', ...input.hooks.map((h) => `- \`${h}\``), '');
  }
  lines.push(
    '---',
    '',
    '**Грабли и уроки — НЕ здесь:** они рукописные (генератор их не добудет) и живут',
    'в `AGENTS.md` §Agent tooling. Обязательство обновлять — `membrana-tooling-needs` (TF-7).',
  );
  return lines.join('\n');
}
