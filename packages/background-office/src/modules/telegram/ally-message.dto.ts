import { z } from 'zod';

/**
 * «Ласточка» — разовое свободное сообщение в приватную группу союзников,
 * отправляется по команде владельца (`yarn telegram:swallow`), НЕ автоматически.
 *
 * Тот же push-ingest, что дайджесты (#428/#434): локальный скрипт POST'ит сюда,
 * office конвертирует md-подмножество (bold/italic/ссылки/`код`) в Telegram-HTML
 * и шлёт. Office ничего не хранит. Локальный DTO без импорта @membrana/core.
 */
export const allyMessageSchema = z.object({
  /** Текст сообщения в md-подмножестве конвертера telegram-md. */
  text: z.string().min(1).max(4096),
  /**
   * Вложение-файл (#1398): те же поля, что у дайджеста — office шлёт его
   * отдельным `sendDocument` ПОСЛЕ текста. Носитель общий, путь ласточки просто
   * получил к нему доступ. Отсутствует / пусто → уходит только текст.
   * Оба поля обязаны идти парой: имя без содержимого (и наоборот) — 400.
   */
  documentMd: z.string().min(1).max(100_000).optional(),
  /** Имя вложения, например `bpla-methodology.md`. */
  documentName: z.string().min(1).max(120).optional(),
}).refine((v) => Boolean(v.documentMd) === Boolean(v.documentName), {
  message: 'documentMd и documentName идут парой — вложение без имени (или имя без содержимого) не отправляется',
  path: ['documentName'],
});

export type AllyMessageDto = z.infer<typeof allyMessageSchema>;
