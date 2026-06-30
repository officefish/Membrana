/** Единица диалога: одно сообщение пользователя, агента или вызов инструмента. */
export interface Turn {
  readonly uuid: string;
  readonly sessionId: string;
  readonly role: 'user' | 'assistant' | 'tool_use' | 'tool_result' | string;
  readonly timestamp: string;
  readonly content: string;
  /** true если content содержал секреты и был скрублен */
  readonly wasRedacted?: boolean;
}

/** Метаданные сессии, записываемые в docs/sessions/<uuid>.meta.json */
export interface SessionMeta {
  readonly sessionId: string;
  readonly tool: 'claude-code' | 'cursor' | 'codex';
  readonly projectPath: string;
  readonly branch: string | null;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly turnCount: number;
  readonly secretsRedacted: number;
  readonly deduplicatedTurns: number;
  readonly isIncomplete: boolean;
  /** Ссылка на загруженный архив (UUID на стороне background-media) */
  readonly archiveRef: string | null;
  /** Для будущей корреляции с аудио (консилиум C2) */
  readonly correlatedAudioSegment?: { startMs: number; endMs: number };
}

/** Результат полного прогона архивации одной сессии. */
export interface ArchiveResult {
  readonly meta: SessionMeta;
  readonly turns: readonly Turn[];
  readonly uploadStatus: 'uploaded' | 'dry-run' | 'error';
  readonly uploadError?: string;
}
