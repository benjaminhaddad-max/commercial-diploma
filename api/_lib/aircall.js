/**
 * Aircall API client
 * Docs: https://developer.aircall.io/api-references/
 * Rate limit: 60 req/min
 */

const BASE_URL = 'https://api.aircall.io/v1';

function getAuthHeader() {
  const apiId = process.env.AIRCALL_API_ID;
  const apiToken = process.env.AIRCALL_API_TOKEN;
  if (!apiId || !apiToken) throw new Error('Missing Aircall API credentials');
  return 'Basic ' + Buffer.from(`${apiId}:${apiToken}`).toString('base64');
}

/**
 * Fetch from Aircall API
 */
async function aircallFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Aircall API error ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Fetch all calls with pagination
 * @param {Object} params - { from, to, order } (from/to are unix timestamps)
 * @param {number} maxPages - max pages to fetch (safety limit)
 */
async function fetchAllCalls(params = {}, maxPages = 20) {
  const allCalls = [];
  let page = 1;

  while (page <= maxPages) {
    const data = await aircallFetch('/calls', {
      ...params,
      per_page: 50,
      page,
      order: params.order || 'desc',
    });

    if (data.calls && data.calls.length > 0) {
      allCalls.push(...data.calls);
    }

    // Check if there are more pages
    if (!data.meta || page >= data.meta.total_pages) break;
    page++;

    // Small delay to respect rate limits (60 req/min)
    await new Promise(r => setTimeout(r, 100));
  }

  return allCalls;
}

/**
 * Fetch all Aircall users (agents)
 */
async function fetchUsers() {
  const data = await aircallFetch('/users', { per_page: 50 });
  return data.users || [];
}

module.exports = { aircallFetch, fetchAllCalls, fetchUsers };
