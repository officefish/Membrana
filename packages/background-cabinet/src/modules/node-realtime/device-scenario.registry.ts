import { Inject, Injectable, Logger, Optional, type OnModuleInit } from '@nestjs/common';
import {
  normalizeScenarioSelection,
  type BoardScenarioListItem,
  type BoardScenarioListPayload,
} from '../../domain/node-realtime-wire';
import {
  SCENARIO_SELECTION_STORE,
  type ScenarioSelectionStore,
} from './scenario-selection.store';

export interface DeviceScenarioEntry {
  readonly membraneId: string;
  readonly scenarios: readonly BoardScenarioListItem[];
  readonly selectedScenarioId: string | null;
}

/**
 * CX3: реестр объявленных узлами списков сценариев. Тел сценариев сервер не
 * хранит (они пользовательские, живут на устройстве) — только список {id, title}
 * + выбранный id. Пишут gateway (объявление узла, selectScenario кабинета);
 * читают gateway fan-out и DeviceCaptureService (bootstrap GET /v1/captures).
 * Инвариант «один всегда выбран» поддерживается normalizeScenarioSelection.
 *
 * TD2 (tech-debt-2026-07): персистентность. Реестр держит авторитетный
 * in-memory кэш (синхронные get/setList/select — вызывающие не меняются) и
 * делает write-through в необязательный ScenarioSelectionStore: гидрация кэша
 * на старте (onModuleInit) + best-effort upsert/remove на запись. Без стора
 * (юнит-тесты, `new DeviceScenarioRegistry()`) — чистый in-memory как раньше.
 */
@Injectable()
export class DeviceScenarioRegistry implements OnModuleInit {
  private readonly entries = new Map<string, DeviceScenarioEntry>();
  private readonly logger = new Logger(DeviceScenarioRegistry.name);

  constructor(
    @Optional()
    @Inject(SCENARIO_SELECTION_STORE)
    private readonly store: ScenarioSelectionStore | null = null,
  ) {}

  /** Гидрация кэша из БД на старте — так выбор переживает рестарт сервера. */
  async onModuleInit(): Promise<void> {
    if (!this.store) return;
    try {
      const rows = await this.store.loadAll();
      for (const { mediaDeviceId, entry } of rows) {
        this.entries.set(mediaDeviceId, entry);
      }
      this.logger.log(`hydrated ${rows.length} scenario selection(s) from store`);
    } catch (error) {
      // Деградация: не блокируем старт сервера, работаем как in-memory.
      this.logger.warn(`scenario selection hydrate failed, starting empty: ${String(error)}`);
    }
  }

  /**
   * Best-effort персист записи (fire-and-forget: частота записи низкая).
   * Ограничение: при очень частых последовательных записях по одному
   * mediaDeviceId порядок upsert'ов не сериализуется — источник истины кэш,
   * БД догоняет; на рестарте гидрация берёт последнее сохранённое состояние.
   */
  private persist(mediaDeviceId: string, entry: DeviceScenarioEntry): void {
    void this.store?.upsert(mediaDeviceId, entry).catch((error: unknown) => {
      this.logger.warn(`scenario selection persist failed for ${mediaDeviceId}: ${String(error)}`);
    });
  }

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
    this.persist(payload.deviceId, entry);
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
    this.persist(mediaDeviceId, next);
    return next;
  }

  get(mediaDeviceId: string): DeviceScenarioEntry | null {
    return this.entries.get(mediaDeviceId) ?? null;
  }

  delete(mediaDeviceId: string): void {
    this.entries.delete(mediaDeviceId);
    void this.store?.remove(mediaDeviceId).catch((error: unknown) => {
      this.logger.warn(`scenario selection remove failed for ${mediaDeviceId}: ${String(error)}`);
    });
  }

  clear(): void {
    this.entries.clear();
    void this.store?.clearAll().catch((error: unknown) => {
      this.logger.warn(`scenario selection clearAll failed: ${String(error)}`);
    });
  }
}
