import { Injectable } from '@nestjs/common';
import {
  normalizeScenarioSelection,
  type BoardScenarioListItem,
  type BoardScenarioListPayload,
} from '../../domain/node-realtime-wire';

export interface DeviceScenarioEntry {
  readonly membraneId: string;
  readonly scenarios: readonly BoardScenarioListItem[];
  readonly selectedScenarioId: string | null;
}

/**
 * CX3: in-memory реестр объявленных узлами списков сценариев. Тел сценариев
 * сервер не хранит (они пользовательские, живут на устройстве) — только
 * список {id, title} + выбранный id. Пишут gateway (объявление узла,
 * selectScenario кабинета); читают gateway fan-out и DeviceCaptureService
 * (bootstrap GET /v1/captures). Инвариант «один всегда выбран» поддерживается
 * normalizeScenarioSelection на каждой записи.
 */
@Injectable()
export class DeviceScenarioRegistry {
  private readonly entries = new Map<string, DeviceScenarioEntry>();

  /** Объявление узла: заменяет список целиком (авторитетный снапшот). */
  setList(membraneId: string, payload: BoardScenarioListPayload): DeviceScenarioEntry {
    const entry: DeviceScenarioEntry = {
      membraneId,
      scenarios: payload.scenarios,
      selectedScenarioId: normalizeScenarioSelection(
        payload.scenarios,
        payload.selectedScenarioId,
      ),
    };
    this.entries.set(payload.deviceId, entry);
    return entry;
  }

  /**
   * Выбор кабинета (runtime.selectScenario): переставляет выбранный, если
   * сценарий есть в объявленном списке. Возвращает обновлённую запись или
   * null (списка нет / чужой id — выбор отвергнут).
   */
  select(mediaDeviceId: string, scenarioId: string): DeviceScenarioEntry | null {
    const current = this.entries.get(mediaDeviceId);
    if (!current || !current.scenarios.some((scenario) => scenario.id === scenarioId)) {
      return null;
    }
    const next: DeviceScenarioEntry = { ...current, selectedScenarioId: scenarioId };
    this.entries.set(mediaDeviceId, next);
    return next;
  }

  get(mediaDeviceId: string): DeviceScenarioEntry | null {
    return this.entries.get(mediaDeviceId) ?? null;
  }

  delete(mediaDeviceId: string): void {
    this.entries.delete(mediaDeviceId);
  }

  clear(): void {
    this.entries.clear();
  }
}
