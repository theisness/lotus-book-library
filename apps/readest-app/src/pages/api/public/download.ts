import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseAdminClient } from '@/utils/supabase';
import { corsAllMethods, runMiddleware } from '@/utils/cors';
import { getDownloadSignedUrl } from '@/utils/object';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, corsAllMethods);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.query['id'] as string;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('public_books')
      .select('book_file_key')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data?.book_file_key) {
      return res.status(404).json({ error: 'Public book not found' });
    }

    const downloadUrl = await getDownloadSignedUrl(data.book_file_key, 1800);
    return res.status(200).json({ downloadUrl });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
  }
}
