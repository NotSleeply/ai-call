# 大虾功能演示 - 前端界面 🦐

基于 Vue3 + TypeScript + Tailwind CSS 的前端界面，展示大虾AI助手的核心功能。

## 技术栈

- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全的JavaScript超集
- **Vite** - 下一代前端构建工具
- **Tailwind CSS** - 实用优先的CSS框架
- **Axios** - 基于Promise的HTTP客户端

## 功能特性

- ✨ 现代化的用户界面
- 🎨 响应式设计，支持多种屏幕尺寸
- 🚀 快速的命令执行
- 📊 实时结果展示
- 🎯 直观的图标操作

## 快速开始

### 安装依赖

```bash
cd frontend
pnpm install
```

### 启动开发服务器

确保后端API服务器已启动（在项目根目录）：

```bash
cd ..
pnpm run server
```

然后启动前端：

```bash
cd frontend
pnpm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
pnpm run build
```

### 预览生产构建

```bash
pnpm run preview
```

## 可用命令

| 命令 | 图标 | 说明 |
|------|------|------|
| weather | 🌤️ | 获取天气信息 |
| news | 📰 | 获取新闻摘要 |
| email | 📧 | 获取邮件摘要 |
| summary | 📝 | 生成对话总结 |
| wx | 💬 | 连接微信 |
| analyze | 📊 | 分析项目 |
| help | ❓ | 显示帮助信息 |

## 项目结构

```
frontend/
├── src/
│   ├── api/
│   │   └── daxia.ts       # API服务封装
│   ├── App.vue             # 主应用组件
│   ├── main.ts             # 入口文件
│   ├── style.css           # 全局样式
│   └── vite-env.d.ts       # TypeScript声明
├── index.html              # HTML模板
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite配置
├── tailwind.config.js      # Tailwind配置
└── postcss.config.js       # PostCSS配置
```

## API接口

### 执行命令

**POST** `/api/command`

请求体：
```json
{
  "command": "weather",
  "args": []
}
```

响应：
```json
{
  "success": true,
  "message": "命令执行成功",
  "data": "结果内容..."
}
```

### 健康检查

**GET** `/api/health`

响应：
```json
{
  "status": "ok",
  "timestamp": "2026-04-02T15:00:00.000Z"
}
```

## 开发说明

### 代理配置

开发环境通过Vite代理连接后端：

```typescript
// vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

### 样式定制

使用Tailwind CSS自定义主题：

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
    }
  }
}
```

## 与后端集成

前端通过Axios调用后端API：

```typescript
// src/api/daxia.ts
export const daxiaAPI = {
  async executeCommand(command: string, args?: string[]) {
    const response = await axios.post('/api/command', {
      command,
      args: args || []
    })
    return response.data
  }
}
```

## 注意事项

1. **后端依赖**: 前端需要后端API服务器运行才能正常工作
2. **端口冲突**: 确保端口3000和3001未被占用
3. **跨域问题**: 开发环境已配置CORS，生产环境需要相应配置

## 扩展建议

1. 添加命令历史记录
2. 实现命令自动补全
3. 支持多个结果同时显示
4. 添加暗黑模式
5. 实现文件拖拽上传
6. 添加WebSocket实时通信

## License

MIT
