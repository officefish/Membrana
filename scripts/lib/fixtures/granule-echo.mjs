/** Тестовая чистая гранула */
export async function echo({ pin }) {
  return { body: `ECHO:${pin?.text ?? 'DEFAULT'}` };
}
