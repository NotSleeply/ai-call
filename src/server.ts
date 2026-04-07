#!/usr/bin/env node
import { createServerApp } from "./server/createServerApp.js";
import { PORT } from "./server/config.js";

const app = createServerApp();

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n`);
  console.log("╔═══════════════════════════════════════╗");
  console.log("║       🚀 大虾API服务器已启动         ║");
  console.log("╚═══════════════════════════════════════╝");
  console.log(`\n📡 服务地址: http://localhost:${PORT}`);
  console.log(`📡 API端点: http://localhost:${PORT}/api/command`);
  console.log(`💚 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`\n💡 提示: 前端应用请访问 http://localhost:3000`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});
