/**
 * Чистая часть тембрового детектора в измерителе: разбор отпечатка настроек, проверка пресета
 * калибровки и сборка спеки судьи. Ни файлов, ни библиотеки, ни корпуса — считалка и чтение
 * звука живут в CLI, как и у соседа `mfcc-gates.mjs`.
 *
 * Вынесено в `lib/` по той же причине, что и калибровка (ревью 31.07, P2): граничные случаи
 * пресета — не редкость, а норма (пересняли корпус, поменяли сетку, отпечаток разъехался), и
 * зубы им нужны свои.
 */

/** Уровни строгости пресета. Закрытый список: чужое значение отвергается, а не подставляется. */
export const MFCC_STRICTNESS_LEVELS = ['easy', 'normal', 'strict'];

/**
 * Умолчание — `normal`, ровно то, с которым живёт прибор
 * (`DEFAULT_MFCC_CONFIG` в `apps/client/src/plugins/mfcc-analyzer-test/mfccPluginState.ts`).
 *
 * Измеритель обязан мерять РАБОЧУЮ точку прибора, а не ту, на которой цифра красивее: выбор
 * уровня по итогу прогона и есть отбор по тесту. Два других уровня доступны флагом
 * `--mfcc-strictness`, и выбранный печатается рядом с числом.
 */
export const MFCC_DEFAULT_STRICTNESS = 'normal';

/**
 * Настройки свёртки, разобранные из отпечатка пресета. `null` — отпечаток не разбирается.
 *
 * Разбор, а не вторая копия чисел: отпечаток и есть единственное место, где они названы.
 * Форма и требование `-sr` взяты у прибора (`configFromHash`, #1603): банк мел-фильтров
 * строится ОТ ЧАСТОТЫ, поэтому вектор, снятый на 44 100, несравним с воротами, снятыми на
 * 48 000, а длина вектора при этом совпадает — подмену не ловит ничто, кроме отпечатка.
 * Отпечаток без `-sr` отвергается намеренно: «не знаем частоту» и «частота такая-то» суть
 * разные состояния, и первое не имеет права молча притвориться вторым.
 *
 * @param {string} configHash
 */
export function mfccConfigFromHash(configHash) {
  if (typeof configHash !== 'string') return null;
  const m = /^mel(\d+)-c(\d+)-buf(\d+)-sr(\d+)$/u.exec(configHash);
  if (!m) return null;
  return {
    melBands: Number(m[1]),
    numberOfCoefficients: Number(m[2]),
    bufferSize: Number(m[3]),
    sampleRate: Number(m[4]),
  };
}

