/**
 * generators-validation · strategic-docs-validate-client.mjs
 * Phase 2 — клиент + полностью исполняемый стаб office
 */

export class ValidationTransportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationTransportError';
  }
}

/** Исполняемый стаб-эндпоинт Office (Phase 2) */
export function stubOfficeValidateHandler(reqBody) {
  const reasons = [];

  if (!reqBody?.templateSnapshot?.slots?.length) reasons.push('empty slots');
  if (typeof reqBody?.draft?.body !== 'string' || !reqBody.draft.body.includes('---')) {
    reasons.push('body missing stub separator');
  }
  if (reqBody?.templateSnapshot?.meta?.forceInvalid === true) {
    reasons.push('forceInvalid');
  }

  return {
    ok: reasons.length === 0,
    reasons,
    validatorVersion: 'stub-office-1.0',
    requestId: reqBody?.requestId ?? `req-${Math.random().toString(36).slice(2)}`
  };
}

/** Stub fetch, который использует handler выше */
function createStubFetch() {
  return async (_, init) => {
    const body = JSON.parse(init.body);
    const result = stubOfficeValidateHandler(body);
    return {
      ok: true,
      status: 200,
      json: async () => result
    };
  };
}

/**
 * Основной клиент
 */
export async function validateViaOffice(req, opts = {}) {
  const fetchImpl = opts.fetchImpl ?? createStubFetch();

  const response = await fetchImpl('http://stub.office.local/v1/office/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...req,
      requestId: req.requestId ?? `req-${Math.random().toString(36).slice(2)}`
    })
  });

  if (!response.ok) {
    throw new ValidationTransportError(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (typeof data?.ok !== 'boolean') {
    throw new ValidationTransportError('Invalid response format from office');
  }
  return data;
}

/** Удобный фасад для передачи в generate() */
export function makeValidateClient(clientOpts = {}) {
  return (template, draftRelease) => validateViaOffice({
    templateId: template.id,
    templateVersion: template.version,
    templateSnapshot: template,
    draft: { body: draftRelease.body, trace: draftRelease.trace }
  }, clientOpts);
}

export default validateViaOffice;
