const { fetchTeamCalls } = require('./_lib/aircall');
const { getSupabase } = require('./_lib/supabase');

/**
 * Cache refresh endpoint — syncs last 30 days of Aircall calls into calls_log
 * Called by Vercel cron (daily at 6am) or manually via GET /api/cache-refresh
 */
module.exports = async function handler(req, res) {
  // Allow CORS for manual triggers
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();

    // Sync last 30 days
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);

    const fromUnix = Math.floor(from.getTime() / 1000);
    const toUnix = Math.floor(now.getTime() / 1000);

    console.log(`Cache refresh: syncing calls from ${from.toISOString()} to ${now.toISOString()}`);

    // Fetch from Aircall API (up to 40 pages = 2000 calls max)
    const apiCalls = await fetchTeamCalls({ from: fromUnix, to: toUnix }, 40);

    if (apiCalls.length === 0) {
      return res.status(200).json({ synced: 0, message: 'No calls found' });
    }

    const rows = apiCalls.map(c => ({
      aircall_call_id: c.id,
      agent_name: c.user ? c.user.name : null,
      agent_aircall_id: c.user ? c.user.id : null,
      direction: c.direction,
      duration: c.duration || 0,
      talking_duration: c.answered_at && c.ended_at ? c.ended_at - c.answered_at : 0,
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

    // Upsert in batches of 200
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await supabase
        .from('calls_log')
        .upsert(batch, { onConflict: 'aircall_call_id', ignoreDuplicates: false });

      if (error) {
        console.error(`Batch upsert error (offset ${i}):`, error.message);
      } else {
        upserted += batch.length;
      }
    }

    console.log(`Cache refresh done: ${upserted} calls synced`);

    res.status(200).json({
      synced: upserted,
      total_fetched: apiCalls.length,
      from: from.toISOString(),
      to: now.toISOString(),
    });
  } catch (err) {
    console.error('Cache refresh error:', err);
    res.status(500).json({ error: err.message });
  }
};
