const { verifyAuth, handleCors } = require('./_lib/auth');
const { fetchTeamCalls } = require('./_lib/aircall');
const { getSupabase } = require('./_lib/supabase');

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

    const { from, to, agent, source } = req.query;

    // If source=db, read from cached calls_log instead of hitting Aircall API
    if (source === 'db') {
      return await fetchFromDB(req, res, { from, to, agent });
    }

    // Build Aircall API params
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;

    // Fetch from Aircall API (paginated, filtered to Equipe commerciale)
    const calls = await fetchTeamCalls(params, 10);

    // Filter by agent if specified
    let filtered = calls;
    if (agent) {
      const agentId = parseInt(agent);
      filtered = calls.filter(c => c.user && c.user.id === agentId);
    }

    // Upsert into calls_log for caching
    const supabase = getSupabase();
    const rows = filtered.map(c => ({
      aircall_call_id: c.id,
      agent_name: c.user ? c.user.name : null,
      agent_aircall_id: c.user ? c.user.id : null,
      direction: c.direction,
      duration: c.duration || 0,
      talking_duration: c.answered_at && c.ended_at
        ? c.ended_at - c.answered_at
        : 0,
      status: c.missed_call_reason ? 'missed'
        : c.voicemail ? 'voicemail'
        : c.answered_at ? 'answered'
        : 'missed',
      started_at: c.started_at ? new Date(c.started_at * 1000).toISOString() : null,
      answered_at: c.answered_at ? new Date(c.answered_at * 1000).toISOString() : null,
      ended_at: c.ended_at ? new Date(c.ended_at * 1000).toISOString() : null,
      number_from: c.raw_digits,
      number_to: c.number ? c.number.digits : null,
      tags: c.tags || [],
    }));

    if (rows.length > 0) {
      await supabase
        .from('calls_log')
        .upsert(rows, { onConflict: 'aircall_call_id', ignoreDuplicates: false });
    }

    // Return simplified call objects for frontend
    const result = filtered.map(c => ({
      id: c.id,
      agent: c.user ? c.user.name : 'Inconnu',
      agent_id: c.user ? c.user.id : null,
      direction: c.direction === 'outbound' ? 'Sortant' : 'Entrant',
      duration: c.duration || 0,
      status: c.missed_call_reason ? 'Ne répond pas'
        : c.voicemail ? 'Messagerie'
        : c.answered_at ? 'Décroché'
        : 'Ne répond pas',
      started_at: c.started_at ? new Date(c.started_at * 1000).toISOString() : null,
      hour: c.started_at
        ? new Date(c.started_at * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
        : '--:--',
      tags: c.tags || [],
    }));

    res.status(200).json({
      calls: result,
      total: result.length,
      cached: rows.length,
    });
  } catch (err) {
    console.error('Aircall calls error:', err);
    res.status(500).json({ error: 'Erreur récupération appels' });
  }
};

/**
 * Read calls from the database cache instead of Aircall API
 */
async function fetchFromDB(req, res, { from, to, agent }) {
  const supabase = getSupabase();
  let query = supabase
    .from('calls_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(500);

  if (from) {
    query = query.gte('started_at', new Date(parseInt(from) * 1000).toISOString());
  }
  if (to) {
    query = query.lte('started_at', new Date(parseInt(to) * 1000).toISOString());
  }
  if (agent) {
    query = query.eq('agent_aircall_id', parseInt(agent));
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: 'Erreur base de données' });
  }

  const calls = (data || []).map(c => ({
    id: c.aircall_call_id,
    agent: c.agent_name || 'Inconnu',
    agent_id: c.agent_aircall_id,
    direction: c.direction === 'outbound' ? 'Sortant' : 'Entrant',
    duration: c.duration || 0,
    status: c.status === 'answered' ? 'Décroché'
      : c.status === 'voicemail' ? 'Messagerie'
      : 'Ne répond pas',
    started_at: c.started_at,
    hour: c.started_at
      ? new Date(c.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
      : '--:--',
    tags: c.tags || [],
  }));

  res.status(200).json({ calls, total: calls.length, source: 'db' });
}
