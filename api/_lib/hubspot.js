/**
 * HubSpot API client
 * Auth: Private App Token
 * Rate limit: 500 req/10s (private app)
 */

const BASE_URL = 'https://api.hubapi.com';

function getToken() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('Missing HUBSPOT_ACCESS_TOKEN');
  return token;
}

/**
 * Generic HubSpot API fetch
 */
async function hubspotFetch(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 429) {
    // Rate limited — wait and retry once
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return hubspotFetch(endpoint, options);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Search CRM objects (deals, contacts, calls, meetings, etc.)
 * @param {string} objectType - 'deals', 'contacts', 'calls', 'meetings'
 * @param {Object} searchBody - HubSpot search request body
 * @param {number} maxResults - max results to fetch
 */
async function searchObjects(objectType, searchBody, maxResults = 1000) {
  const allResults = [];
  let after = undefined;

  while (allResults.length < maxResults) {
    const body = {
      ...searchBody,
      limit: Math.min(100, maxResults - allResults.length),
      ...(after ? { after } : {}),
    };

    const data = await hubspotFetch(`/crm/v3/objects/${objectType}/search`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (data.results && data.results.length > 0) {
      allResults.push(...data.results);
    }

    // Check for more pages
    if (!data.paging || !data.paging.next || !data.paging.next.after) break;
    after = data.paging.next.after;
  }

  return allResults;
}

/**
 * Get CRM owners (sales reps)
 */
async function getOwners() {
  const data = await hubspotFetch('/crm/v3/owners?limit=100');
  return data.results || [];
}

/**
 * Get deal pipeline stages
 */
async function getPipelineStages(pipelineId) {
  const data = await hubspotFetch(`/crm/v3/pipelines/deals/${pipelineId}/stages`);
  return data.results || [];
}

/**
 * Get all deal pipelines
 */
async function getPipelines() {
  const data = await hubspotFetch('/crm/v3/pipelines/deals');
  return data.results || [];
}

module.exports = {
  hubspotFetch,
  searchObjects,
  getOwners,
  getPipelineStages,
  getPipelines,
};
