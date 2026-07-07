/**
 * BTJ1 (board-telemetry-journal): вкладки правого сайдбара борда.
 * «Журнал» — телеметрия хоста (слот; клиент передаёт готовую панель, device-board
 * зависит только от core и телеметрию не импортирует). «Трейс» — прежний живой
 * хвост scenario-trace (#269). Без слота (кабинет, автономные хосты) вкладки —
 * «Узлы | Трейс».
 */
export type RightSidebarTab = 'inspector' | 'journal' | 'trace';

export function visibleRightSidebarTabs(hasJournalSlot: boolean): readonly RightSidebarTab[] {
  return hasJournalSlot ? ['inspector', 'journal', 'trace'] : ['inspector', 'trace'];
}

/** Активная вкладка обязана быть видимой; иначе падаем на «Узлы». */
export function normalizeRightSidebarTab(
  tab: RightSidebarTab,
  hasJournalSlot: boolean,
): RightSidebarTab {
  return visibleRightSidebarTabs(hasJournalSlot).includes(tab) ? tab : 'inspector';
}

export const RIGHT_SIDEBAR_TAB_LABELS: Readonly<Record<RightSidebarTab, string>> = {
  inspector: 'Узлы',
  journal: 'Журнал',
  trace: 'Трейс',
};
