const { verifyAuth, handleCors } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');
const { fetchTeamCalls } = require('./_lib/aircall');
const { getDealStats, getOwnerMap } = require('./_lib/hubspot');

// KPI thresholds (green / orange / red)
const THRESHOLDS = {
  avgDuration: { good: 600, medium: 300 },      // ≥10min / 5-10min / <5min (seconds)
  pickupRate: { good: 40, medium: 25 },          // ≥40% / 25-40% / <25%
  callsPerDay: { good: 40, medium: 25 },         // ≥40 / 25-40 / <25
  callsOver10min: { good: 50, medium: 30 },      // ≥50% / 30-50% / <30%
};

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

    const { period = 'today', agent } = req.query;
    const supabase = getSupabase();

    // Calculate date range
    const now = new Date();
    const { from, to, prevFrom, prevTo, days } = getDateRange(period, now);

    // Fetch calls from Supabase + HubSpot deals in parallel
    let query = supabase
      .from('calls_log')
      .select('*')
      .gte('started_at', from.toISOString())
      .lte('started_at', to.toISOString());

    if (agent) {
      query = query.eq('agent_aircall_id', parseInt(agent));
    }

    // HubSpot deal stats (non-blocking — dashboard works even if HubSpot fails)
    const hubspotPromise = getDealStats(from, to).catch(err => {
      console.error('HubSpot getDealStats error:', err.message);
      return null;
    });

    const [dbResult, hubspot] = await Promise.all([query, hubspotPromise]);

    let { data: calls, error } = dbResult;
    if (error) {
      console.error('DB error:', error);
      return res.status(500).json({ error: 'Erreur base de données' });
    }

    // Auto-sync from Aircall only if the entire calls_log table is empty (first load)
    if (!calls || calls.length === 0) {
      const { count } = await supabase
        .from('calls_log')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        console.log('calls_log table empty, syncing from Aircall...');
        try {
          const fromUnix = Math.floor(from.getTime() / 1000);
          const toUnix = Math.floor(to.getTime() / 1000);
          const apiCalls = await fetchTeamCalls({ from: fromUnix, to: toUnix }, 10);
          if (apiCalls.length > 0) {
            const rows = apiCalls.map(c => ({
              aircall_call_id: c.id,
              agent_name: c.user ? c.user.name : null,
              agent_aircall_id: c.user ? c.user.id : null,
              direction: c.direction,
              duration: c.duration || 0,
              talking_duration: c.answered_at && c.ended_at ? c.ended_at - c.answered_at : 0,
              status: c.missed_call_reason ? 'missed' : c.voicemail ? 'voicemail' : c.answered_at ? 'answered' : 'missed',
              started_at: c.started_at ? new Date(c.started_at * 1000).toISOString() : null,
              answered_at: c.answered_at ? new Date(c.answered_at * 1000).toISOString() : null,
              ended_at: c.ended_at ? new Date(c.ended_at * 1000).toISOString() : null,
              number_from: c.raw_digits,
              number_to: c.number ? c.number.digits : null,
              tags: c.tags || [],
            }));
            await supabase.from('calls_log').upsert(rows, { onConflict: 'aircall_call_id', ignoreDuplicates: false });
            const { data: freshCalls } = await supabase.from('calls_log').select('*')
              .gte('started_at', from.toISOString()).lte('started_at', to.toISOString());
            calls = freshCalls || [];
          }
        } catch (syncErr) {
          console.error('Auto-sync failed:', syncErr.message);
        }
      }
    }

    // Fetch previous period for trends
    let prevQuery = supabase
      .from('calls_log')
      .select('*')
      .gte('started_at', prevFrom.toISOString())
      .lte('started_at', prevTo.toISOString());

    if (agent) {
      prevQuery = prevQuery.eq('agent_aircall_id', parseInt(agent));
    }

    const { data: prevCalls } = await prevQuery;

    // Compute global stats
    const stats = computeStats(calls || [], days);
    const prevStats = computeStats(prevCalls || [], days);
    const trends = computeTrends(stats, prevStats);

    // Compute per-agent stats
    const agentMap = {};
    (calls || []).forEach(c => {
      if (!c.agent_aircall_id) return;
      if (!agentMap[c.agent_aircall_id]) {
        agentMap[c.agent_aircall_id] = {
          agent_id: c.agent_aircall_id,
          agent_name: c.agent_name || 'Inconnu',
          calls: [],
        };
      }
      agentMap[c.agent_aircall_id].calls.push(c);
    });

    const agents = Object.values(agentMap).map(a => {
      const agentStats = computeStats(a.calls, days);
      const score = computeScore(agentStats);
      return {
        agent_id: a.agent_id,
        name: a.agent_name,
        ...agentStats,
        score,
        scoreColor: score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red',
      };
    }).sort((a, b) => b.score - a.score);

    // Build daily series for charts
    const dailySeries = buildDailySeries(calls || [], from, to);

    // Outcome distribution
    const outcomes = computeOutcomes(calls || []);

    const globalScore = agents.length > 0
      ? Math.round(agents.reduce((s, a) => s + a.score, 0) / agents.length)
      : 0;

    res.status(200).json({
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      stats: {
        ...stats,
        score: globalScore,
        scoreColor: globalScore >= 70 ? 'green' : globalScore >= 40 ? 'orange' : 'red',
      },
      trends,
      agents,
      dailySeries,
      outcomes,
      hubspot: hubspot || { rdvPris: 0, rdvEffectues: 0, dossiersRealises: 0, byOwner: {} },
    });
  } catch (err) {
    console.error('Aggregate stats error:', err);
    res.status(500).json({ error: 'Erreur calcul statistiques' });
  }
};

