/**
 * Неинтерактивный git editor (ATF4-4 / #972).
 *
 * Эпизод: `git rebase --continue` после resolve →
 * «Terminal is dumb, but EDITOR unset».
 */

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {NodeJS.ProcessEnv}
 */
export function envWithNonInteractiveGitEditor(env = process.env) {
  const next = { ...env };
  if (!next.GIT_EDITOR) next.GIT_EDITOR = 'true';
  if (!next.EDITOR) next.EDITOR = next.GIT_EDITOR;
  return next;
}
