import { supabase } from './supabase.js';
import { navigate } from './router.js';

let currentUser = null;
let currentProfile = null;

/** Get current session user */
export async function getUser() {
  if (currentUser) return currentUser;
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
  return user;
}

/** Get current user profile with role */
export async function getProfile() {
  if (currentProfile) return currentProfile;
  const user = await getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  currentProfile = data;
  return data;
}

/** Check if user has one of the allowed roles */
export function hasRole(profile, ...roles) {
  if (!profile) return false;
  return roles.includes(profile.role);
}

/** Sign in with email/password */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentUser = data.user;
  currentProfile = null; // Force re-fetch
  return data;
}

/** Sign out */
export async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  navigate('/login');
}

/** Auth guard — redirects to login if not authenticated */
export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    navigate('/login');
    return null;
  }
  const profile = await getProfile();
  if (!profile || !hasRole(profile, 'manager', 'telepro', 'closer', 'super_admin')) {
    navigate('/login');
    return null;
  }
  return profile;
}

/** Get auth token for API calls */
export async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
