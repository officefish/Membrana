/**
 * office-image-smoke — чистое ядро прибора «образ офиса исполняет то, что должен»
 * (блок 1 спринта dockerfile-copy-manifest-drifts, иссью #1797).
 *
 * Зачем прибор. `packages/background-office/Dockerfile` перечисляет файлы из `scripts/`
 * ПОИМЁННО: список дублирует граф импортов и обязан следовать за ним вручную. Сборка
 * расхождения не видит — образ соберётся зелёным, а прод упадёт на `MODULE_NOT_FOUND`
 * при первом обращении (срабатывание 07.08: перевод `dreams-tick` на `classify.mjs`).
 *
 * ПОЧЕМУ ЗДЕСЬ НЕТ СПИСКА МОДУЛЕЙ — условие резчика, названное как BLOCK. Своя копия
 * списка сделала бы третий рукописный источник истины поверх двух и усугубила ровно тот
 * дефект, который лечим. Поэтому прибор не перечисляет зависимости: он дёргает у
 * поднятого контейнера `GET /v1/dreams/digest/:day`, а затем запускает внутренний
 * static-registry probe. Оба пути не ходят в сеть и не требуют публичного auth-монтажа.
 * Список живёт там, где и должен — в коде офиса; прибор проверяет его исполнением.
 *
 * Ядро чистое: ни docker, ни сети, ни ФС. Ответы приходят значением, поэтому вердикт
 * проверяется зубами без образа.
 */

/** Исходы прибора. Список закрыт: чужой исход — ошибка входа, а не «прочее». */
export const SMOKE_OUTCOMES = Object.freeze(['pass', 'missing-module', 'unhealthy', 'broken']);

/**
 * Имя недостающего модуля из текста ошибки Node. Нужно именно ИМЯ: «упало» заставит
 * читателя лезть в логи, а имя файла сразу называет строку `COPY`, которую забыли.
 *
 * @param {string} text
 * @returns {string|null}
 */
export function missingModuleFrom(text) {
  const s = String(text ?? '');
  // Node 20: «Cannot find module '/app/scripts/lib/x.mjs' imported from …».
  const byImport = s.match(/Cannot find module '([^']+)'/u);
  if (byImport) return byImport[1];
  // ERR_MODULE_NOT_FOUND в JSON-ответе Nest приходит с экранированными кавычками.
  const byEscaped = s.match(/Cannot find module \\"([^\\"]+)\\"/u);
  if (byEscaped) return byEscaped[1];
  // Форма для CommonJS-требований внутри образа.
  const byRequire = s.match(/MODULE_NOT_FOUND[\s\S]{0,200}?'([^']+\.(?:mjs|js|json))'/u);
  return byRequire ? byRequire[1] : null;
}

/**
 * Вердикт по снимку прогона.
 *
 * `health`, `digest` и `staticRegistry` — то, что исполнил контейнер; `logs` — его stderr. Разделение
 * умышленное: «контейнер не поднялся» и «поднялся, но модуля нет» — разные диагнозы, и
 * склеить их в одно «красное» значило бы заставить читателя гадать, что чинить.
 *
 * @param {object} snapshot
 * @param {{ok: boolean, status?: number}|null} [snapshot.health]
 * @param {{ok: boolean, status?: number, body?: string}|null} [snapshot.digest]
 * @param {{ok: boolean, status?: number, body?: string}|null} [snapshot.staticRegistry]
 * @param {string} [snapshot.logs]
 * @returns {{outcome: string, missingModule: string|null, detail: string}}
 */
