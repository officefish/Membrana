/**
 * Сервис служебной двери кабинета для office (#2588 b2; ADR-0031 п.3).
 *
 * Два дела, и только они: отдать office страницу мембран с минимумом полей и поставить мембране
 * срок архива через `ArchiveRetentionStore.set`. Существование мембраны проверяет этот сервис
 * (store этого не делает — договор b1), порядок проверок на PUT: срок (без базы) → мембрана → запись.
 *
 * ВЫБОРКА — `select`, не `include`: Prisma получает ровный список колонок, и `passwordHash`,
 * сессии и прочее не покидают базу вовсе, а не отбрасываются на выходе (зуб P8 проверяет и
 * форму ответа, и форму запроса).
 *
 * Срок читается через `store.read` на каждую мембрану страницы (≤200 запросов): `readMany`
 * в store — зона b1, здесь её не правим; панели владельца этого хватает, долг назван в PR.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { InvalidRetentionDaysError, RETENTION_DAYS } from '../../domain/archive-retention';
import { ArchiveRetentionStore } from '../archive-retention/archive-retention.store';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OFFICE_ACTOR_FALLBACK,
  OFFICE_ACTOR_MAX_LENGTH,
  OFFICE_MEMBRANES_DEFAULT_LIMIT,
  OFFICE_MEMBRANES_MAX_LIMIT,
  type OfficeMembraneItem,
  type OfficeMembranesPage,
  type OfficeUsersRefusal,
  type SetArchiveRetentionDto,
  type SetArchiveRetentionResult,
} from './office-users.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ровно те колонки, что уезжают в office. Экспорт — чтобы зуб P8 сверял форму запроса. */
export const OFFICE_MEMBRANE_SELECT = {
  id: true,
  userId: true,
  tariffId: true,
  createdAt: true,
  user: { select: { login: true } },
} as const;

type MembraneRow = {
  id: string;
  userId: string;
  tariffId: string;
  createdAt: Date;
  user: { login: string };
};

function refusal(code: OfficeUsersRefusal, extra: Record<string, unknown> = {}) {
  return { code, ...extra };
}

/** Разбор `limit` из строки запроса: пусто → умолчание; не целое, <1 или > потолка → 400. */
export function parseLimit(raw: unknown): number {
  if (raw === undefined || raw === '') return OFFICE_MEMBRANES_DEFAULT_LIMIT;
  const n = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(n) || n < 1 || n > OFFICE_MEMBRANES_MAX_LIMIT) {
    throw new BadRequestException(refusal('invalid_limit', { max: OFFICE_MEMBRANES_MAX_LIMIT }));
  }
  return n;
}

/** Курсор — `membraneId` последнего элемента предыдущей страницы; не uuid → 400. */
export function parseCursor(raw: unknown): string | null {
  if (raw === undefined || raw === '') return null;
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    throw new BadRequestException(refusal('invalid_cursor'));
  }
  return raw;
}

/** След актёра: строка без краёв, не длиннее потолка; пусто → служебный fallback. */
export function normalizeActor(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s ? s.slice(0, OFFICE_ACTOR_MAX_LENGTH) : OFFICE_ACTOR_FALLBACK;
}

@Injectable()
export class OfficeUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retention: ArchiveRetentionStore,
  ) {}

  async listMembranes(rawCursor: unknown, rawLimit: unknown): Promise<OfficeMembranesPage> {
    const limit = parseLimit(rawLimit);
    const cursor = parseCursor(rawCursor);
    // Порядок устойчив: createdAt, затем id — две мембраны в одну миллисекунду не меняются местами.
    const rows = (await this.prisma.membrane.findMany({
      take: limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: OFFICE_MEMBRANE_SELECT,
    })) as MembraneRow[];
    const page = rows.slice(0, limit);
    const items: OfficeMembraneItem[] = await Promise.all(
      page.map(async (row) => {
        const view = await this.retention.read(row.id);
        return {
          membraneId: row.id,
          userId: row.userId,
          displayLabel: row.user.login,
          tariffId: row.tariffId,
          retentionDays: view.retentionDays,
          isDefault: view.isDefault,
          createdAt: row.createdAt.toISOString(),
        };
      }),
    );
    return { items, nextCursor: rows.length > limit ? page[page.length - 1]!.id : null };
  }

  async setArchiveRetention(membraneId: string, body: SetArchiveRetentionDto): Promise<SetArchiveRetentionResult> {
    const days = body?.days;
    const actor = normalizeActor(body?.actor);
    // 1) срок — до базы: на «2» ни одного запроса (P11)
    if (!RETENTION_DAYS.includes(days as never)) {
      throw new BadRequestException(refusal('invalid_retention_days', { allowed: [...RETENTION_DAYS], received: days ?? null }));
    }
    // 2) мембрана существует (P12); несуществующая ≠ 400
    if (!UUID_RE.test(membraneId)) {
      throw new NotFoundException(refusal('membrane_not_found'));
    }
    const membrane = await this.prisma.membrane.findUnique({ where: { id: membraneId }, select: { id: true } });
    if (!membrane) {
      throw new NotFoundException(refusal('membrane_not_found'));
    }
    // 3) запись — идемпотентный upsert store (b1); второй пояс проверки — в store
    try {
      const view = await this.retention.set(membraneId, days, actor);
      return {
        membraneId,
        retentionDays: view.retentionDays,
        isDefault: false,
        updatedAt: (view.updatedAt ?? new Date()).toISOString(),
        updatedBy: view.updatedBy ?? actor,
      };
    } catch (error) {
      if (error instanceof InvalidRetentionDaysError) {
        throw new BadRequestException(refusal('invalid_retention_days', { allowed: [...RETENTION_DAYS], received: error.received ?? null }));
      }
      throw error;
    }
  }
}
