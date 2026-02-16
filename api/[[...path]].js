/**
 * Vercel Serverless Function - Pixiv API 反代
 *
 * 部署方法：点击 README 中的一键部署按钮
 */

// ========== 可配置项 ==========
const ENABLE_API_PROXY = true;
const ENABLE_IMAGE_PROXY = true;
const ENABLE_OAUTH_PROXY = true;

// Pixiv 服务主机
const PIXIV_API_HOST = 'app-api.pixiv.net';
const PIXIV_OAUTH_HOST = 'oauth.secure.pixiv.net';
const PIXIV_IMAGE_HOST = 'i.pximg.net';

export default async function handler(req) {
  // 处理 CORS 预检请求
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

  // 根据路径判断转发目标
  let targetHost;
  let path = url.pathname;

  // 移除 /api 前缀（Vercel 路由）
  path = path.replace(/^\/api/, '');

  // OAuth 认证请求
  if (ENABLE_OAUTH_PROXY && (path.startsWith('/oauth/') || path.startsWith('/auth/'))) {
    targetHost = PIXIV_OAUTH_HOST;
    path = path.replace('/oauth', '').replace('/auth', '');
  }
  // 图片代理
  else if (ENABLE_IMAGE_PROXY && path.startsWith('/image/')) {
    targetHost = PIXIV_IMAGE_HOST;
    path = path.replace('/image', '');
  }
  // 普通 API 请求
  else if (ENABLE_API_PROXY) {
    targetHost = PIXIV_API_HOST;
  }
  // 未启用的服务
  else {
    return new Response(JSON.stringify({
      error: 'Service not enabled',
      hint: 'Check ENABLE_*_PROXY settings'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 构建目标 URL
  const targetUrl = `https://${targetHost}${path}${url.search}`;

  // 复制并修改请求头
  const headers = new Headers(req.headers);
  headers.set('Host', targetHost);
  headers.set('Referer', 'https://app-api.pixiv.net/');

  // 创建新请求
  const newRequest = new Request(targetUrl, {
    method: req.method,
    headers: headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
  });

  try {
    const response = await fetch(newRequest);

    // 复制响应并添加 CORS 头
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // 添加 CORS 支持
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', '*');

    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      target: targetHost
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
