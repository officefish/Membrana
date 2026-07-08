import React from 'react';

/**
 * csp-4: шареная презентационная карточка сценария/UserCase. Рендерит только
 * СОДЕРЖИМОЕ (заголовок + tariff-бейдж + счётчики + описание + locked-хинт) —
 * без обёртки выбора (radio/label/dropdown), которая различается у клиента
 * (модалка пикера) и кабинета (список сценариев). Один визуал → нет дрейфа.
 */

export type UserCaseEntitlement = 'bundled' | 'community' | 'entitled' | 'locked';

/** Минимальная модель карточки: подходит и UserCasePickerCard, и BoardScenarioListItem (system). */
export interface UserCaseCardViewModel {
  readonly title: string;
  readonly entitlement?: UserCaseEntitlement;
  readonly description?: string;
  readonly branchCount?: number;
  readonly functionCount?: number;
  readonly deviceKind?: string;
}

export function entitlementBadgeLabel(status: UserCaseEntitlement): string {
  switch (status) {
    case 'bundled':
      return 'Bundled';
    case 'community':
      return 'Sprint';
    case 'entitled':
      return 'Тариф ✓';
    case 'locked':
      return 'Тариф';
    default:
      return status;
  }
}

export function entitlementBadgeClass(status: UserCaseEntitlement): string {
  switch (status) {
    case 'bundled':
      return 'badge badge-primary badge-sm';
    case 'community':
      return 'badge badge-secondary badge-sm';
    case 'entitled':
      return 'badge badge-success badge-sm';
    case 'locked':
      return 'badge badge-ghost badge-sm opacity-70';
    default:
      return 'badge badge-ghost badge-sm';
  }
}

function metaLine(card: UserCaseCardViewModel): string {
  const parts: string[] = [];
  if (card.branchCount !== undefined) parts.push(`${card.branchCount} веток`);
  if (card.functionCount !== undefined) parts.push(`${card.functionCount} функций`);
  if (card.deviceKind !== undefined) parts.push(card.deviceKind);
  return parts.join(' · ');
}

export interface UserCaseCardViewProps {
  readonly card: UserCaseCardViewModel;
}

/** Содержимое карточки (внутри обёртки выбора вызывающего). */
export const UserCaseCardView: React.FC<UserCaseCardViewProps> = ({ card }) => {
  const meta = metaLine(card);
  return (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium truncate">{card.title}</span>
        {card.entitlement !== undefined ? (
          <span className={entitlementBadgeClass(card.entitlement)}>
            {entitlementBadgeLabel(card.entitlement)}
          </span>
        ) : null}
      </span>
      {meta.length > 0 ? (
        <span className="text-xs text-base-content/55 mt-0.5 block">{meta}</span>
      ) : null}
      {card.description !== undefined ? (
        <span className="text-xs text-base-content/50 mt-1 block leading-relaxed">
          {card.description}
        </span>
      ) : null}
      {card.entitlement === 'locked' ? (
        <span className="text-xs text-warning mt-1 block">Доступно в тарифе</span>
      ) : null}
    </>
  );
};
