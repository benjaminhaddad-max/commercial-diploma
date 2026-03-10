const { getSupabase } = require('./_lib/supabase');

/**
 * Aircall Webhook handler
 * Receives real-time call events from Aircall
 * No Supabase auth — uses webhook token for verification
 */
module.exports = async function handler(req, res) {
  // CORS for preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional: verify webhook token
    const webhookToken = process.env.AIRCALL_WEBHOOK_TOKEN;
    if (webhookToken) {
      const token = req.headers['x-aircall-token'] || req.query.token;
      if (token !== webhookToken) {
        return res.status(403).json({ error: 'Invalid webhook token' });
      }
    }

    const event = req.body;
    if (!event || !event.event || !event.data) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const { event: eventType, data } = event;

    // Only process call.ended events (most complete data)
    if (eventType !== 'call.ended' && eventType !== 'call.created') {
      return res.status(200).json({ ok: true, skipped: eventType });
    }

    const call = data;
    const supabase = getSupabase();

    const row = {
      aircall_call_id: call.id,
      agent_name: call.user ? call.user.name : null,
      agent_aircall_id: call.user ? call.user.id : null,
      direction: call.direction,
      duration: call.duration || 0,
      talking_duration: call.answered_at && call.ended_at
        ? call.ended_at - call.answered_at
        : 0,
      status: call.missed_call_reason ? 'missed'
        : call.voicemail ? 'voicemail'
        : call.answered_at ? 'answered'
        : 'missed',
      started_at: call.started_at ? new Date(call.started_at * 1000).toISOString() : null,
      answered_at: call.answered_at ? new Date(call.answered_at * 1000).toISOString() : null,
      ended_at: call.ended_at ? new Date(call.ended_at * 1000).toISOString() : null,
      number_from: call.raw_digits,
      number_to: call.number ? call.number.digits : null,
      tags: call.tags || [],
      raw_data: call,
    };

    const { error } = await supabase
      .from('calls_log')
      .upsert(row, { onConflict: 'aircall_call_id', ignoreDuplicates: false });

    if (error) {
      console.error('Webhook DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ ok: true, event: eventType, call_id: call.id });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
};
