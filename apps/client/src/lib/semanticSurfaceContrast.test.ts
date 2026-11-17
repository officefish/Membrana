/**
 * Зуб вёрстки: `text-<семантика>-content` живёт ТОЛЬКО там, где файл сам красит сплошную
 * семантическую поверхность `bg-<семантика>`.
 *
 * ПОЧЕМУ ЭТО ПРАВИЛО, А НЕ ВКУС. В DaisyUI `*-content` — это цвет текста, подобранный под
 * СПЛОШНУЮ заливку своей семантики (`bg-warning` → `text-warning-content`). На полупрозрачной
 * заливке (`bg-warning/10`) поверхность остаётся `base-100`, и `*-content` подбирается уже не под
 * неё. У клиента включены пять тем (`apps/client/tailwind.config.js`), и четыре из них тёмные
 * (`forest` #171212, `business` #202020, `dark` #1d232a, `sunset` oklch(22%)), а `warning` в них —
 * светлый янтарь, значит `warning-content` — почти чёрный. Тёмный текст на тёмном фоне: строка
 * пропадает с глаз в 4 темах из 5. Это не «некрасиво», это непрочитанное предупреждение.
 *
 * ПРЕДМЕТ — исходники компонентов клиента и пакетов UI. Правило файловое, а не построчное:
 * `bg-warning/10` может стоять на обёртке, а `text-warning-content` — на вложенном абзаце
 * (ровно случай #2461, `NodeRebindStepsNote`), и построчная проверка такое пропускает.
 * Законные случаи (`bg-primary text-primary-content` бейджа, вложенный
 * `text-primary-content/80` внутри сплошной заливки) остаются зелёными: в их файле сплошная
 * `bg-primary` есть.
 *
 * ПОРЧА → КРАСНЫЙ: вернуть `text-warning-content` в файл, где только `bg-warning/10`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const CLIENT_SRC = join(HERE, '..');
const REPO = join(CLIENT_SRC, '..', '..', '..');

const UI_PACKAGES = ['agenda', 'device-board'] as const;

const SEMANTICS = ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'] as const;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/u.test(name) && !/\.test\.tsx$/u.test(name)) out.push(p);
  }
  return out;
}

const FILES = [CLIENT_SRC, ...UI_PACKAGES.map((p) => join(REPO, 'packages', p, 'src'))].flatMap((root) => walk(root));

const show = (p: string) => relative(REPO, p).replace(/\\/gu, '/');

/**
 * Предмет — КОД, а не проза о нём. Без снятия комментариев зуб краснел бы на самом объяснении,
 * почему `-content` здесь нельзя (и первая редакция этой правки на том и покраснела).
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:])\/\/[^\n]*/gu, '$1');
}

describe('семантический текст стоит на семантической поверхности', () => {
  it('ни один файл не ставит text-<sem>-content поверх только полупрозрачной bg-<sem>', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const sem of SEMANTICS) {
        const contentText = new RegExp(`text-${sem}-content(?![\\w-])`, 'u');
        if (!contentText.test(src)) continue;
        const solidSurface = new RegExp(`bg-${sem}(?![\\w/-])`, 'u');
        if (solidSurface.test(src)) continue;
        const translucentSurface = new RegExp(`bg-${sem}/\\d`, 'u');
        const surface = translucentSurface.test(src) ? `bg-${sem}/N` : 'никакой bg';
        offenders.push(`${show(file)}: text-${sem}-content, а поверхность — ${surface}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
