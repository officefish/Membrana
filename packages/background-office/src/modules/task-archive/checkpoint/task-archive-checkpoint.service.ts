import { Injectable } from '@nestjs/common';

import { buildColdArchiveCheckpoint, type ColdArchiveCheckpoint } from '../contracts';
import { TaskArchiveService } from '../notary/task-archive.service';

@Injectable()
export class TaskArchiveCheckpointService {
  constructor(private readonly archive: TaskArchiveService) {}

  async currentCheckpoint(checkpointAt = new Date().toISOString()): Promise<ColdArchiveCheckpoint> {
    const records = await this.archive.listClosures();
    return buildColdArchiveCheckpoint(records, checkpointAt);
  }
}
