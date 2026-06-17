import React, { useCallback, useMemo, useState } from 'react';
import {
  type PatternTemplate,
} from '@membrana/trends-detector-service';

import { getDroneTightTrendsCatalog } from '../../../lib/droneTightCalibration';

import {
  buildTemplateFromAnalysis,
  canBuildTemplateFromAnalysis,
} from '../buildTemplateFromAnalysis';
import {
  cloneTemplateForUser,
  createEmptyUserTemplate,
  isUserTemplateKey,
} from '../templateEditorDefaults';
import { userTemplatesStore } from '../userTemplatesStore';
import type { TrendsDetectionResult } from '@membrana/trends-detector-service';

import { getUserTemplatesStorageBackendLabel } from '../userTemplatesZustandStore';
import { useUserTemplates } from '../useUserTemplates';
import { useUserTemplatesZustandStore } from '../userTemplatesZustandStore';
import { TrendsTemplateEditor } from './TrendsTemplateEditor';

export interface TrendsTemplateListProps {
  readonly enabledKeys: readonly string[];
  readonly onToggle: (key: string, enabled: boolean) => void;
  readonly onUserTemplateSaved?: (key: string) => void;
  readonly lastAnalysisResult?: TrendsDetectionResult | null;
  readonly compact?: boolean;
  readonly bounded?: boolean;
}

export const TrendsTemplateList: React.FC<TrendsTemplateListProps> = ({
  enabledKeys,
  onToggle,
  onUserTemplateSaved,
  lastAnalysisResult,
  compact = false,
  bounded = true,
}) => {
  const userTemplates = useUserTemplates();
  const storageBackend = useUserTemplatesZustandStore((s) => s.storageBackend);
  const lastResult = lastAnalysisResult ?? null;
  const canPrefillFromAnalysis = canBuildTemplateFromAnalysis(lastResult);
  const enabledSet = useMemo(() => new Set(enabledKeys), [enabledKeys]);
  const [editing, setEditing] = useState<PatternTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  const systemTemplates = useMemo(() => getDroneTightTrendsCatalog(), []);

  const allKeys = useMemo(
    () => [...systemTemplates.map((t) => t.key), ...userTemplates.map((t) => t.key)],
    [systemTemplates, userTemplates],
  );

  const startCreate = useCallback(() => {
    setEditing(createEmptyUserTemplate(allKeys));
    setIsNew(true);
  }, [allKeys]);

  const startEdit = useCallback((template: PatternTemplate) => {
    setEditing(structuredClone(template));
    setIsNew(false);
  }, []);

  const startCopyFromSystem = useCallback(
    (source: PatternTemplate) => {
      setEditing(cloneTemplateForUser(source, allKeys));
      setIsNew(true);
    },
    [allKeys],
  );

  const startCreateFromAnalysis = useCallback(() => {
    if (!canBuildTemplateFromAnalysis(lastResult)) return;
    setEditing(buildTemplateFromAnalysis(lastResult, allKeys));
    setIsNew(true);
  }, [lastResult, allKeys]);

  const handleSave = useCallback(
    (template: PatternTemplate) => {
      userTemplatesStore.upsert(template);
      if (!enabledSet.has(template.key)) {
        onUserTemplateSaved?.(template.key);
      }
      setEditing(null);
      setIsNew(false);
    },
    [enabledSet, onUserTemplateSaved],
  );

  const handleDelete = useCallback(
    (key: string) => {
      userTemplatesStore.remove(key);
      if (enabledSet.has(key)) {
        onToggle(key, false);
      }
    },
    [enabledSet, onToggle],
  );

  if (editing) {
    return (
      <TrendsTemplateEditor
        template={editing}
        existingKeys={allKeys}
        isNew={isNew}
        onSave={handleSave}
        onCancel={() => {
          setEditing(null);
          setIsNew(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" className="btn btn-primary btn-xs" onClick={startCreate} aria-label="Создать пользовательский шаблон">
          Создать
        </button>
        <button
          type="button"
          className="btn btn-outline btn-primary btn-xs"
          disabled={!canPrefillFromAnalysis}
          aria-label="Создать шаблон на основе последнего анализа"
          title={
            canPrefillFromAnalysis
              ? 'Заполнить поля шаблона данными последнего завершённого анализа'
              : 'Сначала завершите хотя бы один цикл анализа на вкладке «Детектор»'
          }
          onClick={startCreateFromAnalysis}
        >
          Создать шаблон на основе анализа
        </button>
      </div>

      <div
        className={`flex flex-col gap-2 min-h-0 ${
          bounded && !compact ? 'max-h-64 overflow-y-auto pr-1' : ''
        }`}
      >
        <div className="text-[11px] font-medium text-base-content/50 uppercase tracking-wide">
          Системные
        </div>
        {systemTemplates.map((template) => {
          const checked = enabledSet.has(template.key);
          return (
            <div
              key={template.key}
              className={`flex items-start gap-2 rounded-lg border p-2 transition-colors ${
                checked
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-base-300 bg-base-200/30 opacity-90'
              }`}
            >
              <label className="flex items-start gap-2 flex-1 cursor-pointer min-w-0">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5 shrink-0"
                  checked={checked}
                  aria-label={`${checked ? 'Отключить' : 'Включить'} шаблон ${template.name}`}
                  onChange={(e) => onToggle(template.key, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    <span className="opacity-60" aria-hidden title="Только чтение">
                      🔒
                    </span>{' '}
                    {template.icon} {template.name}
                  </span>
                  {!compact && (
                    <span className="block text-xs text-base-content/60 leading-snug mt-0.5">
                      {template.description}
                    </span>
                  )}
                </span>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-xs shrink-0"
                title="Копировать в пользовательский"
                onClick={() => startCopyFromSystem(template)}
              >
                Копировать
              </button>
            </div>
          );
        })}

        {userTemplates.length > 0 ? (
          <>
            <div className="text-[11px] font-medium text-base-content/50 uppercase tracking-wide mt-2">
              Пользовательские
            </div>
            {userTemplates.map((template) => {
              const checked = enabledSet.has(template.key);
              return (
                <div
                  key={template.key}
                  className={`flex items-start gap-2 rounded-lg border p-2 transition-colors ${
                    checked
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-base-300 bg-base-200/30'
                  }`}
                >
                  <label className="flex items-start gap-2 flex-1 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm mt-0.5 shrink-0"
                      checked={checked}
                      aria-label={`${checked ? 'Отключить' : 'Включить'} шаблон ${template.name}`}
                      onChange={(e) => onToggle(template.key, e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span
                        className="block text-sm font-medium"
                        style={{ color: template.color }}
                      >
                        {template.icon} {template.name}
                      </span>
                      {!compact && template.description ? (
                        <span className="block text-xs text-base-content/60 leading-snug mt-0.5">
                          {template.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => startEdit(template)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleDelete(template.key)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <p className="text-xs text-base-content/50 leading-snug">
            Пользовательских шаблонов пока нет. Создайте новый или скопируйте системный.
          </p>
        )}
      </div>

      {userTemplates.some((t) => isUserTemplateKey(t.key)) ? (
        <p className="text-[11px] text-base-content/50 leading-snug">
          Пользовательские шаблоны (JSON): {getUserTemplatesStorageBackendLabel(storageBackend)}.
        </p>
      ) : null}
    </div>
  );
};
