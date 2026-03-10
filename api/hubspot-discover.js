const { handleCors, verifyAuth } = require('./_lib/auth');
const { getPipelines, getPipelineStages, getOwners } = require('./_lib/hubspot');

/**
 * Discovery endpoint — returns HubSpot pipelines, stages and owners
 * Used once to map stage IDs to dashboard KPIs
 * GET /api/hubspot-discover
 */
module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const profile = await verifyAuth(req);
    if (!profile) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const [pipelines, owners] = await Promise.all([
      getPipelines(),
      getOwners(),
    ]);

    // For each pipeline, fetch its stages
    const pipelinesWithStages = await Promise.all(
      pipelines.map(async (p) => {
        const stages = await getPipelineStages(p.id);
        return {
          id: p.id,
          label: p.label,
          stages: stages.map(s => ({
            id: s.id,
            label: s.label,
            displayOrder: s.displayOrder,
          })).sort((a, b) => a.displayOrder - b.displayOrder),
        };
      })
    );

    const ownersList = owners.map(o => ({
      id: o.id,
      email: o.email,
      firstName: o.firstName,
      lastName: o.lastName,
    }));

    res.status(200).json({
      pipelines: pipelinesWithStages,
      owners: ownersList,
    });
  } catch (err) {
    console.error('HubSpot discover error:', err);
    res.status(500).json({ error: err.message });
  }
};
