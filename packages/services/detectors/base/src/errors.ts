/** Выбрасывается placeholder-реализациями до task-промпта конкретного детектора. */
export class NotImplementedError extends Error {
  constructor(detectorName: string) {
    super(`Detector "${detectorName}" is not implemented yet (scaffold only).`);
    this.name = 'NotImplementedError';
  }
}
