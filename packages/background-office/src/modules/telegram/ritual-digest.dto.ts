import { z } from 'zod';

/**
 * Дайджест ритуала (день/вечер) для telegram-группы союзников (#428).
 *
 * Payload собирает локальный скрипт `scripts/telegram-ritual-digest.mjs`
 * детерминированно из артефактов ритуала (MAIN_DAY_ISSUE / team-evening-feedback)
 * и PUSH'ит сюда — тот же push-ingest паттерн, что drift-anchor (ADR 0004):
 * office — тупой транспорт наружу, ничего не хранит.
 *
 * v3 (ALLY_DIGEST_FORMAT.md): тезисная структура вместо потока —
 *   день:  центральная задача + высокий приоритет + перспективы + критерий вечера;
 *   вечер: сошлось / не сошлось / неожиданно + оценка.
 * Детали уходят вложенным md-файлом (documentMd/documentName).
 *
 * Локальный DTO, без импорта из @membrana/core (BACKGROUND_SERVERS.md).
 */
const bullets = z.array(z.string().min(1)).max(5);

export const ritualDigestSchema = z.object({
  kind: z.enum(['day', 'evening']),
  /** ISO-дата ритуала, YYYY-MM-DD. */
  date: z.string().min(1),
  /** Главная мысль простым языком: день — центральная задача; вечер — вердикт дня. */
  headline: z.string().min(1),

  // ── День ──────────────────────────────────────────────────────────────
  /** Высокий приоритет (2–3 тезиса): магистраль + ближний долг. */
  highPriority: bullets.optional(),
  /** Перспективные направления (2–3 тезиса): отложенное на потом. */
  perspective: bullets.optional(),
  /** Критерий вечера одной фразой — по чему поймём, что день удался. */
  eveningCriterion: z.string().min(1).optional(),

  // ── Вечер ─────────────────────────────────────────────────────────────
  /** Что сошлось с планом (2–3 тезиса). */
  converged: bullets.optional(),
  /** Что не сошлось / перенесено (1–3 тезиса). */
  notConverged: bullets.optional(),
  /** Неожиданно всплывшие задачи (0–3 тезиса). */
  unexpected: bullets.optional(),
  /** Средняя оценка полезности дня командой, например «7.4/10». */
  teamScore: z.string().optional(),

  // ── Общее ─────────────────────────────────────────────────────────────
  /**
   * Сырой md шапки-пояснения (#434) из docs/comms/ALLY_DIGEST_HEADER.md.
   * Office конвертирует в Telegram-HTML и вшивает <blockquote expandable>;
   * поле отсутствует → отчёт уходит без шапки (graceful).
   */
  primerMd: z.string().min(1).max(3000).optional(),
  /**
   * Вложение-файл (ALLY_DIGEST_FORMAT.md): сырой md, который office шлёт
   * отдельным `sendDocument` после текста — день: MAIN_DAY_ISSUE.md,
   * вечер: DAILY_CODE_REVIEW. Отсутствует / пусто → уходит только текст.
   */
  documentMd: z.string().min(1).max(100_000).optional(),
  /** Имя вложения, например `MAIN_DAY_ISSUE-16.07.md`. */
  documentName: z.string().min(1).max(120).optional(),
});

export type RitualDigestDto = z.infer<typeof ritualDigestSchema>;
