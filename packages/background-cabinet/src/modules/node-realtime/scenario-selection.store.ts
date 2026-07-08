import { Injectable } from '@nestjs/common';

import { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { BoardScenarioListItem } from '../../domain/node-realtime-wire';
import type { DeviceScenarioEntry } from './device-scenario.registry';

/**
 * Одна персистентная запись выбора сценария (ключ + значение реестра).
 * `mediaDeviceId` — тот же ключ, которым реестр адресует записи (в setList он
 * приходит как `payload.deviceId`, в select/get — как `mediaDeviceId`; это одно
 * и то же устройство-медиа-id).
 */
export interface StoredScenarioSelection {
  readonly mediaDeviceId: string;
  readonly entry: DeviceScenarioEntry;
}

/**
 * Порт персистентности для DeviceScenarioRegistry (TD2). Реестр держит
 * авторитетный in-memory кэш и делает через порт write-through: гидрация на
 * старте (loadAll) + best-effort upsert/remove на запись. Опционален — без
 * привязки реестр работает чисто in-memory (юнит-тесты).
 */
export interface ScenarioSelectionStore {
  loadAll(): Promise<readonly StoredScenarioSelection[]>;
  upsert(mediaDeviceId: string, entry: DeviceScenarioEntry): Promise<void>;
  remove(mediaDeviceId: string): Promise<void>;
  clearAll(): Promise<void>;
}

/** DI-токен порта (чтобы реестр мог инжектить @Optional). */
export const SCENARIO_SELECTION_STORE = Symbol('SCENARIO_SELECTION_STORE');

/** Prisma-имплементация порта поверх существующего Postgres кабинета. */
@Injectable()
export class PrismaScenarioSelectionStore implements ScenarioSelectionStore {
  constructor(private readonly prisma: PrismaService) {}

  async loadAll(): Promise<readonly StoredScenarioSelection[]> {
    const rows = await this.prisma.nodeScenarioSelection.findMany();
    return rows.map((row) => ({
      mediaDeviceId: row.mediaDeviceId,
      entry: {
        membraneId: row.membraneId,
        scenarios: row.scenarios as unknown as readonly BoardScenarioListItem[],
        selectedScenarioId: row.selectedScenarioId,
      },
    }));
  }

  async upsert(mediaDeviceId: string, entry: DeviceScenarioEntry): Promise<void> {
    const scenarios = entry.scenarios as unknown as Prisma.InputJsonValue;
    await this.prisma.nodeScenarioSelection.upsert({
      where: { mediaDeviceId },
      create: {
        mediaDeviceId,
        membraneId: entry.membraneId,
        scenarios,
        selectedScenarioId: entry.selectedScenarioId,
      },
      update: {
        membraneId: entry.membraneId,
        scenarios,
        selectedScenarioId: entry.selectedScenarioId,
      },
    });
  }

  async remove(mediaDeviceId: string): Promise<void> {
    // deleteMany — идемпотентно, не бросает при отсутствии записи.
    await this.prisma.nodeScenarioSelection.deleteMany({ where: { mediaDeviceId } });
  }

  async clearAll(): Promise<void> {
    await this.prisma.nodeScenarioSelection.deleteMany({});
  }
}
