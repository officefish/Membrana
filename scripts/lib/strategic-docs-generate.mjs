/**
 * generators-validation · strategic-docs-generate.mjs
 * Phase 2 — полностью исполняемый, изолированный, без соседей
 */

export class GranuleResolveError extends Error {
  constructor(msg) { super(msg); this.name = 'GranuleResolveError'; }
}

export class ValidationTransportError extends Error {
  constructor(msg) { super(msg); this.name = 'ValidationTransportError'; }
}

/** @typedef {Object} GranuleLiteral */
/** @typedef {Object} GranuleFn */
/** @typedef {GranuleLiteral|GranuleFn} Granule */
/** @typedef {Object} Template */
/** @typedef {{resolve:(id:string,ver:string)=>Granule|undefined}} GranuleIndex */
/** @typedef {Object} Release */

/**
 * @typedef {Object} IOAdapter
 * @property {(req:{op:string,args:object})=>Promise<any>} exec
 */

/**
 * @typedef {Object} GenerateOpts
 * @property {IOAdapter} [io]
 * @property {(template:Template,draft:{body:string,trace:object})=>Promise<{ok:boolean,reasons:string[]}>} [validate]
 * @property {(parts:string[],ctx:object)=>string} [renderBody]
 */

/** Дефолтный IO — запрещает любой внешний вызов */
export const pureIoThrow = {
  async exec() { throw new Error("I/O is not allowed in pure granule without adapter"); }
};

/** Вызов гранулы-fn как чистой функции */
export async function invokeGranuleFn(granule, pin = {}, io = pureIoThrow) {
  if (granule.kind !== 'fn') throw new TypeError(`Not a fn granule: ${granule.id}`);

  const mod = await import(granule.modulePath);
  const fn = mod[granule.exportName];
  if (typeof fn !== 'function') {
    throw new TypeError(`Granule ${granule.id}@${granule.version} missing export ${granule.exportName}`);
  }

  const ctx = { granuleId: granule.id, version: granule.version };
  const out = await fn({ pin, ctx }, io);

  if (!out || typeof out.body !== 'string') {
    throw new TypeError(`Granule ${granule.id}@${granule.version} must return { body: string }`);
  }
  return out;
}

/** Локальный стаб-предикат валидации (Phase 2). Настоящий клиент — в соседнем файле. */
function isValidStub(draft, template) {
  if (!template?.slots?.length) return false;
  // (убран ложный критерий «тело содержит ---»: разделитель есть лишь МЕЖДУ частями,
  //  одиночный слот его не даёт — валидный шаблон ошибочно уходил в experiment.)
  if (template.meta?.forceInvalid === true) return false;
  return true;
}

function stubRenderBody(parts) {
  return parts.join('\n---\n');
}

/**
 * Главная чистая функция генератора
 */
export async function generate(template, granuleIndex, opts = {}) {
  if (!template?.id || !template?.version || !Array.isArray(template.slots)) {
    throw new TypeError('Invalid template');
  }

  const io = opts.io ?? pureIoThrow;
  const validate = opts.validate ?? (async (t, d) => ({
    ok: isValidStub(d, t),
    reasons: isValidStub(d, t) ? [] : ['stub-validation-failed']
  }));
  const renderBody = opts.renderBody ?? stubRenderBody;

  const parts = [];
  const trace = {
    templateId: template.id,
    templateVersion: template.version,
    granules: {}
  };

  for (const slot of template.slots) {
    const granule = granuleIndex.resolve(slot.granuleId, slot.version ?? '1.0.0');
    if (!granule) {
      throw new GranuleResolveError(`Cannot resolve granule ${slot.granuleId}@${slot.version}`);
    }

    let bodyChunk;
    if (granule.kind === 'literal') {
      bodyChunk = granule.body;
    } else if (granule.kind === 'fn') {
      const result = await invokeGranuleFn(granule, slot.pin ?? {}, io);
      bodyChunk = result.body;
    } else {
      throw new TypeError(`Unknown granule kind: ${granule.kind}`);
    }

    parts.push(bodyChunk);
    trace.granules[`${granule.id}@${granule.version}`] = {
      kind: granule.kind,
      version: granule.version,
      ...(slot.pin && { pin: slot.pin })
    };
  }

  const body = renderBody(parts, { templateId: template.id });
  const draft = { body, trace };

  const validation = await validate(template, draft);
  const route = validation.ok ? 'release' : 'experiment';

  return {
    id: `gen-${Date.now().toString(36)}`,
    templateId: template.id,
    templateVersion: template.version,
    route,
    body,
    trace,
    validation,
    status: route
  };
}

export default generate;
