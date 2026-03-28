import { HttpError } from '../lib/http.js';
import type { KoSyncProxyPayload } from '../types/shared.js';

const validEndpoints = [/\/users\/create/, /\/users\/auth/, /\/syncs\/progress/];

export const proxyKoSync = async (payload: KoSyncProxyPayload) => {
  const { serverUrl, endpoint, method, headers: clientHeaders, body: clientBody } = payload;
  if (!serverUrl || !endpoint) {
    throw new HttpError(400, 'serverUrl and endpoint are required');
  }
  if (!validEndpoints.some((regex) => regex.test(endpoint))) {
    throw new HttpError(400, 'Invalid endpoint');
  }

  const targetUrl = `${serverUrl.replace(/\/$/, '')}${endpoint}`;
  const response = await fetch(targetUrl, {
    method,
    headers: {
      ...clientHeaders,
      Accept: 'application/vnd.koreader.v1+json',
      'Content-Type': 'application/json',
    },
    body: clientBody ? JSON.stringify(clientBody) : null,
  });

  const data = await response.text();
  return {
    status: response.status,
    data,
  };
};
