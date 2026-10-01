export const ANGELINA_SESSION_REL = '.membrana/angelina-session.json';

export function sessionState(active, at, source) {
  if (typeof active !== 'boolean' || !at || !source) throw new Error('session state requires active, at, source');
  return { schema: 'angelina-session/1', active, at, source };
}

export function renderHostessArtifact({ premises, entry, gates, analysts, session }) {
  if (!premises || !entry || !gates || !analysts || !session) throw new Error('hostess artifact requires all four echoes');
  return [
    'Основания:', premises,
    'Вердикт:',
    `1. Вход: ${entry}`,
    `2. Гейты: ${gates}`,
    `3. Аналитики: ${analysts}`,
    `4. Сессия: ${session}`,
  ].join('\n');
}