export function smokeVerdict(snapshot = {}) {
  const logs = String(snapshot.logs ?? '');
  const health = snapshot.health ?? null;
  const digest = snapshot.digest ?? null;
  const staticRegistry = snapshot.staticRegistry ?? null;

  // Недостающий модуль ищем ПЕРВЫМ и в обоих источниках: если офис падает на импорте
  // при старте, health не ответит никогда, и диагноз «unhealthy» скрыл бы настоящую
  // причину — ровно то молчание, против которого прибор и заводится.
  const fromLogs = missingModuleFrom(logs);
  const fromBody = missingModuleFrom(digest?.body ?? '');
  const fromStaticRegistry = missingModuleFrom(staticRegistry?.body ?? '');
  const missing = fromStaticRegistry ?? fromBody ?? fromLogs;
  if (missing) {
    return {
      outcome: 'missing-module',
      missingModule: missing,
      detail: `образ неполон: модуль «${missing}» не скопирован в образ — добавь его строкой COPY в packages/background-office/Dockerfile`,
    };
  }

  if (health === null) {
    return {
      outcome: 'broken',
      missingModule: null,
      detail: 'прогон НЕ состоялся: контейнер не опрошен (сборка или запуск не дошли до опроса). «Не знаю» не значит «здоров»',
    };
  }
  // Нездоровый контейнер — сам себе диагноз, и отсутствие дайджеста здесь его СЛЕДСТВИЕ,
  // а не вторая поломка: опрашивать мёртвое незачем. Порядок этих двух проверок стоил
  // одного красного зуба — он и держит его теперь.
  if (!health.ok) {
    return {
      outcome: 'unhealthy',
      missingModule: null,
      detail: `контейнер не отвечает на /health (status ${health.status ?? '—'}) — до проверки модулей дело не дошло`,
    };
  }
  if (digest === null) {
    return {
      outcome: 'broken',
      missingModule: null,
      detail: 'прогон НЕ состоялся: контейнер здоров, но дайджест не опрошен — прибор не вправе звать это полнотой образа',
    };
  }
  if (!digest.ok) {
    return {
      outcome: 'broken',
      missingModule: null,
      detail: `дайджест снов ответил ${digest.status ?? '—'}, но имени недостающего модуля в ответе нет — читай логи контейнера целиком, диагноз прибора здесь кончается`,
    };
  }
  if (staticRegistry === null) {
    return {
      outcome: 'broken',
      missingModule: null,
      detail: 'прогон НЕ состоялся: static-registry runtime не опрошен внутри контейнера',
    };
  }
  if (!staticRegistry.ok) {
    return {
      outcome: 'broken',
      missingModule: null,
      detail: `static-registry runtime probe завершился с кодом ${staticRegistry.status ?? '—'} — JSONL, parser или index не исполняются в финальном образе`,
    };
  }
  return {
    outcome: 'pass',
    missingModule: null,
    detail: 'образ исполняет рантайм офиса: дайджест снов загрузил свои модули, static registry прочитал JSONL и выполнил lookup',
  };
}

/**
 * Строки вывода. `pass` — утверждение о проверенном, а не молчание.
 *
 * @param {ReturnType<typeof smokeVerdict>} verdict
 * @returns {string[]}
 */
export function formatSmokeVerdict(verdict) {
  const lines = [`office:image:smoke — ${verdict.outcome}`];
  lines.push(`  ${verdict.detail}`);
  if (verdict.outcome === 'pass') {
    lines.push('  проверено ИСПОЛНЕНИЕМ, а не списком: dreams digest + static registry JSONL/parser/index lookup внутри образа');
  }
  for (const l of SMOKE_LIMITS) lines.push(`  предел прибора: ${l}`);
  return lines;
}

/**
 * Честные пределы прибора — печатаются вместе с вердиктом. Обещать больше измеренного —
 * ровно та болезнь, против которой весь контур и строился.
 */
export const SMOKE_LIMITS = Object.freeze([
  'проверяет путь снов и static registry; модули только других путей офиса вне области',
  'json-данные вне dreams digest и static registry probe могут оставаться ленивыми и не проверяются',
  'судит полноту образа, а не корректность поведения: дайджест может быть пустым и всё равно pass',
]);
