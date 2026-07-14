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
});

export type AllyMessageDto = z.infer<typeof allyMessageSchema>;
