import type { PanelRole } from './roles';

/**
 * Разделы панели (OP3) — заглушки с уровнями доступа. Содержимое разделов —
 * потребители каркаса (борды эпика #438: drift #396, trends vs yamnet) и
 * делается отдельными задачами ПОСЛЕ эпика.
 */
export interface PanelSection {
  id: string;
  title: string;
  /** Одна фраза человеческим языком (ALLY_PRIMER), без жаргона. */
  description: string;
  minRole: PanelRole;
}

/**
 * Уровень доступа раздела — UX-гейт рабочего места, НЕ security-граница:
 * данные бордов публичны (артефакты лежат в открытом репо), скрытие ссылки
 * защитой не является (консилиум detector-compare-board-2026-07-14, развилка 4).
 * Серверные /v1-ручки гейтит office.
 */
export const PANEL_SECTIONS: readonly PanelSection[] = [
  {
    id: 'ally-digest',
    title: 'Сводка проекта',
    description: 'Что происходит в проекте — простыми словами, как в отчётах бота.',
    minRole: 'ally',
  },
  {
    id: 'drift-anchors',
    title: 'Дрейф-якоря',
    description: 'Здоровье распознавания: не разъехались ли детекторы с эталоном.',
    minRole: 'operator',
  },
  {
    id: 'detector-compare',
    title: 'Детекторы: trends vs yamnet',
    description: 'Сравнение классического анализа звука и нейросети на одних данных.',
    minRole: 'operator',
  },
  {
    id: 'panel-users',
    title: 'Пользователи',
    description: 'Партнёры, их доступ к разделам и промокоды — управление владельцем.',
    minRole: 'owner',
  },
  {
    id: 'llm-channels',
    title: 'Каналы LLM',
    description: 'Учёт вызовов процедур и переключение цепочки провайдеров (owner).',
    minRole: 'owner',
  },
  {
    id: 'graphify',
    title: 'Граф кода',
    description: 'Карта зависимостей кода по семействам — как устроен проект внутри.',
    // GRP2: грант-гейт для техпартнёров. minRole=operator (грант открывает только
    // не-owner разделы, консилиум Р1) → техпартнёр = ally + grant:graphify видит;
    // плейн-ally без гранта — нет; operator+/owner — по роли. Реальный гейт —
    // маршрут-мост /panel/section/graphify/* (office forward_auth), не UX-скрытие.
    minRole: 'operator',
  },
  {
    id: 'research-tree',
    title: 'Древо исследований',
    description: 'Карта знаний проекта: направления, гейты, прогресс — для инвесторов.',
    // GRP2: грант research-tree (инвесторам/управленцам). Борд и мост — GRP3;
    // сейчас раздел заведён ради гранта в owner-матрице (заглушка без контента).
    minRole: 'operator',
  },
] as const;
