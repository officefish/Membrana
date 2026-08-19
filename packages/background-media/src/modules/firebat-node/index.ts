/** Публичный контракт дома узла (ADR-0027 Р2): модуль и типы заданий/исходов. Ничего больше. */
export { FirebatNodeModule } from './firebat-node.module';
export {
  POLL_OUTCOMES,
  TASK_KINDS,
  TASK_STATES,
  TASK_QUEUE_DEFAULTS,
  type NodePulse,
  type NodeTask,
  type PollOutcome,
  type TaskKind,
  type TaskState,
} from './task-queue.service';
export { NODE_KEY_HEADER, NODE_KEY_VERDICTS, type NodeKeyVerdict } from './node-key.service';
