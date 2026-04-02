#!/usr/bin/env node
import express, { Request, Response } from 'express';
import cors from 'cors';
import { DaxiaAssistant } from './assistant.js';

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 创建助手实例
const assistant = new DaxiaAssistant();

// 命令处理接口
app.post('/api/command', async (req: Request, res: Response) => {
  const { command, args = [] } = req.body;

  if (!command) {
    return res.json({
      success: false,
      message: '命令不能为空'
    });
  }

  try {
    let data: any = '';

    // 捕获console.log输出
    const originalLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
    };

    // 执行命令
    switch (command.toLowerCase()) {
      case 'weather':
        await assistant.summarizeWeather();
        break;
      case 'news':
        await assistant.summarizeNews();
        break;
      case 'email':
        await assistant.summarizeEmail();
        break;
      case 'summary':
        await assistant.generateSummary();
        break;
      case 'wx':
        await assistant.connectWeChat();
        break;
      case 'analyze':
        await assistant.analyzeProject();
        break;
      case 'help':
        assistant.showHelp();
        break;
      default:
        await assistant.smartChat(command);
    }

    // 恢复console.log
    console.log = originalLog;

    data = logs.join('\n');

    res.json({
      success: true,
      message: '命令执行成功',
      data
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message || '命令执行失败'
    });
  }
});

// 健康检查
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n`);
  console.log('╔═══════════════════════════════════════╗');
  console.log('║       🚀 大虾API服务器已启动         ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`\n📡 服务地址: http://localhost:${PORT}`);
  console.log(`📡 API端点: http://localhost:${PORT}/api/command`);
  console.log(`💚 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`\n💡 提示: 前端应用请访问 http://localhost:3000`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});
