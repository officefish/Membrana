/**
 * Сборка промпта и обёртка протокола консилиума (общее для consilium + opencode-consilium).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CONSILIUM_PROMPT_FILE,
  CONSILIUM_ROLES,
  formatRoleOrderLine,
} from './consilium-paths.mjs';

export const MAX_PROMPT_SPEC_CHARS = 12_000;
export const MAX_VIRTUAL_TEAM_CHARS = 8_000;
export const MAX_PERSONA_CHARS = 4_000;
export const MAX_CONTEXT_CHARS = 6_000;
export const MAX_TOPIC_CHARS = 12_000;
export const MAX_TICKET_CHARS = 20_000;
export const MAX_ASSEMBLED_CHARS = 95_000;

export const PERSONA_FILES = {
  teamlead: 'docs/virtual-team/PROMPT_TEAMLEAD.md',
  structurer: 'docs/virtual-team/PROMPT_STRUCTURER.md',
  mathematician: 'docs/virtual-team/PROMPT_MATHEMATICIAN.md',
  musician: 'docs/virtual-team/PROMPT_MUSICIAN.md',
  layout: 'docs/virtual-team/PROMPT_LAYOUT_DEVELOPER.md',
};

export const CONTEXT_FILES = [
  { path: 'docs/ARCHITECTURE.md', title: 'Архитектура' },
  { path: 'docs/DESIGN.md', title: 'Дизайн' },
  { path: 'docs/SERVICES.md', title: 'Сервисы' },
];

export function readBounded(absPath, maxChars, optional = false) {
  if (!existsSync(absPath)) {
    if (optional) return null;
    throw new Error(`Файл не найден: ${absPath}`);
  }
  let text = readFileSync(absPath, 'utf8');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + `\n\n[… обрезано до ${maxChars} символов …]\n`;
  }
  return text;
}

export function formatGhIssue(issue) {
  const lines = [
    `# GitHub Issue #${issue.number}: ${issue.title}`,
    `URL: ${issue.url}`,
    `State: ${issue.state}`,
    '',
    (issue.body || '').trim() || '(пусто)',
  ];
  let text = lines.join('\n');
  if (text.length > MAX_TICKET_CHARS) {
    text = text.slice(0, MAX_TICKET_CHARS) + `\n\n[… обрезано …]\n`;
  }
  return text;
}

/**
 * @param {object} opts
 */
export function buildConsiliumPrompt({
  cwd,
  question,
  topicFile,
  ghIssueData,
  noContext,
  compact = false,
  orderedRoles,
  minReplies,
  ragBlock,
  extraBlocks = [],
}) {
  const parts = [];

  const specLimit = compact ? 4_000 : MAX_PROMPT_SPEC_CHARS;
  const virtualLimit = compact ? 2_500 : MAX_VIRTUAL_TEAM_CHARS;
  const spec = readBounded(resolve(cwd, CONSILIUM_PROMPT_FILE), specLimit);
  const virtualTeam = readBounded(resolve(cwd, 'docs/VIRTUAL_TEAM_PROMPT.md'), virtualLimit, true);

  parts.push('## Инструкция консилиума (docs/prompts/CONSILIUM_PROMPT.md)', '', spec, '');

  if (virtualTeam) {
    parts.push('---', '## Координация ролей (выдержка VIRTUAL_TEAM_PROMPT.md)', '', virtualTeam, '');
  }

  parts.push(
    '---',
    '## Порядок ролей на этот сеанс',
    '',
    `Чередуй реплики в этом порядке (циклически, ≥${minReplies} реплик всего):`,
    '',
    formatRoleOrderLine(orderedRoles),
    '',
    'Метки в протоколе:',
    orderedRoles.map((r) => `${r.tag} — ${r.label}`).join('\n'),
    '',
  );

  if (compact) {
    parts.push(
      '---',
      '## Роли (кратко — полные промпты опущены для proxy-сеанса)',
      '',
      CONSILIUM_ROLES.map((r) => `- ${r.tag} **${r.label}** — см. docs/virtual-team/PROMPT_*.md`).join('\n'),
      '',
    );
  } else {
    parts.push('---', '## Системные промпты ролей (сжато)', '');
    for (const role of CONSILIUM_ROLES) {
      const file = PERSONA_FILES[role.key];
      const text = readBounded(resolve(cwd, file), MAX_PERSONA_CHARS, true);
      if (text) {
        parts.push(`### ${role.label} (${file})`, '', text, '');
      }
    }
  }

  if (!noContext) {
    parts.push('---', '## Контекст репозитория', '');
    for (const { path, title } of CONTEXT_FILES) {
      const text = readBounded(resolve(cwd, path), MAX_CONTEXT_CHARS, true);
      if (text) parts.push(`### ${title} (${path})`, '', text, '');
    }
  }

  if (ragBlock) {
    parts.push('---', '## RAG archive context (useLongTerm)', '', ragBlock, '');
  }

  for (const block of extraBlocks) {
    parts.push('---', `## ${block.title}`, '', block.body, '');
  }

  if (ghIssueData) {
    parts.push('---', '## GitHub Issue', '', formatGhIssue(ghIssueData), '');
  }

  if (topicFile) {
    const text = readBounded(resolve(cwd, topicFile), MAX_TOPIC_CHARS);
    parts.push('---', `## Повестка (${topicFile})`, '', text, '');
  }

  parts.push(
    '---',
    '## Вопрос на консилиум',
    '',
    question,
    '',
    '---',
    'Сгенерируй полный протокол по формату из инструкции. Только протокол, без преамбулы «как модель я…».',
  );

  let assembled = parts.join('\n');
  if (assembled.length > MAX_ASSEMBLED_CHARS) {
    assembled =
      assembled.slice(0, MAX_ASSEMBLED_CHARS) +
      `\n\n[… общий промпт обрезан до ${MAX_ASSEMBLED_CHARS} символов …]\n`;
  }
  return assembled;
}

export function wrapConsiliumSeanseFile({
  body,
  question,
  orderedRoles,
  model,
  channel,
  ghIssue,
  topicFile,
  relPath,
}) {
  const stamp = new Date().toISOString();
  const meta = [
    '# Метаданные сеанса',
    '',
    '| Поле | Значение |',
    '|------|----------|',
    `| Дата (UTC) | ${stamp} |`,
    `| Команда | \`${channel}\` |`,
    `| Модель | ${model} |`,
    `| Файл | \`${relPath}\` |`,
    `| Порядок ролей | ${formatRoleOrderLine(orderedRoles)} |`,
  ];
  if (ghIssue) meta.push(`| GitHub Issue | #${ghIssue} |`);
  if (topicFile) meta.push(`| Повестка | \`${topicFile}\` |`);
  meta.push('', '**Вопрос:**', '', question, '', '---', '', body.trim(), '');
  return meta.join('\n');
}
