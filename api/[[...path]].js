/**
 * Vercel Serverless Function - Pixiv API 反代
 */

const ENABLE_API_PROXY = true;
const ENABLE_IMAGE_PROXY = true;
const ENABLE_OAUTH_PROXY = true;

const PIXIV_API_HOST = 'app-api.pixiv.net';
const PIXIV_OAUTH_HOST = 'oauth.secure.pixiv.net';
const PIXIV_IMAGE_HOST = 'i.pximg.net';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(req.url);
  let targetHost;
  let path = url.pathname;

  // 移除 /api 前缀
  path = path.replace(/^\/api/, '');

  if (ENABLE_OAUTH_PROXY && (path.startsWith('/oauth/') || path.startsWith('/auth/'))) {
    targetHost = PIXIV_OAUTH_HOST;
    path = path.replace('/oauth', '').replace('/auth', '');
  } else if (ENABLE_IMAGE_PROXY && path.startsWith('/image/')) {
    targetHost = PIXIV_IMAGE_HOST;
    path = path.replace('/image', '');
  } else if (ENABLE_API_PROXY) {
    targetHost = PIXIV_API_HOST;
  } else {
    return new Response(JSON.stringify({ error: 'Service not enabled' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = `https://${targetHost}${path}${url.search}`;

  const headers = new Headers(req.headers);
  headers.set('Host', targetHost);
  headers.set('Referer', 'https://app-api.pixiv.net/');

  const newRequest = new Request(targetUrl, {
    method: req.method,
    headers: headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
  });

  try {
    const response = await fetch(newRequest);
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
