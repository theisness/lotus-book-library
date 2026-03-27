import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseAdminClient } from '@/utils/supabase';
import { corsAllMethods, runMiddleware } from '@/utils/cors';
import { validateUserAndToken } from '@/utils/access';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, corsAllMethods);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, token } = await validateUserAndToken(req.headers['authorization']);
    if (!user || !token) {
      return res.status(403).json({ error: 'Not authenticated' });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('public_books')
      .select('book_hash')
      .eq('owner_user_id', user.id)
      .is('deleted_at', null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      bookHashes: (data || []).map((item) => item.book_hash),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
  }
}
