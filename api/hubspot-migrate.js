const { searchObjects, hubspotFetch } = require('./_lib/hubspot');

/**
 * One-time migration: move deals from pipeline 2025-2026 to 2026-2027
 * Only stages: A replanifier, RDV découverte pris, Délai de réflexion
 * Only deals created since October 2025
 *
 * GET  /api/hubspot-migrate         → preview (dry run)
 * POST /api/hubspot-migrate         → execute migration
 */

const OLD_PIPELINE = '1329267902'; // Diploma Santé 2025-2026
const NEW_PIPELINE = '2313043166'; // Diploma Santé 2026-2027

// Stage mapping: old → new
const STAGE_MAP = {
  '1809794261': '3165428979', // A REPLANIFIER
  '1809794262': '3165428980', // RDV DÉCOUVERTE PRIS
  '1809794263': '3165428981', // DÉLAI DE RÉFLEXION
};

const STAGE_LABELS = {
  '1809794261': 'A replanifier',
  '1809794262': 'RDV découverte pris',
  '1809794263': 'Délai de réflexion',
};

// October 1, 2025
const SINCE_DATE_MS = new Date('2025-10-01T00:00:00Z').getTime();

async function findDealsToMigrate() {
  // Search with OR across stages (filterGroups = OR, filters within = AND)
  const searchBody = {
    filterGroups: Object.keys(STAGE_MAP).map(stageId => ({
      filters: [
        { propertyName: 'pipeline', operator: 'EQ', value: OLD_PIPELINE },
        { propertyName: 'dealstage', operator: 'EQ', value: stageId },
        { propertyName: 'createdate', operator: 'GTE', value: String(SINCE_DATE_MS) },
      ],
    })),
    properties: ['dealstage', 'createdate', 'hubspot_owner_id', 'dealname', 'pipeline'],
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
  };

  return searchObjects('deals', searchBody, 5000);
}

module.exports = async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  try {
    const deals = await findDealsToMigrate();

    // Group by stage for summary
    const byStage = {};
    deals.forEach(d => {
      const stage = d.properties.dealstage;
      const label = STAGE_LABELS[stage] || stage;
      if (!byStage[label]) byStage[label] = [];
      byStage[label].push({
        id: d.id,
        name: d.properties.dealname,
        created: d.properties.createdate,
      });
    });

    // GET = preview only
    if (req.method === 'GET') {
      return res.status(200).json({
        mode: 'preview',
        totalDeals: deals.length,
        byStage: Object.fromEntries(
          Object.entries(byStage).map(([label, items]) => [label, items.length])
        ),
        deals: deals.map(d => ({
          id: d.id,
          name: d.properties.dealname,
          currentStage: STAGE_LABELS[d.properties.dealstage] || d.properties.dealstage,
          created: d.properties.createdate,
        })),
        message: `Found ${deals.length} deals to migrate. POST to execute.`,
      });
    }

    // POST = execute migration
    if (req.method === 'POST') {
      if (deals.length === 0) {
        return res.status(200).json({ migrated: 0, message: 'No deals to migrate' });
      }

      // Batch update (max 100 per batch for HubSpot API)
      let migrated = 0;
      const errors = [];

      for (let i = 0; i < deals.length; i += 100) {
        const batch = deals.slice(i, i + 100);
        const inputs = batch.map(d => ({
          id: d.id,
          properties: {
            pipeline: NEW_PIPELINE,
            dealstage: STAGE_MAP[d.properties.dealstage],
          },
        }));

        try {
          await hubspotFetch('/crm/v3/objects/deals/batch/update', {
            method: 'POST',
            body: JSON.stringify({ inputs }),
          });
          migrated += batch.length;
        } catch (err) {
          console.error(`Batch error (offset ${i}):`, err.message);
          errors.push({ offset: i, error: err.message });
        }
      }

      return res.status(200).json({
        mode: 'executed',
        migrated,
        total: deals.length,
        errors: errors.length > 0 ? errors : undefined,
        stageMapping: Object.fromEntries(
          Object.entries(STAGE_MAP).map(([old, newId]) => [
            STAGE_LABELS[old], `${OLD_PIPELINE}:${old} → ${NEW_PIPELINE}:${newId}`
          ])
        ),
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err.message });
  }
};
