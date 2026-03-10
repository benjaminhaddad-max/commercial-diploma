const { getSupabase } = require('./supabase');

const ALLOWED_ROLES = ['manager', 'telepro', 'closer', 'super_admin'];

/**
 * Verify auth token and return user profile
 * Returns null if not authenticated
 */
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabase();

  // Verify the JWT and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Get profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return null;

  // Check role is allowed for this dashboard
  if (!ALLOWED_ROLES.includes(profile.role)) return null;

  return { ...profile, email: user.email };
}

/**
 * Require specific roles
 */
function requireRole(profile, ...roles) {
  if (!profile) return false;
  return roles.includes(profile.role);
}

/**
 * Standard CORS headers handler
 */
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = { verifyAuth, requireRole, handleCors, ALLOWED_ROLES };
