export interface CommandResponse {
  success: boolean;
  message: string;
  data?: unknown;
  openUrl?: string;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  qr_code?: string;
  created_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
