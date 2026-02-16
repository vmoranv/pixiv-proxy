/**
 * Cloudflare Workers Pixiv API 反代
 *
 * 部署方法：
 * 1. 登录 https://dash.cloudflare.com
 * 2. 进入 Workers & Pages -> Create Application -> Create Worker
 * 3. 粘贴此代码并部署
 * 4. 绑定自定义域名（可选，但推荐）
 *
 * 使用方法：
 * 在插件配置中设置 api_proxy_host = your-worker.your-subdomain.workers.dev
 * 或设置 image_proxy_host = your-worker.your-subdomain.workers.dev
 */

// ========== 可配置项 ==========
// 是否启用 API 反代
const ENABLE_API_PROXY = true;
// 是否启用图片反代
const ENABLE_IMAGE_PROXY = true;
// OAuth 需要直连，不通过 Worker 代理（会被 Cloudflare 拦截）
const ENABLE_OAUTH_PROXY = false;

// Pixiv 服务主机
const PIXIV_API_HOST = 'app-api.pixiv.net';
const PIXIV_OAUTH_HOST = 'oauth.secure.pixiv.net';
const PIXIV_IMAGE_HOST = 'i.pximg.net';

// ========== 主处理逻辑 ==========
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 根据路径判断转发目标
    let targetHost;
    let path = url.pathname;

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
        hint: 'Check ENABLE_*_PROXY settings in worker script'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 构建目标 URL
    const targetUrl = `https://${targetHost}${path}${url.search}`;

    // 复制并修改请求头
    const headers = new Headers(request.headers);
    headers.set('Host', targetHost);
    headers.set('Referer', 'https://app-api.pixiv.net/');
    headers.set('User-Agent', 'PixivIOSApp/7.13.3 (iOS 14.6; iPhone13,2)');
    headers.set('App-OS', 'ios');
    headers.set('App-OS-Version', '14.6');
    headers.set('App-Version', '7.13.3');

    // 创建新请求
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
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
  },
};
