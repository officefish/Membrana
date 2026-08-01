/**
 * Нарезка как контракт до работы — чистые предикаты формы и полей плана
 * (Block `cut-contract`, коворк `cowork-honest-sprint`, Phase 2).
 *
 * Здесь нет `fs`, сети и часов: документ приходит значением, реестр голосов —
 * значением, время — параметром. ФС, вывод и код возврата живут в
 * `scripts/sprint-cut-check.mjs`.
 *
 * Порог компактности НЕ переобъявляется: `OVERSIZED_CHANGED_LINES` и предикат
 * `isSegmentOversized` импортируются из `scripts/lib/day-work-diff.mjs` —
 * носитель мерки один. Скопировать 400 к себе значит оставить возможность
 * разъехаться на единицу: у ревью граница строгая (`> 400`), и блок ровно в 400
 * строк был бы зелёным здесь и красным там.
 */
import { OVERSIZED_CHANGED_LINES, isSegmentOversized } from '../day-work-diff.mjs';
import { ACT_KINDS, cutterRanContext } from './act-kinds.mjs';

export { OVERSIZED_CHANGED_LINES, isSegmentOversized };

/** Схема документа плана нарезки. */
export const SCHEMA = 'sprint-cut/1';

/**
 * Режим ответственности — закрытый выбор из двух (вердикт M8 заседания).
 * Молчание режимом не является: план без `mode` читается как `explicit-honest`.
 * Литерал второй двери взят словом владельца из `OWNER_ANSWERS.md` (§2).
 */
export const MODES = Object.freeze(['explicit-honest', 'membrana-flow']);

/**
 * Причины второй двери — закрытый список из ЧЕТЫРЁХ (слово владельца, 30.07).
 * «Разведка/прототип» отвергнута сознательно: формулировка эластична и была бы
 * самой вероятной лазейкой. Пятая причина — только по новому слову владельца.
 */
export const UNASSIGNED_REASONS = Object.freeze([
  'mechanical',
  'no_profile_owner',
  'owner_solo',
  'urgent_recovery',
]);

/**
 * Закрытый список находок — способы документу перестать быть контрактом.
 *
 * `cutter_context_missing` добавлен **актом владельца 01.08** (седьмой зуб). Основание —
 * долг `#sprint-cut-act-has-no-trace`: `cutBy` проставляется именем, и что резчик прогнал
 * свой профильный контекст, не проверялось ничем. Вещдок 30.07: план `mfcc-compare-sprint`
 * v1 подписан `cutBy=tarasov` без прогона контекста тимлида — поймал владелец, не механизм.
 * Повтор 01.08 в прогоне `meeting-gates-teeth`: та же подпись рукой.
 *
 * Ни один из шести прежних не подходил: `performer_unnamed` про исполнителя БЛОКА,
 * `cut_shape` про форму документа. Список остаётся закрытым — он стал из семи, а не открылся.
 */
export const TOOTH_IDS = Object.freeze([
  'cut_shape',
  'block_oversized',
  'performer_unnamed',
  'context_unnamed',
  'zones_overlap',
  'plan_unratified',
  'cutter_context_missing',
]);

/** Закрытый список вердиктов. `unreadable` существует, чтобы «ноль находок» на мусоре не зеленело. */
export const VERDICTS = Object.freeze(['contract', 'findings', 'unreadable']);

/** Находка: имя зуба + адрес + человеческая причина (норма M7 тарифного заседания). */
export const finding = (toothId, where, reason) => ({ toothId, where, reason });

const isFilled = (v) => typeof v === 'string' && v.trim() !== '';
const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Режим плана: молчание = `explicit-honest` (не «режима нет»). */
export const modeOf = (plan) => (plan?.mode == null ? 'explicit-honest' : plan.mode);

/**
 * Находки формы: пока форма не читается, остальные пять зубов сообщали бы
 * чепуху на мусоре либо падали, а падение в цепочке = молчаливая зелёнка.
 *
 * @param {unknown} plan документ плана
 * @param {readonly string[]} voices закрытый список id реестра голосов (значение, не файл)
 * @returns {Array<{toothId: string, where: string, reason: string}>}
 */
