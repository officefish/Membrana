import { ClaudeAPI } from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'fs/promises';

// Исправляет неправильные импорты между пакетами
async function fixImports(filePath) {
  const content = await readFile(filePath, 'utf-8');

  const claude = new ClaudeAPI({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [
      {
        role: 'user',
        content: `Исправь импорты в этом файле (Membrana monorepo):

      Правила:
      - В packages/* используй @membrana/*
      - Не используй относительные пути с ../../
      - Проверь, что импорты существуют

      Файл: ${filePath}
      Содержимое: ${content}
      `,
      },
    ],
  });

  // Применяем изменения
  const fixed = response.content[0].text;
  await writeFile(filePath, fixed);
}
