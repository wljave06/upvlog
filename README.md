# 视频平台 - Cloudflare Pages 部署指南

这是一个功能完整的视频上传和播放平台，适合部署到 Cloudflare Pages。

## 🚀 功能特性

- ✅ 用户登录系统
- ✅ 视频上传（支持拖拽）
- ✅ 视频播放器
- ✅ 视频列表管理
- ✅ 响应式设计
- ✅ 美观的现代 UI

## 📁 项目结构

```
vlog/
├── index.html          # 登录页面
├── dashboard.html      # 仪表板/视频列表
├── upload.html         # 视频上传页面
├── player.html         # 视频播放页面
├── css/
│   └── style.css      # 样式文件
├── js/
│   ├── auth.js        # 认证逻辑
│   ├── dashboard.js   # 仪表板逻辑
│   ├── upload.js      # 上传逻辑
│   └── player.js      # 播放器逻辑
└── videos/            # 视频文件存储目录
```

## 🌐 部署到 Cloudflare Pages

### 方法 1: 通过 Git 仓库部署（推荐）

1. 将代码推送到 GitHub/GitLab
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 Pages 页面
4. 点击 "Create a project"
5. 连接你的 Git 仓库
6. 配置构建设置：
   - Build command: 留空
   - Build output directory: `/`
7. 点击 "Save and Deploy"

### 方法 2: 直接上传部署

1. 登录 Cloudflare Dashboard
2. 进入 Pages 页面
3. 点击 "Create a project" > "Upload assets"
4. 将整个 `vlog` 文件夹拖拽到上传区域
5. 点击 "Deploy site"

## 💾 使用 Cloudflare R2 存储视频（推荐用于生产环境）

已集成 Cloudflare Pages Functions 和 R2 支持！

### Setup Steps:

1. **Create R2 Bucket**
   ```bash
   # Using Wrangler CLI
   npx wrangler r2 bucket create vlog-videos
   ```
   
   Or manually in Cloudflare Dashboard:
   - Go to R2 -> Create bucket
   - Name: `vlog-videos`

2. **Configure R2 Binding**
   
   The `wrangler.toml` file is already configured with R2 binding.
   
   When deploying to Cloudflare Pages:
   - Go to your Pages project settings
   - Navigate to "Functions" tab
   - Add R2 bucket binding:
     - Variable name: `VIDEO_BUCKET`
     - R2 bucket: `vlog-videos`

3. **Deploy to Cloudflare Pages**
   
   The upload functionality will automatically use R2 storage when deployed.
   
   Files are uploaded via `/api/upload` endpoint (handled by `functions/api/upload.js`)
   Videos are served via `/videos/[filename]` (handled by `functions/videos/[filename].js`)

### How it works:

- **Local Development**: Videos are saved to `videos/` folder using Node.js server
- **Production (Cloudflare)**: Videos are uploaded to R2 bucket automatically
- **Fallback**: If upload fails, uses localStorage (demo mode)

### Files created:

- `functions/api/upload.js` - Handles video upload to R2
- `functions/videos/[filename].js` - Serves videos from R2 with streaming support
- `server.js` - Local development server with file upload
- `wrangler.toml` - Cloudflare configuration

## 🔧 本地开发

### Method 1: Using Node.js Server (Recommended - Full Upload Support)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open in browser: `http://localhost:8000`

**Features:**
- ✅ Full file upload support
- ✅ Videos saved to `videos/` folder
- ✅ Video streaming with range request support
- ✅ Automatic file handling

### Method 2: Simple HTTP Server (Demo Only - No Upload)

1. Using Python:
   ```bash
   python -m http.server 8000
   ```
   
   Or using Node.js:
   ```bash
   npx http-server
   ```

2. In browser: `http://localhost:8000`

**Note:** This method uses localStorage fallback (demo only, limited storage).

## 🔐 登录说明

- 默认登录：输入任意用户名和密码即可登录（演示模式）
- 生产环境建议集成真实的认证系统

## 🎨 自定义

### 修改主题色

编辑 `css/style.css` 中的 CSS 变量：

```css
:root {
    --primary-color: #6366f1;  /* 修改主色调 */
    --primary-dark: #4f46e5;
    --primary-light: #818cf8;
}
```

### 修改文件大小限制

编辑 `js/upload.js` 中的 `maxSize` 变量：

```javascript
const maxSize = 500 * 1024 * 1024; // 500MB
```

## 📝 注意事项

- localStorage 有大小限制（通常 5-10MB），不适合存储大文件
- 建议在生产环境使用 Cloudflare R2 或其他云存储服务
- 添加真实的用户认证系统以保护上传功能
- 配置适当的 CORS 策略

## 📄 许可证

MIT License

---

如有问题或建议，欢迎提出 Issue！