export function shapeFindings(plan, voices) {
  if (!isPlainObject(plan)) {
    return [finding('cut_shape', '(документ)', 'план не объект — читать нечего')];
  }
  if (!Array.isArray(voices) || voices.length === 0 || !voices.every(isFilled)) {
    return [
      finding(
        'cut_shape',
        '(вход)',
        'реестр голосов не подан значением — принадлежность id проверить нечем; молчаливый зелёный запрещён',
      ),
    ];
  }

  const out = [];
  if (plan.schema !== SCHEMA) {
    out.push(finding('cut_shape', 'schema', `схема «${plan.schema}» ≠ «${SCHEMA}» — документ другого рода`));
  }
  if (!isFilled(plan.sprintId)) out.push(finding('cut_shape', 'sprintId', 'нет id спринта — плану не к чему относиться'));
  if (plan.mode != null && !MODES.includes(plan.mode)) {
    out.push(finding('cut_shape', 'mode', `режим «${plan.mode}» вне закрытого списка: ${MODES.join(' · ')}`));
  }
  if (!isFilled(plan.cutBy)) {
    out.push(finding('cut_shape', 'cutBy', 'не сказано, кто резал — нарезка без автора не контракт'));
  } else if (!voices.includes(plan.cutBy)) {
    out.push(finding('cut_shape', 'cutBy', `«${plan.cutBy}» вне реестра голосов — id, а не человеческое имя`));
  }
  if (plan.ratification != null && !isPlainObject(plan.ratification)) {
    out.push(finding('cut_shape', 'ratification', 'узел ратификации не объект'));
  }

  if (!Array.isArray(plan.blocks)) {
    out.push(finding('cut_shape', 'blocks', 'блоки поданы не списком — нарезку нечем перечислить'));
    return out;
  }
  if (plan.blocks.length === 0) {
    out.push(finding('cut_shape', 'blocks', 'блоков нет — нарезка пуста'));
    return out;
  }

  const seen = new Set();
  plan.blocks.forEach((block, i) => {
    const at = isFilled(block?.blockId) ? `blocks.${block.blockId}` : `blocks[${i}]`;
    if (!isPlainObject(block)) {
      out.push(finding('cut_shape', `blocks[${i}]`, 'блок не объект'));
      return;
    }
    if (!isFilled(block.blockId)) {
      out.push(finding('cut_shape', `blocks[${i}].blockId`, 'у блока нет слага — вещдокам исполнения не к чему цепляться'));
    } else if (seen.has(block.blockId)) {
      out.push(finding('cut_shape', at, 'blockId встречается дважды — ключ соединения обязан быть уникален'));
    }
    if (isFilled(block.blockId)) seen.add(block.blockId);

    if (!Array.isArray(block.zone) || block.zone.length === 0 || !block.zone.every(isFilled)) {
      out.push(finding('cut_shape', `${at}.zone`, 'зона не задана списком путей — нарезке нечего разделять'));
    }
    const lines = block.estimate?.changedLines;
    if (typeof lines !== 'number' || !Number.isFinite(lines) || lines < 0) {
      out.push(
        finding(
          'cut_shape',
          `${at}.estimate.changedLines`,
          'нет прогноза объёма числом изменённых строк — сравнивать «нарезка ↔ результат» будет нечем',
        ),
      );
    }
  });
  return out;
}

/**
 * Переполнение — управленческое решение, а не сбой: находка несёт адрес и цифры
 * «прогноз против порога», а не совет «разрежьте мельче».
 */
export function volumeFindings(plan) {
  const out = [];
  for (const block of plan.blocks) {
    const lines = block.estimate.changedLines;
    if (isSegmentOversized(lines)) {
      out.push(
        finding(
          'block_oversized',
          `blocks.${block.blockId}.estimate.changedLines`,
          `прогноз ${lines} изменённых строк против порога одной проверки ревью ${OVERSIZED_CHANGED_LINES}: ` +
            'решение о перерезке принимает тимлид, извещая владельца — тихая перерезка запрещена',
        ),
      );
    }
  }
  return out;
}

/**
 * Находки по несущим полям блока: кто держит контракт и через какой контекст он
 * заверяется. Совпадение `persona` и `context` не подразумевается молча —
 * выведенное значение уже один раз соврало (`leadPersona` непустой у 214 карточек).
 *
 * Отказ легален, но с причиной: в режиме `membrana-flow` пустая персона
 * допустима ТОЛЬКО с причиной из закрытого списка, и тогда контекст тоже
 * «не применимо» — отказ покрывает оба поля, потому что заверять некому.
 */
