import { Request, Response } from "express";
import { ConversationModel, MessageModel } from "../../database.js";

export function listConversations(req: Request, res: Response): void {
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
