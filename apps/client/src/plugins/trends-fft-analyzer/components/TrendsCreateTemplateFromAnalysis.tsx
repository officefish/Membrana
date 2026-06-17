import React, { useCallback, useMemo, useState } from 'react';
import {
  SYSTEM_TEMPLATES,
  type PatternTemplate,
  type TrendsDetectionResult,
} from '@membrana/trends-detector-service';

import {
  buildTemplateFromAnalysis,
  canBuildTemplateFromAnalysis,
} from '../buildTemplateFromAnalysis';
import { userTemplatesStore } from '../userTemplatesStore';
import { useUserTemplates } from '../useUserTemplates';
import { TrendsTemplateEditor } from './TrendsTemplateEditor';

export interface TrendsCreateTemplateFromAnalysisProps {
  readonly result: TrendsDetectionResult | null | undefined;
  readonly enabledKeys: readonly string[];
  readonly onUserTemplateSaved?: (key: string) => void;
  readonly compact?: boolean;
}

export const TrendsCreateTemplateFromAnalysis: React.FC<
  TrendsCreateTemplateFromAnalysisProps
> = ({ result, enabledKeys, onUserTemplateSaved, compact = false }) => {
  const userTemplates = useUserTemplates();
  const [editing, setEditing] = useState<PatternTemplate | null>(null);

  const allKeys = useMemo(
    () => [...SYSTEM_TEMPLATES.map((t: PatternTemplate) => t.key), ...userTemplates.map((t) => t.key)],
    [userTemplates],
  );

  const canCreate = canBuildTemplateFromAnalysis(result);

  const startCreate = useCallback(() => {
    if (!canBuildTemplateFromAnalysis(result)) return;
    setEditing(buildTemplateFromAnalysis(result, allKeys));
  }, [result, allKeys]);

  const handleSave = useCallback(
    (template: PatternTemplate) => {
      userTemplatesStore.upsert(template);
      if (!enabledKeys.includes(template.key)) {
        onUserTemplateSaved?.(template.key);
      }
      setEditing(null);
    },
    [enabledKeys, onUserTemplateSaved],
  );

  if (editing) {
    return (
      <TrendsTemplateEditor
        template={editing}
        existingKeys={allKeys}
        isNew
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  if (!canCreate) return null;

  return (
    <button
      type="button"
      className={`btn btn-outline btn-primary ${compact ? 'btn-xs min-h-8' : 'btn-sm min-h-9'} w-full`}
      onClick={startCreate}
    >
      Создать шаблон из анализа
    </button>
  );
};
