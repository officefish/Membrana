/**
 * Сборка выборки по кнопке: дом → измерение → отбор → хранение. Блок c6a.
 *
 * ПОРЯДОК НЕСУЩИЙ, и он не «сначала посчитаем, потом проверим»:
 *   1. дом судит ЗАДАНИЕ (записи чужие? пустое?) — до всякого измерения;
 *   2. плагин просит измерение у media через порт;
 *   3. отбор режет по объёму и критерию;
 *   4. выборка ложится в кабинетную базу и получает адрес.
 *
 * Прогон адресуется `collectionId = 'journal'`, отпечаток входа — от состава `entryIds`
 * (см. `journal-run-address.ts`). Ручки человека едут в `payload` и в `configHash` не входят:
 * два прогона с разными настройками расходятся только `runId`. Цена принята сознательно.
 */
import { Injectable } from '@nestjs/common';

import {
  JOURNAL_RUN_COLLECTION_ID,
  journalInputHash,
} from '../plugin-host/journal-run-address';
import { JournalPluginHostService } from '../plugin-host/journal-plugin-host.service';
import { ChartListSelectionService, type StoredSelection } from './selection.service';

/** Что вернулось человеку: выборка либо названная причина отказа. */
export interface GenerateOutcome {
  readonly selection: StoredSelection | null;
  readonly refusal: { readonly reason: string; readonly detail: string } | null;
}

export interface GenerateInput {
  readonly userId: string;
  readonly membraneId: string;
  readonly entryIds: readonly string[];
  readonly volume: number;
  readonly criterion: string;
}

/** Идентификатор прогона. Отдельной функцией — чтобы зуб мог подменить и не гадать. */
export type RunIdMaker = () => string;

@Injectable()
export class ChartListOrchestrator {
  constructor(
    private readonly host: JournalPluginHostService,
    private readonly selections: ChartListSelectionService,
    private readonly newRunId: RunIdMaker = () => crypto.randomUUID(),
  ) {}

  async generate(input: GenerateInput): Promise<GenerateOutcome> {
    if (input.entryIds.length === 0) {
      // Дом отверг бы это причиной empty-task, но платить за круг ради известного ответа незачем.
      return { selection: null, refusal: { reason: 'empty-task', detail: 'в задании ноль записей' } };
    }

    const runId = this.newRunId();
    const outcome = await this.host.requestWithTask(
      'membrana.showcase.chart-list' as never,
      'journal.entry_created' as never,
      {
        address: {
          pluginId: 'membrana.showcase.chart-list',
          version: '0.1.0',
          collectionId: JOURNAL_RUN_COLLECTION_ID,
          runId,
          mountTarget: 'background-cabinet/journal',
        },
        fingerprints: {
          inputHash: journalInputHash(input.entryIds),
          // Пресет ПЛАГИНА, не ручки человека: расширить его настройками — переоткрыть M3′.
          configHash: 'chart-list@0.1.0',
        },
        resumeMode: 'fresh',
        trigger: 'journal.entry_created',
        payload: { userId: input.userId, volume: input.volume, criterion: input.criterion },
      } as never,
      input.userId,
      { entryIds: input.entryIds, needs: ['entries'] },
    );

    if (!outcome.verdict.ok) {
      return { selection: null, refusal: { reason: outcome.verdict.reason, detail: 'задание отвергнуто домом' } };
    }

    const result = outcome.result as
      | { selection?: { criterion: string; volume: number; picks: unknown[]; shortfall: number; refusal: { reason: string; detail: string } | null }; asked?: number; measured?: number }
      | null;

    if (!result?.selection) {
      return { selection: null, refusal: { reason: 'no-result', detail: 'плагин не вернул выборку' } };
    }
    if (result.selection.refusal) {
      return { selection: null, refusal: result.selection.refusal };
    }

    const picks = result.selection.picks as ReadonlyArray<{
      rank: number; entryId: string; sampleId: string; deltaDb: number;
      peakDb: number; structure: string; flatness: number; displaced: number;
    }>;

    const selection = await this.selections.save({
      membraneId: input.membraneId,
      criterion: result.selection.criterion,
      volume: result.selection.volume,
      runId,
      inputHash: journalInputHash(input.entryIds),
      asked: result.asked ?? input.entryIds.length,
      measured: result.measured ?? picks.length,
      shortfall: result.selection.shortfall,
      picks: picks.map((p) => ({
        rank: p.rank,
        entryId: p.entryId,
        sampleId: p.sampleId,
        deltaDb: p.deltaDb,
        peakDb: p.peakDb,
        structure: p.structure,
        flatness: p.flatness,
        displaced: p.displaced,
      })),
    });

    return { selection, refusal: null };
  }
}
