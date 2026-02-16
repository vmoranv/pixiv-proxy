# Pixiv Proxy

Pixiv API / 图片 / OAuth 反向代理服务，支持一键部署到 Cloudflare Workers 或 Vercel。

## 一键部署

### Cloudflare Workers

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/vmoranv/pixiv-proxy)

> 点击按钮后，Cloudflare 会自动从仓库读取代码并部署，无需配置。

> ⚠️ **重要提示：必须绑定自定义域名！**
>
> Pixiv 会拦截所有 `*.workers.dev` 域名的请求，返回 challenge 页面。
> 部署后请务必绑定自定义域名，否则无法使用。
>
> 绑定方法：Workers & Pages → 你的 Worker → Settings → Domains & Routes → Add Custom Domain

部署完成后：
- Worker 默认域名（不可用）：`https://<your-worker>.<your-subdomain>.workers.dev`
- **自定义域名（必须）**：`https://pixiv.yourdomain.com`
- API 请求：`https://pixiv.yourdomain.com/v1/illust/12345`
- 图片代理：`https://pixiv.yourdomain.com/image/img-original/img/...`

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vmoranv/pixiv-proxy&project-name=pixiv-proxy)

部署完成后：
- 项目域名：`https://<your-project>.vercel.app`
- API 请求：`https://<your-project>.vercel.app/api/v1/illust/12345`
- 图片代理：`https://<your-project>.vercel.app/api/image/img-original/img/...`

## 功能

- **API 反代**：代理 `app-api.pixiv.net` 的所有 API 请求
- **图片反代**：代理 `i.pximg.net` 的图片资源
- **OAuth 反代**：代理 `oauth.secure.pixiv.net` 的认证请求
- **CORS 支持**：自动添加跨域头

## 使用方法

### 在 AstrBot Pixiv 插件中使用

1. 部署上述任一服务
2. 在插件配置中设置：
   - `image_proxy_host` = `你的服务域名`

### 在 pixivpy 中使用

```python
from pixivpy3 import AppPixivAPI

api = AppPixivAPI()
# 设置 API 代理
api.api_hosts = "https://<your-worker>.workers.dev"
# 或 Vercel
api.api_hosts = "https://<your-project>.vercel.app/api"
```

## 路由说明

| 路径前缀 | 目标服务 |
|---------|---------|
| `/oauth/` 或 `/auth/` | `oauth.secure.pixiv.net` |
| `/image/` | `i.pximg.net` |
| 其他路径 | `app-api.pixiv.net` |

**示例**：

```
# API 请求
GET /v1/illust/detail?illust_id=12345
→ https://app-api.pixiv.net/v1/illust/detail?illust_id=12345

# 图片代理
GET /image/img-original/img/2023/01/01/00/00/00/12345_p0.png
→ https://i.pximg.net/img-original/img/2023/01/01/00/00/00/12345_p0.png

# OAuth 认证
POST /auth/token
→ https://oauth.secure.pixiv.net/auth/token
```

## 配置选项

编辑 Worker 或 Vercel 函数中的配置项：

```javascript
// 是否启用各服务
const ENABLE_API_PROXY = true;    // API 反代
const ENABLE_IMAGE_PROXY = true;  // 图片反代
const ENABLE_OAUTH_PROXY = false; // OAuth 反代（默认关闭，OAuth 需直连）
```

> ⚠️ **OAuth 代理说明**：
> - OAuth 认证（登录获取 token）需要直接连接 Pixiv，不建议通过代理
> - Cloudflare Workers 的 OAuth 请求会触发 Pixiv 的 bot 检测
> - 建议使用直连或其他方式获取 `refresh_token`，然后通过代理调用 API

## 手动部署

<details>
<summary>Cloudflare Workers 手动部署</summary>

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **Create Application** → **Create Worker**
3. 将 `cloudflare-worker-pixiv-proxy.js` 的代码粘贴到编辑器中
4. 点击 **Deploy** 部署
5. （可选）绑定自定义域名

</details>

<details>
<summary>Vercel 手动部署</summary>

1. Fork 本仓库
2. 在 [Vercel](https://vercel.com) 中导入 Fork 的仓库
3. 点击 **Deploy** 部署

</details>

## License

MIT
