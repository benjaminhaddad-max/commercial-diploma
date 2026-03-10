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

// Pipeline & stage IDs for "Diploma Santé 2026-2027"
const PIPELINE_ID = '2313043166';
const STAGES = {
  aReplanifier: '3165428979',        // 📞 A REPLANIFIER (order 0)
  rdvDecouvertePris: '3165428980',   // 📅 RDV DÉCOUVERTE PRIS (order 1)
  delaiReflexion: '3165428981',      // ⏳ DÉLAI DE RÉFLEXION (order 2)
  panierAbandonne: '3167730913',     // ❌ Panier Abandonné (order 3)
  preinscription: '3165428982',      // 📂 Préinscription effectuée (order 4)
  finalisation: '3165428983',        // 📋 Finalisation (order 5)
  inscriptionConfirmee: '3165428984',// ✅ Inscription confirmée (order 6)
  fermePerdu: '3165428985',          // 🛑 Fermé perdu (order 7)
};

// RDV effectués = the meeting actually happened (stage ≥ Délai de réflexion)
const STAGES_RDV_EFFECTUE = new Set([
  STAGES.delaiReflexion,
  STAGES.panierAbandonne,
  STAGES.preinscription,
  STAGES.finalisation,
  STAGES.inscriptionConfirmee,
  STAGES.fermePerdu,
]);

// Dossiers finalisés = positive progression past préinscription
const STAGES_DOSSIER_FINALISE = new Set([
  STAGES.preinscription,
  STAGES.finalisation,
  STAGES.inscriptionConfirmee,
]);

/**
 * Get deal stats for a period: counts by funnel stage + per-owner breakdown
 * Deals created in [from, to] in the Diploma pipeline
 * - RDV pris = all deals except "A replanifier" (no RDV yet)
 * - RDV effectués = deals where the meeting happened (Délai de réflexion+)
 * - Dossiers finalisés = Préinscription + Finalisation + Inscription confirmée
 */
async function getDealStats(from, to) {
  const fromMs = from.getTime();
  const toMs = to.getTime();

  const deals = await searchObjects('deals', {
    filterGroups: [{
      filters: [
        { propertyName: 'pipeline', operator: 'EQ', value: PIPELINE_ID },
        { propertyName: 'createdate', operator: 'GTE', value: String(fromMs) },
        { propertyName: 'createdate', operator: 'LTE', value: String(toMs) },
      ],
    }],
    properties: ['dealstage', 'createdate', 'hubspot_owner_id', 'dealname'],
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
  });

  // Exclude "A replanifier" — those don't have an RDV yet
  const rdvPris = deals.filter(d => d.properties.dealstage !== STAGES.aReplanifier).length;
  const rdvEffectues = deals.filter(d => STAGES_RDV_EFFECTUE.has(d.properties.dealstage)).length;
  const dossiersRealises = deals.filter(d => STAGES_DOSSIER_FINALISE.has(d.properties.dealstage)).length;

  // Per-owner breakdown
  const byOwner = {};
  deals.forEach(d => {
    const ownerId = d.properties.hubspot_owner_id;
    const stage = d.properties.dealstage;
    if (!ownerId) return;
    if (!byOwner[ownerId]) {
      byOwner[ownerId] = { ownerId, rdvPris: 0, rdvEffectues: 0, dossiersRealises: 0 };
    }
    if (stage !== STAGES.aReplanifier) byOwner[ownerId].rdvPris++;
    if (STAGES_RDV_EFFECTUE.has(stage)) byOwner[ownerId].rdvEffectues++;
    if (STAGES_DOSSIER_FINALISE.has(stage)) byOwner[ownerId].dossiersRealises++;
  });

  return { rdvPris, rdvEffectues, dossiersRealises, byOwner, totalDeals: deals.length };
}

/**
 * Get HubSpot owners mapped by ID → { firstName, lastName, email }
 * Used to match HubSpot owners to Aircall agents by name
 */
async function getOwnerMap() {
  const owners = await getOwners();
  const map = {};
  owners.forEach(o => {
    map[o.id] = {
      id: o.id,
      firstName: o.firstName,
      lastName: o.lastName,
      email: o.email,
      fullName: `${o.firstName || ''} ${o.lastName || ''}`.trim(),
    };
  });
  return map;
}

module.exports = {
  hubspotFetch,
  searchObjects,
  getOwners,
  getOwnerMap,
  getPipelineStages,
  getPipelines,
  getDealStats,
  PIPELINE_ID,
  STAGES,
};
