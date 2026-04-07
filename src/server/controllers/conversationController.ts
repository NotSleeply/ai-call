import { Request, Response } from "express";
import { ConversationModel, MessageModel } from "../../database.js";

const NEW_CONVERSATION_SEED_MESSAGES: Array<{
  role: "assistant" | "user";
  content: string;
}> = [
  {
    role: "assistant",
    content:
      "你好呀！恭喜你绑定成功 大侠👋 我可以帮你：\n\n☀️ 每日天气定时提醒\n📊 社媒自动运营涨粉\n📝 手机远程操作电脑文件\n📧 处理邮件等日常杂事\n\n或者可以先给我起个名字，告诉我想怎么称呼你，还可以说说你喜欢的性格，让我更懂你呀✨",
  },
  {
    role: "user",
    content: "设置定时任务：每日总结AI新闻放到我的桌面上",
  },
  {
    role: "assistant",
    content: "指令已收到👌🏻，请稍等一下哦~",
  },
  {
    role: "assistant",
    content: "已添加完毕，定时任务#1 · 每日AI新闻总结",
  },
];

function ensureInitialDemoConversation(): void {
  const existing = ConversationModel.list(200);
  const seedConversation = existing.find(
    (conversation) => conversation.title === "新对话",
  );

  if (seedConversation) {
    const messages = MessageModel.getByConversation(seedConversation.id);
    if (messages.length === 0) {
      for (const message of NEW_CONVERSATION_SEED_MESSAGES) {
        MessageModel.add(seedConversation.id, message.role, message.content);
      }
    }
    return;
  }

  const conversation = ConversationModel.create("新对话");
  for (const message of NEW_CONVERSATION_SEED_MESSAGES) {
    MessageModel.add(conversation.id, message.role, message.content);
  }
}

export function listConversations(req: Request, res: Response): void {
  ensureInitialDemoConversation();
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const conversations = ConversationModel.list(limit);
  res.json({ success: true, data: conversations });
}

export function createConversation(req: Request, res: Response): void {
  const { title } = req.body as { title?: string };
  const conversation = ConversationModel.create(title || "新对话");

  res.json({ success: true, data: conversation });
}

export function getConversationDetail(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10);
  const conversation = ConversationModel.getById(id);

  if (!conversation) {
    res.json({ success: false, message: "对话不存在" });
    return;
  }

  const messages = MessageModel.getByConversation(id);
  res.json({ success: true, data: { ...conversation, messages } });
}

export function updateConversationTitle(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10);
  const { title } = req.body as { title?: string };

  if (!title) {
    res.json({ success: false, message: "标题不能为空" });
    return;
  }

  ConversationModel.updateTitle(id, title);
  const conversation = ConversationModel.getById(id);
  res.json({ success: true, data: conversation });
}

export function deleteConversation(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10);
  ConversationModel.delete(id);
  res.json({ success: true, message: "删除成功" });
}

export function getConversationMessages(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10);
  const messages = MessageModel.getByConversation(id);
  res.json({ success: true, data: messages });
}
