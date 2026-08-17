import { supabase } from '../supabase';

const STAFF_ROLES = new Set(['administrator', 'editor']);

export const getStaffProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,role,is_active')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.is_active || !STAFF_ROLES.has(data.role)) return null;
  return data;
};

export const signInStaff = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOutStaff = () => supabase.auth.signOut({ scope: 'local' });
export const getCurrentSession = () => supabase.auth.getSession();
export const onStaffAuthChange = (listener) => supabase.auth.onAuthStateChange(listener);
export const requestPasswordReset = (email) => supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/admin/login`,
});
