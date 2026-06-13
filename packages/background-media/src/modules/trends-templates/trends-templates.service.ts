import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TrendsTemplatePackDto } from './trends-templates.dto';

export type { TrendsTemplatePackDto } from './trends-templates.dto';

@Injectable()
export class TrendsTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPack(deviceId: string): Promise<TrendsTemplatePackDto> {
    const rows = await this.prisma.trendTemplate.findMany({
      where: { deviceId },
      orderBy: { key: 'asc' },
    });
    return {
      version: 1,
      templates: rows.map((r) => ({
        key: r.key,
        ...(r.payload as Record<string, unknown>),
      })),
    };
  }

  async replacePack(deviceId: string, body: TrendsTemplatePackDto): Promise<TrendsTemplatePackDto> {
    if (body.version !== 1) {
      throw new BadRequestException('Unsupported pack version');
    }
    const templates = body.templates ?? [];
    for (const t of templates) {
      const key = t.key;
      if (typeof key !== 'string' || !key.startsWith('user:')) {
        throw new BadRequestException('Template keys must start with user:');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.trendTemplate.deleteMany({ where: { deviceId } });
      for (const t of templates) {
        const key = String(t.key);
        const { key: _k, ...payload } = t;
        await tx.trendTemplate.create({
          data: {
            deviceId,
            key,
            payload: payload as Prisma.InputJsonValue,
          },
        });
      }
    });

    return this.getPack(deviceId);
  }

  async upsertOne(
    deviceId: string,
    key: string,
    payload: Record<string, unknown>,
  ): Promise<TrendsTemplatePackDto> {
    if (!key.startsWith('user:')) {
      throw new BadRequestException('Template key must start with user:');
    }
    await this.prisma.trendTemplate.upsert({
      where: { deviceId_key: { deviceId, key } },
      create: {
        deviceId,
        key,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {
        payload: payload as Prisma.InputJsonValue,
      },
    });
    return this.getPack(deviceId);
  }
}
