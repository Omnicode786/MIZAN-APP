export function getPagination(searchParams: URLSearchParams, defaults: { limit?: number; maxLimit?: number } = {}) {
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const maxLimit = defaults.maxLimit || 50;
  const requestedLimit = Number(searchParams.get("limit") || defaults.limit || 20) || defaults.limit || 20;
  const limit = Math.max(1, Math.min(maxLimit, requestedLimit));

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}
