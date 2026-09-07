/**
 * БЛОК «ПЕРЕПОЛНЕНИЕ БУФЕРА» НА СТРАНИЦЕ МЕМБРАНЫ (#2308, вердикт M1, блок B `overflow-policy`).
 *
 * Одна витрина, четыре части: режим, параметры умной очистки, галочка-привязка с окном
 * подтверждения, список узлов с режимом НА СТРОКУ при снятой галочке. Отдельной страницы
 * прибора нет по вердикту.
 *
 * Правила витрины (Верстальщик, M1): `smart_cleanup` в селекте недоступен, пока параметры
 * неполны, и рядом сказано почему; пункта «локальная автоочистка» нет; успех — только после
 * ответа сервера и рефетча мембраны; отказы — одним стилем, различие в тексте словаря; счёт
 * разноски показывается, а не прячется в лог.
 *
 * Логика без DOM живёт в `bufferPolicyForm.ts` и покрыта зубами; здесь — только рендер и вызовы.
 */
import { useCallback, useState } from 'react';

import {
  setBufferPolicyBinding,
  setMembraneBufferPolicy,
  setNodeBufferPolicy,
  type BufferPolicyMode,
  type ContextSyncCount,
  type MembraneView,
  type NodeView,
} from '@/api/membrane';

import { BindingConfirmDialog } from './BindingConfirmDialog';
import {
  MODE_LABEL,
  SELECTION_LABEL,
  bufferPolicyDenyText,
  contextSyncText,
  describePolicy,
  draftFromParams,
  smartCleanupDisabledReason,
  toPolicyInput,
  type SmartCleanupDraft,
} from './bufferPolicyForm';

interface Feedback {
  kind: 'deny' | 'transport' | 'done';
  text: string;
  sync?: ContextSyncCount;
}

function FeedbackAlert({ fb }: { fb: Feedback | null }) {
  if (!fb) return null;
  const cls =
    fb.kind === 'done' ? (fb.sync && fb.sync.failed > 0 ? 'alert-warning' : 'alert-success') : 'alert-error';
  return (
    <div className={`alert ${cls} mt-3 py-2 text-sm`} role={fb.kind === 'done' ? 'status' : 'alert'}>
      <span>
        {fb.text}
        {fb.sync ? `. ${contextSyncText(fb.sync)}` : ''}
      </span>
    </div>
  );
}

