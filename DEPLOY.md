# Vlog 视频平台 - Cloudflare Pages 部署指南

## 配置步骤

### 1. 创建 R2 存储桶

1. 登录 Cloudflare Dashboard
2. 进入 R2 Object Storage
3. 创建新存储桶，名称：`vlog-videos`
4. 配置公开访问：
   - 点击存储桶设置
   - 启用 "Public Access"
   - 记录公开域名，格式类似：`https://pub-xxxxx.r2.dev`

### 2. 配置 Cloudflare Pages

1. 在 Pages 项目设置中添加 R2 绑定：
   - 变量名：`VLOG_VIDEOS`
   - R2 存储桶：`vlog-videos`

2. 添加环境变量：
   - 变量名：`R2_PUBLIC_DOMAIN`
   - 值：你的 R2 公开域名（例如：`https://pub-xxxxx.r2.dev`）

### 3. 更新配置文件

编辑 `wrangler.toml`，将 R2 公开域名替换为你的实际域名：

```toml
[vars]
R2_PUBLIC_DOMAIN = "https://pub-your-r2-domain.r2.dev"  # 替换为你的 R2 域名
```

### 4. 本地测试

如果需要本地测试上传功能：

```bash
# 安装依赖
npm install

# 使用 Wrangler 本地运行
npx wrangler pages dev .

# 或使用 Node.js 服务器（无 R2 功能）
npm start
```

### 5. 部署到 Cloudflare Pages

```bash
# 使用 Wrangler 部署
npx wrangler pages deploy .

# 或通过 Git 推送自动部署
git push
```

## 功能说明

- **登录账号**: admin
- **登录密码**: muen778@
- **上传限制**: 单个视频最大 10MB
- **存储方式**: Cloudflare R2
- **公开访问**: 每个上传的视频都会生成公开的 .mp4 URL
- **复制链接**: 在首页视频卡片上可直接复制公开链接

## 文件结构

```
vlog/
├── index.html          # 登录页
├── dashboard.html      # 视频列表（首页）
├── upload.html         # 上传页面
├── player.html         # 播放器页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── auth.js         # 认证逻辑
│   ├── dashboard.js    # 首页逻辑
│   ├── upload.js       # 上传逻辑
│   └── player.js       # 播放器逻辑
├── functions/
│   └── api/
│       └── upload.js   # Cloudflare Functions 上传 API
└── wrangler.toml       # Cloudflare 配置
```

## 注意事项

1. **R2 必须配置**：没有 R2 存储桶，上传功能无法使用
2. **公开域名**：确保在 Cloudflare 中正确配置 R2 公开访问
3. **环境变量**：在 Pages 设置中配置 `R2_PUBLIC_DOMAIN` 环境变量
4. **跨域问题**：R2 公开域名默认支持跨域访问
5. **文件大小**：当前限制 10MB，可在 `upload.js` 和 `functions/api/upload.js` 中修改
