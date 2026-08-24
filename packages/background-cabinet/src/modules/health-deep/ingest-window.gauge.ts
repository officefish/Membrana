/**
 * Write-path датчик доехавших записей (кусок D #2121, вердикт M2: источники —
 * gauge с пути записи, не тяжёлый SQL на request-path).
 *
 * Журнал отмечает здесь каждую доехавшую запись; `/health/deep` читает счётчик
 * окна за O(1)-амортизированное. Ожидаемое число записей (expected) появится с
 * кабинетной read-model пульса (кусок C) — до этого ingest_arrived_ratio = null,
 * а arrived-счётчик уже честно виден в ответе.
 *
 * Синглтон намеренно (не Nest DI): путь записи журнала не должен зависеть от
 * жизненного цикла health-модуля; тесты работают с собственными экземплярами.
 */
export class IngestWindowGauge {
  private timestamps: number[] = [];

  constructor(private readonly windowMs: number = 900_000) {}

  recordArrived(nowMs: number = Date.now()): void {
    this.timestamps.push(nowMs);
    this.prune(nowMs);
  }

  arrivedInWindow(nowMs: number = Date.now()): number {
    this.prune(nowMs);
    return this.timestamps.length;
  }

  private prune(nowMs: number): void {
    const cutoff = nowMs - this.windowMs;
    for (;;) {
      const first = this.timestamps[0];
      if (first === undefined || first >= cutoff) break;
      this.timestamps.shift();
    }
  }
}

export const ingestWindowGauge = new IngestWindowGauge();
