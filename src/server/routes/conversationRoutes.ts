import { Router } from "express";
import {
  createConversation,
  deleteConversation,
  getConversationDetail,
  getConversationMessages,
  listConversations,
  updateConversationTitle,
} from "../controllers/conversationController.js";

const conversationRoutes: Router = Router();

conversationRoutes.get("/conversations", listConversations);
conversationRoutes.post("/conversations", createConversation);
conversationRoutes.get("/conversations/:id", getConversationDetail);
conversationRoutes.put("/conversations/:id", updateConversationTitle);
conversationRoutes.delete("/conversations/:id", deleteConversation);
conversationRoutes.get("/conversations/:id/messages", getConversationMessages);

export { conversationRoutes };