function getDateRange(period, now) {
  const to = new Date(now);
  let from, prevFrom, prevTo, days;

  switch (period) {
    case 'week': {
      const dow = now.getDay() || 7; // Monday = 1
      from = new Date(now);
      from.setDate(from.getDate() - dow + 1);
      from.setHours(0, 0, 0, 0);
      days = dow;
      prevTo = new Date(from);
      prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - 7);
      break;
    }
    case 'month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      days = now.getDate();
      prevTo = new Date(from);
      prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    }
    case '30d': {
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      days = 30;
      prevTo = new Date(from);
      prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - 30);
      break;
    }
    default: { // today
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      days = 1;
      prevTo = new Date(from);
      prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - 1);
      break;
    }
  }

  return { from, to, prevFrom, prevTo, days };
}

function computeStats(calls, days) {
  const total = calls.length;
  const outbound = calls.filter(c => c.direction === 'outbound').length;
  const inbound = calls.filter(c => c.direction === 'inbound').length;
  const answered = calls.filter(c => c.status === 'answered').length;
  const missed = calls.filter(c => c.status !== 'answered').length;

  const answeredCalls = calls.filter(c => c.status === 'answered');
  const totalDuration = answeredCalls.reduce((s, c) => s + (c.duration || 0), 0);
  const avgDuration = answeredCalls.length > 0
    ? Math.round(totalDuration / answeredCalls.length)
    : 0;

  const callsOver10min = answeredCalls.filter(c => (c.duration || 0) >= 600).length;
  const pctOver10min = answeredCalls.length > 0
    ? Math.round((callsOver10min / answeredCalls.length) * 100)
    : 0;

  const pickupRate = total > 0
    ? Math.round((answered / total) * 100)
    : 0;

  const callsPerDay = days > 0 ? Math.round(outbound / days) : outbound;

  return {
    total,
    outbound,
    inbound,
    answered,
    missed,
    avgDuration,
    pickupRate,
    callsPerDay,
    callsOver10min,
    pctOver10min,
  };
}

function computeScore(stats) {
  let score = 0;
  let weights = 0;

  // Average duration (weight 3)
  if (stats.avgDuration >= THRESHOLDS.avgDuration.good) score += 100 * 3;
  else if (stats.avgDuration >= THRESHOLDS.avgDuration.medium) score += 50 * 3;
  weights += 3;

  // Pickup rate (weight 2)
  if (stats.pickupRate >= THRESHOLDS.pickupRate.good) score += 100 * 2;
  else if (stats.pickupRate >= THRESHOLDS.pickupRate.medium) score += 50 * 2;
  weights += 2;

  // Calls per day (weight 2)
  if (stats.callsPerDay >= THRESHOLDS.callsPerDay.good) score += 100 * 2;
  else if (stats.callsPerDay >= THRESHOLDS.callsPerDay.medium) score += 50 * 2;
  weights += 2;

  // % calls over 10min (weight 3)
  if (stats.pctOver10min >= THRESHOLDS.callsOver10min.good) score += 100 * 3;
  else if (stats.pctOver10min >= THRESHOLDS.callsOver10min.medium) score += 50 * 3;
  weights += 3;

  return Math.round(score / weights);
}

function computeTrends(current, previous) {
  const pct = (cur, prev) => {
    if (!prev || prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  return {
    calls: pct(current.total, previous.total),
    decroché: pct(current.pickupRate, previous.pickupRate),
    duration: pct(current.avgDuration, previous.avgDuration),
    outbound: pct(current.outbound, previous.outbound),
  };
}

function buildDailySeries(calls, from, to) {
  const series = {};
  const current = new Date(from);

  while (current <= to) {
    const key = current.toISOString().split('T')[0];
    series[key] = { outbound: 0, inbound: 0 };
    current.setDate(current.getDate() + 1);
  }

  calls.forEach(c => {
    if (!c.started_at) return;
    const key = new Date(c.started_at).toISOString().split('T')[0];
    if (series[key]) {
      if (c.direction === 'outbound') series[key].outbound++;
      else series[key].inbound++;
    }
  });

  return Object.entries(series).map(([date, counts]) => ({
    date,
    ...counts,
  }));
}

function computeOutcomes(calls) {
  const outcomes = {
    'Décroché': 0,
    'Ne répond pas': 0,
    'Messagerie': 0,
  };

  calls.forEach(c => {
    if (c.status === 'answered') outcomes['Décroché']++;
    else if (c.status === 'voicemail') outcomes['Messagerie']++;
    else outcomes['Ne répond pas']++;
  });

  return outcomes;
}
