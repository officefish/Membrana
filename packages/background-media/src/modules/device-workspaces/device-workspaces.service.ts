import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertDeviceScenarioDocument } from '../device-scenarios/device-scenario-assert';
import type {
  DeleteWorkspaceResultDto,
  DeviceWorkspaceListDto,
  DeviceWorkspaceRecordDto,
  PutWorkspaceOptions,
} from './device-workspaces.dto';

function workspaceTitleFromDocument(document: Record<string, unknown>, fallback: string): string {
  const meta = document.meta;
  if (typeof meta === 'object' && meta !== null) {
    const title = (meta as Record<string, unknown>).title;
    if (typeof title === 'string' && title.trim().length > 0) {
      return title.trim();
    }
  }
  return fallback;
}

@Injectable()
export class DeviceWorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaces(deviceId: string): Promise<DeviceWorkspaceListDto> {
    await this.ensureLegacyMigrated(deviceId);

    const [device, rows] = await Promise.all([
      this.prisma.device.findUnique({
        where: { id: deviceId },
        select: { activeWorkspaceId: true },
      }),
      this.prisma.deviceWorkspace.findMany({
        where: { deviceId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (device === null) {
      throw new NotFoundException('Device not found');
    }

    return {
      activeWorkspaceId: device.activeWorkspaceId,
      workspaces: rows.map((row) => ({
        workspaceId: row.workspaceId,
        title: row.title,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async getWorkspace(deviceId: string, workspaceId: string): Promise<DeviceWorkspaceRecordDto | null> {
    await this.ensureLegacyMigrated(deviceId);
    const row = await this.prisma.deviceWorkspace.findUnique({
      where: { deviceId_workspaceId: { deviceId, workspaceId } },
    });
    if (row === null) {
      return null;
    }
    return {
      document: row.payload as Record<string, unknown>,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async putWorkspace(
    deviceId: string,
    workspaceId: string,
    document: Record<string, unknown>,
    options?: PutWorkspaceOptions,
  ): Promise<DeviceWorkspaceRecordDto> {
    assertDeviceScenarioDocument(document);

    const existing = await this.prisma.deviceWorkspace.findUnique({
      where: { deviceId_workspaceId: { deviceId, workspaceId } },
    });

    if (
      existing !== null &&
      options?.expectedUpdatedAt !== undefined &&
      options.expectedUpdatedAt.length > 0
    ) {
      const currentUpdatedAt = existing.updatedAt.toISOString();
      if (currentUpdatedAt !== options.expectedUpdatedAt) {
        throw new ConflictException({
          code: 'WORKSPACE_CONFLICT',
          currentUpdatedAt,
          expectedUpdatedAt: options.expectedUpdatedAt,
        });
      }
    }

    const title = workspaceTitleFromDocument(document, 'Сценарий');
    const row = await this.prisma.deviceWorkspace.upsert({
      where: { deviceId_workspaceId: { deviceId, workspaceId } },
      create: {
        deviceId,
        workspaceId,
        title,
        payload: document as Prisma.InputJsonValue,
      },
      update: {
        title,
        payload: document as Prisma.InputJsonValue,
      },
    });

    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { activeWorkspaceId: true },
    });
    if (device?.activeWorkspaceId === workspaceId) {
      await this.syncLegacyDeviceScenario(deviceId, document);
    }

    return {
      document: row.payload as Record<string, unknown>,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async deleteWorkspace(deviceId: string, workspaceId: string): Promise<DeleteWorkspaceResultDto> {
    const existing = await this.prisma.deviceWorkspace.findUnique({
      where: { deviceId_workspaceId: { deviceId, workspaceId } },
    });
    if (existing === null) {
      throw new NotFoundException('Workspace not found');
    }

    await this.prisma.deviceWorkspace.delete({
      where: { deviceId_workspaceId: { deviceId, workspaceId } },
    });

    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { activeWorkspaceId: true },
    });
    if (device?.activeWorkspaceId === workspaceId) {
      const next = await this.prisma.deviceWorkspace.findFirst({
        where: { deviceId },
        orderBy: { createdAt: 'asc' },
      });
      await this.prisma.device.update({
        where: { id: deviceId },
        data: { activeWorkspaceId: next?.workspaceId ?? null },
      });
      if (next) {
        await this.syncLegacyDeviceScenario(deviceId, next.payload as Record<string, unknown>);
      }
    }

    return { deletedWorkspaceId: workspaceId };
  }

  async setActiveWorkspace(deviceId: string, activeWorkspaceId: string): Promise<{ activeWorkspaceId: string }> {
    const row = await this.prisma.deviceWorkspace.findUnique({
      where: { deviceId_workspaceId: { deviceId, workspaceId: activeWorkspaceId } },
    });
    if (row === null) {
      throw new NotFoundException('Workspace not found');
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { activeWorkspaceId },
    });
    await this.syncLegacyDeviceScenario(deviceId, row.payload as Record<string, unknown>);

    return { activeWorkspaceId };
  }

  /** Imports legacy single `DeviceScenario` row into first workspace slot (idempotent). */
  private async ensureLegacyMigrated(deviceId: string): Promise<void> {
    const count = await this.prisma.deviceWorkspace.count({ where: { deviceId } });
    if (count > 0) {
      return;
    }

    const legacy = await this.prisma.deviceScenario.findUnique({ where: { deviceId } });
    if (legacy === null) {
      return;
    }

    const document = legacy.payload as Record<string, unknown>;
    const meta =
      typeof document.meta === 'object' && document.meta !== null
        ? (document.meta as Record<string, unknown>)
        : undefined;
    const workspaceId =
      typeof meta?.workspaceId === 'string' && meta.workspaceId.length > 0
        ? meta.workspaceId
        : randomUUID();
    const title = workspaceTitleFromDocument(document, 'Сценарий 1');

    await this.prisma.$transaction([
      this.prisma.deviceWorkspace.create({
        data: {
          deviceId,
          workspaceId,
          title,
          payload: document as Prisma.InputJsonValue,
          updatedAt: legacy.updatedAt,
        },
      }),
      this.prisma.device.update({
        where: { id: deviceId },
        data: { activeWorkspaceId: workspaceId },
      }),
    ]);
  }

  /** Keeps legacy `/device-scenario` in sync with active workspace for older clients. */
  private async syncLegacyDeviceScenario(
    deviceId: string,
    document: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.deviceScenario.upsert({
      where: { deviceId },
      create: {
        deviceId,
        payload: document as Prisma.InputJsonValue,
      },
      update: {
        payload: document as Prisma.InputJsonValue,
      },
    });
  }
}
