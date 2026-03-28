import { createSupabaseAdminClient } from '../lib/supabase.js';

export const deleteUserAccount = async (userId: string) => {
  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(error.message);
  }
  return { message: 'User deleted successfully' };
};
