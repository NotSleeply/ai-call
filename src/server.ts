#!/usr/bin/env node
import express, { Request, Response } from "express";
import cors from "cors";
import { DaxiaAssistant } from "./assistant.js";
import { ConversationModel, MessageModel } from "./database.js";

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 创建助手实例
const assistant = new DaxiaAssistant();

// ==================== 对话相关 API ====================

// 获取对话列表
app.get("/api/conversations", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const conversations = ConversationModel.list(limit);
  res.json({ success: true, data: conversations });
});

// 创建新对话
app.post("/api/conversations", (req: Request, res: Response) => {
  const { title } = req.body;
  const conversation = ConversationModel.create(title || "新对话");
  res.json({ success: true, data: conversation });
});

// 获取对话详情（包含消息）
app.get("/api/conversations/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const conversation = ConversationModel.getById(id);

  if (!conversation) {
    return res.json({ success: false, message: "对话不存在" });
  }

  const messages = MessageModel.getByConversation(id);
  res.json({ success: true, data: { ...conversation, messages } });
});

// 更新对话标题
app.put("/api/conversations/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { title } = req.body;

  if (!title) {
    return res.json({ success: false, message: "标题不能为空" });
  }

  ConversationModel.updateTitle(id, title);
  const conversation = ConversationModel.getById(id);
  res.json({ success: true, data: conversation });
});

// 删除对话
app.delete("/api/conversations/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  ConversationModel.delete(id);
  res.json({ success: true, message: "删除成功" });
});

// 获取对话消息
app.get("/api/conversations/:id/messages", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const messages = MessageModel.getByConversation(id);
  res.json({ success: true, data: messages });
});

// ==================== 命令执行 API ====================

// 命令处理接口
app.post("/api/command", async (req: Request, res: Response) => {
  const { command, args = [], conversationId } = req.body;
  const originalLog = console.log;

  if (!command) {
    return res.json({
      success: false,
      message: "命令不能为空",
    });
  }

  // 如果没有指定对话ID，使用默认对话
  const convId = conversationId || 1;

  try {
    // 保存用户消息
    MessageModel.add(convId, "user", command);

    const historyForModel = MessageModel.getByConversation(convId)
      .slice(0, -1)
      .map((msg) => ({ role: msg.role, content: msg.content }));

    let data: any = "";

    // 捕获console.log输出
    const logs: string[] = [];

    console.log = (...args: any[]) => {
      logs.push(args.join(" "));
    };

    // 执行命令
    switch (command.toLowerCase().split(" ")[0]) {
      case "weather":
        await assistant.summarizeWeather();
        break;
      case "news":
        await assistant.summarizeNews();
        break;
      case "email":
        await assistant.summarizeEmail();
        break;
      case "summary":
        await assistant.generateSummary();
        break;
      case "2048":
        await assistant.copy2048();
        break;
      case "wx":
        // 生成二维码图片（Web端用）
        const qrCodeUrl = await assistant.generateQRCodeBase64();
        await assistant.connectWeChat();
        // 保存助手消息（带二维码）
        MessageModel.add(
          convId,
          "assistant",
          "请使用微信扫描二维码登录",
          qrCodeUrl,
        );
        console.log = originalLog;
        return res.json({
          success: true,
          message: "微信连接成功",
          data: { qrCodeUrl, message: logs.join("\n") },
        });
      case "analyze":
        await assistant.analyzeProject();
        break;
      case "help":
        assistant.showHelp();
        break;
      default:
        await assistant.smartChat(command, historyForModel);
    }

    // 恢复console.log
    console.log = originalLog;

    data = logs.join("\n");

    // 保存助手消息
    MessageModel.add(convId, "assistant", data);

    // 如果是新对话的第一条消息，更新标题
    const conv = ConversationModel.getById(convId);
    if (conv && conv.title === "新对话") {
      ConversationModel.updateTitle(
        convId,
        command.slice(0, 20) + (command.length > 20 ? "..." : ""),
      );
    }

    res.json({
      success: true,
      message: "命令执行成功",
      data,
    });
  } catch (error: any) {
    console.log = originalLog;
    res.json({
      success: false,
      message: error.message || "命令执行失败",
    });
  }
});

// 健康检查
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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
