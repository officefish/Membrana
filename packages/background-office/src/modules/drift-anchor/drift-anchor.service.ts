import { Injectable, Logger } from '@nestjs/common';

import { driftAnchorRecordKey, type DriftAnchorRecordDto } from './drift-anchor-record.dto';

/**
 * In-memory журнал drift-anchor записей (ADR 0004, Р2-поправка).
 *
 * НЕ пишет на диск: `background-office` документирован как stateless (нет
 * `volumes:` ни в `docker-compose.yml`, ни в prod-compose) — файловая запись
 * пропала бы при каждом редеплое без предупреждения. Держим последнюю запись
 * на каждый `(anchorKind, anchorSource)`; после рестарта контейнера store пуст
 * до следующего прогона producer'а — это ВИДИМО через `takenAt` в ответе, а
 * не тихая деградация (тот же принцип, что метка модальностей в live-neural
 * -combined-fusion).
 */
@Injectable()
export class DriftAnchorService {
  private readonly logger = new Logger(DriftAnchorService.name);
  private readonly records = new Map<string, DriftAnchorRecordDto>();

  /** Принять запись от producer'а. Перезаписывает предыдущую того же ключа. */
  ingest(record: DriftAnchorRecordDto): void {
    const key = driftAnchorRecordKey(record);
    this.records.set(key, record);
    this.logger.log(
      { anchorKind: record.anchorKind, anchorSource: record.anchorSource, verdict: record.verdict },
      'drift-anchor record ingested',
    );
  }

  /** Все текущие записи (0..3), для GET-дайджеста. Порядок не гарантирован потребителю. */
  list(): DriftAnchorRecordDto[] {
    return [...this.records.values()];
  }
}
