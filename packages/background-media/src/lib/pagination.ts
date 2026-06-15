export const DEFAULT_SAMPLES_PAGE_SIZE = 40;
export const MAX_SAMPLES_PAGE_SIZE = 100;

export interface ParsedPageQuery {
  page: number;
  limit: number;
  skip: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Parse `page` / `limit` query params for sample list endpoints. */
export function parseSamplesPageQuery(
  rawPage?: string,
  rawLimit?: string,
): ParsedPageQuery {
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);
  const parsedLimit = Number.parseInt(rawLimit ?? String(DEFAULT_SAMPLES_PAGE_SIZE), 10);
  const limit = Math.min(
    MAX_SAMPLES_PAGE_SIZE,
    Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_SAMPLES_PAGE_SIZE),
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPageMeta(total: number, page: number, limit: number): PageMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
