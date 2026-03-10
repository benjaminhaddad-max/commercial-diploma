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
 * Fetch all Aircall teams
 */
async function fetchTeams() {
  const data = await aircallFetch('/teams', { per_page: 50 });
  return data.teams || [];
}

/**
 * Fetch team by name (e.g. "Equipe commerciale")
 * Returns the team object with its user IDs
 */
async function getTeamByName(name) {
  const teams = await fetchTeams();
  return teams.find(t => t.name.toLowerCase().includes(name.toLowerCase())) || null;
}

/**
 * Get user IDs belonging to "Equipe commerciale"
 * Caches the result for 5 minutes to avoid repeated API calls
 */
let _teamCache = { ids: null, ts: 0 };
async function getCommercialTeamUserIds() {
  // Cache for 5 minutes
  if (_teamCache.ids && Date.now() - _teamCache.ts < 300000) {
    return _teamCache.ids;
  }

  const team = await getTeamByName('commerciale');
  if (!team) {
    console.warn('Team "Equipe commerciale" not found in Aircall');
    return null; // null = no filtering
  }

  const userIds = (team.users || []).map(u => typeof u === 'object' ? u.id : u);
  _teamCache = { ids: userIds, ts: Date.now() };
  return userIds;
}

/**
 * Fetch all Aircall users (agents)
 * If teamOnly=true, returns only users from "Equipe commerciale"
 */
async function fetchUsers(teamOnly = true) {
  const data = await aircallFetch('/users', { per_page: 50 });
  const allUsers = data.users || [];

  if (!teamOnly) return allUsers;

  const teamIds = await getCommercialTeamUserIds();
  if (!teamIds) return allUsers; // fallback: return all if team not found

  return allUsers.filter(u => teamIds.includes(u.id));
}

/**
 * Fetch all calls, filtered to "Equipe commerciale" team members only
 */
async function fetchTeamCalls(params = {}, maxPages = 20) {
  const allCalls = await fetchAllCalls(params, maxPages);

  // Filter to commercial team only
  const teamIds = await getCommercialTeamUserIds();
  if (!teamIds) return allCalls; // no filtering if team not found

  return allCalls.filter(c => c.user && teamIds.includes(c.user.id));
}

module.exports = { aircallFetch, fetchAllCalls, fetchTeamCalls, fetchUsers, fetchTeams, getCommercialTeamUserIds };
