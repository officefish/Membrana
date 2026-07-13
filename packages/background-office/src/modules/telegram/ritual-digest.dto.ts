import { z } from 'zod';

/**
 * Дайджест ритуала (день/вечер) для telegram-группы союзников (#428).
 *
 * Payload собирает локальный скрипт `scripts/telegram-ritual-digest.mjs`
 * детерминированно из артефактов ритуала (MAIN_DAY_ISSUE / team-evening-feedback)
 * и PUSH'ит сюда — тот же push-ingest паттерн, что drift-anchor (ADR 0004):
 * office — тупой транспорт наружу, ничего не хранит.
 *
 * Локальный DTO, без импорта из @membrana/core (BACKGROUND_SERVERS.md).
 */
export const ritualDigestSchema = z.object({
  kind: z.enum(['day', 'evening']),
  /** ISO-дата ритуала, YYYY-MM-DD. */
  date: z.string().min(1),
  /** Главная мысль простым языком: план дня / вердикт дня. */
  headline: z.string().min(1),
  /** Булиты «сегодня в работе» / «что дальше». */
  points: z.array(z.string().min(1)).max(8).default([]),
  /** Вечер: средняя оценка полезности дня командой, например «7.4/10». */
  teamScore: z.string().optional(),
  /** Один короткий технический хвост вторым слоем (магистраль/детали). */
  techFooter: z.string().optional(),
});

export type RitualDigestDto = z.infer<typeof ritualDigestSchema>;