/** @param {unknown} v */
function isRatio(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

/**
 * Пригодность пресета калибровки. Возвращает причину негодности или `null`.
 *
 * Проверяется ЗДЕСЬ, а не в судье: судья видит уже развёрнутую спеку и о том, из какого
 * набора взяты его пороги, не знает. Несущая сверка — длина коридоров против числа
 * коэффициентов ИЗ ОТПЕЧАТКА: пресет, снятый при 24 коэффициентах, и считалка, настроенная на
 * 13, дали бы отказ судьи в глубине прогона вместо внятного «пресет не тот».
 *
 * @param {unknown} preset
 * @param {string} [strictness] уровень, который собираются спросить; `undefined` — проверить все
 */
export function mfccPresetProblem(preset, strictness = undefined) {
  if (preset === null || typeof preset !== 'object') return 'пресет не объект';
  const p = /** @type {Record<string, unknown>} */ (preset);

  const config = mfccConfigFromHash(/** @type {string} */ (p.configHash));
  if (config === null) {
    return (
      `отпечаток «${String(p.configHash)}» не разбирается — при каких настройках сняты ворота, ` +
      'неизвестно (отпечаток без -sr отвергается намеренно: частота несущая)'
    );
  }

  if (!Array.isArray(p.bounds)) return 'bounds не массив';
  if (p.bounds.length !== config.numberOfCoefficients) {
    return `коридоров ${p.bounds.length} ≠ коэффициентов ${config.numberOfCoefficients} по отпечатку «${p.configHash}»`;
  }
  for (let i = 0; i < p.bounds.length; i += 1) {
    const b = p.bounds[i];
    if (b === null || typeof b !== 'object') return `коридор ${i}: не объект`;
    if (!Number.isFinite(b.min) || !Number.isFinite(b.max)) return `коридор ${i}: границы не конечны`;
    if (b.min > b.max) return `коридор ${i}: min=${b.min} > max=${b.max}`;
  }

  if (!Array.isArray(p.judgedCoefficients) || p.judgedCoefficients.length === 0) {
    return 'judgedCoefficients пуст — судить нечем';
  }
  for (const k of p.judgedCoefficients) {
    if (!Number.isInteger(k) || k < 0 || k >= config.numberOfCoefficients) {
      return `judgedCoefficients: номер ${String(k)} вне [0, ${config.numberOfCoefficients - 1}]`;
    }
  }

  if (!Number.isFinite(p.minMagnitude) || p.minMagnitude < 0) {
    return `minMagnitude=${String(p.minMagnitude)} — не конечное ≥ 0`;
  }

  if (p.strictness === null || typeof p.strictness !== 'object') return 'strictness не объект';
  if (strictness !== undefined && !MFCC_STRICTNESS_LEVELS.includes(strictness)) {
    return `уровень строгости «${strictness}» — не из ${MFCC_STRICTNESS_LEVELS.join('|')}`;
  }
  const levels = strictness === undefined ? MFCC_STRICTNESS_LEVELS : [strictness];
  for (const level of levels) {
    const pair = p.strictness[level];
    if (pair === null || typeof pair !== 'object') return `уровень «${level}» отсутствует в пресете`;
    if (!isRatio(pair.minInBandRatio)) {
      return `уровень «${level}»: minInBandRatio=${String(pair.minInBandRatio)} — не доля в [0, 1]`;
    }
    if (!isRatio(pair.minPassRate)) {
      return `уровень «${level}»: minPassRate=${String(pair.minPassRate)} — не доля в [0, 1]`;
    }
  }

  return null;
}

/**
 * Пресет калибровки → спека судьи (`PipeSpec` пакета `@membrana/mfcc-analyzer-service`).
 *
 * Разворот делает вызывающий, и это по праву, а не по недоделке: `strictness` — выбор пары
 * порогов ВНУТРИ пресета, а у пакета такого понятия нет вовсе, в спеке уже лежат числа. Ровно
 * так же разворачивает прибор (`specOf` в `mfccAnalyzerPlugin.ts`) — измеритель обязан судить
 * тем же способом, иначе он мерит не прибор.
 *
 * @throws если пресет негоден или уровень чужой — молчаливая подстановка умолчания означала бы
 *   вердикт по порогам, которых никто не выбирал.
 */
export function mfccPipeSpec(preset, strictness) {
  const problem = mfccPresetProblem(preset, strictness);
  if (problem !== null) throw new Error(`пресет тембрового детектора негоден: ${problem}`);
  const pair = preset.strictness[strictness];
  return {
    bounds: preset.bounds,
    configHash: preset.configHash,
    minInBandRatio: pair.minInBandRatio,
    minPassRate: pair.minPassRate,
    // Порог немого кадра берётся из пресета КАК ЕСТЬ, вместе с его нулём. Ноль означает
    // «защиты нет», а не «защита не нужна» (см. minMagnitudeWhy в отчёте калибровки): назначить
    // здесь своё число значило бы измерителю выбрать порог за калибровку.
    minMagnitude: preset.minMagnitude,
    judgedCoefficients: preset.judgedCoefficients,
  };
}

/**
 * Судит ли тембровый детектор тот самый корпус, из которого выведены его коридоры.
 *
 * ЗАЧЕМ ОТДЕЛЬНОЙ ПРОВЕРКОЙ. Пять соседних детекторов калиброваны пресетом, снятым на v0.2, и
 * их прогон по v0.2 такой же самозамер — но у них он давно назван (`splitFallback`, ADR-0006).
 * У тембрового ворота сняты ПЕРЦЕНТИЛЯМИ ПО КЛАССУ ЦЕЛИ на всех 120 записях: коридор c0 по
 * построению накрывает 90% дроновых кадров ЭТОГО корпуса. Цифра на нём — верхняя оценка, а не
 * ожидание на новом звуке, и молчание об этом читалось бы как «померяли на стороне».
 *
 * Сравниваются относительные пути через нормализованные разделители: `calibratedOn` записан
 * калибратором как `data/detectors-benchmark/v0.2`, а каталог корпуса приходит из CLI
 * абсолютным и на Windows — с обратными косыми.
 *
 * @param {string|null} calibratedOn относительный путь корпуса ворот; `null` — не назван
 * @param {string} datasetDir каталог корпуса текущего прогона (абсолютный)
 * @returns {{ self: boolean, reason: string }}
 */
export function mfccSelfMeasurement(calibratedOn, datasetDir) {
  const norm = (s) => String(s).split('\\').join('/').replace(/\/+$/u, '');
  if (typeof calibratedOn !== 'string' || calibratedOn.length === 0) {
    // «Не знаем, на чём сняты ворота» — не то же самое, что «сняты на другом корпусе».
    return { self: false, reason: 'корпус ворот не назван в пресете — самозамер не проверен' };
  }
  const gates = norm(calibratedOn);
  const run = norm(datasetDir);
  const self = run === gates || run.endsWith(`/${gates}`);
  return {
    self,
    reason: self
      ? `ворота сняты на ЭТОМ же корпусе (${gates})`
      : `ворота сняты на ${gates}, прогон идёт по другому корпусу`,
  };
}

/**
 * Кадры записи → векторы судьи.
 *
 * Отпечаток ставится ПРЕСЕТНЫЙ, а не тот, что стамповало бы ядро: `configHashOf` ядра частоту
 * не несёт (`mel40-c24-buf4096`), а ворота сняты при названной частоте (`…-sr48000`), и
 * сведение этих двух написаний — предмет вызывающего. Прибор поступает ровно так же
 * (`vectorsOf` в `mfccAnalyzerPlugin.ts`), и до тех пор, пока ядро частоту в отпечаток не
 * возьмёт, у обоих потребителей это шов, а не деталь.
 *
 * `windowStartIndex` — адрес кадра в сэмплах исходной записи, и он обязан строго расти:
 * судья читает порядок как время (`corpusProblem`), перемешанный корпус дал бы вердикт о
 * направлении там, где направления нет.
 *
 * @param {readonly {startIndex: number, coefficients: readonly number[]}[]} frameVectors
 * @param {string} configHash
 */
export function mfccVectorsOf(frameVectors, configHash) {
  return frameVectors.map((f) => ({
    coefficients: Float32Array.from(f.coefficients),
    windowStartIndex: f.startIndex,
    configHash,
  }));
}
