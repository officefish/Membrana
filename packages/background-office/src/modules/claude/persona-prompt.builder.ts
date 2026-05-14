import type { ContextRef } from '../../types/claude.types';

const MAX_CONTEXT_CHARS = 90_000;
const MAX_PROMPT_CHARS = 16_000;
const MAX_WHITE_PAPER_CHARS = 30_000;
const MAX_ARCH_CHARS = 6_000;
const MAX_TASK_TEXT_CHARS = 8_000;

export interface PersonaMeta {
  role: string;
  /** Display name for assembled prompt */
  promptLabel: string;
}

export const PERSONA_META: Record<string, PersonaMeta> = {
  vesnin: { role: 'Teamlead', promptLabel: 'PROMPT_TEAMLEAD.md' },
  dynin: { role: 'Математик', promptLabel: 'PROMPT_MATHEMATICIAN.md' },
};

export interface BuildPersonaPromptInput {
  persona: string;
  personaMeta: PersonaMeta;
  personaPrompt: string;
  question: string;
  includeStrategicDocs: boolean;
  whitePaper?: string;
  architecture?: string;
  services?: string;
  ticketBlock: string;
  ticketSourceLabel: string;
  taskInline?: string;
}

export function buildPersonaUserMessage(input: BuildPersonaPromptInput): {
  text: string;
  ticketSourceLabel: string;
} {
  const personaPrompt = input.personaPrompt.slice(0, MAX_PROMPT_CHARS);

  let strategicContext = '';
  let architecture = '';
  let services = '';
  if (input.includeStrategicDocs) {
    strategicContext =
      input.whitePaper?.slice(0, MAX_WHITE_PAPER_CHARS) ?? '';
    architecture = input.architecture?.slice(0, MAX_ARCH_CHARS) ?? '';
    services = input.services?.slice(0, MAX_ARCH_CHARS) ?? '';
  }

  const taskInline = input.taskInline
    ? input.taskInline.slice(0, MAX_TASK_TEXT_CHARS)
    : '';

  const parts: string[] = [];

  parts.push(
    `Ты отвечаешь в роли персонажа «${input.persona}» (${input.personaMeta.role}) виртуальной команды Membrana.`,
    `Ниже — твой системный промпт, контекст проекта и сама задача с вопросом.`,
    `Отвечай по существу, в характере персонажа, без пересказа, что такое Membrana или как зовут роль.`,
    `Ответ — на русском, в свободной форме, но кратко: 4–14 строк, при необходимости список.`,
    `Если данных не хватает — задай 1–2 уточняющих вопроса, не выдумывай факты.`,
    '',
    '---',
    `## Системный промпт персонажа (${input.personaMeta.promptLabel})`,
    '',
    personaPrompt,
    '',
  );

  if (input.includeStrategicDocs) {
    if (strategicContext) {
      parts.push('---', '## Стратегический контекст (WHITE_PAPER.md)', '', strategicContext, '');
    }
    if (architecture) {
      parts.push('---', '## Архитектура (ARCHITECTURE.md — выдержка)', '', architecture, '');
    }
    if (services) {
      parts.push('---', '## Сервисы (SERVICES.md — выдержка)', '', services, '');
    }
  }

  if (input.ticketBlock || taskInline) {
    parts.push('---', '## Контекст задачи', '');
    if (input.ticketBlock) {
      parts.push(`Источник: ${input.ticketSourceLabel}`, '', input.ticketBlock, '');
    }
    if (taskInline) {
      parts.push(taskInline, '');
    }
  }

  parts.push('---', '## Вопрос', '', input.question, '');

  const assembled = parts.join('\n');
  if (assembled.length > MAX_CONTEXT_CHARS) {
    return {
      text:
        assembled.slice(0, MAX_CONTEXT_CHARS) +
        `\n\n[… общий контекст обрезан до ${MAX_CONTEXT_CHARS} символов …]\n`,
      ticketSourceLabel: input.ticketSourceLabel,
    };
  }
  return { text: assembled, ticketSourceLabel: input.ticketSourceLabel };
}

export function contextRefLabel(ref: ContextRef): string {
  if (ref.source === 'github-issue') {
    return `GitHub Issue #${ref.issueNumber}`;
  }
  if (ref.source === 'linear') {
    return `Linear ${ref.ticketId}`;
  }
  return 'raw text';
}
