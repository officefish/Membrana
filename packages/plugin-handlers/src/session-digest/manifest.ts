/**
 * Манифест разбора сеанса — блок j2 спринта `journal-session-twenty` (#1961), персона Ожегов.
 *
 * РОД — `report`, НЕ `handler`. Разбор сеанса даёт СВОД по завершённому окну, а не поток
 * артефактов по каждому поводу (различение рода — вердикт структурщика 21.08). Следствие,
 * которое и подтверждает выбор: у `ReportManifest` нет поля `windowSize` вовсе, и выдумывать
 * ему смысл («число треков? секунды?») не приходится — окно приезжает в `ctx.payload`.
 * Нарезка называла род `handler`; расхождение названо владельцу, а не проведено молча.
 *
 * ДОМ — `background-media/collections` по вердикту консилиума 21.08
 * (`docs/seanses/journal-session-twenty-home-2026-08-21.md`): там звук лежит локально.
 * Объявленный заданием `background-office/journal` домом исполнения не стал — за его именем
 * в дереве нет ни модуля, ни хоста; он остаётся будущим получателем уведомления (Т3.7, M4).
 *
 * ПОВОД — `collections.sample_added`, единственный из закрытых трёх, после которого окно
 * сеанса вообще определено: `collection_created` наступает до данных, `journal.entry_created`
 * живёт в чужом доме.
 */
import type { PluginId, ReportManifest } from '@membrana/plugin-contracts';

export const SESSION_DIGEST_MANIFEST: ReportManifest = {
  id: 'membrana.report.session-digest' as PluginId,
  version: '0.1.0',
  kind: 'report',
  mountTarget: 'background-media/collections',
  triggers: ['collections.sample_added'],
};
