const { verifyAuth, handleCors } = require('./_lib/auth');

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

    res.status(200).json({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
    });
  } catch (err) {
    console.error('Auth check error:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
};
