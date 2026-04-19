import { Router } from 'express';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAdmin } from '../middleware/admin.js';
import { createSupabaseAdminClient } from '../lib/supabase.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get(
  '/members',
  asyncHandler(async (_req, res) => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);

    const userIds = (data?.users || []).map((u) => u.id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, is_admin')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.is_admin]));

    const members = (data?.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      isAdmin: profileMap.get(u.id) || false,
    }));

    res.json({ members });
  }),
);

adminRouter.patch(
  '/members/:userId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    if (!userId) throw new HttpError(400, 'Missing userId');

    const { isAdmin } = req.body as { isAdmin?: boolean };
    if (typeof isAdmin !== 'boolean') throw new HttpError(400, 'isAdmin must be boolean');

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, is_admin: isAdmin, updated_at: new Date().toISOString() });

    if (error) throw new Error(error.message);
    res.json({ ok: true });
  }),
);
