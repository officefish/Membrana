/**
 * Зубы переключателя «Возобновлять сценарий после перезапуска Студии» в кабинете (ADR-0033 PR-2b).
 * Порчи: показывать запрос вместо ответа сервера → красный; молчать, когда до прибора не доехало →
 * красный; включено по умолчанию → красный.
 *
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { NodeScenarioAutoResumeToggle, autoResumeResultText } from './NodeScenarioAutoResumeToggle';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(setter: Parameters<typeof NodeScenarioAutoResumeToggle>[0]['setter'], initial = false) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<NodeScenarioAutoResumeToggle nodeId="n-1" initial={initial} setter={setter} />));
  const box = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  return { host, box, done: () => act(() => root.unmount()) };
}

describe('NodeScenarioAutoResumeToggle', () => {
  it('исходное значение с сервера; без значения — ВЫКЛ', () => {
    expect(renderToStaticMarkup(<NodeScenarioAutoResumeToggle nodeId="n-1" initial={false} />)).not.toContain('checked');
    expect(renderToStaticMarkup(<NodeScenarioAutoResumeToggle nodeId="n-1" initial />)).toContain('checked');
  });

  it('щелчок → PUT с enabled; показан ответ сервера', async () => {
    const setter = vi.fn(async () => ({ ok: true as const, nodeId: 'n-1', scenarioAutoResume: true, contextSync: { updated: 1, failed: 0 } }));
    const { host, box, done } = await mount(setter);
    await act(async () => box.click());
    expect(setter).toHaveBeenCalledWith('n-1', true);
    expect(box.checked).toBe(true);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    done();
  });

  it('сервер отказал — значение не меняется, строка role=alert', async () => {
    const setter = vi.fn(async () => ({ ok: false as const, reason: 'node_not_paired' as const }));
    const { host, box, done } = await mount(setter);
    await act(async () => box.click());
    expect(box.checked).toBe(false);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('не сопряжён');
    done();
  });

  it('сохранено, но до прибора не доехало — честная строка', () => {
    expect(autoResumeResultText({ ok: true, nodeId: 'n-1', scenarioAutoResume: true, contextSync: { updated: 0, failed: 1 } })?.text).toContain(
      'до прибора не доехало',
    );
    expect(autoResumeResultText({ ok: true, nodeId: 'n-1', scenarioAutoResume: true, contextSync: { updated: 1, failed: 0 } })).toBeNull();
  });
});