/** Форма параметров умной очистки — общая для мембраны и строки узла. */
function SmartCleanupParamsFields({
  idPrefix,
  draft,
  disabled,
  onChange,
}: {
  idPrefix: string;
  draft: SmartCleanupDraft;
  disabled: boolean;
  onChange: (next: SmartCleanupDraft) => void;
}) {
  return (
    <fieldset className="mt-3 grid gap-3 sm:grid-cols-3" disabled={disabled}>
      <legend className="text-xs text-base-content/60">Параметры умной очистки (все обязательны)</legend>
      <label className="form-control">
        <span className="label-text text-xs">Порог, % буфера</span>
        <input
          id={`${idPrefix}-threshold`}
          type="number"
          min={1}
          max={100}
          step={1}
          className="input input-bordered input-sm"
          value={draft.thresholdPercent}
          onChange={(e) => onChange({ ...draft, thresholdPercent: e.target.value })}
        />
      </label>
      <label className="form-control">
        <span className="label-text text-xs">Критерий отбора</span>
        <select
          id={`${idPrefix}-selection`}
          className="select select-bordered select-sm"
          value={draft.selection}
          onChange={(e) => onChange({ ...draft, selection: e.target.value as SmartCleanupDraft['selection'] })}
        >
          <option value="">— не задан —</option>
          {(Object.keys(SELECTION_LABEL) as (keyof typeof SELECTION_LABEL)[]).map((key) => (
            <option key={key} value={key}>
              {SELECTION_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
      <label className="form-control">
        <span className="label-text text-xs">Защита вещдоков</span>
        <select
          id={`${idPrefix}-protect`}
          className="select select-bordered select-sm"
          value={draft.protectLabeled === null ? '' : draft.protectLabeled ? 'yes' : 'no'}
          onChange={(e) =>
            onChange({
              ...draft,
              protectLabeled: e.target.value === '' ? null : e.target.value === 'yes',
            })
          }
        >
          <option value="">— не задана —</option>
          <option value="yes">Размеченное не трогать</option>
          <option value="no">Размеченное тоже под очистку</option>
        </select>
      </label>
    </fieldset>
  );
}

/** Селект режима + параметры + кнопка «Сохранить» — один носитель для мембраны и для узла. */
function PolicyEditor({
  idPrefix,
  initialMode,
  initialDraft,
  disabled,
  onSave,
}: {
  idPrefix: string;
  initialMode: BufferPolicyMode;
  initialDraft: SmartCleanupDraft;
  disabled: boolean;
  onSave: (input: NonNullable<ReturnType<typeof toPolicyInput>>) => Promise<void>;
}) {
  const [mode, setMode] = useState<BufferPolicyMode>(initialMode);
  const [draft, setDraft] = useState<SmartCleanupDraft>(initialDraft);
  const [busy, setBusy] = useState(false);

  const disabledReason = smartCleanupDisabledReason(draft);
  const input = toPolicyInput(mode, draft);

  const save = useCallback(async () => {
    if (!input || busy) return;
    setBusy(true);
    try {
      await onSave(input);
    } finally {
      setBusy(false);
    }
  }, [busy, input, onSave]);

  return (
    <div>
      <label className="form-control">
        <span className="label-text text-xs">Режим</span>
        <select
          id={`${idPrefix}-mode`}
          className="select select-bordered select-sm"
          value={mode}
          disabled={disabled || busy}
          aria-describedby={disabledReason ? `${idPrefix}-smart-why` : undefined}
          onChange={(e) => setMode(e.target.value as BufferPolicyMode)}
        >
          <option value="stop">{MODE_LABEL.stop}</option>
          <option value="smart_cleanup" disabled={disabledReason !== null}>
            {MODE_LABEL.smart_cleanup}
          </option>
        </select>
      </label>
      {disabledReason ? (
        <p id={`${idPrefix}-smart-why`} className="mt-1 text-xs text-base-content/60">
          Умная очистка: {disabledReason.toLowerCase()}
        </p>
      ) : null}
      <SmartCleanupParamsFields idPrefix={idPrefix} draft={draft} disabled={disabled || busy} onChange={setDraft} />
      <div className="mt-3">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={disabled || busy || !input}
          onClick={() => void save()}
        >
          {busy ? <span className="loading loading-spinner loading-xs" /> : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

function NodePolicyRow({
  node,
  bindingOn,
  onChanged,
}: {
  node: NodeView;
  bindingOn: boolean;
  onChanged: () => void;
}) {
  const [fb, setFb] = useState<Feedback | null>(null);
  const [editing, setEditing] = useState(false);
  const device = node.device;

  const save = useCallback(
    async (input: NonNullable<ReturnType<typeof toPolicyInput>>) => {
      setFb(null);
      try {
        const outcome = await setNodeBufferPolicy(node.id, input);
        if (outcome.ok) {
          setFb({ kind: 'done', text: `Режим прибора «${node.label}» сохранён`, sync: outcome.contextSync });
          setEditing(false);
          onChanged();
        } else {
          setFb({ kind: 'deny', text: bufferPolicyDenyText(outcome.reason) });
        }
      } catch (e) {
        setFb({ kind: 'transport', text: e instanceof Error ? e.message : 'Ошибка запроса' });
      }
    },
    [node.id, node.label, onChanged],
  );

  return (
    <li className="rounded-lg bg-base-200 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{node.label}</p>
          {device ? (
            <p className="text-xs text-base-content/60">
              Исполняет: {describePolicy(device.effectiveBufferPolicy)}
              {bindingOn ? ' (задаёт мембрана)' : ''}
              {!bindingOn && device.bufferPolicy.mode !== device.effectiveBufferPolicy.mode
                ? ` · своя настройка: ${describePolicy(device.bufferPolicy)}`
                : ''}
            </p>
          ) : (
            <p className="text-xs text-base-content/60">Прибор не привязан — режим задать некуда</p>
          )}
        </div>
        {device && !bindingOn ? (
          <button type="button" className="btn btn-sm" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Свернуть' : 'Изменить режим'}
          </button>
        ) : null}
      </div>
      {editing && device ? (
        <div className="mt-3 rounded-lg bg-base-100 p-3">
          <PolicyEditor
            idPrefix={`node-${node.id}`}
            initialMode={device.bufferPolicy.mode}
            initialDraft={draftFromParams(device.bufferPolicy.params)}
            disabled={bindingOn}
            onSave={save}
          />
        </div>
      ) : null}
      <FeedbackAlert fb={fb} />
    </li>
  );
}

export function BufferOverflowPolicyCard({ data, onChanged }: { data: MembraneView; onChanged: () => void }) {
  const membranePolicy = data.membrane.bufferPolicy;
  const bindingOn = membranePolicy.applyToAll;
  const [fb, setFb] = useState<Feedback | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bindingBusy, setBindingBusy] = useState(false);

  const saveMembrane = useCallback(
    async (input: NonNullable<ReturnType<typeof toPolicyInput>>) => {
      setFb(null);
      try {
        const outcome = await setMembraneBufferPolicy(input);
        if (outcome.ok) {
          setFb({ kind: 'done', text: 'Политика мембраны сохранена', sync: outcome.contextSync });
          onChanged();
        } else {
          setFb({ kind: 'deny', text: bufferPolicyDenyText(outcome.reason) });
        }
      } catch (e) {
        setFb({ kind: 'transport', text: e instanceof Error ? e.message : 'Ошибка запроса' });
      }
    },
    [onChanged],
  );

  const applyBinding = useCallback(
    async (applyToAll: boolean, confirmed: boolean) => {
      if (bindingBusy) return;
      setBindingBusy(true);
      setFb(null);
      try {
        const outcome = await setBufferPolicyBinding(applyToAll, confirmed);
        if (outcome.ok) {
          setFb({
            kind: 'done',
            text: applyToAll
              ? 'Политика мембраны применена ко всем приборам'
              : 'Привязка снята: приборам возвращены их настройки',
            sync: outcome.contextSync,
          });
          onChanged();
        } else {
          setFb({ kind: 'deny', text: bufferPolicyDenyText(outcome.reason) });
        }
      } catch (e) {
        setFb({ kind: 'transport', text: e instanceof Error ? e.message : 'Ошибка запроса' });
      } finally {
        setBindingBusy(false);
        setConfirmOpen(false);
      }
    },
    [bindingBusy, onChanged],
  );

  const pairedCount = data.nodes.filter((n) => n.device).length;

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-lg">Переполнение буфера</h2>
        <p className="text-sm text-base-content/70">
          Что делает прибор, когда буфер записи полон. По умолчанию — стоп: буфер хранит вещдоки,
          и прибор перестаёт писать, не стирая их. Умная очистка включается только с заданными
          параметрами; алгоритм очистки — отдельная работа.
        </p>

        <div className="mt-2 rounded-lg bg-base-100 p-4">
          <h3 className="text-sm text-base-content/60">Политика мембраны</h3>
          <PolicyEditor
            idPrefix="membrane"
            initialMode={membranePolicy.mode}
            initialDraft={draftFromParams(membranePolicy.params)}
            disabled={false}
            onSave={saveMembrane}
          />
          <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
            <input
              id="buffer-policy-apply-to-all"
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={bindingOn}
              disabled={bindingBusy}
              onChange={(e) => {
                if (e.target.checked) setConfirmOpen(true);
                else void applyBinding(false, false);
              }}
            />
            <span>
              Применить ко всем приборам
              <span className="block text-xs text-base-content/60">
                Привязка, не снимок: пока стоит — политика мембраны действует на все приборы, включая
                будущие; снятие возвращает приборам их настройки
              </span>
            </span>
          </label>
          <FeedbackAlert fb={fb} />
        </div>

        <div className="mt-3 rounded-lg bg-base-100 p-4">
          <h3 className="text-sm text-base-content/60">
            Приборы {bindingOn ? '— режим задаёт мембрана' : '— режим на каждый прибор'}
          </h3>
          {data.nodes.length === 0 ? (
            <p className="mt-2 text-xs text-base-content/50">Узлов пока нет</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {data.nodes.map((node) => (
                <NodePolicyRow key={node.id} node={node} bindingOn={bindingOn} onChanged={onChanged} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <BindingConfirmDialog
        open={confirmOpen}
        deviceCount={pairedCount}
        policyText={describePolicy(membranePolicy)}
        busy={bindingBusy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void applyBinding(true, true)}
      />
    </div>
  );
}