export function performerFindings(plan, voices) {
  const mode = modeOf(plan);
  const out = [];
  for (const block of plan.blocks) {
    const at = `blocks.${block.blockId}`;
    if (mode === 'membrana-flow' && block.persona == null) {
      if (!UNASSIGNED_REASONS.includes(block.unassignedReason)) {
        out.push(
          finding(
            'performer_unnamed',
            `${at}.unassignedReason`,
            `персоны нет, а причина отказа «${block.unassignedReason ?? '—'}» вне закрытого списка ` +
              `(${UNASSIGNED_REASONS.join(' · ')}): пустое поле отказом не является`,
          ),
        );
      }
      continue; // легальный отказ: персона и контекст — «не применимо», а не «пройдено»
    }
    if (!isFilled(block.persona)) {
      out.push(finding('performer_unnamed', `${at}.persona`, 'персона не названа, а режим плана требует ответственного'));
    } else if (!voices.includes(block.persona)) {
      out.push(
        finding(
          'performer_unnamed',
          `${at}.persona`,
          `«${block.persona}» вне реестра голосов — нужен id голоса, не имя человека, роли или модели`,
        ),
      );
    }
    if (!isFilled(block.context)) {
      out.push(
        finding(
          'context_unnamed',
          `${at}.context`,
          'не сказано, через какой профильный контекст идёт блок — сертификации некуда встать',
        ),
      );
    } else if (!voices.includes(block.context)) {
      out.push(finding('context_unnamed', `${at}.context`, `контекст «${block.context}» вне реестра голосов`));
    }
  }
  return out;
}

/** Литеральный префикс глоба — часть до первого подстановочного знака. */
const zonePrefix = (zone) => {
  const cut = zone.replace(/\\/g, '/').search(/[*?[]/);
  const head = cut === -1 ? zone.replace(/\\/g, '/') : zone.replace(/\\/g, '/').slice(0, cut);
  return head.replace(/\/+$/, '');
};

/**
 * Пересечение зон: если два блока пишут в один путь — это не нарезка,
 * параллельная работа коллизит (прецедент 2026-07-09: чужая сессия увела ветку).
 *
 * Сравнение консервативное и посегментное: равные пути и вложение одного
 * литерального префикса в другой. Экзотические глобы (`{a,b}`, `..`) сознательно
 * не раскрываются — это признанный предел зуба, а не обещание полноты.
 */
/**
 * Находка седьмого зуба: резчик подписался, но своего контекста не прогонял.
 *
 * `acts === undefined` — проверка НЕ выполняется вовсе (не «прошла»): чистые вызовы ядра
 * без ленты не начинают врать зелёным. Пустая лента `[]` — это уже «не прогонял»: отсутствие
 * вещдока не есть вещдок отсутствия наоборот, и именно так болезнь и выглядела — надпись без
 * следа.
 *
 * @param {{sprintId?: string, cutBy?: string}} plan
 * @param {Array<{kind: string, sprintId: string, subject: string}>|undefined} acts разобранная лента актов плана
 */
export function cutterFindings(plan, acts) {
  if (acts === undefined) return [];
  if (cutterRanContext(acts, plan)) return [];
  return [
    finding(
      'cutter_context_missing',
      'cutBy',
      `резчик «${plan?.cutBy ?? '—'}» подписал план, но следа его прогона контекста нет: ` +
        `в ленте актов не найден ${ACT_KINDS.CUT_CONTEXT_RUN} для этого спринта`,
    ),
  ];
}

export function zoneFindings(plan) {
  const out = [];
  const blocks = plan.blocks;
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      for (const a of blocks[i].zone) {
        for (const b of blocks[j].zone) {
          const pa = zonePrefix(a);
          const pb = zonePrefix(b);
          const nested = pa === pb || pa.startsWith(`${pb}/`) || pb.startsWith(`${pa}/`);
          if (!nested) continue;
          out.push(
            finding(
              'zones_overlap',
              `blocks.${blocks[i].blockId} ↔ blocks.${blocks[j].blockId}`,
              `зоны «${a}» и «${b}» пишут в один путь — параллельные блоки коллизят`,
            ),
          );
        }
      }
    }
  }
  return out;
}
