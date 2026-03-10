const { verifyAuth, requireRole, handleCors } = require('./_lib/auth');
const { fetchUsers } = require('./_lib/aircall');
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

    // Fetch users from Aircall API
    const aircallUsers = await fetchUsers();

    // Fetch existing team_members from Supabase for matching
    const supabase = getSupabase();
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*')
      .eq('active', true);

    // Enrich Aircall users with team member info
    const users = aircallUsers.map(u => {
      const member = (teamMembers || []).find(m => m.aircall_user_id === u.id);
      return {
        aircall_id: u.id,
        name: u.name,
        email: u.email,
        availability: u.availability_status,
        // If matched to a team member, include their info
        team_member_id: member?.id || null,
        role: member?.role || null,
        hubspot_owner_id: member?.hubspot_owner_id || null,
      };
    });

    res.status(200).json({ users });
  } catch (err) {
    console.error('Aircall users error:', err);
    res.status(500).json({ error: 'Erreur récupération agents Aircall' });
  }
};
