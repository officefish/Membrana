/**
 * Настройки чарт-листа. Блок c6a спринта `chart-list-plugin`.
 *
 * РИСУЮТСЯ ТОЛЬКО ЗДЕСЬ. Канон §3: параметры, которые человек меняет руками, живут в сайдбаре и
 * НЕ дублируются в теле страницы. Механизм почвы вызывает `renderSettings` исключительно из
 * сайдбара — компонент попадёт туда сам, и в виджет его класть нельзя.
 *
 * ДВЕ НАСТРОЙКИ ОДНОГО ПЛАГИНА (Т2), а не два плагина: объём выборки и критерий отбора.
 * Оба списка ЗАКРЫТЫ — произвольного числа и четвёртого критерия нет.
 *
 * ВО ВРЕМЯ СБОРКИ НАСТРОЙКИ ЗАПЕРТЫ: сменить критерий на полпути значило бы получить выборку,
 * не совпадающую с тем, что показано выбранным.
 */
import {
  CHART_LIST_CRITERIA,
  CHART_LIST_VOLUMES,
  type ChartListCriterion,
  type ChartListState,
  type ChartListVolume,
} from './chartList';

export interface ChartListSettingsProps {
  readonly state: ChartListState;
  readonly onVolume: (v: ChartListVolume) => void;
  readonly onCriterion: (c: ChartListCriterion) => void;
}

export function ChartListSettings({ state, onVolume, onCriterion }: ChartListSettingsProps) {
  return (
    <div className="space-y-3">
      <fieldset disabled={state.busy}>
        <legend className="text-xs font-semibold text-base-content/70">Объём выборки</legend>
        <div className="mt-1 flex flex-wrap gap-1">
          {CHART_LIST_VOLUMES.map((v) => (
            <button
              key={v}
              type="button"
              className={`btn btn-xs ${state.volume === v ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={state.volume === v}
              onClick={() => onVolume(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={state.busy}>
        <legend className="text-xs font-semibold text-base-content/70">Критерий отбора</legend>
        <div className="mt-1 space-y-1">
          {CHART_LIST_CRITERIA.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="radio"
                className="radio radio-xs"
                name="chart-list-criterion"
                checked={state.criterion === c.id}
                onChange={() => onCriterion(c.id)}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.selection ? (
        // Что именно показано сейчас — рядом с ручками: иначе человек, покрутив настройки, решит,
        // будто список уже пересобран. Список пересобирается только кнопкой.
        <p className="text-xs text-base-content/50">
          Показана выборка от {new Date(state.selection.createdAt).toLocaleString('ru-RU')}:{' '}
          {state.selection.picks.length} из {state.selection.measured} измеренных.
        </p>
      ) : null}
    </div>
  );
}
